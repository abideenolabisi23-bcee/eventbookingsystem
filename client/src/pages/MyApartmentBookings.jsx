import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import Navbar from "../component/Navbar";
import DetailFooter from "../component/DetailFooter";
import vibelyLogo from "../assets/vibely-logo.png";

import "../styles/myApartmentBookings.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const IMAGE_FIELDS = [
  ["exterior", "Exterior"],
  ["livingRoom", "Sitting room"],
  ["bedroom", "Bedroom"],
  ["kitchen", "Kitchen"],
  ["bathroom", "Bathroom"],
  ["balcony", "Balcony"],
  ["diningRoom", "Dining area"]
];

const formatPrice = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

const formatStatus = (value) =>
  String(value || "unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatStayType = (value) =>
  value === "day_use" || value === "day-use"
    ? "Day Use"
    : value === "overnight"
      ? "Overnight"
      : "Apartment Booking";

const getImageUrl = (value) => {
  if (typeof value === "string") return value;

  if (value && typeof value === "object") {
    return value.secure_url || value.url || value.src || "";
  }

  return "";
};

const getApartmentImages = (apartment) => {
  const images = apartment?.images;
  const result = [];

  const addImage = (value, label) => {
    if (Array.isArray(value)) {
      value.forEach((item) => addImage(item, label));
      return;
    }

    const url = getImageUrl(value);

    if (url && !result.some((item) => item.url === url)) {
      result.push({ url, label });
    }
  };

  if (Array.isArray(images)) {
    images.forEach((image, index) => {
      addImage(image, `Apartment photo ${index + 1}`);
    });
  } else if (images && typeof images === "object") {
    IMAGE_FIELDS.forEach(([field, label]) => {
      addImage(images[field], label);
    });

    Object.entries(images).forEach(([field, value]) => {
      addImage(
        value,
        field.replace(/([A-Z])/g, " $1")
      );
    });
  }

  addImage(apartment?.image, "Apartment");
  addImage(apartment?.imageUrl, "Apartment");

  return result.slice(0, 7);
};

const getBookingStatus = (booking) => {
  if (
    booking.bookingStatus === "pending" &&
    booking.paymentStatus === "pending" &&
    booking.expiresAt &&
    new Date(booking.expiresAt).getTime() <= Date.now()
  ) {
    return "expired";
  }

  return booking.bookingStatus || "pending";
};

const actionButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "11px 16px",
  borderRadius: 12,
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  border: "1px solid #d9e2ec",
  background: "#fff",
  color: "#25324a"
};

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(12, 22, 39, 0.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  zIndex: 9999
};

const modalCardStyle = {
  width: "100%",
  maxWidth: 440,
  background: "#fff",
  borderRadius: 22,
  padding: 28,
  boxShadow: "0 24px 70px rgba(0,0,0,0.2)"
};

