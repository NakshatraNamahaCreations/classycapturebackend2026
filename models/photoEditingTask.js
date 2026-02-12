const mongoose = require("mongoose");


const PhotoEditingTaskSchema = new mongoose.Schema(
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

    assignedPhotosToEdit: {
      type: Number,
      required: true,
      min: 1,
    },
    submittedPhotosToEdit: { type: Number, default: 0 }, // ✅ not required

    assignedDate: {
      type: Date,
      default: Date.now,
    },

    completionDate: {
      type: Date,
    },

    // Workflow
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

module.exports = mongoose.model("PhotoEditingTask", PhotoEditingTaskSchema);
