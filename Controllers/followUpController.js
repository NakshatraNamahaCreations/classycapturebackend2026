// controllers/followUpController.js
const Quotation = require("../models/quotation.model");
const dayjs = require("dayjs");
const moment = require("moment");

// Get all bookings needing follow-up (15 days before earliest event when 1st installment not completed)
exports.getFollowUpQuotations = async (req, res) => {
  try {
    const today = moment().startOf("day");

    console.log("Fetching follow-up quotations..."); // Debug log

    // Get all booked quotations with event dates in the future
    const quotations = await Quotation.find({
      bookingStatus: "Booked",
      "packages.eventStartDate": { $exists: true, $ne: "" },
    })
      .populate({
        path: "leadId",
        select: "persons",
        options: { lean: true },
      })
      .lean();

    console.log(`Found ${quotations.length} booked quotations`); // Debug log

    // Filter quotations
    const pendingFollowUps = quotations.filter((quote) => {
      try {
        if (!quote.packages || quote.packages.length === 0) return false;

        // Find the earliest event date among all packages
        let earliestEventDate = null;
        for (const pkg of quote.packages) {
          const eventDate = moment(pkg.eventStartDate, "YYYY-MM-DD");
          if (!eventDate.isValid()) continue;

          if (!earliestEventDate || eventDate.isBefore(earliestEventDate)) {
            earliestEventDate = eventDate;
          }
        }

        if (!earliestEventDate) {
          console.log(
            `No valid event dates for quotation ${quote.quotationId}`,
          );
          return false;
        }

        const daysUntilEvent = earliestEventDate.diff(today, "days");

        // Check if we're within follow-up period (15 days before or overdue)
        if (daysUntilEvent <= 15) {
          const firstInstallment = quote.installments?.[0];
          if (!firstInstallment) {
            console.log(`No installments for quotation ${quote.quotationId}`);
            return true;
          }

          const isPending = firstInstallment.status !== "Completed";
          console.log(
            `Quotation ${quote.quotationId}: Days until event: ${daysUntilEvent}, Installment status: ${firstInstallment.status}, Pending: ${isPending}`,
          );
          return isPending;
        }
        return false;
      } catch (error) {
        console.error(
          `Error processing quotation ${quote.quotationId}:`,
          error,
        );
        return false;
      }
    });

    console.log(`Found ${pendingFollowUps.length} pending follow-ups`); // Debug log

    // Format response
    const calendarData = pendingFollowUps.map((quote) => {
      // Find earliest event date again for response formatting
      let earliestEventDate = null;
      for (const pkg of quote.packages) {
        const eventDate = moment(pkg.eventStartDate, "YYYY-MM-DD");
        if (
          !earliestEventDate ||
          (eventDate.isValid() && eventDate.isBefore(earliestEventDate))
        ) {
          earliestEventDate = eventDate;
        }
      }

      const followUpDate = earliestEventDate.clone().subtract(15, "days");
      const leadName = quote.leadId?.persons?.[0]?.name || "Unknown Lead";
      const firstPackage = quote.packages.find(
        (pkg) => pkg.eventStartDate === earliestEventDate.format("YYYY-MM-DD"),
      );

      return {
        quotationId: quote._id,
        quoteId: quote.quotationId,
        leadId: quote.leadId?._id || null,
        leadName: leadName,
        eventDate: earliestEventDate.format("YYYY-MM-DD"),
        eventType: firstPackage?.categoryName || "Unknown",
        followUpDate: followUpDate.format("YYYY-MM-DD"),
        isOverdue: followUpDate.isBefore(today, "day"),
        firstInstallment: quote.installments?.[0] || null,
        totalAmount: quote.totalAmount || 0,
        clientPhone: quote.leadId?.persons?.[0]?.phoneNo || null,
      };
    });

    res.json({
      success: true,
      data: calendarData,
    });
  } catch (error) {
    console.error("Error in getFollowUpQuotations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch follow-ups",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};


// Get count of pending follow-ups (for dashboard)
// exports.getFollowUpCount = async (req, res) => {
//   try {
//     const today = moment().startOf("day");
//     const lastDay = moment().add(15, "day").endOf("day");

//     const result = await Quotation.aggregate([
//       // ✅ only Booked quotations
//       {
//         $match: {
//           bookingStatus: "Booked",
//           "packages.eventStartDate": { $exists: true, $ne: "" },
//         },
//       },

//       // ✅ take only eventStartDate values
//       {
//         $project: {
//           installments: 1,
//           eventDates: {
//             $filter: {
//               input: "$packages.eventStartDate",
//               as: "d",
//               cond: { $and: [{ $ne: ["$$d", ""] }, { $ne: ["$$d", null] }] },
//             },
//           },
//         },
//       },

//       // ✅ find earliest event date (string compare works for YYYY-MM-DD)
//       {
//         $addFields: {
//           earliestEventDate: { $min: "$eventDates" },
//           firstInstallment: { $arrayElemAt: ["$installments", 0] },
//         },
//       },

//       // ✅ compute followUpDate = earliestEventDate - 15 days
//       {
//         $addFields: {
//           followUpDate: {
//             $dateSubtract: {
//               startDate: {
//                 $dateFromString: {
//                   dateString: "$earliestEventDate",
//                   format: "%Y-%m-%d",
//                 },
//               },
//               unit: "day",
//               amount: 15,
//             },
//           },
//         },
//       },

//       // ✅ count only if followUpDate is within today..15days AND first installment pending
//       {
//         $match: {
//           followUpDate: {
//             $gte: today.toDate(),
//             $lte: lastDay.toDate(),
//           },
//           $or: [
//             { firstInstallment: { $eq: null } },
//             { "firstInstallment.status": { $ne: "Completed" } },
//           ],
//         },
//       },

//       { $count: "count" },
//     ]);

//     const count = result?.[0]?.count || 0;

//     res.status(200).json({
//       success: true,
//       count,
//     });
//   } catch (error) {
//     console.error("Error in getFollowUpCount:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to get follow-up count",
//       error: process.env.NODE_ENV === "development" ? error.message : undefined,
//     });
//   }
// };

// Get count of bookings needing follow-up
// (15 days before earliest event OR overdue) AND 1st installment not completed
exports.getFollowUpCount = async (req, res) => {
  try {
    const today = moment().startOf("day");

    const quotations = await Quotation.find({
      bookingStatus: "Booked",
      "packages.eventStartDate": { $exists: true, $ne: "" },
    })
      .select("packages.eventStartDate installments quotationId") // light select
      .lean();

    const count = quotations.reduce((acc, quote) => {
      try {
        if (!quote?.packages?.length) return acc;

        // earliest event date
        let earliestEventDate = null;

        for (const pkg of quote.packages) {
          const eventDate = moment(pkg?.eventStartDate, "YYYY-MM-DD", true);
          if (!eventDate.isValid()) continue;

          if (!earliestEventDate || eventDate.isBefore(earliestEventDate)) {
            earliestEventDate = eventDate;
          }
        }

        if (!earliestEventDate) return acc;

        const daysUntilEvent = earliestEventDate.diff(today, "days");

        // same condition as your list API
        if (daysUntilEvent <= 15) {
          const firstInstallment = quote.installments?.[0];

          // if no installment => consider as pending follow-up (same as your code)
          if (!firstInstallment) return acc + 1;

          // not completed => pending follow-up
          if (firstInstallment.status !== "Completed") return acc + 1;
        }

        return acc;
      } catch (e) {
        return acc;
      }
    }, 0);

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Error in getFollowUpCount:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get follow-up count",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};


exports.getFollowUpsByDate = async (req, res) => {
  try {
    const requestedDateStr = req.params.date; // YYYY-MM-DD format
    const requestedDate = moment(requestedDateStr, "YYYY-MM-DD");

    if (!requestedDate.isValid()) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Please use YYYY-MM-DD",
      });
    }

    console.log(
      `Fetching follow-ups for date: ${requestedDate.format("YYYY-MM-DD")}`,
    );

    // Get all booked quotations with event dates
    const quotations = await Quotation.find({
      bookingStatus: "Booked",
      "packages.eventStartDate": { $exists: true, $ne: "" },
    })
      .populate({
        path: "leadId",
        select: "persons",
        options: { lean: true },
      })
      .populate("followUpHistory.contactedBy", "name")
      .lean();

    // Filter quotations for the specific follow-up date AND pending status
    const followUpsForDate = quotations.filter((quote) => {
      try {
        if (!quote.packages || quote.packages.length === 0) return false;

        // Find the earliest event date among all packages
        let earliestEventDate = null;
        for (const pkg of quote.packages) {
          const eventDate = moment(pkg.eventStartDate, "YYYY-MM-DD");
          if (!eventDate.isValid()) continue;

          if (!earliestEventDate || eventDate.isBefore(earliestEventDate)) {
            earliestEventDate = eventDate;
          }
        }

        if (!earliestEventDate) return false;

        // Calculate follow-up date (15 days before earliest event)
        const followUpDate = earliestEventDate
          .clone()
          .subtract(15, "days")
          .startOf("day");

        // Check if this matches the requested date AND has pending installments
        const isMatchingDate = followUpDate.isSame(requestedDate, "day");
        const firstInstallment = quote.installments?.[0];
        const isPending =
          !firstInstallment || firstInstallment.status !== "Completed";

        return isMatchingDate && isPending;
      } catch (error) {
        console.error(
          `Error processing quotation ${quote.quotationId}:`,
          error,
        );
        return false;
      }
    });

    // Format the response
    const responseData = followUpsForDate.map((quote) => {
      // Find earliest event date again for response formatting
      let earliestEventDate = null;
      for (const pkg of quote.packages) {
        const eventDate = moment(pkg.eventStartDate, "YYYY-MM-DD");
        if (
          !earliestEventDate ||
          (eventDate.isValid() && eventDate.isBefore(earliestEventDate))
        ) {
          earliestEventDate = eventDate;
        }
      }

      const followUpDate = earliestEventDate.clone().subtract(15, "days");
      const leadName = quote.leadId?.persons?.[0]?.name || "Unknown Lead";
      const firstPackage = quote.packages.find(
        (pkg) => pkg.eventStartDate === earliestEventDate.format("YYYY-MM-DD"),
      );
      const firstInstallment = quote.installments?.[0] || null;
      const isOverdue = requestedDate.isBefore(moment().startOf("day"));

      return {
        quotationId: quote._id,
        quoteId: quote.quotationId,
        leadId: quote.leadId?._id || null,
        leadName: leadName,
        eventDate: earliestEventDate.format("YYYY-MM-DD"),
        eventType: firstPackage?.categoryName || "Unknown",
        followUpDate: requestedDate.format("YYYY-MM-DD"),
        isOverdue: isOverdue,
        firstInstallment: firstInstallment
          ? {
              ...firstInstallment,
              pendingAmount:
                firstInstallment.paymentAmount -
                (firstInstallment.paidAmount || 0),
            }
          : null,
        totalAmount: quote.totalAmount || 0,
        clientPhone: quote.leadId?.persons?.[0]?.phoneNo || null,
        followUpHistory: quote.followUpHistory || [],
      };
    });

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Error in getFollowUpsByDate:", error);
  }
};

// PUT /api/follow-up/:quotationId/status
exports.updateFollowup = async (req, res) => {
  try {
    console.log("Request params:", req.params);
    console.log("Request body:", req.body);

    const { quotationId } = req.params;
    const { status, notes, contactedBy } = req.body;

    // Validate input
    if (!status || !contactedBy) {
      return res.status(400).json({
        success: false,
        message: "Status and contactedBy are required",
      });
    }

    const updatedQuotation = await Quotation.findOneAndUpdate(
      { _id: quotationId }, // Find by quotationId string
      {
        $push: {
          followUpHistory: {
            status,
            notes,
            contactedBy,
            date: new Date(),
          },
        },
      },
      { new: true },
    );

    if (!updatedQuotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    console.log("Updated quotation:", updatedQuotation);
    res.json({
      success: true,
      data: updatedQuotation,
    });
  } catch (error) {
    console.error("Error updating follow-up:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update status",
      error: error.message,
    });
  }
};
