import axios from "axios";
import { useFormik } from "formik";
import {
  Link,
  useLocation,
  useNavigate
} from "react-router-dom";
import * as yup from "yup";
import {
  useEffect,
  useState
} from "react";

import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/organizerLogin.css";

const OrganizerLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] =
    useState(false);

  const [
    showPassword,
    setShowPassword
  ] = useState(false);

  const [
    notification,
    setNotification
  ] = useState(
    location.state?.notification ||
    null
  );

  useEffect(() => {
    if (!notification) {
      return;
    }

    const timer = setTimeout(
      () => {
        setNotification(null);
      },
      4500
    );

    return () =>
      clearTimeout(timer);
  }, [notification]);

  const formik = useFormik({
    initialValues: {
      email: "",
      password: ""
    },

    validationSchema:
      yup.object({
        email: yup
          .string()
          .trim()
          .required(
            "Email address is required"
          )
          .email(
            "Please enter a valid email address"
          ),

        password: yup
          .string()
          .required(
            "Password is required"
          )
      }),

    onSubmit: async (values) => {
      try {
        setLoading(true);
        setNotification(null);

        const response =
          await axios.post(
            "https://eventbookingsystem-sooty.vercel.app/api/v1/login",
            {
              email:
                values.email
                  .trim()
                  .toLowerCase(),

              password:
                values.password
            }
          );

        if (
          response.status === 200
        ) {
          const data =
            response.data.data;

          const accessToken =
            data.accessToken;

          const refreshToken =
            data.refreshToken;

          const role =
            data.user?.role ||
            data.role;

          if (
            role !== "organizer"
          ) {
            setNotification({
              type: "error",

              title:
                "Organizer access only",

              message:
                "This account is not registered as an organizer."
            });

            return;
          }

          localStorage.setItem(
            "accessToken",
            accessToken
          );

          localStorage.setItem(
            "refreshToken",
            refreshToken
          );

          localStorage.setItem(
            "role",
            role
          );

          setNotification({
            type: "success",

            title:
              "Login successful",

            message:
              "Welcome back! Opening your organizer dashboard..."
          });

          setTimeout(() => {
            navigate(
              "/organizer/dashboard",
              {
                replace: true
              }
            );
          }, 1600);
        }
      } catch (error) {
        console.log(
          "ORGANIZER LOGIN ERROR:",
          error
        );

        const backendMessage =
          error.response?.data
            ?.message ||
          "Unable to sign in. Please check your details and try again.";

        const message =
          backendMessage.toLowerCase();

        let title =
          "Login unsuccessful";

        if (
          message.includes(
            "password"
          ) ||
          message.includes(
            "credential"
          )
        ) {
          title =
            "Incorrect login details";
        }

        if (
          message.includes(
            "pending"
          ) ||
          message.includes(
            "approval"
          ) ||
          message.includes(
            "approved"
          )
        ) {
          title =
            "Approval pending";
        }

        if (
          message.includes(
            "suspend"
          ) ||
          message.includes(
            "inactive"
          )
        ) {
          title =
            "Account unavailable";
        }

        if (
          message.includes(
            "not found"
          ) ||
          message.includes(
            "does not exist"
          )
        ) {
          title =
            "Account not found";
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
    <main className="organizer-login-page">
      <div className="organizer-login-glow organizer-login-glow-one"></div>

      <div className="organizer-login-glow organizer-login-glow-two"></div>

      <Link
        to="/"
        className="organizer-login-home"
      >
        <i className="bi bi-arrow-left"></i>
        Back to home
      </Link>

      <section className="organizer-login-layout">
        <div className="organizer-login-intro">
          <Link
            to="/"
            className="organizer-login-brand"
          >
            <img
              src={vibelyLogo}
              alt="Vibely"
            />

            <div>
              <h1>Vibely</h1>
              <span>
                ORGANIZER
              </span>
            </div>
          </Link>

          <div className="organizer-login-intro-copy">
            <span>
              ORGANIZER WORKSPACE
            </span>

            <h2>
              Manage the
              <br />
              moments you
              <br />
              <em>create.</em>
            </h2>

            <p>
              Sign in to manage your
              events, bookings,
              attendees, apartments and
              business activity.
            </p>
          </div>

          <div className="organizer-login-features">
            <div>
              <i className="bi bi-calendar-event"></i>

              <span>
                <strong>
                  Your events
                </strong>

                Create, edit and manage
                experiences.
              </span>
            </div>

            <div>
              <i className="bi bi-people"></i>

              <span>
                <strong>
                  Your customers
                </strong>

                Manage bookings and
                attendees.
              </span>
            </div>

            <div>
              <i className="bi bi-graph-up-arrow"></i>

              <span>
                <strong>
                  Your business
                </strong>

                Keep track of your
                activity.
              </span>
            </div>
          </div>
        </div>

        <div className="organizer-login-card-wrap">
          <div className="organizer-login-card">
            <div className="organizer-login-mobile-logo">
              <img
                src={vibelyLogo}
                alt="Vibely"
              />

              <strong>
                Vibely
              </strong>
            </div>

            {notification && (
              <div
                className={`auth-form-message auth-form-message-${notification.type}`}
              >
                <div className="auth-form-message-icon">
                  <i
                    className={
                      notification.type ===
                        "success"
                        ? "bi bi-check-lg"
                        : "bi bi-exclamation-lg"
                    }
                  ></i>
                </div>

                <div className="auth-form-message-content">
                  <strong>
                    {
                      notification.title
                    }
                  </strong>

                  <p>
                    {
                      notification.message
                    }
                  </p>
                </div>

                <button
                  type="button"
                  className="auth-form-message-close"
                  onClick={() =>
                    setNotification(
                      null
                    )
                  }
                >
                  <i className="bi bi-x-lg"></i>
                </button>

                <span className="auth-form-message-progress"></span>
              </div>
            )}

            <div className="organizer-login-heading">
              <span>
                ORGANIZER SIGN IN
              </span>

              <h2>
                Welcome back
              </h2>

              <p>
                Enter your organizer
                account details to
                continue to your
                dashboard.
              </p>
            </div>

            <form
              onSubmit={
                formik.handleSubmit
              }
              className="organizer-login-form"
              noValidate
            >
              <div className="organizer-login-field">
                <label
                  htmlFor="email"
                >
                  Email address
                </label>

                <div
                  className={`organizer-login-input ${formik.touched
                    .email &&
                    formik.errors.email
                    ? "organizer-login-input-error"
                    : ""
                    }`}
                >
                  <i className="bi bi-envelope"></i>

                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Enter your email address"
                    autoComplete="email"
                    value={
                      formik.values.email
                    }
                    onChange={
                      formik.handleChange
                    }
                    onBlur={
                      formik.handleBlur
                    }
                  />
                </div>

                {formik.touched
                  .email &&
                  formik.errors
                    .email && (
                    <p className="organizer-login-error">
                      <i className="bi bi-exclamation-circle"></i>

                      {
                        formik.errors
                          .email
                      }
                    </p>
                  )}
              </div>

              <div className="organizer-login-field">
                <div className="organizer-login-label-row">
                  <label
                    htmlFor="password"
                  >
                    Password
                  </label>

                  <Link to="/forgot-password">
                    Forgot password?
                  </Link>
                </div>

                <div
                  className={`organizer-login-input ${formik.touched
                    .password &&
                    formik.errors
                      .password
                    ? "organizer-login-input-error"
                    : ""
                    }`}
                >
                  <i className="bi bi-lock"></i>

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    id="password"
                    name="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={
                      formik.values
                        .password
                    }
                    onChange={
                      formik.handleChange
                    }
                    onBlur={
                      formik.handleBlur
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
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

                {formik.touched
                  .password &&
                  formik.errors
                    .password && (
                    <p className="organizer-login-error">
                      <i className="bi bi-exclamation-circle"></i>

                      {
                        formik.errors
                          .password
                      }
                    </p>
                  )}
              </div>

              <button
                type="submit"
                className="organizer-login-submit"
                disabled={
                  !formik.isValid ||
                  !formik.dirty ||
                  loading
                }
              >
                {loading ? (
                  <>
                    <span className="organizer-login-spinner"></span>

                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in to Dashboard

                    <i className="bi bi-arrow-right"></i>
                  </>
                )}
              </button>
            </form>

            <div className="organizer-login-divider">
              <span></span>
              <p>OR</p>
              <span></span>
            </div>

            <div className="organizer-login-register">
              <span>
                Want to become an
                organizer?
              </span>

              <Link to="/organizer/register">
                Apply as an organizer
              </Link>
            </div>

            <div className="organizer-login-secure">
              <i className="bi bi-shield-check"></i>

              <span>
                Secure organizer access
                powered by Vibely
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default OrganizerLogin;