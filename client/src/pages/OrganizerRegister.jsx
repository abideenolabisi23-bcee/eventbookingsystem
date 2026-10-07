import axios from "axios";
import { useFormik } from "formik";
import {
  Link,
  useNavigate
} from "react-router-dom";
import * as yup from "yup";
import {
  useEffect,
  useState
} from "react";

import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/organizerRegister.css";

const OrganizerRegister = () => {
  const navigate = useNavigate();

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

  const nameRegex =
    /^[A-Za-z]+$/;

  const phoneRegex =
    /^(?:\+234|234|0)[789][01]\d{8}$/;

  const validationSchema =
    yup.object({
      firstname: yup
        .string()
        .required(
          "First name is required"
        )
        .test(
          "firstname-validation",
          function (value) {
            if (!value) {
              return true;
            }

            if (
              !nameRegex.test(value)
            ) {
              return this.createError({
                message:
                  "First name can only contain letters"
              });
            }

            if (
              value.length < 3
            ) {
              return this.createError({
                message:
                  "First name must be at least 3 characters"
              });
            }

            return true;
          }
        ),

      lastname: yup
        .string()
        .required(
          "Last name is required"
        )
        .test(
          "lastname-validation",
          function (value) {
            if (!value) {
              return true;
            }

            if (
              !nameRegex.test(value)
            ) {
              return this.createError({
                message:
                  "Last name can only contain letters"
              });
            }

            if (
              value.length < 3
            ) {
              return this.createError({
                message:
                  "Last name must be at least 3 characters"
              });
            }

            return true;
          }
        ),

      businessName: yup
        .string()
        .trim()
        .required(
          "Business name is required"
        )
        .min(
          2,
          "Business name must be at least 2 characters"
        ),

      phone: yup
        .string()
        .required(
          "Phone number is required"
        )
        .transform((value) =>
          value
            ? value.replace(
              /\s/g,
              ""
            )
            : value
        )
        .matches(
          phoneRegex,
          "Please enter a valid Nigerian phone number"
        ),

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
        .matches(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
          "Password must meet all requirements below"
        )
    });

  const formik = useFormik({
    initialValues: {
      firstname: "",
      lastname: "",
      businessName: "",
      phone: "",
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

          businessName:
            values.businessName.trim(),

          phone:
            values.phone.replace(
              /\s/g,
              ""
            ),

          email:
            values.email
              .trim()
              .toLowerCase(),

          password:
            values.password
        };

        const response =
          await axios.post(
            "https://eventbookingsystem-sooty.vercel.app/api/v1/register-organizer",
            payload
          );

        if (
          response.status === 201
        ) {
          setNotification({
            type: "success",
            title:
              "Application submitted successfully",
            message:
              "Your organizer application has been received and is awaiting admin approval."
          });

          formik.resetForm();

          setTimeout(() => {
            navigate(
              "/organizer/login",
              {
                state: {
                  notification: {
                    type:
                      "success",

                    title:
                      "Application submitted",

                    message:
                      "Your organizer application is awaiting approval. Sign in after your account has been approved."
                  }
                }
              }
            );
          }, 2500);
        }
      } catch (error) {
        console.log(
          "ORGANIZER REGISTRATION ERROR:",
          error
        );

        setNotification({
          type: "error",

          title:
            "Application unsuccessful",

          message:
            error.response?.data
              ?.message ||
            "We couldn't submit your organizer application. Please try again."
        });
      } finally {
        setLoading(false);
      }
    }
  });

  useEffect(() => {
    if (
      !notification ||
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

  const hasError = (field) =>
    formik.touched[field] &&
    formik.errors[field];

  return (
    <main className="organizer-register-page">
      <div className="organizer-register-glow organizer-register-glow-one"></div>

      <div className="organizer-register-glow organizer-register-glow-two"></div>

      <Link
        to="/"
        className="organizer-register-home"
      >
        <i className="bi bi-arrow-left"></i>
        Back to home
      </Link>

      <section className="organizer-register-layout">
        <div className="organizer-register-intro">
          <Link
            to="/"
            className="organizer-register-brand"
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

          <div className="organizer-register-intro-copy">
            <span>
              BUILD EXPERIENCES
            </span>

            <h2>
              Bring your
              <br />
              events to
              <br />
              <em>life.</em>
            </h2>

            <p>
              Join Vibely as an
              organizer and create
              unforgettable experiences
              for your audience.
            </p>
          </div>

          <div className="organizer-register-points">
            <div>
              <i className="bi bi-calendar-event"></i>

              <span>
                <strong>
                  Create events
                </strong>

                Publish and manage your
                experiences.
              </span>
            </div>

            <div>
              <i className="bi bi-people"></i>

              <span>
                <strong>
                  Manage attendees
                </strong>

                Keep track of bookings
                and guests.
              </span>
            </div>

            <div>
              <i className="bi bi-graph-up-arrow"></i>

              <span>
                <strong>
                  Grow your business
                </strong>

                Track your activity from
                one workspace.
              </span>
            </div>
          </div>
        </div>

        <div className="organizer-register-card-wrap">
          <div className="organizer-register-card">
            <div className="organizer-register-mobile-logo">
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

            <div className="organizer-register-heading">
              <span>
                ORGANIZER APPLICATION
              </span>

              <h2>
                Become an organizer
              </h2>

              <p>
                Tell us about you and
                your business to get
                started.
              </p>
            </div>

            <form
              onSubmit={
                formik.handleSubmit
              }
              className="organizer-register-form"
              noValidate
            >
              <div className="organizer-register-name-grid">
                <div className="organizer-register-field">
                  <label
                    htmlFor="firstname"
                  >
                    First name
                  </label>

                  <div
                    className={`organizer-register-input ${hasError(
                      "firstname"
                    )
                      ? "organizer-register-input-error"
                      : ""
                      }`}
                  >
                    <i className="bi bi-person"></i>

                    <input
                      type="text"
                      id="firstname"
                      name="firstname"
                      placeholder="First name"
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
                  </div>

                  {hasError(
                    "firstname"
                  ) && (
                      <p className="organizer-register-error">
                        {
                          formik.errors
                            .firstname
                        }
                      </p>
                    )}
                </div>

                <div className="organizer-register-field">
                  <label
                    htmlFor="lastname"
                  >
                    Last name
                  </label>

                  <div
                    className={`organizer-register-input ${hasError(
                      "lastname"
                    )
                      ? "organizer-register-input-error"
                      : ""
                      }`}
                  >
                    <i className="bi bi-person"></i>

                    <input
                      type="text"
                      id="lastname"
                      name="lastname"
                      placeholder="Last name"
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
                  </div>

                  {hasError(
                    "lastname"
                  ) && (
                      <p className="organizer-register-error">
                        {
                          formik.errors
                            .lastname
                        }
                      </p>
                    )}
                </div>
              </div>

              <div className="organizer-register-field">
                <label
                  htmlFor="businessName"
                >
                  Business name
                </label>

                <div
                  className={`organizer-register-input ${hasError(
                    "businessName"
                  )
                    ? "organizer-register-input-error"
                    : ""
                    }`}
                >
                  <i className="bi bi-briefcase"></i>

                  <input
                    type="text"
                    id="businessName"
                    name="businessName"
                    placeholder="Your business or brand name"
                    value={
                      formik.values
                        .businessName
                    }
                    onChange={
                      handleLiveChange
                    }
                    onBlur={
                      formik.handleBlur
                    }
                  />
                </div>

                {hasError(
                  "businessName"
                ) && (
                    <p className="organizer-register-error">
                      {
                        formik.errors
                          .businessName
                      }
                    </p>
                  )}
              </div>

              <div className="organizer-register-field">
                <label
                  htmlFor="phone"
                >
                  Phone number
                </label>

                <div
                  className={`organizer-register-input ${hasError("phone")
                    ? "organizer-register-input-error"
                    : ""
                    }`}
                >
                  <i className="bi bi-telephone"></i>

                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder="08012345678"
                    value={
                      formik.values.phone
                    }
                    onChange={
                      handleLiveChange
                    }
                    onBlur={
                      formik.handleBlur
                    }
                  />
                </div>

                {hasError("phone") && (
                  <p className="organizer-register-error">
                    {
                      formik.errors.phone
                    }
                  </p>
                )}
              </div>

              <div className="organizer-register-field">
                <label
                  htmlFor="email"
                >
                  Email address
                </label>

                <div
                  className={`organizer-register-input ${hasError("email")
                    ? "organizer-register-input-error"
                    : ""
                    }`}
                >
                  <i className="bi bi-envelope"></i>

                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Enter your email"
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
                </div>

                {hasError("email") && (
                  <p className="organizer-register-error">
                    {
                      formik.errors.email
                    }
                  </p>
                )}
              </div>

              <div className="organizer-register-field">
                <label
                  htmlFor="password"
                >
                  Create password
                </label>

                <div
                  className={`organizer-register-input ${hasError(
                    "password"
                  )
                    ? "organizer-register-input-error"
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

                <div className="organizer-register-password-rules">
                  <span
                    className={
                      checks.length
                        ? "passed"
                        : ""
                    }
                  >
                    8+ characters
                  </span>

                  <span
                    className={
                      checks.uppercase
                        ? "passed"
                        : ""
                    }
                  >
                    Uppercase
                  </span>

                  <span
                    className={
                      checks.lowercase
                        ? "passed"
                        : ""
                    }
                  >
                    Lowercase
                  </span>

                  <span
                    className={
                      checks.number
                        ? "passed"
                        : ""
                    }
                  >
                    Number
                  </span>

                  <span
                    className={
                      checks.special
                        ? "passed"
                        : ""
                    }
                  >
                    Special
                  </span>
                </div>
              </div>

              <div className="organizer-register-review-note">
                <i className="bi bi-shield-check"></i>

                <div>
                  <strong>
                    Application review
                  </strong>

                  <p>
                    Organizer accounts
                    require admin approval
                    before dashboard
                    access.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="organizer-register-submit"
                disabled={
                  !formik.isValid ||
                  !formik.dirty ||
                  loading
                }
              >
                {loading
                  ? "Submitting application..."
                  : "Submit application"}

                {!loading && (
                  <i className="bi bi-arrow-right"></i>
                )}
              </button>
            </form>

            <div className="organizer-register-login">
              <span>
                Already an organizer?
              </span>

              <Link to="/organizer/login">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default OrganizerRegister;