const express = require("express");
const { initializePayment, verifyPayment, verifyRefund, getMyRefunds, getRefundById, paystackWebhook, getMyPayments } = require("../controllers/payment.controller");
const { verifyUser } = require("../controllers/user.controller");


const router = express.Router();


router.post("/payments/initialize", verifyUser, initializePayment);

router.get(
  "/payments/verify/:reference", verifyUser, verifyPayment
);

router.get(
  "/payments/refunds/:refundId/verify", verifyUser, verifyRefund
);

router.get(
  "/refunds/my", verifyUser, getMyRefunds
);

router.get(
  "/refunds/:refundId", verifyUser, getRefundById
);

router.post(
  "/payments/webhook", paystackWebhook
);

router.get(
  "/payments/my",
  verifyUser, getMyPayments
);
module.exports = router;