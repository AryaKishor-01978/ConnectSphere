
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Video,
  User,
  Mail,
  Lock,
  UserPlus
} from "lucide-react";
import "../Auth.css";

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || "https://localhost:5000";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!name.trim() || !email.trim() || !password) {
      setMessage("Please fill in all fields.");
      return;
    }

    if (password.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${SERVER_URL}/api/auth/register`,
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password
        }
      );

      console.log("Registration Response:", response.data);

      setMessage("Registration successful!");

      setName("");
      setEmail("");
      setPassword("");

      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch (error) {
      console.error(
        "Registration Error:",
        error.response?.data || error.message
      );

      setMessage(
        error.response?.data?.message ||
        "Registration failed. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-logo">
          <Video size={30} />
          <h2>ConnectSphere</h2>
        </div>

        <h1>Create Account</h1>

        <p className="auth-subtitle">
          Join ConnectSphere and start collaborating.
        </p>

        {message && (
          <p
            className="auth-message"
            style={{
              color: message === "Registration successful!"
                ? "#22c55e"
                : "#ef4444"
            }}
          >
            {message}
          </p>
        )}

        <form onSubmit={handleRegister}>

          <label>Full Name</label>

          <div className="auth-input">
            <User size={18} />
            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <label>Email Address</label>

          <div className="auth-input">
            <Mail size={18} />
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <label>Password</label>

          <div className="auth-input">
            <Lock size={18} />
            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            <UserPlus size={18} />
            {loading ? "Creating Account..." : "Create Account"}
          </button>

        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link to="/login">Login</Link>
        </p>

        <Link to="/" className="back-home">
          Back to Home
        </Link>

      </div>
    </div>
  );
}

export default Register;
