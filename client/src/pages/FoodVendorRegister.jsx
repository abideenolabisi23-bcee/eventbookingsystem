
import axios from "axios";
import { useFormik } from "formik";
import { Link, useNavigate } from "react-router-dom";
import * as yup from "yup";
import { useEffect, useRef, useState } from "react";

import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/foodVendorRegister.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const nameRegex = /^[A-Za-z]+$/;
const phoneRegex = /^(?:\+234|234|0)[789][01]\d{8}$/;

const validationSchema = yup.object({
  firstname: yup
    .string()
    .required("First name is required")
    .matches(nameRegex, "First name can only contain letters")
    .min(3, "First name must be at least 3 characters"),

  lastname: yup
    .string()
    .required("Last name is required")
    .matches(nameRegex, "Last name can only contain letters")
    .min(3, "Last name must be at least 3 characters"),

  businessName: yup
    .string()
    .trim()
    .required("Food business name is required")
    .min(2, "Business name must be at least 2 characters"),

  phone: yup
    .string()
    .required("Phone number is required")
    .transform((value) => value?.replace(/\s/g, ""))
    .matches(phoneRegex, "Enter a valid Nigerian phone number"),

  email: yup
    .string()
    .trim()
    .required("Email address is required")
    .email("Enter a valid email address"),

  password: yup
    .string()
    .required("Password is required")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must meet all requirements below"
    )
});

