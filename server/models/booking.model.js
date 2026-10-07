const mongoose = require("mongoose");

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
  enum: ["Regular", "VIP", "VVIP"],
  default: null
},

ticketPrice: {
  type: Number,
  default: null
},

    quantity: {
      type: Number,
      required: true,
      min: 1
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