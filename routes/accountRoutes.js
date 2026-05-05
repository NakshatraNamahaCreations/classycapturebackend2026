const express = require('express');
const router = express.Router();
const accountsController = require('../Controllers/accountsController.js');

router.post('/register', accountsController.registerAdmin);
router.post('/login', accountsController.loginAdmin);
router.get("/", accountsController.getAllAdmins);
router.get("/:id", accountsController.getAdminById);
router.put("/:id", accountsController.updateAdmin);
router.delete("/:id", accountsController.deleteAdmin);

router.patch("/:id/toggle-status", accountsController.toggleAdminStatus);

module.exports = router;