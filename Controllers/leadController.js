const Lead = require("../models/lead");
const Query = require("../models/query");
const Category = require("../models/category");
const mongoose = require("mongoose");
const moment = require("moment");
// Function to generate a new unique lead ID (CC-Cust001, CC-Cust002, etc.)
const generateLeadId = async () => {
  const lastLead = await Lead.findOne().sort({ _id: -1 }).limit(1); // Get the last created lead
  const lastLeadId = lastLead ? lastLead.leadId : "CC-Cust000";
  const leadNumber = parseInt(lastLeadId.split("-")[1].slice(4)) + 1;
  return `CC-Cust${String(leadNumber).padStart(3, "0")}`;
};

// Function to generate a new unique query ID (CC-Query001, CC-Query002, etc.)
async function generateQueryId() {
  const lastQuery = await Query.findOne().sort({ createdAt: -1 });
  let nextId = "CC-Query001";
  if (lastQuery) {
    const lastIdNum = parseInt(lastQuery.queryId.split("CC-Query")[1]) || 0;
    nextId = `CC-Query${String(lastIdNum + 1).padStart(3, "0")}`;
  }
  return nextId;
}

// Search Lead by Phone Number Prefix (first 3 digits)
exports.searchLeadByPhonePrefix = async (req, res) => {
  try {
    const { prefix } = req.query;
    if (!prefix || prefix.length < 3) {
      return res.status(400).json({ message: "Prefix (3 digits) is required" });
    }

    const regex = new RegExp(`^${prefix}`, "i");
    const leads = await Lead.find({ "persons.phoneNo": { $regex: regex } })
      .populate("queries")
      .lean();

    if (!leads || leads.length === 0) {
      return res
        .status(404)
        .json({ message: "No leads found with this phone number prefix" });
    }

    const suggestions = leads.flatMap((lead) =>
      lead.persons.map((person) => person.phoneNo)
    );
    res.status(200).json(suggestions);
  } catch (err) {
    console.error("Error in searchLeadByPhonePrefix:", err);
    res
      .status(500)
      .json({ message: "Error fetching lead suggestions", error: err.message });
  }
};

// Create or Update Lead (Create New Lead Only with Initial Query)
exports.createOrUpdateLead = async (req, res) => {
  try {
    const { persons, eventDetails, referenceForm, createdDate } = req.body;

    // Validate input data
    if (!persons || !Array.isArray(persons) || persons.length === 0) {
      return res
        .status(400)
        .json({ message: "Persons array is required and cannot be empty" });
    }

    if (
      !eventDetails ||
      !Array.isArray(eventDetails) ||
      eventDetails.length === 0
    ) {
      return res.status(400).json({ message: "Event details are required" });
    }

    if (!referenceForm) {
      return res.status(400).json({ message: "Reference form is required" });
    }

    // Validate persons data
    for (const person of persons) {
      if (!person.name || !person.phoneNo) {
        return res
          .status(400)
          .json({ message: "Each person must have name, phoneNo, and email" });
      }
    }

    // A customer can have several events over time, so an existing phone
    // number is not an error — the new query belongs on the lead that already
    // holds that person, rather than creating a second customer record.
    const existingLead = await Lead.findOne({
      "persons.phoneNo": { $in: persons.map((p) => p.phoneNo) },
    });

    if (existingLead) {
      const followUpQuery = new Query({
        eventDetails: eventDetails.map((event) => ({
          category: event.category,
          eventStartDate: new Date(event.eventStartDate),
          eventEndDate: new Date(event.eventEndDate),
        })),
        queryId: await generateQueryId(),
        status: "Created",
      });
      await followUpQuery.save();

      // add anyone genuinely new; skip people already on the lead
      const knownPhones = existingLead.persons.map((p) => p.phoneNo);
      const newPeople = persons.filter((p) => !knownPhones.includes(p.phoneNo));
      if (newPeople.length) existingLead.persons.push(...newPeople);

      existingLead.queries.push(followUpQuery._id);
      await existingLead.save();

      const populated = await Lead.findById(existingLead._id)
        .populate("queries")
        .lean();

      return res.status(201).json({
        message: "New query added to the existing customer",
        lead: populated,
        query: followUpQuery,
        attachedToExistingLead: true,
      });
    }

    // Generate a new lead ID
    const leadId = await generateLeadId();

    // Create a new query document with eventDetails
    const queryDoc = new Query({
      eventDetails: eventDetails.map((event) => ({
        category: event.category,
        eventStartDate: new Date(event.eventStartDate),
        eventEndDate: new Date(event.eventEndDate),
      })),
      queryId: await generateQueryId(), // Assign a unique query ID
      status: "Created", // ✅ set status here
    });
    await queryDoc.save();

    // Create the new lead with the initial query
    const lead = new Lead({
      leadId,
      persons,
      referenceForm,
      createdAt: createdDate ? new Date(createdDate) : new Date(),
      queries: [queryDoc._id], // Associate the new query with the lead
    });

    await lead.save();

    // Populate the lead with the query details
    const populatedLead = await Lead.findById(lead._id)
      .populate("queries")
      .lean();

    return res.status(201).json({
      message: "Lead created successfully with initial query",
      lead: populatedLead,
    });
  } catch (err) {
    console.error("Error creating lead:", err);
    res
      .status(500)
      .json({ message: "Error creating lead", error: err.message });
  }
};

