import { useState, useEffect } from "react";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";

export default function TypingIndicator({ room }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [typers, setTypers] = useState(new Map());

  useEffect(() => {
    if (!socket || !room) return;

    const handleStart = ({ roomId, user: typer }) => {
      if (roomId !== room._id || typer._id === user._id) return;
      setTypers((prev) => new Map(prev).set(typer._id, typer.username));
    };
    const handleStop = ({ roomId, userId }) => {
      if (roomId !== room._id) return;
      setTypers((prev) => { const n = new Map(prev); n.delete(userId); return n; });
    };

    socket.on("typing:start", handleStart);
    socket.on("typing:stop", handleStop);
    return () => { socket.off("typing:start", handleStart); socket.off("typing:stop", handleStop); };
  }, [socket, room?._id, user._id]);

  useEffect(() => { setTypers(new Map()); }, [room?._id]);

  if (typers.size === 0) return <div className="typing-indicator" />;

  const names = Array.from(typers.values());
  const label = names.length === 1
    ? `${names[0]} is typing`
    : names.length === 2
    ? `${names[0]} and ${names[1]} are typing`
    : `${names[0]} and ${names.length - 1} others are typing`;

  return (
    <div className="typing-indicator">
      <div className="typing-dots"><span /><span /><span /></div>
      <span>{label}…</span>
    </div>
  );
}
