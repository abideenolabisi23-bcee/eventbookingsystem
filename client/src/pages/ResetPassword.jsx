
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import "../styles/adminPassword.css";

const ResetPassword = () => {
  const { token } = useParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [feedback, setFeedback] = useState({
    show: false,
    type: "",
    message: "",
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token) {
      setFeedback({
        show: true,
        type: "error",
        message: "Invalid password reset link.",
      });
      return;
    }

    if (!password || !confirmPassword) {
      setFeedback({
        show: true,
        type: "error",
        message: "Please fill in both password fields.",
      });
      return;
    }

    if (password.length < 8) {
      setFeedback({
        show: true,
        type: "error",
        message: "Password must contain at least 8 characters.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setFeedback({
        show: true,
        type: "error",
        message: "Passwords do not match.",
      });
      return;
    }

    try {
      setLoading(true);

      setFeedback({
        show: false,
        type: "",
        message: "",
      });

      const response = await axios.patch(
        `https://eventbookingsystem-sooty.vercel.app/api/v1/reset-password/${encodeURIComponent(token)}`,
        {
          password,
          confirmPassword,
        }
      );

      setSuccess(true);

      setFeedback({
        show: true,
        type: "success",
        message:
          response.data?.message ||
          "Your password has been reset successfully. You can now log in.",
      });

      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setFeedback({
        show: true,
        type: "error",
        message:
          error.response?.data?.message ||
          "Unable to reset password. Your reset link may have expired. Please request a new link.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-password-page">
      <div className="admin-password-card">
        <div className="admin-password-logo">
          V
        </div>

        <span className="admin-password-label">
          VIBELY ACCOUNT
        </span>

        <h1>
          {success
            ? "Password reset successful!"
            : "Reset your password"}
        </h1>

        <p className="admin-password-description">
          {success
            ? "Your Vibely account password has been updated. You can now sign in with your new password."
            : "Enter your new password below to securely regain access to your Vibely account."}
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
            ></i>

            <span>{feedback.message}</span>
          </div>
        )}

        {!success ? (
          <form onSubmit={handleSubmit}>
            <div className="admin-password-field">
              <label htmlFor="new-password">
                New password
              </label>

              <div className="admin-password-input">
                <i className="bi bi-lock"></i>

                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
            </div>

            <div className="admin-password-field">
              <label htmlFor="confirm-password">
                Confirm new password
              </label>

              <div className="admin-password-input">
                <i className="bi bi-shield-lock"></i>

                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="admin-password-button"
              disabled={loading}
            >
              {loading
                ? "Resetting password..."
                : "Reset Password"}
            </button>
          </form>
        ) : (
          <Link
            to="/login"
            className="admin-password-back"
          >
            Continue to Login
          </Link>
        )}

        {!success && (
          <Link
            to="/login"
            className="admin-password-back"
          >
            <i className="bi bi-arrow-left"></i>
            Back to Login
          </Link>
        )}

        <div className="admin-password-secure">
          <i className="bi bi-shield-lock"></i>
          Secure password recovery
        </div>
      </div>
    </main>
  );
};

export default ResetPassword;
