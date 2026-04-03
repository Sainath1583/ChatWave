const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: function () {
        return this.type === "group";
      },
      trim: true,
      maxlength: [50, "Room name must be at most 50 characters"],
    },
    description: {
      type: String,
      default: "",
      maxlength: [200, "Description must be at most 200 characters"],
    },
    type: {
      type: String,
      enum: ["group", "private"],
      default: "group",
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    avatar: {
      type: String,
      default: "",
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Room", roomSchema);
