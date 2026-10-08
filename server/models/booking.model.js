const mongoose = require("mongoose");

const BookingTicketSelectionSchema = new mongoose.Schema(
  {
    ticketTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },

    ticketType: {
      type: String,
      required: true,
      trim: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isInteger
    },

    ticketPrice: {
      type: Number,
      required: true,
      min: 0
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0
    }
  },
  {
    _id: false
  }
);

const BookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },

    ticketType: {
      type: String,
      default: null
    },

    ticketPrice: {
      type: Number,
      default: null
    },

    ticketSelections: {
      type: [BookingTicketSelectionSchema],
      default: []
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isInteger
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },

    bookingReference: {
      type: String,
      required: true,
      unique: true
    },

    bookingStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "partially_cancelled",
        "cancelled"
      ],
      default: "pending"
    },

    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "paid",
        "failed",
        "partially_refunded",
        "refunded"
      ],
      default: "pending"
    }
  },
  {
    timestamps: true,
    strict: "throw"
  }
);

const BookingModel = mongoose.model(
  "Booking",
  BookingSchema
);

module.exports = BookingModel;