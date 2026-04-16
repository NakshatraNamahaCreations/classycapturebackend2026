const mongoose = require("mongoose");

const DispatchRemarkSchema = new mongoose.Schema(
  {
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
      required: true,
      index: true,
    },
    quotationUniqueId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    dispatchText: {
      type: String,
      required: true,
      trim: true,
  
    },
  },
{ timestamps: true } // ✅ only createdAt
);

module.exports = mongoose.model("DispatchRemark", DispatchRemarkSchema);
