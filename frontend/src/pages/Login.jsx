
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Video, Mail, Lock, LogIn } from "lucide-react";
import "../Auth.css";

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || "https://localhost:5000";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!email.trim() || !password) {
      setMessage("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${SERVER_URL}/api/auth/login`,
        {
          email: email.trim().toLowerCase(),
          password
        }
      );

      localStorage.setItem("token", response.data.token);

      localStorage.setItem(
        "user",
        JSON.stringify(response.data.user)
      );

      setMessage("Login successful! Redirecting to homepage...");

      setTimeout(() => {
        navigate("/");
      }, 1500);

    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        "Login failed. Please check your details."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <Video size={35} />
          <h2>ConnectSphere</h2>
        </div>

        <h1>Welcome Back!</h1>

        <p className="auth-subtitle">
          Login to continue your meetings.
        </p>

        {message && <p role="status">{message}</p>}

        <form onSubmit={handleLogin}>
          <label>Email Address</label>

          <div className="auth-input">
            <Mail size={19} />
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
            <Lock size={19} />
            <input
              type="password"
              placeholder="Enter your password"
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
            <LogIn size={19} />
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{" "}
          <Link to="/register">Create Account</Link>
        </p>

        <Link to="/" className="back-home">
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default Login;
