
const mongoose = require("mongoose");
const crypto = require("crypto");

const BookingModel = require("../models/booking.model");
const EventModel = require("../models/event.model");
const TicketModel = require("../models/ticket.model");
const PaymentModel = require("../models/payment.model");
const RefundModel = require("../models/refund.model");

const getCategory = (event, selection) => {
  const categories = event.ticketTypes || [];

  if (selection.ticketTypeId) {
    const category = categories.find(
      (type) =>
        type._id &&
        String(type._id) === String(selection.ticketTypeId)
    );

    if (category) return category;
  }

  const name = String(
    selection.ticketType || selection.name || ""
  ).trim();

  if (!name) return null;

  return categories.find(
    (type) =>
      type.name.toLowerCase() === name.toLowerCase()
  );
};

const getTotalAvailability = (event) => {
  return (event.ticketTypes || []).reduce(
    (total, type) => total + Number(type.availableTickets || 0),
    0
  );
};

const restoreCategoryAvailability = async (eventId, tickets) => {
  const quantities = new Map();

  for (const ticket of tickets) {
    const key = ticket.ticketTypeId
      ? `id:${ticket.ticketTypeId}`
      : `name:${String(ticket.ticketType || "").toLowerCase()}`;

    if (!key || key === "name:") {
      throw new Error("Ticket category is missing");
    }

    if (!quantities.has(key)) {
      quantities.set(key, {
        ticketTypeId: ticket.ticketTypeId,
        ticketType: ticket.ticketType,
        quantity: 0
      });
    }

    quantities.get(key).quantity += 1;
  }

  for (const selection of quantities.values()) {
    const event = await EventModel.findById(eventId);

    if (!event) {
      throw new Error("Event not found");
    }

    const category = getCategory(event, selection);

    if (!category) {
      throw new Error(
        `Ticket category ${selection.ticketType} no longer exists`
      );
    }

    const filter = category._id
      ? { _id: eventId, "ticketTypes._id": category._id }
      : { _id: eventId, "ticketTypes.name": category.name };

    const result = await EventModel.findOneAndUpdate(
      filter,
      {
        $inc: {
          "ticketTypes.$.availableTickets": selection.quantity,
          availableTickets: selection.quantity
        }
      },
      { new: true }
    );

    if (!result) {
      throw new Error("Could not restore ticket availability");
    }
  }
};

