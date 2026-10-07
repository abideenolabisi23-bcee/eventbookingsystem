const mongoose = require("mongoose");

const ApartmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },

    description: {
      type: String,
      required: true
    },

    apartmentType: {
      type: String,
      enum: ["budget", "standard", "luxury"],
      required: true
    },

    location: {
      type: String,
      required: true
    },

    pricePerNight: {
      type: Number,
      required: true
    },

    dayUsePrice: {
      type: Number,
      required: true
    },

    totalUnits: {
      type: Number,
      required: true
    },

    amenities: [
      {
        type: String
      }
    ],

  images: {
  exterior: {
    type: String,
    default: null
  },

  livingRoom: {
    type: String,
    default: null
  },

  bedroom: {
    type: String,
    default: null
  },

  kitchen: {
    type: String,
    default: null
  },

  bathroom: {
    type: String,
    default: null
  },

  balcony: {
    type: String,
    default: null
  }
},

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

module.exports = mongoose.model("Apartment", ApartmentSchema);