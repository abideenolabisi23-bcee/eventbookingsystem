const express = require("express");

const {
  verifyUser
} = require("../controllers/user.controller");

const {
  getMyApartmentTickets,
  getApartmentTicketById
} = require("../controllers/apartmentTicket.controller");

const router = express.Router();

router.get(
  "/apartment-tickets/my",
  verifyUser,
  getMyApartmentTickets
);

router.get(
  "/apartment-tickets/:ticketId",
  verifyUser,
  getApartmentTicketById
);

module.exports = router;