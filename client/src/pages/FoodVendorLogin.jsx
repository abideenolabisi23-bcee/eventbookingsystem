
import axios from "axios";
import { useFormik } from "formik";
import { Link, useLocation, useNavigate } from "react-router-dom";
import * as yup from "yup";
import { useEffect, useRef, useState } from "react";

import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/foodVendorLogin.css";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1"
).replace(/\/+$/, "");

const FoodVendorLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTimer = useRef(null);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState(
    location.state?.notification || null
  );

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
        .trim()
        .required("Email address is required")
        .email("Please enter a valid email address"),

      password: yup
        .string()
        .required("Password is required")
    }),

    onSubmit: async (values) => {
      try {
        setLoading(true);
        setNotification(null);

        const response = await axios.post(`${API_URL}/login`, {
          email: values.email.trim().toLowerCase(),
          password: values.password
        });

        const data = response.data?.data;
        const accessToken = data?.accessToken;
        const refreshToken = data?.refreshToken;
        const role = data?.user?.role || data?.role;

        if (role !== "food_vendor") {
          setNotification({
            type: "error",
            title: "Food vendor access only",
            message:
              "This account is not registered as a food vendor. Please use the correct sign-in page."
          });
          return;
        }

        if (!accessToken) {
          throw new Error("No access token was returned.");
        }

        const profileResponse = await axios.get(
          `${API_URL}/profile`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );

        const profileData = profileResponse.data?.data;
        const profile = profileData?.user || profileData;

        if (!profile || profile.role !== "food_vendor") {
          setNotification({
            type: "error",
            title: "Account verification failed",
            message:
              "We could not verify your food vendor account."
          });
          return;
        }

        if (profile.accountStatus === "suspended") {
          setNotification({
            type: "error",
            title: "Account suspended",
            message:
              "Your food vendor account is suspended. Please contact support."
          });
          return;
        }

        if (profile.approvalStatus === "pending") {
          setNotification({
            type: "error",
            title: "Approval pending",
            message:
              "Your food vendor application is still awaiting admin approval. You will be able to access your dashboard after approval."
          });
          return;
        }

        if (profile.approvalStatus === "rejected") {
          setNotification({
            type: "error",
            title: "Application not approved",
            message:
              "Your food vendor application was not approved. Please contact support for assistance."
          });
          return;
        }

        if (profile.approvalStatus !== "approved") {
          setNotification({
            type: "error",
            title: "Access unavailable",
            message:
              "Your food vendor approval status could not be confirmed."
          });
          return;
        }

        localStorage.setItem("foodVendorAccessToken", accessToken);

        if (refreshToken) {
          localStorage.setItem(
            "foodVendorRefreshToken",
            refreshToken
          );
        } else {
          localStorage.removeItem("foodVendorRefreshToken");
        }

        localStorage.setItem("foodVendorRole", "food_vendor");

        setNotification({
          type: "success",
          title: "Login successful",
          message:
            "Welcome back! Opening your food vendor dashboard..."
        });

        redirectTimer.current = setTimeout(() => {
          navigate("/food-vendor/dashboard", {
            replace: true
          });
        }, 1600);
      } catch (error) {
        const backendMessage =
          error.response?.data?.message ||
          "Unable to sign in. Please check your details and try again.";

        const message = backendMessage.toLowerCase();

        let title = "Login unsuccessful";

        if (
          message.includes("password") ||
          message.includes("credential")
        ) {
          title = "Incorrect login details";
        } else if (
          message.includes("suspend") ||
          message.includes("inactive")
        ) {
          title = "Account unavailable";
        } else if (
          message.includes("not found") ||
          message.includes("does not exist")
        ) {
          title = "Account not found";
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

  return (
    <main className="food-vendor-login-page">
      <div className="food-vendor-login-glow food-vendor-login-glow-one" />
      <div className="food-vendor-login-glow food-vendor-login-glow-two" />

      <Link to="/" className="food-vendor-login-home">
        <i className="bi bi-arrow-left" />
        Back to home
      </Link>

      <section className="food-vendor-login-layout">
        <div className="food-vendor-login-intro">
          <Link to="/" className="food-vendor-login-brand">
            <img src={vibelyLogo} alt="Vibely" />

            <div>
              <h1>Vibely</h1>
              <span>FOOD VENDOR</span>
            </div>
          </Link>

          <div className="food-vendor-login-intro-copy">
            <span>FOOD VENDOR WORKSPACE</span>

            <h2>
              Your kitchen.
              <br />
              Your orders.
              <br />
              <em>Your success.</em>
            </h2>

            <p>
              Welcome back to your Vibely food business.
              Sign in to manage your menu, process customer
              orders, and grow your business.
            </p>
          </div>

          <div className="food-vendor-login-features">
            <div>
              <i className="bi bi-cup-hot" />

              <span>
                <strong>Your food menu</strong>
                Add, edit, and manage your meals.
              </span>
            </div>

            <div>
              <i className="bi bi-bag-check" />

              <span>
                <strong>Your customer orders</strong>
                View and process incoming food orders.
              </span>
            </div>

            <div>
              <i className="bi bi-graph-up-arrow" />

              <span>
                <strong>Your food business</strong>
                Track sales and business activity.
              </span>
            </div>
          </div>
        </div>

        <div className="food-vendor-login-card-wrap">
          <div className="food-vendor-login-card">
            <div className="food-vendor-login-mobile-logo">
              <img src={vibelyLogo} alt="Vibely" />
              <strong>Vibely Food</strong>
            </div>

            {notification && (
              <div
                role="alert"
                className={`food-vendor-login-notification food-vendor-login-notification-${notification.type}`}
              >
                <div className="food-vendor-login-notification-icon">
                  <i
                    className={
                      notification.type === "success"
                        ? "bi bi-check-lg"
                        : "bi bi-exclamation-lg"
                    }
                  />
                </div>

                <div className="food-vendor-login-notification-content">
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                </div>

                <button
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={() => setNotification(null)}
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>
            )}

            <div className="food-vendor-login-heading">
              <span>FOOD VENDOR SIGN IN</span>
              <h2>Welcome back</h2>
              <p>
                Enter your food vendor account details
                to continue to your dashboard.
              </p>
            </div>

            <form
              onSubmit={formik.handleSubmit}
              className="food-vendor-login-form"
              noValidate
            >
              <div className="food-vendor-login-field">
                <label htmlFor="food-vendor-email">
                  Email address
                </label>

                <div
                  className={`food-vendor-login-input ${
                    formik.touched.email && formik.errors.email
                      ? "food-vendor-login-input-error"
                      : ""
                  }`}
                >
                  <i className="bi bi-envelope" />

                  <input
                    type="email"
                    id="food-vendor-email"
                    name="email"
                    placeholder="Enter your email address"
                    autoComplete="email"
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                </div>

                {formik.touched.email && formik.errors.email && (
                  <p className="food-vendor-login-error">
                    <i className="bi bi-exclamation-circle" />
                    {formik.errors.email}
                  </p>
                )}
              </div>

              <div className="food-vendor-login-field">
                <div className="food-vendor-login-label-row">
                  <label htmlFor="food-vendor-password">
                    Password
                  </label>

                  <Link to="/forgot-password">
                    Forgot password?
                  </Link>
                </div>

                <div
                  className={`food-vendor-login-input ${
                    formik.touched.password &&
                    formik.errors.password
                      ? "food-vendor-login-input-error"
                      : ""
                  }`}
                >
                  <i className="bi bi-lock" />

                  <input
                    type={showPassword ? "text" : "password"}
                    id="food-vendor-password"
                    name="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />

                  <button
                    type="button"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                  >
                    <i
                      className={
                        showPassword
                          ? "bi bi-eye-slash"
                          : "bi bi-eye"
                      }
                    />
                  </button>
                </div>

                {formik.touched.password &&
                  formik.errors.password && (
                    <p className="food-vendor-login-error">
                      <i className="bi bi-exclamation-circle" />
                      {formik.errors.password}
                    </p>
                  )}
              </div>

              <button
                type="submit"
                className="food-vendor-login-submit"
                disabled={
                  !formik.isValid ||
                  !formik.dirty ||
                  loading
                }
              >
                {loading ? (
                  <>
                    <span className="food-vendor-login-spinner" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in to Food Dashboard
                    <i className="bi bi-arrow-right" />
                  </>
                )}
              </button>
            </form>

            <div className="food-vendor-login-divider">
              <span />
              <p>OR</p>
              <span />
            </div>

            <div className="food-vendor-login-register">
              <span>Want to sell food on Vibely?</span>

              <Link to="/food-vendor/register">
                Apply as a food vendor
              </Link>
            </div>

            <div className="food-vendor-login-secure">
              <i className="bi bi-shield-check" />
              <span>
                Secure food vendor access powered by Vibely
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default FoodVendorLogin;
