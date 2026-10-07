const express = require("express");

const {
  verifyUser,
  isFoodVendor,
  isApprovedProvider
} = require("../controllers/user.controller");

const {
  createFoodOrder,
  getMyFoodOrders,
  getFoodOrderById,
  getVendorFoodOrders,
  getVendorFoodOrderById,
  updateFoodOrderStatus,
  cancelFoodOrder,
  verifyFoodPickup,
  confirmFoodPickup
} = require("../controllers/foodOrder.controller");

const router = express.Router();


// =====================================
// CUSTOMER FOOD ORDER ROUTES
// =====================================

// Any logged-in account can buy food
router.post(
  "/food-orders",
  verifyUser,
  createFoodOrder
);


// Customer sees all their orders
router.get(
  "/food-orders/my",
  verifyUser,
  getMyFoodOrders
);


// Customer cancels an order
router.patch(
  "/food-orders/:orderId/cancel",
  verifyUser,
  cancelFoodOrder
);


// Customer gets one order
router.get(
  "/food-orders/:orderId",
  verifyUser,
  getFoodOrderById
);


// =====================================
// FOOD VENDOR ORDER ROUTES
// =====================================

// Vendor sees all orders belonging
// to their food business
router.get(
  "/food-vendor/orders",
  verifyUser,
  isFoodVendor,
  isApprovedProvider,
  getVendorFoodOrders
);


// Vendor enters customer's pickup code
router.get(
  "/food-vendor/orders/pickup/:pickupCode",
  verifyUser,
  isFoodVendor,
  isApprovedProvider,
  verifyFoodPickup
);


// Vendor confirms food was collected
router.patch(
  "/food-vendor/orders/pickup/:pickupCode/confirm",
  verifyUser,
  isFoodVendor,
  isApprovedProvider,
  confirmFoodPickup
);


// Vendor gets one order
router.get(
  "/food-vendor/orders/:orderId",
  verifyUser,
  isFoodVendor,
  isApprovedProvider,
  getVendorFoodOrderById
);


// Vendor changes:
// pending -> packing -> ready
router.patch(
  "/food-vendor/orders/:orderId/status",
  verifyUser,
  isFoodVendor,
  isApprovedProvider,
  updateFoodOrderStatus
);


module.exports = router;