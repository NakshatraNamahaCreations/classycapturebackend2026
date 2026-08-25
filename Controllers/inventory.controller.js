const Inventory = require("../models/inventory.model");
const Maintenance = require("../models/maintenance.model");
const { saveImage } = require("../utils/imageUpload");

exports.createInventory = async (req, res) => {
  try {
    const {
      equipmentName,
      sensor,
      category,
      model,
      quantity,
      processor,
      videoQuality,
      isoRange,
      autofocus,
    } = req.body;

    if (!equipmentName || !category || !model) {
      return res.status(400).json({
        success: false,
        message: "Equipment name, category, and model are required",
      });
    }

    let image = null;
    if (req.file) {
      image = await saveImage(req.file, "inventory");
    }

    const inventory = new Inventory({
      equipmentName,
      sensor,
      image,
      category,
      model,
      quantity: quantity ? parseInt(quantity) : undefined,
      processor,
      videoQuality,
      isoRange,
      autofocus,
    });

    await inventory.save();

    res.status(201).json({
      success: true,
      data: inventory,
      message: "Inventory item created successfully",
    });
  } catch (error) {
    console.error("Error in createInventory:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create inventory item",
    });
  }
};

// exports.getInventories = async (req, res) => {
//   try {
//     const inventories = await Inventory.find();
//     const maintenanceCounts = await Maintenance.aggregate([
//       {
//         $group: {
//           _id: '$inventoryId',
//           maintenanceCount: { $sum: 1 },
//           assignedCount: {
//             $sum: {
//               $cond: [{ $eq: ['$status', 'In Process'] }, 1, 0],
//             },
//           },
//         },
//       },
//     ]);

//     const inventoryData = inventories.map((item) => {
//       const maintenanceInfo = maintenanceCounts.find(
//         (m) => m._id === item.id
//       );
//       return {
//         id: item.id,
//         equipmentName: item.equipmentName, // Changed from 'name' to match schema
//         category: item.category,
//         totalStock: item.quantity || 0,
//         assignedStock: maintenanceInfo ? maintenanceInfo.assignedCount : 0,
//         maintenance: maintenanceInfo ? maintenanceInfo.maintenanceCount : 0,
//         image: item.image, // Include image field
//         sensor: item.sensor,
//         processor: item.processor,
//         autofocus: item.autofocus,
//         isoRange: item.isoRange,
//         model: item.model,
//       };
//     });

//     res.status(200).json({
//       success: true,
//       data: inventoryData,
//       message: 'Inventory items retrieved successfully',
//     });
//   } catch (error) {
//     console.error('Error in getInventories:', error);
//     res.status(500).json({
//       success: false,
//       message: error.message || 'Failed to retrieve inventory items',
//     });
//   }
// };

exports.getInventories = async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const search = req.query.search ? req.query.search.trim() : "";

    const skip = (page - 1) * limit;

    // Search filter (searches in equipmentName, category, model)
    const filter = search
      ? {
          $or: [
            { equipmentName: { $regex: search, $options: "i" } },
            { category: { $regex: search, $options: "i" } },
            { model: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // Total count for pagination
    const totalCount = await Inventory.countDocuments(filter);

    // Paginated inventory fetch
    const inventories = await Inventory.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Aggregate maintenance info
    const maintenanceCounts = await Maintenance.aggregate([
      {
        $group: {
          _id: "$inventoryId",
          maintenanceCount: { $sum: 1 },
          assignedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "In Process"] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Merge inventory data with maintenance info
    const inventoryData = inventories.map((item) => {
      const maintenanceInfo = maintenanceCounts.find((m) => m._id === item.id);
      return {
        id: item.id,
        equipmentName: item.equipmentName,
        category: item.category,
        totalStock: item.quantity || 0,
        assignedStock: maintenanceInfo ? maintenanceInfo.assignedCount : 0,
        maintenance: maintenanceInfo ? maintenanceInfo.maintenanceCount : 0,
        image: item.image,
        sensor: item.sensor,
        processor: item.processor,
        autofocus: item.autofocus,
        isoRange: item.isoRange,
        model: item.model,
      };
    });

    res.status(200).json({
      success: true,
      data: inventoryData,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      message: "Inventory items retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getInventories:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve inventory items",
    });
  }
};

exports.getMaintenanceRecords = async (req, res) => {
  try {
    const maintenanceRecords = await Maintenance.find().populate(
      "inventoryId",
      "equipmentName model image"
    );
    res.status(200).json({
      success: true,
      data: maintenanceRecords,
      message: "Maintenance records retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getMaintenanceRecords:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve maintenance records",
    });
  }
};

exports.getMaintenanceById = async (req, res) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id).populate(
      "inventoryId",
      "equipmentName model image"
    );
    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: "Maintenance record not found",
      });
    }
    res.status(200).json({
      success: true,
      data: maintenance,
      message: "Maintenance record retrieved successfully",
    });
  } catch (error) {
    console.error("Error in getMaintenanceById:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve maintenance record",
    });
  }
};

exports.updateMaintenance = async (req, res) => {
  try {
    const { status, remarks, resolved } = req.body;
    const maintenance = await Maintenance.findById(req.params.id);
    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: "Maintenance record not found",
      });
    }

    if (status) maintenance.status = status;
    if (remarks) maintenance.remarks = remarks;
    if (resolved) {
      maintenance.resolved = true;
      maintenance.resolvedAt = new Date();
    }

    await maintenance.save();
    res.status(200).json({
      success: true,
      data: maintenance,
      message: "Maintenance record updated successfully",
    });
  } catch (error) {
    console.error("Error in updateMaintenance:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update maintenance record",
    });
  }
};

exports.createMaintenance = async (req, res) => {
  try {
    const {
      inventoryId,
      equipmentName,
      model,
      issue,
      damagedBy,
      sendDate,
      status,
      remarks,
    } = req.body;

    if (
      !inventoryId ||
      !equipmentName ||
      !model ||
      !issue ||
      !damagedBy ||
      !sendDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Inventory ID, equipment name, model, issue, damaged by, and send date are required",
      });
    }

    const inventory = await Inventory.findOne({ id: inventoryId });
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory item not found",
      });
    }

    const maintenance = new Maintenance({
      inventoryId,
      equipmentName,
      model,
      issue,
      damagedBy,
      sendDate,
      status: status || "Not Yet Sent",
      remarks,
    });

    await maintenance.save();

    res.status(201).json({
      success: true,
      data: maintenance,
      message: "Maintenance record created successfully",
    });
  } catch (error) {
    console.error("Error in createMaintenance:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create maintenance record",
    });
  }
};

// Remove an inventory item. The UI asks for confirmation before calling this.
exports.deleteInventory = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Inventory.findByIdAndDelete(id);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Inventory item not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Inventory item deleted successfully",
      data: { id },
    });
  } catch (error) {
    console.error("Delete Inventory Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete inventory item" });
  }
};
