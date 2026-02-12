const router = require("express").Router();
const ctrl = require("../Controllers/paymentTracker.controller");

// 1) all payment tracks (filters + pagination)
router.get("/", ctrl.getAllPaymentTracks);

// 2) by quotation id (mongo ObjectId)
router.get("/quotation/:quotationId", ctrl.getPaymentTracksByQuotation);

// 3) by installment id (mongo ObjectId)
router.get("/installment/:installmentId", ctrl.getPaymentTracksByInstallment);

// 4) ONLY booked quotations + populate quotation + lead first person
router.get("/booked", ctrl.getBookedQuotationPaymentTracks);


module.exports = router;
