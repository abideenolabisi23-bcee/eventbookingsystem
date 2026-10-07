import { useState } from "react";
import {
    Link,
    useNavigate,
} from "react-router-dom";
import axios from "axios";
import "../styles/adminLogin.css";

const AdminLogin = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const [showPassword, setShowPassword] =
        useState(false);

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

    const showFeedback = (type, message) => {
        setFeedback({
            show: true,
            type,
            message,
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (
            !formData.email.trim() ||
            !formData.password
        ) {
            showFeedback(
                "error",
                "Please enter your email address and password."
            );

            return;
        }

        try {
            setLoading(true);

            const response = await axios.post(
                "http://192.168.0.3:5005/api/v1/login",
                {
                    email: formData.email
                        .trim()
                        .toLowerCase(),
                    password: formData.password,
                }
            );

            const data = response.data?.data;

            if (!data) {
                showFeedback(
                    "error",
                    "Unable to retrieve your account information."
                );

                return;
            }

            if (data.role !== "admin") {
                localStorage.removeItem(
                    "accessToken"
                );

                localStorage.removeItem(
                    "refreshToken"
                );

                localStorage.removeItem("role");

                showFeedback(
                    "error",
                    "This account does not have administrator access."
                );

                return;
            }

            localStorage.setItem(
                "accessToken",
                data.accessToken
            );

            localStorage.setItem(
                "refreshToken",
                data.refreshToken
            );

            localStorage.setItem(
                "role",
                data.role
            );

            localStorage.setItem(
                "firstname",
                data.firstname || ""
            );

            localStorage.setItem(
                "lastname",
                data.lastname || ""
            );

            showFeedback(
                "success",
                "Admin login successful. Opening your dashboard..."
            );

            setTimeout(() => {
                navigate(
                    "/admin/dashboard",
                    {
                        replace: true,
                    }
                );
            }, 900);
        } catch (error) {
            const message =
                error.response?.data?.message ||
                "Unable to login at this time.";

            showFeedback(
                "error",
                message
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-page">
            <div className="admin-login-decoration admin-login-decoration-one"></div>

            <div className="admin-login-decoration admin-login-decoration-two"></div>

            <div className="admin-login-container">
                <div className="admin-login-brand">
                    <div className="admin-login-brand-badge">
                        V
                    </div>

                    <p className="admin-login-brand-name">
                        VIBELY
                    </p>

                    <span className="admin-login-brand-label">
                        ADMINISTRATION
                    </span>

                    <h1>
                        Manage every experience from one
                        place.
                    </h1>

                    <p className="admin-login-brand-description">
                        Secure administrative access to
                        users, providers, events,
                        apartments, food, bookings and
                        payments across Vibely.
                    </p>

                    <div className="admin-login-security">
                        <span className="admin-login-security-icon">
                            <i className="bi bi-shield-lock"></i>
                        </span>

                        <div>
                            <strong>
                                Protected workspace
                            </strong>

                            <p>
                                Only authorized Vibely
                                administrators can access
                                this portal.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="admin-login-card">
                    <div className="admin-login-card-top">
                        <span className="admin-login-small-label">
                            ADMIN PORTAL
                        </span>

                        <h2>Welcome back</h2>

                        <p>
                            Sign in with your
                            administrator account to
                            continue.
                        </p>
                    </div>

                    {feedback.show && (
                        <div
                            className={`admin-login-feedback ${feedback.type}`}
                        >
                            <span>
                                <i
                                    className={
                                        feedback.type ===
                                            "success"
                                            ? "bi bi-check-circle-fill"
                                            : "bi bi-exclamation-circle-fill"
                                    }
                                ></i>
                            </span>

                            <p>
                                {feedback.message}
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    setFeedback({
                                        show: false,
                                        type: "",
                                        message: "",
                                    })
                                }
                            >
                                <i className="bi bi-x"></i>
                            </button>
                        </div>
                    )}

                    <form
                        className="admin-login-form"
                        onSubmit={handleSubmit}
                    >
                        <div className="admin-login-field">
                            <label htmlFor="adminEmail">
                                Email address
                            </label>

                            <div className="admin-login-input-wrap">
                                <i className="bi bi-envelope"></i>

                                <input
                                    id="adminEmail"
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="admin@vibely.com"
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="admin-login-field">
                            <div className="admin-login-password-label">
                                <label htmlFor="adminPassword">
                                    Password
                                </label>

                                <Link
                                    to="/admin/forgot-password"
                                    className="admin-forgot-link"
                                >
                                    Forgot password?
                                </Link>
                            </div>

                            <div className="admin-login-input-wrap">
                                <i className="bi bi-lock"></i>

                                <input
                                    id="adminPassword"
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                />

                                <button
                                    type="button"
                                    className="admin-login-password-toggle"
                                    onClick={() =>
                                        setShowPassword(
                                            (previous) =>
                                                !previous
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

                        <button
                            className="admin-login-submit"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="admin-login-spinner"></span>
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign in to Admin
                                    <i className="bi bi-arrow-right"></i>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="admin-login-footer">
                        <i className="bi bi-shield-check"></i>
                        Authorized personnel only
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;