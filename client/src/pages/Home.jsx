import { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import Sidebar from "../components/Layout/Sidebar";
import ChatRoom from "../components/Chat/ChatRoom";
import ChannelInfoPanel from "../components/Chat/ChannelInfoPanel";
import UserProfilePanel from "../components/Layout/UserProfilePanel";
import api from "../services/api";

export default function Home() {
  const { socket } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => { fetchRooms(); }, []);

  useEffect(() => {
    if (!socket) return;
    const handleRoomUpdated = ({ roomId, lastMessage }) => {
      setRooms((prev) =>
        prev.map((r) => r._id === roomId ? { ...r, lastMessage, updatedAt: new Date().toISOString() } : r)
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );
    };
    socket.on("room:updated", handleRoomUpdated);
    return () => socket.off("room:updated", handleRoomUpdated);
  }, [socket]);

  // Close info panel when room changes
  useEffect(() => { setShowChannelInfo(false); }, [activeRoom?._id]);

  const fetchRooms = async () => {
    try {
      setLoadingRooms(true);
      const { data } = await api.get("/rooms");
      setRooms(data);
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleRoomUpdate = (updatedRoom) => {
    setRooms(prev => prev.map(r => r._id === updatedRoom._id ? updatedRoom : r));
    setActiveRoom(updatedRoom);
  };

  const handleLeaveRoom = (roomId) => {
    setRooms(prev => prev.filter(r => r._id !== roomId));
    setActiveRoom(null);
  };

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:49 }}
          onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar
        rooms={rooms}
        activeRoom={activeRoom}
        onRoomSelect={setActiveRoom}
        onRoomsUpdate={setRooms}
        isMobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        onProfileOpen={() => setShowProfile(true)}
      />

      <div style={{ flex:1, display:"flex", overflow:"hidden", minWidth:0 }}>
        <div className="chat-area">
          {activeRoom ? (
            <ChatRoom
              room={activeRoom}
              onMobileMenuOpen={() => setSidebarOpen(true)}
              onInfoOpen={() => setShowChannelInfo(v => !v)}
            />
          ) : (
            <EmptyChat loading={loadingRooms} onMenuOpen={() => setSidebarOpen(true)} />
          )}
        </div>

        {/* Channel Info Side Panel */}
        {showChannelInfo && activeRoom && (
          <ChannelInfoPanel
            room={activeRoom}
            onClose={() => setShowChannelInfo(false)}
            onRoomUpdate={handleRoomUpdate}
            onLeave={handleLeaveRoom}
          />
        )}
      </div>

      {/* User Profile Overlay Panel */}
      {showProfile && <UserProfilePanel onClose={() => setShowProfile(false)} />}
    </div>
  );
}

function EmptyChat({ loading, onMenuOpen }) {
  return (
    <div className="chat-area" style={{ position:"relative" }}>
      <div className="chat-header">
        <button className="btn btn-ghost btn-icon mobile-back" onClick={onMenuOpen}>☰</button>
        <span style={{ fontWeight:700, fontSize:"1rem" }}>ChatWave</span>
        <div />
      </div>
      <div className="empty-state">
        {loading
          ? <span className="spinner" style={{ width:28, height:28 }} />
          : <>
              <div className="empty-state-icon">💬</div>
              <h3>Start a conversation</h3>
              <p>Select a channel from the sidebar, or create a new one using the <strong>+</strong> button.</p>
            </>
        }
      </div>
    </div>
  );
}
