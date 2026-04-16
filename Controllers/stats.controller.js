const PaymentTracker = require("../models/paymentTracker.model");
const Query = require("../models/query.js");
// if otherExpense is ESM default export
const OtherExpenseModule = require("../models/otherExpense.js");
const OtherExpense = OtherExpenseModule.default || OtherExpenseModule;

const Quotation = require("../models/quotation.model");

const monthLabels = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec"
];

const safeInt = (v, fb) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};

exports.getFinanceStats = async (req, res) => {
  try {
    const now = new Date();

    const year = safeInt(req.query.year, now.getFullYear());
    const month = safeInt(req.query.month, now.getMonth() + 1);

    if (year < 1900) {
      return res.status(400).json({ success: false, message: "Invalid year" });
    }

    if (month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: "Invalid month (1-12)" });
    }

    // ==========================
    // 1️⃣ CLIENT TOTAL
    // ==========================
    const clientAggPromise = PaymentTracker.aggregate([
      {
        $match: {
          $expr: {
            $and: [
              { $eq: [{ $month: "$paymentDate" }, month] },
              { $eq: [{ $year: "$paymentDate" }, year] }
            ]
          }
        }
      },
      { $group: { _id: null, total: { $sum: "$paidAmount" } } }
    ]);

    // ==========================
    // 2️⃣ OTHER EXPENSE TOTAL
    // ==========================
    const otherAggPromise = OtherExpense.aggregate([
      {
        $match: {
          $expr: {
            $and: [
              { $eq: [{ $month: "$paymentDate" }, month] },
              { $eq: [{ $year: "$paymentDate" }, year] }
            ]
          }
        }
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    // ==========================
    // 3️⃣ VENDOR TOTAL (paymentDate only)
    // ==========================
    const vendorStatus = String(req.query.vendorStatus || "Completed");

   const vendorAggPromise = Quotation.aggregate([
  { $match: { bookingStatus: { $ne: "Not Booked" } } },

  { $unwind: "$packages" },
  { $unwind: "$packages.services" },
  { $unwind: "$packages.services.assignedVendors" },

  {
    $match: {
      "packages.services.assignedVendors.paymentStatus": vendorStatus,
      "packages.services.assignedVendors.paymentDate": { $type: "date" }
    }
  },

  {
    $addFields: {
      paymentYear: { $year: "$packages.services.assignedVendors.paymentDate" },
      paymentMonth: { $month: "$packages.services.assignedVendors.paymentDate" },
      vSalary: {
        $ifNull: ["$packages.services.assignedVendors.salary", 0]
      }
    }
  },

  {
    $match: {
      paymentYear: year,
      paymentMonth: month,
      vSalary: { $gt: 0 }
    }
  },

  {
    $group: {
      _id: null,
      total: { $sum: "$vSalary" }
    }
  }
]);

    const [clientAgg, otherAgg, vendorAgg] = await Promise.all([
      clientAggPromise,
      otherAggPromise,
      vendorAggPromise
    ]);

    const clientTotal = clientAgg?.[0]?.total || 0;
    const otherExpenseTotal = otherAgg?.[0]?.total || 0;
    const vendorTotal = vendorAgg?.[0]?.total || 0;

    const net = clientTotal - (vendorTotal + otherExpenseTotal);

    return res.json({
      success: true,
      month,
      year,
      label: `${monthLabels[month - 1]} ${year}`,
      clientTotal,
      vendorTotal,
      otherExpenseTotal,
      net
    });

  } catch (err) {
    console.error("getFinanceStats error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch finance stats",
      error: err?.message || "Server error"
    });
  }
};


exports.getBookedConversionRatio = async (req, res) => {
  try {
    const [total, booked] = await Promise.all([
      Query.countDocuments({}),
      Query.countDocuments({ status: "Booked" }),
    ]);

    const ratio = total > 0 ? Number(((booked / total) * 100).toFixed(2)) : 0;

    return res.json({
      success: true,
      totalQueries: total,
      bookedQueries: booked,
      bookedRatioPercent: ratio,
    });
  } catch (err) {
    console.error("getBookedConversionRatio error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch booked conversion ratio",
      error: err?.message || "Server error",
    });
  }
};
