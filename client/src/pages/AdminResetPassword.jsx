import { useState } from "react";
import {
    Link,
    useNavigate,
    useParams,
} from "react-router-dom";
import axios from "axios";
import "../styles/adminPassword.css";

const AdminResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        password: "",
        confirmPassword: "",
    });

    const [showPassword, setShowPassword] =
        useState(false);

    const [
        showConfirmPassword,
        setShowConfirmPassword,
    ] = useState(false);

    const [loading, setLoading] =
        useState(false);

    const [feedback, setFeedback] = useState({
        show: false,
        type: "",
        message: "",
    });

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));

        if (feedback.show) {
            setFeedback({
                show: false,
                type: "",
                message: "",
            });
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (
            !formData.password ||
            !formData.confirmPassword
        ) {
            setFeedback({
                show: true,
                type: "error",
                message:
                    "Please complete both password fields.",
            });

            return;
        }

        if (formData.password.length < 8) {
            setFeedback({
                show: true,
                type: "error",
                message:
                    "Password must be at least 8 characters.",
            });

            return;
        }

        if (
            formData.password !==
            formData.confirmPassword
        ) {
            setFeedback({
                show: true,
                type: "error",
                message:
                    "Passwords do not match.",
            });

            return;
        }

        if (!token) {
            setFeedback({
                show: true,
                type: "error",
                message:
                    "Password reset link is invalid.",
            });

            return;
        }

        try {
            setLoading(true);

            const response = await axios.patch(
                `http://192.168.0.3:5005/api/v1/reset-password/${token}`,
                {
                    password: formData.password,
                    confirmPassword:
                        formData.confirmPassword,
                }
            );

            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("role");
            localStorage.removeItem("firstname");
            localStorage.removeItem("lastname");

            setFeedback({
                show: true,
                type: "success",
                message:
                    response.data?.message ||
                    "Password reset successfully.",
            });

            setTimeout(() => {
                navigate("/admin/login", {
                    replace: true,
                });
            }, 1500);
        } catch (error) {
            const message =
                error.response?.data?.message ||
                "Unable to reset password.";

            setFeedback({
                show: true,
                type: "error",
                message,
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

                <h1>Create a new password</h1>

                <p className="admin-password-description">
                    Choose a secure new password for
                    your administrator account.
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

                        <span>{feedback.message}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="admin-password-field">
                        <label htmlFor="password">
                            New password
                        </label>

                        <div className="admin-password-input">
                            <i className="bi bi-lock"></i>

                            <input
                                id="password"
                                type={
                                    showPassword
                                        ? "text"
                                        : "password"
                                }
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter new password"
                                autoComplete="new-password"
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    setShowPassword(
                                        (previous) => !previous
                                    )
                                }
                            >
                                <i
                                    className={
                                        showPassword
                                            ? "bi bi-eye-slash"
                                            : "bi bi-eye"
                                    }
                                ></i>
                            </button>
                        </div>
                    </div>

                    <div className="admin-password-field">
                        <label htmlFor="confirmPassword">
                            Confirm new password
                        </label>

                        <div className="admin-password-input">
                            <i className="bi bi-lock-fill"></i>

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
                                onClick={() =>
                                    setShowConfirmPassword(
                                        (previous) => !previous
                                    )
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
                    </div>

                    <button
                        type="submit"
                        className="admin-password-button"
                        disabled={loading}
                    >
                        {loading
                            ? "Updating password..."
                            : "Reset password"}
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
                    <i className="bi bi-shield-check"></i>
                    Your new password will be securely
                    encrypted
                </div>
            </div>
        </div>
    );
};

export default AdminResetPassword;