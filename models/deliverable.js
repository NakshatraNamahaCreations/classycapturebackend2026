// models/deliverable.js
const mongoose = require("mongoose");

const DeliverableItemSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    label: { type: String, default: "" },

    photos: { type: Number, default: 0 },
    videos: { type: Number, default: 0 },
    reels: { type: Number, default: 0 },

    duration: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const DeliverablePackageSchema = new mongoose.Schema(
  {
    packageId: { type: mongoose.Schema.Types.ObjectId, default: null },
    packageName: { type: String, default: "" },
    eventStartDate: { type: String, default: "" },
    eventEndDate: { type: String, default: "" },

    deliverables: { type: [DeliverableItemSchema], default: [] },
  },
  { _id: false }
);

const DeliverableAlbumSchema = new mongoose.Schema(
  {
    albumId: { type: mongoose.Schema.Types.ObjectId, default: null },
    name: { type: String, default: "" },
    status: { type: String, default: "" },
  },
  { _id: false }
);

// ✅ Additional services (NO PRICE STORED)
const DeliverableAdditionalServiceSchema = new mongoose.Schema(
  {
    serviceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    name: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: false }
);

const DeliverableSchema = new mongoose.Schema(
  {
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
      required: true,
      index: true,
      unique: true,
    },

    quotationUniqueId: { type: String, index: true, default: "" }, // QN0023

    // ✅ NEW: Couple/Person name from CollectedData
    personName: { type: String, default: "", index: true },

    status: {
      type: String,
      enum: ["Draft", "Finalized"],
      default: "Draft",
      index: true,
    },

    version: { type: Number, default: 1 },
    finalizedAt: { type: Date, default: null },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    snapshot: {
      packages: { type: [DeliverablePackageSchema], default: [] },
      albums: { type: [DeliverableAlbumSchema], default: [] },
      additionalServices: { type: [DeliverableAdditionalServiceSchema], default: [] },

      summary: {
        totalSortedPhotos: { type: Number, default: 0 },
        totalEditedPhotos: { type: Number, default: 0 },
        totalTraditionalVideos: { type: Number, default: 0 },
        totalCandidVideos: { type: Number, default: 0 },
        totalReels: { type: Number, default: 0 },
        totalAlbums: { type: Number, default: 0 },
      },
    },

    meta: {
      computedFrom: {
        sortingTaskCount: { type: Number, default: 0 },
        photoEditTaskCount: { type: Number, default: 0 },
        videoEditTaskCount: { type: Number, default: 0 },
      },
    },
  },
  { timestamps: true }
);

/**
 * ✅ Guardrail: prevents CastError if someone accidentally sends an object instead of array
 */
DeliverableSchema.pre("validate", function (next) {
  try {
    if (this.snapshot?.packages && !Array.isArray(this.snapshot.packages)) {
      this.snapshot.packages = [this.snapshot.packages];
    }
    if (this.snapshot?.albums && !Array.isArray(this.snapshot.albums)) {
      this.snapshot.albums = [this.snapshot.albums];
    }
    if (this.snapshot?.additionalServices && !Array.isArray(this.snapshot.additionalServices)) {
      this.snapshot.additionalServices = [this.snapshot.additionalServices];
    }
    next();
  } catch (e) {
    next(e);
  }
});

module.exports = mongoose.model("Deliverable", DeliverableSchema);
