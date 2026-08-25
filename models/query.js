// const mongoose = require("mongoose");

// const querySchema = new mongoose.Schema(
//   {
//     queryId: { type: String, unique: true, required: true },
//     eventDetails: [
//       {
//         category: { type: String, required: true },
//         eventStartDate: { type: Date, required: true },
//         eventEndDate: { type: Date, required: true },
//       },
//     ],
//     status: { type: String },
//     comment: { type: String },
//     callRescheduledDate: { type: Date }, // ✅ new field added
//   },
//   { timestamps: true }
// );

// const Query = mongoose.models.Query || mongoose.model("Query", querySchema);
// module.exports = Query;


const mongoose = require("mongoose");

const callHistorySchema = new mongoose.Schema(
  {
    // calledBy: { type: String, required: true }, // Name or userId of caller
    calledTo: { type: String, required: true }, // Name or phone/email of person called
    callDate: { type: Date, required: true },   // When the call was made
    remarks: { type: String },                  // Remarks for the call
    rescheduledDate: { type: Date },            // If call was rescheduled
  },
  { _id: false }
);

const querySchema = new mongoose.Schema(
  {
    queryId: { type: String, unique: true, required: true },
    eventDetails: [
      {
        category: { type: String, required: true },
        eventStartDate: { type: Date, required: true },
        eventEndDate: { type: Date, required: true },
      },
    ],
    status: { 
      type: String, 
      enum: ["Booked", "Created", "Quotation", "Call Later", "Not Interested", "Cancelled"], 
      default: "Created" 
    }, // Only main status
    comment: { type: String },
    callRescheduledDate: { type: Date }, // For current reschedule
    callHistory: [callHistorySchema],    // Array of call history objects
  },
  { timestamps: true }
);

const Query = mongoose.models.Query || mongoose.model("Query", querySchema);
module.exports = Query;