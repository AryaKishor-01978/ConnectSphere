
const mongoose = require("mongoose");

const sharedFileSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
      unique: true
    },

    originalName: {
      type: String,
      required: true
    },

    size: {
      type: Number,
      required: true
    },

    meetingId: {
      type: String,
      required: true,
      index: true
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("SharedFile", sharedFileSchema);
