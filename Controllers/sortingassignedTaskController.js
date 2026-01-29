const AssignedTask = require("../models/sortingassignedTask");
const Vendor = require("../models/vendor.model");
const mongoose = require("mongoose");

// exports.assignTask = async (req, res) => {
//   try {
//     const {
//       quotationId,
//       eventId,
//       eventName,
//       totalPhotos,
//       totalVideos,
//       assignments,
//     } = req.body;

//     if (
//       !quotationId ||
//       !eventId ||
//       !eventName ||
//       !assignments ||
//       !Array.isArray(assignments) ||
//       assignments.length === 0
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "All required fields must be provided and assignments must be a non-empty array.",
//       });
//     }

//     const newPhotosAssigned = assignments.reduce(
//       (sum, a) => sum + (a.photosAssigned || 0),
//       0
//     );
//     const newVideosAssigned = assignments.reduce(
//       (sum, a) => sum + (a.videosAssigned || 0),
//       0
//     );

//     let assignedTask = await AssignedTask.findOne({ quotationId, eventId });

//     if (assignedTask) {
//       // ✅ There is already an assignment → use remaining counts
//       const remainingPhotos = assignedTask.remainingPhotosToAssign || 0;
//       const remainingVideos = assignedTask.remainingVideosToAssign || 0;

//       if (newPhotosAssigned > remainingPhotos) {
//         return res.status(400).json({
//           success: false,
//           message: `Cannot assign ${newPhotosAssigned} photos. Remaining count is ${remainingPhotos}.`,
//         });
//       }
//       if (newVideosAssigned > remainingVideos) {
//         return res.status(400).json({
//           success: false,
//           message: `Cannot assign ${newVideosAssigned} videos. Remaining count is ${remainingVideos}.`,
//         });
//       }

//       assignedTask.assignments.push(...assignments);

//       assignedTask.assignedPhotos += newPhotosAssigned;
//       assignedTask.assignedVideos += newVideosAssigned;

//       assignedTask.remainingPhotosToAssign =
//         (assignedTask.remainingPhotosToAssign ?? assignedTask.totalPhotos) - newPhotosAssigned;
//       assignedTask.remainingVideosToAssign =
//         (assignedTask.remainingVideosToAssign ?? assignedTask.totalVideos) - newVideosAssigned;

//       assignedTask.totalPhotos = assignedTask.totalPhotos || totalPhotos;
//       assignedTask.totalVideos = assignedTask.totalVideos || totalVideos;

//       await assignedTask.save();
//     } else {
//       // ✅ First-time assignment → validate against total
//       if (newPhotosAssigned > totalPhotos) {
//         return res.status(400).json({
//           success: false,
//           message: `Cannot assign ${newPhotosAssigned} photos. Total available is ${totalPhotos}.`,
//         });
//       }
//       if (newVideosAssigned > totalVideos) {
//         return res.status(400).json({
//           success: false,
//           message: `Cannot assign ${newVideosAssigned} videos. Total available is ${totalVideos}.`,
//         });
//       }

//       assignedTask = await AssignedTask.create({
//         quotationId,
//         eventId,
//         eventName,
//         totalPhotos,
//         totalVideos,
//         assignedPhotos: newPhotosAssigned,
//         assignedVideos: newVideosAssigned,
//         remainingPhotosToAssign: (totalPhotos || 0) - newPhotosAssigned,
//         remainingVideosToAssign: (totalVideos || 0) - newVideosAssigned,
//         assignments,
//       });
//     }

//     // ✅ Update vendor status
//     for (const assignment of assignments) {
//       await Vendor.findByIdAndUpdate(
//         assignment.vendorId,
//         { status: "Not Available" },
//         { new: true }
//       );
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Task assigned successfully",
//       data: assignedTask,
//     });
//   } catch (error) {
//     console.error("Error assigning task:", error);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// exports.getOverallCounts = async (req, res) => {
//   const { quotationId, eventId } = req.query;

//   if (!quotationId || !eventId) {
//     return res.status(400).json({
//       success: false,
//       message: "quotationId and eventId are required",
//     });
//   }

