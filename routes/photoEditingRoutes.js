const express = require("express");
const router = express.Router();
const {
  assignPhotoEditingTask,
  submitPhotoEditingTask,
  getAllPhotoEditingTasks,
  getPhotoEditingTaskById,
  getPhotoEditingTasksByQuotation,
  countPendingPhotoEditingAssignments,
  listPendingPhotoEditingAssignments
} = require("../Controllers/photoEditingController");

// Assign new photo editing task
router.post("/assign", assignPhotoEditingTask);

// Submit a completed task
router.post("/:id/submit", submitPhotoEditingTask);

// Fetch all photo editing tasks
router.get("/", getAllPhotoEditingTasks);
// PHOTO
router.get("/pending/count", countPendingPhotoEditingAssignments);
router.get("/pending", listPendingPhotoEditingAssignments);

// Fetch tasks by quotation
router.get("/quotation/:quotationId", getPhotoEditingTasksByQuotation);

// Fetch single photo editing task
router.get("/:id", getPhotoEditingTaskById);

module.exports = router;
