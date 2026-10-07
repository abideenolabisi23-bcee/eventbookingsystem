import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import Navbar from "../component/Navbar";
import DetailFooter from "../component/DetailFooter";

import vibelyLogo from "../assets/vibely-logo.png";

import "../styles/myApartmentBookings.css";

const MyApartmentBookings = () => {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBookings = async () => {
      const accessToken =
        localStorage.getItem("accessToken");

      if (!accessToken) {
        navigate("/login", {
          state: {
            returnTo: "/my-apartment-bookings",
          },
        });

        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          "http://https://eventbookingsystem-sooty.vercel.app/api/v1/apartment-bookings/my",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        setBookings(response.data.data || []);
      } catch (error) {
        console.log(
          "MY APARTMENT BOOKINGS ERROR:",
          error
        );

        if (error.response?.status === 401) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");

          navigate("/login", {
            state: {
              returnTo: "/my-apartment-bookings",
            },
          });

          return;
        }

        setError(
          error.response?.data?.message ||
          "Cannot load your apartment bookings."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [navigate]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  const formatDate = (date) => {
    if (!date) {
      return "Not available";
    }

    return new Date(date).toLocaleDateString(
      "en-NG",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
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
    if (!status) {
      return "";
    }

    return status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
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
                Manage your reservations, stay
                dates and payment details in one
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

                <h3>
                  Loading your bookings...
                </h3>

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

                <h3>
                  Unable to load bookings
                </h3>

                <p>{error}</p>

                <button
                  type="button"
                  onClick={() =>
                    window.location.reload()
                  }
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

                  <h3>
                    No apartment bookings yet
                  </h3>

                  <p>
                    Find a beautiful space for
                    your next day use or overnight
                    stay. Your reservations will
                    appear here.
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
                        <span>
                          ALL BOOKINGS
                        </span>

                        <strong>
                          {bookings.length}
                        </strong>

                        <p>
                          Total reservations
                        </p>
                      </div>
                    </div>

                    <div className="apartment-summary-card">
                      <div className="apartment-summary-icon">
                        <i className="bi bi-patch-check"></i>
                      </div>

                      <div>
                        <span>
                          CONFIRMED
                        </span>

                        <strong>
                          {confirmedBookings}
                        </strong>

                        <p>
                          Ready reservations
                        </p>
                      </div>
                    </div>

                    <div className="apartment-summary-card">
                      <div className="apartment-summary-icon">
                        <i className="bi bi-credit-card"></i>
                      </div>

                      <div>
                        <span>PAID</span>

                        <strong>
                          {paidBookings}
                        </strong>

                        <p>
                          Completed payments
                        </p>
                      </div>
                    </div>

                    <div className="apartment-summary-card">
                      <div className="apartment-summary-icon">
                        <i className="bi bi-moon-stars"></i>
                      </div>

                      <div>
                        <span>
                          STAY TYPES
                        </span>

                        <strong>
                          {overnightBookings +
                            dayUseBookings}
                        </strong>

                        <p>
                          Day use & overnight
                        </p>
                      </div>
                    </div>
                  </section>

                  <div className="my-apartment-top">
                    <div>
                      <span className="my-apartment-small-title">
                        YOUR RESERVATIONS
                      </span>

                      <h2>
                        Your apartment stays
                      </h2>

                      <p>
                        Review your dates,
                        payment status and
                        reservation details.
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
                    {bookings.map(
                      (booking, index) => {
                        const apartment =
                          booking.apartment;

                        const apartmentImage =
                          apartment?.images
                            ?.exterior ||
                          apartment?.images
                            ?.livingRoom ||
                          apartment?.image ||
                          apartment?.imageUrl;

                        return (
                          <article
                            className="apartment-reservation-card"
                            key={booking._id}
                          >
                            <div className="reservation-image-section">
                              {apartmentImage ? (
                                <img
                                  src={
                                    apartmentImage
                                  }
                                  alt={
                                    apartment?.title ||
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
                                ).padStart(
                                  2,
                                  "0"
                                )}
                              </span>

                              <div className="reservation-image-brand">
                                <img
                                  src={
                                    vibelyLogo
                                  }
                                  alt="Vibely"
                                />

                                <span>
                                  VIBELY STAYS
                                </span>
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
                                    {apartment?.title ||
                                      "Vibely Apartment"}
                                  </h3>

                                  <p>
                                    <i className="bi bi-geo-alt"></i>

                                    {apartment?.location ||
                                      "Location unavailable"}
                                  </p>
                                </div>

                                <div className="reservation-statuses">
                                  <span
                                    className={`reservation-booking-status ${booking.bookingStatus}`}
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
                                    className={`reservation-payment-status ${booking.paymentStatus}`}
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
                                  <span>
                                    CHECK-IN
                                  </span>

                                  <strong>
                                    {formatDate(
                                      booking.checkInDate
                                    )}
                                  </strong>
                                </div>

                                {booking.stayType ===
                                  "overnight" && (
                                    <div>
                                      <span>
                                        CHECK-OUT
                                      </span>

                                      <strong>
                                        {formatDate(
                                          booking.checkOutDate
                                        )}
                                      </strong>
                                    </div>
                                  )}

                                <div>
                                  <span>
                                    UNITS
                                  </span>

                                  <strong>
                                    {booking.numberOfUnits ||
                                      0}
                                  </strong>
                                </div>

                                {booking.stayType ===
                                  "overnight" && (
                                    <div>
                                      <span>
                                        NIGHTS
                                      </span>

                                      <strong>
                                        {booking.numberOfNights ||
                                          0}
                                      </strong>
                                    </div>
                                  )}
                              </div>

                              <div className="reservation-bottom">
                                <div className="reservation-reference">
                                  <span>
                                    BOOKING
                                    REFERENCE
                                  </span>

                                  <strong>
                                    {booking.bookingReference ||
                                      "—"}
                                  </strong>
                                </div>

                                <div className="reservation-price">
                                  <span>
                                    TOTAL AMOUNT
                                  </span>

                                  <strong>
                                    {formatPrice(
                                      booking.totalAmount
                                    )}
                                  </strong>
                                </div>

                                <Link
                                  to={`/my-apartment-bookings/${booking._id}`}
                                  className="reservation-view-button"
                                >
                                  View Details

                                  <i className="bi bi-arrow-right"></i>
                                </Link>
                              </div>
                            </div>
                          </article>
                        );
                      }
                    )}
                  </div>

                  <div className="my-apartment-help-card">
                    <div className="my-apartment-help-icon">
                      <i className="bi bi-house-heart"></i>
                    </div>

                    <div>
                      <span>
                        YOUR STAY
                      </span>

                      <h3>
                        Need the full booking
                        information?
                      </h3>

                      <p>
                        Open any reservation to
                        see its complete details,
                        dates, payment information
                        and booking reference.
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

      <DetailFooter />
    </>
  );
};

export default MyApartmentBookings;