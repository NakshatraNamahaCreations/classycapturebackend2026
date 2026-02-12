const mongoose = require("mongoose");
const Quotation = require("../models/quotation.model");
const AlbumEditingTask = require("../models/albumEditingTask");

// POST /api/quotations/:quotationId/albums
exports.addAlbum = async (req, res) => {
  try {
    const { quotationId } = req.params;
    if (!mongoose.isValidObjectId(quotationId)) {
      return res.status(400).json({ message: "Invalid quotationId" });
    }

    const q = await Quotation.findById(quotationId);
    if (!q) return res.status(404).json({ message: "Quotation not found" });

    // Push the new album
    q.albums.push(req.body);
    await q.save();

    const created = q.albums[q.albums.length - 1];
    return res
      .status(201)
      .json({ message: "Album added", album: created, quotation: q });
  } catch (err) {
    console.error("addAlbum error:", err);
    return res.status(500).json({ message: "Failed to add album" });
  }
};

// PUT /api/quotations/:quotationId/albums/:albumId
exports.updateAlbum = async (req, res) => {
  try {
    const { quotationId, albumId } = req.params;
    const update = req.body;

    // Validate IDs
    if (
      !mongoose.Types.ObjectId.isValid(quotationId) ||
      !mongoose.Types.ObjectId.isValid(albumId)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ID format" });
    }

    // Load quotation + existing album
    const q = await Quotation.findById(quotationId);
    if (!q)
      return res
        .status(404)
        .json({ success: false, message: "Quotation not found" });

    const album = q.albums.id(albumId);
    if (!album) {
      return res
        .status(404)
        .json({ success: false, message: "Album not found" });
    }

    // Previous values for delta calc
    const prevType = album.type;
    const prevFinalTotal =
      prevType === "addons" ? Number(album?.suggested?.finalTotal) || 0 : 0;

    // Apply only provided fields (don’t overwrite with undefined)
    const updatable = [
      "templateId",
      "boxTypeId",
      "qty",
      "unitPrice",
      "customizePerUnit",
      "extras",
      "suggested",
      "snapshot",
      "type",
    ];
    updatable.forEach((k) => {
      if (update[k] !== undefined) album[k] = update[k];
    });

    // New values for delta calc
    // const newType = album.type;
    // const newFinalTotal =
    //   newType === "addons" ? Number(album?.suggested?.finalTotal) || 0 : 0;

    // // Adjust quotation total by the delta
    // const delta = newFinalTotal - prevFinalTotal;
    // if (delta !== 0) {
    //   q.totalAmount = (Number(q.totalAmount) || 0) + delta;
    //   if (q.totalAmount < 0) q.totalAmount = 0; // safety guard
    // }

    await q.save();

    return res.json({
      success: true,
      album,
      quotation: q,
    });
  } catch (error) {
    console.error("Album update error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error updating album",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// DELETE /api/quotations/:quotationId/albums/:albumId
exports.deleteAlbum = async (req, res) => {
  try {
    const { quotationId, albumId } = req.params;
    if (!mongoose.isValidObjectId(quotationId)) {
      return res.status(400).json({ message: "Invalid quotationId" });
    }

    const q = await Quotation.findById(quotationId);
    if (!q) return res.status(404).json({ message: "Quotation not found" });

    const album = q.albums.id(albumId);
    if (!album) return res.status(404).json({ message: "Album not found" });

    album.deleteOne();
    await q.save();

    return res.json({ message: "Album deleted", quotation: q });
  } catch (err) {
    console.error("deleteAlbum error:", err);
    return res.status(500).json({ message: "Failed to delete album" });
  }
};

// GET /api/quotations/:quotationId/albums
exports.getAlbums = async (req, res) => {
  try {
    const { quotationId } = req.params;
    if (!mongoose.isValidObjectId(quotationId)) {
      return res.status(400).json({ message: "Invalid quotationId" });
    }

    const q = await Quotation.findById(quotationId).select("albums");
    if (!q) return res.status(404).json({ message: "Quotation not found" });

    return res.json({ albums: q.albums });
  } catch (err) {
    console.error("getAlbums error:", err);
    return res.status(500).json({ message: "Failed to fetch albums" });
  }
};

// GET /api/quotations/:quotationId/albums/:albumId
exports.getAlbumById = async (req, res) => {
  try {
    const { quotationId, albumId } = req.params;
    if (!mongoose.isValidObjectId(quotationId)) {
      return res.status(400).json({ message: "Invalid quotationId" });
    }
    // albumId is a subdocument _id (ObjectId) in your schema
    if (!mongoose.isValidObjectId(albumId)) {
      return res.status(400).json({ message: "Invalid albumId" });
    }

    const q = await Quotation.findById(quotationId).select("albums");
    if (!q) return res.status(404).json({ message: "Quotation not found" });

    const album = q.albums.id(albumId);
    if (!album) return res.status(404).json({ message: "Album not found" });

    return res.json({ album });
  } catch (err) {
    console.error("getAlbumById error:", err);
    return res.status(500).json({ message: "Failed to fetch album" });
  }
};

// ✅ Update album status by albumId inside quotation
exports.updateAlbumStatus = async (req, res) => {
  try {
    const { quotationId, albumId } = req.params;
    const { status } = req.body;

    const VALID = new Set([
      "Awaiting Customer Selection",
        "Photos To Be Selected By Us",
        "Selection Ready",
        "Album Photo Correction",
        "In Progress",
        "Awaiting Printing Approval",
        "Sent for Printing",
        "Completed",
    ]);

    if (!status || !VALID.has(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or missing status value." });
    }

    // Build filter for quotation (supports ObjectId or external string id like QN0009)
    const isObjectId = mongoose.Types.ObjectId.isValid(quotationId);
    const qFilter = isObjectId ? { _id: quotationId } : { quotationId };

    // Only fetch _id for speed
    const qIdDoc = await Quotation.findOne(qFilter).select("_id").lean();
    if (!qIdDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Quotation not found." });
    }
    const qId = qIdDoc._id;

    // Special rule: if moving to Awaiting Printing Approval, ensure editing task exists and complete it if still Assigned
    if (status === "Awaiting Printing Approval") {
      // 1) Try to complete the latest Assigned task in one go
      const completedTask = await AlbumEditingTask.findOneAndUpdate(
        { quotationId: qId, albumId, status: "Assigned" },
        { $set: { status: "Submitted" } },
        { new: true, sort: { createdAt: -1 } }
      ).lean();

      if (!completedTask) {
        // 2) If we didn't find an Assigned task, check if any task exists at all
        const existsAny = await AlbumEditingTask.exists({
          quotationId: qId,
          albumId,
        });
        if (!existsAny) {
          return res.status(400).json({
            success: false,
            message: "Editing task is not assigned yet.", // ⬅️ If you meant printing task, adjust text
          });
        }
        // If tasks exist but none are Assigned (e.g., already Completed), we proceed.
      }

      // 3) Update album status positional without loading doc
      const upd = await Quotation.updateOne(
        { _id: qId, "albums._id": albumId },
        { $set: { "albums.$.status": "Awaiting Printing Approval" } }
      );

      if (!upd || upd.modifiedCount !== 1) {
        return res.status(404).json({
          success: false,
          message: "Album not found in this quotation or status unchanged.",
        });
      }

      return res.json({
        success: true,
        message: `Album status updated to "Awaiting Printing Approval".`,
        data: {
          quotationId: qId,
          albumId,
          newStatus: "Awaiting Printing Approval",
        },
      });
    }

    // Fast path for all other statuses: single positional update
    const upd = await Quotation.updateOne(
      { _id: qId, "albums._id": albumId },
      { $set: { "albums.$.status": status } }
    );

    if (!upd || upd.modifiedCount !== 1) {
      return res.status(404).json({
        success: false,
        message: "Album not found in this quotation or status unchanged.",
      });
    }

    return res.json({
      success: true,
      message: `Album status updated to "${status}".`,
      data: { quotationId: qId, albumId, newStatus: status },
    });
  } catch (error) {
    console.error("updateAlbumStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update album status.",
      error: error.message,
    });
  }
};
