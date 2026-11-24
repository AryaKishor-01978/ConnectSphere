
const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema(
  {
    meetingId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },

        role: {
          type: String,
          enum: ["host", "participant"],
          default: "participant"
        },

        joinedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    accessRequests: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },

        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending"
        },

        requestedAt: {
          type: Date,
          default: Date.now
        },

        reviewedAt: {
          type: Date,
          default: null
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Meeting", meetingSchema);
