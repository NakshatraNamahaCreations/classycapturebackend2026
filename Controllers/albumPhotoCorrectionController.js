// controllers/albumPhotoCorrectionController.js
const AlbumPhotoCorrectionTask = require("../models/AlbumPhotoCorrectionTask");
const AlbumPhotoSelected = require("../models/albumPhotoSelected");
const Quotation = require("../models/quotation.model");
const mongoose = require("mongoose");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ✅ Admin assigns correction task
exports.assignAlbumPhotoCorrectionTask = async (req, res) => {
  try {
    const {
      quotationId,
      albumId,
      vendorId,
      vendorName = "",
      taskDescription = "",
      completionDate,
    } = req.body;

    if (!quotationId || !albumId || !vendorId || !completionDate) {
      return res.status(400).json({
        success: false,
        message: "quotationId, albumId, vendorId, completionDate are required",
      });
    }

    if (![quotationId, albumId, vendorId].every(isValidObjectId)) {
      return res.status(400).json({ success: false, message: "Invalid IDs" });
    }

    // 1) Load quotation and find album snapshot
    const quotation = await Quotation.findById(quotationId).lean();
    if (!quotation) {
      return res.status(404).json({ success: false, message: "Quotation not found" });
    }

    const album = (quotation.albums || []).find((a) => String(a._id) === String(albumId));
    if (!album) {
      return res.status(404).json({ success: false, message: "Album not found in quotation" });
    }

    // ✅ only allow when album.status is Album Photo Correction
    if (album.status !== "Album Photo Correction") {
      return res.status(400).json({
        success: false,
        message: `Album status must be "Album Photo Correction" to assign correction task`,
      });
    }

    // 2) Get latest selected photos entry (must exist)
    const latestSelected = await AlbumPhotoSelected.findOne({
      quotationId,
      albumId,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!latestSelected) {
      return res.status(400).json({
        success: false,
        message: "No selected photos found for this album. Submit selected photos first.",
      });
    }

    const selectedPhotos = Number(latestSelected.selectedPhotos || 0);

    // 3) Prevent duplicate active assigned correction tasks
    const existingActive = await AlbumPhotoCorrectionTask.findOne({
      quotationId,
      albumId,
      status: "Assigned",
    }).lean();

    if (existingActive) {
      return res.status(409).json({
        success: false,
        message: "An active correction task is already assigned for this album.",
      });
    }

    // 4) Create correction task
    const task = await AlbumPhotoCorrectionTask.create({
      quotationId,
      albumId,
      albumSnapshot: {
        templateLabel: album?.snapshot?.templateLabel || "",
        baseSheets: album?.snapshot?.baseSheets || 0,
        basePhotos: album?.snapshot?.basePhotos || 0,
        boxLabel: album?.snapshot?.boxLabel || "",
        unitPrice: album?.unitPrice || 0,
      },
      selectedPhotos,
      vendorId,
      vendorName,
      taskDescription,
      completionDate: new Date(completionDate),
      status: "Assigned",
      assignedDate: new Date(),
    });

    return res.json({
      success: true,
      message: "Album photo correction task assigned",
      task,
    });
  } catch (err) {
    console.error("assignAlbumPhotoCorrectionTask error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to assign correction task",
    });
  }
};

// ✅ Latest correction task for an album
exports.getLatestCorrectionTaskByAlbum = async (req, res) => {
  try {
    const { albumId } = req.params;
    if (!albumId || !isValidObjectId(albumId)) {
      return res.status(400).json({ success: false, message: "Invalid albumId" });
    }

    const task = await AlbumPhotoCorrectionTask.findOne({ albumId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, task: task || null });
  } catch (err) {
    console.error("getLatestCorrectionTaskByAlbum error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch task" });
  }
};

// ✅ List tasks by quotation (optional)
exports.getCorrectionTasksByQuotation = async (req, res) => {
  try {
    const { quotationId } = req.params;
    if (!quotationId || !isValidObjectId(quotationId)) {
      return res.status(400).json({ success: false, message: "Invalid quotationId" });
    }

    const tasks = await AlbumPhotoCorrectionTask.find({ quotationId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, tasks });
  } catch (err) {
    console.error("getCorrectionTasksByQuotation error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch tasks" });
  }
};

// ✅ Vendor submits => mark completed with submittedDate + submittedNotes
exports.submitAlbumPhotoCorrectionTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const { submittedDate, submittedNotes = "" } = req.body || {};

    if (!taskId || !isValidObjectId(taskId)) {
      return res.status(400).json({ success: false, message: "Invalid taskId" });
    }

    const task = await AlbumPhotoCorrectionTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (task.status === "Completed") {
      return res.json({ success: true, message: "Task already completed", task });
    }

    // ✅ Submitted date comes from frontend (fallback to now)
    const finalSubmittedDate = submittedDate ? new Date(submittedDate) : new Date();

    if (submittedDate && Number.isNaN(finalSubmittedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid submittedDate",
      });
    }

    task.status = "Completed";
    task.submittedDate = finalSubmittedDate;
    task.submittedNotes = String(submittedNotes || "").trim();

    await task.save();

    // ❌ Do NOT change album.status here (as you already decided)
    return res.json({
      success: true,
      message: "Correction task completed",
      task,
    });
  } catch (err) {
    console.error("submitAlbumPhotoCorrectionTask error:", err);
    return res.status(500).json({ success: false, message: "Failed to submit task" });
  }
};
