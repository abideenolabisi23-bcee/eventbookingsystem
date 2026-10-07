import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import Navbar from "../component/Navbar";
import DetailFooter from "../component/DetailFooter";
import vibelyLogo from "../assets/vibely-logo.png";

import "../styles/changePassword.css";

const ChangePassword = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !formData.currentPassword ||
      !formData.newPassword ||
      !formData.confirmPassword
    ) {
      setError(
        "Please fill in all password fields."
      );

      return;
    }

    if (formData.newPassword.length < 8) {
      setError(
        "New password must be at least 8 characters."
      );

      return;
    }

    if (
      formData.newPassword !==
      formData.confirmPassword
    ) {
      setError(
        "New passwords do not match."
      );

      return;
    }

    const accessToken =
      localStorage.getItem("accessToken");

    if (!accessToken) {
      navigate("/login", {
        state: {
          returnTo: "/change-password",
        },
      });

      return;
    }

    try {
      setLoading(true);

      const response = await axios.patch(
        "https://eventbookingsystem-sooty.vercel.app/api/v1/change-password",
        formData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setSuccess(response.data.message);

      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      console.log(
        "CHANGE PASSWORD ERROR:",
        error
      );

      if (error.response?.status === 401) {
        localStorage.removeItem(
          "accessToken"
        );

        localStorage.removeItem(
          "refreshToken"
        );

        navigate("/login", {
          state: {
            returnTo: "/change-password",
          },
        });

        return;
      }

      setError(
        error.response?.data?.message ||
        "Unable to change password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="change-password-page">
        <section className="change-password-hero">
          <div className="change-password-hero-circle change-circle-one"></div>
          <div className="change-password-hero-circle change-circle-two"></div>

          <div className="change-password-hero-inner">
            <div className="change-password-hero-copy">
              <span>
                ACCOUNT SECURITY
              </span>

              <h1>
                Protect your
                <em> account.</em>
              </h1>

              <p>
                Keep your Vibely account
                secure by updating your
                password whenever you need
                to.
              </p>
            </div>

            <div className="change-password-hero-card">
              <img
                src={vibelyLogo}
                alt="Vibely"
              />

              <div>
                <span>
                  SECURITY CENTER
                </span>

                <strong>
                  Change Password
                </strong>

                <p>
                  SECURE · PRIVATE · VIBELY
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="change-password-container">
          <div className="change-password-layout">
            <aside className="change-password-security-card">
              <div className="change-security-icon">
                <i className="bi bi-shield-lock"></i>
              </div>

              <span className="change-security-eyebrow">
                STAY SECURE
              </span>

              <h2>
                A stronger password keeps
                your account safer.
              </h2>

              <p>
                Choose a password that is
                difficult for someone else
                to guess and different from
                passwords you use elsewhere.
              </p>

              <div className="change-security-tips">
                <div>
                  <i className="bi bi-check-circle-fill"></i>

                  <span>
                    Use at least 8 characters
                  </span>
                </div>

                <div>
                  <i className="bi bi-check-circle-fill"></i>

                  <span>
                    Avoid easy-to-guess
                    passwords
                  </span>
                </div>

                <div>
                  <i className="bi bi-check-circle-fill"></i>

                  <span>
                    Keep your password
                    private
                  </span>
                </div>
              </div>

              <div className="change-security-bottom">
                <i className="bi bi-lock-fill"></i>

                <div>
                  <strong>
                    Account Security
                  </strong>

                  <span>
                    Your password is never
                    displayed.
                  </span>
                </div>
              </div>
            </aside>

            <div className="change-password-card">
              <div className="change-password-card-heading">
                <div className="change-password-lock">
                  <i className="bi bi-key"></i>
                </div>

                <div>
                  <p className="change-password-label">
                    PASSWORD SETTINGS
                  </p>

                  <h2>
                    Change Password
                  </h2>
                </div>
              </div>

              <p className="change-password-description">
                Enter your current password,
                then choose and confirm your
                new password.
              </p>

              {error && (
                <div className="change-password-error">
                  <i className="bi bi-exclamation-circle-fill"></i>

                  <div>
                    <strong>
                      Password not changed
                    </strong>

                    <span>{error}</span>
                  </div>
                </div>
              )}

              {success && (
                <div className="change-password-success">
                  <i className="bi bi-check-circle-fill"></i>

                  <div>
                    <strong>
                      Password changed
                    </strong>

                    <span>
                      {success} Redirecting
                      you to login...
                    </span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="change-password-field">
                  <label htmlFor="currentPassword">
                    Current Password
                  </label>

                  <div className="change-password-input">
                    <i className="bi bi-lock"></i>

                    <input
                      id="currentPassword"
                      type={
                        showCurrentPassword
                          ? "text"
                          : "password"
                      }
                      name="currentPassword"
                      value={
                        formData.currentPassword
                      }
                      onChange={handleChange}
                      placeholder="Enter current password"
                      autoComplete="current-password"
                    />

                    <button
                      type="button"
                      className="password-eye-button"
                      onClick={() =>
                        setShowCurrentPassword(
                          (previous) =>
                            !previous
                        )
                      }
                      aria-label={
                        showCurrentPassword
                          ? "Hide current password"
                          : "Show current password"
                      }
                    >
                      <i
                        className={
                          showCurrentPassword
                            ? "bi bi-eye-slash"
                            : "bi bi-eye"
                        }
                      ></i>
                    </button>
                  </div>
                </div>

                <div className="change-password-divider">
                  <span>NEW PASSWORD</span>
                </div>

                <div className="change-password-field">
                  <label htmlFor="newPassword">
                    New Password
                  </label>

                  <div className="change-password-input">
                    <i className="bi bi-shield-lock"></i>

                    <input
                      id="newPassword"
                      type={
                        showNewPassword
                          ? "text"
                          : "password"
                      }
                      name="newPassword"
                      value={
                        formData.newPassword
                      }
                      onChange={handleChange}
                      placeholder="Enter new password"
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      className="password-eye-button"
                      onClick={() =>
                        setShowNewPassword(
                          (previous) =>
                            !previous
                        )
                      }
                      aria-label={
                        showNewPassword
                          ? "Hide new password"
                          : "Show new password"
                      }
                    >
                      <i
                        className={
                          showNewPassword
                            ? "bi bi-eye-slash"
                            : "bi bi-eye"
                        }
                      ></i>
                    </button>
                  </div>

                  <small>
                    <i className="bi bi-info-circle"></i>
                    Password must be at least
                    8 characters.
                  </small>
                </div>

                <div className="change-password-field">
                  <label htmlFor="confirmPassword">
                    Confirm New Password
                  </label>

                  <div className="change-password-input">
                    <i className="bi bi-shield-check"></i>

                    <input
                      id="confirmPassword"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      name="confirmPassword"
                      value={
                        formData.confirmPassword
                      }
                      onChange={handleChange}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      className="password-eye-button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (previous) =>
                            !previous
                        )
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirmed password"
                          : "Show confirmed password"
                      }
                    >
                      <i
                        className={
                          showConfirmPassword
                            ? "bi bi-eye-slash"
                            : "bi bi-eye"
                        }
                      ></i>
                    </button>
                  </div>

                  {formData.confirmPassword &&
                    formData.newPassword ===
                    formData.confirmPassword && (
                      <small className="password-match">
                        <i className="bi bi-check-circle-fill"></i>
                        Passwords match
                      </small>
                    )}
                </div>

                <button
                  type="submit"
                  disabled={loading || success}
                  className="change-password-button"
                >
                  {loading ? (
                    <>
                      <span className="change-button-spinner"></span>
                      Changing Password...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-shield-check"></i>
                      Change Password
                      <i className="bi bi-arrow-right"></i>
                    </>
                  )}
                </button>
              </form>

              <div className="change-password-card-footer">
                <Link
                  to="/profile"
                  className="change-password-back"
                >
                  <i className="bi bi-arrow-left"></i>
                  Back to Profile
                </Link>

                <span>
                  <i className="bi bi-lock-fill"></i>
                  Secure account settings
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <DetailFooter />
    </>
  );
};

export default ChangePassword;