const AdditionalService = require("../models/AdditionalService");

const createAdditionalService = async (req, res) => {
  try {
    const { name, price, description } = req.body;

    if (!name || !String(name).trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    }

    if (price === undefined || price === null || Number.isNaN(Number(price))) {
      return res
        .status(400)
        .json({ success: false, message: "Valid price is required" });
    }

    const doc = await AdditionalService.create({
      name: String(name).trim(),
      price: Number(price),
      description: description ? String(description).trim() : "",
    });

    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
const getAdditionalServices = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();

    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const isPagination =
      req.query.page !== undefined || req.query.limit !== undefined;

    let query = AdditionalService.find(filter).sort({ createdAt: -1 });

    let page = null;
    let limit = null;
    let total = null;
    let pages = null;

    if (isPagination) {
      page = Math.max(1, parseInt(req.query.page || "1", 10));
      limit = Math.max(1, parseInt(req.query.limit || "10", 10));

      total = await AdditionalService.countDocuments(filter);
      pages = Math.max(1, Math.ceil(total / limit));

      query = query.skip((page - 1) * limit).limit(limit);
    }

    const data = await query;

    return res.status(200).json({
      success: true,
      data,
      ...(isPagination && { page, pages, total, limit }),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


const getAdditionalServiceById = async (req, res) => {
  try {
    const doc = await AdditionalService.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    return res.status(200).json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const updateAdditionalService = async (req, res) => {
  try {
    const { name, price, description } = req.body;

    const update = {};

    if (name !== undefined) update.name = String(name).trim();

    if (price !== undefined) {
      if (Number.isNaN(Number(price))) {
        return res
          .status(400)
          .json({ success: false, message: "Price must be a number" });
      }
      update.price = Number(price);
    }

    if (description !== undefined)
      update.description = String(description).trim();

    const doc = await AdditionalService.findByIdAndUpdate(
      req.params.id,
      update,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!doc) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    return res.status(200).json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const deleteAdditionalService = async (req, res) => {
  try {
    const doc = await AdditionalService.findByIdAndDelete(req.params.id);

    if (!doc) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createAdditionalService,
  getAdditionalServices,
  getAdditionalServiceById,
  updateAdditionalService,
  deleteAdditionalService,
};
