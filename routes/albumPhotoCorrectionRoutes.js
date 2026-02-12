const express = require("express");
const router = express.Router();

const {
  assignAlbumPhotoCorrectionTask,
  getLatestCorrectionTaskByAlbum,
  getCorrectionTasksByQuotation,
  submitAlbumPhotoCorrectionTask,
} = require("../Controllers/albumPhotoCorrectionController");

// Admin assigns
router.post("/assign", assignAlbumPhotoCorrectionTask);

// Fetch latest per album
router.get("/album/:albumId/latest", getLatestCorrectionTaskByAlbum);

// Fetch tasks by quotation (optional)
router.get("/quotation/:quotationId", getCorrectionTasksByQuotation);

// Vendor submits
router.post("/:taskId/submit", submitAlbumPhotoCorrectionTask);

module.exports = router;