const bookEvent = async (req, res) => {
  try {
    const {
      eventId,
      ticketSelections,
      ticketType,
      quantity
    } = req.body;

    const userId = req.user.id;

    if (!mongoose.isValidObjectId(eventId)) {
      return res.status(400).send({
        message: "Please provide a valid event ID"
      });
    }

    const event = await EventModel.findById(eventId);

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    if (event.isAvailable === false) {
      return res.status(400).send({
        message: "This event is currently unavailable for booking"
      });
    }

    const requestedSelections = Array.isArray(ticketSelections)
      ? ticketSelections
      : [{ ticketType, quantity }];

    if (requestedSelections.length === 0) {
      return res.status(400).send({
        message: "Please select at least one ticket"
      });
    }

    const normalizedSelections = [];
    const selectedCategories = new Set();

    let totalQuantity = 0;
    let totalAmount = 0;

    for (const selection of requestedSelections) {
      const selectedQuantity = Number(selection.quantity);

      if (
        !Number.isSafeInteger(selectedQuantity) ||
        selectedQuantity < 1
      ) {
        return res.status(400).send({
          message: "Each selected ticket quantity must be at least 1"
        });
      }

      const category = getCategory(event, selection);

      if (!category) {
        return res.status(400).send({
          message: "One or more selected ticket categories are invalid"
        });
      }

      if (!category._id) {
        return res.status(400).send({
          message:
            "This event needs its ticket categories updated before mixed-category booking can be used"
        });
      }

      const categoryId = String(category._id);

      if (selectedCategories.has(categoryId)) {
        return res.status(400).send({
          message: `You selected ${category.name} more than once`
        });
      }

      selectedCategories.add(categoryId);

      if (selectedQuantity > category.availableTickets) {
        return res.status(400).send({
          message: `Only ${category.availableTickets} ${category.name} ticket(s) are available`
        });
      }

      const price = Number(category.price);

      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).send({
          message: `Invalid price for ${category.name}`
        });
      }

      const subtotal = price * selectedQuantity;

      normalizedSelections.push({
        ticketTypeId: category._id,
        ticketType: category.name,
        quantity: selectedQuantity,
        ticketPrice: price,
        subtotal
      });

      totalQuantity += selectedQuantity;
      totalAmount += subtotal;
    }

    if (
      !Number.isSafeInteger(totalQuantity) ||
      !Number.isSafeInteger(totalAmount) ||
      totalQuantity < 1
    ) {
      return res.status(400).send({
        message: "Invalid booking total"
      });
    }

    const bookingReference =
      "BK-" + crypto.randomBytes(12).toString("hex").toUpperCase();

    const singleSelection =
      normalizedSelections.length === 1
        ? normalizedSelections[0]
        : null;

    const booking = await BookingModel.create({
      user: userId,
      event: event._id,
      ticketType: singleSelection
        ? singleSelection.ticketType
        : null,
      ticketPrice: singleSelection
        ? singleSelection.ticketPrice
        : null,
      ticketSelections: normalizedSelections,
      quantity: totalQuantity,
      totalAmount,
      bookingReference,
      bookingStatus: "pending",
      paymentStatus: "pending"
    });

    return res.status(201).send({
      message:
        "Booking created successfully. Complete payment to secure your tickets.",
      data: { booking }
    });
  } catch (error) {
    console.log("BOOK EVENT ERROR:", error);

    return res.status(500).send({
      message: "Cannot book event at this time",
      error: error.message
    });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const bookings = await BookingModel.find({
      user: req.user.id
    })
      .populate(
        "event",
        "title description location date price image"
      )
      .sort({ createdAt: -1 });

    const data = await Promise.all(
      bookings.map(async (booking) => {
        const tickets = await TicketModel.find({
          booking: booking._id
        });

        return {
          ...booking.toObject(),
          tickets
        };
      })
    );

    return res.status(200).send({
      message: "Bookings fetched successfully",
      data
    });
  } catch (error) {
    console.log("GET MY BOOKINGS ERROR:", error);

    return res.status(500).send({
      message: "Cannot fetch bookings at this time"
    });
  }
};

const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).send({
        message: "Invalid booking ID"
      });
    }

    const booking = await BookingModel.findById(id).populate(
      "event",
      "title description location date price image"
    );

    if (!booking) {
      return res.status(404).send({
        message: "Booking not found"
      });
    }

    if (String(booking.user) !== String(req.user.id)) {
      return res.status(403).send({
        message: "You cannot view this booking"
      });
    }

    const tickets = await TicketModel.find({
      booking: booking._id
    });

    return res.status(200).send({
      message: "Booking fetched successfully",
      data: {
        ...booking.toObject(),
        tickets
      }
    });
  } catch (error) {
    console.log("GET BOOKING ERROR:", error);

    return res.status(500).send({
      message: "Cannot fetch booking at this time"
    });
  }
};

const getEventBookings = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!mongoose.isValidObjectId(eventId)) {
      return res.status(400).send({
        message: "Invalid event ID"
      });
    }

    const event = await EventModel.findById(eventId);

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    if (String(event.createdBy) !== String(req.user.id)) {
      return res.status(403).send({
        message: "You cannot view bookings for this event"
      });
    }

    const bookings = await BookingModel.find({
      event: eventId
    })
      .populate("user", "firstname lastname email")
      .sort({ createdAt: -1 });

    const bookingsWithTickets = await Promise.all(
      bookings.map(async (booking) => {
        const tickets = await TicketModel.find({
          booking: booking._id
        });

        return {
          ...booking.toObject(),
          tickets
        };
      })
    );

    const totalTickets = (event.ticketTypes || []).reduce(
      (total, type) => total + Number(type.totalTickets || 0),
      0
    );

    const availableTickets = getTotalAvailability(event);

    return res.status(200).send({
      message: "Event bookings fetched successfully",
      data: {
        event: {
          _id: event._id,
          title: event.title,
          totalTickets,
          availableTickets,
          ticketsSold: totalTickets - availableTickets,
          ticketTypes: event.ticketTypes
        },
        bookings: bookingsWithTickets
      }
    });
  } catch (error) {
    console.log("GET EVENT BOOKINGS ERROR:", error);

    return res.status(500).send({
      message: "Cannot fetch event bookings at this time"
    });
  }
};

