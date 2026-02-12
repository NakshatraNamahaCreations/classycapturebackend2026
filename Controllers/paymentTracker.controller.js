const mongoose = require("mongoose");
const PaymentTracker = require("../models/paymentTracker.model");

const toObjectId = (v) =>
  mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null;

const buildDateMatch = (from, to) => {
  if (!from && !to) return null;
  const m = {};
  if (from) m.$gte = new Date(from);
  if (to) m.$lte = new Date(to);
  return m;
};

const buildPager = (page, limit) => {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(200, Math.max(1, Number(limit) || 50));
  const skip = (pageNum - 1) * limitNum;
  return { pageNum, limitNum, skip };
};

// ✅ common facet pipeline
const facetPaginate = (skip, limit) => [
  {
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      totalCount: [{ $count: "count" }],
    },
  },
  {
    $addFields: {
      total: { $ifNull: [{ $arrayElemAt: ["$totalCount.count", 0] }, 0] },
    },
  },
  {
    $project: {
      data: 1,
      total: 1,
    },
  },
];

// ======================================================
// GET /api/payment-tracker
// supports: from, to, page, limit, paymentMethod, q
// returns: populated quotationNo + lead first person + installmentNumber
// ======================================================
exports.getAllPaymentTracks = async (req, res) => {
  try {
    const { from, to, page = 1, limit = 50, paymentMethod, q } = req.query;

    const match = {};

    // date filter
    const dateMatch = buildDateMatch(from, to);
    if (dateMatch) match.paymentDate = dateMatch;

    // method filter
    if (paymentMethod && String(paymentMethod).trim()) {
      match.paymentMethod = String(paymentMethod).trim();
    }

    const { pageNum, limitNum, skip } = buildPager(page, limit);
    const search = String(q || "").trim();
    const isPhoneSearch = /^[0-9+ ]{6,}$/.test(search);

    // ✅ IMPORTANT:
    // We paginate FIRST (fast), then lookup ONLY for that page rows.
    const base = [
      { $match: match },
      { $sort: { paymentDate: -1, createdAt: -1, _id: -1 } },
      {
        $facet: {
          total: [{ $count: "count" }],
          data: [
            { $skip: skip },
            { $limit: limitNum },

            // ✅ lookup quotation by ObjectId
            {
              $lookup: {
                from: "quotations",
                localField: "quotationId", // ObjectId
                foreignField: "_id",
                as: "quotation",
              },
            },
            { $unwind: { path: "$quotation", preserveNullAndEmptyArrays: true } },

            // ✅ lookup lead by quotation.leadId
            {
              $lookup: {
                from: "leads",
                localField: "quotation.leadId",
                foreignField: "_id",
                as: "lead",
              },
            },
            { $unwind: { path: "$lead", preserveNullAndEmptyArrays: true } },

            // ✅ optional search (only applied on paginated rows → very fast)
            ...(search
              ? [
                  {
                    $match: isPhoneSearch
                      ? {
                          $or: [
                            { "lead.persons.0.phoneNo": { $regex: search, $options: "i" } },
                            { "lead.persons.0.whatsappNo": { $regex: search, $options: "i" } },
                          ],
                        }
                      : {
                          $or: [
                            { "quotation.quotationId": { $regex: search, $options: "i" } }, // "QN0028"
                            { "lead.persons.0.name": { $regex: search, $options: "i" } },
                            { "lead.persons.0.phoneNo": { $regex: search, $options: "i" } },
                            { "lead.persons.0.whatsappNo": { $regex: search, $options: "i" } },
                          ],
                        },
                  },
                ]
              : []),

            // ✅ compute installmentNumber from quotation.installments using installmentId
            {
              $addFields: {
                installmentNumber: {
                  $let: {
                    vars: {
                      inst: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$quotation.installments",
                              as: "i",
                              cond: { $eq: ["$$i._id", "$installmentId"] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: "$$inst.installmentNumber",
                  },
                },
              },
            },

            // ✅ final projection (small payload)
            {
              $project: {
                _id: 1,
                paidAmount: 1,
                paymentMethod: 1,
                paymentDate: 1,
                paidTo: 1,
                createdAt: 1,

                quotationId: 1,     // ObjectId (kept)
                installmentId: 1,   // ObjectId (kept)
                installmentNumber: 1,

                quotationNo: "$quotation.quotationId", // ✅ "QN0028"
                leadFirstPerson: {
                  $let: {
                    vars: { fp: { $arrayElemAt: ["$lead.persons", 0] } },
                    in: {
                      name: "$$fp.name",
                      phoneNo: "$$fp.phoneNo",
                      whatsappNo: "$$fp.whatsappNo",
                    },
                  },
                },
              },
            },
          ],
        },
      },
    ];

    const agg = await PaymentTracker.aggregate(base);

    const rows = agg?.[0]?.data || [];
    const total = agg?.[0]?.total?.[0]?.count || 0;

    return res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      data: rows,
    });
  } catch (err) {
    console.error("getAllPaymentTracks error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment tracks",
    });
  }
};