const MyApartmentBookings = () => {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [cancelBooking, setCancelBooking] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [now, setNow] = useState(Date.now());

  const redirectToLogin = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");

    navigate("/login", {
      replace: true,
      state: {
        returnTo: "/my-apartment-bookings"
      }
    });
  }, [navigate]);

  const fetchBookings = useCallback(
    async (signal) => {
      const accessToken = localStorage.getItem("accessToken");

      if (!accessToken) {
        redirectToLogin();
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `${API_URL}/apartment-bookings/my`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            },
            signal
          }
        );

        const data = response.data?.data;

        const bookingList = Array.isArray(data)
          ? data
          : Array.isArray(data?.bookings)
            ? data.bookings
            : [];

        if (!signal?.aborted) {
          setBookings(bookingList);
        }
      } catch (requestError) {
        if (
          axios.isCancel(requestError) ||
          signal?.aborted
        ) {
          return;
        }

        if (requestError.response?.status === 401) {
          redirectToLogin();
          return;
        }

        setError(
          requestError.response?.data?.message ||
          "Unable to load your apartment bookings."
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [redirectToLogin]
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchBookings(controller.signal);

    return () => controller.abort();
  }, [fetchBookings]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedPhoto(null);
        setCancelBooking(null);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const showNotice = (type, message) => {
    setNotice({ type, message });
  };

  const getStatus = (booking) => {
    if (
      booking.bookingStatus === "pending" &&
      booking.paymentStatus === "pending" &&
      booking.expiresAt &&
      new Date(booking.expiresAt).getTime() <= now
    ) {
      return "expired";
    }

    return getBookingStatus(booking);
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const status =
        booking.bookingStatus === "pending" &&
        booking.paymentStatus === "pending" &&
        booking.expiresAt &&
        new Date(booking.expiresAt).getTime() <= now
          ? "expired"
          : booking.bookingStatus;

      if (filter === "all") return true;
      if (filter === "confirmed") return status === "confirmed";
      if (filter === "pending") return status === "pending";
      if (filter === "expired") return status === "expired";
      if (filter === "cancelled") return status === "cancelled";

      return true;
    });
  }, [bookings, filter, now]);

  const confirmedCount = bookings.filter(
    (booking) => booking.bookingStatus === "confirmed"
  ).length;

  const paidCount = bookings.filter(
    (booking) => booking.paymentStatus === "paid"
  ).length;

  const pendingCount = bookings.filter(
    (booking) => getStatus(booking) === "pending"
  ).length;

  const expiredCount = bookings.filter(
    (booking) => getStatus(booking) === "expired"
  ).length;

  const refreshBookings = async () => {
    await fetchBookings();
  };

  const handleCancel = async () => {
    if (!cancelBooking || processingId) return;

    const bookingId = cancelBooking._id;
    const accessToken = localStorage.getItem("accessToken");

    if (!accessToken) {
      redirectToLogin();
      return;
    }

    try {
      setProcessingId(bookingId);

      const response = await axios.patch(
        `${API_URL}/apartment-bookings/${bookingId}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      setCancelBooking(null);

      showNotice(
        "success",
        response.data?.message ||
          "Apartment booking cancelled successfully."
      );

      await refreshBookings();
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        redirectToLogin();
        return;
      }

      const responseData = requestError.response?.data;

      setCancelBooking(null);

      showNotice(
        responseData?.bookingCancelled ? "warning" : "error",
        responseData?.message ||
          "Unable to cancel this apartment booking."
      );

      if (responseData?.bookingCancelled) {
        await refreshBookings();
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleRetryPayment = async (booking) => {
    if (processingId) return;

    const accessToken = localStorage.getItem("accessToken");

    if (!accessToken) {
      redirectToLogin();
      return;
    }

    try {
      setProcessingId(booking._id);

      const response = await axios.post(
        `${API_URL}/apartment-payments/initialize`,
        {
          bookingId: booking._id
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      const authorizationUrl =
        response.data?.data?.authorizationUrl;

      if (!authorizationUrl) {
        throw new Error(
          "Payment link was not returned by the server."
        );
      }

      if (
        !authorizationUrl.startsWith(
          "https://checkout.paystack.com/"
        )
      ) {
        throw new Error("Invalid Paystack checkout link.");
      }

      window.location.assign(authorizationUrl);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        redirectToLogin();
        return;
      }

      const responseData = requestError.response?.data;

      if (
        requestError.response?.status === 409 &&
        responseData?.reference
      ) {
        showNotice(
          "warning",
          "A successful payment was found. Please verify that payment before trying again."
        );

        return;
      }

      showNotice(
        "error",
        responseData?.message ||
          requestError.message ||
          "Unable to start apartment payment."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const toggleDetails = (bookingId) => {
    setExpandedId((current) =>
      current === bookingId ? null : bookingId
    );
  };

  const filters = [
    ["all", "All Bookings"],
    ["confirmed", "Confirmed"],
    ["pending", "Pending"],
    ["expired", "Expired"],
    ["cancelled", "Cancelled"]
  ];

  return (
    <>
      <Navbar />

      <main className="my-apartment-page">
        <section className="my-apartment-header">
          <div className="my-apartment-header-inner">
            <div className="my-apartment-header-copy">
              <span className="my-apartment-eyebrow">
                YOUR VIBELY STAYS
              </span>

              <h1>
                Apartment <em>Bookings.</em>
              </h1>

              <p>
                Manage your reservations, stay dates,
                payments and apartment tickets in one
                beautiful space.
              </p>
            </div>

            <div className="apartment-hero-summary">
              <div className="apartment-hero-summary-icon">
                <i className="bi bi-house-heart"></i>
              </div>

              <div className="apartment-hero-summary-text">
                <span>MY RESERVATIONS</span>

                <strong>
                  {bookings.length}{" "}
                  {bookings.length === 1
                    ? "Booking"
                    : "Bookings"}
                </strong>

                <p>Your Vibely stays in one place</p>
              </div>
            </div>
          </div>
        </section>

        <section className="my-apartment-content">
          <div className="my-apartment-container">
            {loading && (
              <div className="my-apartment-state">
                <div className="my-apartment-loader"></div>

                <h3>Loading your bookings...</h3>

                <p>
                  We're getting your apartment
                  reservations ready.
                </p>
              </div>
            )}

            {!loading && error && (
              <div className="my-apartment-state">
                <div className="my-apartment-state-icon">
                  <i className="bi bi-exclamation-circle"></i>
                </div>

                <h3>Unable to load bookings</h3>
                <p>{error}</p>

                <button
                  type="button"
                  onClick={refreshBookings}
                >
                  Try Again
                  <i className="bi bi-arrow-clockwise"></i>
                </button>
              </div>
            )}

            {!loading && !error && bookings.length === 0 && (
              <div className="my-apartment-state">
                <div className="my-apartment-state-icon">
                  <i className="bi bi-building"></i>
                </div>

                <h3>No apartment bookings yet</h3>

                <p>
                  Find a beautiful space for your next
                  day-use or overnight stay.
                </p>

                <Link to="/apartments">
                  Explore Apartments
                  <i className="bi bi-arrow-right"></i>
                </Link>
              </div>
            )}

            {!loading && !error && bookings.length > 0 && (
              <>
                <section className="my-apartment-summary">
                  {[
                    {
                      label: "ALL BOOKINGS",
                      value: bookings.length,
                      detail: "Total reservations",
                      icon: "bi-building-check"
                    },
                    {
                      label: "CONFIRMED",
                      value: confirmedCount,
                      detail: "Ready reservations",
                      icon: "bi-patch-check"
                    },
                    {
                      label: "PAID",
                      value: paidCount,
                      detail: "Completed payments",
                      icon: "bi-credit-card"
                    },
                    {
                      label: "PENDING",
                      value: pendingCount,
                      detail: "Awaiting payment",
                      icon: "bi-clock-history"
                    }
                  ].map((item) => (
                    <div
                      className="apartment-summary-card"
                      key={item.label}
                    >
                      <div className="apartment-summary-icon">
                        <i className={`bi ${item.icon}`}></i>
                      </div>

                      <div>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                        <p>{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </section>

                <div className="my-apartment-top">
                  <div>
                    <span className="my-apartment-small-title">
                      YOUR RESERVATIONS
                    </span>

                    <h2>Your apartment stays</h2>

                    <p>
                      Review your reservations and
                      manage your payments.
                    </p>
                  </div>

                  <Link
                    to="/apartments"
                    className="find-apartment-button"
                  >
                    Find Apartments
                    <i className="bi bi-arrow-right"></i>
                  </Link>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    marginBottom: 25
                  }}
                >
                  {filters.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilter(value)}
                      style={{
                        ...actionButtonStyle,
                        borderColor:
                          filter === value
                            ? "#142c56"
                            : "#d9e2ec",
                        background:
                          filter === value
                            ? "#142c56"
                            : "#fff",
                        color:
                          filter === value
                            ? "#fff"
                            : "#25324a"
                      }}
                    >
                      {label}

                      {value === "expired" && expiredCount > 0
                        ? ` (${expiredCount})`
                        : ""}
                    </button>
                  ))}
                </div>

                {filteredBookings.length === 0 ? (
                  <div className="my-apartment-state">
                    <h3>No bookings in this category</h3>

                    <p>
                      Choose another filter to view
                      your reservations.
                    </p>

                    <button
                      type="button"
                      onClick={() => setFilter("all")}
                    >
                      View All Bookings
                    </button>
                  </div>
                ) : (
                  <div className="my-apartment-bookings-list">
                    {filteredBookings.map((booking, index) => {
                      const apartment =
                        booking.apartment || {};

                      const photos =
                        getApartmentImages(apartment);

                      const apartmentImage =
                        photos[0]?.url;

                      const status = getStatus(booking);

                      const isExpanded =
                        expandedId === booking._id;

                      const canViewTicket =
                        status === "confirmed" &&
                        booking.paymentStatus === "paid";

                      const canRetry =
                        ["pending", "expired"].includes(
                          status
                        ) &&
                        ["pending", "failed"].includes(
                          booking.paymentStatus
                        );

                      const canCancel =
                        ["pending", "confirmed"].includes(
                          status
                        ) &&
                        !["checked_in", "checked_out"].includes(
                          booking.stayStatus
                        ) &&
                        booking.paymentStatus !== "refunded";

                      const isProcessing =
                        processingId === booking._id;

                      const detailFields = [
                        {
                          label: "Check-in",
                          value: formatDate(
                            booking.checkInDate
                          )
                        },
                        {
                          label: "Check-out",
                          value: formatDate(
                            booking.checkOutDate
                          )
                        },
                        {
                          label: "Stay type",
                          value: formatStayType(
                            booking.stayType
                          )
                        },
                        {
                          label: "Units booked",
                          value:
                            booking.numberOfUnits ?? "—"
                        },
                        {
                          label: "Number of nights",
                          value:
                            booking.stayType === "overnight"
                              ? booking.numberOfNights ?? "—"
                              : "Not applicable"
                        },
                        {
                          label: "Expected check-in",
                          value:
                            booking.expectedCheckInTime ||
                            "Not specified"
                        },
                        {
                          label: "Stay status",
                          value: formatStatus(
                            booking.stayStatus
                          )
                        },
                        {
                          label: "Booking status",
                          value: formatStatus(status)
                        },
                        {
                          label: "Payment status",
                          value: formatStatus(
                            booking.paymentStatus
                          )
                        }
                      ];

                      return (
                        <article
                          key={booking._id}
                          className={`apartment-reservation-card ${
                            isExpanded
                              ? "apt-booking-expanded"
                              : ""
                          }`}
                        >
                          <div className="reservation-image-section">
                            {apartmentImage ? (
                              <img
                                src={apartmentImage}
                                alt={
                                  apartment.title ||
                                  "Vibely Apartment"
                                }
                              />
                            ) : (
                              <div className="reservation-image-placeholder">
                                <i className="bi bi-building"></i>
                              </div>
                            )}

                            <div className="reservation-image-shade"></div>

                            <span className="reservation-number">
                              RESERVATION{" "}
                              {String(index + 1).padStart(
                                2,
                                "0"
                              )}
                            </span>

                            <div className="reservation-image-brand">
                              <img
                                src={vibelyLogo}
                                alt="Vibely"
                              />

                              <span>VIBELY STAYS</span>
                            </div>
                          </div>

                          <div className="reservation-main">
                            <div className="reservation-heading">
                              <div>
                                <span className="reservation-type">
                                  {formatStayType(
                                    booking.stayType
                                  )}
                                </span>

                                <h3>
                                  {apartment.title ||
                                    "Vibely Apartment"}
                                </h3>

                                <p>
                                  <i className="bi bi-geo-alt"></i>
                                  {apartment.location ||
                                    "Location unavailable"}
                                </p>
                              </div>

                              <div className="reservation-statuses">
                                <span
                                  className={`reservation-booking-status ${status}`}
                                >
                                  <i
                                    className={`bi ${
                                      status === "confirmed"
                                        ? "bi-check-circle-fill"
                                        : status === "cancelled" ||
                                            status === "expired"
                                          ? "bi-x-circle-fill"
                                          : "bi-clock-fill"
                                    }`}
                                  ></i>

                                  {formatStatus(status)}
                                </span>

                                <span
                                  className={`reservation-payment-status ${
                                    booking.paymentStatus || ""
                                  }`}
                                >
                                  <i className="bi bi-credit-card"></i>
                                  {formatStatus(
                                    booking.paymentStatus
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="reservation-stay-details">
                              <div>
                                <span>CHECK-IN</span>

                                <strong>
                                  {formatDate(
                                    booking.checkInDate
                                  )}
                                </strong>
                              </div>

                              {booking.stayType ===
                                "overnight" && (
                                <div>
                                  <span>CHECK-OUT</span>

                                  <strong>
                                    {formatDate(
                                      booking.checkOutDate
                                    )}
                                  </strong>
                                </div>
                              )}

                              <div>
                                <span>UNITS</span>

                                <strong>
                                  {booking.numberOfUnits ??
                                    0}
                                </strong>
                              </div>

                              {booking.stayType ===
                                "overnight" && (
                                <div>
                                  <span>NIGHTS</span>

                                  <strong>
                                    {booking.numberOfNights ??
                                      0}
                                  </strong>
                                </div>
                              )}
                            </div>

                            <div className="reservation-bottom">
                              <div className="reservation-reference">
                                <span>
                                  BOOKING REFERENCE
                                </span>

                                <strong>
                                  {booking.bookingReference ||
                                    "—"}
                                </strong>
                              </div>

                              <div className="reservation-price">
                                <span>TOTAL AMOUNT</span>

                                <strong>
                                  {formatPrice(
                                    booking.totalAmount
                                  )}
                                </strong>
                              </div>

                              <button
                                type="button"
                                className="reservation-view-button"
                                onClick={() =>
                                  toggleDetails(booking._id)
                                }
                                aria-expanded={isExpanded}
                              >
                                {isExpanded
                                  ? "Hide Details"
                                  : "View Details"}

                                <i
                                  className={`bi ${
                                    isExpanded
                                      ? "bi-chevron-up"
                                      : "bi-chevron-down"
                                  }`}
                                ></i>
                              </button>
                            </div>

                            {(canRetry || canCancel) && (
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 10,
                                  paddingTop: 18
                                }}
                              >
                                {canRetry && (
                                  <button
                                    type="button"
                                    disabled={Boolean(
                                      processingId
                                    )}
                                    onClick={() =>
                                      handleRetryPayment(
                                        booking
                                      )
                                    }
                                    style={{
                                      ...actionButtonStyle,
                                      background: "#142c56",
                                      color: "#fff",
                                      borderColor: "#142c56",
                                      opacity: processingId
                                        ? 0.7
                                        : 1
                                    }}
                                  >
                                    <i className="bi bi-credit-card"></i>
                                    {isProcessing
                                      ? "Please wait..."
                                      : status === "expired"
                                        ? "Check Availability & Pay"
                                        : "Complete Payment"}
                                  </button>
                                )}

                                {canCancel && (
                                  <button
                                    type="button"
                                    disabled={Boolean(
                                      processingId
                                    )}
                                    onClick={() =>
                                      setCancelBooking(
                                        booking
                                      )
                                    }
                                    style={{
                                      ...actionButtonStyle,
                                      color: "#b42336",
                                      borderColor: "#f3c9cf"
                                    }}
                                  >
                                    <i className="bi bi-x-circle"></i>
                                    Cancel Booking
                                  </button>
                                )}
                              </div>
                            )}

                            {status === "expired" && (
                              <p
                                style={{
                                  marginTop: 14,
                                  color: "#9b5c16",
                                  fontSize: 13
                                }}
                              >
                                Your payment reservation has
                                expired. You can check room
                                availability and start a new
                                payment session.
                              </p>
                            )}

                            {status === "cancelled" &&
                              booking.paymentStatus ===
                                "paid" && (
                                <p
                                  style={{
                                    marginTop: 14,
                                    color: "#9b5c16",
                                    fontSize: 13
                                  }}
                                >
                                  Your booking was cancelled.
                                  If a refund was requested,
                                  its status must be confirmed
                                  by the payment service.
                                </p>
                              )}
                          </div>

                          {isExpanded && (
                            <section
                              id={`apartment-details-${booking._id}`}
                              className="apt-expanded-details"
                            >
                              <div className="apt-expanded-heading">
                                <div>
                                  <span>
                                    RESERVATION DETAILS
                                  </span>

                                  <h4>
                                    Your booking at a glance
                                  </h4>
                                </div>

                                <span className="apt-expanded-count">
                                  {photos.length}{" "}
                                  {photos.length === 1
                                    ? "photo"
                                    : "photos"}
                                </span>
                              </div>

                              {photos.length > 0 && (
                                <div className="apt-compact-gallery">
                                  {photos.map(
                                    (photo, photoIndex) => (
                                      <button
                                        key={`${photo.url}-${photoIndex}`}
                                        type="button"
                                        className="apt-gallery-thumb"
                                        onClick={() =>
                                          setSelectedPhoto(
                                            photo
                                          )
                                        }
                                      >
                                        <img
                                          src={photo.url}
                                          alt={photo.label}
                                          loading="lazy"
                                        />

                                        <span>
                                          {photo.label}
                                        </span>
                                      </button>
                                    )
                                  )}
                                </div>
                              )}

                              <div className="apt-expanded-information">
                                {detailFields.map((field) => (
                                  <div
                                    key={field.label}
                                    className="apt-expanded-field"
                                  >
                                    <span>{field.label}</span>

                                    <strong>
                                      {field.value}
                                    </strong>
                                  </div>
                                ))}
                              </div>

                              {Array.isArray(
                                apartment.amenities
                              ) &&
                                apartment.amenities.length >
                                  0 && (
                                  <div className="apt-expanded-amenities">
                                    <span>
                                      APARTMENT AMENITIES
                                    </span>

                                    <div>
                                      {apartment.amenities.map(
                                        (amenity, index) => (
                                          <span
                                            key={`${amenity}-${index}`}
                                          >
                                            <i className="bi bi-check2"></i>
                                            {amenity}
                                          </span>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                              <div className="apt-expanded-footer">
                                <div className="apt-expanded-payment">
                                  <span>
                                    BOOKING REFERENCE
                                  </span>

                                  <strong>
                                    {booking.bookingReference ||
                                      "—"}
                                  </strong>

                                  <small>
                                    Total:{" "}
                                    {formatPrice(
                                      booking.totalAmount
                                    )}
                                  </small>
                                </div>

                                {canViewTicket ? (
                                  <Link
                                    to={`/my-tickets?type=apartment&booking=${encodeURIComponent(
                                      booking._id
                                    )}`}
                                    className="apt-view-ticket-button"
                                  >
                                    <i className="bi bi-ticket-perforated"></i>
                                    View Apartment Ticket
                                    <i className="bi bi-arrow-right"></i>
                                  </Link>
                                ) : (
                                  <span className="apt-ticket-unavailable">
                                    {status === "cancelled" ||
                                    status === "expired"
                                      ? "Ticket unavailable for this reservation"
                                      : "Ticket available after payment confirmation"}
                                  </span>
                                )}
                              </div>
                            </section>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}

                <div className="my-apartment-help-card">
                  <div className="my-apartment-help-icon">
                    <i className="bi bi-house-heart"></i>
                  </div>

                  <div>
                    <span>YOUR STAY</span>

                    <h3>
                      All your reservations in one place
                    </h3>

                    <p>
                      View your bookings, manage payments,
                      cancel eligible reservations and
                      access confirmed tickets.
                    </p>
                  </div>

                  <Link to="/apartments">
                    Explore Apartments
                    <i className="bi bi-arrow-right"></i>
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      {cancelBooking && (
        <div
          style={modalOverlayStyle}
          onClick={() => {
            if (!processingId) {
              setCancelBooking(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-apartment-title"
            style={modalCardStyle}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                background: "#fff0f1",
                color: "#c42d46",
                display: "grid",
                placeItems: "center",
                fontSize: 25,
                marginBottom: 18
              }}
            >
              <i className="bi bi-exclamation-triangle"></i>
            </div>

            <h3
              id="cancel-apartment-title"
              style={{ marginBottom: 12 }}
            >
              Cancel Apartment Booking?
            </h3>

            <p
              style={{
                color: "#617087",
                lineHeight: 1.7
              }}
            >
              Are you sure you want to cancel your
              reservation at{" "}
              <strong>
                {cancelBooking.apartment?.title ||
                  "this apartment"}
              </strong>
              ?
            </p>

            {cancelBooking.paymentStatus === "paid" && (
              <p
                style={{
                  marginTop: 12,
                  color: "#9b5c16",
                  fontSize: 13
                }}
              >
                Your booking will be cancelled and a
                refund request will be submitted.
                Refund completion is not immediate.
              </p>
            )}

            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 24
              }}
            >
              <button
                type="button"
                disabled={Boolean(processingId)}
                onClick={() =>
                  setCancelBooking(null)
                }
                style={{
                  ...actionButtonStyle,
                  flex: 1
                }}
              >
                Keep Booking
              </button>

              <button
                type="button"
                disabled={Boolean(processingId)}
                onClick={handleCancel}
                style={{
                  ...actionButtonStyle,
                  flex: 1,
                  background: "#bd2941",
                  borderColor: "#bd2941",
                  color: "#fff"
                }}
              >
                {processingId
                  ? "Cancelling..."
                  : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div style={modalOverlayStyle}>
          <div
            role="alertdialog"
            aria-modal="true"
            style={modalCardStyle}
          >
            <div
              style={{
                fontSize: 35,
                color:
                  notice.type === "success"
                    ? "#16834a"
                    : notice.type === "warning"
                      ? "#b87919"
                      : "#c42d46",
                marginBottom: 15
              }}
            >
              <i
                className={`bi ${
                  notice.type === "success"
                    ? "bi-check-circle-fill"
                    : notice.type === "warning"
                      ? "bi-exclamation-circle-fill"
                      : "bi-x-circle-fill"
                }`}
              ></i>
            </div>

            <h3>
              {notice.type === "success"
                ? "Successful"
                : notice.type === "warning"
                  ? "Attention Required"
                  : "Something Went Wrong"}
            </h3>

            <p
              style={{
                color: "#617087",
                lineHeight: 1.7,
                marginTop: 12
              }}
            >
              {notice.message}
            </p>

            <button
              type="button"
              onClick={() => setNotice(null)}
              style={{
                ...actionButtonStyle,
                width: "100%",
                marginTop: 24,
                background: "#142c56",
                borderColor: "#142c56",
                color: "#fff"
              }}
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {selectedPhoto && (
        <div
          className="apt-photo-modal"
          role="presentation"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="apt-photo-modal-content"
            role="dialog"
            aria-modal="true"
            aria-label={selectedPhoto.label}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="apt-photo-modal-close"
              onClick={() =>
                setSelectedPhoto(null)
              }
              aria-label="Close photo"
            >
              <i className="bi bi-x-lg"></i>
            </button>

            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.label}
            />

            <span>{selectedPhoto.label}</span>
          </div>
        </div>
      )}

      <DetailFooter />
    </>
  );
};

export default MyApartmentBookings;