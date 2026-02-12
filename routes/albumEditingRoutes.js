const express = require("express");
const router = express.Router();
const {
  assignAlbumEditingTask,
  getAlbumEditingTasksByQuotation,
  getAlbumEditingTask,
  getLatestAlbumTaskByAlbum,
  submitAlbumEditingTask
} = require("../Controllers/albumEditingController");

// POST assign
router.post("/assign", assignAlbumEditingTask);

// GET list tasks by quotation
router.get("/quotation/:quotationId", getAlbumEditingTasksByQuotation);

// GET one task
router.get("/:taskId", getAlbumEditingTask);

// GET latest by album (optional helper)
router.get("/album/:albumId/latest", getLatestAlbumTaskByAlbum);
router.put("/:taskId/submit", submitAlbumEditingTask);


module.exports = router;
