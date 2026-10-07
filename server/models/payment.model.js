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
      required: true
    },

    paymentReference: {
      type: String,
      required: true,
      unique: true
    },

    paymentMethod: {
      type: String,
    //   enum: ["card", "bank_transfer", "ussd"],
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
  default: 0
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
},



  },
  {
    timestamps: true,
    strict: "throw"
  }
);

const PaymentModel = mongoose.model("Payment", PaymentSchema);

module.exports = PaymentModel;