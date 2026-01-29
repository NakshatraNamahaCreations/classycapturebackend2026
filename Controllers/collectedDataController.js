const mongoose = require("mongoose");
const CollectedData = require("../models/collectedData");

// POST/PUT: add or update a single service unit's collected data


// exports.addOrUpdateServiceUnitData = async (req, res) => {
//   try {
//     const {
//       quotationId,
//       quotationUniqueId,
//       personName,
//       systemNumber,
//       backupSystemNumber,
//       packageId,
//       packageName,
//       serviceId,
//       serviceName,
//       unitIndex,
//       cameraName,
//       totalDriveSize,
//       backupDrive,
//       driveName,
//       qualityChecked,
//       filledSize,
//       copyingPerson,
//       copiedLocation,
//       backupCopiedLocation,
//       noOfPhotos,
//       noOfVideos,
//       firstPhotoTime,     // ✅ NEW
//       lastPhotoTime,      // ✅ NEW
//       firstVideoTime,     // ✅ NEW
//       lastVideoTime,      // ✅ NEW
//       submissionDate,
//       notes,
//     } = req.body;

//     // Validation
//     if (
//       !quotationId ||
//       !quotationUniqueId ||
//       !personName ||
//       !systemNumber ||
//       !packageId ||
//       !packageName ||
//       !serviceId ||
//       !serviceName ||
//       unitIndex === undefined
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields.",
//       });
//     }

//     const qId = new mongoose.Types.ObjectId(quotationId);
//     const pkgId = new mongoose.Types.ObjectId(packageId);
//     const srvId = new mongoose.Types.ObjectId(serviceId);
//     const unitIdx = Number(unitIndex);

//     let collectedData = await CollectedData.findOne({ quotationId: qId });

//     if (!collectedData) {
//       // First-time insert
//       collectedData = new CollectedData({
//         quotationId: qId,
//         quotationUniqueId,
//         personName,
//         systemNumber,
//         backupSystemNumber,
//         immutableLock: true,
//         serviceUnits: [
//           {
//             packageId: pkgId,
//             packageName,
//             serviceId: srvId,
//             serviceName,
//             unitIndex: unitIdx,
//             cameraName,
//             totalDriveSize,
//             backupDrive,
//             driveName,
//             qualityChecked,
//             filledSize,
//             copyingPerson,
//             copiedLocation,
//             backupCopiedLocation,
//             noOfPhotos,
//             noOfVideos,
//             firstPhotoTime,   // ✅ NEW
//             lastPhotoTime,    // ✅ NEW
//             firstVideoTime,   // ✅ NEW
//             lastVideoTime,    // ✅ NEW
//             submissionDate,
//             notes,
//             editingStatus: "Pending",
//           },
//         ],
//       });
//     } else {
//       // Lock check
//       if (collectedData.immutableLock) {
//         if (
//           collectedData.personName !== personName ||
//           collectedData.systemNumber !== systemNumber
//         ) {
//           return res.status(400).json({
//             success: false,
//             message:
//               "Person name or System number cannot be changed once set.",
//           });
//         }
//       } else {
//         collectedData.immutableLock = true;
//         collectedData.personName = personName;
//         collectedData.systemNumber = systemNumber;
//         collectedData.quotationUniqueId =
//           quotationUniqueId || collectedData.quotationUniqueId;
//       }

//       const idx = (collectedData.serviceUnits || []).findIndex(
//         (u) =>
//           u.packageId?.toString() === pkgId.toString() &&
//           u.serviceId?.toString() === srvId.toString() &&
//           Number(u.unitIndex) === unitIdx
//       );

//       if (idx > -1) {
//         // Update existing
//         const oldUnit =
//           collectedData.serviceUnits[idx].toObject?.() ||
//           collectedData.serviceUnits[idx];

//         collectedData.serviceUnits[idx] = {
//           ...oldUnit,
//           packageName,
//           serviceName,
//           unitIndex: unitIdx,
//           cameraName,
//           totalDriveSize,
//           backupDrive,
//           driveName,
//           qualityChecked,
//           filledSize,
//           copyingPerson,
//           copiedLocation,
//           backupCopiedLocation,
//           noOfPhotos,
//           noOfVideos,
//           firstPhotoTime,   // ✅ NEW
//           lastPhotoTime,    // ✅ NEW
//           firstVideoTime,   // ✅ NEW
//           lastVideoTime,    // ✅ NEW
//           submissionDate,
//           notes,
//           editingStatus: oldUnit.editingStatus,
//         };
//       } else {
//         // Insert new
//         collectedData.serviceUnits.push({
//           packageId: pkgId,
//           packageName,
//           serviceId: srvId,
//           serviceName,
//           unitIndex: unitIdx,
//           cameraName,
//           totalDriveSize,
//           backupDrive,
//           driveName,
//           qualityChecked,
//           filledSize,
//           copyingPerson,
//           copiedLocation,
//           backupCopiedLocation,
//           noOfPhotos,
//           noOfVideos,
//           firstPhotoTime,   // ✅ NEW
//           lastPhotoTime,    // ✅ NEW
//           firstVideoTime,   // ✅ NEW
//           lastVideoTime,    // ✅ NEW
//           submissionDate,
//           notes,
//           editingStatus: "Pending",
//         });
//       }
//     }

