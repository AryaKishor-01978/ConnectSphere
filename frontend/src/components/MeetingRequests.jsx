
import { useEffect, useState } from "react";

// SERVER URL
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || "https://localhost:5000";

function MeetingRequests({ meetingId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  const fetchRequests = async () => {
    try {
      const response = await fetch(
        `${SERVER_URL}/api/meetings/${encodeURIComponent(meetingId)}/requests`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (response.ok) {
        setRequests(
          (data.requests || []).filter(
            request => request.status === "pending"
          )
        );
      } else {
        console.error(data.message);
      }
    } catch (error) {
      console.error("Fetch requests error:", error);
    } finally {
      setLoading(false);
    }
  };

  const reviewRequest = async (userId, status) => {
    try {
      const response = await fetch(
        `${SERVER_URL}/api/meetings/${encodeURIComponent(meetingId)}/requests/${userId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ status })
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        fetchRequests();
      } else {
        alert(data.message || "Unable to review request");
      }
    } catch (error) {
      console.error("Review request error:", error);
      alert("Unable to connect to the server");
    }
  };

  useEffect(() => {
    fetchRequests();

    const interval = setInterval(fetchRequests, 5000);

    return () => clearInterval(interval);
  }, [meetingId]);

  if (loading) {
    return <p>Loading access requests...</p>;
  }

  return (
    <div className="hero-card">
      <h2>Meeting Access Requests</h2>

      {requests.length === 0 ? (
        <p>No pending requests.</p>
      ) : (
        requests.map(request => (
          <div
            key={request._id}
            style={{
              padding: "12px",
              marginTop: "12px",
              borderBottom: "1px solid #ccc"
            }}
          >
            <h3>{request.user?.name || "Unknown User"}</h3>

            <p>{request.user?.email}</p>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="create-btn"
                onClick={() =>
                  reviewRequest(request.user._id, "approved")
                }
              >
                Approve
              </button>

              <button
                className="login-btn"
                onClick={() =>
                  reviewRequest(request.user._id, "rejected")
                }
              >
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default MeetingRequests;
