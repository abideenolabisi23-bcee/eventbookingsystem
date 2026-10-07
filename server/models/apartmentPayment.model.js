const mongoose = require("mongoose");

const ApartmentPaymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ApartmentBooking",
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

    authorizationUrl: {
  type: String,
  default: null
},

accessCode: {
  type: String,
  default: null
},

    paymentMethod: {
      type: String,
      default: null
    },

    status: {
      type: String,
      enum: [
        "pending",
        "paid",
        "failed",
        "refunded"
      ],
      default: "pending"
    },

    refundedAmount: {
      type: Number,
      default: 0
    },

    paystackRefundId: {
  type: String,
  default: null
},

    refundStatus: {
      type: String,
      enum: [
        "none",
        "pending",
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

module.exports = mongoose.model(
  "ApartmentPayment",
  ApartmentPaymentSchema
);