// ======================================================
// 2) GET /api/payment-tracker/quotation/:quotationId
// ======================================================
exports.getPaymentTracksByQuotation = async (req, res) => {
  try {
    const { quotationId } = req.params;

    if (!mongoose.isValidObjectId(quotationId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid quotationId" });
    }

    const qId = new mongoose.Types.ObjectId(quotationId);

    // optimized: aggregate + sum in DB
    const pipeline = [
      { $match: { quotationId: qId } },
      { $sort: { paymentDate: -1, createdAt: -1, _id: -1 } },
      {
        $facet: {
          data: [{ $match: {} }], // keep all
          summary: [
            {
              $group: {
                _id: null,
                totalPaid: { $sum: "$paidAmount" },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
      {
        $project: {
          data: 1,
          totalPaid: {
            $ifNull: [{ $arrayElemAt: ["$summary.totalPaid", 0] }, 0],
          },
          count: { $ifNull: [{ $arrayElemAt: ["$summary.count", 0] }, 0] },
        },
      },
    ];

    const agg = await PaymentTracker.aggregate(pipeline);
    const rows = agg?.[0]?.data || [];
    const totalPaid = agg?.[0]?.totalPaid || 0;
    const count = agg?.[0]?.count || 0;

    return res.status(200).json({
      success: true,
      totalPaid,
      count,
      data: rows,
    });
  } catch (error) {
    console.error("getPaymentTracksByQuotation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment tracks for quotation",
      error: error.message,
    });
  }
};

// ======================================================
// 3) GET /api/payment-tracker/installment/:installmentId
// ======================================================
exports.getPaymentTracksByInstallment = async (req, res) => {
  try {
    const { installmentId } = req.params;

    if (!mongoose.isValidObjectId(installmentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid installmentId" });
    }

    const iId = new mongoose.Types.ObjectId(installmentId);

    const pipeline = [
      { $match: { installmentId: iId } },
      { $sort: { paymentDate: -1, createdAt: -1, _id: -1 } },
      {
        $facet: {
          data: [{ $match: {} }],
          summary: [
            {
              $group: {
                _id: null,
                totalPaid: { $sum: "$paidAmount" },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
      {
        $project: {
          data: 1,
          totalPaid: {
            $ifNull: [{ $arrayElemAt: ["$summary.totalPaid", 0] }, 0],
          },
          count: { $ifNull: [{ $arrayElemAt: ["$summary.count", 0] }, 0] },
        },
      },
    ];

    const agg = await PaymentTracker.aggregate(pipeline);
    const rows = agg?.[0]?.data || [];
    const totalPaid = agg?.[0]?.totalPaid || 0;
    const count = agg?.[0]?.count || 0;

    return res.status(200).json({
      success: true,
      totalPaid,
      count,
      data: rows,
    });
  } catch (error) {
    console.error("getPaymentTracksByInstallment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment tracks for installment",
      error: error.message,
    });
  }
};

// ======================================================
// 4) GET /api/payment-tracker/booked
// Only payments whose Quotation.bookingStatus === "Booked"
// Also returns:
// quotationId (string QNxxxx), quoteTitle, quotation.leadId,
// lead.leadId (string CC-Custxxx), lead first person details
// ======================================================
exports.getBookedQuotationPaymentTracks = async (req, res) => {
  try {
    const {
      quotationId,
      installmentId,
      from,
      to,
      page = 1,
      limit = 50,
    } = req.query;

    const match = {};

    const qId = toObjectId(quotationId);
    if (qId) match.quotationId = qId;

    const iId = toObjectId(installmentId);
    if (iId) match.installmentId = iId;

    const dateMatch = buildDateMatch(from, to);
    if (dateMatch) match.paymentDate = dateMatch;

    const { pageNum, limitNum, skip } = buildPager(page, limit);

    const pipeline = [
      { $match: match },

      // join quotation
      {
        $lookup: {
          from: "quotations",
          localField: "quotationId",
          foreignField: "_id",
          as: "quotation",
        },
      },
      { $unwind: "$quotation" },

      // only booked
      { $match: { "quotation.bookingStatus": "Booked" } },

      // join lead
      {
        $lookup: {
          from: "leads",
          localField: "quotation.leadId",
          foreignField: "_id",
          as: "lead",
        },
      },
      { $unwind: { path: "$lead", preserveNullAndEmptyArrays: true } },

      { $sort: { paymentDate: -1, createdAt: -1, _id: -1 } },

      // send only needed fields (keeps response small)
      {
        $project: {
          _id: 1,
          quotationId: 1,
          installmentId: 1,
          paidAmount: 1,
          paymentMethod: 1,
          paymentDate: 1,
          paidTo: 1,
          createdAt: 1,

          quotationDetails: {
            _id: "$quotation._id",
            quotationId: "$quotation.quotationId",
            quoteTitle: "$quotation.quoteTitle",
            leadId: "$quotation.leadId",
            bookingStatus: "$quotation.bookingStatus",
          },

          leadDetails: {
            _id: "$lead._id",
            leadId: "$lead.leadId", // e.g., "CC-Cust001"
            firstPerson: {
              $let: {
                vars: { fp: { $arrayElemAt: ["$lead.persons", 0] } },
                in: {
                  name: "$$fp.name",
                  phoneNo: "$$fp.phoneNo",
                  whatsappNo: "$$fp.whatsappNo",
                  email: "$$fp.email",
                  instagramHandle: "$$fp.instagramHandle",
                },
              },
            },
          },
        },
      },

      ...facetPaginate(skip, limitNum),
    ];

    const agg = await PaymentTracker.aggregate(pipeline);
    const rows = agg?.[0]?.data || [];
    const total = agg?.[0]?.total || 0;

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      data: rows,
    });
  } catch (error) {
    console.error("getBookedQuotationPaymentTracks error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch booked quotation payment tracks",
      error: error.message,
    });
  }
};
