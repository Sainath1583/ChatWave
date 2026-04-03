import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import api from "../../services/api";

const COLORS = ["#6c63ff","#22d3a0","#f59e0b","#ef4444","#3b82f6","#ec4899","#8b5cf6","#14b8a6"];
const avatarColor = (name = "") => COLORS[name.charCodeAt(0) % COLORS.length];
const initials = (name = "") => name.slice(0, 2).toUpperCase();

function MemberRow({ member, isAdmin, isSelf, canManage, onRemove, isOnline }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
      <div style={{ position:"relative" }}>
        <div className="avatar avatar-sm" style={{ background: member.avatar ? "transparent" : avatarColor(member.username) }}>
          {member.avatar
            ? <img src={member.avatar} alt="" style={{ width:"100%",borderRadius:"50%" }} />
            : initials(member.username)}
        </div>
        <span style={{
          position:"absolute", bottom:0, right:0,
          width:8, height:8, borderRadius:"50%",
          background: isOnline ? "var(--success)" : "var(--text-muted)",
          border:"1.5px solid var(--bg-surface)"
        }} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:600, fontSize:".85rem" }}>{member.username}{isSelf ? " (you)" : ""}</div>
        {isAdmin && <span style={{ fontSize:".65rem", background:"var(--accent-dim)", color:"var(--accent)", padding:"1px 6px", borderRadius:20, fontWeight:700 }}>Admin</span>}
      </div>
      {canManage && !isSelf && (
        <button
          className="btn btn-ghost btn-icon-sm"
          style={{ color:"var(--danger)" }}
          title="Remove member"
          onClick={() => onRemove(member._id)}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  );
}

