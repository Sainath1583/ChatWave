import { useEffect, useRef, useState } from "react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import api from "../../services/api";

function getInitials(name = "") {
  return name.slice(0, 2).toUpperCase();
}

function formatMsgTime(date) {
  return format(new Date(date), "HH:mm");
}

function DateDivider({ date }) {
  const d = new Date(date);
  const label = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "MMMM d, yyyy");
  return (
    <div className="date-divider">
      <span>{label}</span>
    </div>
  );
}

function FileMessage({ message, isOwn }) {
  const isImage = message.type === "image";
  const src = message.fileUrl?.startsWith("/") ? message.fileUrl : `/${message.fileUrl}`;

  if (isImage) {
    return (
      <a href={src} target="_blank" rel="noopener noreferrer">
        <img
          className="message-image"
          src={src}
          alt={message.fileName || "image"}
          onError={(e) => { e.target.style.display = "none"; }}
        />
      </a>
    );
  }

  return (
    <a
      className="message-file"
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      download={message.fileName}
      style={{ color: isOwn ? "#fff" : "var(--text-primary)" }}
    >
      <span style={{ fontSize: "1.2rem" }}>📎</span>
      <div>
        <div style={{ fontWeight: 600, fontSize: ".82rem" }}>{message.fileName || "File"}</div>
        {message.fileSize > 0 && (
          <div style={{ fontSize: ".72rem", opacity: .7 }}>
            {(message.fileSize / 1024).toFixed(1)} KB
          </div>
        )}
      </div>
    </a>
  );
}

function MessageBubble({ message, isOwn, showSender }) {
  const { socket } = useSocket();
  const [hover, setHover] = useState(false);

  if (message.type === "system") {
    return <div className="message-system">{message.content}</div>;
  }

  const handleDelete = () => {
    if (confirm("Delete this message?")) {
      socket?.emit("message:delete", { messageId: message._id, roomId: message.room });
    }
  };

  return (
    <div
      className={`message-row${isOwn ? " own" : ""}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Avatar — only for other's messages */}
      {!isOwn && (
        <div
          className="avatar avatar-sm"
          style={{ background: "var(--accent)", flexShrink: 0, alignSelf: "flex-end", marginBottom: "2px" }}
        >
          {message.sender?.avatar ? (
            <img src={message.sender.avatar} alt="" style={{ width: "100%", borderRadius: "50%" }} />
          ) : (
            getInitials(message.sender?.username)
          )}
        </div>
      )}

      {/* Bubble */}
      <div className={`message-bubble${isOwn ? " own" : " other"}${message.isDeleted ? " message-deleted" : ""}`}>
        {!isOwn && showSender && (
          <div className="message-sender">{message.sender?.username}</div>
        )}

        {message.type === "text" ? (
          <span>{message.isDeleted ? "This message was deleted" : message.content}</span>
        ) : (
          !message.isDeleted && <FileMessage message={message} isOwn={isOwn} />
        )}

        <span className="message-time">{formatMsgTime(message.createdAt)}</span>
      </div>

      {/* Delete button */}
      {isOwn && hover && !message.isDeleted && (
        <button
          onClick={handleDelete}
          title="Delete"
          style={{
            alignSelf: "center",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--danger)",
            padding: "6px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.85,
            transition: "opacity .15s, background .15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "rgba(239,68,68,0.12)"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.background = "transparent"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default function MessageList({ room, messages, setMessages, loadingMore, onLoadMore, hasMore }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const prevScrollHeight = useRef(0);

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Preserve scroll position when loading older messages
  useEffect(() => {
    if (loadingMore) {
      prevScrollHeight.current = containerRef.current?.scrollHeight || 0;
    } else if (prevScrollHeight.current) {
      const el = containerRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight - prevScrollHeight.current;
      }
      prevScrollHeight.current = 0;
    }
  }, [loadingMore]);

  // Socket: receive new message
  useEffect(() => {
    if (!socket) return;
    const handleNew = (msg) => {
      if (msg.room === room._id || msg.room?._id === room._id) {
        setMessages((prev) => {
          if (prev.find((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }
    };
    const handleDeleted = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, isDeleted: true, content: "This message was deleted" }
            : m
        )
      );
    };

    socket.on("message:new", handleNew);
    socket.on("message:deleted", handleDeleted);

    // Mark as read
    socket.emit("messages:read", { roomId: room._id });

    return () => {
      socket.off("message:new", handleNew);
      socket.off("message:deleted", handleDeleted);
    };
  }, [socket, room._id, setMessages]);

  // Group messages for date dividers
  const grouped = messages.reduce((acc, msg, i) => {
    const prev = messages[i - 1];
    const showDate = !prev || !isSameDay(new Date(msg.createdAt), new Date(prev.createdAt));
    if (showDate) acc.push({ type: "date", date: msg.createdAt, key: `date-${msg._id}` });
    acc.push({ type: "message", msg });
    return acc;
  }, []);

  return (
    <div className="messages-container" ref={containerRef}>
      {/* Load more */}
      {hasMore && (
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: ".8rem" }}
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? <span className="spinner" /> : "Load earlier messages"}
          </button>
        </div>
      )}

      {grouped.map((item) => {
        if (item.type === "date") return <DateDivider key={item.key} date={item.date} />;

        const msg = item.msg;
        const isOwn = msg.sender?._id === user._id || msg.sender === user._id;
        const prevMsg = messages[messages.indexOf(msg) - 1];
        const showSender =
          !isOwn &&
          room.type === "group" &&
          (!prevMsg || prevMsg.sender?._id !== msg.sender?._id);

        return (
          <MessageBubble
            key={msg._id}
            message={msg}
            isOwn={isOwn}
            showSender={showSender}
          />
        );
      })}

      {messages.length === 0 && !loadingMore && (
        <div className="empty-state" style={{ flex: 1, justifyContent: "center" }}>
          <div className="empty-state-icon">💬</div>
          <h3>No messages yet</h3>
          <p>Be the first to say something!</p>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
