
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../component/Navbar";
import DetailFooter from "../component/DetailFooter";
import vibelyLogo from "../assets/vibely-logo.png";
import concertImage from "../assets/concert.jpg";
import "../styles/eventDetails.css";

const API =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const money = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const dateLabel = (value) => {
  if (!value) return "Date to be announced";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date to be announced";
  }

  return new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
};

const getCategoryKey = (category) =>
  String(category._id || category.name);

const getCategoryDescription = (name) => {
  const category = String(name).toLowerCase();

  if (category === "regular") {
    return "Your invitation to the energy, music and unforgettable moments.";
  }

  if (category === "vip") {
    return "A little more luxury, a little more exclusivity, a lot more memories.";
  }

  if (category === "vvip") {
    return "The elevated experience for those who love the extraordinary.";
  }

  return "A beautiful experience, thoughtfully chosen by you.";
};

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    let active = true;

    const loadEvent = async () => {
      try {
        setLoading(true);
        setError("");
        setEvent(null);
        setQuantities({});

        const response = await axios.get(`${API}/events/${id}`);

        if (active) {
          setEvent(response.data.data);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "We couldn't load this experience right now."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadEvent();

    return () => {
      active = false;
    };
  }, [id]);

  const ticketTypes = useMemo(
    () =>
      Array.isArray(event?.ticketTypes)
        ? event.ticketTypes
        : [],
    [event]
  );

  const selections = useMemo(() => {
    return ticketTypes
      .map((type) => ({
        ...type,
        selectedQuantity: Number(
          quantities[getCategoryKey(type)] || 0
        )
      }))
      .filter(
        (type) =>
          Number.isInteger(type.selectedQuantity) &&
          type.selectedQuantity >= 1
      );
  }, [ticketTypes, quantities]);

  const ticketCount = selections.reduce(
    (total, type) => total + type.selectedQuantity,
    0
  );

  const totalAmount = selections.reduce(
    (total, type) =>
      total + Number(type.price || 0) * type.selectedQuantity,
    0
  );

  const soldOut =
    ticketTypes.length > 0 &&
    ticketTypes.every(
      (type) => Number(type.availableTickets) <= 0
    );

  const unavailable = event?.isAvailable === false;

  const organizerName =
    event?.createdBy &&
    typeof event.createdBy === "object"
      ? [
          event.createdBy.firstname,
          event.createdBy.lastname
        ]
          .filter(Boolean)
          .join(" ")
      : "";

  const changeQuantity = (type, difference) => {
    if (bookingLoading || unavailable) return;

    const key = getCategoryKey(type);
    const available = Math.max(
      0,
      Math.floor(Number(type.availableTickets) || 0)
    );

    setQuantities((previous) => {
      const current = Number(previous[key] || 0);

      const next = Math.min(
        available,
        Math.max(0, current + difference)
      );

      return {
        ...previous,
        [key]: next
      };
    });

    setBookingError("");
  };

  const handleBooking = async () => {
    if (bookingLoading) return;

    setBookingError("");

    if (unavailable || soldOut) {
      setBookingError(
        "This event is currently unavailable for booking."
      );
      return;
    }

    const validSelections = selections
      .map((type) => ({
        ticketTypeId: type._id,
        ticketType: type.name,
        quantity: Number(type.selectedQuantity)
      }))
      .filter(
        (type) =>
          Number.isInteger(type.quantity) &&
          type.quantity >= 1
      );

    const totalQuantity = validSelections.reduce(
      (total, type) => total + type.quantity,
      0
    );

    if (validSelections.length === 0 || totalQuantity < 1) {
      setBookingError(
        "Please choose at least one ticket to continue."
      );
      return;
    }

    const invalidSelection = selections.some((type) => {
      const quantity = Number(type.selectedQuantity);
      const available = Number(type.availableTickets);

      return (
        !type._id ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > available
      );
    });

    if (invalidSelection) {
      setBookingError(
        "One of your selected ticket quantities is invalid or exceeds availability."
      );
      return;
    }

    const accessToken = localStorage.getItem("accessToken");

    if (!accessToken) {
      setShowAuthPrompt(true);
      return;
    }

    try {
      setBookingLoading(true);

      const bookingResponse = await axios.post(
        `${API}/bookings`,
        {
  eventId: event._id,
  ticketType: validSelections[0].ticketType,
  quantity: totalQuantity,
  ticketSelections: validSelections
},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      const bookingData = bookingResponse.data.data;

      const booking = bookingData?.booking || bookingData;

      if (!booking?._id) {
        throw new Error(
          "Booking was created but its ID was not returned. Check My Bookings before trying again."
        );
      }

      sessionStorage.setItem(
        "vibelyPendingBooking",
        JSON.stringify({
          bookingId: booking._id,
          eventId: event._id,
          eventTitle: event.title,
          ticketCount: totalQuantity,
          totalAmount
        })
      );

      let paymentResponse;

      try {
        paymentResponse = await axios.post(
          `${API}/payments/initialize`,
          {
            bookingId: booking._id
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );
      } catch (paymentError) {
        throw new Error(
          paymentError.response?.data?.message ||
            "Your booking was created, but payment could not start. Check My Bookings before trying again."
        );
      }

      const authorizationUrl =
        paymentResponse.data.data?.authorizationUrl;

      if (!authorizationUrl) {
        throw new Error(
          "Payment link was not returned. Check your booking before trying again."
        );
      }

      window.location.assign(authorizationUrl);
    } catch (err) {
      if (err.response?.status === 401) {
        setShowAuthPrompt(true);
        setBookingError(
          "Your session has expired. Please log in again."
        );
      } else {
        setBookingError(
          err.response?.data?.message ||
            err.message ||
            "We couldn't complete your request."
        );
      }
    } finally {
      setBookingLoading(false);
    }
  };

  const goToAuth = (path) => {
    navigate(path, {
      state: {
        returnTo: `/events/${id}`
      }
    });
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="vibely-loading">
          <div className="vibely-spinner" />
          <h2>Preparing your experience...</h2>
          <p>Something beautiful is coming.</p>
        </main>
        <DetailFooter />
      </>
    );
  }

  if (error || !event) {
    return (
      <>
        <Navbar />
        <main className="vibely-loading">
          <span className="vibely-eyebrow">VIBELY EVENTS</span>
          <h2>Experience unavailable</h2>
          <p>{error || "This event could not be found."}</p>
          <Link to="/events" className="vibely-primary-link">
            Explore events →
          </Link>
        </main>
        <DetailFooter />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="vibely-event-page">
        <div className="vibely-page-container">
          <nav className="vibely-breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/events">Events</Link>
            <span>/</span>
            <strong>{event.title}</strong>
          </nav>

          <section className="vibely-hero">
            <div className="vibely-hero-image">
              <img
                src={event.image || concertImage}
                alt={event.title}
              />

              <div className="vibely-image-shade" />

              <div className="vibely-image-top">
                <span>THE VIBELY EXPERIENCE</span>
                <span>✦ CURATED MOMENTS</span>
              </div>

              <div className="vibely-image-bottom">
                <span className="vibely-hero-tag">
                  ✦ EVENTS & EXPERIENCES
                </span>
                <h1>{event.title}</h1>
                <p>
                  Beautiful moments. Unforgettable memories.
                </p>
              </div>
            </div>

            <div className="vibely-hero-details">
              <div>
                <span className="vibely-eyebrow">
                  YOU'RE INVITED
                </span>

                <h2>
                  Some nights
                  <em> stay with you.</em>
                </h2>

                <p className="vibely-hero-description">
                  {event.description}
                </p>
              </div>

              <div className="vibely-info-list">
                <div className="vibely-info-item">
                  <span className="vibely-info-symbol">◷</span>
                  <div>
                    <small>DATE & TIME</small>
                    <strong>{dateLabel(event.date)}</strong>
                  </div>
                </div>

                <div className="vibely-info-item">
                  <span className="vibely-info-symbol">⌖</span>
                  <div>
                    <small>LOCATION</small>
                    <strong>{event.location}</strong>
                  </div>
                </div>

                {organizerName && (
                  <div className="vibely-info-item">
                    <span className="vibely-info-symbol">✧</span>
                    <div>
                      <small>HOSTED BY</small>
                      <strong>{organizerName}</strong>
                    </div>
                  </div>
                )}
              </div>

              <a
                href="#vibely-tickets"
                className="vibely-hero-button"
              >
                Explore tickets
                <span>↗</span>
              </a>
            </div>
          </section>

          <section className="vibely-intro">
            <span className="vibely-eyebrow">
              THE ART OF SHOWING UP
            </span>

            <h2>
              More than an event.
              <em> A feeling.</em>
            </h2>

            <p>
              The music, the people, the atmosphere, the
              memories. Choose the experience that feels
              right for you.
            </p>
          </section>

          <section
            className="vibely-booking-layout"
            id="vibely-tickets"
          >
            <div className="vibely-ticket-area">
              <div className="vibely-section-heading">
                <div>
                  <span className="vibely-eyebrow">
                    MAKE IT YOUR MOMENT
                  </span>

                  <h2>
                    Choose your
                    <em> experience.</em>
                  </h2>

                  <p>
                    Mix and match ticket categories.
                    One booking, one beautiful experience.
                  </p>
                </div>

                <span className="vibely-heading-decoration">
                  ✳
                </span>
              </div>

              <div className="vibely-ticket-grid">
                {ticketTypes.length === 0 ? (
                  <div className="vibely-empty">
                    Ticket categories are not available yet.
                  </div>
                ) : (
                  ticketTypes.map((type, index) => {
                    const key = getCategoryKey(type);
                    const quantity = Number(
                      quantities[key] || 0
                    );
                    const available =
                      Number(type.availableTickets) || 0;
                    const isSoldOut = available <= 0;
                    const selected = quantity > 0;

                    return (
                      <article
                        key={key}
                        className={`vibely-ticket-card ${
                          selected ? "is-selected" : ""
                        }`}
                      >
                        <div className="vibely-ticket-top">
                          <span className="vibely-ticket-number">
                            0{index + 1}
                          </span>

                          {isSoldOut ? (
                            <span className="vibely-ticket-state">
                              SOLD OUT
                            </span>
                          ) : selected ? (
                            <span className="vibely-ticket-state selected">
                              ✓ SELECTED
                            </span>
                          ) : (
                            <span className="vibely-ticket-state">
                              AVAILABLE
                            </span>
                          )}
                        </div>

                        <div className="vibely-ticket-icon">
                          {index === 0
                            ? "✦"
                            : index === 1
                              ? "✧"
                              : "♛"}
                        </div>

                        <span className="vibely-ticket-caption">
                          THE EXPERIENCE
                        </span>

                        <h3>{type.name}</h3>

                        <p className="vibely-ticket-description">
                          {getCategoryDescription(type.name)}
                        </p>

                        <div className="vibely-ticket-price">
                          <strong>{money(type.price)}</strong>
                          <span>/ person</span>
                        </div>

                        <div className="vibely-ticket-divider" />

                        <div className="vibely-ticket-actions">
                          <span className="vibely-quantity-label">
                            {isSoldOut
                              ? "Fully booked"
                              : "Select quantity"}
                          </span>

                          <div className="vibely-stepper">
                            <button
                              type="button"
                              aria-label={`Remove ${type.name} ticket`}
                              disabled={
                                quantity === 0 ||
                                bookingLoading ||
                                unavailable
                              }
                              onClick={() =>
                                changeQuantity(type, -1)
                              }
                            >
                              −
                            </button>

                            <strong>{quantity}</strong>

                            <button
                              type="button"
                              aria-label={`Add ${type.name} ticket`}
                              disabled={
                                isSoldOut ||
                                unavailable ||
                                bookingLoading ||
                                quantity >= available
                              }
                              onClick={() =>
                                changeQuantity(type, 1)
                              }
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {!isSoldOut && (
                          <small className="vibely-availability">
                            {available} tickets available
                          </small>
                        )}
                      </article>
                    );
                  })
                )}
              </div>

              <div className="vibely-perks">
                <div>
                  <span>✧</span>
                  <strong>One easy checkout</strong>
                  <p>
                    Pay for all your selected categories
                    together.
                  </p>
                </div>

                <div>
                  <span>◇</span>
                  <strong>Digital tickets</strong>
                  <p>
                    Receive individual tickets after
                    successful confirmation.
                  </p>
                </div>

                <div>
                  <span>♡</span>
                  <strong>Memories await</strong>
                  <p>
                    Choose your tickets and get ready
                    for the experience.
                  </p>
                </div>
              </div>

              <div className="vibely-about">
                <span className="vibely-eyebrow">
                  A LITTLE MORE ABOUT THE EVENT
                </span>
                <h2>What to expect</h2>
                <p>{event.description}</p>
              </div>
            </div>

            <aside className="vibely-checkout">
              <div className="vibely-checkout-heading">
                <div className="vibely-checkout-mark">
                  ✦
                </div>

                <span className="vibely-eyebrow">
                  YOUR VIBELY MOMENT
                </span>

                <h2>Your reservation</h2>
                <p>
                  Everything you love, all in one booking.
                </p>
              </div>

              <div className="vibely-checkout-body">
                {selections.length === 0 ? (
                  <div className="vibely-cart-empty">
                    <span>♡</span>
                    <h3>Your experience starts here</h3>
                    <p>
                      Select your favourite ticket categories
                      to build your reservation.
                    </p>
                  </div>
                ) : (
                  <div className="vibely-cart-items">
                    {selections.map((type) => (
                      <div
                        className="vibely-cart-item"
                        key={getCategoryKey(type)}
                      >
                        <div className="vibely-cart-icon">
                          ✦
                        </div>

                        <div className="vibely-cart-item-info">
                          <strong>{type.name}</strong>
                          <span>
                            {type.selectedQuantity} ×{" "}
                            {money(type.price)}
                          </span>
                        </div>

                        <strong>
                          {money(
                            type.selectedQuantity *
                              Number(type.price)
                          )}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}

                <div className="vibely-checkout-divider" />

                <div className="vibely-checkout-line">
                  <span>Total tickets</span>
                  <strong>{ticketCount}</strong>
                </div>

                <div className="vibely-checkout-total">
                  <span>TOTAL AMOUNT</span>
                  <strong>{money(totalAmount)}</strong>
                </div>

                <p className="vibely-checkout-note">
                  Any additional payment charges, if
                  applicable, will be shown at checkout.
                </p>

                {bookingError && (
                  <div
                    className="vibely-booking-error"
                    role="alert"
                  >
                    {bookingError}
                  </div>
                )}

                <button
                  type="button"
                  className="vibely-pay-button"
                  onClick={handleBooking}
                  disabled={
                    bookingLoading ||
                    ticketCount === 0 ||
                    unavailable ||
                    soldOut
                  }
                >
                  {bookingLoading
                    ? "Preparing your checkout..."
                    : unavailable
                      ? "Event unavailable"
                      : soldOut
                        ? "Sold out"
                        : ticketCount === 0
                          ? "Select your tickets"
                          : "Continue to payment  ↗"}
                </button>

                <div className="vibely-secure-note">
                  <span>♢</span>
                  Secure checkout powered by Paystack
                </div>
              </div>

              <div className="vibely-checkout-footer">
                <span>✧</span>
                <p>
                  Good times look better when they're
                  shared.
                </p>
              </div>
            </aside>
          </section>

          <section className="vibely-bottom-banner">
            <div>
              <span className="vibely-eyebrow">
                KEEP THE GOOD TIMES GOING
              </span>

              <h2>
                Your next favourite
                <em> memory awaits.</em>
              </h2>
            </div>

            <Link to="/events">
              Discover more events <span>↗</span>
            </Link>
          </section>
        </div>

        {showAuthPrompt && (
          <div
            className="vibely-modal-overlay"
            onClick={() => setShowAuthPrompt(false)}
          >
            <div
              className="vibely-auth-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="vibely-auth-title"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="vibely-modal-close"
                type="button"
                aria-label="Close"
                onClick={() => setShowAuthPrompt(false)}
              >
                ×
              </button>

              <img
                src={vibelyLogo}
                alt="Vibely"
                className="vibely-modal-logo"
              />

              <span className="vibely-eyebrow">
                YOU'RE ALMOST THERE
              </span>

              <h2 id="vibely-auth-title">
                Your moment is waiting.
              </h2>

              <p>
                Sign in or create your Vibely account
                to reserve your tickets and continue
                to payment.
              </p>

              <button
                type="button"
                className="vibely-modal-primary"
                onClick={() => goToAuth("/login")}
              >
                Sign in to Vibely
              </button>

              <button
                type="button"
                className="vibely-modal-secondary"
                onClick={() => goToAuth("/signup")}
              >
                Create an account
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
