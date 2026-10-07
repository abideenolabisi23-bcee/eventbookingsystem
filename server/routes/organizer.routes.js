const express = require("express");

const {
  verifyUser,
  isOrganizer,
  isApprovedProvider
} = require("../controllers/user.controller");

const {
  getOrganizerDashboard
} = require("../controllers/organizer.controller");

const router = express.Router();

router.get(
  "/dashboard",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  getOrganizerDashboard
);

module.exports = router;