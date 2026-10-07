const express = require("express");
const upload = require("../middlewares/upload");

const {
  verifyUser,
  isOrganizer,
  isApprovedProvider
} = require("../controllers/user.controller");

const {
  createApartment,
  getApartments,
  getApartmentById,
  updateApartment,
  toggleApartmentAvailability,
  searchAvailableApartments,
  getMyApartments
} = require("../controllers/apartment.controller");

const router = express.Router();

const apartmentImages = upload.fields([
  {
    name: "exterior",
    maxCount: 1
  },
  {
    name: "livingRoom",
    maxCount: 1
  },
  {
    name: "bedroom",
    maxCount: 1
  },
  {
    name: "kitchen",
    maxCount: 1
  },
  {
    name: "bathroom",
    maxCount: 1
  },
  {
    name: "balcony",
    maxCount: 1
  },
  {
    name: "extraView",
    maxCount: 1
  }
]);

router.post(
  "/apartments",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  apartmentImages,
  createApartment
);

router.get(
  "/apartments",
  getApartments
);

router.get(
  "/apartments/search/availability",
  searchAvailableApartments
);

router.get(
  "/organizer/apartments",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  getMyApartments
);

router.get(
  "/apartments/:id",
  getApartmentById
);

router.put(
  "/apartments/:apartmentId",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  apartmentImages,
  updateApartment
);

router.patch(
  "/apartments/:apartmentId/availability",
  verifyUser,
  isOrganizer,
  isApprovedProvider,
  toggleApartmentAvailability
);

module.exports = router;