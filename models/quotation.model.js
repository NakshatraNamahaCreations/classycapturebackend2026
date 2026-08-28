// // models/Quotation.js
// const mongoose = require("mongoose");

// /* ---------- Albums ---------- */

// const SheetTypeSchema = new mongoose.Schema(
//   { id: String, label: String, price: Number },
//   { _id: false }
// );

// // Map<string, number> for sheet quantities
// const SheetQtyMap = { type: Map, of: Number, default: undefined };

// const AlbumExtrasSchema = new mongoose.Schema(
//   {
//     // one of these will be used (based on customizePerUnit)
//     shared: SheetQtyMap, // applies to every unit
//     perUnit: [{ type: Map, of: Number }], // length must equal qty if customizePerUnit=true
//   },
//   { _id: false }
// );

// const AlbumSuggestedSchema = new mongoose.Schema(
//   {
//     // album-only price (no box) per unit at time of save
//     albumOnlyPerUnit: [{ type: Number, min: 0 }],
//     // box surcharge per unit at time of save
//     boxPerUnit: { type: Number, default: 0, min: 0 },
//     // final per-unit (album + extras + box)
//     finalPerUnit: [{ type: Number, min: 0 }],
//     // final total (all units)
//     finalTotal: { type: Number, default: 0, min: 0 },
//   },
//   { _id: false }
// );

// const AlbumSnapshotSchema = new mongoose.Schema(
//   {
//     templateLabel: String,
//     baseSheets: Number,
//     basePhotos: Number,
//     boxLabel: String,
//     // optional but useful if box prices change later
//     boxSurchargeAtSave: { type: Number, default: 0 },
//     sheetTypes: [SheetTypeSchema],
//   },
//   { _id: false }
// );

// const AlbumSchema = new mongoose.Schema(
//   {
//     // optional: keep client-side id to map UI rows if you like
//     clientId: String,

//     templateId: { type: String, required: true },
//     boxTypeId: { type: String, required: true },

//     qty: { type: Number, default: 1, min: 1 },

//     // IMPORTANT: album-only unit price (no box)
//     unitPrice: { type: Number, required: true, min: 0 },

//     // legacy field you had; keep for display if you want
//     extraSheets: { type: Number, default: 0, min: 0 },

//     customizePerUnit: { type: Boolean, default: false },

//     extras: { type: AlbumExtrasSchema, default: {} },

//     suggested: { type: AlbumSuggestedSchema, default: {} },

//     snapshot: { type: AlbumSnapshotSchema, default: {} },

//     notes: String,
//     type: String,
//     status: {
//       type: String,
//       enum: [
//         "Awaiting Customer Selection",
//         "Photos To Be Selected By Us",
//         "Selection Ready",
//         "In Progress",
//         "Awaiting Printing Approval",
//         "Sent for Printing",
//         "Completed",
//       ],
//       default: "Awaiting Customer Selection",
//     },
//   },
//   { _id: true, timestamps: true }
// );

// // Validate: when customizePerUnit=true, extras.perUnit length must match qty
// AlbumSchema.pre("validate", function (next) {
//   if (this.customizePerUnit) {
//     const arr = Array.isArray(this.extras?.perUnit) ? this.extras.perUnit : [];
//     if (arr.length !== this.qty) {
//       return next(
//         new Error(
//           "extras.perUnit length must equal qty when customizePerUnit is true"
//         )
//       );
//     }
//   }
//   next();
// });

// // Convenience: compute total if suggested.finalTotal missing
// AlbumSchema.methods.computeTotal = function () {
//   if (typeof this.suggested?.finalTotal === "number")
//     return this.suggested.finalTotal;

//   // best effort fallback (album only + box; extras unknown here)
//   const box = Number(this.suggested?.boxPerUnit || 0);
//   const qty = this.qty || 1;
//   if (this.customizePerUnit && Array.isArray(this.suggested?.finalPerUnit)) {
//     return this.suggested.finalPerUnit.reduce(
//       (a, b) => a + (Number(b) || 0),
//       0
//     );
//   }
//   return (Number(this.unitPrice || 0) + box) * qty;
// };

