const express = require("express");

const {
  verifyUser,
  isOrganizer,
  isApprovedProvider
} = require("../controllers/user.controller");

const {
  createApartmentBooking,
  getMyApartmentBookings,
  getApartmentBookingById,
  cancelApartmentBooking,
  getApartmentBookingsForOrganizer,
  checkInApartmentGuest,
  checkOutApartmentGuest,
  getApartmentBookingStats,
  getApartmentBookingByReference,
  getApartmentBookingByCheckInToken
} = require("../controllers/apartmentBooking.controller");

const router = express.Router();


router.post(
  "/apartment-bookings",
  verifyUser,
  createApartmentBooking
);


router.get(
  "/apartment-bookings/my",
  verifyUser,
  getMyApartmentBookings
);

router.get(
  "/apartment-bookings/:bookingId",
  verifyUser,
  getApartmentBookingById
);

router.patch(
  "/apartment-bookings/:bookingId/cancel",
  verifyUser,
  cancelApartmentBooking
);

router.get(
  "/organizer/apartments/:apartmentId/bookings",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  getApartmentBookingsForOrganizer
);

router.patch(
  "/organizer/apartment-bookings/:bookingId/check-in",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  checkInApartmentGuest
);

router.patch(
  "/organizer/apartment-bookings/:bookingId/check-out",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  checkOutApartmentGuest
);

router.get(
  "/organizer/apartments/:apartmentId/booking-stats",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  getApartmentBookingStats
);

router.get(
  "/organizer/apartment-bookings/reference/:bookingReference",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  getApartmentBookingByReference
);

router.get(
  "/organizer/apartment-bookings/check-in-token/:checkInToken",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  getApartmentBookingByCheckInToken
);


module.exports = router;