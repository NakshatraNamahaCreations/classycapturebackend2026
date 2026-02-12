const mongoose = require("mongoose");

const AlbumPhotoCorrectionTaskSchema = new mongoose.Schema(
  {
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
      required: true,
      index: true,
    },
    albumId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    albumSnapshot: {
      templateLabel: String,
      baseSheets: Number,
      basePhotos: Number,
      boxLabel: String,
      unitPrice: Number,
    },

    // must come from latest AlbumPhotoSelected
    selectedPhotos: { type: Number, required: true, min: 0 },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    vendorName: { type: String, default: "" },

    taskDescription: { type: String, default: "" },

    completionDate: { type: Date, required: true },

    status: {
      type: String,
      enum: ["Assigned", "Completed"],
      default: "Assigned",
      index: true,
    },

    assignedDate: { type: Date, default: Date.now },
    submittedDate: { type: Date },
    submittedNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

AlbumPhotoCorrectionTaskSchema.index({ albumId: 1, createdAt: -1 });

module.exports = mongoose.model(
  "AlbumPhotoCorrectionTask",
  AlbumPhotoCorrectionTaskSchema
);
