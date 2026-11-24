
import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";

import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Copy,
  MonitorUp,
  Paperclip,
  Download,
  Pencil,
  Eraser,
  Trash2
} from "lucide-react";

import "../App.css";

// SERVER URL
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || "https://localhost:5000";

function Meeting() {
  const navigate = useNavigate();
  const { meetingId } = useParams();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);
  const peersRef = useRef({});
  const screenTrackRef = useRef(null);

  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [sharedFiles, setSharedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [fileMessage, setFileMessage] = useState("");
  const [fileError, setFileError] = useState("");

  const fileInputRef = useRef(null);

  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);

  const [whiteboardColor, setWhiteboardColor] = useState("#1f2937");
  const [whiteboardTool, setWhiteboardTool] = useState("pen");
  const [whiteboardStrokes, setWhiteboardStrokes] = useState([]);

  // START MEETING AND CONNECT SOCKET
  useEffect(() => {
    let active = true;

    const peers = peersRef.current;
    const pendingCandidates = {};

    const createPeer = (target) => {
      if (peers[target]) {
        return peers[target];
      }

      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" }
        ]
      });

      peers[target] = peer;
      pendingCandidates[target] = [];

      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach(track => {
          peer.addTrack(track, streamRef.current);
        });

        const videoTrack =
          screenTrackRef.current ||
          streamRef.current.getVideoTracks()[0];

        if (videoTrack) {
          peer.addTrack(
            videoTrack,
            screenTrackRef.current
              ? new MediaStream([videoTrack])
              : streamRef.current
          );
        }
      }

      peer.ontrack = event => {
        const remoteStream = event.streams[0];

        setRemoteStreams(previous => {
          if (previous.some(item => item.id === target)) {
            return previous.map(item =>
              item.id === target
                ? { ...item, stream: remoteStream }
                : item
            );
          }

          return [
            ...previous,
            {
              id: target,
              stream: remoteStream
            }
          ];
        });
      };

      peer.onicecandidate = event => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("ice-candidate", {
            target,
            candidate: event.candidate
          });
        }
      };

      return peer;
    };

    const startMeeting = async () => {
      try {
        if (!window.isSecureContext) {
          setError(
            "Camera access requires HTTPS. Open ConnectSphere using a secure HTTPS address."
          );
          return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          setError(
            "Your browser does not support camera access. Please use an updated browser."
          );
          return;
        }

        const token = localStorage.getItem("token");

        if (!token) {
          setError("Please log in before joining a meeting.");
          return;
        }

        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });

        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        setError("");

        const socket = io(SERVER_URL, {
          auth: {
            token: token
          }
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          socket.emit("join-room", meetingId);
        });

        // HANDLE MEETING AUTHORIZATION ERROR
        socket.on("meeting-error", data => {
          console.error("Meeting access error:", data.message);

          setError(data.message || "You are not authorized to join this meeting.");

          socket.disconnect();
        });

        // RECEIVE SHARED FILES
        socket.on("file-shared", fileInfo => {
          setSharedFiles(previous => {
            if (
              previous.some(
                file => file.filename === fileInfo.filename
              )
            ) {
              return previous;
            }

            return [...previous, fileInfo];
          });

          setFileMessage("A participant shared a file.");
          setFileError("");
        });

        // RECEIVE WHITEBOARD DRAWING
        socket.on("whiteboard-draw", segment => {
          setWhiteboardStrokes(previous => [...previous, segment]);
        });

        // CLEAR WHITEBOARD
        socket.on("whiteboard-clear", () => {
          setWhiteboardStrokes([]);
        });

        // RECEIVE WHITEBOARD STATE
        socket.on("whiteboard-state", strokes => {
          setWhiteboardStrokes(
            Array.isArray(strokes) ? strokes : []
          );
        });

        // SOCKET CONNECTION ERROR
        socket.on("connect_error", err => {
          console.error("Socket connection error:", err);

          if (
            err.message === "Authentication required" ||
            err.message.includes("authentication token")
          ) {
            setError(
              "Your login session is invalid or expired. Please log in again."
            );
          } else {
            setError(
              "Unable to connect to the meeting server. Please check your connection."
            );
          }
        });

        // RECEIVE CONNECTED USERS
        socket.on("all-users", async users => {
          for (const userId of users) {
            try {
              const peer = createPeer(userId);

              const offer = await peer.createOffer();
              await peer.setLocalDescription(offer);

              socket.emit("offer", {
                target: userId,
                offer
              });
            } catch (err) {
              console.error("Offer error:", err);
            }
          }
        });

        // RECEIVE OFFER
        socket.on("offer", async ({ sender, offer }) => {
          try {
            const peer = createPeer(sender);

            await peer.setRemoteDescription(
              new RTCSessionDescription(offer)
            );

            for (const candidate of pendingCandidates[sender] || []) {
              await peer.addIceCandidate(
                new RTCIceCandidate(candidate)
              );
            }

            pendingCandidates[sender] = [];

            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);

            socket.emit("answer", {
              target: sender,
              answer
            });
          } catch (err) {
            console.error("Answer error:", err);
          }
        });

        // RECEIVE ANSWER
        socket.on("answer", async ({ sender, answer }) => {
          try {
            const peer = peers[sender];

            if (peer) {
              await peer.setRemoteDescription(
                new RTCSessionDescription(answer)
              );

              for (const candidate of pendingCandidates[sender] || []) {
                await peer.addIceCandidate(
                  new RTCIceCandidate(candidate)
                );
              }

              pendingCandidates[sender] = [];
            }
          } catch (err) {
            console.error("Remote answer error:", err);
          }
        });

        // RECEIVE ICE CANDIDATE
        socket.on("ice-candidate", async ({ sender, candidate }) => {
          try {
            const peer = peers[sender];

            if (peer && peer.remoteDescription) {
              await peer.addIceCandidate(
                new RTCIceCandidate(candidate)
              );
            } else {
              if (!pendingCandidates[sender]) {
                pendingCandidates[sender] = [];
              }

              pendingCandidates[sender].push(candidate);
            }
          } catch (err) {
            console.error("ICE candidate error:", err);
          }
        });

        // HANDLE USER LEAVING
        socket.on("user-left", userId => {
          if (peers[userId]) {
            peers[userId].close();
            delete peers[userId];
          }

          setRemoteStreams(previous =>
            previous.filter(item => item.id !== userId)
          );
        });

        setMicOn(true);
        setCameraOn(true);

      } catch (err) {
        console.error("Meeting error:", err);

        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          setError(
            "Camera or microphone permission was denied. Allow both permissions in your browser settings."
          );
        } else if (err.name === "NotFoundError") {
          setError(
            "Camera or microphone was not found on this device."
          );
        } else if (err.name === "NotReadableError") {
          setError(
            "Camera or microphone is already being used by another application."
          );
        } else {
          setError(
            "Unable to start camera or microphone. Please check your device and browser permissions."
          );
        }
      }
    };

    startMeeting();

    return () => {
      active = false;

      Object.values(peers).forEach(peer => peer.close());

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [meetingId]);

  // START SCREEN SHARING
  const startScreenShare = async () => {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        setError(
          "Screen sharing is not supported by this browser. Please use desktop Chrome or Edge."
        );
        return;
      }

      const displayStream =
        await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });

      const screenTrack = displayStream.getVideoTracks()[0];

      if (!screenTrack) {
        displayStream.getTracks().forEach(track => track.stop());
        return;
      }

      screenTrackRef.current = screenTrack;

      if (videoRef.current) {
        videoRef.current.srcObject = displayStream;
        videoRef.current.play().catch(() => {});
      }

      for (const peer of Object.values(peersRef.current)) {
        const videoSender = peer
          .getSenders()
          .find(sender => sender.track?.kind === "video");

        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        }
      }

      setScreenSharing(true);
      setError("");

      screenTrack.onended = () => {
        stopScreenShare();
      };

    } catch (err) {
      console.error("Screen sharing error:", err);

      if (err.name === "NotAllowedError") {
        setError("Screen sharing permission was cancelled.");
      } else {
        setError("Unable to share your screen. Please try again.");
      }
    }
  };

  // STOP SCREEN SHARING
  const stopScreenShare = async () => {
    const screenTrack = screenTrackRef.current;

    if (!screenTrack) {
      return;
    }

    screenTrackRef.current = null;
    screenTrack.onended = null;

    const cameraTrack = streamRef.current?.getVideoTracks()[0];

    try {
      for (const peer of Object.values(peersRef.current)) {
        const videoSender = peer
          .getSenders()
          .find(sender => sender.track?.kind === "video");

        if (videoSender && cameraTrack) {
          await videoSender.replaceTrack(cameraTrack);
        }
      }
    } catch (err) {
      console.error("Unable to restore camera:", err);
      setError("Unable to restore camera video.");
    }

    screenTrack.stop();

    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }

    setScreenSharing(false);
  };

  // DRAW WHITEBOARD SEGMENT
  const drawWhiteboardSegment = segment => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    context.strokeStyle = segment.color || "#1f2937";
    context.lineWidth = segment.tool === "eraser" ? 18 : 3;
    context.lineCap = "round";
    context.lineJoin = "round";

    context.beginPath();
    context.moveTo(segment.x0 * width, segment.y0 * height);
    context.lineTo(segment.x1 * width, segment.y1 * height);
    context.stroke();
  };

  // REDRAW WHITEBOARD
  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = Math.max(1, Math.floor(rect.width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(rect.height * pixelRatio));

      const context = canvas.getContext("2d");
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      whiteboardStrokes.forEach(drawWhiteboardSegment);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [whiteboardStrokes]);

  const getWhiteboardPoint = event => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    return {
      x: Math.min(
        1,
        Math.max(0, (event.clientX - rect.left) / rect.width)
      ),
      y: Math.min(
        1,
        Math.max(0, (event.clientY - rect.top) / rect.height)
      )
    };
  };

  const startWhiteboardDrawing = event => {
    if (!canvasRef.current) {
      return;
    }

    event.preventDefault();
    canvasRef.current.setPointerCapture(event.pointerId);

    drawingRef.current = true;
    lastPointRef.current = getWhiteboardPoint(event);
  };

  const continueWhiteboardDrawing = event => {
    if (!drawingRef.current || !lastPointRef.current) {
      return;
    }

    event.preventDefault();

    const nextPoint = getWhiteboardPoint(event);

    const segment = {
      x0: lastPointRef.current.x,
      y0: lastPointRef.current.y,
      x1: nextPoint.x,
      y1: nextPoint.y,
      color: whiteboardTool === "eraser"
        ? "#ffffff"
        : whiteboardColor,
      tool: whiteboardTool
    };

    setWhiteboardStrokes(previous => [...previous, segment]);
    drawWhiteboardSegment(segment);

    if (socketRef.current?.connected) {
      socketRef.current.emit("whiteboard-draw", {
        roomId: meetingId,
        segment
      });
    }

    lastPointRef.current = nextPoint;
  };

  const stopWhiteboardDrawing = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearWhiteboard = () => {
    setWhiteboardStrokes([]);

    if (socketRef.current?.connected) {
      socketRef.current.emit("whiteboard-clear", meetingId);
    }
  };

  // MICROPHONE CONTROL
  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];

    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  };

  // CAMERA CONTROL
  const toggleCamera = () => {
    const track = streamRef.current?.getVideoTracks()[0];

    if (track) {
      track.enabled = !track.enabled;
      setCameraOn(track.enabled);
    }
  };

  // COPY MEETING ID
  const copyMeetingId = async () => {
    try {
      await navigator.clipboard.writeText(meetingId);
      setCopied(true);

      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Unable to copy Meeting ID");
    }
  };

  // UPLOAD AND SHARE FILE
  const uploadFile = async event => {
    const selectedFile = event.target.files?.[0];

    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setFileError("Please log in again before sharing a file.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setFileError("File size must be 10 MB or less.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("meetingId", meetingId);

    try {
      setUploading(true);
      setFileError("");
      setFileMessage("");

      const response = await fetch(
        `${SERVER_URL}/api/files/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "File upload failed.");
      }

      const uploadedFile = result.file || result.fileInfo;

      if (uploadedFile?.filename) {
        setSharedFiles(previous => {
          if (
            previous.some(
              file => file.filename === uploadedFile.filename
            )
          ) {
            return previous;
          }

          return [...previous, uploadedFile];
        });
      }

      setFileMessage("File uploaded and shared successfully.");

    } catch (err) {
      console.error("File upload error:", err);
      setFileError(err.message || "Unable to upload this file.");

    } finally {
      setUploading(false);
    }
  };

  // DOWNLOAD SHARED FILE
  const downloadFile = async file => {
    const token = localStorage.getItem("token");

    if (!token) {
      setFileError("Please log in again before downloading a file.");
      return;
    }

    try {
      setFileError("");
      setFileMessage("");

      const response = await fetch(
        `${SERVER_URL}/api/files/download/${encodeURIComponent(file.filename)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        let message = "Unable to download this file.";

        try {
          const result = await response.json();
          message = result.message || message;
        } catch {
          // Non-JSON error response
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = file.originalName || "shared-file";

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(objectUrl);

      setFileMessage("Download started.");

    } catch (err) {
      console.error("File download error:", err);
      setFileError(err.message || "Unable to download this file.");
    }
  };

  // LEAVE MEETING
  const leaveMeeting = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    Object.values(peersRef.current).forEach(peer => peer.close());
    peersRef.current = {};

    if (screenTrackRef.current) {
      screenTrackRef.current.onended = null;
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    navigate("/");
  };

  // PAGE UI
  return (
    <div className="meeting-page">

      <nav className="navbar">
        <h2>ConnectSphere</h2>
        <button onClick={leaveMeeting}>Leave Meeting</button>
      </nav>

      <div className="meeting-container">

        <h1>Meeting Room</h1>

        <div className="meeting-info">
          <p>Meeting ID: {meetingId}</p>

          <button onClick={copyMeetingId}>
            <Copy size={16} />
            {copied ? "Copied!" : "Copy ID"}
          </button>
        </div>

        {error && (
          <p className="meeting-error">{error}</p>
        )}

        <div className="video-grid">

          <div className="video-box">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
            />
            <p>{screenSharing ? "Your Screen" : "You"}</p>
          </div>

          {remoteStreams.map(item => (
            <div className="video-box" key={item.id}>
              <video
                autoPlay
                playsInline
                ref={element => {
                  if (
                    element &&
                    element.srcObject !== item.stream
                  ) {
                    element.srcObject = item.stream;
                    element.play().catch(() => {});
                  }
                }}
              />
              <p>Other Participant</p>
            </div>
          ))}

        </div>

        {/* WHITEBOARD */}
        <section className="whiteboard-section">
          <h2>Interactive Whiteboard</h2>

          <p>
            Draw or write here. Your changes appear for other participants in this meeting.
          </p>

          <div className="whiteboard-toolbar">

            <button
              type="button"
              className={whiteboardTool === "pen" ? "active-tool" : ""}
              onClick={() => setWhiteboardTool("pen")}
            >
              <Pencil size={17} />
              Pen
            </button>

            <button
              type="button"
              className={whiteboardTool === "eraser" ? "active-tool" : ""}
              onClick={() => setWhiteboardTool("eraser")}
            >
              <Eraser size={17} />
              Eraser
            </button>

            <label className="whiteboard-color-label">
              Pen color

              <input
                type="color"
                value={whiteboardColor}
                onChange={event => {
                  setWhiteboardColor(event.target.value);
                  setWhiteboardTool("pen");
                }}
                disabled={whiteboardTool === "eraser"}
              />
            </label>

            <button type="button" onClick={clearWhiteboard}>
              <Trash2 size={17} />
              Clear board
            </button>

          </div>

          <canvas
            ref={canvasRef}
            className="whiteboard-canvas"
            style={{
              display: "block",
              width: "100%",
              height: "400px",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              touchAction: "none",
              cursor: "crosshair"
            }}
            onPointerDown={startWhiteboardDrawing}
            onPointerMove={continueWhiteboardDrawing}
            onPointerUp={stopWhiteboardDrawing}
            onPointerCancel={stopWhiteboardDrawing}
            onPointerLeave={stopWhiteboardDrawing}
            aria-label="Shared drawing whiteboard"
          />

        </section>

        {/* FILE SHARING */}
        <section className="file-sharing-section">
          <h2>File Sharing</h2>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.ppt,.pptx,.xls,.xlsx,.zip"
            onChange={uploadFile}
            style={{ display: "none" }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Paperclip size={18} />
            {uploading ? "Uploading..." : "Choose File"}
          </button>

          <p className="file-sharing-hint">
            Allowed file types: PDF, DOC, DOCX, TXT, images, PPT, XLS and ZIP.
            Maximum size: 10 MB.
          </p>

          {fileMessage && (
            <p className="file-success">{fileMessage}</p>
          )}

          {fileError && (
            <p className="meeting-error">{fileError}</p>
          )}

          <div className="shared-files-list">
            <h3>Shared in this session</h3>

            {sharedFiles.length === 0 ? (
              <p>No files have been shared in this session yet.</p>
            ) : (
              sharedFiles.map(file => (
                <div className="shared-file-item" key={file.filename}>

                  <span>
                    {file.originalName || file.filename}
                  </span>

                  <button
                    type="button"
                    onClick={() => downloadFile(file)}
                  >
                    <Download size={16} />
                    Download
                  </button>

                </div>
              ))
            )}
          </div>

        </section>

        {/* MEETING CONTROLS */}
        <div className="meeting-controls">

          <button onClick={toggleMic}>
            {micOn ? <Mic /> : <MicOff />}
            {micOn ? "Mic On" : "Mic Off"}
          </button>

          <button onClick={toggleCamera}>
            {cameraOn ? <Video /> : <VideoOff />}
            {cameraOn ? "Camera On" : "Camera Off"}
          </button>

          <button
            onClick={
              screenSharing ? stopScreenShare : startScreenShare
            }
          >
            <MonitorUp />
            {screenSharing ? "Stop Sharing" : "Share Screen"}
          </button>

          <button
            onClick={leaveMeeting}
            className="leave-button"
          >
            <PhoneOff />
            Leave
          </button>

        </div>

      </div>
    </div>
  );
}

export default Meeting;