exports.addQueryAndPerson = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { persons, eventDetails } = req.body;

    // ✅ Persons are optional → filter only valid entries
    const personsToAdd = Array.isArray(persons)
      ? persons.filter((p) => p.name && p.phoneNo)
      : [];

    if (
      !eventDetails ||
      !Array.isArray(eventDetails) ||
      eventDetails.length === 0
    ) {
      return res.status(400).json({ message: "Event details are required" });
    }

    // Find the existing lead
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // Adding another query for someone already on this lead is normal, so a
    // person who is already here is simply skipped instead of rejected.
    const knownPhones = lead.persons.map((p) => p.phoneNo);
    const newPeople = personsToAdd.filter(
      (p) => !knownPhones.includes(p.phoneNo)
    );

    // Generate a new queryId
    const queryId = await generateQueryId(); // Ensure this function exists

    // Create a new query document
    const query = new Query({
      queryId,
      eventDetails: eventDetails.map((event) => ({
        category: event.category,
        eventStartDate: new Date(event.eventStartDate),
        eventEndDate: new Date(event.eventEndDate),
      })),
      status: "Created",
    });
    await query.save();

    // ✅ Only add persons if provided
    if (newPeople.length > 0) {
      lead.persons.push(...newPeople);
    }

    // Add the new query to the lead
    lead.queries.push(query._id);

    // Save the updated lead
    await lead.save();

    // Populate for response
    const populatedLead = await Lead.findById(lead._id)
      .populate("queries")
      .lean();

    return res.status(200).json({
      message: `Query added successfully${
        newPeople.length > 0 ? " with new persons" : ""
      }`,
      lead: populatedLead,
    });
  } catch (err) {
    console.error("Error adding query and persons:", err);
    res.status(500).json({
      message: "Error adding query and persons",
      error: err.message,
    });
  }
};

// Fetch All Leads
exports.getAllLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    // Search filter on name or phone number of first person
    const filter = search
      ? {
          $or: [
            { "persons.name": { $regex: search, $options: "i" } },
            { "persons.phoneNo": { $regex: search, $options: "i" } },
            { leadId: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const total = await Lead.countDocuments(filter);
    const leads = await Lead.find(filter)
      // .populate("queries")
      .sort({ createdAt: 1 }) // oldest first, so page 1 starts at customer 1
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: leads,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalCount: total,
    });
  } catch (err) {
    console.error("Error fetching leads:", err);
    res
      .status(500)
      .json({ message: "Error fetching leads", error: err.message });
  }
};

// GET /api/lead/paginated?page=1&limit=10&search=...
// exports.getAllQueriesPaginated = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page);
//     const limit = parseInt(req.query.limit);
//     const search = req.query.search || "";
//     const skip = (page - 1) * limit;

//     const searchRegex = new RegExp(search, "i");

//     // Aggregate pipeline
//     const pipeline = [
//       { $unwind: "$queries" },
//       {
//         $lookup: {
//           from: "queries",
//           localField: "queries",
//           foreignField: "_id",
//           as: "query",
//         },
//       },
//       { $unwind: "$query" },
//       // Move $match here so it works on the correct fields
//       ...(search
//         ? [
//             {
//               $match: {
//                 $or: [
//                   { "persons.name": { $regex: searchRegex } },
//                   { "persons.phoneNo": { $regex: searchRegex } },
//                   { "query.queryId": { $regex: searchRegex } },
//                 ],
//               },
//             },
//           ]
//         : []),
//       {
//         $project: {
//           leadId: "$_id",
//           leadName: { $arrayElemAt: ["$persons.name", 0] },
//           leadPhone: { $arrayElemAt: ["$persons.phoneNo", 0] },
//           query: 1,
//         },
//       },
//       { $sort: { "query.createdAt": -1 } },
//       { $skip: skip },
//       { $limit: limit },
//     ];

