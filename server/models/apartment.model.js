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
  required: true,
  min: 1,
  validate: {
    validator: Number.isInteger,
    message: "Total units must be a whole number"
  }
},

    amenities: [
      {
        type: String
      }
    ],

  images: {
  exterior: {
    type: String,
    default: ""
  },
  livingRoom: {
    type: String,
    default: ""
  },
  bedroom: {
    type: String,
    default: ""
  },
  kitchen: {
    type: String,
    default: ""
  },
  bathroom: {
    type: String,
    default: ""
  },
  balcony: {
    type: String,
    default: ""
  },
  extraView: {
    type: String,
    default: ""
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