const TicketModel = require("../models/ticket.model");
const BookingModel = require("../models/booking.model");
const EventModel = require("../models/event.model");

const getTicketCode = (ticketCode, qrData) => {
  if (ticketCode) {
    return ticketCode.trim();
  }

  if (qrData) {
    if (!qrData.startsWith("EVENT:")) {
      return null;
    }

    return qrData.replace("EVENT:", "").trim();
  }

  return null;
};

const validateTicket = async (req, res) => {
  try {
    const { ticketCode, qrData } = req.body;
    const userId = req.user.id;

    if (!ticketCode && !qrData) {
      return res.status(400).send({
        message: "Ticket code or QR data is required"
      });
    }

    if (qrData && !qrData.startsWith("EVENT:")) {
      return res.status(400).send({
        message: "Invalid event QR code"
      });
    }

    const code = getTicketCode(ticketCode, qrData);

    if (!code) {
      return res.status(400).send({
        message: "Invalid ticket code or QR data"
      });
    }

    const ticket = await TicketModel.findOne({
      ticketCode: code
    })
      .populate(
        "user",
        "firstname lastname email"
      )
      .populate(
        "booking",
        "bookingReference quantity totalAmount bookingStatus paymentStatus"
      );

    if (!ticket) {
      return res.status(404).send({
        message: "Invalid ticket"
      });
    }

    const event = await EventModel.findById(ticket.event);

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    if (event.createdBy.toString() !== userId) {
      return res.status(403).send({
        message: "You are not authorized to validate tickets for this event"
      });
    }

    if (!ticket.booking) {
      return res.status(404).send({
        message: "Booking not found"
      });
    }

    if (
      !["paid", "partially_refunded"].includes(
        ticket.booking.paymentStatus
      )
    ) {
      return res.status(400).send({
        message: "This ticket has not been paid for",
        valid: false,
        data: {
          ticketCode: ticket.ticketCode,
          status: ticket.status
        }
      });
    }

    if (ticket.status === "cancelled") {
      return res.status(400).send({
        message: "This ticket has been cancelled",
        valid: false,
        data: {
          ticketCode: ticket.ticketCode,
          status: ticket.status
        }
      });
    }

    if (ticket.status === "refund_pending") {
      return res.status(400).send({
        message: "This ticket has a pending refund and cannot be used",
        valid: false,
        data: {
          ticketCode: ticket.ticketCode,
          status: ticket.status
        }
      });
    }

    if (ticket.status === "used") {
      return res.status(200).send({
        message: "This ticket has already been used",
        valid: false,
        data: {
          ticketCode: ticket.ticketCode,
          ticketType: ticket.ticketType,
          ticketPrice: ticket.ticketPrice,
          status: ticket.status,
          checkedInAt: ticket.checkedInAt,
          user: ticket.user,
          booking: ticket.booking,
          event: {
            _id: event._id,
            title: event.title,
            date: event.date,
            location: event.location
          }
        }
      });
    }

    return res.status(200).send({
      message: "Ticket is valid",
      valid: true,
      data: {
        _id: ticket._id,
        ticketCode: ticket.ticketCode,
        ticketType: ticket.ticketType,
        ticketPrice: ticket.ticketPrice,
        status: ticket.status,
        user: ticket.user,
        booking: ticket.booking,
        event: {
          _id: event._id,
          title: event.title,
          date: event.date,
          location: event.location
        }
      }
    });
  } catch (error) {
    console.log("VALIDATE TICKET ERROR:", error);

    return res.status(500).send({
      message: "Cannot validate ticket at this time",
      error: error.message
    });
  }
};

const checkInTicket = async (req, res) => {
  try {
    const { ticketCode, qrData } = req.body;
    const userId = req.user.id;

    if (!ticketCode && !qrData) {
      return res.status(400).send({
        message: "Ticket code or QR data is required"
      });
    }

    if (qrData && !qrData.startsWith("EVENT:")) {
      return res.status(400).send({
        message: "Invalid event QR code"
      });
    }

    const code = getTicketCode(ticketCode, qrData);

    if (!code) {
      return res.status(400).send({
        message: "Invalid ticket code or QR data"
      });
    }

    const ticket = await TicketModel.findOne({
      ticketCode: code
    });

    if (!ticket) {
      return res.status(404).send({
        message: "Invalid ticket"
      });
    }

    const event = await EventModel.findById(ticket.event);

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    if (event.createdBy.toString() !== userId) {
      return res.status(403).send({
        message: "You are not authorized to check in tickets for this event"
      });
    }

    const booking = await BookingModel.findById(ticket.booking);

    if (!booking) {
      return res.status(404).send({
        message: "Booking not found"
      });
    }

    if (
      !["paid", "partially_refunded"].includes(
        booking.paymentStatus
      )
    ) {
      return res.status(400).send({
        message: "This ticket has not been paid for"
      });
    }

    if (ticket.status === "cancelled") {
      return res.status(400).send({
        message: "This ticket has been cancelled"
      });
    }

    if (ticket.status === "refund_pending") {
      return res.status(400).send({
        message: "This ticket has a pending refund and cannot be used"
      });
    }

    if (ticket.status === "used") {
      return res.status(400).send({
        message: "This ticket has already been used"
      });
    }

    const checkedInTicket = await TicketModel.findOneAndUpdate(
      {
        _id: ticket._id,
        status: "valid"
      },
      {
        $set: {
          status: "used",
          checkedInAt: new Date(),
          checkedInBy: userId
        }
      },
      {
        returnDocument: "after"
      }
    );

    if (!checkedInTicket) {
      return res.status(400).send({
        message: "This ticket has already been used or is no longer valid"
      });
    }

    return res.status(200).send({
      message: "Guest checked in successfully",
      data: {
        ticketCode: checkedInTicket.ticketCode,
        status: checkedInTicket.status,
        checkedInAt: checkedInTicket.checkedInAt,
        checkedInBy: checkedInTicket.checkedInBy,
        event: {
          _id: event._id,
          title: event.title,
          date: event.date,
          location: event.location
        }
      }
    });
  } catch (error) {
    console.log("CHECK IN TICKET ERROR:", error);

    return res.status(500).send({
      message: "Cannot check in ticket at this time",
      error: error.message
    });
  }
};

