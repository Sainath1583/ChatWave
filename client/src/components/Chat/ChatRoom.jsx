import { useState, useEffect, useCallback } from "react";
import { useSocket } from "../../context/SocketContext";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import api from "../../services/api";

export default function ChatRoom({ room, onMobileMenuOpen, onInfoOpen }) {
  const { emit, isConnected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchMessages = useCallback(
    async (pageNum = 1) => {
      if (!room) return;
      try {
        pageNum === 1 ? setLoading(true) : setLoadingMore(true);
        const { data } = await api.get(`/messages/${room._id}?page=${pageNum}&limit=50`);
        if (pageNum === 1) {
          setMessages(data.messages);
        } else {
          setMessages((prev) => [...data.messages, ...prev]);
        }
        setHasMore(data.pagination.hasMore);
        setPage(pageNum);
      } catch (err) {
        console.error("Error fetching messages:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [room?._id]
  );

  // Load messages when room changes
  useEffect(() => {
    if (!room) return;
    setMessages([]);
    setPage(1);
    setHasMore(false);
    fetchMessages(1);
  }, [room?._id]);

  // Join socket room — fires when room OR connection changes
  useEffect(() => {
    if (!room || !isConnected) return;
    emit("room:join", room._id);
  }, [room?._id, isConnected, emit]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) fetchMessages(page + 1);
  };

  if (!room) return null;

  return (
    <>
      <ChatHeader room={room} onMenuOpen={onMobileMenuOpen} onInfoOpen={onInfoOpen} />

      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : (
        <MessageList
          room={room}
          messages={messages}
          setMessages={setMessages}
          loadingMore={loadingMore}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
        />
      )}

      <TypingIndicator room={room} />
      <MessageInput room={room} />
    </>
  );
}
