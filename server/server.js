require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");
const connectDB = require("./config/db");
const { socketAuth } = require("./middleware/auth");
const Message = require("./models/Message");
const Room = require("./models/Room");
const User = require("./models/User");

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/rooms", require("./routes/rooms"));

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Socket.IO 

io.use(socketAuth);

// Track online users: userId -> Set of socketIds
const onlineUsers = new Map();

io.on("connection", async (socket) => {
  const userId = socket.user._id.toString();
  console.log(`✅ Socket connected: ${socket.id} (user: ${userId})`);

  // Track socket
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socket.id);

  // Mark user online in DB
  await User.findByIdAndUpdate(userId, { isOnline: true });

  // Send current online user list to the newly connected socket
  socket.emit("users:online", [...onlineUsers.keys()]);

  // Broadcast to everyone that this user is now online
  socket.broadcast.emit("user:online", { userId, isOnline: true });

  // Join all rooms the user belongs to
  const rooms = await Room.find({ members: userId }).select("_id");
  rooms.forEach((room) => socket.join(room._id.toString()));

  // Join a room 
  socket.on("room:join", (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  // Leave a room 
  socket.on("room:leave", (roomId) => {
    socket.leave(roomId);
  });

  // Send a message
  socket.on("message:send", async (data) => {
    try {
      const { roomId, content, type = "text", fileUrl, fileName, fileSize } = data;

      // Verify membership
      const room = await Room.findOne({ _id: roomId, members: userId });
      if (!room) return;

      const message = await Message.create({
        room: roomId,
        sender: userId,
        content: content || "",
        type,
        fileUrl: fileUrl || "",
        fileName: fileName || "",
        fileSize: fileSize || 0,
      });

      const populated = await Message.findById(message._id).populate(
        "sender",
        "username avatar"
      );

      // Update room's lastMessage
      await Room.findByIdAndUpdate(roomId, { lastMessage: message._id });

      // Broadcast to everyone in the room (including sender)
      io.to(roomId).emit("message:new", populated);

      // Notify room members about lastMessage update
      io.to(roomId).emit("room:updated", {
        roomId,
        lastMessage: populated,
      });
    } catch (err) {
      console.error("message:send error:", err);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Delete a message 
  socket.on("message:delete", async ({ messageId, roomId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;
      if (message.sender.toString() !== userId) return;

      message.isDeleted = true;
      message.content = "This message was deleted";
      await message.save();

      io.to(roomId).emit("message:deleted", { messageId, roomId });
    } catch (err) {
      console.error("message:delete error:", err);
    }
  });

  // Typing indicators 
  socket.on("typing:start", ({ roomId }) => {
    socket.to(roomId).emit("typing:start", {
      userId,
      username: socket.user.username,
      roomId,
    });
  });

  socket.on("typing:stop", ({ roomId }) => {
    socket.to(roomId).emit("typing:stop", { userId, roomId });
  });

  // Disconnect
  socket.on("disconnect", async () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);

    const sockets = onlineUsers.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        onlineUsers.delete(userId);
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });
        io.emit("user:online", { userId, isOnline: false });
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});