//     // For total count
//     const countPipeline = pipeline
//       .filter((stage) => !("$skip" in stage) && !("$limit" in stage))
//       .concat([{ $count: "total" }]);

//     const [results, totalResult] = await Promise.all([
//       Lead.aggregate(pipeline),
//       Lead.aggregate(countPipeline),
//     ]);
//     const total = totalResult[0]?.total || 0;

//     res.status(200).json({
//       success: true,
//       data: results,
//       currentPage: page,
//       totalPages: Math.ceil(total / limit),
//       totalCount: total,
//     });
//   } catch (err) {
//     console.error("Error fetching queries:", err);
//     res
//       .status(500)
//       .json({ message: "Error fetching queries", error: err.message });
//   }
// };

// GET /api/lead/paginated?page=1&limit=10&search=&status=&eventCategory=
exports.getAllQueriesPaginated = async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const search = req.query.search || "";
    const status = req.query.status || "";
    const eventCategory = req.query.eventCategory || "";
    const skip = (page - 1) * limit;

    const searchRegex = new RegExp(search, "i");

    // Common match filters
    const matchConditions = [];
    if (search) {
      matchConditions.push({
        $or: [
          { "persons.name": { $regex: searchRegex } },
          { "persons.phoneNo": { $regex: searchRegex } },
          { "query.queryId": { $regex: searchRegex } },
        ],
      });
    }
    if (status) {
      matchConditions.push({
        "query.status": { $regex: status, $options: "i" },
      });
    }
    if (eventCategory) {
      matchConditions.push({
        "query.eventDetails.category": { $regex: eventCategory, $options: "i" },
      });
    }

    // Aggregate pipeline
    const pipeline = [
      { $unwind: "$queries" },
      {
        $lookup: {
          from: "queries",
          localField: "queries",
          foreignField: "_id",
          as: "query",
        },
      },
      { $unwind: "$query" },

      ...(matchConditions.length > 0
        ? [{ $match: { $and: matchConditions } }]
        : []),

      {
        $project: {
          leadId: "$_id",
          leadName: { $arrayElemAt: ["$persons.name", 0] },
          leadPhone: { $arrayElemAt: ["$persons.phoneNo", 0] },
          query: 1,
        },
      },
      { $sort: { "query.createdAt": -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    // For total count (without skip/limit)
    const countPipeline = pipeline
      .filter((stage) => !("$skip" in stage) && !("$limit" in stage))
      .concat([{ $count: "total" }]);

    const [results, totalResult] = await Promise.all([
      Lead.aggregate(pipeline),
      Lead.aggregate(countPipeline),
    ]);

    const total = totalResult[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: results,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalCount: total,
    });
  } catch (err) {
    console.error("Error fetching queries:", err);
    res
      .status(500)
      .json({ message: "Error fetching queries", error: err.message });
  }
};

// Search Lead by Phone Number
exports.searchLeadByPhoneNo = async (req, res) => {
  try {
    const { phoneNo } = req.query;
    if (!phoneNo) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const leads = await Lead.find({ "persons.phoneNo": phoneNo })
      .populate("queries")
      .lean();

    if (!leads || leads.length === 0) {
      return res
        .status(404)
        .json({ message: "No lead found with this phone number" });
    }

    res.status(200).json(leads);
  } catch (err) {
    console.error("Error in searchLeadByPhoneNo:", err);
    res
      .status(500)
      .json({ message: "Error fetching lead", error: err.message });
  }
};

