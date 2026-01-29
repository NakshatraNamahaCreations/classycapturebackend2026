// ✅ if your file is src/models/photoEditingTask.js
const PhotoEditingTask = require("../models/photoEditingTask");

// ✅ if your file is src/models/quotation.model.js
const Quotation = require("../models/quotation.model");

// 📸 Assign Photo Editing Task
exports.assignPhotoEditingTask = async (req, res) => {
  try {
    const {
      quotationId,
      collectedDataId,
      packageName,
      serviceName,
      vendorId,
      vendorName,
      taskDescription,
      assignedPhotosToEdit,
      completionDate,
    } = req.body;

    if (!assignedPhotosToEdit || assignedPhotosToEdit <= 0)
      return res
        .status(400)
        .json({ success: false, message: "assignedPhotosToEdit is required" });

    const newTask = await PhotoEditingTask.create({
      quotationId,
      collectedDataId,
      packageName,
      serviceName,
      vendorId,
      vendorName,
      taskDescription,
      assignedPhotosToEdit,
      completionDate,
    });

    res.status(201).json({ success: true, message: "Photo Editing Task Assigned", task: newTask });
  } catch (err) {
    console.error("Error assigning photo editing task:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 📸 Submit Photo Editing Task
exports.submitPhotoEditingTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { submittedPhotosToEdit, submittedDate, submittedNotes } = req.body;

    const task = await PhotoEditingTask.findById(id);
    if (!task)
      return res.status(404).json({ success: false, message: "Task not found" });

    task.status = "Completed";
    task.submittedDate = submittedDate || new Date();
    task.submittedNotes = submittedNotes || "";
    task.submittedPhotosToEdit = submittedPhotosToEdit;
    await task.save();

    res.json({ success: true, message: "Photo Editing Task Submitted", task });
  } catch (err) {
    console.error("Error submitting photo editing task:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 📸 Fetch All Photo Editing Tasks
exports.getAllPhotoEditingTasks = async (req, res) => {
  try {
    const tasks = await PhotoEditingTask.find().sort({ createdAt: -1 });
    res.json({ success: true, count: tasks.length, tasks });
  } catch (err) {
    console.error("Error fetching photo editing tasks:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 📸 Fetch Single Photo Editing Task by ID
exports.getPhotoEditingTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await PhotoEditingTask.findById(id);
    if (!task)
      return res.status(404).json({ success: false, message: "Task not found" });

    res.json({ success: true, task });
  } catch (err) {
    console.error("Error fetching photo editing task:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// 📸 Fetch Tasks by Quotation ID
exports.getPhotoEditingTasksByQuotation = async (req, res) => {
  try {
    const { quotationId } = req.params;
    const tasks = await PhotoEditingTask.find({ quotationId }).sort({ createdAt: -1 });
    res.json({ success: true, count: tasks.length, tasks });
  } catch (err) {
    console.error("Error fetching tasks by quotation:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
