const mongoose = require("mongoose");

const VideoEditingTaskSchema = new mongoose.Schema(
  {
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
      required: true,
    },
    collectedDataId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CollectedData",
      required: true,
    },
    packageName: {
      type: String,
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
    },

    // Vendor info
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    vendorName: {
      type: String,
    },

    // Task details
    taskDescription: {
      type: String,
      trim: true,
    },

    totalClipsAssigned: {
      type: Number,
      required: true,
      min: 1,
    },

    finalVideoDuration: {
      type: String, // Example: "4–5 mins"
      trim: true,
    },

    assignedDate: {
      type: Date,
      default: Date.now,
    },

    completionDate: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["Assigned", "Completed"],
      default: "Assigned",
    },

    submittedDate: Date,
    submittedNotes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("VideoEditingTask", VideoEditingTaskSchema);
