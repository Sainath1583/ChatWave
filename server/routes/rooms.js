const express = require("express");
const Room = require("../models/Room");
const Message = require("../models/Message");
const { protect } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/rooms
// @desc    Get all rooms the user is a member of
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const rooms = await Room.find({ members: req.user._id })
      .populate("members", "username avatar isOnline lastSeen")
      .populate("admin", "username avatar")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username avatar" },
      })
      .sort({ updatedAt: -1 });

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/rooms
// @desc    Create a new group room
// @access  Private
router.post("/", protect, async (req, res) => {
  try {
    const { name, description, members } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Room name is required" });
    }

    // Always add creator to members
    const uniqueMembers = [...new Set([...( members || []), req.user._id.toString()])];

    const room = await Room.create({
      name,
      description: description || "",
      type: "group",
      members: uniqueMembers,
      admin: req.user._id,
    });

    const populatedRoom = await Room.findById(room._id)
      .populate("members", "username avatar isOnline lastSeen")
      .populate("admin", "username avatar");

    // System message
    await Message.create({
      room: room._id,
      sender: req.user._id,
      content: `${req.user.username} created the room "${name}"`,
      type: "system",
    });

    res.status(201).json(populatedRoom);
  } catch (error) {
    res.status(500).json({ message: error.message || "Server error" });
  }
});

// @route   POST /api/rooms/private
// @desc    Create or get a private conversation
// @access  Private
router.post("/private", protect, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot create a chat with yourself" });
    }

    // Check if private room already exists
    const existingRoom = await Room.findOne({
      type: "private",
      members: { $all: [req.user._id, userId], $size: 2 },
    })
      .populate("members", "username avatar isOnline lastSeen")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username avatar" },
      });

    if (existingRoom) {
      return res.json(existingRoom);
    }

    // Create new private room
    const room = await Room.create({
      type: "private",
      members: [req.user._id, userId],
      admin: req.user._id,
    });

    const populatedRoom = await Room.findById(room._id)
      .populate("members", "username avatar isOnline lastSeen")
      .populate("admin", "username avatar");

    res.status(201).json(populatedRoom);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/rooms/:id
// @desc    Get a single room
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const room = await Room.findOne({
      _id: req.params.id,
      members: req.user._id,
    })
      .populate("members", "username avatar isOnline lastSeen bio")
      .populate("admin", "username avatar");

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/rooms/:id
// @desc    Update a room (admin only)
// @access  Private
router.put("/:id", protect, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only admin can update the room" });
    }

    const { name, description } = req.body;
    if (name) room.name = name;
    if (description !== undefined) room.description = description;

    await room.save();

    const updatedRoom = await Room.findById(room._id)
      .populate("members", "username avatar isOnline lastSeen")
      .populate("admin", "username avatar");

    res.json(updatedRoom);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/rooms/:id/join
// @desc    Join a room
// @access  Private
router.post("/:id/join", protect, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (room.type === "private") return res.status(403).json({ message: "Cannot join a private room" });

    if (!room.members.includes(req.user._id)) {
      room.members.push(req.user._id);
      await room.save();
    }

    const updatedRoom = await Room.findById(room._id)
      .populate("members", "username avatar isOnline lastSeen")
      .populate("admin", "username avatar");

    res.json(updatedRoom);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   DELETE /api/rooms/:id/leave
// @desc    Leave a room
// @access  Private
router.delete("/:id/leave", protect, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });

    room.members = room.members.filter(
      (m) => m.toString() !== req.user._id.toString()
    );
    await room.save();

    res.json({ message: "Left the room successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/rooms/:id/add-member
// @desc    Add a member to a room (admin only)
// @access  Private
router.post("/:id/add-member", protect, async (req, res) => {
  try {
    const { userId } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (room.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only admin can add members" });
    }
    if (!room.members.includes(userId)) {
      room.members.push(userId);
      await room.save();
    }
    const updated = await Room.findById(room._id)
      .populate("members", "username avatar isOnline lastSeen")
      .populate("admin", "username avatar");
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   DELETE /api/rooms/:id/members/:memberId
// @desc    Remove a member from a room (admin only)
// @access  Private
router.delete("/:id/members/:memberId", protect, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Room not found" });
    if (room.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only admin can remove members" });
    }
    room.members = room.members.filter(m => m.toString() !== req.params.memberId);
    await room.save();
    res.json({ message: "Member removed" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// @route   DELETE /api/rooms/:id/messages
// @desc    Clear all messages in a room
// @access  Private
router.delete("/:id/messages", protect, async (req, res) => {
  try {
    const Message = require("../models/Message");
    const room = await Room.findOne({ _id: req.params.id, members: req.user._id });
    if (!room) return res.status(404).json({ message: "Room not found" });
    await Message.deleteMany({ room: req.params.id });
    await Room.findByIdAndUpdate(req.params.id, { lastMessage: null });
    res.json({ message: "Chat cleared" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
