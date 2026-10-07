const express = require("express");

const {
  verifyUser,
  isOrganizer,
  isApprovedProvider
} = require("../controllers/user.controller");

const {
  getMyApartmentTickets,
  getApartmentTicketById,
  validateApartmentTicket
} = require("../controllers/apartmentTicket.controller");

const router = express.Router();

router.get(
  "/apartment-tickets/my",
  verifyUser,
  getMyApartmentTickets
);

router.post(
  "/apartment-tickets/validate",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  validateApartmentTicket
);

router.get(
  "/apartment-tickets/:ticketId",
  verifyUser,
  getApartmentTicketById
);

module.exports = router;