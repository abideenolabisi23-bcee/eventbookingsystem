
const mongoose = require("mongoose");

const BookingModel = require("../models/booking.model");
const PaymentModel = require("../models/payment.model");
const RefundModel = require("../models/refund.model");
const TicketModel = require("../models/ticket.model");
const EventModel = require("../models/event.model");

const toKobo = (amount) => {
  const value = Number(amount);
  const kobo = Math.round(value * 100);

  if (
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isSafeInteger(kobo) ||
    Math.abs(kobo / 100 - value) > 0.000001
  ) {
    throw new Error("Invalid monetary amount");
  }

  return kobo;
};

const completeEventRefund = async (refundId) => {
  if (!mongoose.isValidObjectId(refundId)) {
    throw new Error("Invalid refund ID");
  }

  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const refund = await RefundModel.findById(
        refundId
      ).session(session);

      if (!refund) {
        throw new Error("Refund not found");
      }

      if (refund.status === "processed") {
        const [payment, booking] = await Promise.all([
          PaymentModel.findById(refund.payment).session(
            session
          ),
          BookingModel.findById(refund.booking).session(
            session
          )
        ]);

        result = {
          success: true,
          alreadyProcessed: true,
          refund,
          payment,
          booking
        };

        return;
      }

      if (refund.status === "failed") {
        throw new Error(
          "Failed refund cannot be completed automatically"
        );
      }

      if (!refund.paystackRefundId) {
        throw new Error(
          "Refund has no Paystack refund ID. Reconciliation required."
        );
      }

      if (
        ![
          "automatic_full",
          "ticket_cancellation"
        ].includes(refund.refundKind)
      ) {
        throw new Error("Invalid refund kind");
      }

      const payment = await PaymentModel.findById(
        refund.payment
      ).session(session);

      const booking = await BookingModel.findById(
        refund.booking
      ).session(session);

      if (!payment || !booking) {
        throw new Error("Payment or booking not found");
      }

      if (
        String(payment.booking) !==
          String(booking._id) ||
        String(payment.user) !==
          String(booking.user) ||
        String(refund.user) !==
          String(booking.user)
      ) {
        throw new Error(
          "Refund, payment and booking records do not match"
        );
      }

      const refundKobo = toKobo(refund.amount);
      const paymentKobo = toKobo(payment.amount);
      const previousRefundedKobo = toKobo(
        payment.refundedAmount || 0
      );

      if (
        refundKobo <= 0 ||
        paymentKobo <= 0 ||
        previousRefundedKobo > paymentKobo
      ) {
        throw new Error(
          "Invalid refund or payment amount"
        );
      }

      const totalRefundedKobo =
        previousRefundedKobo + refundKobo;

      if (totalRefundedKobo > paymentKobo) {
        throw new Error(
          "Total refunds exceed the original payment"
        );
      }

      const refundTicketIds = Array.isArray(
        refund.tickets
      )
        ? refund.tickets
        : [];

      const uniqueTicketIds = new Set(
        refundTicketIds.map(String)
      );

      if (
        uniqueTicketIds.size !==
        refundTicketIds.length
      ) {
        throw new Error(
          "Refund contains duplicate ticket IDs"
        );
      }

      if (refund.refundKind === "automatic_full") {
        if (refundTicketIds.length !== 0) {
          throw new Error(
            "Automatic full refund cannot contain ticket IDs"
          );
        }

        const issuedTickets =
          await TicketModel.countDocuments({
            booking: booking._id
          }).session(session);

        if (issuedTickets > 0) {
          throw new Error(
            "Automatic full refund cannot be completed for issued tickets"
          );
        }

        if (
          refundKobo !== paymentKobo ||
          previousRefundedKobo !== 0
        ) {
          throw new Error(
            "Automatic full refund amount must equal the original payment"
          );
        }
      }

      if (refund.refundKind === "ticket_cancellation") {
        if (refundTicketIds.length === 0) {
          throw new Error(
            "Ticket cancellation refund has no tickets"
          );
        }

        const event = await EventModel.findById(
          booking.event
        ).session(session);

        if (!event) {
          throw new Error(
            "Event not found. Manual reconciliation required."
          );
        }

        const tickets = await TicketModel.find({
          _id: {
            $in: refundTicketIds
          },
          booking: booking._id,
          user: booking.user,
          event: booking.event,
          status: "refund_pending"
        }).session(session);

        if (
          tickets.length !== refundTicketIds.length
        ) {
          throw new Error(
            "Refund tickets are missing or not all pending"
          );
        }

        const ticketRefundKobo = tickets.reduce(
          (total, ticket) => {
            const priceKobo = toKobo(
              ticket.ticketPrice
            );

            if (priceKobo <= 0) {
              throw new Error(
                "Invalid ticket refund price"
              );
            }

            return total + priceKobo;
          },
          0
        );

        if (ticketRefundKobo !== refundKobo) {
          throw new Error(
            "Refund amount does not match the selected ticket prices"
          );
        }

        const restorationCounts = new Map();

        for (const ticket of tickets) {
          const category = event.ticketTypes.find(
            (type) => {
              if (ticket.ticketTypeId) {
                return (
                  type._id &&
                  String(type._id) ===
                    String(ticket.ticketTypeId)
                );
              }

              const categoryName = String(
                ticket.ticketType ||
                  booking.ticketType ||
                  ""
              )
                .trim()
                .toLowerCase();

              return (
                categoryName &&
                String(type.name)
                  .trim()
                  .toLowerCase() === categoryName
              );
            }
          );

          if (!category) {
            throw new Error(
              "Refund ticket category no longer exists"
            );
          }

          const categoryId = String(category._id);

          restorationCounts.set(
            categoryId,
            (restorationCounts.get(categoryId) || 0) +
              1
          );
        }

        for (const category of event.ticketTypes) {
          const categoryId = String(category._id);

          const restoreCount =
            restorationCounts.get(categoryId) || 0;

          if (restoreCount === 0) {
            continue;
          }

          const availableTickets = Number(
            category.availableTickets
          );

          const totalTickets = Number(
            category.totalTickets
          );

          if (
            !Number.isSafeInteger(availableTickets) ||
            !Number.isSafeInteger(totalTickets) ||
            availableTickets < 0 ||
            totalTickets < 0 ||
            availableTickets + restoreCount >
              totalTickets
          ) {
            throw new Error(
              `Cannot restore ${category.name} ticket availability`
            );
          }

          category.availableTickets =
            availableTickets + restoreCount;
        }

        event.availableTickets =
          event.ticketTypes.reduce(
            (total, category) =>
              total +
              Number(category.availableTickets || 0),
            0
          );

        await event.save({ session });

        for (const ticket of tickets) {
          ticket.status = "cancelled";
          ticket.qrCode = null;

          await ticket.save({ session });
        }
      }

      const fullyRefunded =
        totalRefundedKobo === paymentKobo;

      payment.refundedAmount =
        totalRefundedKobo / 100;

      payment.status = fullyRefunded
        ? "refunded"
        : "partially_refunded";

      payment.refundStatus = fullyRefunded
        ? "refunded"
        : "partially_refunded";

      booking.paymentStatus = fullyRefunded
        ? "refunded"
        : "partially_refunded";

      const remainingTickets =
        await TicketModel.countDocuments({
          booking: booking._id,
          status: {
            $in: [
              "valid",
              "used",
              "refund_pending"
            ]
          }
        }).session(session);

      const cancelledTickets =
        await TicketModel.countDocuments({
          booking: booking._id,
          status: "cancelled"
        }).session(session);

      if (refund.refundKind === "automatic_full") {
        booking.bookingStatus = "cancelled";
      } else {
        booking.bookingStatus =
          remainingTickets === 0
            ? "cancelled"
            : cancelledTickets > 0
              ? "partially_cancelled"
              : "confirmed";
      }

      refund.status = "processed";

      await refund.save({ session });
      await payment.save({ session });
      await booking.save({ session });

      result = {
        success: true,
        alreadyProcessed: false,
        refund,
        payment,
        booking
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  completeEventRefund
};
