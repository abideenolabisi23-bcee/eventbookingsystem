const express = require("express");
const { verifyUser, isOrganizer } = require("../controllers/user.controller");
const { bookEvent, getMyBookings, getBookingById, getEventBookings, cancelTickets } = require("../controllers/booking.controller");
// const { verify } = require("jsonwebtoken");

const router = express.Router();


router.post("/bookings", verifyUser, bookEvent);

router.get("/bookings/my", verifyUser, getMyBookings);

router.get("/bookings/:id", verifyUser, getBookingById);

router.get("/organizer/events/:eventId/bookings", verifyUser, isOrganizer, getEventBookings);

router.patch("/bookings/:bookingId/cancel-tickets", verifyUser, cancelTickets);


module.exports = router;
