const express = require("express");

const {
  getAdminDashboard,

  getAllUsersAdmin,
  getUserByAdmin,

  getPendingProviders,
  getAllProviders,
  getProviderByAdmin,
  approveProvider,
  rejectProvider,
  deleteProvider,

  getAllEventsAdmin,
  getEventByAdmin,
  getAllEventBookingsAdmin,
  getAllEventPaymentsAdmin,

  getAllApartmentsAdmin,
  getApartmentByAdmin,
  getAllApartmentBookingsAdmin,
  getAllApartmentPaymentsAdmin,

  getAllFoodsAdmin,
  getFoodByAdmin,
  getAllFoodOrdersAdmin,
  getAllFoodPaymentsAdmin,

  suspendUser,
  reactivateUser,

  disableEventAdmin,
  enableEventAdmin,

  disableFoodAdmin,
  enableFoodAdmin,

  disableApartmentAdmin,
  enableApartmentAdmin,

  transferEventOrganizer
} = require("../controllers/admin.controller");

const {
  verifyUser
} = require("../controllers/user.controller");

const isAdmin = require(
  "../middlewares/isAdmin"
);

const router = express.Router();

router.use(verifyUser, isAdmin);

router.get(
  "/dashboard",
  getAdminDashboard
);

router.get(
  "/users",
  getAllUsersAdmin
);

router.get(
  "/users/:userId",
  getUserByAdmin
);

router.get(
  "/providers",
  getAllProviders
);

router.get(
  "/providers/pending",
  getPendingProviders
);

router.get(
  "/providers/:userId",
  getProviderByAdmin
);

router.patch(
  "/providers/:userId/approve",
  approveProvider
);

router.patch(
  "/providers/:userId/reject",
  rejectProvider
);

router.delete(
  "/providers/:userId",
  deleteProvider
);

router.patch(
  "/users/:userId/suspend",
  suspendUser
);

router.patch(
  "/users/:userId/reactivate",
  reactivateUser
);

router.get(
  "/events",
  getAllEventsAdmin
);

router.get(
  "/events/:eventId",
  getEventByAdmin
);

router.get(
  "/event-bookings",
  getAllEventBookingsAdmin
);

router.get(
  "/event-payments",
  getAllEventPaymentsAdmin
);

router.patch(
  "/events/:eventId/disable",
  disableEventAdmin
);

router.patch(
  "/events/:eventId/enable",
  enableEventAdmin
);

router.patch(
  "/events/:eventId/transfer",
  transferEventOrganizer
);

router.get(
  "/apartments",
  getAllApartmentsAdmin
);

router.get(
  "/apartments/:apartmentId",
  getApartmentByAdmin
);

router.get(
  "/apartment-bookings",
  getAllApartmentBookingsAdmin
);

router.get(
  "/apartment-payments",
  getAllApartmentPaymentsAdmin
);

router.patch(
  "/apartments/:apartmentId/disable",
  disableApartmentAdmin
);

router.patch(
  "/apartments/:apartmentId/enable",
  enableApartmentAdmin
);

router.get(
  "/foods",
  getAllFoodsAdmin
);

router.get(
  "/foods/:foodId",
  getFoodByAdmin
);

router.get(
  "/food-orders",
  getAllFoodOrdersAdmin
);

router.get(
  "/food-payments",
  getAllFoodPaymentsAdmin
);

router.patch(
  "/foods/:foodId/disable",
  disableFoodAdmin
);

router.patch(
  "/foods/:foodId/enable",
  enableFoodAdmin
);

module.exports = router;