//   try {
//     // ✅ First, get base totalPhotos & totalVideos from CollectedData
//     const collectedData = await CollectedData.findOne(
//       { quotationId, "events.eventId": eventId },
//       { "events.$": 1 } // fetch only the matching event
//     );

//     if (!collectedData) {
//       return res.status(404).json({
//         success: false,
//         message: "Event data not found in collected data",
//       });
//     }

//     const eventData = collectedData.events[0];
//     const totalPhotos = eventData.noOfPhotos || 0;
//     const totalVideos = eventData.noOfVideos || 0;

//     // ✅ Check if there are any tasks assigned
//     const tasks = await AssignedTask.find({ quotationId, eventId });

//     if (!tasks.length) {
//       // If no tasks yet → total = remaining = base event counts
//       return res.status(200).json({
//         success: true,
//         data: {
//           totalPhotos,
//           totalVideos,
//           assignedPhotos: 0,
//           assignedVideos: 0,
//           remainingPhotosToAssign: totalPhotos,
//           remainingVideosToAssign: totalVideos,
//         },
//       });
//     }

//     // ✅ If tasks exist, calculate assigned counts
//     const assignedPhotos = tasks.reduce(
//       (sum, task) => sum + (task.assignedPhotos || 0),
//       0
//     );
//     const assignedVideos = tasks.reduce(
//       (sum, task) => sum + (task.assignedVideos || 0),
//       0
//     );

//     return res.status(200).json({
//       success: true,
//       data: {
//         totalPhotos,
//         totalVideos,
//         assignedPhotos,
//         assignedVideos,
//         remainingPhotosToAssign: Math.max(totalPhotos - assignedPhotos, 0),
//         remainingVideosToAssign: Math.max(totalVideos - assignedVideos, 0),
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching overall counts:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

// // GET /api/assignments/:eventId/:serviceName
// exports.getAssignmentsByEventAndService = async (req, res) => {
//   try {
//     const { eventId, serviceName } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(eventId)) {
//       return res.status(400).json({ success: false, message: "Invalid eventId" });
//     }

//     const assignments = await AssignedTask.aggregate([
//       { $match: { eventId: new mongoose.Types.ObjectId(eventId) } },
//       { $unwind: "$assignments" },
//       { $match: { "assignments.serviceName": serviceName } },
//       {
//         $project: {
//           _id: "$assignments._id",
//           quotationId: 1,
//           eventId: 1,
//           eventName: 1,
//           serviceName: "$assignments.serviceName",
//           vendorId: "$assignments.vendorId",
//           vendorName: "$assignments.vendorName",
//           taskDate: "$assignments.taskDate",
//           taskDescription: "$assignments.taskDescription",
//           completionDate: "$assignments.completionDate",
//           photosAssigned: "$assignments.photosAssigned",
//           videosAssigned: "$assignments.videosAssigned",
//         //   photosEdited: "$assignments.photosEdited",
//         //   videosEdited: "$assignments.videosEdited",
//           editComment: "$assignments.editComment",
//           status: "$assignments.status",
//         },
//       },
//     ]);

//     return res.status(200).json({
//       success: true,
//       count: assignments.length,
//       assignments,
//     });
//   } catch (error) {
//     console.error("Error fetching assignments:", error);
//     return res.status(500).json({ success: false, message: "Server Error" });
//   }
// };

// exports.getAssignedCounts = async (req, res) => {
//   try {
//     const { quotationId, eventId } = req.query;

//     if (!quotationId || !eventId) {
//       return res.status(400).json({
//         success: false,
//         message: "quotationId and eventId are required",
//       });
//     }

//     // ✅ Fetch only assignedPhotos and assignedVideos
//     const taskCounts = await AssignedTask.findOne(
//       { quotationId, eventId },
//       { assignedPhotos: 1, assignedVideos: 1, _id: 0 } // projection
//     );

