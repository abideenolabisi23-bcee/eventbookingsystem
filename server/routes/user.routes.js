const express = require("express");
const upload = require("../middlewares/upload");

const {
  registerUser,
  registerOrganizer,
  registerFoodVendor,
  loginUser,
  verifyUser,
  getCurrentUser,
  updateUser,
  refreshAccessToken,
  logoutUser,
  forgotPassword,
  resetPassword,
  changePassword,
  uploadProfilePicture
} = require("../controllers/user.controller");

const router = express.Router();

router.post("/register", registerUser);

router.post(
  "/register-organizer",
  registerOrganizer
);

router.post(
  "/register-food-vendor",
  registerFoodVendor
);

router.post("/login", loginUser);

router.post(
  "/refresh-token",
  refreshAccessToken
);

router.post(
  "/logout",
  verifyUser,
  logoutUser
);

router.post(
  "/forgot-password",
  forgotPassword
);

router.patch(
  "/reset-password/:token",
  resetPassword
);

router.get(
  "/profile",
  verifyUser,
  getCurrentUser
);

router.put(
  "/profile",
  verifyUser,
  updateUser
);

router.patch(
  "/change-password",
  verifyUser,
  changePassword
);

router.patch(
  "/profile-picture",
  verifyUser,
  upload.single("profilePicture"),
  uploadProfilePicture
);

module.exports = router;