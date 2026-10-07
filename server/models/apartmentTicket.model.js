const mongoose = require("mongoose");

const ApartmentTicketSchema =
  new mongoose.Schema(
    {
      booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ApartmentBooking",
        required: true,
        unique: true
      },

      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },

      apartment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Apartment",
        required: true
      },

      ticketCode: {
        type: String,
        required: true,
        unique: true
      },

      qrCode: {
        type: String,
        required: true
      },

      status: {
        type: String,
        enum: [
          "valid",
          "used",
          "cancelled"
        ],
        default: "valid"
      },

      checkedInAt: {
        type: Date,
        default: null
      }
    },
    {
      timestamps: true,
      strict: "throw"
    }
  );

module.exports = mongoose.model(
  "ApartmentTicket",
  ApartmentTicketSchema
);