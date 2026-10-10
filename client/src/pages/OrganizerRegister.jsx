import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import axios from "axios";
import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/organizerRegister.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const registrationSchema = Yup.object({
  firstname: Yup.string()
    .trim()
    .matches(/^[A-Za-z]+$/, "Use letters only")
    .min(3, "Enter at least 3 characters")
    .required("First name is required"),
  lastname: Yup.string()
    .trim()
    .matches(/^[A-Za-z]+$/, "Use letters only")
    .min(3, "Enter at least 3 characters")
    .required("Last name is required"),
  businessName: Yup.string()
    .trim()
    .min(2, "Enter your business name")
    .required("Business name is required"),
  phone: Yup.string()
    .matches(
      /^(?:\+234|234|0)[789][01]\d{8}$/,
      "Enter a valid Nigerian phone number"
    )
    .required("Phone number is required"),
  email: Yup.string()
    .email("Enter a valid email address")
    .required("Email address is required"),
  password: Yup.string()
    .min(8, "Use at least 8 characters")
    .matches(/[A-Z]/, "Include an uppercase letter")
    .matches(/[a-z]/, "Include a lowercase letter")
    .matches(/\d/, "Include a number")
    .matches(/[@$!%*?&]/, "Include a special character")
    .required("Password is required")
});

const initialValues = {
  firstname: "",
  lastname: "",
  businessName: "",
  phone: "",
  email: "",
  password: ""
};

const passwordChecks = [
  {
    label: "8+ characters",
    test: (value) => value.length >= 8
  },
  {
    label: "Uppercase letter",
    test: (value) => /[A-Z]/.test(value)
  },
  {
    label: "Lowercase letter",
    test: (value) => /[a-z]/.test(value)
  },
  {
    label: "Number",
    test: (value) => /\d/.test(value)
  },
  {
    label: "Special character",
    test: (value) => /[@$!%*?&]/.test(value)
  }
];

