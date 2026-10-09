
import { useEffect, useState } from "react";
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

const getImageUrl = (value) => {
  if (typeof value === "string") return value;

  if (value && typeof value === "object") {
    return (
      value.secure_url ||
      value.url ||
      value.src ||
      ""
    );
  }

  return "";
};

const getApartmentImages = (apartment) => {
  if (!apartment) return [];

  const images = apartment.images;
  const result = [];

  const addImage = (value, label) => {
    const url = getImageUrl(value);

    if (
      url &&
      !result.some((image) => image.url === url)
    ) {
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

  addImage(apartment.image, "Apartment");
  addImage(apartment.imageUrl, "Apartment");

  return result.slice(0, 7);
};

const formatPrice = (price) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(price) || 0);

const formatDate = (date) => {
  if (!date) return "Not available";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "Not available";
  }

  return value.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

const formatStayType = (stayType) => {
  if (
    stayType === "day_use" ||
    stayType === "day-use"
  ) {
    return "Day Use";
  }

  if (stayType === "overnight") {
    return "Overnight";
  }

  return stayType || "Apartment Booking";
};

const formatStatus = (status) => {
  if (!status) return "Not available";

  return String(status)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
};

const MyApartmentBookings = () => {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchBookings = async () => {
      const accessToken =
        localStorage.getItem("accessToken");

      if (!accessToken) {
        navigate("/login", {
          replace: true,
          state: {
            returnTo: "/my-apartment-bookings"
          }
        });
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
            signal: controller.signal
          }
        );

        const responseData = response.data?.data;

        const bookingList = Array.isArray(responseData)
          ? responseData
          : Array.isArray(responseData?.bookings)
            ? responseData.bookings
            : [];

        setBookings(bookingList);
      } catch (error) {
        if (axios.isCancel(error)) return;

        console.log(
          "MY APARTMENT BOOKINGS ERROR:",
          error
        );

        if (error.response?.status === 401) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("role");

          navigate("/login", {
            replace: true,
            state: {
              returnTo: "/my-apartment-bookings"
            }
          });
          return;
        }

        setError(
          error.response?.data?.message ||
          "Cannot load your apartment bookings."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchBookings();

    return () => controller.abort();
  }, [navigate]);

  useEffect(() => {
    if (!selectedPhoto) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedPhoto(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [selectedPhoto]);

  const toggleDetails = (id) => {
    setExpandedId((current) =>
      current === id ? null : id
    );
  };

  const confirmedBookings = bookings.filter(
    (booking) =>
      booking.bookingStatus === "confirmed"
  ).length;

  const paidBookings = bookings.filter(
    (booking) =>
      booking.paymentStatus === "paid"
  ).length;

  const overnightBookings = bookings.filter(
    (booking) =>
      booking.stayType === "overnight"
  ).length;

  const dayUseBookings = bookings.filter(
    (booking) =>
      booking.stayType === "day_use" ||
      booking.stayType === "day-use"
  ).length;

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
                Apartment
                <em> Bookings.</em>
              </h1>

              <p>
                Manage your reservations, stay dates
                and payment details in one beautiful
                space.
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

                <p>
                  Your Vibely stays in one place
                </p>
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

                <span className="my-apartment-state-label">
                  SOMETHING WENT WRONG
                </span>

                <h3>Unable to load bookings</h3>

                <p>{error}</p>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                  <i className="bi bi-arrow-clockwise"></i>
                </button>
              </div>
            )}

            {!loading &&
              !error &&
              bookings.length === 0 && (
                <div className="my-apartment-state">
                  <div className="my-apartment-state-icon">
                    <i className="bi bi-building"></i>
                  </div>

                  <span className="my-apartment-state-label">
                    YOUR RESERVATIONS
                  </span>

                  <h3>No apartment bookings yet</h3>

                  <p>
                    Find a beautiful space for your
                    next day use or overnight stay.
                    Your reservations will appear here.
                  </p>

                  <Link to="/apartments">
                    Explore Apartments
                    <i className="bi bi-arrow-right"></i>
                  </Link>
                </div>
              )}

            {!loading &&
              !error &&
              bookings.length > 0 && (
                <>
                  <section className="my-apartment-summary">
                    <div className="apartment-summary-card">
                      <div className="apartment-summary-icon">
                        <i className="bi bi-building-check"></i>
                      </div>

                      <div>
                        <span>ALL BOOKINGS</span>
                        <strong>{bookings.length}</strong>
                        <p>Total reservations</p>
                      </div>
                    </div>

                    <div className="apartment-summary-card">
                      <div className="apartment-summary-icon">
                        <i className="bi bi-patch-check"></i>
                      </div>

                      <div>
                        <span>CONFIRMED</span>
                        <strong>{confirmedBookings}</strong>
                        <p>Ready reservations</p>
                      </div>
                    </div>

                    <div className="apartment-summary-card">
                      <div className="apartment-summary-icon">
                        <i className="bi bi-credit-card"></i>
                      </div>

                      <div>
                        <span>PAID</span>
                        <strong>{paidBookings}</strong>
                        <p>Completed payments</p>
                      </div>
                    </div>

                    <div className="apartment-summary-card">
                      <div className="apartment-summary-icon">
                        <i className="bi bi-moon-stars"></i>
                      </div>

                      <div>
                        <span>STAY TYPES</span>
                        <strong>
                          {overnightBookings +
                            dayUseBookings}
                        </strong>
                        <p>Day use & overnight</p>
                      </div>
                    </div>
                  </section>

                  <div className="my-apartment-top">
                    <div>
                      <span className="my-apartment-small-title">
                        YOUR RESERVATIONS
                      </span>

                      <h2>Your apartment stays</h2>

                      <p>
                        Review your dates, payment
                        status and reservation details.
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

                  <div className="my-apartment-bookings-list">
                    {bookings.map((booking, index) => {
                      const apartment =
                        booking.apartment || {};

                      const photos =
                        getApartmentImages(apartment);

                      const apartmentImage =
                        photos[0]?.url;

                      const isExpanded =
                        expandedId === booking._id;

                      const canViewTicket =
                        booking.bookingStatus ===
                          "confirmed" &&
                        booking.paymentStatus ===
                          "paid";

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
                            booking.stayType ===
                            "overnight"
                              ? booking.numberOfNights ??
                                "—"
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
                          value: formatStatus(
                            booking.bookingStatus
                          )
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
                          className={`apartment-reservation-card ${
                            isExpanded
                              ? "apt-booking-expanded"
                              : ""
                          }`}
                          key={booking._id}
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
                              {String(
                                index + 1
                              ).padStart(2, "0")}
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
                                  className={`reservation-booking-status ${booking.bookingStatus || ""}`}
                                >
                                  <i
                                    className={
                                      booking.bookingStatus ===
                                      "confirmed"
                                        ? "bi bi-check-circle-fill"
                                        : booking.bookingStatus ===
                                            "cancelled"
                                          ? "bi bi-x-circle-fill"
                                          : "bi bi-clock-fill"
                                    }
                                  ></i>

                                  {formatStatus(
                                    booking.bookingStatus
                                  )}
                                </span>

                                <span
                                  className={`reservation-payment-status ${booking.paymentStatus || ""}`}
                                >
                                  <i
                                    className={
                                      booking.paymentStatus ===
                                      "paid"
                                        ? "bi bi-credit-card-fill"
                                        : booking.paymentStatus ===
                                            "refunded"
                                          ? "bi bi-arrow-counterclockwise"
                                          : booking.paymentStatus ===
                                              "failed"
                                            ? "bi bi-x-circle-fill"
                                            : "bi bi-clock"
                                    }
                                  ></i>

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
                                  toggleDetails(
                                    booking._id
                                  )
                                }
                                aria-expanded={isExpanded}
                                aria-controls={`apartment-details-${booking._id}`}
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
                                    Your booking at a
                                    glance
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
                                        title={`View ${photo.label}`}
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
                                {detailFields.map(
                                  (field) => (
                                    <div
                                      key={field.label}
                                      className="apt-expanded-field"
                                    >
                                      <span>
                                        {field.label}
                                      </span>

                                      <strong>
                                        {field.value}
                                      </strong>
                                    </div>
                                  )
                                )}
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
                                        (
                                          amenity,
                                          amenityIndex
                                        ) => (
                                          <span
                                            key={`${amenity}-${amenityIndex}`}
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
                                    Ticket available after
                                    payment confirmation
                                  </span>
                                )}
                              </div>
                            </section>
                          )}
                        </article>
                      );
                    })}
                  </div>

                  <div className="my-apartment-help-card">
                    <div className="my-apartment-help-icon">
                      <i className="bi bi-house-heart"></i>
                    </div>

                    <div>
                      <span>YOUR STAY</span>

                      <h3>
                        All your reservations in one
                        place
                      </h3>

                      <p>
                        Expand any booking to review
                        its photos, reservation details
                        and ticket access.
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
              onClick={() => setSelectedPhoto(null)}
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
