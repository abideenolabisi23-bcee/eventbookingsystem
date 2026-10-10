const mongoose = require("mongoose");

const FoodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    description: {
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
      min: 0
    },

   category: {
  type: String,
  enum: [
    "rice",
    "swallow",
    "soups",
    "pasta",
    "noodles",
    "pizza",
    "shawarma",
    "burgers",
    "sandwiches",
    "chicken",
    "turkey",
    "grills",
    "seafood",
    "small_chops",
    "snacks",
    "breakfast",
    "salads",
    "desserts",
    "drinks",
    "local_delicacies",
    "beans",
    "yam",
    "plantain",
    "porridge",
    "others"
  ],
  required: true
},

    image: {
      type: String,
      default: null
    },

    /*
      isAvailable means:

      true  = vendor wants this food displayed
      false = vendor intentionally hides the food

      quantity controls whether it is sold out.
    */
    isAvailable: {
      type: Boolean,
      default: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true,
    strict: "throw"
  }
);

const FoodModel = mongoose.model(
  "Food",
  FoodSchema
);

module.exports = FoodModel;