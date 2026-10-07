const BookingModel = require("../models/booking.model");
const EventModel = require("../models/event.model");
const TicketModel = require("../models/ticket.model");
const PaymentModel = require("../models/payment.model");
const RefundModel = require("../models/refund.model");


const bookEvent = async (req, res) => {
  try {
    const {
      eventId,
      ticketType,
      quantity
    } = req.body;

    const { id } = req.user;

    if (
      !quantity ||
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) < 1
    ) {
      return res.status(400).send({
        message:
          "Ticket quantity must be at least 1"
      });
    }

    if (!ticketType) {
      return res.status(400).send({
        message:
          "Please select a ticket type"
      });
    }

    const ticketQuantity =
      Number(quantity);

    const event =
      await EventModel.findById(eventId);

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    if (event.isAvailable === false) {
      return res.status(400).send({
        message:
          "This event is currently unavailable for booking"
      });
    }

    const selectedTicketType =
      event.ticketTypes.find(
        (type) =>
          type.name.toLowerCase() ===
          ticketType.toLowerCase()
      );

    if (!selectedTicketType) {
      return res.status(400).send({
        message:
          "Selected ticket type is not available for this event"
      });
    }

    if (
      selectedTicketType.availableTickets <= 0
    ) {
      return res.status(400).send({
        message:
          `${selectedTicketType.name} tickets are sold out`
      });
    }

    if (
      ticketQuantity >
      selectedTicketType.availableTickets
    ) {
      return res.status(400).send({
        message:
          `Only ${selectedTicketType.availableTickets} ${selectedTicketType.name} ticket(s) are currently available`
      });
    }

    const ticketPrice =
      selectedTicketType.price;

    const totalAmount =
      ticketPrice * ticketQuantity;

    const bookingReference =
      "BK-" +
      Date.now() +
      "-" +
      Math.floor(Math.random() * 1000);

    const booking =
      await BookingModel.create({
        user: id,
        event: eventId,
        ticketType:
          selectedTicketType.name,
        ticketPrice,
        quantity: ticketQuantity,
        totalAmount,
        bookingReference,
        bookingStatus: "pending",
        paymentStatus: "pending"
      });

    return res.status(201).send({
      message:
        "Booking created successfully. Complete payment to secure your tickets.",

      data: {
        booking
      }
    });
  } catch (error) {
    console.log(
      "BOOK EVENT ERROR:",
      error
    );

    return res.status(400).send({
      message:
        "Cannot book event at this time",
      error: error.message
    });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const { id } = req.user;

    // Find all bookings made by the logged-in person
    const bookings = await BookingModel.find({
      user: id
    }).populate(
      "event",
      "title description location date price"
    );

    // Add the individual tickets to each booking
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

    return res.status(200).send({
      message: "Bookings fetched successfully",
      data: bookingsWithTickets
    });

  } catch (error) {
    console.log(error);

    return res.status(400).send({
      message: "Cannot fetch bookings at this time"
    });
  }
};

const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find the booking
    const booking = await BookingModel.findById(id)
      .populate(
        "event",
        "title description location date price"
      );

    // Check if booking exists
    if (!booking) {
      return res.status(404).send({
        message: "Booking not found"
      });
    }

    // Make sure the booking belongs to the logged-in person
    if (booking.user.toString() !== userId) {
      return res.status(403).send({
        message: "You cannot view this booking"
      });
    }

    // Find all individual tickets under this booking
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
    console.log(error);

    return res.status(400).send({
      message: "Cannot fetch booking at this time"
    });
  }
};


const getEventBookings = async (req, res) => {
  try {
    const { eventId } = req.params;
    const organizerId = req.user.id;

    // Find the event
    const event = await EventModel.findById(eventId);

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    // Check if this event belongs to the logged-in organizer
    if (event.createdBy.toString() !== organizerId) {
      return res.status(403).send({
        message: "You cannot view bookings for this event"
      });
    }

    // Find all bookings for this event
    const bookings = await BookingModel.find({
      event: eventId
    }).populate(
      "user",
      "firstname lastname email"
    );

    // Find tickets belonging to each booking
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

    // Calculate number of tickets sold
    const ticketsSold =
      event.totalTickets - event.availableTickets;

    return res.status(200).send({
      message: "Event bookings fetched successfully",
      data: {
        event: {
          _id: event._id,
          title: event.title,
          totalTickets: event.totalTickets,
          availableTickets: event.availableTickets,
          ticketsSold
        },
        bookings: bookingsWithTickets
      }
    });

  } catch (error) {
    console.log(error);

    return res.status(400).send({
      message: "Cannot fetch event bookings at this time"
    });
  }
};

