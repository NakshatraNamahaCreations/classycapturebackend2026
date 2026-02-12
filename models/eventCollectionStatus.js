const mongoose = require("mongoose");

const EventCollectionStatusSchema = new mongoose.Schema(
  {
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
      required: true,
      index: true,
    },
    quotationUniqueId: { type: String, required: true, index: true },

    packageId: { type: mongoose.Schema.Types.ObjectId, required: true },
    packageName: { type: String, default: "" },

    eventEndDateObj: { type: Date, index: true },

    requiredUnitsCount: { type: Number, default: 0 },
    collectedUnitsCount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["Pending", "Partial", "Completed"],
      default: "Pending",
      index: true,
    },

    collectionLastUpdatedAt: { type: Date },
  },
  { timestamps: true }
);

EventCollectionStatusSchema.index(
  { quotationId: 1, packageId: 1 },
  { unique: true }
);

module.exports = mongoose.model("EventCollectionStatus", EventCollectionStatusSchema);
