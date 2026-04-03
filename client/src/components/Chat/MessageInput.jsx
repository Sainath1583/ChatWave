import { useState, useRef, useEffect, useCallback } from "react";
import { useSocket } from "../../context/SocketContext";
import api from "../../services/api";

// FIXED: use emit() helper from context — always uses current socket ref
const TYPING_THROTTLE = 1500;

export default function MessageInput({ room }) {
  const { emit, isConnected } = useSocket();
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingRef = useRef(false);
  const typingTimerRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [text]);

  const emitTyping = useCallback(() => {
    if (!room) return;
    if (!typingRef.current) {
      typingRef.current = true;
      emit("typing:start", { roomId: room._id });
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      typingRef.current = false;
      emit("typing:stop", { roomId: room._id });
    }, TYPING_THROTTLE);
  }, [emit, room]);

  const stopTyping = useCallback(() => {
    clearTimeout(typingTimerRef.current);
    if (typingRef.current) {
      typingRef.current = false;
      emit("typing:stop", { roomId: room?._id });
    }
  }, [emit, room]);

  // Cleanup on room change
  useEffect(() => {
    return () => {
      stopTyping();
      setText("");
      setUploadPreview(null);
      setPendingFile(null);
    };
  }, [room?._id]);

  const sendMessage = useCallback(async () => {
    if (!room) return;
    stopTyping();

    if (pendingFile) {
      try {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", pendingFile.file);
        const { data } = await api.post("/messages/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        emit("message:send", {
          roomId: room._id,
          content: text.trim() || "",
          type: data.type,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
        });
        setText("");
        setUploadPreview(null);
        setPendingFile(null);
      } catch (err) {
        console.error("Upload failed:", err);
        alert("File upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
      return;
    }

    const content = text.trim();
    if (!content) return;
    emit("message:send", { roomId: room._id, content, type: "text" });
    setText("");
  }, [room, text, pendingFile, stopTyping, emit]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return alert("File too large. Max 10MB.");
    const isImage = file.type.startsWith("image/");
    setPendingFile({ file, isImage });
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (ev) => setUploadPreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setUploadPreview(null);
    }
    e.target.value = "";
  };

  const clearFile = () => { setPendingFile(null); setUploadPreview(null); };
  const canSend = (text.trim().length > 0 || !!pendingFile) && !uploading && isConnected;

  return (
    <div className="message-input-area">
      {!isConnected && (
        <div style={{ padding: "4px 14px", fontSize: ".75rem", color: "var(--warning)", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>●</span> Reconnecting to server…
        </div>
      )}

      {pendingFile && (
        <div className="upload-preview">
          {uploadPreview ? <img src={uploadPreview} alt="preview" /> : <span style={{ fontSize: "1.4rem" }}>📎</span>}
          <div className="flex-1 min-w-0">
            <div style={{ fontWeight: 600, fontSize: ".82rem" }}>{pendingFile.file.name}</div>
            <div style={{ fontSize: ".72rem", color: "var(--text-muted)" }}>{(pendingFile.file.size / 1024).toFixed(1)} KB</div>
          </div>
          <button className="btn btn-ghost btn-icon-sm" onClick={clearFile} style={{ color: "var(--danger)" }}>✕</button>
        </div>
      )}

      <div className="message-input-wrap">
        <button className="btn btn-ghost btn-icon-sm" title="Attach file" onClick={() => fileInputRef.current?.click()} style={{ flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt,.zip" style={{ display: "none" }} onChange={handleFileChange} />

        <textarea
          ref={textareaRef}
          className="message-textarea"
          placeholder={isConnected ? `Message ${room.type === "group" ? `#${room.name}` : "…"}` : "Connecting…"}
          value={text}
          rows={1}
          disabled={!isConnected}
          onChange={(e) => { setText(e.target.value); emitTyping(); }}
          onKeyDown={handleKeyDown}
        />

        <button className="btn btn-primary btn-icon" onClick={sendMessage} disabled={!canSend} style={{ flexShrink: 0, width: "34px", height: "34px" }}>
          {uploading
            ? <span className="spinner" style={{ width: 16, height: 16 }} />
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          }
        </button>
      </div>
    </div>
  );
}
