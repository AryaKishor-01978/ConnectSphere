
import MeetingRequests from "../components/MeetingRequests";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Video, ArrowLeft, Clock } from "lucide-react";

// SERVER URL
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || "https://localhost:5000";

function History() {
  const navigate = useNavigate();

  const currentUser = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${SERVER_URL}/api/meetings`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await response.json();

        if (response.ok) {
          setMeetings(data.meetings || []);
        } else {
          alert(data.message || "Unable to load meeting history");
        }

      } catch (error) {
        console.error("Meeting history error:", error);
        alert("Unable to connect to the server");

      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, []);

  return (
    <div className="app">

      <nav className="navbar">
        <h2>
          <Video /> ConnectSphere
        </h2>

        <button
          className="login-btn"
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={16} /> Back Home
        </button>
      </nav>

      <main className="hero">

        <div className="hero-content">

          <span className="tag">
            <Clock size={16} /> Meeting History
          </span>

          <h1>Previous Meetings</h1>

          {loading ? (
            <p>Loading meeting history...</p>
          ) : meetings.length === 0 ? (
            <p>No meeting history available yet.</p>
          ) : (
            meetings.map((meeting, index) => (
              <div
                className="hero-card"
                key={meeting._id}
              >

                <h2>Meeting {index + 1}</h2>

                <p>
                  Meeting ID: {meeting.meetingId}
                </p>

                <p>
                  Host: {meeting.host?.name || "Unknown"}
                </p>

                <p>
                  Created: {
                    new Date(meeting.createdAt).toLocaleString()
                  }
                </p>

                <button
                  className="create-btn"
                  onClick={() =>
                    navigate(`/meeting/${meeting.meetingId}`)
                  }
                >
                  Open Meeting
                </button>

                {meeting.host?._id === currentUser?.id && (
                  <MeetingRequests
                    meetingId={meeting.meetingId}
                  />
                )}

              </div>
            ))
          )}

        </div>
      </main>
    </div>
  );
}

export default History;
