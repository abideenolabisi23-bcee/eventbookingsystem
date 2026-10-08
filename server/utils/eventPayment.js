
const mongoose = require("mongoose");
const crypto = require("crypto");
const QRCode = require("qrcode");

const EventModel = require("../models/event.model");
const BookingModel = require("../models/booking.model");
const TicketModel = require("../models/ticket.model");
const PaymentModel = require("../models/payment.model");

const getBookingSelections = (booking, event) => {
  if (
    Array.isArray(booking.ticketSelections) &&
    booking.ticketSelections.length > 0
  ) {
    return booking.ticketSelections.map((selection) => ({
      ticketTypeId: selection.ticketTypeId
        ? String(selection.ticketTypeId)
        : null,
      ticketType: selection.ticketType,
      quantity: Number(selection.quantity),
      ticketPrice: Number(selection.ticketPrice)
    }));
  }

  const category = event.ticketTypes.find(
    (type) =>
      type.name.toLowerCase() ===
      String(booking.ticketType || "").toLowerCase()
  );

  if (!category) {
    throw new Error("Legacy ticket category no longer exists");
  }

  return [
    {
      ticketTypeId: category._id
        ? String(category._id)
        : null,
      ticketType: category.name,
      quantity: Number(booking.quantity),
      ticketPrice: Number(booking.ticketPrice)
    }
  ];
};

const findCategory = (event, selection) => {
  if (selection.ticketTypeId) {
    return event.ticketTypes.find(
      (type) =>
        type._id &&
        String(type._id) === String(selection.ticketTypeId)
    );
  }

  return event.ticketTypes.find(
    (type) =>
      type.name.toLowerCase() ===
      String(selection.ticketType || "").toLowerCase()
  );
};

const validateBookingSelections = (booking, event) => {
  const selections = getBookingSelections(booking, event);

  if (selections.length === 0) {
    throw new Error("No ticket categories selected");
  }

  const seen = new Set();
  let quantity = 0;
  let amountInKobo = 0;

  for (const selection of selections) {
    const category = findCategory(event, selection);

    if (!category) {
      throw new Error(
        `${selection.ticketType} category is no longer available`
      );
    }

    const key = category._id
      ? String(category._id)
      : category.name.toLowerCase();

    if (seen.has(key)) {
      throw new Error("Duplicate ticket category");
    }

    seen.add(key);

    if (
      !Number.isSafeInteger(selection.quantity) ||
      selection.quantity < 1
    ) {
      throw new Error("Invalid ticket quantity");
    }

    if (
      !Number.isFinite(selection.ticketPrice) ||
      selection.ticketPrice < 0
    ) {
      throw new Error("Invalid ticket price");
    }

    if (
      !Number.isFinite(Number(category.price)) ||
      Math.round(Number(category.price) * 100) !==
        Math.round(selection.ticketPrice * 100)
    ) {
      throw new Error(
        `${category.name} ticket price has changed`
      );
    }

    if (
      !Number.isSafeInteger(Number(category.availableTickets)) ||
      Number(category.availableTickets) < selection.quantity
    ) {
      throw new Error(
        `Not enough ${category.name} tickets available`
      );
    }

    quantity += selection.quantity;

    amountInKobo +=
      Math.round(selection.ticketPrice * 100) *
      selection.quantity;
  }

  if (quantity !== Number(booking.quantity)) {
    throw new Error("Booking quantity does not match selections");
  }

  if (
    amountInKobo !==
    Math.round(Number(booking.totalAmount) * 100)
  ) {
    throw new Error("Booking amount does not match selections");
  }

  return selections;
};

