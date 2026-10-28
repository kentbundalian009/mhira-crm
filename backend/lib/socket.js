import { Server } from "socket.io";

let io = null;

const allowedOriginPatterns = [
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
  /^https?:\/\/([a-zA-Z0-9-]+\.)*mhira\.shop$/,
  /^https?:\/\/mhira-crmsystem\.onrender\.com$/,
];

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isMatch = allowedOriginPatterns.some((pattern) => pattern.test(origin));
        if (isMatch) return callback(null, true);
        return callback(null, true); // Permissive in CRM network for seamless staff devices
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    // Staff or customer can subscribe to specific department or personal channel
    socket.on("join", (room) => {
      if (room) {
        socket.join(room);
      }
    });

    socket.on("leave", (room) => {
      if (room) {
        socket.leave(room);
      }
    });

    // Cross-client broadcast relay
    socket.on("client:sync", (data) => {
      if (data && data.type) {
        socket.broadcast.emit("crm:sync", {
          ...data,
          timestamp: Date.now(),
        });
        socket.broadcast.emit(`${data.type}Updated`, data.payload || null);
      }
    });

    socket.on("disconnect", (reason) => {
      // Clean silent disconnect
    });
  });

  console.log("⚡ Real-time Socket.IO Engine initialized successfully.");
  return io;
};

export const getIO = () => io;

/**
 * Global Real-time Broadcast Dispatcher
 * @param {string} type - 'orders' | 'inventory' | 'products' | 'rawMaterials' | 'wip' | 'inbound' | 'returns' | 'marketing' | 'users' | 'cart' | 'favorites' | 'appearance' | etc.
 * @param {any} payload - Optional data details
 */
export const emitRealtimeSync = (type = "general", payload = null) => {
  if (!io) return;
  try {
    const timestamp = Date.now();
    // 1. Unified Event
    io.emit("crm:sync", { type, payload, timestamp });
    // 2. Named specific event
    io.emit(`${type}Updated`, payload);
    io.emit("data:sync", { type, payload, timestamp });

    // Targeted notifications if user specified
    if (payload?.userId) {
      io.to(`user_${payload.userId}`).emit("user:notification", { type, payload, timestamp });
    }
  } catch (err) {
    console.warn("⚠️ Real-time broadcast failed:", err?.message);
  }
};
