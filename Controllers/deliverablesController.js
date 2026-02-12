// controllers/deliverable.controller.js
const mongoose = require("mongoose");
const Deliverable = require("../models/deliverable");
const Quotation = require("../models/quotation.model");
const SortingAssignedTask = require("../models/sortingassignedTask");
const PhotoEditingTask = require("../models/photoEditingTask");
const VideoEditingTask = require("../models/videoEditingTask");
const CollectedData = require("../models/collectedData"); // ✅ NEW

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(String(id || "").trim());
}

function safeLower(s) {
  return String(s || "").trim().toLowerCase();
}

function ensurePkg(pkgMap, pkgId, pkgName, eventStartDate, eventEndDate) {
  const key = String(pkgId);
  if (!pkgMap.has(key)) {
    pkgMap.set(key, {
      packageId: pkgId,
      packageName: pkgName || "",
      eventStartDate: eventStartDate || "",
      eventEndDate: eventEndDate || "",
      deliverables: [],
    });
  }
  return pkgMap.get(key);
}

function pushDeliverable(pkgMap, pkgId, pkgName, extra, eventStartDate, eventEndDate) {
  const pkg = ensurePkg(pkgMap, pkgId, pkgName, eventStartDate, eventEndDate);
  pkg.deliverables.push(extra);
}

function pickFirstDuration(tasks = []) {
  const fields = ["finalVideoDuration"];
  for (const t of tasks) {
    for (const f of fields) {
      const v = String(t?.[f] || "").trim();
      if (v) return v;
    }
  }
  return "";
}

/**
 * ✅ FINALIZE DELIVERABLES (RUN ONCE)
 *
 * Added:
 * - Fetch CollectedData.personName and store in Deliverable.personName
 */
