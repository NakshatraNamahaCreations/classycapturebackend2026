const VideoEditingTask = require("../models/videoEditingTask");
const CollectedData = require("../models/collectedData");

// 🎥 Assign Video Editing Task
exports.assignVideoEditingTask = async (req, res) => {
  try {
    const {
      quotationId,
      collectedDataId,
      // packageId,
      packageName,
      serviceName,
      vendorId,
      vendorName,
      taskDescription,
      totalClipsAssigned,
      finalVideoDuration,
      completionDate,
    } = req.body;

    if (!totalClipsAssigned || totalClipsAssigned <= 0)
      return res
        .status(400)
        .json({ success: false, message: "totalClipsAssigned is required" });

    const newTask = await VideoEditingTask.create({
      quotationId,
      collectedDataId,
      // packageId,
      packageName,
      serviceName,
      vendorId,
      vendorName,
      taskDescription,
      totalClipsAssigned,
      finalVideoDuration,
      completionDate,
    });

    res
      .status(201)
      .json({
        success: true,
        message: "Video Editing Task Assigned",
        task: newTask,
      });
  } catch (err) {
    console.error("Error assigning video editing task:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 🎥 Submit Video Editing Task
exports.submitVideoEditingTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { submittedDate, submittedNotes } = req.body;

    const task = await VideoEditingTask.findById(id);
    if (!task)
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });

    task.status = "Completed";
    task.submittedDate = submittedDate || new Date();
    task.submittedNotes = submittedNotes || "";
    await task.save();

    res.json({ success: true, message: "Video Editing Task Submitted", task });
  } catch (err) {
    console.error("Error submitting video editing task:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 🎥 Fetch All Video Editing Tasks
exports.getAllVideoEditingTasks = async (req, res) => {
  try {
    const tasks = await VideoEditingTask.find().sort({ createdAt: -1 });
    res.json({ success: true, count: tasks.length, tasks });
  } catch (err) {
    console.error("Error fetching video editing tasks:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 🎥 Fetch Single Video Editing Task by ID
exports.getVideoEditingTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await VideoEditingTask.findById(id);
    if (!task)
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });

    res.json({ success: true, task });
  } catch (err) {
    console.error("Error fetching video editing task:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 🎥 Fetch Tasks by Quotation ID
exports.getVideoEditingTasksByQuotation = async (req, res) => {
  try {
    const { quotationId } = req.params;
    const tasks = await VideoEditingTask.find({ quotationId }).sort({
      createdAt: -1,
    });
    res.json({ success: true, count: tasks.length, tasks });
  } catch (err) {
    console.error("Error fetching video tasks by quotation:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// -------------------- VIDEO: COUNT pending services to assign --------------------
exports.countPendingVideoEditingAssignments = async (req, res) => {
  try {
    const agg = await CollectedData.aggregate([
      { $unwind: "$serviceUnits" },

      // only rows that have videos
      { $match: { "serviceUnits.noOfVideos": { $gt: 0 } } },

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

          totalVideosForService: { $sum: "$serviceUnits.noOfVideos" },
          latestUpdatedAt: { $max: "$serviceUnits.updatedAt" },
        },
      },

      {
        $lookup: {
          from: "videoeditingtasks",
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
          as: "_videoTask",
        },
      },

      { $match: { $expr: { $eq: [{ $size: "$_videoTask" }, 0] } } },

      { $count: "total" },
    ]);

    const total = agg?.[0]?.total || 0;
    return res.status(200).json({ success: true, total });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: "Failed to count pending video editing assignments",
      error: e?.message || String(e),
    });
  }
};

/**
 * ✅ VIDEO: LIST pending services to assign (packageName + serviceName bucket level)
 * - Groups multiple units of same service into one row
 * - Sums totalVideos across units
 * - Removes duplicate _id object and removes unnecessary fields
 */
exports.listPendingVideoEditingAssignments = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const pipeline = [
      { $unwind: "$serviceUnits" },
      { $match: { "serviceUnits.noOfVideos": { $gt: 0 } } },
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

          totalVideos: { $sum: "$serviceUnits.noOfVideos" },
          submissionDate: { $max: "$serviceUnits.submissionDate" },
          updatedAt: { $max: "$serviceUnits.updatedAt" },

          // if you want to show sorting status
          sortingStatusNum: {
            $min: {
              $cond: [
                { $eq: ["$serviceUnits.sortingStatus", "Completed"] },
                1,
                0,
              ],
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

      // ✅ check if any video editing task exists for this bucket
      {
        $lookup: {
          from: "videoeditingtasks",
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
          as: "_videoTask",
        },
      },

      // pending => no task exists
      { $match: { $expr: { $eq: [{ $size: "$_videoTask" }, 0] } } },

      // ✅ CLEAN RESPONSE (no duplicates, no unnecessary fields)
      {
        $project: {
          _id: 0, // removes grouped _id object completely

          quotationId: "$_id.quotationId",
          collectedDataId: "$_id.collectedDataId",
          quotationUniqueId: 1,
          personName: 1,

          packageId: 1,
          packageName: "$_id.packageName",
          serviceId: 1,
          serviceName: "$_id.serviceName",

          totalVideos: 1,
          sortingStatus: 1, // remove this line if you don't want it
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
              {
                $gt: [
                  { $ifNull: [{ $arrayElemAt: ["$meta.total", 0] }, 0] },
                  0,
                ],
              },
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
      message: "Failed to list pending video editing assignments",
      error: e?.message || String(e),
    });
  }
};
