const express = require("express");
const router = express.Router();
const {
  assignVideoEditingTask,
  submitVideoEditingTask,
  getAllVideoEditingTasks,
  getVideoEditingTaskById,
  getVideoEditingTasksByQuotation,
} = require("../Controllers/videoEditingController");

// Assign new video editing task
router.post("/assign", assignVideoEditingTask);

// Submit a completed video editing task
router.post("/:id/submit", submitVideoEditingTask);

// Fetch all video editing tasks
router.get("/", getAllVideoEditingTasks);

// Fetch tasks by quotation
router.get("/quotation/:quotationId", getVideoEditingTasksByQuotation);

// Fetch single video editing task
router.get("/:id", getVideoEditingTaskById);
module.exports = router;
