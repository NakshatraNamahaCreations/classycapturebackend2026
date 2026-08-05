// ---------------------------------------------------------------------------
// Image uploads.
//
// Render's filesystem is ephemeral — anything written to disk is deleted on
// every restart, redeploy and idle spin-down. So images go to Cloudinary.
//
// Set these three in Render -> Environment (values are on the Cloudinary
// dashboard). Until they exist, uploads fall back to local disk so the app
// keeps working — but those files will still be wiped, so set them.
//
//   CLOUDINARY_CLOUD_NAME
//   CLOUDINARY_API_KEY
//   CLOUDINARY_API_SECRET
// ---------------------------------------------------------------------------

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log("🖼️  Image uploads: Cloudinary");
} else {
  console.warn(
    "⚠️  Image uploads: local disk — files are DELETED on every Render restart. " +
      "Set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET to fix."
  );
}

// Keep the file in memory so we can send it either to Cloudinary or to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"), false);
    }
  },
});

const uploadToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `classycapture/${folder}`, resource_type: "image" },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });

const saveToDisk = (file, folder) => {
  const dir = path.join(__dirname, "..", "Uploads", folder);
  fs.mkdirSync(dir, { recursive: true });

  const safeName = String(file.originalname).replace(/[^\w.-]/g, "_");
  const filename = `${Date.now()}-${safeName}`;
  fs.writeFileSync(path.join(dir, filename), file.buffer);

  return `Uploads/${folder}/${filename}`;
};

// Returns what should be stored on the document: a full https URL when
// Cloudinary is configured, otherwise a server-relative path. The frontend's
// fileUrl() helper renders either one, so callers don't care which.
const saveImage = async (file, folder = "inventory") => {
  if (!file || !file.buffer) return null;

  if (isCloudinaryConfigured()) {
    const result = await uploadToCloudinary(file.buffer, folder);
    return result.secure_url;
  }

  return saveToDisk(file, folder);
};

module.exports = { upload, saveImage, isCloudinaryConfigured };