//     if (!taskCounts) {
//       return res.status(404).json({
//         success: false,
//         message: "No assigned tasks found for this event",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: {
//         assignedPhotos: taskCounts.assignedPhotos || 0,
//         assignedVideos: taskCounts.assignedVideos || 0,
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching assigned counts:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

// exports.getDetailedMediaAssignmentStatus = async (req, res) => {
//   try {
//     const { quotationId } = req.query;
//     const query = quotationId ? { quotationId } : {};

//     const tasks = await AssignedTask.find(query);

//     const result = {
//       summary: {
//         totalEvents: tasks.length,
//         completedEvents: 0,
//         inProgressEvents: 0,
//         totalPhotos: 0,
//         totalVideos: 0,
//         assignedPhotos: 0,
//         assignedVideos: 0,
//         remainingPhotos: 0,
//         remainingVideos: 0
//       },
//       eventDetails: []
//     };

//     for (const task of tasks) {
//       const remainingPhotos = Math.max(task.totalPhotos - task.assignedPhotos, 0);
//       const remainingVideos = Math.max(task.totalVideos - task.assignedVideos, 0);

//       // Determine event status (you might want to adjust this logic)
//       const isCompleted = remainingPhotos === 0 && remainingVideos === 0;

//       if (isCompleted) {
//         result.summary.completedEvents++;
//       } else {
//         result.summary.inProgressEvents++;
//       }

//       result.summary.totalPhotos += task.totalPhotos;
//       result.summary.totalVideos += task.totalVideos;
//       result.summary.assignedPhotos += task.assignedPhotos;
//       result.summary.assignedVideos += task.assignedVideos;
//       result.summary.remainingPhotos += remainingPhotos;
//       result.summary.remainingVideos += remainingVideos;

//       result.eventDetails.push({
//         eventId: task.eventId,
//         eventName: task.eventName,
//         quotationId: task.quotationId,
//         status: isCompleted ? 'Completed' : 'In Progress',
//         totalPhotos: task.totalPhotos,
//         totalVideos: task.totalVideos,
//         assignedPhotos: task.assignedPhotos,
//         assignedVideos: task.assignedVideos,
//         remainingPhotos,
//         remainingVideos,
//         completionPercentage: {
//           photos: task.totalPhotos > 0 ?
//             Math.round((task.assignedPhotos / task.totalPhotos) * 100) : 0,
//           videos: task.totalVideos > 0 ?
//             Math.round((task.assignedVideos / task.totalVideos) * 100) : 0
//         }
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: result
//     });

//   } catch (error) {
//     console.error("Error getting detailed media status:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error"
//     });
//   }
// };

/**
 * Assign a new task
 */
