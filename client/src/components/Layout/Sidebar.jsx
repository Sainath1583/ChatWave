import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import api from "../../services/api";
import { formatDistanceToNow } from "date-fns";

function getInitials(name = "") {
  return name.slice(0, 2).toUpperCase();
}

function Avatar({ user, size = "md", online = false }) {
  const colors = ["#6c63ff", "#22d3a0", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899"];
  const color = colors[(user?.username?.charCodeAt(0) || 0) % colors.length];
  return (
    <div className="room-avatar-group">
      <div
        className={`avatar avatar-${size}`}
        style={{ background: user?.avatar ? "transparent" : color }}
      >
        {user?.avatar ? (
          <img src={user.avatar} alt={user.username} style={{ width: "100%", height: "100%", borderRadius: "50%" }} />
        ) : (
          getInitials(user?.username || "?")
        )}
      </div>
      {online && <span className="online-dot" />}
    </div>
  );
}

function RoomAvatar({ room, members, isUserOnline }) {
  if (room.type === "private") {
    const other = members.find((m) => m._id !== room._currentUser);
    return <Avatar user={other} size="md" online={isUserOnline(other?._id)} />;
  }
  return (
    <div
      className="avatar avatar-md"
      style={{ background: "var(--bg-elevated)", fontSize: "1rem", border: "1px solid var(--border)" }}
    >
      #
    </div>
  );
}

export default function Sidebar({ rooms, activeRoom, onRoomSelect, onRoomsUpdate, isMobileOpen, onMobileClose, onProfileOpen }) {
  const { user, logout } = useAuth();
  const { isUserOnline } = useSocket();
  const [search, setSearch] = useState("");
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [showPrivate, setShowPrivate] = useState(false);

  const filtered = rooms.filter((r) => {
    const name =
      r.type === "private"
        ? r.members.find((m) => m._id !== user._id)?.username || ""
        : r.name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const groupRooms = filtered.filter((r) => r.type === "group");
  const privateRooms = filtered.filter((r) => r.type === "private");

  function getRoomDisplayName(room) {
    if (room.type === "private") {
      return room.members.find((m) => m._id !== user._id)?.username || "Unknown";
    }
    return room.name;
  }

  function getLastMsg(room) {
    if (!room.lastMessage) return "No messages yet";
    const msg = room.lastMessage;
    if (msg.isDeleted) return "Message deleted";
    if (msg.type === "image") return "📷 Image";
    if (msg.type === "file") return `📎 ${msg.fileName || "File"}`;
    return msg.content?.slice(0, 42) || "";
  }

  return (
    <>
      <aside className={`sidebar${isMobileOpen ? " mobile-open" : ""}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span style={{ color: "var(--accent)" }}>●</span> Chat
            <span className="sidebar-logo-dot">Wave</span>
          </div>
          <div className="flex gap-1">
            <button
              className="btn btn-ghost btn-icon"
              title="New private chat"
              onClick={() => setShowPrivate(true)}
            >
              <svg viewBox="0 0 24 24" height="24" width="24" preserveAspectRatio="xMidYMid meet" class="" fill="none"><title>New Private Chat</title><path d="M9.53277 12.9911H11.5086V14.9671C11.5086 15.3999 11.7634 15.8175 12.1762 15.9488C12.8608 16.1661 13.4909 15.6613 13.4909 15.009V12.9911H15.4672C15.9005 12.9911 16.3181 12.7358 16.449 12.3226C16.6659 11.6381 16.1606 11.0089 15.5086 11.0089H13.4909V9.03332C13.4909 8.60007 13.2361 8.18252 12.8233 8.05119C12.1391 7.83391 11.5086 8.33872 11.5086 8.991V11.0089H9.49088C8.83941 11.0089 8.33411 11.6381 8.55097 12.3226C8.68144 12.7358 9.09947 12.9911 9.53277 12.9911Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M0.944298 5.52617L2.99998 8.84848V17.3333C2.99998 18.8061 4.19389 20 5.66665 20H19.3333C20.8061 20 22 18.8061 22 17.3333V6.66667C22 5.19391 20.8061 4 19.3333 4H1.79468C1.01126 4 0.532088 4.85997 0.944298 5.52617ZM4.99998 8.27977V17.3333C4.99998 17.7015 5.29845 18 5.66665 18H19.3333C19.7015 18 20 17.7015 20 17.3333V6.66667C20 6.29848 19.7015 6 19.3333 6H3.58937L4.99998 8.27977Z" fill="currentColor"></path></svg>
            </button>
            <button
              className="btn btn-ghost btn-icon"
              title="New room"
              onClick={() => setShowNewRoom(true)}
            >
              ➕
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="sidebar-search">
          <div className="search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              className="search-input"
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Room list */}
        <div className="room-list">
          {groupRooms.length > 0 && (
            <>
              <div className="sidebar-section-title">Channels</div>
              {groupRooms.map((room) => (
                <div
                  key={room._id}
                  className={`room-item${activeRoom?._id === room._id ? " active" : ""}`}
                  onClick={() => { onRoomSelect(room); onMobileClose?.(); }}
                >
                  <RoomAvatar room={room} members={room.members} isUserOnline={isUserOnline} />
                  <div className="flex-1 min-w-0">
                    <div className="room-name truncate">{getRoomDisplayName(room)}</div>
                    <div className="room-last-msg truncate">{getLastMsg(room)}</div>
                  </div>
                  {room.updatedAt && (
                    <span style={{ fontSize: ".65rem", color: "var(--text-muted)", flexShrink: 0 }}>
                      {formatDistanceToNow(new Date(room.updatedAt), { addSuffix: false })}
                    </span>
                  )}
                </div>
              ))}
            </>
          )}

          {privateRooms.length > 0 && (
            <>
              <div className="sidebar-section-title" style={{ marginTop: "8px" }}>Direct Messages</div>
              {privateRooms.map((room) => {
                const other = room.members.find((m) => m._id !== user._id);
                return (
                  <div
                    key={room._id}
                    className={`room-item${activeRoom?._id === room._id ? " active" : ""}`}
                    onClick={() => { onRoomSelect(room); onMobileClose?.(); }}
                  >
                    <Avatar user={other} size="md" online={isUserOnline(other?._id)} />
                    <div className="flex-1 min-w-0">
                      <div className="room-name truncate">{getRoomDisplayName(room)}</div>
                      <div className="room-last-msg truncate">{getLastMsg(room)}</div>
                    </div>
                    {isUserOnline(other?._id) && (
                      <span style={{ fontSize: ".65rem", color: "var(--success)" }}>●</span>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {filtered.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: ".85rem" }}>
              {search ? "No matches found" : "No conversations yet"}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="sidebar-footer"
          style={{ cursor:"pointer" }}
          onClick={onProfileOpen}
          title="Edit your profile"
        >
          <div
            className="avatar avatar-md"
            style={{ background: "var(--accent)", cursor: "pointer", fontSize: ".8rem", flexShrink:0 }}
          >
            {user?.avatar && [...user.avatar].length <= 2 && !user.avatar.startsWith("http")
              ? user.avatar
              : getInitials(user?.username)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="sidebar-user-name truncate">{user?.username}</div>
            <div className="sidebar-user-email truncate">{user?.email}</div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            title="Edit profile"
            onClick={e => { e.stopPropagation(); onProfileOpen(); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* New Group Room Modal */}
      {showNewRoom && (
        <NewRoomModal
          onClose={() => setShowNewRoom(false)}
          onCreated={(room) => {
            onRoomsUpdate((prev) => [room, ...prev]);
            onRoomSelect(room);
            setShowNewRoom(false);
          }}
        />
      )}

      {/* New Private Chat Modal */}
      {showPrivate && (
        <NewPrivateModal
          currentUserId={user._id}
          onClose={() => setShowPrivate(false)}
          onCreated={(room) => {
            onRoomsUpdate((prev) => {
              const exists = prev.find((r) => r._id === room._id);
              if (exists) return prev;
              return [room, ...prev];
            });
            onRoomSelect(room);
            setShowPrivate(false);
          }}
        />
      )}
    </>
  );
}

/* ── New Group Room Modal ──────────────────────────────── */
function NewRoomModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return setError("Room name is required");
    try {
      setLoading(true);
      const { data } = await api.post("/rooms", { name: name.trim(), description });
      onCreated(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Create a Channel</h2>
        {error && <p style={{ color: "var(--danger)", fontSize: ".85rem", marginBottom: "12px" }}>{error}</p>}
        <div className="form-group">
          <label className="form-label">Channel Name</label>
          <input
            className="input"
            placeholder="e.g. general, design, dev…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label">Description (optional)</label>
          <input
            className="input"
            placeholder="What's this channel about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex gap-2" style={{ marginTop: "20px" }}>
          <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={handleCreate} disabled={loading}>
            {loading ? <span className="spinner" /> : "Create Channel"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── New Private Chat Modal ───────────────────────────── */
function NewPrivateModal({ currentUserId, onClose, onCreated }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) return setResults([]);
    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/auth/users/search?q=${encodeURIComponent(query)}`);
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [query]);

  const startChat = async (userId) => {
    try {
      setStarting(true);
      const { data } = await api.post("/rooms/private", { userId });
      onCreated(data);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">New Direct Message</h2>
        <div className="form-group">
          <input
            className="input"
            placeholder="Search by username or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div style={{ minHeight: "120px" }}>
          {loading && <div style={{ textAlign: "center", padding: "20px" }}><span className="spinner" style={{ margin: "auto" }} /></div>}
          {!loading && results.map((u) => (
            <div
              key={u._id}
              className="room-item"
              style={{ cursor: "pointer" }}
              onClick={() => !starting && startChat(u._id)}
            >
              <div className="avatar avatar-md" style={{ background: "var(--accent)" }}>
                {u.username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="room-name">{u.username}</div>
                <div className="room-last-msg">{u.email}</div>
              </div>
            </div>
          ))}
          {!loading && query && results.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: ".85rem", padding: "12px 0" }}>No users found</p>
          )}
        </div>
        <button className="btn btn-ghost w-full" style={{ marginTop: "12px" }} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