const confirmEventPayment = async (payment, paymentMethod) => {
  const session = await mongoose.startSession();

  let result = null;

  try {
    await session.withTransaction(
      async () => {
        const currentPayment = await PaymentModel.findById(
          payment._id
        ).session(session);

        if (!currentPayment) {
          throw new Error("Payment not found");
        }

        const booking = await BookingModel.findById(
          currentPayment.booking
        ).session(session);

        if (!booking) {
          throw new Error("Booking not found");
        }

        if (
          String(currentPayment.user) !==
          String(booking.user)
        ) {
          throw new Error("Payment and booking users do not match");
        }

        if (
          currentPayment.status === "paid" &&
          booking.paymentStatus === "paid" &&
          booking.bookingStatus === "confirmed"
        ) {
          const tickets = await TicketModel.find({
            booking: booking._id
          }).session(session);

          if (tickets.length !== booking.quantity) {
            throw new Error(
              "Confirmed booking has an incomplete ticket set"
            );
          }

          result = {
            success: true,
            alreadyConfirmed: true,
            payment: currentPayment,
            booking,
            tickets
          };

          return;
        }

        if (
          currentPayment.refundStatus !== "none" ||
          Number(currentPayment.refundedAmount || 0) > 0
        ) {
          result = {
            success: false,
            processing: false,
            requiresAttention: true,
            message:
              "This payment has refund activity and cannot be confirmed automatically"
          };

          return;
        }

        if (currentPayment.status !== "pending") {
          result = {
            success: false,
            processing: currentPayment.status === "processing",
            requiresAttention: true,
            message:
              "Payment cannot be confirmed in its current state"
          };

          return;
        }

        if (
          booking.bookingStatus !== "pending" ||
          booking.paymentStatus !== "pending"
        ) {
          throw new Error(
            "Booking is no longer awaiting payment"
          );
        }

        const event = await EventModel.findById(
          booking.event
        ).session(session);

        if (!event || event.isAvailable === false) {
          throw new Error("Event is no longer available");
        }

        const paymentAmountInKobo = Math.round(
          Number(currentPayment.amount) * 100
        );

        const bookingAmountInKobo = Math.round(
          Number(booking.totalAmount) * 100
        );

        if (
          !Number.isSafeInteger(paymentAmountInKobo) ||
          paymentAmountInKobo <= 0 ||
          paymentAmountInKobo !== bookingAmountInKobo
        ) {
          throw new Error("Payment and booking amounts differ");
        }

        const selections = validateBookingSelections(
          booking,
          event
        );

        const existingCount = await TicketModel.countDocuments({
          booking: booking._id
        }).session(session);

        if (existingCount > 0) {
          throw new Error(
            "Tickets already exist for an unconfirmed booking"
          );
        }

        const ticketDocuments = [];

        for (const selection of selections) {
          const category = findCategory(event, selection);

          category.availableTickets -= selection.quantity;

          for (let i = 0; i < selection.quantity; i++) {
            const ticketCode =
              "TKT-" +
              crypto.randomBytes(16).toString("hex").toUpperCase();

            const qrCode = await QRCode.toDataURL(
              `EVENT:${ticketCode}`
            );

            ticketDocuments.push({
              booking: booking._id,
              user: booking.user,
              event: booking.event,
              ticketTypeId: category._id || null,
              ticketType: category.name,
              ticketPrice: selection.ticketPrice,
              ticketCode,
              qrCode,
              status: "valid"
            });
          }
        }

        event.availableTickets = event.ticketTypes.reduce(
          (total, category) =>
            total + Number(category.availableTickets),
          0
        );

        await event.save({ session });

        const tickets = await TicketModel.insertMany(
          ticketDocuments,
          { session }
        );

        booking.paymentStatus = "paid";
        booking.bookingStatus = "confirmed";

        currentPayment.status = "paid";
        currentPayment.paymentMethod =
          paymentMethod || currentPayment.paymentMethod;

        await booking.save({ session });
        await currentPayment.save({ session });

        result = {
          success: true,
          alreadyConfirmed: false,
          payment: currentPayment,
          booking,
          tickets,
          availableTickets: event.availableTickets
        };
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" }
      }
    );

    return result;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  getBookingSelections,
  validateBookingSelections,
  confirmEventPayment
};
