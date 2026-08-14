const mongoose = require("mongoose");
const Vendor = require("../models/vendor.model");
const VendorInventory = require("../models/vendorInventory");
const dayjs = require("dayjs");
const Quotation = require("../models/quotation.model");

// shared so every controller reports failures the same way
const { fieldLabel, describeSaveError } = require("../utils/saveErrors");


// Optional enum fields arrive as "" from the form when nothing is picked, and
// Mongoose rejects "" as an invalid enum value. Treat blank as "not provided".
const stripBlankOptionals = (body) => {
  const cleaned = { ...body };
  ["expertiseLevel", "designation", "experience", "email", "alternatePhoneNo"].forEach(
    (key) => {
      if (typeof cleaned[key] === "string" && cleaned[key].trim() === "") {
        delete cleaned[key];
      }
    }
  );
  return cleaned;
};

// Create Vendor
exports.createVendor = async (req, res) => {
  try {
    const newVendor = new Vendor(stripBlankOptionals(req.body));
    const savedVendor = await newVendor.save();
    res.status(201).json({ success: true, vendor: savedVendor });
  } catch (error) {
    console.error("Create Vendor Error:", error);

    const described = describeSaveError(error);
    if (described) {
      return res.status(400).json({
        success: false,
        message: described.message,
        fields: described.fields,
      });
    }

    res.status(500).json({ success: false, message: "Failed to create vendor" });
  }
};

