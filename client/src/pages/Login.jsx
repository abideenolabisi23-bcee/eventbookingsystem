
import axios from "axios";
import { useFormik } from "formik";
import { Link, useLocation, useNavigate } from "react-router-dom";
import * as yup from "yup";
import { useEffect, useRef, useState } from "react";

import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/login.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTimer = useRef(null);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState(
    location.state?.notification || null
  );

  const returnTo = location.state?.returnTo || "/";

  useEffect(() => {
    if (!notification) return;

    const timer = setTimeout(() => {
      setNotification(null);
    }, 4500);

    return () => clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  const formik = useFormik({
    initialValues: {
      email: "",
      password: ""
    },

    validationSchema: yup.object({
      email: yup
        .string()
        .required("Email is required")
        .email("Please enter a valid email"),

      password: yup
        .string()
        .required("Password is required")
    }),

    onSubmit: async (values) => {
      try {
        setLoading(true);
        setNotification(null);

        const response = await axios.post(
          `${API_URL}/login`,
          values
        );

        const responseData = response.data?.data || {};

        const accessToken = responseData.accessToken;
        const refreshToken = responseData.refreshToken;

        const role =
          responseData.user?.role ||
          responseData.role;

        if (role !== "user") {
          setNotification({
            type: "error",
            title: "Customer account required",
            message:
              "This login is for Vibely customers only. Please sign in with your personal customer account. Organizer and admin accounts cannot be used here."
          });
          return;
        }

        if (!accessToken) {
          setNotification({
            type: "error",
            title: "Login unsuccessful",
            message:
              "Your access token was not returned. Please try again."
          });
          return;
        }

        localStorage.setItem("accessToken", accessToken);

        if (refreshToken) {
          localStorage.setItem("refreshToken", refreshToken);
        } else {
          localStorage.removeItem("refreshToken");
        }

        localStorage.setItem("role", "user");

        setNotification({
          type: "success",
          title: "Login successful",
          message:
            "Welcome back to Vibely! Taking you to your account."
        });

        const isValidCustomerDestination =
          typeof returnTo === "string" &&
          returnTo.startsWith("/") &&
          !returnTo.startsWith("//") &&
          !returnTo.startsWith("/\\") &&
          !/^\/(?:organizer|admin)(?:\/|$|\?|#)/i.test(returnTo) &&
          !/^\/(?:login|signup)(?:\/|$|\?|#)/i.test(returnTo);

        const destination = isValidCustomerDestination
          ? returnTo
          : "/";

        redirectTimer.current = setTimeout(() => {
          navigate(destination, {
            replace: true
          });
        }, 1600);
      } catch (error) {
        console.log("LOGIN ERROR:", error);

        const backendMessage =
          error.response?.data?.message ||
          "Unable to sign in. Please try again.";

        const lowerMessage = backendMessage.toLowerCase();

        let title = "Login unsuccessful";

        if (lowerMessage.includes("password")) {
          title = "Incorrect password";
        } else if (
          lowerMessage.includes("not found") ||
          lowerMessage.includes("does not exist") ||
          lowerMessage.includes("no user")
        ) {
          title = "Account not found";
        } else if (error.response?.status === 403) {
          title = "Access unavailable";
        }

        setNotification({
          type: "error",
          title,
          message: backendMessage
        });
      } finally {
        setLoading(false);
      }
    }
  });

  const goToSignup = () => {
    navigate("/signup", {
      state: {
        returnTo
      }
    });
  };

  const goToForgotPassword = () => {
    navigate("/forgot-password", {
      state: {
        returnTo
      }
    });
  };

  return (
    <main className="auth-login-page">
      <div className="auth-login-glow auth-login-glow-one"></div>
      <div className="auth-login-glow auth-login-glow-two"></div>
      <div className="auth-login-glow auth-login-glow-three"></div>

      <div className="auth-login-ring auth-login-ring-one"></div>
      <div className="auth-login-ring auth-login-ring-two"></div>

      <Link to="/" className="auth-login-home">
        <i className="bi bi-arrow-left"></i>
        Back to home
      </Link>

      <section className="auth-login-layout">
        <div className="auth-login-intro">
          <Link to="/" className="auth-login-brand">
            <div className="auth-login-logo-shell">
              <img src={vibelyLogo} alt="Vibely" />
            </div>

            <div>
              <h1>Vibely</h1>
              <span>EVENTS · APARTMENTS · FOOD</span>
            </div>
          </Link>

          <div className="auth-login-intro-copy">
            <span className="auth-login-kicker">
              WELCOME BACK
            </span>

            <h2>
              Your next vibe
              <br />
              is just a <em>sign in away.</em>
            </h2>

            <p>
              Come back to the experiences you love.
              Discover events, book beautiful apartments
              and order your favourite food — all in one
              place.
            </p>
          </div>

          <div className="auth-login-mini-cards">
            <div className="auth-login-mini-card">
              <div>
                <i className="bi bi-ticket-perforated"></i>
              </div>
              <span>
                <strong>Events</strong>
                Feel the moment
              </span>
            </div>

            <div className="auth-login-mini-card">
              <div>
                <i className="bi bi-buildings"></i>
              </div>
              <span>
                <strong>Apartments</strong>
                Find your space
              </span>
            </div>

            <div className="auth-login-mini-card">
              <div>
                <i className="bi bi-bag-heart"></i>
              </div>
              <span>
                <strong>Food</strong>
                Taste the vibe
              </span>
            </div>
          </div>

          <div className="auth-login-quote">
            <span>“</span>
            <p>
              Beautiful experiences should be easy to find,
              book and remember.
            </p>
          </div>
        </div>

        <div className="auth-login-card-wrap">
          <div className="auth-login-floating-badge">
            <i className="bi bi-stars"></i>
            FIND YOUR VIBE
          </div>

          <div className="auth-login-card">
            <div className="auth-login-card-shine"></div>

            <div className="auth-login-mobile-logo">
              <img src={vibelyLogo} alt="Vibely" />
              <strong>Vibely</strong>
            </div>

            {notification && (
              <div
                className={`auth-form-message auth-form-message-${notification.type}`}
              >
                <div className="auth-form-message-icon">
                  <i
                    className={
                      notification.type === "success"
                        ? "bi bi-check-lg"
                        : "bi bi-exclamation-lg"
                    }
                  ></i>
                </div>

                <div className="auth-form-message-content">
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                </div>

                <button
                  type="button"
                  className="auth-form-message-close"
                  onClick={() => setNotification(null)}
                >
                  <i className="bi bi-x-lg"></i>
                </button>

                <span className="auth-form-message-progress"></span>
              </div>
            )}

            <div className="auth-login-heading">
              <span>MEMBER ACCESS</span>
              <h2>Welcome back</h2>
              <p>
                Sign in to continue your Vibely experience.
              </p>
            </div>

            <form
              onSubmit={formik.handleSubmit}
              className="auth-login-form"
              noValidate
            >
              <div className="auth-login-field">
                <label htmlFor="email">
                  Email address
                </label>

                <div
                  className={`auth-login-input ${
                    formik.touched.email &&
                    formik.errors.email
                      ? "auth-login-input-error"
                      : ""
                  }`}
                >
                  <div className="auth-login-input-icon">
                    <i className="bi bi-envelope"></i>
                  </div>

                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Enter your email address"
                    autoComplete="email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                </div>

                {formik.touched.email &&
                  formik.errors.email && (
                    <p className="auth-login-error">
                      <i className="bi bi-exclamation-circle"></i>
                      {formik.errors.email}
                    </p>
                  )}
              </div>

              <div className="auth-login-field">
                <label htmlFor="password">
                  Password
                </label>

                <div
                  className={`auth-login-input ${
                    formik.touched.password &&
                    formik.errors.password
                      ? "auth-login-input-error"
                      : ""
                  }`}
                >
                  <div className="auth-login-input-icon">
                    <i className="bi bi-lock"></i>
                  </div>

                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />

                  <button
                    type="button"
                    className="auth-login-eye"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
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

                {formik.touched.password &&
                  formik.errors.password && (
                    <p className="auth-login-error">
                      <i className="bi bi-exclamation-circle"></i>
                      {formik.errors.password}
                    </p>
                  )}

                <div className="auth-login-forgot-row">
                  <button
                    type="button"
                    onClick={goToForgotPassword}
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="auth-login-submit"
                disabled={
                  !formik.isValid ||
                  !formik.dirty ||
                  loading
                }
              >
                {loading ? (
                  <>
                    <span className="auth-login-spinner"></span>
                    Signing you in...
                  </>
                ) : (
                  <>
                    <span>Sign in to Vibely</span>
                    <i className="bi bi-arrow-right"></i>
                  </>
                )}
              </button>
            </form>

            <div className="auth-login-divider">
              <span></span>
              <p>OR</p>
              <span></span>
            </div>

            <div className="auth-login-new">
              <div className="auth-login-new-icon">
                <i className="bi bi-person-heart"></i>
              </div>

              <div>
                <span>NEW TO VIBELY?</span>
                <h3>Start your experience</h3>
                <p>
                  Create one account for events,
                  apartments and food.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="auth-login-create"
              onClick={goToSignup}
            >
              Create an account
              <i className="bi bi-arrow-up-right"></i>
            </button>

            <div className="auth-login-secure">
              <i className="bi bi-shield-check"></i>
              <span>
                Secure access to your Vibely account
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="auth-login-bottom">
        <span>© 2026 VIBELY</span>

        <div>
          <span>CREATE.</span>
          <span>BOOK.</span>
          <span>EXPERIENCE.</span>
        </div>
      </div>
    </main>
  );
};

export default Login;