// // Optional: virtual to show approx extra sheets per unit (shared or avg of per-unit)
// AlbumSchema.virtual("extraSheetsPerUnit").get(function () {
//   if (this.customizePerUnit && Array.isArray(this.extras?.perUnit)) {
//     const sums = this.extras.perUnit.map((m) =>
//       Array.from((m || new Map()).values()).reduce(
//         (a, b) => a + (Number(b) || 0),
//         0
//       )
//     );
//     return Math.round(sums.reduce((a, b) => a + b, 0) / (sums.length || 1));
//   }
//   if (this.extras?.shared instanceof Map) {
//     return Array.from(this.extras.shared.values()).reduce(
//       (a, b) => a + (Number(b) || 0),
//       0
//     );
//   }
//   // legacy
//   return Number(this.extraSheets || 0);
// });

// /* ---------- Vendors / Services / Packages (your original, unchanged) ---------- */

// const AssignedVendorSchema = new mongoose.Schema(
//   {
//     vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
//     vendorName: String,
//     category: String,
//     salary: Number,
//     paymentStatus: {
//       type: String,
//       enum: ["Completed", "Pending"],
//       default: "Pending",
//     },
//     paymentDate: { type: Date },
//     paymentMode: { type: String },
//   },
//   { _id: false }
// );

// const AssignedAssistantSchema = new mongoose.Schema(
//   {
//     assistantId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
//     assistantName: String,
//     category: String,
//   },
//   { _id: false }
// );

// const ServiceSchema = new mongoose.Schema(
//   {
//     serviceName: String,
//     price: Number,
//     marginPrice: Number,
//     qty: { type: Number, default: 1, min: 1 },
//     assignedVendors: { type: [AssignedVendorSchema], default: [] },
//     assignedAssistants: { type: [AssignedAssistantSchema], default: [] },
//   },
//   { _id: true }
// );

// const PackageSchema = new mongoose.Schema(
//   {
//     categoryName: String,
//     packageType: {
//       type: String,
//       enum: ["Custom", "Preset"],
//       default: "Custom",
//     },
//     eventStartDate: String,
//     eventEndDate: String,
//     slot: String,
//     venueName: String,
//     venueAddress: String,
//     services: { type: [ServiceSchema], default: [] },
//   },
//   { _id: true }
// );

// const InstallmentSchema = new mongoose.Schema(
//   {
//     installmentNumber: Number,
//     dueDate: String,
//     paymentMode: String,
//     paymentAmount: Number, // planned amount (from % when created)
//     paymentPercentage: Number,
//     paidAmount: {
//       type: Number,
//       default: 0,
//     },
//     pendingAmount: {
//       type: Number,
//       default: 0,
//     },
//     status: {
//       type: String,
//       enum: ["Pending", "Partial Paid", "Completed"],
//       default: "Pending",
//     },
//     // NEW: store multiple account holders with their paid amounts
//     accountHolders: [
//       {
//         name: String,
//       },
//     ],
//   },
//   { _id: true }
// );

// const FollowUpHistorySchema = new mongoose.Schema(
//   {
//     date: { type: Date, default: Date.now },
//     status: {
//       type: String,
//       enum: ["Pending", "Contacted", "Payment Received"],
//       default: "Pending",
//     },
//     notes: String,
//     contactedBy: String,
//   },
//   { _id: true }
// );

// const QuotationSchema = new mongoose.Schema(
//   {
//     leadId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Lead",
//       required: true,
//     },
//     queryId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Query",
//       required: true,
//     },
//     quotationId: { type: String, required: true, unique: true },

//     quoteTitle: String,
//     quoteDescription: String,
//     invoiceNumber: { type: String, unique: true, sparse: true },
//     quoteNote: String,
//     whatsappGroupName: String,
//     packages: { type: [PackageSchema], default: [] },
//     installments: { type: [InstallmentSchema], default: [] },
//     totalPackageAmt: Number,
//     totalAlbumAmount: Number,
//     totalAmount: Number,
//     oldAmount: {
//       type: Number,
//       default: 0,
//     },
//     // discountPercent: Number,
//     discountValue: Number,
//     gstApplied: Boolean,
//     gstValue: Number,
//     marginAmount: Number,

//     bookingStatus: {
//       type: String,
//       enum: ["NotBooked", "Booked", "Completed"],
//       default: "NotBooked",
//     },
//     finalized: { type: Boolean, default: false },

//     clientInstructions: { type: [String], default: [] },

//     // ✅ albums embedded here
//     albums: { type: [AlbumSchema], default: [] },

//     followUpHistory: { type: [FollowUpHistorySchema], default: [] },
//   },
//   { timestamps: true }
// );

