const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const path = require("path");
const categoryRoutes = require("./routes/categoryRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const complementaryRoutes = require("./routes/complementaryRoutes");
const referenceRoutes = require("./routes/referenceRoutes");
const presetQuotationRoutes = require("./routes/presetQuotationRoutes");
const customerRoutes = require("./routes/customerRoutes");
const packageRoutes = require("./routes/package.routes");
const quotationRoutes = require("./routes/quotation.routes");
const vendorRoutes = require("./routes/vendorRoutes");
const inventoryRoutes = require("./routes/inventory");
const userRoutes = require("./routes/userRoutes");
const accountRoutes = require("./routes/accountRoutes");
const leadRoutes = require("./routes/leadRoutes");
const collectedDataRoutes = require("./routes/collectedDataRoutes");
const sortingassignedTaskRoutes = require("./routes/sortingassignedTaskRoutes");
// const vendorSubmissionRoutes = require('./routes/vendorSubmissionRoutes');
const paymentRoutes = require("./routes/paymentRoutes");
const albumRoutes = require("./routes/albumRoutes");
const dailyTaskRoutes = require("./routes/dailyTaskRoutes");
const followUpRoutes = require("./routes/followUpRoutes");
const vendorInventoryRoutes = require("./routes/vendorInventoryRoutes");
const vendorPaymentsRoutes = require("./routes/vendorPaymentsRoutes");
const otherExpenseRoutes = require("./routes/otherExpenseRoutes");
// const editingTaskRoutes = require("./routes/editingTaskRoutes");
const photoEditingRoutes = require("./routes/photoEditingRoutes");
const videoEditingRoutes = require("./routes/videoEditingRoutes");
const albumPhotoSelectionTaskRoutes = require("./routes/albumPhotoSelectionTaskRoutes");
const albumPhotoSelectedRoutes = require("./routes/albumPhotoSelectedRoutes");
const albumEditingRoutes = require("./routes/albumEditingRoutes");
const albumPhotoCorrectionRoutes =require("./routes/albumPhotoCorrectionRoutes");
const additionalServiceRoutes =require("./routes/additionalService.routes");
const payementTrackerRoutes =require("./routes/payementTracker.routes")
const deliverablesRoutes =require("./routes/deliverablesRoutes")
const statsRoutes =require("./routes/statsRoutes")
const dispatchRemarkRoutes =require("./routes/dispatchRemark.routes")

dotenv.config();
const app = express();

// Middleware to parse JSON request body — MUST add this!
app.use(express.json({ limit: "10mb" }));

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.options("*", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE, PATCH,OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(200);
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    console.log("MongoDB Connected Successfully!");
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

connectDB();

mongoose.connection.on("connected", () => {
  console.log("🔗 Mongoose connected to the database.");
});
mongoose.connection.on("error", (err) => {
  console.error("Mongoose connection error:", err);
});
mongoose.connection.on("disconnected", () => {
  console.warn("Mongoose disconnected.");
});

app.use(express.json({ limit: "10mb" }));

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "Uploads")));

app.use("/api/category", categoryRoutes);
app.use("/api/service", serviceRoutes);
app.use("/api/complementary", complementaryRoutes);
app.use("/api/reference", referenceRoutes);
app.use("/api/preset-quotation", presetQuotationRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/package", packageRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/quotations", albumRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", accountRoutes);
app.use("/api/lead", leadRoutes);
app.use("/api/collected-data", collectedDataRoutes);
app.use("/api/sorting-task", sortingassignedTaskRoutes);
// app.use("/api/editing-tasks", editingTaskRoutes);
app.use("/api/photo-editing", photoEditingRoutes);
app.use("/api/video-editing", videoEditingRoutes);
// app.use('/api/task-submission', vendorSubmissionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/daily-tasks", dailyTaskRoutes);
app.use("/api/follow-up", followUpRoutes);
app.use("/api/vendor-inventory", vendorInventoryRoutes);
app.use("/api/vendor-payments", vendorPaymentsRoutes);
app.use("/api/other-expenses", otherExpenseRoutes);
app.use("/api/album-photoselection-task", albumPhotoSelectionTaskRoutes);
app.use("/api/album-photo-selected", albumPhotoSelectedRoutes);
app.use("/api/album-editing", albumEditingRoutes);
app.use("/api/album-photo-correction",albumPhotoCorrectionRoutes );
app.use("/api/additional-services", additionalServiceRoutes);
app.use("/api/payment-tracker", payementTrackerRoutes);
app.use("/api/deliverables", deliverablesRoutes);
app.use("/api/finance-stats", statsRoutes);
app.use("/api/dispatch-remarks", dispatchRemarkRoutes);

app.use((req, res, next) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