const getMyTickets = async (req, res) => {
  const { id } = req.user;

  try {
    const tickets = await TicketModel.find({
      user: id
    })
      .populate(
        "event",
        "title description location date price image"
      )
      .populate(
        "booking",
        "bookingReference quantity totalAmount bookingStatus paymentStatus"
      )
      .sort({ createdAt: -1 });

    return res.status(200).send({
      message: "Tickets fetched successfully",
      data: tickets
    });
  } catch (error) {
    console.log(error);

    return res.status(500).send({
      message: "Cannot fetch tickets at this time"
    });
  }
};

const getEventTickets = async (req, res) => {
  const { id } = req.user;
  const { eventId } = req.params;

  try {
    const event = await EventModel.findById(eventId);

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    if (event.createdBy.toString() !== id) {
      return res.status(403).send({
        message: "You are not authorized to view tickets for this event"
      });
    }

    const tickets = await TicketModel.find({
      event: eventId
    })
      .populate(
        "user",
        "firstname lastname email"
      )
      .populate(
        "booking",
        "bookingReference quantity totalAmount bookingStatus paymentStatus"
      )
      .sort({ createdAt: -1 });

    return res.status(200).send({
      message: "Event tickets fetched successfully",
      data: tickets
    });
  } catch (error) {
    console.log(error);

    return res.status(500).send({
      message: "Cannot fetch event tickets at this time"
    });
  }
};

const getEventTicketStats = async (req, res) => {
  const { id } = req.user;
  const { eventId } = req.params;

  try {
    const event = await EventModel.findById(eventId);

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    if (event.createdBy.toString() !== id) {
      return res.status(403).send({
        message: "You are not authorized to view ticket statistics for this event"
      });
    }

    const ticketsIssued = await TicketModel.countDocuments({
      event: eventId
    });

    const validTickets = await TicketModel.countDocuments({
      event: eventId,
      status: "valid"
    });

    const usedTickets = await TicketModel.countDocuments({
      event: eventId,
      status: "used"
    });

    const cancelledTickets = await TicketModel.countDocuments({
      event: eventId,
      status: "cancelled"
    });

    const refundPendingTickets = await TicketModel.countDocuments({
      event: eventId,
      status: "refund_pending"
    });

    return res.status(200).send({
      message: "Event ticket statistics fetched successfully",
      data: {
        totalCapacity: event.totalTickets,
        availableTickets: event.availableTickets,
        ticketsIssued,
        validTickets,
        usedTickets,
        cancelledTickets,
        refundPendingTickets
      }
    });
  } catch (error) {
    console.log(error);

    return res.status(500).send({
      message: "Cannot fetch ticket statistics at this time"
    });
  }
};

const getCheckInHistory = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { id } = req.user;

    const event = await EventModel.findById(eventId);

    if (!event) {
      return res.status(404).send({
        message: "Event not found"
      });
    }

    if (event.createdBy.toString() !== id) {
      return res.status(403).send({
        message: "You are not authorized to view check-in history for this event"
      });
    }

    const checkIns = await TicketModel.find({
      event: eventId,
      status: "used"
    })
      .populate(
        "user",
        "firstname lastname email"
      )
      .populate(
        "checkedInBy",
        "firstname lastname email"
      )
      .populate(
        "booking",
        "bookingReference"
      )
      .sort({
        checkedInAt: -1
      });

    return res.status(200).send({
      message: "Check-in history fetched successfully",
      data: checkIns
    });
  } catch (error) {
    console.log("CHECK-IN HISTORY ERROR:", error);

    return res.status(500).send({
      message: "Cannot fetch check-in history at this time"
    });
  }
};

module.exports = {
  validateTicket,
  checkInTicket,
  getMyTickets,
  getEventTickets,
  getEventTicketStats,
  getCheckInHistory
};