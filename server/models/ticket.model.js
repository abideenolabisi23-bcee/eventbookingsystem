const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema(
  {
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

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },

    ticketType: {
  type: String,
  enum: ["Regular", "VIP", "VVIP"],
  default: null
},

ticketPrice: {
  type: Number,
  default: null
},

    ticketCode: {
      type: String,
      required: true,
      unique: true
    },

    qrCode: {
      type: String,
      default: null
    },

    status: {
      type: String,
      enum: [
        "valid",
        "used",
        "cancelled",
        "refund_pending"
      ],
      default: "valid"
    },

    checkedInAt: {
      type: Date,
      default: null
    },

    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true,
    strict: "throw"
  }
);

const TicketModel = mongoose.model(
  "Ticket",
  TicketSchema
);

module.exports = TicketModel;