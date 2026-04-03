import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  // Store the socket instance in state so consumers re-render when it's ready
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      setIsConnected(false);
      return;
    }

    const token = localStorage.getItem("token");
    const newSocket = io(window.location.origin, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket); // expose to consumers immediately

    newSocket.on("connect", () => {
      setIsConnected(true);
      console.log("✅ Socket connected:", newSocket.id);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("reconnect", () => {
      setIsConnected(true);
    });

    newSocket.on("users:online", (userIds) => {
      setOnlineUsers(userIds);
    });

    newSocket.on("user:online", ({ userId, isOnline }) => {
      setOnlineUsers((prev) =>
        isOnline
          ? [...new Set([...prev, userId.toString()])]
          : prev.filter((id) => id !== userId.toString())
      );
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connect_error:", err.message);
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [user?._id]); // depend on user ID only

  const isUserOnline = useCallback(
    (userId) => onlineUsers.includes(userId?.toString()),
    [onlineUsers]
  );

  // Stable emit helper — always uses the current socket ref
  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
      return true;
    }
    console.warn(`Socket not connected — dropped event: ${event}`);
    return false;
  }, []);

  return (
    <SocketContext.Provider
      value={{ socket, socketRef, emit, isConnected, onlineUsers, isUserOnline }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be inside SocketProvider");
  return ctx;
};
