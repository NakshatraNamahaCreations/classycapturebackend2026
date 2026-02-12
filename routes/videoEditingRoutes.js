const express = require("express");
const router = express.Router();
const {
  assignVideoEditingTask,
  submitVideoEditingTask,
  getAllVideoEditingTasks,
  getVideoEditingTaskById,
  getVideoEditingTasksByQuotation,
  countPendingVideoEditingAssignments,
  listPendingVideoEditingAssignments
} = require("../Controllers/videoEditingController");

// Assign new video editing task
router.post("/assign", assignVideoEditingTask);

// Submit a completed video editing task
router.post("/:id/submit", submitVideoEditingTask);

// Fetch all video editing tasks
router.get("/", getAllVideoEditingTasks);
// VIDEO
router.get("/pending/count", countPendingVideoEditingAssignments);
router.get("/pending", listPendingVideoEditingAssignments);

// Fetch tasks by quotation
router.get("/quotation/:quotationId", getVideoEditingTasksByQuotation);

// Fetch single video editing task
router.get("/:id", getVideoEditingTaskById);
module.exports = router;
