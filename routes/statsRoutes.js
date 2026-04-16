const express = require("express");

const {
  getFinanceStats,
  getBookedConversionRatio
} = require("../Controllers/stats.controller");

const router = express.Router();

router.get("/payments", getFinanceStats);
router.get("/leadconversion-ratio", getBookedConversionRatio);

module.exports = router;
