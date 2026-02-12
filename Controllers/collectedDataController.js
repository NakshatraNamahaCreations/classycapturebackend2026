const mongoose = require("mongoose");
const CollectedData = require("../models/collectedData");
const Quotation = require("../models/quotation.model");
const { getPackageAndServiceQty } = require("../utils/collectionTrack");
const EventCollectionStatus = require("../models/eventCollectionStatus");
const {
  syncEventStatusForPackage,
} = require("../services/syncEventCollectionStatus");

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

//       // ✅ NEW storage fields
//       storageTotalCapacityGb,
//       existingDataSizeBeforeEventGb,
//       existingFilesCountBeforeEvent,
//       thisEventDataSizeGb,
//       totalUsedAfterEventGb,

//       backupDrive,
//       driveName,
//       qualityChecked,
//       copyingPerson,
//       copiedLocation,
//       backupCopiedLocation,
//       noOfPhotos,
//       noOfVideos,
//       firstPhotoTime,
//       lastPhotoTime,
//       firstVideoTime,
//       lastVideoTime,
//       submissionDate,
//       notes,
//     } = req.body;

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

//     // ✅ helpers (keeps your DB consistent)
//     const toNumberOrNull = (v) => {
//       if (v === undefined || v === null || v === "") return null;
//       // supports "64 GB" or "64"
//       const n = Number(String(v).replace(/[^0-9.]/g, ""));
//       return Number.isFinite(n) ? n : null;
//     };

//     const unitPayload = {
//       packageId: pkgId,
//       packageName,
//       serviceId: srvId,
//       serviceName,
//       unitIndex: unitIdx,

//       cameraName: cameraName || "",

//       // ✅ NEW storage fields (store as Number)
//       storageTotalCapacityGb: toNumberOrNull(storageTotalCapacityGb),
//       existingDataSizeBeforeEventGb: toNumberOrNull(existingDataSizeBeforeEventGb),
//       existingFilesCountBeforeEvent: toNumberOrNull(existingFilesCountBeforeEvent) ?? 0,
//       thisEventDataSizeGb: toNumberOrNull(thisEventDataSizeGb),
//       totalUsedAfterEventGb: toNumberOrNull(totalUsedAfterEventGb),

//       backupDrive: backupDrive || "",
//       driveName: driveName || "",
//       qualityChecked: !!qualityChecked,
//       copyingPerson: copyingPerson || "",
//       copiedLocation: copiedLocation || "",
//       backupCopiedLocation: backupCopiedLocation || "",

//       noOfPhotos: toNumberOrNull(noOfPhotos) ?? 0,
//       noOfVideos: toNumberOrNull(noOfVideos) ?? 0,

//       firstPhotoTime: firstPhotoTime || "",
//       lastPhotoTime: lastPhotoTime || "",
//       firstVideoTime: firstVideoTime || "",
//       lastVideoTime: lastVideoTime || "",

//       submissionDate: submissionDate || null,
//       notes: notes || "",
//     };

//     let collectedData = await CollectedData.findOne({ quotationId: qId });

//     if (!collectedData) {
//       collectedData = new CollectedData({
//         quotationId: qId,
//         quotationUniqueId,
//         personName,
//         systemNumber,
//         backupSystemNumber,
//         immutableLock: true,
//         serviceUnits: [
//           {
//             ...unitPayload,
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
//             message: "Person name or System number cannot be changed once set.",
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
//         const oldUnit =
//           collectedData.serviceUnits[idx].toObject?.() ||
//           collectedData.serviceUnits[idx];

//         collectedData.serviceUnits[idx] = {
//           ...oldUnit,
//           ...unitPayload,
//           editingStatus: oldUnit.editingStatus,
//         };
//       } else {
//         collectedData.serviceUnits.push({
//           ...unitPayload,
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

    const quotation = await Quotation.findById(qId).lean();
    if (!quotation) {
      return res
        .status(404)
        .json({ success: false, message: "Quotation not found" });
    }

    const { qty } = getPackageAndServiceQty(quotation, pkgId, srvId);
    if (qty == null) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found in quotation" });
    }

    if (!(unitIdx >= 0 && unitIdx < qty)) {
      return res.status(400).json({
        success: false,
        message: `Invalid unitIndex. This service qty=${qty}, unitIndex allowed 0 to ${qty - 1}`,
      });
    }

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
      existingDataSizeBeforeEventGb: toNumberOrNull(
        existingDataSizeBeforeEventGb,
      ),
      existingFilesCountBeforeEvent:
        toNumberOrNull(existingFilesCountBeforeEvent) ?? 0,
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
          Number(u.unitIndex) === unitIdx,
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
    await syncEventStatusForPackage({ quotationId: qId, packageId: pkgId });

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
      },
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
          Number(u.unitIndex) === unitIdx,
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

