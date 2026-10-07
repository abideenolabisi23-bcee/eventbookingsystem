const express = require("express");

const {
  verifyUser
} = require("../controllers/user.controller");

const {
  initializeFoodPayment,
  verifyFoodPayment,
  foodPaymentWebhook,
  reconcileFoodRefund
} = require("../controllers/foodPayment.controller");

const router = express.Router();

router.post(
  "/food-payments/initialize",
  verifyUser,
  initializeFoodPayment
);

router.get(
  "/food-payments/verify/:reference",
  verifyUser,
  verifyFoodPayment
);

router.post(
  "/food-payments/webhook",
  foodPaymentWebhook
);

router.get(
  "/food-payments/refund/:orderId",
  verifyUser,
  reconcileFoodRefund
);
module.exports = router;