// Get All Vendors with pagination and search
exports.getAllVendors = async (req, res) => {
  try {
    const { page, limit, search = "" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const searchRegex = new RegExp(search, "i");

    const filter = {
      $or: [
        { name: searchRegex },
        { contactPerson: searchRegex },
        { phoneNo: searchRegex },
        { email: searchRegex },
      ],
    };

    const [vendors, total] = await Promise.all([
      Vendor.find(filter)
        .sort({ createdAt: -1 }) // 🔽 Sort by newest first
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Vendor.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      vendors,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get All Vendors Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch vendors", error });
  }
};

// Get Vendors by Service ID with pagination and search
exports.getVendorsByServiceId = async (req, res) => {
  try {
    const serviceId = req.params.serviceId;
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const searchRegex = new RegExp(search, "i");

    const filter = {
      "services.serviceId": serviceId,
      // status: "Available",
      $or: [
        { name: searchRegex },
        { contactPerson: searchRegex },
        { phoneNo: searchRegex },
        { email: searchRegex },
      ],
    };

    const [vendors, total] = await Promise.all([
      Vendor.find(filter).skip(skip).limit(parseInt(limit)).lean(),
      Vendor.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      vendors,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get Vendors By Service ID Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch vendors", error });
  }
};

// Get Vendors by Service Name with pagination and search
exports.getVendorsByServiceName = async (req, res) => {
  try {
    const serviceName = req.params.serviceName;
    const { page, limit, search = "" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const searchRegex = new RegExp(search, "i");

    const filter = {
      "services.name": serviceName,
      // status: "Available",
      $or: [
        { name: searchRegex },
        { contactPerson: searchRegex },
        { phoneNo: searchRegex },
        { email: searchRegex },
      ],
    };

    const [vendors, total] = await Promise.all([
      Vendor.find(filter).skip(skip).limit(parseInt(limit)).lean(),
      Vendor.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      vendors,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get Vendors By Service Name Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch vendors", error });
  }
};

// API to fetch available vendors for specific date and service name
// exports.getAvailableVendorsByServiceAndDate = async (req, res) => {
//   try {
//     const { serviceName } = req.params;
//     const { date } = req.query;

//     // Validate required parameters
//     if (!serviceName) {
//       return res.status(400).json({
//         success: false,
//         message: "Service name parameter is required"
//       });
//     }

//     if (!date) {
//       return res.status(400).json({
//         success: false,
//         message: "Date query parameter is required"
//       });
//     }

//     // Get all vendor IDs that are booked on the specified date
//     const bookedVendorIds = await VendorInventory.find({ date: date })
//       .distinct('vendorId');

//     // Fetch vendors that provide the specified service AND are not booked on the date
//     const availableVendors = await Vendor.find({
//       'services.name': { $regex: new RegExp(serviceName, 'i') }, // Case-insensitive search
//       _id: { $nin: bookedVendorIds }
//     });

//     return res.status(200).json({
//       success: true,
//       data: {
//         availableVendors,
//         totalAvailable: availableVendors.length,
//         serviceName: serviceName,
//         date: date
//       }
//     });

//   } catch (err) {
//     console.error("getAvailableVendorsByServiceAndDate error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: err.message
//     });
//   }
// };

// API to fetch available vendors for specific date and service name
exports.getAvailableVendorsByServiceAndDate = async (req, res) => {
  try {
    const { serviceName } = req.params;
    const { startDate, endDate, slot } = req.query;

    console.log("serviceName", serviceName);
    console.log("startDate", startDate);
    console.log("endDate", endDate);
    console.log("slot", slot);

    // Validate required parameters
    if (!serviceName) {
      return res.status(400).json({
        success: false,
        message: "Service name parameter is required",
      });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Both startDate and endDate are required",
      });
    }
    if (!slot) {
      return res
        .status(400)
        .json({ success: false, message: "Slot query parameter is required" });
    }

    // Step 1: Fetch all vendors whose specialization matches serviceName
    const allVendors = await Vendor.find({
      "specialization.name": { $regex: new RegExp(serviceName, "i") },
    });

    // Step 2: Fetch all vendorInventory records overlapping requested date range
    const vendorInventoryRecords = await VendorInventory.find({
      eventStartDate: { $lte: endDate },
      eventEndDate: { $gte: startDate },
    });

    // Step 3: Filter vendors based on availability
    const availableVendors = allVendors.filter((vendor) => {
      const hasConflict = vendorInventoryRecords.some((inv) => {
        if (inv.vendorId.toString() !== vendor._id.toString()) return false;

        // If either slot is Full Day, block everything in the overlapping range
        if (slot === "Full Day" || inv.slot === "Full Day") return true;

        // Otherwise block only if slots match
        return inv.slot === slot;
      });

      return !hasConflict;
    });

    return res.status(200).json({
      success: true,
      data: {
        availableVendors,
        totalAvailable: availableVendors.length,
        totalVendorsForService: allVendors.length,
        serviceName,
        eventStartDate: startDate,
        eventEndDate: endDate,
        slot,
      },
    });
  } catch (err) {
    console.error("getAvailableVendorsByServiceAndDate error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const vendorId = req.params.id;

    const {
      name,
      category,
      contactPerson,
      phoneNo,
      alternatePhoneNo,
      email,
      address,
      specialization, // ✅ FIX: expect specialization from body
      equipmentDetails,
      bankDetails,
      experience,
      designation,
      expertiseLevel,
      camera,
      otherEquipment,
      status,
    } = req.body;

    const updatedVendorData = {
      name,
      category,
      contactPerson,
      phoneNo,
      alternatePhoneNo,
      email,
      address,
      specialization, // ✅ FIX: include specialization
      equipmentDetails,
      bankDetails,
      experience,
      designation,
      expertiseLevel,
      camera,
      otherEquipment,
      status,
    };

    // Remove undefined fields
    Object.keys(updatedVendorData).forEach(
      (key) =>
        updatedVendorData[key] === undefined && delete updatedVendorData[key]
    );

    // ...and blank optional fields, which Mongoose would reject as bad enums
    ["expertiseLevel", "designation", "experience", "email", "alternatePhoneNo"].forEach(
      (key) => {
        if (typeof updatedVendorData[key] === "string" && updatedVendorData[key].trim() === "") {
          delete updatedVendorData[key];
        }
      }
    );

    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      updatedVendorData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedVendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    res.status(200).json({ success: true, vendor: updatedVendor });
  } catch (error) {
    console.error("Error updating vendor:", error);

    const described = describeSaveError(error);
    if (described) {
      return res.status(400).json({
        success: false,
        message: described.message,
        fields: described.fields,
      });
    }

    res.status(500).json({ success: false, message: "Failed to update vendor" });
  }
};

// Delete Vendor
exports.deleteVendor = async (req, res) => {
  try {
    const deletedVendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!deletedVendor)
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    res
      .status(200)
      .json({ success: true, message: "Vendor deleted successfully" });
  } catch (error) {
    console.error("Delete Vendor Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete vendor", error });
  }
};

// exports.getVendorsByCategory = async (req, res) => {
//   try {
//     const { category } = req.params;

//     // Normalize input → schema stores "Inhouse Vendor" or "Outsource Vendor"
//     let formattedCategory;
//     if (category.toLowerCase() === "inhouse") {
//       formattedCategory = "Inhouse Vendor";
//     } else if (category.toLowerCase() === "outsource") {
//       formattedCategory = "Outsource Vendor";
//     } else {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid category. Use 'inhouse' or 'outsource'.",
//       });
//     }

//     const vendors = await Vendor.find(
//       { category: formattedCategory },
//       {
//         name: 1,
//         category: 1,
//         phoneNo: 1,
//         alternatePhoneNo: 1,
//         email: 1,
//         _id: 1,
//       }
//     ).sort("name");

//     return res.status(200).json({
//       success: true,
//       count: vendors.length,
//       data: vendors,
//     });
//   } catch (err) {
//     console.error("Error fetching vendors by category:", err);
//     res.status(500).json({
//       success: false,
//       message: "Server error while fetching vendors",
//     });
//   }
// };

exports.getVendorsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    // Validate category
    const validCategories = ["Inhouse Vendor", "Outsource Vendor"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category. Must be Inhouse Vendor or Outsource Vendor",
      });
    }

    // Fetch vendors by category
    const vendors = await Vendor.find({ category });

    return res.status(200).json({
      success: true,
      count: vendors.length,
      data: vendors,
    });
  } catch (error) {
    console.error("Error fetching vendors by category:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getVendorPaymentsByStatus = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, search = "" } = req.query;
    const today = dayjs().format("YYYY-MM-DD");

    // Validate status
    if (!status || !["Pending", "Completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Use ?status=Pending or ?status=Completed",
      });
    }

    // 1. Fetch quotations except those with bookingStatus = Not Booked
    const quotations = await Quotation.find({
      bookingStatus: { $ne: "Not Booked" },
    }).lean();

    // 2. Fetch all vendors once and index them
    const vendors = await Vendor.find().lean();
    const vendorMap = {};
    for (const v of vendors) {
      vendorMap[v._id.toString()] = v;
    }

    // 3. Payments store
    const vendorPayments = {};

    // 4. Process quotations
    for (const quotation of quotations) {
      for (const pkg of quotation.packages) {
        if (dayjs(pkg.eventStartDate).isBefore(today)) {
          for (const service of pkg.services) {
            for (const vendor of service.assignedVendors) {
              if (!vendor) continue;

              // ✅ Match only vendors with requested payment status
              if (vendor.paymentStatus !== status) continue;

              const vendorDoc = vendorMap[vendor.vendorId?.toString()];
              if (!vendorDoc) continue;

              // ✅ Use salary from quotation if present, else fallback to specialization
              let salary = vendor.salary;
              if (!salary) {
                const specialization = vendorDoc.specialization.find(
                  (s) => s.name === service.serviceName
                );
                salary = specialization?.salary || 0;
              }

              if (salary > 0) {
                if (!vendorPayments[vendor.vendorId]) {
                  vendorPayments[vendor.vendorId] = {
                    vendorId: vendor.vendorId,
                    vendorName: vendor.vendorName,
                    vendorCategory: vendor.category,
                    totalSalary: 0,
                    events: [],
                  };
                }

                vendorPayments[vendor.vendorId].totalSalary += salary;
                vendorPayments[vendor.vendorId].events.push({
                  packageId: pkg._id,
                  categoryName: pkg.categoryName,
                  serviceId: service._id,
                  quoteId: quotation.quotationId,
                  quotationId: quotation._id,
                  serviceName: service.serviceName,
                  eventDate: pkg.eventStartDate,
                  slot: pkg.slot,
                  salary,
                });
              }
            }
          }
        }
      }
    }

    // 5. Convert to array
    let vendorArray = Object.values(vendorPayments);

    // 6. Search by vendorName (case-insensitive)
    if (search) {
      const searchRegex = new RegExp(search, "i");
      vendorArray = vendorArray.filter((v) => searchRegex.test(v.vendorName));
    }

    // 7. Pagination
    const total = vendorArray.length;
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginated = vendorArray.slice(startIndex, endIndex);

    return res.json({
      success: true,
      status,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: paginated,
    });
  } catch (err) {
    console.error("Error calculating vendor payments by status:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.payVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { paymentMode, paymentDate } = req.body;

    if (!paymentMode || !paymentDate) {
      return res.status(400).json({
        success: false,
        message: "paymentMode and paymentDate are required",
      });
    }

    // Update all quotations where this vendor is pending
    const result = await Quotation.updateMany(
      { "packages.services.assignedVendors.vendorId": vendorId },
      {
        $set: {
          "packages.$[].services.$[].assignedVendors.$[v].paymentStatus":
            "Completed",
          "packages.$[].services.$[].assignedVendors.$[v].paymentDate":
            paymentDate,
          "packages.$[].services.$[].assignedVendors.$[v].paymentMode":
            paymentMode,
        },
      },
      {
        arrayFilters: [
          { "v.vendorId": vendorId, "v.paymentStatus": "Pending" },
        ],
      }
    );

    return res.json({
      success: true,
      message: "Vendor payments updated successfully",
      vendorId,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("Error updating vendor payments:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getVendorsbySpecilazition =  async (req, res) => {
  try {
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({ success: false, message: "Specialization name is required" });
    }

    // Case-insensitive search in specialization array
    const vendors = await Vendor.find({
      "specialization.name": { $regex: new RegExp("^" + name + "$", "i") }
    });

    if (!vendors.length) {
      return res.status(404).json({
        success: false,
        message: `No vendors found with specialization: ${name}`,
      });
    }

    res.json({
      success: true,
      count: vendors.length,
      data: vendors,
    });
  } catch (error) {
    console.error("Error fetching vendors by specialization:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching vendors",
      error: error.message,
    });
  }
};