const cancelTickets = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { ticketIds } = req.body;
    const userId = req.user.id;

    // 1. Make sure the user selected at least one ticket
    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).send({
        message: "Please select at least one ticket to cancel"
      });
    }

    // 2. Find the booking
    const booking = await BookingModel.findById(bookingId);

    if (!booking) {
      return res.status(404).send({
        message: "Booking not found"
      });
    }

    // 3. Make sure the booking belongs to the logged-in user
    if (booking.user.toString() !== userId) {
      return res.status(403).send({
        message: "You cannot cancel tickets from this booking"
      });
    }

    // 4. Find the tickets the user selected
    const tickets = await TicketModel.find({
      _id: { $in: ticketIds },
      booking: bookingId
    });

    // 5. Make sure all selected tickets belong to this booking
    if (tickets.length !== ticketIds.length) {
      return res.status(400).send({
        message: "One or more selected tickets are invalid"
      });
    }

    // 6. Check if any ticket is already cancelled
    const alreadyCancelled = tickets.some(
      (ticket) => ticket.status === "cancelled"
    );

    if (alreadyCancelled) {
      return res.status(400).send({
        message: "One or more selected tickets have already been cancelled"
      });
    }

    // 7. Check if any ticket has already been used
    const alreadyUsed = tickets.some(
      (ticket) => ticket.status === "used"
    );

    if (alreadyUsed) {
      return res.status(400).send({
        message: "Used tickets cannot be cancelled"
      });
    }

    // 8. Check if any ticket already has a refund pending
    const alreadyRefundPending = tickets.some(
      (ticket) => ticket.status === "refund_pending"
    );

    if (alreadyRefundPending) {
      return res.status(400).send({
        message: "One or more selected tickets already have a pending refund"
      });
    }

    // 9. Find the event
    const event = await EventModel.findById(booking.event);

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    // 10. Calculate how much the selected tickets are worth
    const refundAmount =
  tickets.reduce(
    (total, ticket) =>
      total + ticket.ticketPrice,
    0
  );


   // Check if booking is paid or has already been partially refunded
if (
  ["paid", "partially_refunded"].includes(
    booking.paymentStatus
  )
) {

  // Find the original successful payment
  const payment = await PaymentModel.findOne({
    booking: bookingId,
    status: {
      $in: ["paid", "partially_refunded"]
    }
  });

  if (!payment) {
    return res.status(404).send({
      message: "Paid transaction not found"
    });
  }

  // Send refund request to Paystack
  const paystackResponse = await fetch(
        "https://api.paystack.co/refund",
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            transaction: payment.paymentReference,

            // Paystack wants the amount in Kobo
            amount: refundAmount * 100
          })
        }
      );

      const refundData = await paystackResponse.json();

      // 13. Check if Paystack rejected the refund
      if (!paystackResponse.ok || !refundData.status) {
        return res.status(400).send({
          message: "Refund request failed",
          error: refundData.message
        });
      }

      // 14. Create a refund record in our database
      const refund = await RefundModel.create({
        payment: payment._id,
        booking: booking._id,
        user: userId,

        tickets: tickets.map(
          (ticket) => ticket._id
        ),

        amount: refundAmount,

        paystackRefundId: refundData.data.id.toString(),

        status: "pending"
      });

      // 15. Mark the selected tickets as waiting for refund
      await TicketModel.updateMany(
        {
          _id: { $in: ticketIds },
          booking: bookingId,
          status: "valid"
        },
        {
          $set: {
            status: "refund_pending"
          }
        }
      );

      // 16. Update overall payment refund status
      payment.refundStatus = "pending";

      await payment.save();

      // 17. Send response
      return res.status(200).send({
        message: "Refund request submitted successfully",
        data: {
          refundId: refund._id,
          paystackRefundId: refund.paystackRefundId,
          refundAmount: refund.amount,
          refundStatus: refund.status,
          ticketsToCancel: tickets.length
        }
      });
    }


    await TicketModel.updateMany(
      {
        _id: { $in: ticketIds },
        booking: bookingId
      },
      {
        $set: {
          status: "cancelled",
          qrCode: null
        }
      }
    );
const ticketType =
  event.ticketTypes.find(
    (type) =>
      type.name === booking.ticketType
  );

if (ticketType) {
  ticketType.availableTickets +=
    tickets.length;

  await event.save();
}

    // 20. Count cancelled tickets
    const cancelledTickets = await TicketModel.countDocuments({
      booking: bookingId,
      status: "cancelled"
    });

    // 21. Count tickets that haven't been cancelled
    const nonCancelledTickets = await TicketModel.countDocuments({
      booking: bookingId,
      status: {
        $in: ["valid", "used"]
      }
    });

    // 22. Update booking status
    if (nonCancelledTickets === 0) {

      booking.bookingStatus = "cancelled";

    } else if (cancelledTickets > 0) {

      booking.bookingStatus = "partially_cancelled";

    } else {

      booking.bookingStatus = "confirmed";
    }

    await booking.save();

    // 23. Send response
    return res.status(200).send({
      message: "Ticket cancellation successful",
      data: {
        cancelledTickets: tickets.length,
        remainingTickets: nonCancelledTickets,
        availableTickets: event.availableTickets,
        bookingStatus: booking.bookingStatus
      }
    });

  } catch (error) {

    console.log("CANCEL TICKET ERROR:", error);

    return res.status(400).send({
      message: "Cannot cancel tickets at this time",
      error: error.message
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