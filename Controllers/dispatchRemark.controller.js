const mongoose = require("mongoose");
const DispatchRemark = require("../models/dispatchRemark");
const Quotation = require("../models/quotation.model"); // adjust path if needed

// ✅ CREATE (or UPDATE if already exists for same quotationId)
// POST /api/dispatch-remarks
exports.createOrUpdateDispatchRemark = async (req, res) => {
  try {
    const { quotationId, quotationUniqueId, dispatchText } = req.body;

    // --- validations ---
    if (!quotationId || !mongoose.Types.ObjectId.isValid(quotationId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid quotationId is required" });
    }

    const incomingUnique = String(quotationUniqueId || "").trim();
    if (!incomingUnique) {
      return res
        .status(400)
        .json({ success: false, message: "quotationUniqueId is required" });
    }

    const cleanText = String(dispatchText || "").trim();
    if (!cleanText) {
      return res
        .status(400)
        .json({ success: false, message: "dispatchText is required" });
    }

    // ✅ ensure quotation exists & validate uniqueId (handles both possible DB fields)
    const q = await Quotation.findById(quotationId).select(
      "_id quotationUniqueId quotationId"
    );

    if (!q) {
      return res
        .status(404)
        .json({ success: false, message: "Quotation not found" });
    }

    // ✅ In your DB, the "unique" may be stored in quotationId OR quotationUniqueId
    const dbUnique = String(q.quotationUniqueId || q.quotationId || "").trim();

    if (dbUnique !== incomingUnique) {
      return res.status(400).json({
        success: false,
        message: "quotationUniqueId does not match the quotation record",
        // debug: { dbUnique, incomingUnique }, // uncomment for debugging
      });
    }

    // ✅ Upsert by quotationId: one record per quotation
    const doc = await DispatchRemark.findOneAndUpdate(
      { quotationId }, // unique key
      {
        $set: {
          quotationId,
          quotationUniqueId: incomingUnique,
          dispatchText: cleanText,
        },
      },
      { new: true, upsert: true }
    );

    return res.status(201).json({
      success: true,
      message: "Dispatch remark saved",
      data: doc,
    });
  } catch (err) {
    console.log("createOrUpdateDispatchRemark error:", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "Server error",
    });
  }
};

// ✅ EDIT by remarkId
// PUT /api/dispatch-remarks/:id
exports.updateDispatchRemarkById = async (req, res) => {
  try {
    const { id } = req.params;
    const { dispatchText } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid remark id is required" });
    }

    const cleanText = String(dispatchText || "").trim();
    if (!cleanText) {
      return res
        .status(400)
        .json({ success: false, message: "dispatchText is required" });
    }

    const doc = await DispatchRemark.findByIdAndUpdate(
      id,
      { $set: { dispatchText: cleanText } },
      { new: true }
    );

    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: "Dispatch remark not found" });
    }

    return res.json({
      success: true,
      message: "Dispatch remark updated",
      data: doc,
    });
  } catch (err) {
    console.log("updateDispatchRemarkById error:", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "Server error",
    });
  }
};

// ✅ GET (by quotationId)
// GET /api/dispatch-remarks/by-quotation/:quotationId
exports.getDispatchRemarkByQuotationId = async (req, res) => {
  try {
    const { quotationId } = req.params;

    if (!quotationId || !mongoose.Types.ObjectId.isValid(quotationId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid quotationId is required" });
    }

    const doc = await DispatchRemark.findOne({ quotationId }).lean();

    return res.json({
      success: true,
      data: doc || null,
    });
  } catch (err) {
    console.log("getDispatchRemarkByQuotationId error:", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "Server error",
    });
  }
};