//     await collectedData.save();
//     return res.status(200).json({ success: true, data: collectedData });
//   } catch (error) {
//     console.error("Error saving service-unit collected data:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: error.message || "Server error" });
//   }
// };

exports.addOrUpdateServiceUnitData = async (req, res) => {
  try {
    const {
      quotationId,
      quotationUniqueId,
      personName,
      systemNumber,
      backupSystemNumber,
      packageId,
      packageName,
      serviceId,
      serviceName,
      unitIndex,

      cameraName,

      // ✅ NEW storage fields
      storageTotalCapacityGb,
      existingDataSizeBeforeEventGb,
      existingFilesCountBeforeEvent,
      thisEventDataSizeGb,
      totalUsedAfterEventGb,

      backupDrive,
      driveName,
      qualityChecked,
      copyingPerson,
      copiedLocation,
      backupCopiedLocation,
      noOfPhotos,
      noOfVideos,
      firstPhotoTime,
      lastPhotoTime,
      firstVideoTime,
      lastVideoTime,
      submissionDate,
      notes,
    } = req.body;

    if (
      !quotationId ||
      !quotationUniqueId ||
      !personName ||
      !systemNumber ||
      !packageId ||
      !packageName ||
      !serviceId ||
      !serviceName ||
      unitIndex === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields.",
      });
    }

    const qId = new mongoose.Types.ObjectId(quotationId);
    const pkgId = new mongoose.Types.ObjectId(packageId);
    const srvId = new mongoose.Types.ObjectId(serviceId);
    const unitIdx = Number(unitIndex);

    // ✅ helpers (keeps your DB consistent)
    const toNumberOrNull = (v) => {
      if (v === undefined || v === null || v === "") return null;
      // supports "64 GB" or "64"
      const n = Number(String(v).replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) ? n : null;
    };

    const unitPayload = {
      packageId: pkgId,
      packageName,
      serviceId: srvId,
      serviceName,
      unitIndex: unitIdx,

      cameraName: cameraName || "",

      // ✅ NEW storage fields (store as Number)
      storageTotalCapacityGb: toNumberOrNull(storageTotalCapacityGb),
      existingDataSizeBeforeEventGb: toNumberOrNull(existingDataSizeBeforeEventGb),
      existingFilesCountBeforeEvent: toNumberOrNull(existingFilesCountBeforeEvent) ?? 0,
      thisEventDataSizeGb: toNumberOrNull(thisEventDataSizeGb),
      totalUsedAfterEventGb: toNumberOrNull(totalUsedAfterEventGb),

      backupDrive: backupDrive || "",
      driveName: driveName || "",
      qualityChecked: !!qualityChecked,
      copyingPerson: copyingPerson || "",
      copiedLocation: copiedLocation || "",
      backupCopiedLocation: backupCopiedLocation || "",

      noOfPhotos: toNumberOrNull(noOfPhotos) ?? 0,
      noOfVideos: toNumberOrNull(noOfVideos) ?? 0,

      firstPhotoTime: firstPhotoTime || "",
      lastPhotoTime: lastPhotoTime || "",
      firstVideoTime: firstVideoTime || "",
      lastVideoTime: lastVideoTime || "",

      submissionDate: submissionDate || null,
      notes: notes || "",
    };

    let collectedData = await CollectedData.findOne({ quotationId: qId });

    if (!collectedData) {
      collectedData = new CollectedData({
        quotationId: qId,
        quotationUniqueId,
        personName,
        systemNumber,
        backupSystemNumber,
        immutableLock: true,
        serviceUnits: [
          {
            ...unitPayload,
            editingStatus: "Pending",
          },
        ],
      });
    } else {
      // Lock check
      if (collectedData.immutableLock) {
        if (
          collectedData.personName !== personName ||
          collectedData.systemNumber !== systemNumber
        ) {
          return res.status(400).json({
            success: false,
            message: "Person name or System number cannot be changed once set.",
          });
        }
      } else {
        collectedData.immutableLock = true;
        collectedData.personName = personName;
        collectedData.systemNumber = systemNumber;
        collectedData.quotationUniqueId =
          quotationUniqueId || collectedData.quotationUniqueId;
      }

      const idx = (collectedData.serviceUnits || []).findIndex(
        (u) =>
          u.packageId?.toString() === pkgId.toString() &&
          u.serviceId?.toString() === srvId.toString() &&
          Number(u.unitIndex) === unitIdx
      );

      if (idx > -1) {
        const oldUnit =
          collectedData.serviceUnits[idx].toObject?.() ||
          collectedData.serviceUnits[idx];

        collectedData.serviceUnits[idx] = {
          ...oldUnit,
          ...unitPayload,
          editingStatus: oldUnit.editingStatus,
        };
      } else {
        collectedData.serviceUnits.push({
          ...unitPayload,
          editingStatus: "Pending",
        });
      }
    }

    await collectedData.save();
    return res.status(200).json({ success: true, data: collectedData });
  } catch (error) {
    console.error("Error saving service-unit collected data:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

// GET /api/collected-data/:quotationId
exports.getCollectedDataByQuotation = async (req, res) => {
  try {
    const { quotationId } = req.params;
    const data = await CollectedData.findOne({ quotationId });

    if (!data) {
      return res.status(404).json({ success: false, message: "No data found" });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/collected-data?page=&limit=&search=
exports.getCollectedDataList = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const query = {
      $or: [
        { quotationUniqueId: { $regex: search, $options: "i" } },
        { personName: { $regex: search, $options: "i" } },
      ],
    };

    const total = await CollectedData.countDocuments(query);
    const data = await CollectedData.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching collected data list:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/collected-data/by-id/:id
exports.getCollectedDataById = async (req, res) => {
  try {
    const { id } = req.params;

    const collectedData = await CollectedData.findById(id);

    if (!collectedData) {
      return res.status(404).json({
        success: false,
        message: "Collected data not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: collectedData,
    });
  } catch (error) {
    console.error("Error fetching collected data:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching collected data",
    });
  }
};

// PUT /api/collected-data/:collectedDataId/service-unit/status
// Body: { packageId, serviceId, unitIndex, status | newStatus }
exports.updateServiceUnitEditingStatus = async (req, res) => {
  try {
    const { collectedDataId } = req.params;
    const { packageId, serviceId, unitIndex, newStatus, status } = req.body;

    const finalStatus = newStatus ?? status;
    const validStatuses = ["Pending", "In Process", "Completed"];
    if (!validStatuses.includes(finalStatus)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Must be one of: Pending, In Process, Completed",
      });
    }

    const pkgId = new mongoose.Types.ObjectId(packageId);
    const srvId = new mongoose.Types.ObjectId(serviceId);
    const unitIdx = Number(unitIndex);

    // Update using arrayFilters to target the exact unit
    const updatedDoc = await CollectedData.findOneAndUpdate(
      { _id: collectedDataId },
      { $set: { "serviceUnits.$[u].editingStatus": finalStatus } },
      {
        new: true,
        arrayFilters: [
          {
            "u.packageId": pkgId,
            "u.serviceId": srvId,
            "u.unitIndex": unitIdx,
          },
        ],
      }
    );

    if (!updatedDoc) {
      return res.status(404).json({
        success: false,
        message: "Collected data or service unit not found",
      });
    }

    const updatedUnit =
      updatedDoc.serviceUnits.find(
        (u) =>
          u.packageId?.toString() === pkgId.toString() &&
          u.serviceId?.toString() === srvId.toString() &&
          Number(u.unitIndex) === unitIdx
      ) || null;

    return res.status(200).json({
      success: true,
      message: "Editing status updated successfully",
      data: updatedUnit,
    });
  } catch (error) {
    console.error("Error updating service unit editing status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update editing status",
      error: error.message,
    });
  }
};


// GET /api/collected-data/:collectedId/service-unit/:unitId
exports.getServiceUnitById = async (req, res) => {
  try {
    const { collectedId, unitId } = req.params;

    // find the parent collectedData by its id
    const collectedData = await CollectedData.findById(collectedId);
    if (!collectedData) {
      return res.status(404).json({
        success: false,
        message: "Collected data not found",
      });
    }

    // find the serviceUnit inside the array
    const serviceUnit = collectedData.serviceUnits.id(unitId);
    if (!serviceUnit) {
      return res.status(404).json({
        success: false,
        message: "Service unit not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        collectedId: collectedData._id,
        quotationId: collectedData.quotationId,
        quotationUniqueId: collectedData.quotationUniqueId,
        personName: collectedData.personName,
        systemNumber: collectedData.systemNumber,
        serviceUnit, // only the requested unit
      },
    });
  } catch (error) {
    console.error("Error fetching service unit:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching service unit",
    });
  }
};