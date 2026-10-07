import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import axios from "axios";

import Navbar from "../component/Navbar";
import DetailFooter from "../component/DetailFooter";

import "../styles/eventDetails.css";

import vibelyLogo from "../assets/vibely-logo.png";
import concertImage from "../assets/concert.jpg";

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [selectedTicketType, setSelectedTicketType] =
    useState(null);
  const [quantity, setQuantity] = useState(1);

  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] =
    useState(false);

  const [error, setError] = useState("");
  const [bookingError, setBookingError] =
    useState("");
  const [bookingSuccess, setBookingSuccess] =
    useState("");

  const [showAuthPrompt, setShowAuthPrompt] =
    useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await axios.get(
          `http://192.168.0.3:5005/api/v1/events/${id}`
        );

        setEvent(response.data.data);
      } catch (error) {
        console.log(error);

        setError(
          error.response?.data?.message ||
          "We couldn't load this event right now."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  const formatFullDate = (date) => {
    if (!date) return "";

    return new Intl.DateTimeFormat("en-NG", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const selectTicketType = (type) => {
    if (type.availableTickets <= 0) {
      return;
    }

    setSelectedTicketType(type);
    setQuantity(1);
    setBookingError("");
    setBookingSuccess("");
  };

  const increaseQuantity = () => {
    if (!selectedTicketType) return;

    if (
      quantity <
      selectedTicketType.availableTickets
    ) {
      setQuantity(
        (currentQuantity) =>
          currentQuantity + 1
      );
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(
        (currentQuantity) =>
          currentQuantity - 1
      );
    }
  };

  const handleBookTicket = async () => {
    if (!selectedTicketType) {
      setBookingError(
        "Please select a ticket category before booking."
      );
      return;
    }

    const accessToken =
      localStorage.getItem("accessToken");

    if (!accessToken) {
      setShowAuthPrompt(true);
      return;
    }

    try {
      setBookingLoading(true);
      setBookingError("");
      setBookingSuccess("");

      const bookingResponse = await axios.post(
        "http://192.168.0.3:5005/api/v1/bookings",
        {
          eventId: event._id,
          ticketType: selectedTicketType.name,
          quantity,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const booking =
        bookingResponse.data.data.booking;

      const paymentResponse = await axios.post(
        "http://192.168.0.3:5005/api/v1/payments/initialize",
        {
          bookingId: booking._id,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const authorizationUrl =
        paymentResponse.data.data.authorizationUrl;

      if (!authorizationUrl) {
        setBookingError(
          "Payment checkout could not be opened."
        );
        return;
      }

      window.location.href = authorizationUrl;
    } catch (error) {
      console.log(
        "BOOKING/PAYMENT ERROR:",
        error
      );

      if (error.response?.status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");

        setShowAuthPrompt(true);
        return;
      }

      setBookingError(
        error.response?.data?.message ||
        "Unable to continue with your booking. Please try again."
      );
    } finally {
      setBookingLoading(false);
    }
  };

  const goToLogin = () => {
    navigate("/login", {
      state: {
        returnTo: `/events/${id}`,
      },
    });
  };

  const goToSignup = () => {
    navigate("/signup", {
      state: {
        returnTo: `/events/${id}`,
      },
    });
  };

  if (loading) {
    return (
      <div className="event-details-status">
        <div className="event-details-loader"></div>

        <p>Loading event...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="event-details-status">
        <h2>Event unavailable</h2>

        <p>
          {error ||
            "This event could not be found."}
        </p>

        <Link to="/events">
          Back to events
        </Link>
      </div>
    );
  }

  const ticketTypes =
    event.ticketTypes || [];

  const allTicketTypesSoldOut =
    ticketTypes.length > 0 &&
    ticketTypes.every(
      (type) =>
        type.availableTickets <= 0
    );

  const unavailable =
    event.isAvailable === false;

  const selectedPrice =
    selectedTicketType?.price || 0;

  const totalPrice =
    selectedPrice * quantity;

  const organizerName =
    event.createdBy &&
      typeof event.createdBy === "object"
      ? `${event.createdBy.firstname || ""} ${event.createdBy.lastname || ""
        }`.trim()
      : "";

  const getTicketDescription = (name) => {
    if (name === "Regular") {
      return "Essential access to enjoy the full live experience.";
    }

    if (name === "VIP") {
      return "A premium experience with a little more exclusivity.";
    }

    if (name === "VVIP") {
      return "The ultimate way to experience the event in style.";
    }

    return "Enjoy an unforgettable event experience.";
  };

  const getTicketExperience = (name) => {
    if (name === "Regular") {
      return "Essential Experience";
    }

    if (name === "VIP") {
      return "Premium Experience";
    }

    if (name === "VVIP") {
      return "Ultimate Experience";
    }

    return "Event Experience";
  };

  return (
    <>
      <Navbar />

      <main className="event-details-page">
        <section className="event-details-breadcrumb">
          <Link to="/events">
            Events
          </Link>

          <span>›</span>

          <p>{event.title}</p>
        </section>

        <section className="event-details-hero">
          <div className="event-details-image">
            <img
              src={
                event.image ||
                concertImage
              }
              alt={event.title}
            />

            {allTicketTypesSoldOut && (
              <div className="details-status-badge">
                SOLD OUT
              </div>
            )}

            {!allTicketTypesSoldOut &&
              unavailable && (
                <div className="details-status-badge">
                  UNAVAILABLE
                </div>
              )}
          </div>

          <div className="event-details-content">
            <p className="details-label">
              VIBELY EVENTS
            </p>

            <h1>{event.title}</h1>

            <p className="details-description">
              {event.description}
            </p>

            <div className="event-information">
              <div className="information-item">
                <div className="information-icon">
                  ◷
                </div>

                <div>
                  <span>
                    Date & Time
                  </span>

                  <strong>
                    {formatFullDate(
                      event.date
                    )}
                  </strong>
                </div>
              </div>

              <div className="information-item">
                <div className="information-icon">
                  ⌖
                </div>

                <div>
                  <span>
                    Location
                  </span>

                  <strong>
                    {event.location}
                  </strong>
                </div>
              </div>

              {organizerName && (
                <div className="information-item">
                  <div className="information-icon">
                    ◉
                  </div>

                  <div>
                    <span>
                      Organized by
                    </span>

                    <strong>
                      {organizerName}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="event-details-main">
          <div className="event-experience">
            <div className="about-event">
              <p className="about-small-title">
                ABOUT THIS EVENT
              </p>

              <h2>
                About the experience
              </h2>

              <p className="about-description">
                {event.description}
              </p>
            </div>

            <div className="experience-highlights">
              <div className="highlight-card">
                <div className="highlight-icon">
                  ♫
                </div>

                <div>
                  <h3>
                    Live experience
                  </h3>

                  <p>
                    Come ready to enjoy
                    the atmosphere, connect
                    and create unforgettable
                    memories.
                  </p>
                </div>
              </div>

              <div className="highlight-card">
                <div className="highlight-icon">
                  ◷
                </div>

                <div>
                  <h3>
                    Plan ahead
                  </h3>

                  <p>
                    Arrive early so you have
                    enough time to settle in
                    before the experience
                    begins.
                  </p>
                </div>
              </div>

              <div className="highlight-card">
                <div className="highlight-icon">
                  ◇
                </div>

                <div>
                  <h3>
                    Digital ticket
                  </h3>

                  <p>
                    Your ticket will be
                    connected to your booking
                    after successful payment.
                  </p>
                </div>
              </div>
            </div>

            <div className="ticket-categories-showcase">
              <div className="ticket-categories-heading">
                <div>
                  <p>
                    TICKET CATEGORIES
                  </p>

                  <h2>
                    Choose your experience
                  </h2>
                </div>

                <span>
                  Pick the ticket that
                  fits your night.
                </span>
              </div>

              {ticketTypes.length > 0 ? (
                <div className="ticket-category-grid">
                  {ticketTypes.map(
                    (type) => {
                      const soldOut =
                        type.availableTickets <=
                        0;

                      const selected =
                        selectedTicketType?.name ===
                        type.name;

                      return (
                        <button
                          key={type.name}
                          type="button"
                          className={`ticket-category-card ${selected
                              ? "selected"
                              : ""
                            } ${soldOut
                              ? "sold-out"
                              : ""
                            }`}
                          disabled={
                            soldOut ||
                            unavailable
                          }
                          onClick={() =>
                            selectTicketType(
                              type
                            )
                          }
                        >
                          <div className="ticket-category-top">
                            <span className="ticket-category-name">
                              {type.name}
                            </span>

                            {selected && (
                              <span className="ticket-selected-icon">
                                ✓
                              </span>
                            )}

                            {soldOut && (
                              <span className="sold-out-category-badge">
                                SOLD OUT
                              </span>
                            )}
                          </div>

                          <div className="ticket-category-price">
                            {formatPrice(
                              type.price
                            )}
                          </div>

                          <p className="ticket-category-description">
                            {getTicketDescription(
                              type.name
                            )}
                          </p>

                          <div className="ticket-category-footer">
                            <span>
                              {soldOut
                                ? "Unavailable"
                                : selected
                                  ? "Selected"
                                  : "Choose ticket"}
                            </span>

                            {!soldOut && (
                              <span className="category-arrow">
                                {selected
                                  ? "✓"
                                  : "→"}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="no-ticket-categories">
                  Ticket categories are
                  currently unavailable for
                  this event.
                </div>
              )}
            </div>

            <div className="good-to-know">
              <div className="good-to-know-heading">
                <p>
                  GOOD TO KNOW
                </p>

                <h2>
                  Before you go
                </h2>
              </div>

              <div className="good-to-know-items">
                <div>
                  <span>01</span>

                  <p>
                    Keep your ticket
                    available for verification
                    when you arrive.
                  </p>
                </div>

                <div>
                  <span>02</span>

                  <p>
                    Check the event date,
                    time and location
                    carefully before
                    completing your booking.
                  </p>
                </div>

                <div>
                  <span>03</span>

                  <p>
                    Your booking details
                    will be available from
                    your Vibely account.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <aside className="booking-card">
            <div className="booking-card-top">
              <p className="booking-card-label">
                RESERVE YOUR SPOT
              </p>

              <h2>Your ticket</h2>

              <p className="booking-card-intro">
                Choose a ticket from the
                categories and complete
                your booking here.
              </p>
            </div>

            <div className="booking-divider"></div>

            {selectedTicketType ? (
              <div className="selected-ticket-banner">
                <div className="selected-ticket-check">
                  ✓
                </div>

                <div className="selected-ticket-info">
                  <span>
                    YOUR SELECTION
                  </span>

                  <strong>
                    {selectedTicketType.name}
                  </strong>

                  <small>
                    {getTicketExperience(
                      selectedTicketType.name
                    )}
                  </small>
                </div>

                <strong className="selected-ticket-price">
                  {formatPrice(
                    selectedTicketType.price
                  )}
                </strong>
              </div>
            ) : (
              <div className="choose-ticket-notice">
                <div className="choose-ticket-icon">
                  ♫
                </div>

                <div>
                  <strong>
                    Choose your ticket
                  </strong>

                  <p>
                    Select Regular, VIP or
                    VVIP from the ticket
                    cards.
                  </p>
                </div>
              </div>
            )}

            <div className="booking-divider"></div>

            <div className="quantity-section">
              <div>
                <h4>
                  Number of tickets
                </h4>

                <p>
                  Select your quantity
                </p>
              </div>

              <div className="quantity-control">
                <button
                  type="button"
                  onClick={
                    decreaseQuantity
                  }
                  disabled={
                    quantity === 1 ||
                    !selectedTicketType ||
                    bookingLoading
                  }
                >
                  −
                </button>

                <strong>
                  {quantity}
                </strong>

                <button
                  type="button"
                  onClick={
                    increaseQuantity
                  }
                  disabled={
                    !selectedTicketType ||
                    bookingLoading ||
                    quantity >=
                    (selectedTicketType?.availableTickets ||
                      0)
                  }
                >
                  +
                </button>
              </div>
            </div>

            {selectedTicketType && (
              <div className="booking-summary">
                <div className="booking-summary-line">
                  <span>
                    {selectedTicketType.name}{" "}
                    × {quantity}
                  </span>

                  <span>
                    {formatPrice(
                      selectedTicketType.price *
                      quantity
                    )}
                  </span>
                </div>

                <div className="booking-summary-each">
                  <span>
                    {formatPrice(
                      selectedTicketType.price
                    )}{" "}
                    per ticket
                  </span>
                </div>

                <div className="booking-total">
                  <span>Total</span>

                  <strong>
                    {formatPrice(
                      totalPrice
                    )}
                  </strong>
                </div>
              </div>
            )}

            {bookingError && (
              <div className="booking-message booking-error-message">
                {bookingError}
              </div>
            )}

            {bookingSuccess && (
              <div className="booking-message booking-success-message">
                {bookingSuccess}
              </div>
            )}

            <button
              type="button"
              className="book-ticket-button"
              onClick={
                handleBookTicket
              }
              disabled={
                unavailable ||
                allTicketTypesSoldOut ||
                bookingLoading ||
                ticketTypes.length === 0
              }
            >
              {bookingLoading
                ? "Creating Booking..."
                : allTicketTypesSoldOut
                  ? "Sold Out"
                  : unavailable
                    ? "Currently Unavailable"
                    : selectedTicketType
                      ? `Book ${selectedTicketType.name}`
                      : "Select a Ticket Category"}
            </button>

            {!unavailable &&
              !allTicketTypesSoldOut && (
                <div className="booking-benefits">
                  <p>
                    <span>✓</span>
                    Secure checkout
                  </p>

                  <p>
                    <span>✓</span>
                    Digital ticket after
                    payment
                  </p>

                  <p>
                    <span>✓</span>
                    Booking stored in your
                    account
                  </p>
                </div>
              )}
          </aside>
        </section>

        <section className="event-details-bottom">
          <div>
            <p>
              MORE TO EXPERIENCE
            </p>

            <h2>
              Find another moment
              worth showing up for.
            </h2>
          </div>

          <Link to="/events">
            Explore more events
            <span>→</span>
          </Link>
        </section>

        {showAuthPrompt && (
          <div
            className="auth-prompt-overlay"
            onClick={() =>
              setShowAuthPrompt(false)
            }
          >
            <div
              className="auth-prompt"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <button
                type="button"
                className="auth-prompt-close"
                onClick={() =>
                  setShowAuthPrompt(false)
                }
              >
                ×
              </button>

              <img
                src={vibelyLogo}
                alt="Vibely"
              />

              <p className="auth-prompt-label">
                VIBELY
              </p>

              <h2>
                Sign in to continue
              </h2>

              <p className="auth-prompt-text">
                Login to your Vibely
                account or create a new
                account to continue with
                your booking.
              </p>

              <button
                type="button"
                className="auth-login-button"
                onClick={goToLogin}
              >
                Login
              </button>

              <button
                type="button"
                className="auth-signup-button"
                onClick={goToSignup}
              >
                Create Account
              </button>
            </div>
          </div>
        )}
      </main>

      <DetailFooter />
    </>
  );
};

export default EventDetails;