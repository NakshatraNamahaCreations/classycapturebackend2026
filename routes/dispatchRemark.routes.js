const router = require("express").Router();
const ctrl = require("../Controllers/dispatchRemark.controller");

// create (or update if exists for same quotation)
router.post("/", ctrl.createOrUpdateDispatchRemark);

// edit by remark id
router.put("/:id", ctrl.updateDispatchRemarkById);

// get by quotation
router.get("/by-quotation/:quotationId", ctrl.getDispatchRemarkByQuotationId);

module.exports = router;
