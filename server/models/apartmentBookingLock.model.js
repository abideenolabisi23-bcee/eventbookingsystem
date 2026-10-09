const mongoose = require("mongoose");

const ApartmentBookingLockSchema = new mongoose.Schema(
  {
    apartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
      unique: true
    },

    version: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "ApartmentBookingLock",
  ApartmentBookingLockSchema
);