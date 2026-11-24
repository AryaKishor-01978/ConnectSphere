
const express = require("express");
const cors = require("cors");
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const { Server } = require("socket.io");

require("dotenv").config();

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const fileRoutes = require("./routes/fileRoutes");
const meetingRoutes = require("./routes/meetingRoutes");

const Meeting = require("./models/Meeting");

const app = express();

// ALLOWED FRONTEND ORIGINS
const allowedOrigins = [
  "https://localhost:5173",
  "https://127.0.0.1:5173",
  "https://192.168.1.59:5173",
  process.env.FRONTEND_URL
].filter(Boolean);

// CREATE SERVER
// Render handles public HTTPS automatically.
// Local development continues using your HTTPS certificates.
const server =
  process.env.NODE_ENV === "production"
    ? http.createServer(app)
    : https.createServer(
        {
          key: fs.readFileSync(
            path.join(__dirname, "../frontend/localhost-key.pem")
          ),
          cert: fs.readFileSync(
            path.join(__dirname, "../frontend/localhost.pem")
          )
        },
        app
      );

// MIDDLEWARE
app.use(
  cors({
    origin: allowedOrigins
  })
);

app.use(express.json());

// API ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/meetings", meetingRoutes);

// BACKEND TEST ROUTE
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ConnectSphere Backend is Running!"
  });
});

// SOCKET.IO SERVER
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// SOCKET.IO JWT AUTHENTICATION
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    socket.userId = decoded.id;

    next();
  } catch (error) {
    next(new Error("Invalid or expired authentication token"));
  }
});

// MAKE SOCKET.IO AVAILABLE TO EXPRESS ROUTES
app.set("io", io);

// WHITEBOARD ROOM STORAGE
const whiteboardRooms = new Map();

// SOCKET CONNECTION
io.on("connection", (socket) => {
  console.log("Authenticated user connected:", socket.userId);
  console.log("Socket ID:", socket.id);

  // JOIN MEETING ROOM WITH AUTHORIZATION
  socket.on("join-room", async (roomId) => {
    try {
      if (
        typeof roomId !== "string" ||
        !roomId.trim() ||
        roomId.length > 100
      ) {
        socket.emit("meeting-error", {
          message: "Invalid meeting ID"
        });
        return;
      }

      // FIND MEETING IN MONGODB
      const meeting = await Meeting.findOne({
        meetingId: roomId
      });

      if (!meeting) {
        socket.emit("meeting-error", {
          message: "Meeting not found"
        });
        return;
      }

      // CHECK HOST OR APPROVED PARTICIPANT
      const isAuthorized =
        meeting.host.toString() === socket.userId ||
        meeting.participants.some(
          (participant) =>
            participant.user.toString() === socket.userId
        );

      if (!isAuthorized) {
        socket.emit("meeting-error", {
          message:
            "You are not authorized to enter this meeting. Please get host approval."
        });
        return;
      }

      // GET EXISTING USERS
      const clients =
        io.sockets.adapter.rooms.get(roomId);

      const otherUsers = clients
        ? Array.from(clients)
        : [];

      // JOIN AUTHORIZED ROOM
      socket.join(roomId);

      // SEND WHITEBOARD STATE
      socket.emit(
        "whiteboard-state",
        whiteboardRooms.get(roomId) || []
      );

      // SEND EXISTING USERS
      socket.emit("all-users", otherUsers);

      // NOTIFY OTHER USERS
      socket.to(roomId).emit(
        "user-joined",
        socket.id
      );

      console.log("Authorized user joined room:", roomId);

    } catch (error) {
      console.error("Meeting authorization error:", error);

      socket.emit("meeting-error", {
        message: "Unable to verify meeting access"
      });
    }
  });

  // CHECK WHETHER TWO USERS SHARE AN AUTHORIZED ROOM
  const canCommunicateWith = (target) => {
    const targetSocket = io.sockets.sockets.get(target);

    if (!targetSocket) {
      return false;
    }

    return [...socket.rooms].some((room) => {
      return (
        room !== socket.id &&
        targetSocket.rooms.has(room)
      );
    });
  };

  // WEBRTC OFFER
  socket.on("offer", ({ target, offer }) => {
    if (!target || !offer) return;

    if (!canCommunicateWith(target)) {
      console.log("Unauthorized WebRTC offer blocked");
      return;
    }

    io.to(target).emit("offer", {
      sender: socket.id,
      offer
    });
  });

  // WEBRTC ANSWER
  socket.on("answer", ({ target, answer }) => {
    if (!target || !answer) return;

    if (!canCommunicateWith(target)) {
      console.log("Unauthorized WebRTC answer blocked");
      return;
    }

    io.to(target).emit("answer", {
      sender: socket.id,
      answer
    });
  });

  // ICE CANDIDATE
  socket.on("ice-candidate", ({ target, candidate }) => {
    if (!target || !candidate) return;

    if (!canCommunicateWith(target)) {
      console.log("Unauthorized ICE candidate blocked");
      return;
    }

    io.to(target).emit("ice-candidate", {
      sender: socket.id,
      candidate
    });
  });

  // WHITEBOARD DRAW
  socket.on(
    "whiteboard-draw",
    ({ roomId, segment }) => {
      if (
        !roomId ||
        !socket.rooms.has(roomId) ||
        !segment
      ) {
        return;
      }

      const strokes =
        whiteboardRooms.get(roomId) || [];

      if (strokes.length >= 5000) return;

      strokes.push(segment);

      whiteboardRooms.set(roomId, strokes);

      socket.to(roomId).emit(
        "whiteboard-draw",
        segment
      );
    }
  );

  // WHITEBOARD CLEAR
  socket.on("whiteboard-clear", (roomId) => {
    if (
      !roomId ||
      !socket.rooms.has(roomId)
    ) {
      return;
    }

    whiteboardRooms.set(roomId, []);

    io.to(roomId).emit("whiteboard-clear");

    console.log("Whiteboard cleared:", roomId);
  });

  // HANDLE USER LEAVING
  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit(
          "user-left",
          socket.id
        );
      }
    }
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// SERVER PORT
const PORT = process.env.PORT || 5000;

// START SERVER
const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, "0.0.0.0", () => {
      console.log(
        `ConnectSphere server running on port ${PORT}`
      );
    });

  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();
