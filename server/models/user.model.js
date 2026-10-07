const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: true
    },

    lastname: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true,
      unique: true
    },

    tag: {
      type: String,
      sparse: true,
      unique: true
    },

    password: {
      type: String,
      required: true,
      select: false
    },

    role: {
      type: String,
      enum: ["admin", "user", "organizer", "food_vendor"],
      default: "user"
    },

    businessName: {
      type: String,
      default: null
    },

    phone: {
      type: String,
      default: null
    },

    profilePicture: {
      type: String,
      default: null
    },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved"
    },

    accountStatus: {
      type: String,
      enum: ["active", "suspended"],
      default: "active"
    },

    resetPasswordToken: {
      type: String,
      default: null
    },

    resetPasswordExpires: {
      type: Date,
      default: null
    },

    refreshTokenHash: {
      type: String,
      default: null,
      select: false
    },
    profilePicture: {
  type: String,
  default: null
},
  },
  {
    timestamps: true,
    strict: "throw"
  }
);

const UserModel = mongoose.model(
  "User",
  UserSchema
);

module.exports = UserModel;