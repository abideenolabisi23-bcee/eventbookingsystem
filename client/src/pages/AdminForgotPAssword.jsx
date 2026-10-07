import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/adminPassword.css";

const AdminForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] =
        useState(false);

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
                message:
                    "Please enter your admin email address.",
            });

            return;
        }

        try {
            setLoading(true);

            const response = await axios.post(
                "http://192.168.0.3:5005/api/v1/forgot-password",
                {
                    email: email
                        .trim()
                        .toLowerCase(),
                }
            );

            setFeedback({
                show: true,
                type: "success",
                message:
                    response.data?.message ||
                    "Password reset link sent to your email.",
            });
        } catch (error) {
            setFeedback({
                show: true,
                type: "error",
                message:
                    error.response?.data?.message ||
                    "Unable to send password reset link.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-password-page">
            <div className="admin-password-card">
                <div className="admin-password-logo">
                    V
                </div>

                <span className="admin-password-label">
                    VIBELY ADMIN
                </span>

                <h1>Forgot your password?</h1>

                <p className="admin-password-description">
                    Enter the email address connected
                    to your administrator account and
                    we'll send you a secure password
                    reset link.
                </p>

                {feedback.show && (
                    <div
                        className={`admin-password-feedback ${feedback.type}`}
                    >
                        <i
                            className={
                                feedback.type === "success"
                                    ? "bi bi-check-circle-fill"
                                    : "bi bi-exclamation-circle-fill"
                            }
                        ></i>

                        <span>
                            {feedback.message}
                        </span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="admin-password-field">
                        <label htmlFor="email">
                            Admin email address
                        </label>

                        <div className="admin-password-input">
                            <i className="bi bi-envelope"></i>

                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(event) =>
                                    setEmail(
                                        event.target.value
                                    )
                                }
                                placeholder="admin@vibely.com"
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="admin-password-button"
                        disabled={loading}
                    >
                        {loading
                            ? "Sending reset link..."
                            : "Send reset link"}
                    </button>
                </form>

                <Link
                    to="/admin/login"
                    className="admin-password-back"
                >
                    <i className="bi bi-arrow-left"></i>
                    Back to Admin Login
                </Link>

                <div className="admin-password-secure">
                    <i className="bi bi-shield-lock"></i>
                    Secure administrator recovery
                </div>
            </div>
        </div>
    );
};

export default AdminForgotPassword;