const OrganizerRegister = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (!notification) return;

    const timer = setTimeout(() => {
      setNotification(null);
    }, 4500);

    return () => clearTimeout(timer);
  }, [notification]);

  const handleRegister = async (
    values,
    { setSubmitting, resetForm }
  ) => {
    try {
      const response = await axios.post(
        `${API_URL}/register-organizer`,
        {
          firstname: values.firstname.trim(),
          lastname: values.lastname.trim(),
          businessName: values.businessName.trim(),
          phone: values.phone.replace(/\s/g, ""),
          email: values.email.trim().toLowerCase(),
          password: values.password
        }
      );

      if (response.status === 201) {
        setNotification({
          type: "success",
          title: "Application submitted successfully",
          message:
            "Your organizer application has been received and is awaiting admin approval."
        });

        resetForm();

        setTimeout(() => {
          navigate("/organizer/login", {
            state: {
              notification: {
                type: "success",
                title: "Application received",
                message:
                  "Your organizer application is awaiting admin approval. You can sign in once your account is approved."
              }
            }
          });
        }, 2500);
      }
    } catch (error) {
      setNotification({
        type: "error",
        title: "Registration unsuccessful",
        message:
          error.response?.data?.message ||
          "We couldn't submit your application. Please try again."
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="organizer-register-page">
      <div className="organizer-register-glow organizer-register-glow-one" />
      <div className="organizer-register-glow organizer-register-glow-two" />
      <div className="organizer-register-ring organizer-register-ring-one" />
      <div className="organizer-register-ring organizer-register-ring-two" />

      <Link to="/organizer" className="organizer-register-back">
        <i className="bi bi-arrow-left" />
        Back to organizer portal
      </Link>

      {notification && (
        <div
          className={`organizer-register-toast organizer-register-toast-${notification.type}`}
          role="alert"
        >
          <div className="organizer-register-toast-icon">
            <i
              className={`bi ${
                notification.type === "success"
                  ? "bi-check-circle-fill"
                  : "bi-exclamation-circle-fill"
              }`}
            />
          </div>

          <div className="organizer-register-toast-copy">
            <strong>{notification.title}</strong>
            <p>{notification.message}</p>
          </div>

          <button
            type="button"
            onClick={() => setNotification(null)}
            aria-label="Close notification"
          >
            <i className="bi bi-x-lg" />
          </button>

          <div className="organizer-register-toast-progress" />
        </div>
      )}

      <div className="organizer-register-layout">
        <section className="organizer-register-intro">
          <Link to="/" className="organizer-register-brand">
            <div className="organizer-register-logo">
              <img src={vibelyLogo} alt="Vibely" />
            </div>

            <div>
              <h1>Vibely.</h1>
              <span>ORGANIZER STUDIO</span>
            </div>
          </Link>

          <div className="organizer-register-intro-copy">
            <span>YOUR NEXT CHAPTER STARTS HERE</span>

            <h2>
              Create the
              <br />
              <em>extraordinary.</em>
            </h2>

            <p>
              Turn your passion into memorable experiences.
              Join Vibely Organizer Studio to manage events,
              showcase apartments, and grow your business.
            </p>
          </div>

          <div className="organizer-register-features">
            <div>
              <span>01</span>
              <i className="bi bi-calendar2-heart" />
              <div>
                <strong>Create unforgettable events</strong>
                <p>
                  Bring people together through experiences
                  they'll remember.
                </p>
              </div>
            </div>

            <div>
              <span>02</span>
              <i className="bi bi-buildings" />
              <div>
                <strong>Showcase beautiful spaces</strong>
                <p>
                  Manage your apartments and guest bookings
                  in one place.
                </p>
              </div>
            </div>

            <div>
              <span>03</span>
              <i className="bi bi-graph-up-arrow" />
              <div>
                <strong>Grow with confidence</strong>
                <p>
                  Stay organized as your bookings and
                  business grow.
                </p>
              </div>
            </div>
          </div>

          <div className="organizer-register-note">
            <i className="bi bi-shield-check" />
            <p>
              Organizer applications are reviewed before
              dashboard access is granted.
            </p>
          </div>
        </section>

        <section className="organizer-register-card-wrap">
          <div className="organizer-register-badge">
            <i className="bi bi-stars" />
            YOUR CREATOR JOURNEY
          </div>

          <div className="organizer-register-card">
            <div className="organizer-register-card-shine" />

            <Link
              to="/"
              className="organizer-register-mobile-brand"
            >
              <img src={vibelyLogo} alt="Vibely" />
              <strong>Vibely.</strong>
            </Link>

            <div className="organizer-register-heading">
              <span>JOIN ORGANIZER STUDIO</span>
              <h2>Let's get you started.</h2>
              <p>
                Tell us a little about yourself and the
                business you're building.
              </p>
            </div>

            <Formik
              initialValues={initialValues}
              validationSchema={registrationSchema}
              onSubmit={handleRegister}
            >
              {({
                values,
                errors,
                touched,
                isSubmitting
              }) => (
                <Form className="organizer-register-form">
                  <div className="organizer-register-grid">
                    <div className="organizer-register-field">
                      <label htmlFor="organizer-firstname">
                        First name
                      </label>

                      <div
                        className={`organizer-register-input ${
                          touched.firstname && errors.firstname
                            ? "organizer-register-input-error"
                            : ""
                        }`}
                      >
                        <i className="bi bi-person" />
                        <Field
                          id="organizer-firstname"
                          name="firstname"
                          placeholder="First name"
                          autoComplete="given-name"
                        />
                      </div>

                      <ErrorMessage
                        name="firstname"
                        component="div"
                        className="organizer-register-error"
                      />
                    </div>

                    <div className="organizer-register-field">
                      <label htmlFor="organizer-lastname">
                        Last name
                      </label>

                      <div
                        className={`organizer-register-input ${
                          touched.lastname && errors.lastname
                            ? "organizer-register-input-error"
                            : ""
                        }`}
                      >
                        <i className="bi bi-person" />
                        <Field
                          id="organizer-lastname"
                          name="lastname"
                          placeholder="Last name"
                          autoComplete="family-name"
                        />
                      </div>

                      <ErrorMessage
                        name="lastname"
                        component="div"
                        className="organizer-register-error"
                      />
                    </div>
                  </div>

                  <div className="organizer-register-field">
                    <label htmlFor="organizer-business">
                      Business name
                    </label>

                    <div
                      className={`organizer-register-input ${
                        touched.businessName && errors.businessName
                          ? "organizer-register-input-error"
                          : ""
                      }`}
                    >
                      <i className="bi bi-briefcase" />
                      <Field
                        id="organizer-business"
                        name="businessName"
                        placeholder="Your brand or business name"
                        autoComplete="organization"
                      />
                    </div>

                    <ErrorMessage
                      name="businessName"
                      component="div"
                      className="organizer-register-error"
                    />
                  </div>

                  <div className="organizer-register-grid">
                    <div className="organizer-register-field">
                      <label htmlFor="organizer-phone">
                        Phone number
                      </label>

                      <div
                        className={`organizer-register-input ${
                          touched.phone && errors.phone
                            ? "organizer-register-input-error"
                            : ""
                        }`}
                      >
                        <i className="bi bi-telephone" />
                        <Field
                          id="organizer-phone"
                          name="phone"
                          type="tel"
                          placeholder="08012345678"
                          autoComplete="tel"
                        />
                      </div>

                      <ErrorMessage
                        name="phone"
                        component="div"
                        className="organizer-register-error"
                      />
                    </div>

                    <div className="organizer-register-field">
                      <label htmlFor="organizer-email">
                        Email address
                      </label>

                      <div
                        className={`organizer-register-input ${
                          touched.email && errors.email
                            ? "organizer-register-input-error"
                            : ""
                        }`}
                      >
                        <i className="bi bi-envelope" />
                        <Field
                          id="organizer-email"
                          name="email"
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                        />
                      </div>

                      <ErrorMessage
                        name="email"
                        component="div"
                        className="organizer-register-error"
                      />
                    </div>
                  </div>

                  <div className="organizer-register-field">
                    <label htmlFor="organizer-password">
                      Create password
                    </label>

                    <div
                      className={`organizer-register-input ${
                        touched.password && errors.password
                          ? "organizer-register-input-error"
                          : ""
                      }`}
                    >
                      <i className="bi bi-lock" />

                      <Field
                        id="organizer-password"
                        name="password"
                        type={
                          showPassword ? "text" : "password"
                        }
                        placeholder="Create a strong password"
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        className="organizer-register-eye"
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
                        />
                      </button>
                    </div>

                    <ErrorMessage
                      name="password"
                      component="div"
                      className="organizer-register-error"
                    />
                  </div>

                  <div className="organizer-register-password-rules">
                    {passwordChecks.map((rule) => (
                      <div
                        key={rule.label}
                        className={
                          rule.test(values.password)
                            ? "passed"
                            : ""
                        }
                      >
                        <i
                          className={`bi ${
                            rule.test(values.password)
                              ? "bi-check-circle-fill"
                              : "bi-circle"
                          }`}
                        />
                        {rule.label}
                      </div>
                    ))}
                  </div>

                  <div className="organizer-register-approval">
                    <i className="bi bi-info-circle" />
                    <p>
                      Your application will be reviewed by
                      the Vibely admin team. Dashboard access
                      becomes available after approval.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="organizer-register-submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="organizer-register-spinner" />
                        Submitting application...
                      </>
                    ) : (
                      <>
                        Submit organizer application
                        <i className="bi bi-arrow-up-right" />
                      </>
                    )}
                  </button>
                </Form>
              )}
            </Formik>

            <div className="organizer-register-login">
              <span>Already an organizer?</span>

              <button
                type="button"
                onClick={() =>
                  navigate("/organizer/login")
                }
              >
                Sign in
                <i className="bi bi-arrow-right" />
              </button>
            </div>

            <div className="organizer-register-secure">
              <i className="bi bi-shield-lock" />
              Your information is submitted securely
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default OrganizerRegister;