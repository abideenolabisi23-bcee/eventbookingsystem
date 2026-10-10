
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import axios from "axios";
import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/organizerLogin.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const loginSchema = Yup.object({
  email: Yup.string()
    .email("Please enter a valid email address")
    .required("Email address is required"),
  password: Yup.string().required("Password is required")
});

const getApprovalNotification = (data) => {
  const message = String(data?.message || "").toLowerCase();

  const approvalStatus = String(
    data?.approvalStatus ||
      data?.data?.approvalStatus ||
      data?.data?.organizer?.approvalStatus ||
      ""
  ).toLowerCase();

  const accountStatus = String(
    data?.accountStatus ||
      data?.data?.accountStatus ||
      data?.data?.organizer?.accountStatus ||
      ""
  ).toLowerCase();

  if (
    accountStatus === "suspended" ||
    accountStatus === "inactive" ||
    message.includes("suspend") ||
    message.includes("inactive")
  ) {
    return {
      type: "error",
      title: "Account suspended",
      message:
        "Your organizer account is currently restricted. Please contact Vibely support for assistance."
    };
  }

  if (
    approvalStatus === "rejected" ||
    message.includes("reject")
  ) {
    return {
      type: "error",
      title: "Application rejected",
      message:
        "Your organizer application was not approved. Please contact Vibely support for assistance."
    };
  }

  if (
    approvalStatus === "pending" ||
    message.includes("pending") ||
    message.includes("awaiting") ||
    message.includes("not approved")
  ) {
    return {
      type: "error",
      title: "Approval pending",
      message:
        "Your organizer application is still awaiting admin approval. You will be able to access your dashboard once your application has been approved."
    };
  }

  return null;
};

const OrganizerLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState(null);

  const navigationTimer = useRef(null);

  useEffect(() => {
    const incomingNotification = location.state?.notification;

    if (incomingNotification) {
      setNotification(incomingNotification);

      navigate(location.pathname + location.search, {
        replace: true,
        state: null
      });
    }
  }, [location.state, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!notification) return;

    const persistentTitles = [
      "Approval pending",
      "Application rejected",
      "Account suspended",
      "Account verification failed",
      "Unable to verify your account",
      "Unable to confirm approval"
    ];

    if (persistentTitles.includes(notification.title)) {
      return;
    }

    const timer = setTimeout(() => {
      setNotification(null);
    }, 4500);

    return () => clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    return () => {
      if (navigationTimer.current) {
        clearTimeout(navigationTimer.current);
      }
    };
  }, []);

  const handleLogin = async (values, { setSubmitting }) => {
    setNotification(null);

    try {
      const response = await axios.post(`${API_URL}/login`, {
        email: values.email.trim().toLowerCase(),
        password: values.password
      });

      const data = response.data?.data;

      const accessToken = data?.accessToken;
      const refreshToken = data?.refreshToken;
      const role = data?.user?.role || data?.role;

      if (role !== "organizer") {
        setNotification({
          type: "error",
          title: "Organizer access only",
          message:
            "This account is not registered as an organizer. Please use your organizer account to sign in."
        });

        return;
      }

      if (!accessToken) {
        setNotification({
          type: "error",
          title: "Login unsuccessful",
          message:
            "Your login response did not include an access token. Please try again."
        });

        return;
      }

      const loginAccountNotification = getApprovalNotification({
        approvalStatus:
          data?.user?.approvalStatus || data?.approvalStatus,
        accountStatus:
          data?.user?.accountStatus || data?.accountStatus
      });

      if (loginAccountNotification) {
        setNotification(loginAccountNotification);
        return;
      }

      const verification = await axios.get(
        `${API_URL}/organizer/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      const organizer = verification.data?.data?.organizer;

      if (!organizer || organizer.role !== "organizer") {
        setNotification({
          type: "error",
          title: "Unable to verify your account",
          message:
            "We couldn't confirm your organizer account. Please try again."
        });

        return;
      }

      const accountNotification = getApprovalNotification({
        approvalStatus: organizer.approvalStatus,
        accountStatus: organizer.accountStatus
      });

      if (accountNotification) {
        setNotification(accountNotification);
        return;
      }

      const approvalStatus = String(
        organizer.approvalStatus || ""
      ).toLowerCase();

      if (approvalStatus !== "approved") {
        setNotification({
          type: "error",
          title: "Unable to confirm approval",
          message:
            "We couldn't confirm your organizer approval status. Please contact Vibely support if this continues."
        });

        return;
      }

      localStorage.setItem(
        "organizerAccessToken",
        accessToken
      );

      if (refreshToken) {
        localStorage.setItem(
          "organizerRefreshToken",
          refreshToken
        );
      } else {
        localStorage.removeItem("organizerRefreshToken");
      }

      localStorage.setItem("organizerRole", "organizer");

      setNotification({
        type: "success",
        title: "Login successful",
        message:
          "Welcome back! Opening your organizer dashboard..."
      });

      navigationTimer.current = setTimeout(() => {
        navigate("/organizer/dashboard", {
          replace: true
        });
      }, 1600);
    } catch (error) {
      const statusCode = error.response?.status;
      const responseData = error.response?.data;

      const accountNotification =
        getApprovalNotification(responseData);

      if (accountNotification) {
        setNotification(accountNotification);
      } else if (statusCode === 401) {
        setNotification({
          type: "error",
          title: "Incorrect login details",
          message:
            "Please check your email and password and try again."
        });
      } else if (statusCode === 403) {
        setNotification({
          type: "error",
          title: "Access restricted",
          message:
            responseData?.message ||
            "Your organizer account cannot access the dashboard at this time."
        });
      } else {
        setNotification({
          type: "error",
          title: "Unable to verify your account",
          message:
            responseData?.message ||
            "We couldn't verify your organizer account. Please check your connection and try again."
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="organizer-login-page">
      <section className="organizer-login-showcase">
        <div className="organizer-login-circle organizer-login-circle-one"></div>
        <div className="organizer-login-circle organizer-login-circle-two"></div>

        <div className="organizer-login-showcase-content">
          <Link to="/" className="organizer-login-brand">
            <img src={vibelyLogo} alt="Vibely logo" />

            <div>
              <h2>Vibely.</h2>
              <span>ORGANIZER STUDIO</span>
            </div>
          </Link>

          <div className="organizer-login-message">
            <span className="organizer-login-eyebrow">
              THE SPACE FOR EXPERIENCE CREATORS
            </span>

            <h1>
              Make moments.
              <span>Make magic.</span>
            </h1>

            <p>
              Every unforgettable experience begins with a
              vision. Welcome back to the space where you
              bring yours to life.
            </p>

            <div className="organizer-login-showcase-divider"></div>

            <div className="organizer-login-highlight">
              <div className="organizer-login-highlight-icon">
                <i className="bi bi-stars"></i>
              </div>

              <div>
                <strong>
                  Your vision, beautifully managed.
                </strong>

                <span>
                  Everything you need to create experiences
                  people will remember.
                </span>
              </div>
            </div>
          </div>

          <div className="organizer-login-features">
            <div>
              <i className="bi bi-calendar2-event"></i>
              <span>Event Management</span>
            </div>

            <div>
              <i className="bi bi-buildings"></i>
              <span>Apartment Bookings</span>
            </div>

            <div>
              <i className="bi bi-graph-up-arrow"></i>
              <span>Business Insights</span>
            </div>
          </div>
        </div>
      </section>

      <section className="organizer-login-form-section">
        <div className="organizer-login-form-wrapper">
          <Link
            to="/"
            className="organizer-login-mobile-brand"
          >
            <img src={vibelyLogo} alt="Vibely logo" />

            <div>
              <h2>Vibely.</h2>
              <span>ORGANIZER STUDIO</span>
            </div>
          </Link>

          <div className="organizer-login-form-top">
            <div className="organizer-login-form-emblem">
              <i className="bi bi-stars"></i>
            </div>

            <span>YOUR ORGANIZER SPACE</span>
          </div>

          <div className="organizer-login-heading">
            <span>WELCOME BACK</span>

            <h2>
              Hello again
              <span className="organizer-login-dot">.</span>
            </h2>

            <p>
              Sign in to manage your experiences, bookings,
              and everything that makes your business thrive.
            </p>
          </div>

          {notification && (
            <div
              className={`organizer-login-toast organizer-login-toast-${notification.type}`}
              role="alert"
            >
              <div className="organizer-login-toast-icon">
                <i
                  className={`bi ${
                    notification.type === "success"
                      ? "bi-check-circle-fill"
                      : "bi-exclamation-circle-fill"
                  }`}
                ></i>
              </div>

              <div className="organizer-login-toast-content">
                <strong>{notification.title}</strong>
                <p>{notification.message}</p>
              </div>

              <button
                type="button"
                onClick={() => setNotification(null)}
                aria-label="Close notification"
              >
                <i className="bi bi-x-lg"></i>
              </button>

              {![
                "Approval pending",
                "Application rejected",
                "Account suspended",
                "Account verification failed",
                "Unable to verify your account",
                "Unable to confirm approval"
              ].includes(notification.title) && (
                <div className="organizer-login-toast-progress"></div>
              )}
            </div>
          )}

          <Formik
            initialValues={{
              email: "",
              password: ""
            }}
            validationSchema={loginSchema}
            onSubmit={handleLogin}
          >
            {({ isSubmitting, errors, touched }) => (
              <Form className="organizer-login-form">
                <div className="organizer-login-field">
                  <label htmlFor="organizer-email">
                    Email address
                  </label>

                  <div
                    className={`organizer-login-input ${
                      touched.email && errors.email
                        ? "organizer-login-input-error"
                        : ""
                    }`}
                  >
                    <i className="bi bi-envelope"></i>

                    <Field
                      id="organizer-email"
                      type="email"
                      name="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>

                  <ErrorMessage
                    name="email"
                    component="div"
                    className="organizer-login-field-error"
                  />
                </div>

                <div className="organizer-login-field">
                  <div className="organizer-password-label">
                    <label htmlFor="organizer-password">
                      Password
                    </label>

                    <Link to="/forgot-password">
                      Forgot password?
                    </Link>
                  </div>

                  <div
                    className={`organizer-login-input ${
                      touched.password && errors.password
                        ? "organizer-login-input-error"
                        : ""
                    }`}
                  >
                    <i className="bi bi-lock"></i>

                    <Field
                      id="organizer-password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />

                    <button
                      type="button"
                      className="organizer-password-toggle"
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
                        className={`bi ${
                          showPassword
                            ? "bi-eye-slash"
                            : "bi-eye"
                        }`}
                      ></i>
                    </button>
                  </div>

                  <ErrorMessage
                    name="password"
                    component="div"
                    className="organizer-login-field-error"
                  />
                </div>

                <button
                  type="submit"
                  className="organizer-login-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="organizer-login-spinner"></span>
                      Signing you in...
                    </>
                  ) : (
                    <>
                      Sign in to Organizer Studio
                      <i className="bi bi-arrow-up-right"></i>
                    </>
                  )}
                </button>
              </Form>
            )}
          </Formik>

          <div className="organizer-login-register">
            <span>
              New to Vibely Organizer Studio?
            </span>

            <Link to="/organizer/register">
              Become an organizer
              <i className="bi bi-arrow-up-right"></i>
            </Link>
          </div>

          <div className="organizer-login-trust">
            <i className="bi bi-shield-check"></i>

            <span>
              Secure access to your organizer workspace
            </span>
          </div>

          <Link to="/" className="organizer-login-back">
            <i className="bi bi-arrow-left"></i>
            Back to Vibely
          </Link>
        </div>
      </section>
    </main>
  );
};

export default OrganizerLogin;
