import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import Navbar from "../component/Navbar";
import DetailFooter from "../component/DetailFooter";

import vibelyLogo from "../assets/vibely-logo.png";
import concertImage from "../assets/concert.jpg";

import "../styles/myBookings.css";

const MyBookings = () => {
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
            returnTo: "/my-bookings",
          },
        });

        return;
      }

      try {
        const response = await axios.get(
          "http://https://eventbookingsystem-sooty.vercel.app/api/v1/bookings/my",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        setBookings(response.data.data || []);
      } catch (error) {
        console.log(
          "MY BOOKINGS ERROR:",
          error
        );

        if (
          error.response?.status === 401
        ) {
          localStorage.removeItem(
            "accessToken"
          );

          localStorage.removeItem(
            "refreshToken"
          );

          navigate("/login", {
            state: {
              returnTo: "/my-bookings",
            },
          });

          return;
        }

        setError(
          error.response?.data?.message ||
          "Unable to load your bookings."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [navigate]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      }
    ).format(price || 0);
  };

  const formatDate = (date) => {
    if (!date) {
      return "Date unavailable";
    }

    return new Intl.DateTimeFormat(
      "en-NG",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    ).format(new Date(date));
  };

  const getBookingStatus = (status) => {
    if (
      status === "partially_cancelled"
    ) {
      return "Partially Cancelled";
    }

    if (status === "cancelled") {
      return "Cancelled";
    }

    if (status === "confirmed") {
      return "Confirmed";
    }

    if (status === "pending") {
      return "Pending";
    }

    return status || "Pending";
  };

  const getPaymentStatus = (status) => {
    if (
      status === "partially_refunded"
    ) {
      return "Partially Refunded";
    }

    if (status === "refunded") {
      return "Refunded";
    }

    if (status === "paid") {
      return "Paid";
    }

    if (status === "pending") {
      return "Pending";
    }

    return status || "Pending";
  };

  const paidBookings =
    bookings.filter(
      (booking) =>
        booking.paymentStatus === "paid"
    ).length;

  const confirmedBookings =
    bookings.filter(
      (booking) =>
        booking.bookingStatus ===
        "confirmed"
    ).length;

  const cancelledBookings =
    bookings.filter(
      (booking) =>
        booking.bookingStatus ===
        "cancelled" ||
        booking.bookingStatus ===
        "partially_cancelled"
    ).length;

  if (loading) {
    return (
      <>
        <Navbar />

        <div className="bookings-loading">
          <div className="bookings-loader"></div>

          <p>
            Loading your bookings...
          </p>
        </div>

        <DetailFooter />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="my-bookings-page">
        <section className="bookings-hero">
          <div className="bookings-hero-circle bookings-circle-one"></div>
          <div className="bookings-hero-circle bookings-circle-two"></div>

          <div className="bookings-hero-inner">
            <div className="bookings-hero-copy">
              <span className="bookings-eyebrow">
                YOUR EXPERIENCES
              </span>

              <h1>
                My
                <em> Bookings.</em>
              </h1>

              <p>
                Every event you've reserved,
                beautifully organised in one
                place.
              </p>
            </div>

            <div className="bookings-hero-card">
              <img
                src={vibelyLogo}
                alt="Vibely"
              />

              <div>
                <span>
                  VIBELY COLLECTION
                </span>

                <strong>
                  {bookings.length}{" "}
                  {bookings.length === 1
                    ? "Booking"
                    : "Bookings"}
                </strong>

                <p>
                  EVENTS · EXPERIENCES
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bookings-container">
          {error && (
            <div className="bookings-error">
              <div className="bookings-error-icon">
                <i className="bi bi-exclamation-circle"></i>
              </div>

              <div>
                <strong>
                  We couldn't load your
                  bookings.
                </strong>

                <p>{error}</p>
              </div>
            </div>
          )}

          {!error &&
            bookings.length === 0 && (
              <div className="bookings-empty">
                <div className="bookings-empty-icon">
                  <i className="bi bi-calendar2-heart"></i>
                </div>

                <span>
                  YOUR EXPERIENCES
                </span>

                <h2>
                  No event bookings yet.
                </h2>

                <p>
                  Discover something you love
                  and your Vibely reservations
                  will appear here.
                </p>

                <Link to="/events">
                  Explore Events

                  <i className="bi bi-arrow-right"></i>
                </Link>
              </div>
            )}

          {!error &&
            bookings.length > 0 && (
              <>
                <section className="bookings-summary">
                  <div className="booking-summary-card">
                    <div className="booking-summary-icon">
                      <i className="bi bi-calendar2-check"></i>
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

                  <div className="booking-summary-card">
                    <div className="booking-summary-icon">
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
                        Ready to enjoy
                      </p>
                    </div>
                  </div>

                  <div className="booking-summary-card">
                    <div className="booking-summary-icon">
                      <i className="bi bi-credit-card"></i>
                    </div>

                    <div>
                      <span>
                        PAID
                      </span>

                      <strong>
                        {paidBookings}
                      </strong>

                      <p>
                        Completed payments
                      </p>
                    </div>
                  </div>

                  <div className="booking-summary-card">
                    <div className="booking-summary-icon">
                      <i className="bi bi-x-circle"></i>
                    </div>

                    <div>
                      <span>
                        CANCELLED
                      </span>

                      <strong>
                        {cancelledBookings}
                      </strong>

                      <p>
                        Cancelled bookings
                      </p>
                    </div>
                  </div>
                </section>

                <div className="bookings-top">
                  <div>
                    <span>
                      BOOKING HISTORY
                    </span>

                    <h2>
                      Your event experiences
                    </h2>

                    <p>
                      Review your reservations,
                      payment status and ticket
                      information.
                    </p>
                  </div>

                  <Link to="/events">
                    Explore Events

                    <i className="bi bi-arrow-right"></i>
                  </Link>
                </div>

                <div className="bookings-grid">
                  {bookings.map(
                    (booking, index) => {
                      const event =
                        booking.event;

                      return (
                        <article
                          className="booking-card"
                          key={booking._id}
                        >
                          <div className="booking-image">
                            <img
                              src={
                                event?.image ||
                                concertImage
                              }
                              alt={
                                event?.title ||
                                "Vibely event"
                              }
                            />

                            <div className="booking-image-overlay"></div>

                            <div className="booking-image-top">
                              <span className="booking-number">
                                BOOKING{" "}
                                {String(
                                  index + 1
                                ).padStart(
                                  2,
                                  "0"
                                )}
                              </span>

                              <span
                                className={`booking-status ${booking.bookingStatus}`}
                              >
                                <i
                                  className={
                                    booking.bookingStatus ===
                                      "confirmed"
                                      ? "bi bi-check-circle-fill"
                                      : booking.bookingStatus ===
                                        "cancelled"
                                        ? "bi bi-x-circle-fill"
                                        : booking.bookingStatus ===
                                          "partially_cancelled"
                                          ? "bi bi-exclamation-circle-fill"
                                          : "bi bi-clock-fill"
                                  }
                                ></i>

                                {getBookingStatus(
                                  booking.bookingStatus
                                )}
                              </span>
                            </div>

                            <div className="booking-image-content">
                              <span>
                                {booking.ticketType ||
                                  "EVENT BOOKING"}
                              </span>

                              <h2>
                                {event?.title ||
                                  "Vibely Event"}
                              </h2>
                            </div>
                          </div>

                          <div className="booking-content">
                            <div className="booking-event-info">
                              <div>
                                <div className="booking-info-icon">
                                  <i className="bi bi-calendar3"></i>
                                </div>

                                <div>
                                  <span>
                                    EVENT DATE
                                  </span>

                                  <strong>
                                    {formatDate(
                                      event?.date
                                    )}
                                  </strong>
                                </div>
                              </div>

                              <div>
                                <div className="booking-info-icon">
                                  <i className="bi bi-geo-alt"></i>
                                </div>

                                <div>
                                  <span>
                                    LOCATION
                                  </span>

                                  <strong>
                                    {event?.location ||
                                      "Location unavailable"}
                                  </strong>
                                </div>
                              </div>
                            </div>

                            <div className="booking-details">
                              <div>
                                <span>
                                  Ticket Category
                                </span>

                                <strong>
                                  {booking.ticketType ||
                                    "Regular"}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  Quantity
                                </span>

                                <strong>
                                  {booking.quantity ||
                                    0}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  Total Amount
                                </span>

                                <strong>
                                  {formatPrice(
                                    booking.totalAmount
                                  )}
                                </strong>
                              </div>
                            </div>

                            <div className="booking-reference">
                              <div>
                                <span>
                                  BOOKING REFERENCE
                                </span>

                                <strong>
                                  {booking.bookingReference ||
                                    "—"}
                                </strong>
                              </div>

                              <span
                                className={`payment-status ${booking.paymentStatus}`}
                              >
                                <i
                                  className={
                                    booking.paymentStatus ===
                                      "paid"
                                      ? "bi bi-check-circle-fill"
                                      : booking.paymentStatus ===
                                        "refunded"
                                        ? "bi bi-arrow-counterclockwise"
                                        : booking.paymentStatus ===
                                          "partially_refunded"
                                          ? "bi bi-arrow-counterclockwise"
                                          : "bi bi-clock"
                                  }
                                ></i>

                                {getPaymentStatus(
                                  booking.paymentStatus
                                )}
                              </span>
                            </div>

                            {booking.paymentStatus ===
                              "paid" && (
                                <Link
                                  to="/my-tickets"
                                  className="booking-ticket-link"
                                >
                                  <span>
                                    View My Tickets
                                  </span>

                                  <i className="bi bi-arrow-right"></i>
                                </Link>
                              )}
                          </div>

                          <div className="booking-card-bottom">
                            <div>
                              <img
                                src={vibelyLogo}
                                alt="Vibely"
                              />

                              <div>
                                <strong>
                                  VIBELY
                                </strong>

                                <span>
                                  EVENT RESERVATION
                                </span>
                              </div>
                            </div>

                            <span>
                              Find your vibe.
                            </span>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>

                <div className="bookings-help-card">
                  <div className="bookings-help-icon">
                    <i className="bi bi-ticket-perforated"></i>
                  </div>

                  <div>
                    <span>
                      YOUR ENTRY PASS
                    </span>

                    <h3>
                      Looking for your QR
                      tickets?
                    </h3>

                    <p>
                      Paid event bookings have
                      individual digital tickets.
                      Open My Tickets to access
                      your ticket codes and QR
                      entry passes.
                    </p>
                  </div>

                  <Link to="/my-tickets">
                    My Tickets

                    <i className="bi bi-arrow-right"></i>
                  </Link>
                </div>
              </>
            )}
        </section>
      </main>

      <DetailFooter />
    </>
  );
};

export default MyBookings;