exports.finalizeDeliverablesOnBookingComplete = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const quotationId = String(req.params.quotationId || "").trim();
    if (!isValidId(quotationId)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Invalid quotationId" });
    }

    // 1) If already finalized, return it
    const existing = await Deliverable.findOne({ quotationId }).session(session);
    if (existing?.status === "Finalized" && existing?.finalizedAt) {
      await session.commitTransaction();
      return res.json({ success: true, deliverable: existing, alreadyFinalized: true });
    }

    // 2) Load quotation
    const quotation = await Quotation.findById(quotationId).session(session).lean();
    if (!quotation) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Quotation not found" });
    }

    // ✅ 2.1) Load collected data personName (single doc per quotation)
    const collected = await CollectedData.findOne({ quotationId })
      .select("personName")
      .session(session)
      .lean();

    const personName = String(collected?.personName || "").trim();

    // 3) Load tasks
    const [sortingTasks, photoTasks, videoTasks] = await Promise.all([
      SortingAssignedTask.find({ quotationId }).session(session).lean(),
      PhotoEditingTask.find({ quotationId }).session(session).lean(),
      VideoEditingTask.find({ quotationId }).session(session).lean(),
    ]);

    // 4) Validate completed
    const pendingSorting = (sortingTasks || []).filter((t) => t.status !== "Completed");
    const pendingPhoto = (photoTasks || []).filter((t) => t.status !== "Completed");
    const pendingVideo = (videoTasks || []).filter((t) => t.status !== "Completed");

    if (pendingSorting.length || pendingPhoto.length || pendingVideo.length) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Cannot finalize deliverables. Pending tasks exist.",
        pending: {
          sorting: pendingSorting.length,
          photoEditing: pendingPhoto.length,
          videoEditing: pendingVideo.length,
        },
      });
    }

    // 5) service presence per package from quotation
    const pkgServiceMap = new Map(); // pkgId -> Set(serviceNameLower)
    for (const pkg of quotation.packages || []) {
      const s = new Set();
      for (const srv of pkg.services || []) s.add(safeLower(srv.serviceName));
      pkgServiceMap.set(String(pkg._id), s);
    }

    // 6) Package-wise deliverables
    const pkgMap = new Map();

    // A) Sorted Photos (ONLY submitted)
    const sortingByPkg = new Map();
    for (const t of sortingTasks || []) {
      const pkgId = String(t.packageId || "");
      if (!pkgId) continue;

      const pkgName = t.packageName || "";
      if (!sortingByPkg.has(pkgId)) sortingByPkg.set(pkgId, { photos: 0, videos: 0, pkgName });

      sortingByPkg.get(pkgId).photos += Number(t.submittedPhotos ?? 0);
      sortingByPkg.get(pkgId).videos += Number(t.submittedVideos ?? 0);
    }

    for (const [pkgId, val] of sortingByPkg.entries()) {
      const qPkg = (quotation.packages || []).find((p) => String(p._id) === String(pkgId));
      pushDeliverable(
        pkgMap,
        new mongoose.Types.ObjectId(pkgId),
        val.pkgName || qPkg?.categoryName || "",
        {
          type: "Sorted Photos",
          label: "All sorted Photos soft copy",
          photos: val.photos,
          videos: 0,
          reels: 0,
          duration: "",
          notes: "",
        },
        qPkg?.eventStartDate,
        qPkg?.eventEndDate
      );
    }

    // B) Edited Photos (ONLY candid + ONLY submitted)
    const editedByPkgName = new Map(); // packageName -> total submitted
    for (const t of photoTasks || []) {
      const pkgName = String(t.packageName || "").trim();
      const svc = safeLower(t.serviceName);

      if (!svc.includes("candid")) continue;

      const submitted = Number(t.submittedPhotosToEdit ?? 0);
      editedByPkgName.set(pkgName, (editedByPkgName.get(pkgName) || 0) + submitted);
    }

    for (const pkg of quotation.packages || []) {
      const pkgId = String(pkg._id);
      const pkgName = String(pkg.categoryName || "").trim();
      const svcSet = pkgServiceMap.get(pkgId) || new Set();

      const hasCandidPhoto = svcSet.has("candid photographer");
      if (!hasCandidPhoto) continue;

      const editedCount = editedByPkgName.get(pkgName) || 0;
      if (editedCount > 0) {
        pushDeliverable(
          pkgMap,
          pkg._id,
          pkgName,
          {
            type: "Edited Photos",
            label: "All edited Candid photos soft copy",
            photos: editedCount,
            videos: 0,
            reels: 0,
            duration: "",
            notes: "",
          },
          pkg?.eventStartDate,
          pkg?.eventEndDate
        );
      }
    }

    // C) Videos deliverables (1 per event if service exists)
    const videoByPkgName = new Map();
    for (const t of videoTasks || []) {
      const pkgName = String(t.packageName || "").trim();
      if (!videoByPkgName.has(pkgName)) videoByPkgName.set(pkgName, []);
      videoByPkgName.get(pkgName).push(t);
    }

    for (const pkg of quotation.packages || []) {
      const pkgId = String(pkg._id);
      const pkgName = String(pkg.categoryName || "").trim();
      const svcSet = pkgServiceMap.get(pkgId) || new Set();

      const tasks = videoByPkgName.get(pkgName) || [];
      const dur = pickFirstDuration(tasks);

      const hasTraditionalVideo = svcSet.has("traditional videographer");
      const hasCandidVideo =
        svcSet.has("candid videographer") ||
        svcSet.has("candid cinematographer") ||
        svcSet.has("cinematography");

      if (hasTraditionalVideo) {
        pushDeliverable(
          pkgMap,
          pkg._id,
          pkgName,
          {
            type: "Traditional Video",
            label: "Traditional videography - 1 edited video",
            photos: 0,
            videos: 1,
            reels: 0,
            duration: dur,
            notes: "",
          },
          pkg?.eventStartDate,
          pkg?.eventEndDate
        );
      }

      if (hasCandidVideo) {
        pushDeliverable(
          pkgMap,
          pkg._id,
          pkgName,
          {
            type: "Candid Video",
            label: "Candid videography/cinematography - 1 edited video + 1 reel",
            photos: 0,
            videos: 1,
            reels: 1,
            duration: dur,
            notes: "",
          },
          pkg?.eventStartDate,
          pkg?.eventEndDate
        );
      }
    }

    // D) Albums
    const albums = (quotation.albums || []).map((a) => ({
      albumId: a._id,
      name: a?.snapshot?.templateLabel || a.templateId || "Album",
      status: a.status || "",
    }));

    // Additional services (NO PRICE)
    const additionalServices = (quotation.additionalServices || []).map((s) => ({
      serviceId: s.serviceId || null,
      name: s.name || "",
      description: s.description || "",
    }));

    // Summary
    const pkgArr = Array.from(pkgMap.values());
    const allDelivs = pkgArr.flatMap((p) => p.deliverables || []);

    const summary = {
      totalSortedPhotos: allDelivs
        .filter((d) => d.type === "Sorted Photos")
        .reduce((s, d) => s + Number(d.photos ?? 0), 0),

      totalEditedPhotos: allDelivs
        .filter((d) => d.type === "Edited Photos")
        .reduce((s, d) => s + Number(d.photos ?? 0), 0),

      totalTraditionalVideos: allDelivs
        .filter((d) => d.type === "Traditional Video")
        .reduce((s, d) => s + Number(d.videos ?? 0), 0),

      totalCandidVideos: allDelivs
        .filter((d) => d.type === "Candid Video")
        .reduce((s, d) => s + Number(d.videos ?? 0), 0),

      totalReels: allDelivs.reduce((s, d) => s + Number(d.reels ?? 0), 0),
      totalAlbums: albums.length,
    };

    // 7) Upsert + Finalize (store personName too)
    const deliverableDoc = await Deliverable.findOneAndUpdate(
      { quotationId },
      {
        $set: {
          quotationId: quotation._id,
          quotationUniqueId: quotation.quotationId,
          personName, // ✅ stored here
          status: "Finalized",
          finalizedAt: new Date(),
          snapshot: {
            packages: pkgArr.map((p) => ({
              packageId: p.packageId,
              packageName: p.packageName,
              eventStartDate: p.eventStartDate,
              eventEndDate: p.eventEndDate,
              deliverables: p.deliverables || [],
            })),
            albums,
            additionalServices,
            summary,
          },
          meta: {
            computedFrom: {
              sortingTaskCount: sortingTasks.length,
              photoEditTaskCount: photoTasks.length,
              videoEditTaskCount: videoTasks.length,
            },
          },
        },
        $setOnInsert: { version: 1 },
      },
      { new: true, upsert: true, session }
    );

    // 8) Mark quotation Completed
    await Quotation.updateOne(
      { _id: quotationId },
      { $set: { bookingStatus: "Completed" } },
      { session }
    );

    await session.commitTransaction();
    return res.json({ success: true, deliverable: deliverableDoc, finalized: true });
  } catch (e) {
    try {
      await session.abortTransaction();
    } catch (_) {}
    return res.status(500).json({ success: false, message: e?.message || "Server error" });
  } finally {
    session.endSession();
  }
};

/**
 * ✅ Fetch Deliverables (NO compute)
 */
exports.getDeliverablesByQuotation = async (req, res) => {
  try {
    const quotationId = String(req.params.quotationId || "").trim();
    if (!isValidId(quotationId)) {
      return res.status(400).json({ success: false, message: "Invalid quotationId" });
    }

    const doc = await Deliverable.findOne({ quotationId }).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: "Deliverables not finalized yet." });
    }

    return res.json({ success: true, deliverable: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || "Server error" });
  }
};
