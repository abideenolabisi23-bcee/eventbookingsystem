const mongoose = require("mongoose");

const TicketTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ["Regular", "VIP", "VVIP"]
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    totalTickets: {
      type: Number,
      required: true,
      min: 0
    },

    availableTickets: {
      type: Number,
      required: true,
      min: 0
    }
  },
  {
    _id: false
  }
);

const EventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },

    description: {
      type: String,
      required: true
    },

    location: {
      type: String,
      required: true
    },

    date: {
      type: Date,
      required: true
    },

    price: {
      type: Number
    },

    totalTickets: {
      type: Number
    },

    availableTickets: {
      type: Number
    },

    ticketTypes: {
      type: [TicketTypeSchema],
      default: []
    },

    image: {
      type: String
    },

    isAvailable: {
      type: Boolean,
      default: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    checkInStaff: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ]
  },
  {
    timestamps: true,
    strict: "throw"
  }
);

const EventModel = mongoose.model(
  "Event",
  EventSchema
);

module.exports = EventModel;