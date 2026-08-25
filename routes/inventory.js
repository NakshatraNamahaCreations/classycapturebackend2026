const express = require('express');
const router = express.Router();
const inventoryController = require('../Controllers/inventory.controller');

// Cloudinary-backed upload (falls back to disk if not configured) — see utils/imageUpload.js
const { upload } = require('../utils/imageUpload');

router.post('/', upload.single('image'), inventoryController.createInventory);
router.get('/', inventoryController.getInventories);
router.delete('/:id', inventoryController.deleteInventory);
router.get('/maintenance', inventoryController.getMaintenanceRecords);
router.get('/maintenance/:id', inventoryController.getMaintenanceById);
router.patch('/maintenance/:id', inventoryController.updateMaintenance);
router.post('/maintenance', inventoryController.createMaintenance);

module.exports = router;