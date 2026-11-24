
import { useState } from "react";

import {
  Video,
  Users,
  Plus,
  LogIn,
  ShieldCheck,
  LogOut,
  History as HistoryIcon
} from "lucide-react";

import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Meeting from "./pages/Meeting";
import History from "./pages/History";
import ProtectedRoute from "./components/ProtectedRoute";

import "./App.css";

// SERVER URL
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || "https://localhost:5000";

function Home() {
  const [meetingId, setMeetingId] = useState("");

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });

  const navigate = useNavigate();

  // CREATE MEETING
  const createMeeting = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${SERVER_URL}/api/meetings`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Unable to create meeting");
        return;
      }

      navigate(`/meeting/${data.meeting.meetingId}`);

    } catch (error) {
      console.error("Create meeting error:", error);
      alert("Unable to connect to the server");
    }
  };

  // JOIN MEETING
  const joinMeeting = async () => {
    if (!meetingId.trim()) {
      alert("Please enter a Meeting ID");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${SERVER_URL}/api/meetings/${encodeURIComponent(meetingId.trim())}/request-access`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Unable to join meeting");
        return;
      }

      if (data.status === "approved") {
        navigate(`/meeting/${meetingId.trim()}`);
      } else {
        alert(
          "Your meeting access request has been sent. Please wait for host approval."
        );
      }

    } catch (error) {
      console.error("Join meeting error:", error);
      alert("Unable to connect to the server");
    }
  };

  // LOGOUT
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  return (
    <div className="app">

      {/* NAVBAR */}
      <nav className="navbar">

        <h2>
          <Video /> ConnectSphere
        </h2>

        {user ? (
          <div className="user-actions">

            <span>Welcome, {user.name}</span>

            <Link to="/history">
              <button className="login-btn">
                <HistoryIcon size={16} /> History
              </button>
            </Link>

            <button className="login-btn" onClick={logout}>
              <LogOut size={16} /> Logout
            </button>

          </div>
        ) : (
          <Link to="/login">
            <button className="login-btn">
              Login
            </button>
          </Link>
        )}

      </nav>

      {/* HOMEPAGE */}
      <main className="hero">

        <div className="hero-content">

          <span className="tag">
            <ShieldCheck size={16} />
            Real-Time Communication
          </span>

          <h1>
            Connect. Communicate.
            <span> Collaborate.</span>
          </h1>

          <p>
            Connect with people through secure video meetings,
            screen sharing and real-time collaboration.
          </p>

          <div className="meeting-actions">

            <button
              className="create-btn"
              onClick={createMeeting}
            >
              <Plus size={20} /> Create Meeting
            </button>

            <div className="join-box">

              <input
                type="text"
                placeholder="Enter Meeting ID"
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
              />

              <button onClick={joinMeeting}>
                <LogIn size={18} /> Join
              </button>

            </div>

          </div>

        </div>

        <div className="hero-card">

          <Video size={65} />

          <h2>Meet Without Limits</h2>

          <p>
            Video calls, collaboration and communication in one place.
          </p>

          <div className="users">
            <Users size={18} />
            Connect with your team
          </div>

        </div>

      </main>

    </div>
  );
}

// MAIN APP
function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/meeting/:meetingId"
          element={
            <ProtectedRoute>
              <Meeting />
            </ProtectedRoute>
          }
        />

        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;
