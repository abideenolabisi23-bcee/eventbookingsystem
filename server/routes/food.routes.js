const express = require("express");

const {
  verifyUser,
  isFoodVendor,
  isApprovedProvider
} = require("../controllers/user.controller");

const {
  createFood,
  getFoods,
  getFoodById,
  getMyFoods,
  updateFood,
  toggleFoodAvailability,
  deleteFood
} = require("../controllers/food.controller");

const router = express.Router();


// =====================================
// PUBLIC FOOD ROUTES
// =====================================

router.get(
  "/foods",
  getFoods
);

router.get(
  "/foods/:id",
  getFoodById
);


// =====================================
// FOOD VENDOR ROUTES
// =====================================

router.get(
  "/food-vendor/foods",
  verifyUser,
  isFoodVendor,
  isApprovedProvider,
  getMyFoods
);


router.post(
  "/foods",
  verifyUser,
  isFoodVendor,
  isApprovedProvider,
  createFood
);


router.put(
  "/foods/:foodId",
  verifyUser,
  isFoodVendor,
  isApprovedProvider,
  updateFood
);


router.patch(
  "/foods/:foodId/availability",
  verifyUser,
  isFoodVendor,
  isApprovedProvider,
  toggleFoodAvailability
);


router.delete(
  "/foods/:foodId",
  verifyUser,
  isFoodVendor,
  isApprovedProvider,
  deleteFood
);


module.exports = router;