const cancelTickets = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { ticketIds } = req.body;

    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).send({
        message: "Invalid booking ID"
      });
    }

    if (
      !Array.isArray(ticketIds) ||
      ticketIds.length === 0
    ) {
      return res.status(400).send({
        message: "Please select at least one ticket to cancel"
      });
    }

    const uniqueIds = ticketIds.map(String);

    if (
      uniqueIds.some((id) => !mongoose.isValidObjectId(id)) ||
      new Set(uniqueIds).size !== uniqueIds.length
    ) {
      return res.status(400).send({
        message: "Ticket IDs must be valid and unique"
      });
    }

    const booking = await BookingModel.findById(bookingId);

    if (!booking) {
      return res.status(404).send({
        message: "Booking not found"
      });
    }

    if (String(booking.user) !== String(req.user.id)) {
      return res.status(403).send({
        message: "You cannot cancel tickets from this booking"
      });
    }

    const tickets = await TicketModel.find({
      _id: { $in: uniqueIds },
      booking: booking._id
    });

    if (tickets.length !== uniqueIds.length) {
      return res.status(400).send({
        message: "One or more selected tickets are invalid"
      });
    }

    if (tickets.some((ticket) => ticket.status !== "valid")) {
      return res.status(409).send({
        message:
          "Only valid, unused tickets without a pending refund can be cancelled"
      });
    }

    const event = await EventModel.findById(booking.event);

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    const refundableTickets = tickets.map((ticket) => ({
      ...ticket.toObject(),
      ticketType: ticket.ticketType || booking.ticketType,
      ticketPrice:
        ticket.ticketPrice !== null &&
        ticket.ticketPrice !== undefined
          ? ticket.ticketPrice
          : booking.ticketPrice
    }));

    if (
      refundableTickets.some(
        (ticket) =>
          !ticket.ticketType ||
          ticket.ticketPrice === null ||
          ticket.ticketPrice === undefined ||
          !Number.isFinite(Number(ticket.ticketPrice)) ||
          Number(ticket.ticketPrice) < 0
      )
    ) {
      return res.status(400).send({
        message:
          "Ticket category or refund price is missing. Please contact support."
      });
    }

    const refundAmount = refundableTickets.reduce(
      (total, ticket) => total + Number(ticket.ticketPrice),
      0
    );

    const refundAmountInKobo = Math.round(refundAmount * 100);

    if (
      !Number.isSafeInteger(refundAmountInKobo) ||
      refundAmountInKobo <= 0
    ) {
      return res.status(400).send({
        message: "Invalid refund amount"
      });
    }

    if (
      ["paid", "partially_refunded"].includes(
        booking.paymentStatus
      )
    ) {
      const payment = await PaymentModel.findOne({
        booking: booking._id,
        status: {
          $in: ["paid", "partially_refunded"]
        }
      });

      if (!payment) {
        return res.status(404).send({
          message: "Paid transaction not found"
        });
      }

      const existingPendingRefund = await RefundModel.findOne({
        payment: payment._id,
        status: {
          $in: [
            "pending",
            "processing",
            "needs-attention"
          ]
        }
      });

      if (
        existingPendingRefund ||
        payment.refundStatus === "pending"
      ) {
        return res.status(409).send({
          message:
            "Another refund is already pending for this payment"
        });
      }

      const remainingRefundable =
        Number(payment.amount) -
        Number(payment.refundedAmount || 0);

      if (
        !Number.isFinite(remainingRefundable) ||
        refundAmount > remainingRefundable
      ) {
        return res.status(400).send({
          message:
            "Refund amount exceeds the remaining payment"
        });
      }

      const session = await mongoose.startSession();

      let refund;

      try {
        await session.withTransaction(async () => {
          const currentPayment = await PaymentModel.findOne({
            _id: payment._id,
            status: {
              $in: ["paid", "partially_refunded"]
            },
            refundStatus: {
              $nin: ["pending", "processing", "needs-attention"]
            }
          }).session(session);

          if (!currentPayment) {
            throw new Error(
              "Payment is no longer available for refund"
            );
          }

          const pendingRefund = await RefundModel.findOne({
            payment: currentPayment._id,
            status: {
              $in: [
                "pending",
                "processing",
                "needs-attention"
              ]
            }
          }).session(session);

          if (pendingRefund) {
            throw new Error(
              "Another refund is already pending"
            );
          }

          const availableAmount =
            Number(currentPayment.amount) -
            Number(currentPayment.refundedAmount || 0);

          if (refundAmount > availableAmount) {
            throw new Error(
              "Refund exceeds remaining payment amount"
            );
          }

          const reserved = await TicketModel.updateMany(
            {
              _id: { $in: uniqueIds },
              booking: booking._id,
              status: "valid"
            },
            {
              $set: {
                status: "refund_pending"
              }
            },
            { session }
          );

          if (reserved.modifiedCount !== uniqueIds.length) {
            throw new Error(
              "Ticket status changed. Please try again."
            );
          }

          currentPayment.refundStatus = "pending";

          await currentPayment.save({ session });

          const createdRefunds = await RefundModel.create(
            [
              {
                payment: currentPayment._id,
                booking: booking._id,
                user: req.user.id,
                tickets: uniqueIds,
                amount: refundAmount,
                status: "pending"
              }
            ],
            { session }
          );

          refund = createdRefunds[0];
        });
      } catch (error) {
        console.log("REFUND RESERVATION ERROR:", error);

        return res.status(409).send({
          message:
            "Could not reserve tickets for refund. Please refresh and try again."
        });
      } finally {
        await session.endSession();
      }

      let paystackResponse;
      let refundData;

      try {
        paystackResponse = await fetch(
          "https://api.paystack.co/refund",
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              transaction: payment.paymentReference,
              amount: refundAmountInKobo
            })
          }
        );

        refundData = await paystackResponse.json();
      } catch (error) {
        console.log("PAYSTACK REFUND NETWORK ERROR:", error);

        await RefundModel.updateOne(
          {
            _id: refund._id,
            status: "pending"
          },
          {
            $set: {
              status: "needs-attention"
            }
          }
        );

        return res.status(202).send({
          message:
            "Refund request outcome is uncertain. Please contact support and do not request another refund.",
          data: {
            refundId: refund._id,
            refundStatus: "needs-attention"
          }
        });
      }

      if (
        !paystackResponse.ok ||
        !refundData.status ||
        !refundData.data?.id
      ) {
        await RefundModel.updateOne(
          {
            _id: refund._id,
            status: "pending"
          },
          {
            $set: {
              status: "needs-attention"
            }
          }
        );

        return res.status(202).send({
          message:
            "Paystack did not confirm the refund request. The request needs review before another attempt.",
          data: {
            refundId: refund._id,
            refundStatus: "needs-attention"
          }
        });
      }

      await RefundModel.updateOne(
        {
          _id: refund._id,
          status: "pending"
        },
        {
          $set: {
            paystackRefundId: String(refundData.data.id)
          }
        }
      );

      return res.status(200).send({
        message: "Refund request submitted successfully",
        data: {
          refundId: refund._id,
          paystackRefundId: String(refundData.data.id),
          refundAmount,
          refundStatus: "pending",
          ticketsToCancel: uniqueIds.length
        }
      });
    }

    if (booking.paymentStatus === "pending") {
      return res.status(409).send({
        message:
          "This booking has not been paid for. Pending bookings without issued tickets should be cancelled through a separate booking cancellation endpoint."
      });
    }

    return res.status(400).send({
      message:
        "This booking cannot be cancelled in its current payment state"
    });

  } catch (error) {
    console.log("CANCEL TICKETS ERROR:", error);

    return res.status(500).send({
      message: "Cannot cancel tickets at this time"
    });
  }
};

module.exports = {
  bookEvent,
  getMyBookings,
  getBookingById,
  getEventBookings,
  cancelTickets
};
