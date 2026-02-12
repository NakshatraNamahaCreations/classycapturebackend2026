const mongoose = require("mongoose");
const Quotation = require("../models/quotation.model");
const CollectedData = require("../models/collectedData");
const EventCollectionStatus = require("../models/eventCollectionStatus");
const { getRequiredUnitsForPackage } = require("../utils/collectionTrack");

exports.syncEventStatusForPackage = async ({ quotationId, packageId }) => {
  try {
    const q = await Quotation.findById(quotationId).lean();
    if (!q) return;

    const pkg = (q.packages || []).find(p => String(p._id) === String(packageId));
    if (!pkg) return;

    const required = getRequiredUnitsForPackage(q, packageId);

    // distinct (serviceId, unitIndex) count for that package
    const agg = await CollectedData.aggregate([
      { $match: { quotationId: new mongoose.Types.ObjectId(quotationId) } },
      { $unwind: "$serviceUnits" },
      { $match: { "serviceUnits.packageId": new mongoose.Types.ObjectId(packageId) } },
      { $group: { _id: { s: "$serviceUnits.serviceId", i: "$serviceUnits.unitIndex" } } },
      { $count: "cnt" },
    ]);

    const collected = agg[0]?.cnt || 0;

    let status = "Pending";
    if (collected === 0) status = "Pending";
    else if (collected < required) status = "Partial";
    else status = "Completed";

    const eventEndDateObj = pkg.eventEndDate ? new Date(pkg.eventEndDate) : null;

    await EventCollectionStatus.updateOne(
      { quotationId, packageId },
      {
        $set: {
          quotationId,
          quotationUniqueId: q.quotationId,
          packageId,
          packageName: pkg.categoryName || pkg.venueName || "",
          eventEndDateObj,
          requiredUnitsCount: required,
          collectedUnitsCount: collected,
          status,
          collectionLastUpdatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  } catch (e) {
    // keep silent or log
    console.log("err", e)
  }
};
