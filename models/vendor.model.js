// const mongoose = require("mongoose");

// const BankDetailsSchema = new mongoose.Schema({
//   bankName: { type: String, required: true },
//   accountHolder: { type: String, required: true },
//   accountNumber: { type: String, required: true },
//   ifsc: { type: String, required: true },
//   branch: { type: String, required: true },
//   panNumber: { type: String },
//   aadhaarNumber: { type: String, required: true },
// });

// const ServiceSchema = new mongoose.Schema({
//   serviceId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Service',
//     required: false // 👈 now optional
//   },
//   name: { type: String, required: true },
//   salary: { type: Number } // 👈 keep salary optional
// }, { _id: false });


// const EquipmentDetailsSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   qty: { type: Number, required: true },
//   models: [{ type: String, required: true }],
//   sameModel: { type: Boolean, default: false },
// });

// const VendorSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     category: {
//       type: String,
//       enum: ["Inhouse Vendor", "Outsource Vendor"],
//       required: true,
//     },
//     contactPerson: { type: String, required: true },
//     phoneNo: { type: String, required: true },
//     alternatePhoneNo: { type: String },
//     email: { type: String, required: true },
//     address: { type: String, required: true },
//     services: [ServiceSchema],
//     equipmentDetails: [EquipmentDetailsSchema],
//     bankDetails: BankDetailsSchema,
//     experience: { type: String },
//     designation: { type: String },
//     expertiseLevel: {
//       type: String,
//       enum: ["Beginner", "Intermediate", "Advanced"],
//     },
//     camera: { type: String },
//     otherEquipment: { type: String },
//     // status: { type: String, enum: ['Available', 'Not Available'], default: 'Available' }
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Vendor", VendorSchema);


const mongoose = require("mongoose");

// Some vendors are paid by UPI only and have no bank account on file, so the
// bank fields are required just when no UPI ID is given. One of the two must
// be present for the vendor to be payable.
const requiredWithoutUpi = function () {
  return !String(this.upiId || "").trim();
};

const BankDetailsSchema = new mongoose.Schema({
  bankName: { type: String, required: requiredWithoutUpi },
  accountHolder: { type: String, required: requiredWithoutUpi },
  accountNumber: { type: String, required: requiredWithoutUpi },
  ifsc: { type: String, required: requiredWithoutUpi },
  branch: { type: String, required: requiredWithoutUpi },
  upiId: { type: String, trim: true },
  panNumber: { type: String },
  aadhaarNumber: { type: String, },
});

const SpecializationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  salary: { type: Number } // Keep salary optional
}, { _id: false }); // Prevent MongoDB from creating an ID for each specialization

const EquipmentDetailsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  qty: { type: Number, required: true },
  models: [{ type: String, required: true }],
  sameModel: { type: Boolean, default: false },
});

const VendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ["Inhouse Vendor", "Outsource Vendor"],
      required: true,
    },
    contactPerson: { type: String, required: true },
    phoneNo: { type: String, required: true },
    alternatePhoneNo: { type: String },
    email: { type: String,  },
    address: { type: String, required: true },
    specialization: [SpecializationSchema], 
    equipmentDetails: [EquipmentDetailsSchema],
    bankDetails: BankDetailsSchema,
    experience: { type: String },
    designation: { type: String },
    expertiseLevel: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
    },
   
    camera: { type: String },
    otherEquipment: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vendor", VendorSchema);
