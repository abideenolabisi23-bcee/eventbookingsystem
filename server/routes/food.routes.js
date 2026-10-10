
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

const uploadFood = require("../middlewares/uploadFood");

const router = express.Router();

router.get(
  "/foods",
  getFoods
);

router.get(
  "/foods/:id",
  getFoodById
);

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
  uploadFood.single("image"),
  createFood
);

router.put(
  "/foods/:foodId",
  verifyUser,
  isFoodVendor,
  isApprovedProvider,
  uploadFood.single("image"),
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