// controller/leadController.js
exports.getLeadWithSpecificQuery = async (req, res) => {
  try {
    const { leadId, queryId } = req.params;

    const lead = await Lead.findById(leadId).lean();
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const queryObj = lead.queries.find((q) => q.toString() === queryId);
    if (!queryObj)
      return res.status(404).json({ message: "Query not found for this lead" });

    const fullQuery = await Query.findById(queryId).lean();
    if (!fullQuery) return res.status(404).json({ message: "Query not found" });

    return res.status(200).json({
      success: true,
      data: {
        lead,
        query: fullQuery,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getLeadQueryDetails = async (req, res) => {
  try {
    const { leadId, queryId } = req.params;

    console.log("GET LEAD QUERY DETAILS:");
    console.log("leadId:", leadId);
    console.log("queryId:", queryId);

    if (
      !mongoose.Types.ObjectId.isValid(leadId) ||
      !mongoose.Types.ObjectId.isValid(queryId)
    ) {
      return res.status(400).json({ message: "Invalid leadId or queryId" });
    }

    const lead = await Lead.findById(leadId).lean();
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const isLinked = lead.queries.some((q) => q.toString() === queryId);
    if (!isLinked)
      return res
        .status(404)
        .json({ message: "Query not associated with this lead" });

    const query = await Query.findById(queryId).lean();
    if (!query) return res.status(404).json({ message: "Query not found" });

    // Attach query details directly to lead
    lead.queryDetails = query;

    return res.json({ lead });
  } catch (err) {
    console.error("Error in getLeadQueryDetails:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.updateLeadQueryDetails = async (req, res) => {
  try {
    const { leadId, queryId } = req.params;
    const { newPersons, updatedEventDetails, newEventDetails } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(leadId) ||
      !mongoose.Types.ObjectId.isValid(queryId)
    ) {
      return res.status(400).json({ message: "Invalid leadId or queryId" });
    }

    // 1. Update Lead -> only append new persons
    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    if (Array.isArray(newPersons)) {
      lead.persons.push(...newPersons);
    }

    // 2. Ensure query is linked to the lead
    const isLinked = lead.queries.some((qId) => qId.toString() === queryId);
    if (!isLinked)
      return res
        .status(404)
        .json({ message: "Query not associated with this lead" });

    // 3. Fetch the Query document
    const query = await Query.findById(queryId);
    if (!query) return res.status(404).json({ message: "Query not found" });

    // 4. Update existing event details by matching _id
    if (Array.isArray(updatedEventDetails)) {
      query.eventDetails = query.eventDetails.map((existing) => {
        const updated = updatedEventDetails.find(
          (u) => u._id?.toString() === existing._id.toString()
        );
        return updated
          ? {
              ...existing.toObject(),
              eventStartDate: updated.eventStartDate,
              eventEndDate: updated.eventEndDate,
            }
          : existing;
      });
    }

    // 5. Append new event details
    if (Array.isArray(newEventDetails)) {
      query.eventDetails.push(...newEventDetails);
    }

    // 6. Save both
    await lead.save();
    await query.save();

    res.json({ success: true, message: "Lead and Query updated successfully" });
  } catch (err) {
    console.error("Error in updateLeadQueryDetails:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Update Query Status by ID
// exports.updateQueryStatus = async (req, res) => {
//   try {
//     const { status, comment, callRescheduledDate } = req.body;
//     const updateFields = { status };

//     // If status is "Call Later", ensure comment and callRescheduledDate are included
//     if (
//       status === "Call Later" &&
//       comment !== "" &&
//       callRescheduledDate !== ""
//     ) {
//       updateFields.comment = comment;
//       updateFields.callRescheduledDate = callRescheduledDate;
//     } else {
//       // If status is not "Call Later", reset comment and callRescheduledDate
//       updateFields.comment = "";
//       updateFields.callRescheduledDate = "";
//     }

//     const query = await Query.findByIdAndUpdate(
//       req.params.queryId,
//       updateFields,
//       { new: true }
//     );

//     if (!query) return res.status(404).json({ message: "Query not found" });

//     res.json({ success: true, data: query });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

exports.updateQueryStatus = async (req, res) => {
  try {
    const { status, comment, callRescheduledDate, calledBy, calledTo } =
      req.body;

    // Prepare update fields for main status
    const updateFields = { status };

    // If status is "Call Later", update comment and callRescheduledDate
    if (
      status === "Call Later" &&
      comment !== "" &&
      callRescheduledDate !== ""
    ) {
      updateFields.comment = comment;
      updateFields.callRescheduledDate = callRescheduledDate;
    } else {
      // If status is not "Call Later", reset comment and callRescheduledDate
      updateFields.comment = "";
      updateFields.callRescheduledDate = "";
    }

    // Update main status and fields
    const query = await Query.findByIdAndUpdate(
      req.params.queryId,
      updateFields,
      { new: true }
    );

    if (!query) return res.status(404).json({ message: "Query not found" });

    // Add call history entry
    query.callHistory.push({
      calledBy: calledBy || "Unknown",
      calledTo: calledTo || "Unknown",
      callDate: new Date(),
      remarks: comment || "",
      rescheduledDate:
        status === "Call Later" ? callRescheduledDate : undefined,
    });

    await query.save();

    res.json({ success: true, data: query });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getCreatedQueriesCount = async (req, res) => {
  try {
    const { status } = req.query;
    // Use countDocuments to get the number of matching documents
    const count = await Query.countDocuments({ status: status });

    // Send the count as a JSON response
    res.status(200).json({
      success: true,
      count: count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error: Could not retrieve query count",
      error: error.message,
    });
  }
};

exports.getQueryWithStatus = async (req, res) => {
  try {
    const { status } = req.params; // Retrieve 'status' from the query parameters

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    // Fetch queries based on the status
    const queries = await Query.find({
      status: { $regex: status, $options: "i" },
    })
      .sort({ createdAt: -1 }) // Optional: Sort by creation date (newest first)
      .lean();

    // Check if any queries were found
    if (!queries || queries.length === 0) {
      return res
        .status(404)
        .json({ message: `No queries found with status: ${status}` });
    }

    // Return the queries
    res
      .status(200)
      .json({ success: true, data: queries, count: queries.length });
  } catch (err) {
    console.error("Error fetching queries by status:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Fetch queries with status "Call Later" and matching event date
exports.getCallLaterQueriesbyDate = async (req, res) => {
  try {
    const { date } = req.query;

    // Validate date
    if (!date) {
      return res.status(400).json({ message: "Date parameter is required" });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate)) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const startOfDay = new Date(parsedDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(parsedDate.setHours(23, 59, 59, 999));

    // Find leads whose queries contain callRescheduledDate within the day
    const leads = await Lead.find({
      queries: { $exists: true, $ne: [] }, // Ensure there are queries
    }).populate({
      path: "queries",
      match: {
        callRescheduledDate: { $gte: startOfDay, $lt: endOfDay },
      },
      select: "queryId status comment callRescheduledDate eventDetails", // Only fields you need
    });

    // Flatten the results: only keep queries that matched
    const result = [];

    leads.forEach((lead) => {
      if (lead.queries && lead.queries.length > 0) {
        lead.queries.forEach((query) => {
          result.push({
            _id: query._id,
            queryId: query.queryId,
            status: query.status,
            comment: query.comment,
            callRescheduledDate: query.callRescheduledDate,
            eventDetails: query.eventDetails,
            leadId: lead.leadId,
            persons: lead.persons,
          });
        });
      }
    });

    if (result.length === 0) {
      return res
        .status(404)
        .json({ message: "No queries found for this date" });
    }

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Error fetching queries:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Alternative API using aggregation for better performance
// exports.getQueriesbyEventstartDate = async (req, res) => {
//   try {
//     const { startDate } = req.params;
//     const targetDate = new Date(startDate);

//     if (isNaN(targetDate.getTime())) {
//       return res.status(400).json({
//         error: 'Invalid date format. Please use YYYY-MM-DD format.'
//       });
//     }

//     const startOfDay = new Date(targetDate);
//     startOfDay.setHours(0, 0, 0, 0);

//     const endOfDay = new Date(targetDate);
//     endOfDay.setHours(23, 59, 59, 999);

//     const leads = await Lead.aggregate([
//       {
//         $lookup: {
//           from: 'queries', // Make sure this matches your collection name
//           localField: 'queries',
//           foreignField: '_id',
//           as: 'queries'
//         }
//       },
//       {
//         $unwind: '$queries'
//       },
//       {
//         $match: {
//           'queries.eventDetails.eventStartDate': {
//             $gte: startOfDay,
//             $lte: endOfDay
//           }
//         }
//       },
//       {
//         $group: {
//           _id: '$_id',
//           leadId: { $first: '$leadId' },
//           persons: { $first: '$persons' },
//           referenceForm: { $first: '$referenceForm' },
//           createdAt: { $first: '$createdAt' },
//           queries: { $push: '$queries' }
//         }
//       },
//       {
//         $project: {
//           _id: 1,
//           leadId: 1,
//           persons: 1,
//           referenceForm: 1,
//           createdAt: 1,
//           queries: {
//             $filter: {
//               input: '$queries',
//               as: 'query',
//               cond: {
//                 $and: [
//                   { $gte: ['$$query.eventDetails.eventStartDate', startOfDay] },
//                   { $lte: ['$$query.eventDetails.eventStartDate', endOfDay] }
//                 ]
//               }
//             }
//           }
//         }
//       }
//     ]);

//     res.json({
//       success: true,
//       count: leads.length,
//       leads: leads
//     });

//   } catch (error) {
//     console.error('Error fetching leads by event date:', error);
//     res.status(500).json({
//       error: 'Internal server error',
//       message: error.message
//     });
//   }
// };

exports.getQueriesbyEventstartDate = async (req, res) => {
  try {
    const { startDate } = req.params;
    const targetDate = new Date(startDate);

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        error: "Invalid date format. Please use YYYY-MM-DD format.",
      });
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const leads = await Lead.aggregate([
      // Join queries
      {
        $lookup: {
          from: "queries",
          localField: "queries",
          foreignField: "_id",
          as: "queries",
        },
      },
      // Filter queries: keep only those that have events in the given date range
      {
        $addFields: {
          queries: {
            $filter: {
              input: "$queries",
              as: "q",
              cond: {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: "$$q.eventDetails",
                        as: "ev",
                        cond: {
                          $and: [
                            { $gte: ["$$ev.eventStartDate", startOfDay] },
                            { $lte: ["$$ev.eventStartDate", endOfDay] },
                          ],
                        },
                      },
                    },
                  },
                  0,
                ],
              },
            },
          },
        },
      },
      // Now filter eventDetails inside each query
      {
        $addFields: {
          queries: {
            $map: {
              input: "$queries",
              as: "q",
              in: {
                queryId: "$$q.queryId",
                status: "$$q.status",
                comment: "$$q.comment",
                callRescheduledDate: "$$q.callRescheduledDate",
                createdAt: "$$q.createdAt",
                updatedAt: "$$q.updatedAt",
                eventDetails: {
                  $filter: {
                    input: "$$q.eventDetails",
                    as: "ev",
                    cond: {
                      $and: [
                        { $gte: ["$$ev.eventStartDate", startOfDay] },
                        { $lte: ["$$ev.eventStartDate", endOfDay] },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
      // Only keep leads with non-empty queries
      { $match: { "queries.0": { $exists: true } } },
      // Project fields
      {
        $project: {
          leadId: 1,
          persons: 1,
          referenceForm: 1,
          createdAt: 1,
          updatedAt: 1,
          queries: 1,
        },
      },
    ]);

    res.json({
      success: true,
      count: leads.length,
      leads,
    });
  } catch (error) {
    console.error("Error fetching leads by event date:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};


exports.updatePersonDetails = async (req, res) => {
  try {
    const { leadId, personId } = req.params;
    const { instagramHandle, email, profession } = req.body;

    // Validate: at least one field must be non-empty
    if (
      (!instagramHandle || !instagramHandle.trim()) &&
      (!email || !email.trim()) &&
      (!profession || !profession.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one: Instagram handle, email, or profession",
      });
    }

    // Validate that leadId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID format",
      });
    }

    // Find the lead by _id
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // Find the person in the lead
    const person = lead.persons.id(personId);
    if (!person) {
      return res.status(404).json({
        success: false,
        message: "Person not found in this lead",
      });
    }

    // Update the fields if provided
    if (instagramHandle !== undefined) person.instagramHandle = instagramHandle;
    if (email !== undefined) person.email = email;
    if (profession !== undefined) person.profession = profession;

    // Save the changes
    await lead.save();

    res.json({
      success: true,
      message: "Person details updated successfully",
      data: {
        lead: {
          _id: lead._id,
          leadId: lead.leadId,
        },
        person: {
          _id: person._id,
          name: person.name,
          instagramHandle: person.instagramHandle,
          email: person.email,
          profession: person.profession,
        },
      },
    });
  } catch (error) {
    console.error("Error updating person details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update person details",
      error: error.message,
    });
  }
};

exports.getTodayRescheduledCalls = async (req, res) => {
  try {
    // Use server-local "today" boundaries: [startOfToday, startOfTomorrow)
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const startOfTomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

    const results = await Query.find({
      callRescheduledDate: { $gte: startOfToday, $lt: startOfTomorrow },
    })
      .select("queryId eventDetails status comment callRescheduledDate")
      .sort({ callRescheduledDate: 1 });

    res.json({
      success: true,
      count: results.length,
    });
  } catch (err) {
    console.error("getTodayRescheduledCalls error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch today's rescheduled calls",
      error: err.message,
    });
  }
};
