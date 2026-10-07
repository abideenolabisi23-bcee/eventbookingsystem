const express = require("express");

const {
  verifyUser,
  isOrganizer,
  isApprovedProvider
} = require("../controllers/user.controller");

const {
  validateTicket,
  checkInTicket,
  getMyTickets,
  getEventTickets,
  getEventTicketStats,
  getCheckInHistory
} = require("../controllers/ticket.controller");

const router = express.Router();

router.post(
  "/tickets/validate",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  validateTicket
);

router.post(
  "/tickets/check-in",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  checkInTicket
);

router.get(
  "/tickets/my",
  verifyUser,
  getMyTickets
);

router.get(
  "/organizer/events/:eventId/tickets",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  getEventTickets
);

router.get(
  "/organizer/events/:eventId/ticket-stats",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  getEventTicketStats
);

router.get(
  "/organizer/events/:eventId/check-ins",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  getCheckInHistory
);

module.exports = router;