exports.getPendingEventsCount = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = {
      eventEndDateObj: { $lt: today },
      status: { $ne: "Completed" },
    };

    const count = await EventCollectionStatus.countDocuments(query);

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};


exports.getPendingEventsToCollect = async (req, res) => {
  try {
    const hasPage = req.query.page !== undefined;
    const hasLimit = req.query.limit !== undefined;

    // If both page & limit present => paginate
    const usePagination = hasPage && hasLimit;

    const page = usePagination ? Math.max(1, Number(req.query.page || 1)) : 1;

    // ✅ If not paginating, still put a safety cap (change 5000 as you want)
    const limit = usePagination
      ? Math.min(100, Math.max(1, Number(req.query.limit || 20)))
      : Math.min(5000, Number(req.query.max || 5000)); // optional override via ?max=

    const skip = usePagination ? (page - 1) * limit : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = {
      eventEndDateObj: { $lt: today },
      status: { $ne: "Completed" },
    };

    // ✅ If you don’t paginate, total is still useful
    const total = await EventCollectionStatus.countDocuments(query);

    let q = EventCollectionStatus.find(query).sort({ eventEndDateObj: -1 });

    if (usePagination) {
      q = q.skip(skip).limit(limit);
    } else {
      // full but capped to avoid heavy response
      q = q.limit(limit);
    }

    const data = await q.lean();

    return res.status(200).json({
      success: true,
      data,
      pagination: usePagination
        ? { total, page, pages: Math.ceil(total / Number(req.query.limit || 20)) }
        : { total, page: 1, pages: 1, note: `Returned max ${limit} records` },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};


// GET /api/collected-data/sorting/pending-services/count
exports.countPendingServicesToSort = async (req, res) => {
  try {
    const agg = await CollectedData.aggregate([
      { $unwind: "$serviceUnits" },
      {
        $match: {
          $or: [
            { "serviceUnits.sortingStatus": { $exists: false } },
            { "serviceUnits.sortingStatus": { $ne: "Completed" } },
          ],
        },
      },
      { $count: "total" },
    ]);

    const total = agg?.[0]?.total || 0;

    return res.status(200).json({
      success: true,
      total, // ✅ Pending Services to Sort
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Failed to count pending services to sort",
      error: e?.message || String(e),
    });
  }
};


// GET /api/collected-data/sorting/pending-services?page=1&limit=20
exports.listPendingServicesToSort = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const pipeline = [
      { $unwind: "$serviceUnits" },
      {
        $match: {
          $or: [
            { "serviceUnits.sortingStatus": { $exists: false } },
            { "serviceUnits.sortingStatus": { $ne: "Completed" } },
          ],
        },
      },

      // keep required fields only
      {
        $project: {
          quotationId: 1,
          quotationUniqueId: 1,
          personName: 1,
          systemNumber: 1,
          backupSystemNumber: 1,
          immutableLock: 1,
          createdAt: 1,
          updatedAt: 1,

          packageId: "$serviceUnits.packageId",
          packageName: "$serviceUnits.packageName",
          serviceId: "$serviceUnits.serviceId",
          serviceName: "$serviceUnits.serviceName",
          unitIndex: "$serviceUnits.unitIndex",
          sortingStatus: { $ifNull: ["$serviceUnits.sortingStatus", "Pending"] },
          submissionDate: "$serviceUnits.submissionDate",
          noOfPhotos: "$serviceUnits.noOfPhotos",
          noOfVideos: "$serviceUnits.noOfVideos",
        },
      },

      { $sort: { updatedAt: -1 } },

      {
        $facet: {
          meta: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
      {
        $addFields: {
          total: { $ifNull: [{ $arrayElemAt: ["$meta.total", 0] }, 0] },
          page,
          limit,
          totalPages: {
            $cond: [
              { $gt: [{ $ifNull: [{ $arrayElemAt: ["$meta.total", 0] }, 0] }, 0] },
              {
                $ceil: {
                  $divide: [
                    { $ifNull: [{ $arrayElemAt: ["$meta.total", 0] }, 0] },
                    limit,
                  ],
                },
              },
              0,
            ],
          },
        },
      },
      { $project: { meta: 0 } },
    ];

    const agg = await CollectedData.aggregate(pipeline);
    const out = agg?.[0] || { total: 0, page, limit, totalPages: 0, data: [] };

    return res.status(200).json({
      success: true,
      ...out,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Failed to list pending services to sort",
      error: e?.message || String(e),
    });
  }
};
