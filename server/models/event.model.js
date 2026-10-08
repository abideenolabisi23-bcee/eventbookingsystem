const mongoose = require("mongoose");

const TicketTypeSchema = new mongoose.Schema(
  {
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
    _id: true
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
      type: Number,
      min: 0
    },

    totalTickets: {
      type: Number,
      min: 0
    },

    availableTickets: {
      type: Number,
      min: 0
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
  strict: "throw",
  optimisticConcurrency: true
}
);

const EventModel = mongoose.model(
  "Event",
  EventSchema
);

module.exports = EventModel;