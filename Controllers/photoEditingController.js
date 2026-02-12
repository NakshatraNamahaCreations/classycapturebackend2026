const PhotoEditingTask = require("../models/photoEditingTask");
const Quotation = require("../models/quotation.model");
const CollectedData = require("../models/collectedData");

// 📸 Assign Photo Editing Task
exports.assignPhotoEditingTask = async (req, res) => {
  try {
    const {
      quotationId,
      collectedDataId,
      packageName,
      serviceName,
      vendorId,
      vendorName,
      taskDescription,
      assignedPhotosToEdit,
      completionDate,
    } = req.body;

    if (!assignedPhotosToEdit || assignedPhotosToEdit <= 0)
      return res
        .status(400)
        .json({ success: false, message: "assignedPhotosToEdit is required" });

    const newTask = await PhotoEditingTask.create({
      quotationId,
      collectedDataId,
      packageName,
      serviceName,
      vendorId,
      vendorName,
      taskDescription,
      assignedPhotosToEdit,
      completionDate,
    });

    res.status(201).json({ success: true, message: "Photo Editing Task Assigned", task: newTask });
  } catch (err) {
    console.error("Error assigning photo editing task:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 📸 Submit Photo Editing Task
exports.submitPhotoEditingTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { submittedPhotosToEdit, submittedDate, submittedNotes } = req.body;

    const task = await PhotoEditingTask.findById(id);
    if (!task)
      return res.status(404).json({ success: false, message: "Task not found" });

    task.status = "Completed";
    task.submittedDate = submittedDate || new Date();
    task.submittedNotes = submittedNotes || "";
    task.submittedPhotosToEdit = submittedPhotosToEdit;
    await task.save();

    res.json({ success: true, message: "Photo Editing Task Submitted", task });
  } catch (err) {
    console.error("Error submitting photo editing task:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 📸 Fetch All Photo Editing Tasks
exports.getAllPhotoEditingTasks = async (req, res) => {
  try {
    const tasks = await PhotoEditingTask.find().sort({ createdAt: -1 });
    res.json({ success: true, count: tasks.length, tasks });
  } catch (err) {
    console.error("Error fetching photo editing tasks:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 📸 Fetch Single Photo Editing Task by ID
exports.getPhotoEditingTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await PhotoEditingTask.findById(id);
    if (!task)
      return res.status(404).json({ success: false, message: "Task not found" });

    res.json({ success: true, task });
  } catch (err) {
    console.error("Error fetching photo editing task:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 📸 Fetch Tasks by Quotation ID
exports.getPhotoEditingTasksByQuotation = async (req, res) => {
  try {
    const { quotationId } = req.params;
    const tasks = await PhotoEditingTask.find({ quotationId }).sort({ createdAt: -1 });
    res.json({ success: true, count: tasks.length, tasks });
  } catch (err) {
    console.error("Error fetching tasks by quotation:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// -------------------- PHOTO: COUNT pending services to assign --------------------
exports.countPendingPhotoEditingAssignments = async (req, res) => {
  try {
    const agg = await CollectedData.aggregate([
      { $unwind: "$serviceUnits" },

      // only rows that have photos
      { $match: { "serviceUnits.noOfPhotos": { $gt: 0 } } },

      // ✅ merge multiple units into ONE record per package+service
      {
        $group: {
          _id: {
            quotationId: "$quotationId",
            collectedDataId: "$_id",
            packageName: "$serviceUnits.packageName",
            serviceName: "$serviceUnits.serviceName",
          },
          quotationUniqueId: { $first: "$quotationUniqueId" },
          personName: { $first: "$personName" },
          systemNumber: { $first: "$systemNumber" },

          totalPhotosForService: { $sum: "$serviceUnits.noOfPhotos" },
          latestUpdatedAt: { $max: "$serviceUnits.updatedAt" },
        },
      },

      // ✅ check if task exists for this package+service bucket
      {
        $lookup: {
          from: "photoeditingtasks",
          let: {
            qid: "$_id.quotationId",
            cdid: "$_id.collectedDataId",
            pkg: "$_id.packageName",
            srv: "$_id.serviceName",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$quotationId", "$$qid"] },
                    { $eq: ["$collectedDataId", "$$cdid"] },
                    { $eq: ["$packageName", "$$pkg"] },
                    { $eq: ["$serviceName", "$$srv"] },
                  ],
                },
              },
            },
            { $project: { _id: 1 } },
            { $limit: 1 },
          ],
          as: "_photoTask",
        },
      },

      // pending => no task found
      { $match: { $expr: { $eq: [{ $size: "$_photoTask" }, 0] } } },

      { $count: "total" },
    ]);

    const total = agg?.[0]?.total || 0;
    return res.status(200).json({ success: true, total });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Failed to count pending photo editing assignments",
      error: e?.message || String(e),
    });
  }
};

/**
 * ✅ PHOTO: LIST pending services to assign (packageName + serviceName bucket level)
 * - Groups multiple units of same service into one row
 * - Sums totalPhotos across units
 * - Removes duplicate _id object and removes unnecessary fields
 */
exports.listPendingPhotoEditingAssignments = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const pipeline = [
      { $unwind: "$serviceUnits" },
      { $match: { "serviceUnits.noOfPhotos": { $gt: 0 } } },
      // ✅ enable this if you want "only sorting completed"
      // { $match: { "serviceUnits.sortingStatus": "Completed" } },

      // ✅ bucket by quotation + collectedData + packageName + serviceName
      {
        $group: {
          _id: {
            quotationId: "$quotationId",
            collectedDataId: "$_id",
            packageName: "$serviceUnits.packageName",
            serviceName: "$serviceUnits.serviceName",
          },
          quotationUniqueId: { $first: "$quotationUniqueId" },
          personName: { $first: "$personName" },

          packageId: { $first: "$serviceUnits.packageId" },
          serviceId: { $first: "$serviceUnits.serviceId" },

          totalPhotos: { $sum: "$serviceUnits.noOfPhotos" },
          submissionDate: { $max: "$serviceUnits.submissionDate" },
          updatedAt: { $max: "$serviceUnits.updatedAt" },

          sortingStatusNum: {
            $min: {
              $cond: [{ $eq: ["$serviceUnits.sortingStatus", "Completed"] }, 1, 0],
            },
          },
        },
      },

      {
        $addFields: {
          sortingStatus: {
            $cond: [{ $eq: ["$sortingStatusNum", 1] }, "Completed", "Pending"],
          },
        },
      },

      // ✅ check if any photo editing task exists for this bucket
      {
        $lookup: {
          from: "photoeditingtasks",
          let: {
            qid: "$_id.quotationId",
            cdid: "$_id.collectedDataId",
            pkg: "$_id.packageName",
            srv: "$_id.serviceName",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$quotationId", "$$qid"] },
                    { $eq: ["$collectedDataId", "$$cdid"] },
                    { $eq: ["$packageName", "$$pkg"] },
                    { $eq: ["$serviceName", "$$srv"] },
                  ],
                },
              },
            },
            { $project: { _id: 1 } },
            { $limit: 1 },
          ],
          as: "_photoTask",
        },
      },

      // pending => no task exists
      { $match: { $expr: { $eq: [{ $size: "$_photoTask" }, 0] } } },

      // ✅ CLEAN RESPONSE (no duplicates, no unnecessary fields)
      {
        $project: {
          _id: 0,

          quotationId: "$_id.quotationId",
          collectedDataId: "$_id.collectedDataId",
          quotationUniqueId: 1,
          personName: 1,

          packageId: 1,
          packageName: "$_id.packageName",
          serviceId: 1,
          serviceName: "$_id.serviceName",

          totalPhotos: 1,
          sortingStatus: 1, // remove if you don't want
          submissionDate: 1,
          updatedAt: 1,
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

    return res.status(200).json({ success: true, ...out });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Failed to list pending photo editing assignments",
      error: e?.message || String(e),
    });
  }
};
