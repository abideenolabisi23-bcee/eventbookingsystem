const express = require("express");
const { verifyUser } = require("../controllers/user.controller");
const { initializeApartmentPayment, verifyApartmentPayment } = require("../controllers/apartmentPayment.controller");



const router = express.Router();

router.post(
  "/apartment-payments/initialize", verifyUser, initializeApartmentPayment
);


router.get(
  "/apartment-payments/verify/:reference",
  verifyUser, verifyApartmentPayment
);

module.exports = router;