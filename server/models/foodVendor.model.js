
const mongoose = require("mongoose");

const FoodVendorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    businessName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },

    businessDescription: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },

    phone: {
      type: String,
      required: true,
      trim: true
    },

    businessAddress: {
      type: String,
      required: true,
      trim: true
    },

    city: {
      type: String,
      required: true,
      trim: true
    },

    state: {
      type: String,
      required: true,
      trim: true
    },

    logo: {
      type: String,
      default: ""
    },

    coverImage: {
      type: String,
      default: ""
    },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending"
    },

    isOpen: {
      type: Boolean,
      default: false
    },

    rejectionReason: {
      type: String,
      default: ""
    },

    approvedAt: {
      type: Date,
      default: null
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true,
    strict: "throw"
  }
);

FoodVendorSchema.index({
  approvalStatus: 1,
  createdAt: -1
});

FoodVendorSchema.index({
  city: 1,
  state: 1
});

const FoodVendorModel = mongoose.model(
  "FoodVendor",
  FoodVendorSchema
);

module.exports = FoodVendorModel;
