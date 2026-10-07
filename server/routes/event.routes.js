const express = require("express");
const upload = require("../middlewares/upload");

const {
  verifyUser,
  isOrganizer,
  isApprovedProvider
} = require("../controllers/user.controller");

const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getMyEvents,
  addEventStaff,
  removeEventStaff
} = require("../controllers/event.controller");

const router = express.Router();

router.post(
  "/events",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  upload.single("image"),
  createEvent
);

router.get(
  "/events",
  getEvents
);

router.get(
  "/organizer/events",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  getMyEvents
);

router.get(
  "/events/:id",
  getEventById
);

router.put(
  "/events/:id",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  upload.single("Image"),
  updateEvent
);

router.delete(
  "/events/:id",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  deleteEvent
);

router.post(
  "/organizer/events/:eventId/staff",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  addEventStaff
);

router.delete(
  "/organizer/events/:eventId/staff/:staffId",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  removeEventStaff
);

module.exports = router;