// // Keep vendor/assistant arrays within qty bounds
// QuotationSchema.pre("save", function (next) {
//   this.packages?.forEach((pkg) => {
//     pkg.services?.forEach((s) => {
//       const desired = Math.max(1, s.qty || 1);
//       if (!Array.isArray(s.assignedVendors)) s.assignedVendors = [];
//       while (s.assignedVendors.length < desired) s.assignedVendors.push({});
//       if (!Array.isArray(s.assignedAssistants)) s.assignedAssistants = [];
//       while (s.assignedAssistants.length < desired)
//         s.assignedAssistants.push({});
//       if (s.assignedVendors.length > desired)
//         s.assignedVendors = s.assignedVendors.slice(0, desired);
//       if (s.assignedAssistants.length > desired)
//         s.assignedAssistants = s.assignedAssistants.slice(0, desired);
//     });
//   });
//   next();
// });

// // ➤ Yearly client payments (sum of paidAmount)
// QuotationSchema.statics.getYearlyClientPayments = async function () {
//   return this.aggregate([
//     { $unwind: "$installments" },
//     {
//       $addFields: {
//         installmentYear: { $year: "$createdAt" }, // use createdAt year of Quotation
//       },
//     },
//     {
//       $group: {
//         _id: "$installmentYear",
//         totalReceived: { $sum: "$installments.paidAmount" },
//       },
//     },
//     { $sort: { _id: 1 } },
//   ]);
// };

// // ➤ Yearly vendor payments
// QuotationSchema.statics.getYearlyVendorPayments = async function () {
//   return this.aggregate([
//     { $unwind: "$packages" },
//     { $unwind: "$packages.services" },
//     { $unwind: "$packages.services.assignedVendors" },
//     {
//       $match: {
//         "packages.services.assignedVendors.paymentStatus": "Completed", // ✅ Only completed
//       },
//     },
//     {
//       $addFields: {
//         vendorPaymentYear: {
//           $cond: [
//             {
//               $ifNull: [
//                 "$packages.services.assignedVendors.paymentDate",
//                 false,
//               ],
//             },
//             { $year: "$packages.services.assignedVendors.paymentDate" },
//             { $year: "$createdAt" },
//           ],
//         },
//       },
//     },
//     {
//       $group: {
//         _id: "$vendorPaymentYear",
//         totalPaid: { $sum: "$packages.services.assignedVendors.salary" },
//       },
//     },
//     { $sort: { _id: 1 } },
//   ]);
// };

// module.exports = mongoose.model("Quotation", QuotationSchema);

// models/Quotation.js
const mongoose = require("mongoose");

/* ---------- Albums (SIMPLIFIED: qty always 1, no per-unit customization) ---------- */

const SheetTypeSchema = new mongoose.Schema(
  { id: String, label: String, price: Number },
  { _id: false },
);

// Map<string, number> for sheet quantities (shared only)
const SheetQtyMap = { type: Map, of: Number, default: undefined };

const AlbumExtrasSchema = new mongoose.Schema(
  {
    // shared extras for this single album unit
    shared: SheetQtyMap,
  },
  { _id: false },
);