export default function ChannelInfoPanel({ room, onClose, onRoomUpdate, onLeave }) {
  const { user } = useAuth();
  const { isUserOnline } = useSocket();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(room.name || "");
  const [editDesc, setEditDesc] = useState(room.description || "");
  const [saving, setSaving] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [adding, setAdding] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const debounce = useRef(null);

  const isAdmin = room.admin?._id === user._id || room.admin === user._id;
  const isPrivate = room.type === "private";
  const otherMember = isPrivate ? room.members?.find(m => m._id !== user._id) : null;

  // Search users to add
  useEffect(() => {
    clearTimeout(debounce.current);
    if (!searchQ.trim()) return setSearchResults([]);
    debounce.current = setTimeout(async () => {
      const { data } = await api.get(`/auth/users/search?q=${encodeURIComponent(searchQ)}`);
      const memberIds = room.members.map(m => m._id);
      setSearchResults(data.filter(u => !memberIds.includes(u._id)));
    }, 400);
  }, [searchQ]);

  const saveEdit = async () => {
    if (!editName.trim()) return;
    try {
      setSaving(true);
      const { data } = await api.put(`/rooms/${room._id}`, { name: editName.trim(), description: editDesc });
      onRoomUpdate(data);
      setEditing(false);
    } finally { setSaving(false); }
  };

  const addMember = async (userId) => {
    try {
      setAdding(true);
      // Join them via API — reuse the join endpoint
      const { data } = await api.post(`/rooms/${room._id}/join`, {});
      // We just update the room locally by re-fetching
      const { data: updated } = await api.get(`/rooms/${room._id}`);
      onRoomUpdate(updated);
      setSearchQ("");
      setSearchResults([]);
      setShowAddMember(false);
    } finally { setAdding(false); }
  };

  // Add member properly via a dedicated API call
  const addMemberById = async (userId) => {
    try {
      setAdding(true);
      await api.post(`/rooms/${room._id}/add-member`, { userId });
      const { data: updated } = await api.get(`/rooms/${room._id}`);
      onRoomUpdate(updated);
      setSearchQ("");
      setSearchResults([]);
      setShowAddMember(false);
    } catch {
      // fallback: just refresh room
      const { data: updated } = await api.get(`/rooms/${room._id}`);
      onRoomUpdate(updated);
    } finally { setAdding(false); }
  };

  const removeMember = async (memberId) => {
    if (!confirm("Remove this member from the channel?")) return;
    try {
      await api.delete(`/rooms/${room._id}/members/${memberId}`);
      const { data: updated } = await api.get(`/rooms/${room._id}`);
      onRoomUpdate(updated);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove member");
    }
  };

  const clearChat = async () => {
    try {
      setClearing(true);
      await api.delete(`/rooms/${room._id}/messages`);
      setConfirmClear(false);
      onRoomUpdate({ ...room, lastMessage: null });
      window.location.reload(); // simplest way to refresh message list
    } catch (err) {
      alert(err.response?.data?.message || "Failed to clear chat");
    } finally { setClearing(false); }
  };

  const leaveRoom = async () => {
    if (!confirm("Leave this channel?")) return;
    try {
      await api.delete(`/rooms/${room._id}/leave`);
      onLeave(room._id);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to leave room");
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      <div
        style={{ position:"fixed", inset:0, zIndex:59, background:"transparent" }}
        onClick={onClose}
      />

      <aside style={{
        width: 300,
        minWidth: 300,
        height: "100%",
        background: "var(--bg-surface)",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        zIndex: 60,
        animation: "slideInRight .2s ease both",
      }}>
        {/* Header */}
        <div style={{ padding:"0 16px", height:"var(--header-h)", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
          <span style={{ fontWeight:700, fontSize:"1rem" }}>
            {isPrivate ? "Profile" : "Channel Info"}
          </span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{ padding:"20px 16px", display:"flex", flexDirection:"column", gap:"20px" }}>

          {/* Channel / User Avatar */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"10px" }}>
            {isPrivate ? (
              <div style={{ position:"relative" }}>
                <div className="avatar avatar-lg" style={{ background: avatarColor(otherMember?.username), width:72, height:72, fontSize:"1.4rem" }}>
                  {initials(otherMember?.username)}
                </div>
                <span style={{
                  position:"absolute", bottom:4, right:4,
                  width:13, height:13, borderRadius:"50%",
                  background: isUserOnline(otherMember?._id) ? "var(--success)" : "var(--text-muted)",
                  border:"2px solid var(--bg-surface)"
                }} />
              </div>
            ) : (
              <div style={{
                width:72, height:72, borderRadius:"var(--radius-lg)",
                background:"var(--bg-elevated)", border:"1px solid var(--border)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"1.8rem", color:"var(--text-secondary)"
              }}>#</div>
            )}

            {/* Name / Editing */}
            {editing ? (
              <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:"8px" }}>
                <input className="input" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Channel name" style={{ textAlign:"center" }} />
                <input className="input" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description (optional)" style={{ textAlign:"center", fontSize:".85rem" }} />
                <div style={{ display:"flex", gap:"6px" }}>
                  <button className="btn btn-ghost flex-1" style={{ fontSize:".82rem" }} onClick={() => setEditing(false)}>Cancel</button>
                  <button className="btn btn-primary flex-1" style={{ fontSize:".82rem" }} onClick={saveEdit} disabled={saving}>
                    {saving ? <span className="spinner" style={{ width:14, height:14 }} /> : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"6px", justifyContent:"center" }}>
                  <span style={{ fontWeight:700, fontSize:"1.1rem" }}>
                    {isPrivate ? otherMember?.username : room.name}
                  </span>
                  {!isPrivate && isAdmin && (
                    <button className="btn btn-ghost btn-icon-sm" onClick={() => setEditing(true)} title="Edit">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  )}
                </div>
                {!isPrivate && room.description && (
                  <p style={{ fontSize:".82rem", color:"var(--text-secondary)", marginTop:4 }}>{room.description}</p>
                )}
                {isPrivate && (
                  <p style={{ fontSize:".82rem", color: isUserOnline(otherMember?._id) ? "var(--success)" : "var(--text-muted)", marginTop:4 }}>
                    {isUserOnline(otherMember?._id) ? "● Online" : "● Offline"}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* MEMBERS SECTION */}
          {!isPrivate && (
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <span style={{ fontSize:".75rem", fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:".06em" }}>
                  Members ({room.members?.length || 0})
                </span>
                {isAdmin && (
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize:".75rem", padding:"4px 8px", color:"var(--accent)" }}
                    onClick={() => setShowAddMember(v => !v)}
                  >
                    {showAddMember ? "Cancel" : "+ Add"}
                  </button>
                )}
              </div>

              {/* Add member search */}
              {showAddMember && (
                <div style={{ marginBottom:12 }}>
                  <input
                    className="input"
                    placeholder="Search users to add…"
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    style={{ fontSize:".85rem", marginBottom:8 }}
                    autoFocus
                  />
                  {searchResults.map(u => (
                    <div key={u._id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", cursor:"pointer" }}
                      onClick={() => addMemberById(u._id)}>
                      <div className="avatar avatar-sm" style={{ background: avatarColor(u.username) }}>{initials(u.username)}</div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:".85rem" }}>{u.username}</div>
                        <div style={{ fontSize:".72rem", color:"var(--text-muted)" }}>{u.email}</div>
                      </div>
                      {adding && <span className="spinner" style={{ width:14,height:14 }} />}
                    </div>
                  ))}
                  {searchQ && searchResults.length === 0 && (
                    <p style={{ fontSize:".8rem", color:"var(--text-muted)" }}>No users found</p>
                  )}
                </div>
              )}

              {/* Member list */}
              {room.members?.map(m => (
                <MemberRow
                  key={m._id}
                  member={m}
                  isAdmin={room.admin?._id === m._id || room.admin === m._id}
                  isSelf={m._id === user._id}
                  canManage={isAdmin}
                  onRemove={removeMember}
                  isOnline={isUserOnline(m._id)}
                />
              ))}
            </div>
          )}

          {/* ACTIONS */}
          <div style={{ display:"flex", flexDirection:"column", gap:"8px", borderTop:"1px solid var(--border)", paddingTop:16 }}>

            {/* Clear chat */}
            {confirmClear ? (
              <div style={{ background:"rgba(255,77,109,.08)", border:"1px solid rgba(255,77,109,.2)", borderRadius:"var(--radius-md)", padding:"12px", fontSize:".85rem" }}>
                <p style={{ marginBottom:10, color:"var(--danger)" }}>⚠️ This will delete all messages. Are you sure?</p>
                <div style={{ display:"flex", gap:6 }}>
                  <button className="btn btn-ghost flex-1" style={{ fontSize:".8rem" }} onClick={() => setConfirmClear(false)}>Cancel</button>
                  <button className="btn btn-danger flex-1" style={{ fontSize:".8rem" }} onClick={clearChat} disabled={clearing}>
                    {clearing ? <span className="spinner" style={{ width:14,height:14 }} /> : "Clear All"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-ghost w-full"
                style={{ justifyContent:"flex-start", gap:10, color:"var(--text-secondary)", fontSize:".875rem" }}
                onClick={() => setConfirmClear(true)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/>
                </svg>
                Clear Chat History
              </button>
            )}

            {/* Leave / Delete */}
            {!isPrivate && (
              <button
                className="btn btn-ghost w-full"
                style={{ justifyContent:"flex-start", gap:10, color:"var(--danger)", fontSize:".875rem" }}
                onClick={leaveRoom}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Leave Channel
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
