const mongoose = require("mongoose");
const AlbumPhotoSelected = require("../models/albumPhotoSelected");
const Quotation = require("../models/quotation.model");

// ✅ Create Album Photo Selection
// exports.createAlbumPhotoSelection = async (req, res) => {
//   try {
//     const { quotationId, albumId, albumDetails, selectedPhotos } = req.body;

//     // Validation
//     if (!quotationId || !albumId || !albumDetails || !selectedPhotos) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "quotationId, albumId, albumDetails, and selectedPhotos are required",
//       });
//     }

//     const { templateLabel, baseSheets, basePhotos } = albumDetails;
//     if (!templateLabel || !baseSheets || !basePhotos) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "albumDetails must include templateLabel, baseSheets, and basePhotos",
//       });
//     }

//     // Create entry
//     const newSelection = new AlbumPhotoSelected({
//       quotationId,
//       albumId,
//       albumDetails: {
//         templateLabel,
//         baseSheets,
//         basePhotos,
//       },
//       selectedPhotos,
//     });

//     await newSelection.save();

//     res.status(201).json({
//       success: true,
//       message: "Album photo selection created successfully",
//       data: newSelection,
//     });
//   } catch (error) {
//     console.error("Error creating album photo selection:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error while creating album photo selection",
//       error: error.message,
//     });
//   }
// };

// ✅ Create Album Photo Selection
exports.createAlbumPhotoSelection = async (req, res) => {
  try {
    const { quotationId, albumId, albumDetails, selectedPhotos } = req.body;

    // Validation
    if (!quotationId || !albumId || !albumDetails || !selectedPhotos) {
      return res.status(400).json({
        success: false,
        message:
          "quotationId, albumId, albumDetails, and selectedPhotos are required",
      });
    }

    const { templateLabel, baseSheets, basePhotos } = albumDetails;
    if (!templateLabel || !baseSheets || !basePhotos) {
      return res.status(400).json({
        success: false,
        message:
          "albumDetails must include templateLabel, baseSheets, and basePhotos",
      });
    }

    // Create entry
    const newSelection = new AlbumPhotoSelected({
      quotationId,
      albumId,
      albumDetails: {
        templateLabel,
        baseSheets,
        basePhotos,
      },
      selectedPhotos,
    });

    await newSelection.save();

    // ✅ UPDATE album status in quotation
    const updatedQuotation = await Quotation.findOneAndUpdate(
      { _id: quotationId, "albums._id": albumId },
      { $set: { "albums.$.status": "Album Photo Correction" } },
      { new: true },
    );

    if (!updatedQuotation) {
      return res.status(404).json({
        success: false,
        message:
          "Album photo selection created, but quotation/album not found to update status.",
        data: newSelection,
      });
    }

    return res.status(201).json({
      success: true,
      message:
        "Album photo selection created and album status updated to Album Photo Correction",
      data: newSelection,
      quotation: updatedQuotation, // optional
    });
  } catch (error) {
    console.error("Error creating album photo selection:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating album photo selection",
      error: error.message,
    });
  }
};

// GET /album-photo-selected/quotation/:quotationId/latest-by-album
exports.getLatestByAlbum = async (req, res) => {
  try {
    const { quotationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(quotationId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid quotationId." });
    }

    // Get the latest doc per albumId for this quotation
    const rows = await AlbumPhotoSelected.aggregate([
      { $match: { quotationId: new mongoose.Types.ObjectId(quotationId) } },
      { $sort: { createdAt: -1 } }, // newest first
      {
        $group: {
          _id: "$albumId",
          doc: { $first: "$$ROOT" }, // take newest per album
        },
      },
      { $replaceWith: "$doc" },
      // optional: keep only what you need to send to client
      {
        $project: {
          _id: 1,
          albumId: 1,
          quotationId: 1,
          selectedPhotos: 1,
          albumDetails: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    // Return as a dictionary keyed by albumId for fast lookups
    const map = {};
    rows.forEach((r) => (map[String(r.albumId)] = r));
    return res.json({ success: true, data: map, count: rows.length });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