exports.assignTask = async (req, res) => {
  try {
    const {
      quotationId,
      collectedDataId,
      serviceUnitId,
      vendorId,
      vendorName,
      packageId,
      packageName,
      serviceName,
      taskDescription,
      noOfPhotos,
      noOfVideos,
      completionDate,
    } = req.body;

    const newTask = new AssignedTask({
      quotationId,
      collectedDataId,
      serviceUnitId,
      vendorId,
      vendorName,
      packageId,
      packageName,
      serviceName,
      taskDescription,
      noOfPhotos,
      noOfVideos,
      completionDate,
    });

    await newTask.save();

    // ✅ UPDATE: Update sorting status in CollectedData to "Assigned"
    await mongoose.model("CollectedData").findOneAndUpdate(
      {
        _id: collectedDataId,
        "serviceUnits._id": serviceUnitId,
      },
      {
        $set: {
          "serviceUnits.$.sortingStatus": "Assigned",
        },
      }
    );

    res.status(201).json({
      success: true,
      message: "Task assigned successfully",
      task: newTask,
    });
  } catch (err) {
    console.error("Error assigning task:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Vendor submits a task
 */
exports.submitTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { submittedPhotos, submittedVideos, submittedNotes, submittedDate } =
      req.body;

    const task = await AssignedTask.findById(id);
    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    task.submittedDate = submittedDate || new Date();
    task.submittedPhotos = submittedPhotos || 0;
    task.submittedVideos = submittedVideos || 0;
    task.submittedNotes = submittedNotes || "";
    task.status = "Completed"; // vendor submits -> mark completed

    await task.save();

    // ✅ UPDATE: Update sorting status in CollectedData to "Completed"
    await mongoose.model("CollectedData").findOneAndUpdate(
      {
        _id: task.collectedDataId,
        "serviceUnits._id": task.serviceUnitId,
      },
      {
        $set: {
          "serviceUnits.$.sortingStatus": "Completed",
        },
      }
    );

    res.json({ success: true, message: "Task submitted successfully", task });
  } catch (err) {
    console.error("Error submitting task:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Update task status (Assigned -> InProgress -> Completed)
 */
exports.updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Assigned", "InProgress", "Completed"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const task = await AssignedTask.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    res.json({ success: true, message: "Task status updated", task });
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// exports.getTaskByServiceUnit = async (req, res) => {
//   try {
//     const { unitId } = req.params;

//     // Find task and populate quotation
//     const task = await AssignedTask.findOne({ serviceUnitId: unitId }).populate(
//       {
//         path: "quotationId",
//         select: `
//           quotationId
//           quoteTitle
//           quoteNote
//           totalAmount
//           bookingStatus
//           albums
//           packages.categoryName
//           packages.eventStartDate
//           packages.eventEndDate
//           packages.slot
//           packages.venueName
//         `,
//       }
//     );

//     if (!task) {
//       return res.status(404).json({ success: false, message: "No task found" });
//     }

//     res.json({ success: true, data: task });
//   } catch (err) {
//     console.error("Error fetching task:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

exports.getTaskByServiceUnit = async (req, res) => {
  try {
    const { unitId } = req.params;

    const task = await AssignedTask.findOne({ serviceUnitId: unitId }).populate(
      {
        path: "quotationId",
        select: `
          quotationId 
          quoteTitle 
          quoteNote 
          totalAmount 
          bookingStatus 
          albums
          packages.categoryName 
          packages.eventStartDate 
          packages.eventEndDate 
          packages.slot 
          packages.venueName
        `,
      }
    );

    if (!task) {
      // 🟢 Instead of 404, return success true with empty array
      return res.json({ success: true, data: [] });
    }

    // 🟢 Format quotation to only return selected fields
    const quotation = task.quotationId
      ? {
          _id: task.quotationId._id,
          quotationId: task.quotationId.quotationId,
          quoteTitle: task.quotationId.quoteTitle,
          quoteNote: task.quotationId.quoteNote,
          totalAmount: task.quotationId.totalAmount,
          bookingStatus: task.quotationId.bookingStatus,
          albums: task.quotationId.albums,
          packages: (task.quotationId.packages || []).map((pkg) => ({
            categoryName: pkg.categoryName,
            eventStartDate: pkg.eventStartDate,
            eventEndDate: pkg.eventEndDate,
            slot: pkg.slot,
            venueName: pkg.venueName,
          })),
        }
      : null;

    res.json({
      success: true,
      data: {
        ...task.toObject(),
        quotationId: quotation,
      },
    });
  } catch (err) {
    console.error("Error fetching task:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// exports.getSortedTaskByQuotation = async (req, res) => {
//   try {
//     const { quotationId } = req.params;

//     if (!quotationId) {
//       return res.status(400).json({
//         success: false,
//         message: "Quotation ID is required",
//       });
//     }

//     // Fetch tasks by quotationId where status is Completed
//     const tasks = await AssignedTask.find({
//       quotationId,
//       status: "Completed",
//     })
//       .populate({
//         path: "quotationId",
//         select: `
//           quotationId
//           quoteNote 
//           totalAmount 
//           bookingStatus 
//           albums
//         `,
//       })
//       .populate({
//         path: "collectedDataId",
//         select: `
//           personName
//           serviceUnits.packageName
//           serviceUnits.serviceName
//           serviceUnits.sortingStatus
//           serviceUnits.noOfPhotos
//           serviceUnits.noOfVideos
//         `,
//       })
//       .lean();

//     if (!tasks.length) {
//       return res.json({
//         success: true,
//         message: "No completed tasks found",
//         totalSortedPhotos: 0,
//         totalSortedVideos: 0,
//         data: [],
//       });
//     }

//     // Calculate totals
//     const totalSortedPhotos = tasks.reduce(
//       (sum, t) => sum + (t.submittedPhotos || 0),
//       0
//     );
//     const totalSortedVideos = tasks.reduce(
//       (sum, t) => sum + (t.submittedVideos || 0),
//       0
//     );

//     // Extract common data (same for all tasks)
//     const commonQuotationData = tasks[0]?.quotationId || null;
//     const commonCollectedData = tasks[0]?.collectedDataId || null;

//     // Remove duplicated data from individual tasks
//     const cleanedTasks = tasks.map((task) => {
//       const {
//         quotationId: taskQuotation,
//         collectedDataId: taskCollected,
//         ...taskData
//       } = task;
//       return taskData;
//     });

//     res.json({
//       success: true,
//       totalSortedPhotos,
//       totalSortedVideos,
//       quotation: commonQuotationData, // Moved outside data array
//       collectedData: commonCollectedData, // Moved outside data array
//       data: cleanedTasks, // Only task-specific data
//     });
//   } catch (err) {
//     console.error("Error fetching completed tasks:", err);
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: err.message,
//     });
//   }
// };


exports.getSortedTaskByQuotation = async (req, res) => {
  try {
    const { quotationId } = req.params;

    if (!quotationId) {
      return res.status(400).json({
        success: false,
        message: "Quotation ID is required",
      });
    }

    // Fetch tasks by quotationId where status is Completed
    const tasks = await AssignedTask.find({
      quotationId,
      status: "Completed",
    })
      .populate({
        path: "quotationId",
        select: `
          quotationId
          quoteNote 
          totalAmount 
          bookingStatus 
          albums
        `,
      })
      .populate({
        path: "collectedDataId",
        select: `
          personName
          serviceUnits.packageName
          serviceUnits.serviceName
          serviceUnits.sortingStatus
          serviceUnits.noOfPhotos
          serviceUnits.noOfVideos
        `,
      })
      .lean();

    if (!tasks.length) {
      return res.json({
        success: true,
        message: "No completed tasks found",
        totalSortedPhotos: 0,
        totalSortedVideos: 0,
        totalCollectedPhotos: 0,   // ✅ added
        totalCollectedVideos: 0,   // ✅ added
        quotation: null,
        collectedData: null,
        data: [],
      });
    }

    // ✅ totals from sorted tasks
    const totalSortedPhotos = tasks.reduce(
      (sum, t) => sum + (t.submittedPhotos || 0),
      0
    );
    const totalSortedVideos = tasks.reduce(
      (sum, t) => sum + (t.submittedVideos || 0),
      0
    );

    // Extract common data (same for all tasks)
    const commonQuotationData = tasks[0]?.quotationId || null;
    const commonCollectedData = tasks[0]?.collectedDataId || null;

    // ✅ totals from collectedData.serviceUnits
    const serviceUnits = commonCollectedData?.serviceUnits || [];
    const totalCollectedPhotos = serviceUnits.reduce(
      (sum, u) => sum + (Number(u.noOfPhotos) || 0),
      0
    );
    const totalCollectedVideos = serviceUnits.reduce(
      (sum, u) => sum + (Number(u.noOfVideos) || 0),
      0
    );

    // Remove duplicated data from individual tasks
    const cleanedTasks = tasks.map((task) => {
      const {
        quotationId: taskQuotation,
        collectedDataId: taskCollected,
        ...taskData
      } = task;
      return taskData;
    });

    return res.json({
      success: true,
      totalSortedPhotos,
      totalSortedVideos,
      totalCollectedPhotos, // ✅ added
      totalCollectedVideos, // ✅ added
      quotation: commonQuotationData,
      collectedData: commonCollectedData,
      data: cleanedTasks,
    });
  } catch (err) {
    console.error("Error fetching completed tasks:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};
