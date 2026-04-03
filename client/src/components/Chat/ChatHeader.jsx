import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";

function getInitials(name = "") { return name.slice(0, 2).toUpperCase(); }

export default function ChatHeader({ room, onMenuOpen, onInfoOpen }) {
  const { user } = useAuth();
  const { isUserOnline } = useSocket();

  if (!room) return null;

  const isPrivate = room.type === "private";
  const other = isPrivate ? room.members?.find((m) => m._id !== user._id) : null;
  const displayName = isPrivate ? other?.username || "Unknown" : room.name;
  const online = isPrivate ? isUserOnline(other?._id) : null;
  const memberCount = room.members?.length || 0;

  return (
    <div className="chat-header">
      <div className="chat-header-info">
        <button className="btn btn-ghost btn-icon mobile-back" onClick={onMenuOpen} style={{ marginRight: "4px" }}>←</button>

        {/* Clickable area opens info panel */}
        <button
          onClick={onInfoOpen}
          style={{ display: "flex", alignItems: "center", gap: 10, background: "transparent", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: "var(--radius-md)", transition: "background .12s" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--bg-elevated)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          title="View channel info"
        >
          {isPrivate ? (
            <div className="room-avatar-group">
              <div className="avatar avatar-md" style={{ background: "var(--accent)" }}>{getInitials(other?.username)}</div>
              {online !== null && <span className={`online-dot${!online ? " offline-dot" : ""}`} />}
            </div>
          ) : (
            <div className="avatar avatar-md" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", fontSize: "1.1rem" }}>
              #
            </div>
          )}

          <div style={{ textAlign: "left" }}>
            <div className="chat-header-name">{displayName}</div>
            <div className="chat-header-meta">
              {isPrivate
                ? online
                  ? <span style={{ color: "var(--success)" }}>● Online</span>
                  : <span>● Offline</span>
                : <span>{memberCount} member{memberCount !== 1 ? "s" : ""}{room.description ? ` · ${room.description}` : ""}</span>
              }
            </div>
          </div>
        </button>
      </div>

      {/* Info button on right */}
      <button
        className="btn btn-ghost btn-icon"
        onClick={onInfoOpen}
        title="Channel info"
        style={{ color: "var(--text-secondary)" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </button>
    </div>
  );
}
