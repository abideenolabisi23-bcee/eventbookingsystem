
import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/adminPassword.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({
    show: false,
    type: "",
    message: "",
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      setFeedback({
        show: true,
        type: "error",
        message: "Please enter your email address.",
      });
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        "https://eventbookingsystem-sooty.vercel.app/api/v1/forgot-password",
        {
          email: email.trim().toLowerCase(),
        }
      );

      setFeedback({
        show: true,
        type: "success",
        message:
          response.data?.message ||
          "If your email is registered, you'll receive a password reset link.",
      });
    } catch (error) {
      setFeedback({
        show: true,
        type: "error",
        message:
          error.response?.data?.message ||
          "Unable to send password reset link. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-password-page">
      <div className="admin-password-card">
        <div className="admin-password-logo">V</div>

        <span className="admin-password-label">
          VIBELY ACCOUNT
        </span>

        <h1>Forgot your password?</h1>

        <p className="admin-password-description">
          Enter the email address connected to your Vibely
          account and we'll send you a password reset link.
        </p>

        {feedback.show && (
          <div
            className={`admin-password-feedback ${feedback.type}`}
            role={feedback.type === "error" ? "alert" : "status"}
          >
            <i
              className={
                feedback.type === "success"
                  ? "bi bi-check-circle-fill"
                  : "bi bi-exclamation-circle-fill"
              }
            />
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="admin-password-field">
            <label htmlFor="user-reset-email">
              Email address
            </label>

            <div className="admin-password-input">
              <i className="bi bi-envelope" />
              <input
                id="user-reset-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email address"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="admin-password-button"
            disabled={loading}
          >
            {loading ? "Sending reset link..." : "Send reset link"}
          </button>
        </form>

        <Link to="/login" className="admin-password-back">
          <i className="bi bi-arrow-left" />
          Back to Login
        </Link>

        <div className="admin-password-secure">
          <i className="bi bi-shield-lock" />
          Secure account recovery
        </div>
      </div>
    </main>
  );
};

export default ForgotPassword;
