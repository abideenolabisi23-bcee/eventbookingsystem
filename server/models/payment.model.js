
const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    paymentReference: {
      type: String,
      required: true,
      unique: true
    },

    paymentMethod: {
      type: String,
      default: null
    },

    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "paid",
        "failed",
        "partially_refunded",
        "refunded"
      ],
      default: "pending"
    },

    refundedAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    refundStatus: {
      type: String,
      enum: [
        "none",
        "pending",
        "partially_refunded",
        "refunded",
        "failed"
      ],
      default: "none"
    }
  },
  {
    timestamps: true,
    strict: "throw",
    optimisticConcurrency: true
  }
);

PaymentSchema.path("amount").validate(
  Number.isFinite,
  "Payment amount must be a finite number"
);

PaymentSchema.path("refundedAmount").validate(
  Number.isFinite,
  "Refunded amount must be a finite number"
);

PaymentSchema.pre("validate", function () {
  if (
    Number.isFinite(this.amount) &&
    Number.isFinite(this.refundedAmount) &&
    Math.round(this.refundedAmount * 100) >
      Math.round(this.amount * 100)
  ) {
    this.invalidate(
      "refundedAmount",
      "Refunded amount cannot exceed payment amount"
    );
  }
});

const PaymentModel = mongoose.model(
  "Payment",
  PaymentSchema
);

module.exports = PaymentModel;
