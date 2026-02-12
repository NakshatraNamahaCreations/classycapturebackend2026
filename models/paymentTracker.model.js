const mongoose = require("mongoose");

const PaymentTrackerSchema = new mongoose.Schema(
  {
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
      required: true,
      index: true,
    },

    installmentId: {
      type: mongoose.Schema.Types.ObjectId, // installment subdocument _id
      required: true,
      index: true,
    },

    paidAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      required: true, // "Cash" | "UPI" | "Razorpay" etc
      trim: true,
    },

    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // ✅ NEW: paid to (string)
    paidTo: {
      type: String, // e.g. "Ramesh", "Company Account", "Admin"
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

PaymentTrackerSchema.index({ quotationId: 1, paymentDate: -1 });
PaymentTrackerSchema.index({ installmentId: 1, paymentDate: -1 });
PaymentTrackerSchema.index({ paymentDate: -1 });


module.exports = mongoose.model("PaymentTracker", PaymentTrackerSchema);
