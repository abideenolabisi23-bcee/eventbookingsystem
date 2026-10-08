require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const mongoose = require("mongoose");

const EventModel = require("../models/event.model");
const TicketModel = require("../models/ticket.model");
const BookingModel = require("../models/booking.model");

const auditEventInventory = async () => {
  try {
    await mongoose.connect(process.env.DB_URI);

    console.log("Database connected successfully");

    const eventId = "6ac011864fca5052f9bcfe3e";

    const event = await EventModel.findById(eventId);

    if (!event) {
      console.log("Event not found");
      return;
    }

    const tickets = await TicketModel.find({
      event: event._id
    });

    const bookings = await BookingModel.find({
      event: event._id
    });

    console.log("\nEVENT:", event.title);
    console.log("Total tickets:", event.totalTickets);
    console.log(
      "Main available tickets:",
      event.availableTickets
    );
    console.log("Ticket documents:", tickets.length);
    console.log("Booking documents:", bookings.length);

    let categoryAvailableTotal = 0;
    let expectedAvailableTotal = 0;

    for (const category of event.ticketTypes) {
      const categoryTickets = tickets.filter(
        (ticket) =>
          String(ticket.ticketType).toLowerCase() ===
          String(category.name).toLowerCase()
      );

      const activeTickets = categoryTickets.filter(
        (ticket) =>
          ["valid", "used", "refund_pending"].includes(
            ticket.status
          )
      );

      const cancelledTickets = categoryTickets.filter(
        (ticket) => ticket.status === "cancelled"
      );

      const expectedAvailable =
        category.totalTickets - activeTickets.length;

      const difference =
        category.availableTickets - expectedAvailable;

      categoryAvailableTotal += Number(
        category.availableTickets
      );

      expectedAvailableTotal += expectedAvailable;

      console.log("\nCATEGORY:", category.name);
      console.log("Total capacity:", category.totalTickets);
      console.log("Database available:", category.availableTickets);
      console.log("Active tickets:", activeTickets.length);
      console.log("Cancelled tickets:", cancelledTickets.length);
      console.log("Expected available:", expectedAvailable);
      console.log("Difference:", difference);
    }

    const pendingBookings = bookings.filter(
      (booking) =>
        booking.bookingStatus === "pending" &&
        booking.paymentStatus === "pending"
    );

    console.log("\nSUMMARY");
    console.log(
      "Sum of category availability:",
      categoryAvailableTotal
    );
    console.log(
      "Expected availability from ticket records:",
      expectedAvailableTotal
    );
    console.log(
      "Main availability difference:",
      Number(event.availableTickets) -
        categoryAvailableTotal
    );
    console.log(
      "Pending unpaid bookings:",
      pendingBookings.length
    );

console.log("\nBOOKING DETAILS");

for (const booking of bookings) {
  console.log("----------------------------");
  console.log("Reference:", booking.bookingReference);
  console.log("Quantity:", booking.quantity);
  console.log("Booking status:", booking.bookingStatus);
  console.log("Payment status:", booking.paymentStatus);

  if (
    booking.ticketSelections &&
    booking.ticketSelections.length > 0
  ) {
    for (const selection of booking.ticketSelections) {
      console.log(
        "Category:",
        selection.ticketType,
        "| Quantity:",
        selection.quantity
      );
    }
  } else {
    console.log(
      "Category:",
      booking.ticketType || "Not specified"
    );
  }

  console.log(
    "Issued tickets:",
    tickets.filter(
      (ticket) =>
        String(ticket.booking) === String(booking._id)
    ).length
  );
}

console.log("\nOLDER BOOKING TICKET DETAILS");

const olderBooking = bookings.find(
  (booking) =>
    booking.bookingReference === "BK-1791149785938-488"
);

if (olderBooking) {
  const olderTickets = tickets.filter(
    (ticket) =>
      String(ticket.booking) === String(olderBooking._id)
  );

  console.log("Booking reference:", olderBooking.bookingReference);
  console.log("Booking quantity:", olderBooking.quantity);
  console.log("Booking total amount:", olderBooking.totalAmount);
console.log("Legacy ticket type:", olderBooking.ticketType);
console.log("Legacy ticket price:", olderBooking.ticketPrice);
console.log(
  "Original ticket selections:",
  JSON.stringify(olderBooking.ticketSelections, null, 2)
);

console.log(
  "Booking created at:",
  olderBooking.createdAt
);

console.log("\nTICKET PRICES");

for (const ticket of olderTickets) {
  console.log("Ticket price:", ticket.ticketPrice);
}
  console.log("Booking status:", olderBooking.bookingStatus);
  console.log("Payment status:", olderBooking.paymentStatus);

  for (const ticket of olderTickets) {
    console.log("----------------------------");
    console.log("Ticket category:", ticket.ticketType);
    console.log("Ticket status:", ticket.status);
    console.log(
      "Ticket category ID:",
      ticket.ticketTypeId
        ? String(ticket.ticketTypeId)
        : "Not specified"
    );
  }
}

    console.log("\nREAD-ONLY AUDIT COMPLETED");
  } catch (error) {
    console.log("AUDIT ERROR:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

auditEventInventory();
