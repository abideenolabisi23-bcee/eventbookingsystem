
const mongoose = require("mongoose");
const crypto = require("crypto");

const RefundSchema = new mongoose.Schema(
  {
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    tickets: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ticket",
        required: true
      }
    ],

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    refundKind: {
      type: String,
      enum: ["automatic_full", "ticket_cancellation"],
      default: "ticket_cancellation",
      required: true
    },

    paystackRefundId: {
      type: String,
      default: null
    },

    refundReference: {
      type: String,
      required: true,
      unique: true,
      default: () =>
        "REF-" +
        crypto.randomBytes(12).toString("hex").toUpperCase()
    },

    reason: {
      type: String,
      default: null
    },

    status: {
      type: String,
      enum: [
        "initiating",
        "pending",
        "processing",
        "processed",
        "failed",
        "needs-attention"
      ],
      default: "initiating"
    }
  },
  {
    timestamps: true,
    strict: "throw",
    optimisticConcurrency: true
  }
);

RefundSchema.index(
  { paystackRefundId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      paystackRefundId: {
        $type: "string"
      }
    }
  }
);

RefundSchema.index(
  { payment: 1, refundKind: 1 },
  {
    unique: true,
    partialFilterExpression: {
      refundKind: "automatic_full"
    }
  }
);

const RefundModel = mongoose.model(
  "Refund",
  RefundSchema
);

module.exports = RefundModel;
