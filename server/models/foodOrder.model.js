
const mongoose = require("mongoose");

const FoodOrderItemSchema = new mongoose.Schema(
  {
    food: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Food",
      required: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Food quantity must be a whole number"
      }
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

    items: {
      type: [FoodOrderItemSchema],
      required: true,
      validate: {
        validator: (items) =>
          Array.isArray(items) && items.length > 0,
        message: "An order must contain at least one food"
      }
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },

    orderReference: {
      type: String,
      required: true,
      unique: true
    },

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

FoodOrderSchema.index({
  user: 1,
  createdAt: -1
});

FoodOrderSchema.index({
  vendor: 1,
  createdAt: -1
});

const FoodOrderModel = mongoose.model(
  "FoodOrder",
  FoodOrderSchema
);

module.exports = FoodOrderModel;
