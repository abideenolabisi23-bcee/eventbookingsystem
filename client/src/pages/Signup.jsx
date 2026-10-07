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
import "../styles/signup.css";

const Signup = () => {
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
  ] = useState(null);

  const returnTo =
    location.state?.returnTo || "/";

  const nameRegex =
    /^[A-Za-z]+$/;

  const validationSchema =
    yup.object({
      firstname: yup
        .string()
        .trim()
        .required(
          "First name is required"
        )
        .min(
          3,
          "First name must be at least 3 characters"
        )
        .matches(
          nameRegex,
          "First name can only contain letters"
        ),

      lastname: yup
        .string()
        .trim()
        .required(
          "Last name is required"
        )
        .min(
          3,
          "Last name must be at least 3 characters"
        )
        .matches(
          nameRegex,
          "Last name can only contain letters"
        ),

      email: yup
        .string()
        .trim()
        .required(
          "Email is required"
        )
        .email(
          "Please enter a valid email address"
        ),

      password: yup
        .string()
        .required(
          "Password is required"
        )
        .matches(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
          "Password must meet all requirements below"
        )
    });

  const formik = useFormik({
    initialValues: {
      firstname: "",
      lastname: "",
      email: "",
      password: ""
    },

    validationSchema,

    validateOnChange: true,
    validateOnBlur: true,

    onSubmit: async (values) => {
      try {
        setLoading(true);
        setNotification(null);

        const payload = {
          firstname:
            values.firstname.trim(),
          lastname:
            values.lastname.trim(),
          email:
            values.email
              .trim()
              .toLowerCase(),
          password:
            values.password
        };

        const response =
          await axios.post(
            "http://192.168.0.3:5005/api/v1/register",
            payload
          );

        if (
          response.status === 201
        ) {
          setNotification({
            type: "success",
            title:
              "Account created successfully",
            message:
              "Welcome to Vibely! Your account is ready."
          });

          formik.resetForm();

          setTimeout(() => {
            navigate("/login", {
              state: {
                returnTo,
                notification: {
                  type: "success",
                  title:
                    "Account created successfully",
                  message:
                    "Your Vibely account is ready. Sign in to continue."
                }
              }
            });
          }, 2000);
        }
      } catch (error) {
        console.log(
          "REGISTRATION ERROR:",
          error
        );

        setNotification({
          type: "error",
          title:
            "Registration unsuccessful",
          message:
            error.response?.data
              ?.message ||
            "We couldn't create your account. Please try again."
        });
      } finally {
        setLoading(false);
      }
    }
  });

  useEffect(() => {
    if (!notification) {
      return;
    }

    if (
      notification.type ===
      "success"
    ) {
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

  const handleLiveChange = (
    event
  ) => {
    const {
      name,
      value
    } = event.target;

    formik.setFieldValue(
      name,
      value,
      true
    );

    formik.setFieldTouched(
      name,
      true,
      false
    );
  };

  const goToLogin = () => {
    navigate("/login", {
      state: {
        returnTo
      }
    });
  };

  const password =
    formik.values.password;

  const checks = {
    length:
      password.length >= 8,

    uppercase:
      /[A-Z]/.test(password),

    lowercase:
      /[a-z]/.test(password),

    number:
      /\d/.test(password),

    special:
      /[@$!%*?&]/.test(
        password
      )
  };

  const fieldHasError = (
    field
  ) => {
    return (
      formik.touched[field] &&
      formik.errors[field]
    );
  };

  const fieldIsValid = (
    field
  ) => {
    return (
      formik.touched[field] &&
      formik.values[field] &&
      !formik.errors[field]
    );
  };

  return (
    <main className="auth-signup-page">
      <div className="auth-signup-glow auth-signup-glow-one"></div>

      <div className="auth-signup-glow auth-signup-glow-two"></div>

      <div className="auth-signup-glow auth-signup-glow-three"></div>

      <div className="auth-signup-ring auth-signup-ring-one"></div>

      <div className="auth-signup-ring auth-signup-ring-two"></div>

      <Link
        to="/"
        className="auth-signup-home"
      >
        <i className="bi bi-arrow-left"></i>
        Back to home
      </Link>

      <section className="auth-signup-layout">
        <div className="auth-signup-card-wrap">
          <div className="auth-signup-floating-badge">
            <i className="bi bi-stars"></i>
            JOIN THE VIBE
          </div>

          <div className="auth-signup-card">
            <div className="auth-signup-card-shine"></div>

            <div className="auth-signup-mobile-logo">
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

            <div className="auth-signup-heading">
              <span>
                CREATE YOUR ACCOUNT
              </span>

              <h2>
                Start your journey
              </h2>

              <p>
                Your next experience is
                waiting. Let's get you
                started.
              </p>
            </div>

            <form
              onSubmit={
                formik.handleSubmit
              }
              className="auth-signup-form"
              noValidate
            >
              <div className="auth-signup-name-grid">
                <div className="auth-signup-field">
                  <label
                    htmlFor="firstname"
                  >
                    First name
                  </label>

                  <div
                    className={`auth-signup-input ${fieldHasError(
                      "firstname"
                    )
                        ? "auth-signup-input-error"
                        : fieldIsValid(
                          "firstname"
                        )
                          ? "auth-signup-input-valid"
                          : ""
                      }`}
                  >
                    <i className="bi bi-person"></i>

                    <input
                      type="text"
                      id="firstname"
                      name="firstname"
                      placeholder="First name"
                      autoComplete="given-name"
                      value={
                        formik.values
                          .firstname
                      }
                      onChange={
                        handleLiveChange
                      }
                      onBlur={
                        formik.handleBlur
                      }
                    />

                    {fieldIsValid(
                      "firstname"
                    ) && (
                        <i className="bi bi-check-circle-fill auth-signup-valid-icon"></i>
                      )}
                  </div>

                  {fieldHasError(
                    "firstname"
                  ) && (
                      <p className="auth-signup-error">
                        <i className="bi bi-exclamation-circle-fill"></i>

                        {
                          formik.errors
                            .firstname
                        }
                      </p>
                    )}
                </div>

                <div className="auth-signup-field">
                  <label
                    htmlFor="lastname"
                  >
                    Last name
                  </label>

                  <div
                    className={`auth-signup-input ${fieldHasError(
                      "lastname"
                    )
                        ? "auth-signup-input-error"
                        : fieldIsValid(
                          "lastname"
                        )
                          ? "auth-signup-input-valid"
                          : ""
                      }`}
                  >
                    <i className="bi bi-person"></i>

                    <input
                      type="text"
                      id="lastname"
                      name="lastname"
                      placeholder="Last name"
                      autoComplete="family-name"
                      value={
                        formik.values
                          .lastname
                      }
                      onChange={
                        handleLiveChange
                      }
                      onBlur={
                        formik.handleBlur
                      }
                    />

                    {fieldIsValid(
                      "lastname"
                    ) && (
                        <i className="bi bi-check-circle-fill auth-signup-valid-icon"></i>
                      )}
                  </div>

                  {fieldHasError(
                    "lastname"
                  ) && (
                      <p className="auth-signup-error">
                        <i className="bi bi-exclamation-circle-fill"></i>

                        {
                          formik.errors
                            .lastname
                        }
                      </p>
                    )}
                </div>
              </div>

              <div className="auth-signup-field">
                <label htmlFor="email">
                  Email address
                </label>

                <div
                  className={`auth-signup-input ${fieldHasError(
                    "email"
                  )
                      ? "auth-signup-input-error"
                      : fieldIsValid(
                        "email"
                      )
                        ? "auth-signup-input-valid"
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
                      handleLiveChange
                    }
                    onBlur={
                      formik.handleBlur
                    }
                  />

                  {fieldIsValid(
                    "email"
                  ) && (
                      <i className="bi bi-check-circle-fill auth-signup-valid-icon"></i>
                    )}
                </div>

                {fieldHasError(
                  "email"
                ) && (
                    <p className="auth-signup-error">
                      <i className="bi bi-exclamation-circle-fill"></i>

                      {
                        formik.errors.email
                      }
                    </p>
                  )}
              </div>

              <div className="auth-signup-field">
                <label
                  htmlFor="password"
                >
                  Create password
                </label>

                <div
                  className={`auth-signup-input ${fieldHasError(
                    "password"
                  )
                      ? "auth-signup-input-error"
                      : fieldIsValid(
                        "password"
                      )
                        ? "auth-signup-input-valid"
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
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    value={
                      formik.values
                        .password
                    }
                    onChange={
                      handleLiveChange
                    }
                    onBlur={
                      formik.handleBlur
                    }
                  />

                  <button
                    type="button"
                    className="auth-signup-eye"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
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

              <div className="auth-signup-rules">
                <div
                  className={
                    checks.length
                      ? "passed"
                      : ""
                  }
                >
                  <i
                    className={
                      checks.length
                        ? "bi bi-check-circle-fill"
                        : "bi bi-circle"
                    }
                  ></i>
                  8+ characters
                </div>

                <div
                  className={
                    checks.uppercase
                      ? "passed"
                      : ""
                  }
                >
                  <i
                    className={
                      checks.uppercase
                        ? "bi bi-check-circle-fill"
                        : "bi bi-circle"
                    }
                  ></i>
                  Uppercase
                </div>

                <div
                  className={
                    checks.lowercase
                      ? "passed"
                      : ""
                  }
                >
                  <i
                    className={
                      checks.lowercase
                        ? "bi bi-check-circle-fill"
                        : "bi bi-circle"
                    }
                  ></i>
                  Lowercase
                </div>

                <div
                  className={
                    checks.number
                      ? "passed"
                      : ""
                  }
                >
                  <i
                    className={
                      checks.number
                        ? "bi bi-check-circle-fill"
                        : "bi bi-circle"
                    }
                  ></i>
                  Number
                </div>

                <div
                  className={
                    checks.special
                      ? "passed"
                      : ""
                  }
                >
                  <i
                    className={
                      checks.special
                        ? "bi bi-check-circle-fill"
                        : "bi bi-circle"
                    }
                  ></i>
                  Special character
                </div>
              </div>

              {fieldHasError(
                "password"
              ) && (
                  <p className="auth-signup-error auth-signup-password-error">
                    <i className="bi bi-exclamation-circle-fill"></i>

                    {
                      formik.errors
                        .password
                    }
                  </p>
                )}

              <button
                type="submit"
                className="auth-signup-submit"
                disabled={
                  !formik.isValid ||
                  !formik.dirty ||
                  loading
                }
              >
                {loading ? (
                  <>
                    <span className="auth-signup-spinner"></span>
                    Creating account...
                  </>
                ) : (
                  <>
                    Create my account
                    <i className="bi bi-arrow-right"></i>
                  </>
                )}
              </button>
            </form>

            <div className="auth-signup-divider">
              <span></span>
              <p>OR</p>
              <span></span>
            </div>

            <div className="auth-signup-existing">
              <div>
                <span>
                  ALREADY WITH US?
                </span>

                <h3>
                  Welcome back
                </h3>
              </div>

              <button
                type="button"
                onClick={goToLogin}
              >
                Sign in
                <i className="bi bi-arrow-right"></i>
              </button>
            </div>

            <div className="auth-signup-secure">
              <i className="bi bi-shield-check"></i>

              <span>
                Your information is
                securely protected
              </span>
            </div>
          </div>
        </div>

        <div className="auth-signup-intro">
          <Link
            to="/"
            className="auth-signup-brand"
          >
            <div className="auth-signup-logo-shell">
              <img
                src={vibelyLogo}
                alt="Vibely"
              />
            </div>

            <div>
              <h1>Vibely</h1>

              <span>
                EVENTS · APARTMENTS · FOOD
              </span>
            </div>
          </Link>

          <div className="auth-signup-intro-copy">
            <span className="auth-signup-kicker">
              YOUR WORLD OF EXPERIENCES
            </span>

            <h2>
              One account.
              <br />
              So many ways
              <br />
              to <em>live.</em>
            </h2>

            <p>
              Create your Vibely account
              and bring your favourite
              experiences together in one
              beautiful place.
            </p>
          </div>

          <div className="auth-signup-benefits">
            <div>
              <span className="auth-signup-benefit-number">
                01
              </span>

              <i className="bi bi-ticket-perforated"></i>

              <section>
                <strong>
                  Find your event
                </strong>

                <p>
                  Discover moments worth
                  showing up for.
                </p>
              </section>
            </div>

            <div>
              <span className="auth-signup-benefit-number">
                02
              </span>

              <i className="bi bi-buildings"></i>

              <section>
                <strong>
                  Find your space
                </strong>

                <p>
                  Book apartments that
                  match your plans.
                </p>
              </section>
            </div>

            <div>
              <span className="auth-signup-benefit-number">
                03
              </span>

              <i className="bi bi-bag-heart"></i>

              <section>
                <strong>
                  Find your flavour
                </strong>

                <p>
                  Order something
                  delicious whenever the
                  mood hits.
                </p>
              </section>
            </div>
          </div>

          <div className="auth-signup-vibe-card">
            <div className="auth-signup-vibe-logo">
              <img
                src={vibelyLogo}
                alt=""
              />
            </div>

            <div>
              <span>
                YOUR VIBELY
              </span>

              <strong>
                Create. Book.
                Experience.
              </strong>
            </div>

            <i className="bi bi-stars"></i>
          </div>
        </div>
      </section>

      <div className="auth-signup-bottom">
        <span>
          © 2026 VIBELY
        </span>

        <span>
          FIND YOUR VIBE.
        </span>
      </div>
    </main>
  );
};

export default Signup;