const AlbumSuggestedSchema = new mongoose.Schema(
  {
    // album-only price (no box) at time of save
    albumOnly: { type: Number, default: 0, min: 0 },

    // box surcharge at time of save
    boxSurcharge: { type: Number, default: 0, min: 0 },

    // extras total at time of save (optional but useful)
    extrasTotal: { type: Number, default: 0, min: 0 },

    // final price for this album unit (album + extras + box)
    finalTotal: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const AlbumSnapshotSchema = new mongoose.Schema(
  {
    templateLabel: String,
    baseSheets: Number,
    basePhotos: Number,

    boxLabel: String,
    boxSurchargeAtSave: { type: Number, default: 0 },

    sheetTypes: [SheetTypeSchema],
  },
  { _id: false },
);

const AlbumSchema = new mongoose.Schema(
  {
    clientId: String,

    templateId: { type: String, required: true },
    boxTypeId: { type: String, required: true },

    // unit price (album only, without box)
    unitPrice: { type: Number, required: true, min: 0 },

    // optional: keep if you still want legacy display
    extraSheets: { type: Number, default: 0, min: 0 },

    // ✅ only shared extras since qty is always 1
    extras: { type: AlbumExtrasSchema, default: {} },

    // ✅ only single totals since qty is always 1
    suggested: { type: AlbumSuggestedSchema, default: {} },

    snapshot: { type: AlbumSnapshotSchema, default: {} },

    notes: String,
    type: String,
    status: {
      type: String,
      enum: [
        "Awaiting Customer Selection",
        "Photos To Be Selected By Us",
        "Selection Ready",
        "Album Photo Correction",
        "In Progress",
        "Awaiting Printing Approval",
        "Sent for Printing",
        "Completed",
      ],
      default: "Awaiting Customer Selection",
    },
  },
  { _id: true, timestamps: true },
);

// helper: sum extras from shared map
function sumExtrasMap(shared) {
  try {
    if (!(shared instanceof Map)) return 0;
    let total = 0;
    for (const v of shared.values()) total += Number(v || 0);
    return total;
  } catch (e) {
    return 0;
  }
}

// Convenience: compute total if suggested.finalTotal missing
AlbumSchema.methods.computeTotal = function () {
  try {
    if (
      typeof this.suggested?.finalTotal === "number" &&
      this.suggested.finalTotal > 0
    ) {
      return this.suggested.finalTotal;
    }

    const box = Number(this.suggested?.boxSurcharge || 0);
    // NOTE: this is just a fallback. You should ideally store finalTotal.
    return Number(this.unitPrice || 0) + box;
  } catch (e) {
    return 0;
  }
};

// Virtual: extra sheets count (sum of shared extras map OR legacy extraSheets)
AlbumSchema.virtual("extraSheetsCount").get(function () {
  try {
    const mapSum = sumExtrasMap(this.extras?.shared);
    if (mapSum > 0) return mapSum;
    return Number(this.extraSheets || 0);
  } catch (e) {
    return 0;
  }
});

/* ---------- Vendors / Services / Packages (your original, unchanged) ---------- */

const AssignedVendorSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
    vendorName: String,
    category: String,
    salary: Number,
    paymentStatus: {
      type: String,
      enum: ["Completed", "Pending"],
      default: "Pending",
    },
    paymentDate: { type: Date },
    paymentMode: { type: String },
  },
  { _id: false },
);

const AssignedAssistantSchema = new mongoose.Schema(
  {
    assistantId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
    assistantName: String,
    category: String,
  },
  { _id: false },
);

const ServiceSchema = new mongoose.Schema(
  {
    serviceName: String,
    price: Number,
    marginPrice: Number,
    // 0 is allowed so a service can be dropped from a booking without deleting
    // the row and losing its history.
    qty: { type: Number, default: 1, min: 0 },
    assignedVendors: { type: [AssignedVendorSchema], default: [] },
    assignedAssistants: { type: [AssignedAssistantSchema], default: [] },
  },
  { _id: true },
);

const PackageSchema = new mongoose.Schema(
  {
    categoryName: String,
    packageType: {
      type: String,
      enum: ["Custom", "Preset"],
      default: "Custom",
    },
    eventStartDate: String,
    eventEndDate: String,
    slot: String,
    venueName: String,
    venueAddress: String,
    services: { type: [ServiceSchema], default: [] },
  },
  { _id: true },
);

const InstallmentSchema = new mongoose.Schema(
  {
    installmentNumber: Number,
    dueDate: String,
    paymentMode: String,
    paymentAmount: Number, // planned amount (from % when created)
    paymentPercentage: Number,
    paidAmount: {
      type: Number,
      default: 0,
    },
    pendingAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Pending", "Partial Paid", "Completed"],
      default: "Pending",
    },
    // NEW: store multiple account holders with their paid amounts
    accountHolders: [
      {
        name: String,
      },
    ],
  },
  { _id: true },
);

const FollowUpHistorySchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["Pending", "Contacted", "Payment Received"],
      default: "Pending",
    },
    notes: String,
    contactedBy: String,
  },
  { _id: true },
);

const AdditionalServiceItemSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdditionalService",
    }, // optional ref
    name: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const QuotationSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    queryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Query",
      required: true,
    },
    quotationId: { type: String, required: true, unique: true },

    quoteTitle: String,
    quoteDescription: String,
    invoiceNumber: { type: String, unique: true, sparse: true },
    quoteNote: String,
    whatsappGroupName: String,
    packages: { type: [PackageSchema], default: [] },
    installments: { type: [InstallmentSchema], default: [] },
    totalPackageAmt: Number,
    totalAlbumAmount: Number,
    totalAmount: Number,
    oldAmount: {
      type: Number,
      default: 0,
    },

    totalAdditionalServiceAmount: { type: Number, default: 0 },

    additionalServices: { type: [AdditionalServiceItemSchema], default: [] },

    // discountPercent: Number,
    discountValue: Number,
    // "amount" = flat rupees, "percent" = share of the pre-discount total.
    // discountValue always stores the resolved rupee amount.
    discountType: { type: String, enum: ["amount", "percent"], default: "amount" },
    discountPercent: { type: Number, default: 0 },
    gstApplied: Boolean,
    gstValue: Number,
    marginAmount: Number,

    bookingStatus: {
      type: String,
      enum: ["Not Booked", "Booked", "Completed", "Cancelled"],
      default: "Not Booked",
    },
    finalized: { type: Boolean, default: false },

    clientInstructions: { type: [String], default: [] },

    // ✅ albums embedded here
    albums: { type: [AlbumSchema], default: [] },

    followUpHistory: { type: [FollowUpHistorySchema], default: [] },
    
  },
  { timestamps: true },
);

