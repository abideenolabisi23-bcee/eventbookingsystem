
const mongoose = require("mongoose");
const FoodVendorModel = require("../models/foodVendor.model");

const applyAsFoodVendor = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).send({
        message: "Please sign in to apply as a food vendor"
      });
    }

    const {
      businessName,
      businessDescription,
      phone,
      businessAddress,
      city,
      state
    } = req.body;

    if (
      !businessName?.trim() ||
      !phone?.trim() ||
      !businessAddress?.trim() ||
      !city?.trim() ||
      !state?.trim()
    ) {
      return res.status(400).send({
        message: "Please complete all required business information"
      });
    }

    const existingVendor = await FoodVendorModel.findOne({
      user: userId
    });

    if (existingVendor) {
      return res.status(409).send({
        message: "You already have a food vendor application",
        data: existingVendor
      });
    }

    const vendor = await FoodVendorModel.create({
      user: userId,
      businessName: businessName.trim(),
      businessDescription:
        typeof businessDescription === "string"
          ? businessDescription.trim()
          : "",
      phone: phone.trim(),
      businessAddress: businessAddress.trim(),
      city: city.trim(),
      state: state.trim()
    });

    return res.status(201).send({
      message:
        "Food vendor application submitted successfully. Your application is awaiting admin approval.",
      data: vendor
    });
  } catch (error) {
    console.error("APPLY FOOD VENDOR ERROR:", error);

    if (error.code === 11000) {
      return res.status(409).send({
        message: "You already have a food vendor application"
      });
    }

    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).send({
        message: error.message
      });
    }

    return res.status(500).send({
      message: "Cannot submit food vendor application at this time"
    });
  }
};

const getMyFoodVendorProfile = async (req, res) => {
  try {
    const vendor = await FoodVendorModel.findOne({
      user: req.user.id
    });

    if (!vendor) {
      return res.status(404).send({
        message: "You have not applied as a food vendor"
      });
    }

    return res.status(200).send({
      message: "Food vendor profile retrieved successfully",
      data: vendor
    });
  } catch (error) {
    console.error("GET FOOD VENDOR ERROR:", error);

    return res.status(500).send({
      message: "Cannot retrieve food vendor profile"
    });
  }
};

module.exports = {
  applyAsFoodVendor,
  getMyFoodVendorProfile
};
