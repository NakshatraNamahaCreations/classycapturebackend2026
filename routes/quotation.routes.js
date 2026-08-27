const express = require("express");
const router = express.Router();
const {
  createQuotation,
  getQuotationByQueryId,
  getQuotationById,
  toggleFinalizedQuotation,
  deleteInstallment,
  updateQuotation,
  updateInstallmentStatus,
  generateInvoiceNumber,
  deleteQuotation,
  getFinalizedQuotationsPaginated,
  getQuotationsByStatus,
  getBookedEventsByDate,
  getBookedEventsForToday,
  addClientInstruction,
  deleteClientInstruction,

  assignVendorToServiceUnit,
  assignAssistantToServiceUnit,
  updateCalculation,
  recordPayment,
  updateBookingStatus,
  updateInstallmentFirstPayment,
  getAllBookings,
  getQuotaionByQueryId,
  countPendingPaymentQuotations,
  countTodaysEvents,
  countCompletedQuotations,
  countBookedQuotations,
  getYearlyClientPayments,
  getYearlyVendorPayments,
  updateGroupOrNote,
  updateAdditionalServices,
  deleteAdditionalServicebyId,
  getBookedQuotationsWithOnlyUnassignedServices,
  countBookedQuotationsWithUnassignedServices,
  getPendingAlbumsCount,
} = require("../Controllers/quotationController");

router.post("/create", createQuotation);
router.get("/by-query/:queryId", getQuotationByQueryId);
router.get("/finalized", getFinalizedQuotationsPaginated);
router.get("/booked-events-by-date/:date", getBookedEventsByDate);
router.get("/booked-events-today", getBookedEventsForToday);

router.get("/status/:status", getQuotationsByStatus);
router.get("/all-bookings", getAllBookings);
router.get("/booked-by-query/:queryId", getQuotaionByQueryId);

router.get(
  "/unassigned-services",
  getBookedQuotationsWithOnlyUnassignedServices,
);

router.get(
  "/unassigned-services/count",
  countBookedQuotationsWithUnassignedServices,
);

router.get("/:id", getQuotationById);
router.delete("/:id", deleteQuotation);
router.put("/:id", updateQuotation);
router.patch("/:id/finalize", toggleFinalizedQuotation);
router.post("/:id/generate-invoice", generateInvoiceNumber);
router.put("/:id/totals-min", updateCalculation);
router.put("/:id/booking-status", updateBookingStatus);
router.put("/:id/additional-services", updateAdditionalServices);

router.delete(
  "/:quotationId/additional-services/:serviceId",
  deleteAdditionalServicebyId,
);

router.put("/:quotationId/installment/:installmentId", updateInstallmentStatus);
// router.put("/:quotationId/installment/:installmentId/payment", recordPayment);
router.put(
  "/:quotationId/installments/:installmentId/first-payment",
  updateInstallmentFirstPayment,
);

// Vendor per unit
router.put(
  "/:quotationId/package/:packageId/service/:serviceId/unit/:unitIndex/assign-vendor",
  assignVendorToServiceUnit,
);
// Assistant per unit
router.put(
  "/:quotationId/package/:packageId/service/:serviceId/unit/:unitIndex/assign-assistant",
  assignAssistantToServiceUnit,
);

router.put("/:id/group-note", updateGroupOrNote);

router.delete("/:quotationId/installment/:installmentId", deleteInstallment);

router.put("/:quotationId/instruction/add", addClientInstruction);
router.delete("/:quotationId/instruction/delete", deleteClientInstruction);

router.get("/count/pending-payments", countPendingPaymentQuotations);
router.get("/count/todays-events", countTodaysEvents);
router.get("/count/completed", countCompletedQuotations);
router.get("/count/booked", countBookedQuotations);

router.get("/count/pending-albums", getPendingAlbumsCount);

router.get("/stats/client-payments", getYearlyClientPayments);
router.get("/stats/vendor-payments", getYearlyVendorPayments);

module.exports = router;