const FoodVendorRegister = () => {
  const navigate = useNavigate();
  const redirectTimer = useRef(null);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState(null);

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

    onSubmit: async (values, helpers) => {
      try {
        setLoading(true);
        setNotification(null);

        const payload = {
          firstname: values.firstname.trim(),
          lastname: values.lastname.trim(),
          businessName: values.businessName.trim(),
          phone: values.phone.replace(/\s/g, ""),
          email: values.email.trim().toLowerCase(),
          password: values.password
        };

        const response = await axios.post(
          `${API_URL}/register-food-vendor`,
          payload
        );

        if (response.status === 201) {
          setNotification({
            type: "success",
            title: "Application submitted successfully",
            message:
              "Your food vendor application has been received and is awaiting admin approval."
          });

          helpers.resetForm();

          redirectTimer.current = setTimeout(() => {
            navigate("/food-vendor/login", {
              state: {
                notification: {
                  type: "success",
                  title: "Application submitted",
                  message:
                    "Your food vendor account is awaiting admin approval. Sign in once your application has been approved."
                }
              }
            });
          }, 2500);
        }
      } catch (error) {
        setNotification({
          type: "error",
          title: "Application unsuccessful",
          message:
            error.response?.data?.message ||
            "We couldn't submit your food vendor application. Please try again."
        });
      } finally {
        setLoading(false);
      }
    }
  });

  useEffect(() => {
    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!notification || notification.type === "success") {
      return;
    }

    const timer = setTimeout(() => {
      setNotification(null);
    }, 4500);

    return () => clearTimeout(timer);
  }, [notification]);

  const handleLiveChange = (event) => {
    const { name, value } = event.target;

    formik.setFieldValue(name, value, true);
    formik.setFieldTouched(name, true, false);
  };

  const password = formik.values.password;

  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password)
  };

  const hasError = (field) =>
    Boolean(formik.touched[field] && formik.errors[field]);

  const fields = [
    {
      name: "firstname",
      label: "First name",
      placeholder: "First name",
      icon: "bi-person",
      type: "text"
    },
    {
      name: "lastname",
      label: "Last name",
      placeholder: "Last name",
      icon: "bi-person",
      type: "text"
    },
    {
      name: "businessName",
      label: "Food business name",
      placeholder: "Your restaurant or food brand",
      icon: "bi-shop",
      type: "text"
    },
    {
      name: "phone",
      label: "Phone number",
      placeholder: "08012345678",
      icon: "bi-telephone",
      type: "tel"
    },
    {
      name: "email",
      label: "Email address",
      placeholder: "Enter your email",
      icon: "bi-envelope",
      type: "email"
    }
  ];

  return (
    <main className="food-vendor-register-page">
      <div className="food-vendor-register-glow food-vendor-register-glow-one" />
      <div className="food-vendor-register-glow food-vendor-register-glow-two" />

      <Link to="/" className="food-vendor-register-home">
        <i className="bi bi-arrow-left" />
        Back to home
      </Link>

      <section className="food-vendor-register-layout">
        <div className="food-vendor-register-intro">
          <Link to="/" className="food-vendor-register-brand">
            <img src={vibelyLogo} alt="Vibely" />

            <div>
              <h1>Vibely</h1>
              <span>FOOD VENDOR</span>
            </div>
          </Link>

          <div className="food-vendor-register-intro-copy">
            <span>YOUR KITCHEN. MORE CUSTOMERS.</span>

            <h2>
              Turn your
              <br />
              passion for
              <br />
              <em>food into success.</em>
            </h2>

            <p>
              Join Vibely as a food vendor. Showcase your
              delicious meals, reach hungry customers, and
              manage your food business from one dedicated
              workspace.
            </p>
          </div>

          <div className="food-vendor-register-points">
            <div>
              <i className="bi bi-cup-hot" />
              <span>
                <strong>Showcase your menu</strong>
                Upload beautiful food photos, prices, and descriptions.
              </span>
            </div>

            <div>
              <i className="bi bi-bag-check" />
              <span>
                <strong>Manage food orders</strong>
                View and process customer food orders.
              </span>
            </div>

            <div>
              <i className="bi bi-graph-up-arrow" />
              <span>
                <strong>Grow your food business</strong>
                Track your sales and manage food availability.
              </span>
            </div>
          </div>
        </div>

        <div className="food-vendor-register-card-wrap">
          <div className="food-vendor-register-card">
            <div className="food-vendor-register-mobile-logo">
              <img src={vibelyLogo} alt="Vibely" />
              <strong>Vibely Food</strong>
            </div>

            {notification && (
              <div
                role="alert"
                className={`food-vendor-register-notification food-vendor-register-notification-${notification.type}`}
              >
                <div className="food-vendor-register-notification-icon">
                  <i
                    className={
                      notification.type === "success"
                        ? "bi bi-check-lg"
                        : "bi bi-exclamation-lg"
                    }
                  />
                </div>

                <div className="food-vendor-register-notification-content">
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

            <div className="food-vendor-register-heading">
              <span>FOOD VENDOR APPLICATION</span>
              <h2>Become a food vendor</h2>
              <p>
                Tell us about yourself and your food business
                to get started.
              </p>
            </div>

            <form
              onSubmit={formik.handleSubmit}
              className="food-vendor-register-form"
              noValidate
            >
              <div className="food-vendor-register-name-grid">
                {fields.slice(0, 2).map((field) => (
                  <div
                    className="food-vendor-register-field"
                    key={field.name}
                  >
                    <label htmlFor={`vendor-${field.name}`}>
                      {field.label}
                    </label>

                    <div
                      className={`food-vendor-register-input ${
                        hasError(field.name)
                          ? "food-vendor-register-input-error"
                          : ""
                      }`}
                    >
                      <i className={`bi ${field.icon}`} />

                      <input
                        id={`vendor-${field.name}`}
                        name={field.name}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={formik.values[field.name]}
                        onChange={handleLiveChange}
                        onBlur={formik.handleBlur}
                        autoComplete={
                          field.name === "firstname"
                            ? "given-name"
                            : "family-name"
                        }
                      />
                    </div>

                    {hasError(field.name) && (
                      <p className="food-vendor-register-error">
                        {formik.errors[field.name]}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {fields.slice(2).map((field) => (
                <div
                  className="food-vendor-register-field"
                  key={field.name}
                >
                  <label htmlFor={`vendor-${field.name}`}>
                    {field.label}
                  </label>

                  <div
                    className={`food-vendor-register-input ${
                      hasError(field.name)
                        ? "food-vendor-register-input-error"
                        : ""
                    }`}
                  >
                    <i className={`bi ${field.icon}`} />

                    <input
                      id={`vendor-${field.name}`}
                      name={field.name}
                      type={field.type}
                      placeholder={field.placeholder}
                      value={formik.values[field.name]}
                      onChange={handleLiveChange}
                      onBlur={formik.handleBlur}
                      autoComplete={
                        field.name === "email"
                          ? "email"
                          : field.name === "phone"
                          ? "tel"
                          : "organization"
                      }
                    />
                  </div>

                  {hasError(field.name) && (
                    <p className="food-vendor-register-error">
                      {formik.errors[field.name]}
                    </p>
                  )}
                </div>
              ))}

              <div className="food-vendor-register-field">
                <label htmlFor="vendor-password">
                  Create password
                </label>

                <div
                  className={`food-vendor-register-input ${
                    hasError("password")
                      ? "food-vendor-register-input-error"
                      : ""
                  }`}
                >
                  <i className="bi bi-lock" />

                  <input
                    id="vendor-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={formik.values.password}
                    onChange={handleLiveChange}
                    onBlur={formik.handleBlur}
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    className="food-vendor-register-eye"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    onClick={() => setShowPassword(!showPassword)}
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

                <div className="food-vendor-register-password-rules">
                  {[
                    ["length", "8+ characters"],
                    ["uppercase", "Uppercase"],
                    ["lowercase", "Lowercase"],
                    ["number", "Number"],
                    ["special", "Special character"]
                  ].map(([key, label]) => (
                    <span
                      key={key}
                      className={checks[key] ? "passed" : ""}
                    >
                      <i
                        className={`bi ${
                          checks[key]
                            ? "bi-check-circle-fill"
                            : "bi-circle"
                        }`}
                      />
                      {label}
                    </span>
                  ))}
                </div>

                {hasError("password") && (
                  <p className="food-vendor-register-error">
                    {formik.errors.password}
                  </p>
                )}
              </div>

              <div className="food-vendor-register-review-note">
                <i className="bi bi-shield-check" />

                <div>
                  <strong>Application review</strong>
                  <p>
                    Food vendor accounts require admin approval
                    before access to food management features.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="food-vendor-register-submit"
                disabled={!formik.isValid || !formik.dirty || loading}
              >
                {loading
                  ? "Submitting application..."
                  : "Submit food vendor application"}

                {!loading && <i className="bi bi-arrow-right" />}
              </button>
            </form>

            <div className="food-vendor-register-login">
              <span>Already registered as a food vendor?</span>
              <Link to="/food-vendor/login">Sign in</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default FoodVendorRegister;
