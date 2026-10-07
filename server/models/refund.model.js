const mongoose = require("mongoose");

const RefundSchema = new mongoose.Schema(
  {
    // Original payment
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true
    },

    // Booking this refund belongs to
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true
    },

    // User requesting the refund
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // Exact ticket(s) being refunded
    tickets: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ticket",
        required: true
      }
    ],

    // Amount being refunded in Naira
    amount: {
      type: Number,
      required: true
    },

    // Refund ID returned by Paystack
    paystackRefundId: {
      type: String,
      required: true,
      unique: true
    },

    // Current refund status
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "processed",
        "failed",
        "needs-attention"
      ],
      default: "pending"
    }
  },
  {
    timestamps: true,
    strict: "throw"
  }
);

module.exports = mongoose.model("Refund", RefundSchema);