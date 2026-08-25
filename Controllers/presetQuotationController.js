const asyncHandler = require("express-async-handler");
const PresetQuotation = require("../models/presetQuotation");
const Service = require("../models/service");

// Create a new preset quotation
const createPresetQuotation = asyncHandler(async (req, res) => {
  const { category, services, totalAmount, totalMarginAmount } = req.body;

  if (
    !category ||
    !services ||
    services.length === 0 ||
    totalAmount == null ||
    totalMarginAmount == null
  ) {
    res.status(400);
    throw new Error(
      "Category, services, total amount, and total margin amount are required"
    );
  }

  // Validate service IDs
  const serviceIds = services.map((s) => s.id);
  const validServices = await Service.find({ _id: { $in: serviceIds } });
  if (validServices.length !== serviceIds.length) {
    res.status(400);
    throw new Error("One or more service IDs are invalid");
  }

  const presetQuotation = await PresetQuotation.create({
    category,
    services,
    totalAmount,
    totalMarginAmount,
  });

  res.status(201).json({ success: true, data: presetQuotation });
});

// Get all preset quotations
// Get all preset quotations with pagination and search
const getPresetQuotations = asyncHandler(async (req, res) => {
  let { page, limit, search = "" } = req.query;
  page = parseInt(page);
  limit = parseInt(limit);

  const query = {};
  if (search) {
    // Match the category or any service inside the preset, so searching a
    // service like "Traditional Photographer" finds the presets containing it.
    const regex = { $regex: search, $options: "i" };
    query.$or = [{ category: regex }, { "services.serviceName": regex }];
  }

  const total = await PresetQuotation.countDocuments(query);
  const presetQuotations = await PresetQuotation.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.status(200).json({
    success: true,
    count: presetQuotations.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: presetQuotations,
  });
});

// Get single preset quotation by ID
const getPresetQuotation = asyncHandler(async (req, res) => {
  const presetQuotation = await PresetQuotation.findById(req.params.id);
  if (!presetQuotation) {
    res.status(404);
    throw new Error("Preset quotation not found");
  }
  res.status(200).json({ success: true, data: presetQuotation });
});

// Update a preset quotation by ID
const updatePresetQuotation = asyncHandler(async (req, res) => {
  const { category, services, totalAmount, totalMarginAmount } = req.body;

  const updatedData = {};
  if (category) updatedData.category = category;
  if (services) {
    // Validate service IDs
    const serviceIds = services.map((s) => s.id);
    const validServices = await Service.find({ _id: { $in: serviceIds } });
    if (validServices.length !== serviceIds.length) {
      res.status(400);
      throw new Error("One or more service IDs are invalid");
    }
    updatedData.services = services;
  }
  if (totalAmount != null) updatedData.totalAmount = totalAmount;
  if (totalMarginAmount != null)
    updatedData.totalMarginAmount = totalMarginAmount;

  const presetQuotation = await PresetQuotation.findByIdAndUpdate(
    req.params.id,
    updatedData,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!presetQuotation) {
    res.status(404);
    throw new Error("Preset quotation not found");
  }

  res.status(200).json({ success: true, data: presetQuotation });
});
// Delete a preset quotation by ID
const deletePresetQuotation = asyncHandler(async (req, res) => {
  const presetQuotation = await PresetQuotation.findByIdAndDelete(
    req.params.id
  );
  if (!presetQuotation) {
    res.status(404);
    throw new Error("Preset quotation not found");
  }
  res
    .status(200)
    .json({ success: true, message: "Preset quotation deleted successfully" });
});

module.exports = {
  createPresetQuotation,
  getPresetQuotations,
  getPresetQuotation,
  updatePresetQuotation,
  deletePresetQuotation,
};
