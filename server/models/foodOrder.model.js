const mongoose = require("mongoose");

const FoodOrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    items: [
      {
        food: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Food",
          required: true
        },

        name: {
          type: String,
          required: true
        },

        price: {
          type: Number,
          required: true
        },

        quantity: {
          type: Number,
          required: true,
          min: 1
        },

        subtotal: {
          type: Number,
          required: true
        }
      }
    ],

    totalAmount: {
      type: Number,
      required: true
    },

    orderReference: {
      type: String,
      required: true,
      unique: true
    },

    // Generated only after successful payment
    pickupCode: {
  type: String,
  unique: true,
  sparse: true
},
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "packing",
        "ready",
        "completed",
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
        "refund_pending",
        "refunded"
      ],
      default: "pending"
    },

    collectedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    strict: "throw"
  }
);

const FoodOrderModel = mongoose.model(
  "FoodOrder",
  FoodOrderSchema
);

module.exports = FoodOrderModel;