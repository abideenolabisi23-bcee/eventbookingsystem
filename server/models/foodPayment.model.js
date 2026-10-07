const mongoose = require("mongoose");

const FoodPaymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FoodOrder",
      required: true
    },

    amount: {
      type: Number,
      required: true
    },

    reference: {
      type: String,
      required: true,
      unique: true
    },

    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "paid",
        "failed",
        "refund_pending",
        "refunded"
      ],
      default: "pending"
    },

    paidAt: {
      type: Date,
      default: null
    },

    refundAmount: {
      type: Number,
      default: 0
    },

    refundReference: {
      type: String,
      default: null
    },

    refundReason: {
      type: String,
      default: null
    },

    refundedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    strict: "throw"
  }
);

// Prevent more than one ACTIVE payment
// attempt for the same food order.
//
// Failed attempts are allowed to be replaced
// by a new payment attempt.
FoodPaymentSchema.index(
  { order: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: [
          "pending",
          "processing",
          "paid",
          "refund_pending",
          "refunded"
        ]
      }
    }
  }
);

const FoodPaymentModel =
  mongoose.model(
    "FoodPayment",
    FoodPaymentSchema
  );

module.exports = FoodPaymentModel;