const express = require("express");
const path = require("path");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const Message = require("../models/Message");
const Room = require("../models/Room");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/zip",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("File type not supported"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// @route   GET /api/messages/:roomId
// @desc    Get messages for a room (paginated)
// @access  Private
router.get("/:roomId", protect, async (req, res) => {
  try {
    const room = await Room.findOne({
      _id: req.params.roomId,
      members: req.user._id,
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found or access denied" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      room: req.params.roomId,
      isDeleted: false,
    })
      .populate("sender", "username avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({
      room: req.params.roomId,
      isDeleted: false,
    });

    res.json({
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + messages.length < total,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/messages/upload
// @desc    Upload a file/image for a message
// @access  Private
router.post("/upload", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const isImage = req.file.mimetype.startsWith("image/");
    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      type: isImage ? "image" : "file",
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Upload failed" });
  }
});

// @route   DELETE /api/messages/:messageId
// @desc    Delete a message (soft delete)
// @access  Private
router.delete("/:messageId", protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this message" });
    }

    message.isDeleted = true;
    message.content = "This message was deleted";
    await message.save();

    res.json({ message: "Message deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
