import { useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const COLORS = ["#6c63ff", "#22d3a0", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6"];
const avatarColor = (name = "") => COLORS[name.charCodeAt(0) % COLORS.length];


export default function UserProfilePanel({ onClose }) {
  const { user, updateUser, logout } = useAuth();
  const [username, setUsername] = useState(user.username || "");
  const [bio, setBio] = useState(user.bio || "");
  const [avatar, setAvatar] = useState(user.avatar || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const avatarInputRef = useRef(null);

  const hasChanges =
    username !== user.username ||
    bio !== (user.bio || "") ||
    avatar !== (user.avatar || "");

  const save = async () => {
    if (!username.trim()) return setError("Username cannot be empty");
    if (username.length < 3) return setError("Username must be at least 3 characters");
    try {
      setSaving(true);
      setError("");
      const { data } = await api.put("/auth/profile", {
        username: username.trim(),
        bio: bio.trim(),
        avatar: avatar.trim(),
      });
      updateUser(data);
      setSuccess("Profile updated!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please select an image file.");
    if (file.size > 5 * 1024 * 1024) return setError("Image must be under 5MB.");
    try {
      setUploading(true);
      setError("");
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/messages/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAvatar(data.fileUrl);
    } catch (err) {
      setError("Failed to upload image. Try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Render avatar preview
  const renderAvatarPreview = (size = 80) => {
    const isSingleEmoji = avatar && [...avatar].length <= 2;
    const isUrl = avatar && (avatar.startsWith("http") || avatar.startsWith("/"));
    if (isUrl) {
      return (
        <img
          src={avatar}
          alt="avatar"
          style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }}
          onError={() => setAvatar("")}
        />
      );
    }
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: isSingleEmoji ? "var(--bg-elevated)" : avatarColor(username),
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: isSingleEmoji ? size * 0.45 : size * 0.35,
        fontWeight: 700, color: "#fff",
        border: "3px solid var(--border)",
        cursor: "pointer",
      }}>
        {avatar || username.slice(0, 2).toUpperCase()}
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 99, backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      <div style={{
        position: "fixed",
        top: 0, right: 0, bottom: 0,
        width: 340,
        background: "var(--bg-surface)",
        borderLeft: "1px solid var(--border)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        animation: "slideInRight .25s ease both",
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ padding: "0 16px", height: "var(--header-h)", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: "1rem" }}>Your Profile</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Avatar section */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative", cursor: "pointer" }} onClick={() => avatarInputRef.current?.click()}>
              {renderAvatarPreview(80)}
              <div style={{
                position: "absolute", bottom: 2, right: 2,
                width: 24, height: 24, borderRadius: "50%",
                background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid var(--bg-surface)",
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
            </div>
            <span style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>
              {uploading ? "Uploading…" : "Click avatar to change"}
            </span>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarUpload}
            />
            {avatar && (
              <button
                className="btn btn-ghost"
                style={{ fontSize: ".78rem", color: "var(--danger)", padding: "2px 8px" }}
                onClick={() => setAvatar("")}
              >
                Remove Avatar
              </button>
            )}
          </div>

          {/* Form fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {error && (
              <div style={{ background: "rgba(255,77,109,.1)", border: "1px solid rgba(255,77,109,.25)", color: "var(--danger)", borderRadius: "var(--radius-md)", padding: "8px 12px", fontSize: ".82rem" }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ background: "rgba(34,211,160,.1)", border: "1px solid rgba(34,211,160,.25)", color: "var(--success)", borderRadius: "var(--radius-md)", padding: "8px 12px", fontSize: ".82rem" }}>
                ✓ {success}
              </div>
            )}

            <div>
              <label className="form-label">Display Name</label>
              <input
                className="input"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                placeholder="Your username"
                maxLength={20}
              />
              <span style={{ fontSize: ".72rem", color: "var(--text-muted)", marginTop: 3, display: "block" }}>{username.length}/20</span>
            </div>

            <div>
              <label className="form-label">Bio</label>
              <textarea
                className="input"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell people a bit about yourself…"
                maxLength={150}
                rows={3}
                style={{ resize: "none", lineHeight: 1.5 }}
              />
              <span style={{ fontSize: ".72rem", color: "var(--text-muted)", marginTop: 3, display: "block" }}>{bio.length}/150</span>
            </div>

            <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", padding: "10px 14px" }}>
              <label className="form-label" style={{ marginBottom: 2 }}>Email</label>
              <p style={{ fontSize: ".875rem", color: "var(--text-secondary)" }}>{user.email}</p>
              <p style={{ fontSize: ".72rem", color: "var(--text-muted)", marginTop: 2 }}>Email cannot be changed</p>
            </div>
          </div>

          {/* Save button */}
          <button
            className="btn btn-primary w-full"
            onClick={save}
            disabled={!hasChanges || saving}
            style={{ height: 42 }}
          >
            {saving ? <span className="spinner" /> : "Save Changes"}
          </button>

          {/* Logout */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <button
              className="btn btn-ghost w-full"
              onClick={logout}
              style={{ color: "var(--danger)", justifyContent: "flex-start", gap: 10 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