// Keep vendor/assistant arrays within qty bounds
// Older documents stored bookingStatus as "NotBooked", which is not in the
// current enum — Mongoose then refuses to save the document at all, so every
// edit fails. Normalise it rather than letting the whole save die.
QuotationSchema.pre("save", function (next) {
  const LEGACY = { NotBooked: "Not Booked", "Not booked": "Not Booked" };
  if (LEGACY[this.bookingStatus]) this.bookingStatus = LEGACY[this.bookingStatus];
  next();
});

QuotationSchema.pre("save", function (next) {
  this.packages?.forEach((pkg) => {
    pkg.services?.forEach((s) => {
      // `s.qty || 1` would turn a deliberate 0 back into 1, so read it directly
      const raw = Number(s.qty);
      const desired = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 1;
      if (!Array.isArray(s.assignedVendors)) s.assignedVendors = [];
      while (s.assignedVendors.length < desired) s.assignedVendors.push({});
      if (!Array.isArray(s.assignedAssistants)) s.assignedAssistants = [];
      while (s.assignedAssistants.length < desired)
        s.assignedAssistants.push({});
      if (s.assignedVendors.length > desired)
        s.assignedVendors = s.assignedVendors.slice(0, desired);
      if (s.assignedAssistants.length > desired)
        s.assignedAssistants = s.assignedAssistants.slice(0, desired);
    });
  });
  next();
});

// ➤ Yearly client payments (sum of paidAmount)
QuotationSchema.statics.getYearlyClientPayments = async function () {
  return this.aggregate([
    { $unwind: "$installments" },
    {
      $addFields: {
        installmentYear: { $year: "$createdAt" }, // use createdAt year of Quotation
      },
    },
    {
      $group: {
        _id: "$installmentYear",
        totalReceived: { $sum: "$installments.paidAmount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// ➤ Yearly vendor payments
QuotationSchema.statics.getYearlyVendorPayments = async function () {
  return this.aggregate([
    { $unwind: "$packages" },
    { $unwind: "$packages.services" },
    { $unwind: "$packages.services.assignedVendors" },
    {
      $match: {
        "packages.services.assignedVendors.paymentStatus": "Completed", // ✅ Only completed
      },
    },
    {
      $addFields: {
        vendorPaymentYear: {
          $cond: [
            {
              $ifNull: [
                "$packages.services.assignedVendors.paymentDate",
                false,
              ],
            },
            { $year: "$packages.services.assignedVendors.paymentDate" },
            { $year: "$createdAt" },
          ],
        },
      },
    },
    {
      $group: {
        _id: "$vendorPaymentYear",
        totalPaid: { $sum: "$packages.services.assignedVendors.salary" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// ✅ Fast filters for booked quotations list
QuotationSchema.index({ bookingStatus: 1, createdAt: -1 });
QuotationSchema.index({ quotationId: 1 });

// If you often filter finalized as well
QuotationSchema.index({ bookingStatus: 1, finalized: 1, createdAt: -1 });

// ✅ Venue filtering (nested)
QuotationSchema.index({ "packages.venueName": 1 });
QuotationSchema.index({ "packages.venueAddress": 1 });

// ✅ Optional text search (good for contains search across multiple fields)
QuotationSchema.index(
  { quotationId: "text", quoteTitle: "text", whatsappGroupName: "text" },
  { name: "quotation_text_search" }
);

QuotationSchema.index({ bookingStatus: 1 });
QuotationSchema.index({ "packages.eventStartDate": 1 }); // string index still helps
QuotationSchema.index({ "packages.services.assignedVendors.paymentStatus": 1 });
QuotationSchema.index({ "packages.services.assignedVendors.vendorId": 1 });


module.exports = mongoose.model("Quotation", QuotationSchema);
