// routes/collectedDataRoutes.js
const express = require("express");
const router = express.Router();
const {
  addOrUpdateServiceUnitData,
  getCollectedDataByQuotation,
  updateServiceUnitEditingStatus,
  getCollectedDataList,
  getCollectedDataById,
  getServiceUnitById,
  getPendingEventsToCollect,
  getPendingEventsCount,
  countPendingServicesToSort,
  listPendingServicesToSort
} = require("../Controllers/collectedDataController");

// Create/Update a single service unit
router.post("/", addOrUpdateServiceUnitData);
router.get("/pending-events", getPendingEventsToCollect);
router.get("/pending-events/count", getPendingEventsCount);

router.get("/sorting/pending-services/count", countPendingServicesToSort);
router.get("/sorting/pending-services", listPendingServicesToSort);

// Body: { packageId, serviceId, unitIndex, status | newStatus }
router.put(
  "/:collectedDataId/service-unit/status",
  updateServiceUnitEditingStatus,
);

// List with pagination and search
router.get("/", getCollectedDataList);

// IMPORTANT: Put the more specific route BEFORE the param route to avoid conflicts
router.get("/details/:id", getCollectedDataById);
router.get("/:collectedId/service-unit/:unitId", getServiceUnitById);

// Fetch by quotationId
router.get("/:quotationId", getCollectedDataByQuotation);


module.exports = router;
