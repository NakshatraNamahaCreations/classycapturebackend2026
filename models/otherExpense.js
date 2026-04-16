const mongoose = require("mongoose");

const otherExpenseSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    remarks: {
      type: String,
      required: true,
      trim: true,
    },
    paidTo: {
      type: String,
      required: true,
      trim: true,
    },
    paymentDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// ✅ indexes for performance
otherExpenseSchema.index({ paymentDate: -1 });
otherExpenseSchema.index({ paidTo: 1, paymentDate: -1 });

const OtherExpense = mongoose.model("OtherExpense", otherExpenseSchema);
module.exports = OtherExpense;



