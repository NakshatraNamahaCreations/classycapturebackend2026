const express = require("express");
const router = express.Router();

const {
  createAdditionalService,
  getAdditionalServices,
  getAdditionalServiceById,
  updateAdditionalService,
  deleteAdditionalService,
} = require("../Controllers/additionalService.controller");

router.post("/", createAdditionalService);
router.get("/", getAdditionalServices);
router.get("/:id", getAdditionalServiceById);
router.put("/:id", updateAdditionalService);
router.delete("/:id", deleteAdditionalService);

module.exports = router;
