const router = require("express").Router();
const dc = require("../Controllers/deliverablesController");

router.post("/finalize/:quotationId", dc.finalizeDeliverablesOnBookingComplete);
router.get("/:quotationId", dc.getDeliverablesByQuotation);

module.exports = router;
