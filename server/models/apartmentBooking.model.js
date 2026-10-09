const mongoose = require("mongoose");
const crypto = require("node:crypto");

const ApartmentBookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    apartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true
    },

    stayType: {
      type: String,
      enum: ["day_use", "overnight"],
      required: true
    },

    checkInDate: {
      type: Date,
      required: true
    },

    checkOutDate: {
      type: Date,
      required: true
    },

    expectedCheckInTime: {
      type: String,
      default: null
    },

    numberOfUnits: {
      type: Number,
      required: true,
      min: 1
    },

    numberOfNights: {
      type: Number,
      default: 0
    },

    totalAmount: {
      type: Number,
      required: true
    },

    bookingReference: {
      type: String,
      required: true,
      unique: true
    },

    checkInToken: {
      type: String,
      unique: true,
      select: false,
      default: () => crypto.randomBytes(32).toString("hex")
    },

    expiresAt: {
      type: Date,
      required: true
    },

    bookingStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "expired"],
      default: "pending"
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending"
    },

    stayStatus: {
      type: String,
      enum: ["upcoming", "checked_in", "checked_out"],
      default: "upcoming"
    },

    checkedInAt: {
      type: Date,
      default: null
    },

    checkedOutAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    strict: "throw"
  }
);

ApartmentBookingSchema.index({
  bookingStatus: 1,
  paymentStatus: 1,
  expiresAt: 1
});

module.exports = mongoose.model(
  "ApartmentBooking",
  ApartmentBookingSchema
);