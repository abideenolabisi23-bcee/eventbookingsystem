
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import Navbar from "../component/Navbar";
import DetailFooter from "../component/DetailFooter";

import vibelyLogo from "../assets/vibely-logo.png";
import concertImage from "../assets/concert.jpg";

import "../styles/myBookings.css";

const API =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const formatPrice = (price) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(price) || 0);

const formatDate = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
};

const bookingStatusLabel = (status) => {
  const labels = {
    pending: "Pending",
    confirmed: "Confirmed",
    partially_cancelled: "Partially Cancelled",
    cancelled: "Cancelled"
  };

  return labels[status] || status || "Pending";
};

const paymentStatusLabel = (status) => {
  const labels = {
    pending: "Pending",
    paid: "Paid",
    failed: "Failed",
    partially_refunded: "Partially Refunded",
    refunded: "Refunded"
  };

  return labels[status] || status || "Pending";
};

const ticketStatusLabel = (status) => {
  const labels = {
    valid: "Valid",
    used: "Used",
    cancelled: "Cancelled",
    refund_pending: "Refund Pending"
  };

  return labels[status] || status || "Unknown";
};

const getSelections = (booking) => {
  if (
    Array.isArray(booking.ticketSelections) &&
    booking.ticketSelections.length
  ) {
    return booking.ticketSelections;
  }

  if (booking.ticketType) {
    return [
      {
        ticketType: booking.ticketType,
        ticketPrice: booking.ticketPrice,
        quantity: booking.quantity
      }
    ];
  }

  return [];
};

export default function MyBookings() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeBooking, setActiveBooking] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [refundNotice, setRefundNotice] = useState(null);
  const [cancelError, setCancelError] = useState("");

  const fetchBookings = useCallback(
    async (signal) => {
      const token = localStorage.getItem("accessToken");

      if (!token) {
        navigate("/login", {
          replace: true,
          state: { returnTo: "/my-bookings" }
        });
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await axios.get(`${API}/bookings/my`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          signal
        });

        const data = response.data?.data;

        setBookings(
          Array.isArray(data)
            ? data
            : Array.isArray(data?.bookings)
              ? data.bookings
              : []
        );
      } catch (err) {
        if (axios.isCancel(err)) return;

        if (err.response?.status === 401) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");

          navigate("/login", {
            replace: true,
            state: { returnTo: "/my-bookings" }
          });

          return;
        }

        setError(
          err.response?.data?.message ||
            "Unable to load your bookings."
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [navigate]
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchBookings(controller.signal);

    return () => controller.abort();
  }, [fetchBookings]);

  const openManager = (booking) => {
    setActiveBooking(booking);
    setSelectedIds([]);
    setCancelError("");
    setConfirming(false);
    setRefundNotice(null);
  };

  const closeManager = () => {
    if (submitting) return;

    setActiveBooking(null);
    setSelectedIds([]);
    setCancelError("");
    setConfirming(false);
  };

  const toggleTicket = (ticketId) => {
    if (submitting) return;

    setCancelError("");
    setConfirming(false);

    setSelectedIds((current) =>
      current.includes(ticketId)
        ? current.filter((id) => id !== ticketId)
        : [...current, ticketId]
    );
  };

  const activeTickets = Array.isArray(activeBooking?.tickets)
    ? activeBooking.tickets
    : [];

  const selectedTickets = activeTickets.filter((ticket) =>
    selectedIds.includes(String(ticket._id))
  );

  const refundAmount = selectedTickets.reduce(
    (total, ticket) =>
      total +
      Number(
        ticket.ticketPrice ??
          activeBooking?.ticketPrice ??
          0
      ),
    0
  );

  const canRequestRefund =
    selectedTickets.length > 0 &&
    selectedTickets.every(
      (ticket) =>
        ticket.status === "valid" &&
        Number.isFinite(
          Number(
            ticket.ticketPrice ??
              activeBooking?.ticketPrice
          )
        ) &&
        Number(
          ticket.ticketPrice ??
            activeBooking?.ticketPrice
        ) >= 0
    ) &&
    refundAmount > 0;

  const cancelSelectedTickets = async () => {
    if (!activeBooking || !canRequestRefund || submitting) {
      return;
    }

    const token = localStorage.getItem("accessToken");

    if (!token) {
      navigate("/login", {
        state: { returnTo: "/my-bookings" }
      });
      return;
    }

    setSubmitting(true);
    setCancelError("");

    try {
      const response = await axios.patch(
        `${API}/bookings/${activeBooking._id}/cancel-tickets`,
        { ticketIds: selectedIds },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const result = response.data?.data || {};

      setRefundNotice({
        message:
          response.data?.message ||
          "Your refund request has been submitted.",
        refundId: result.refundId,
        refundStatus:
          result.refundStatus || "pending",
        amount: result.refundAmount ?? refundAmount,
        needsAttention:
          result.refundStatus === "needs-attention"
      });

      setActiveBooking(null);
      setSelectedIds([]);
      setConfirming(false);

      const refreshController = new AbortController();
      await fetchBookings(refreshController.signal);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");

        navigate("/login", {
          replace: true,
          state: { returnTo: "/my-bookings" }
        });

        return;
      }

      setConfirming(false);

      setCancelError(
        err.response?.data?.message ||
          "Unable to submit your refund request. Please check your booking status before trying again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const paidBookings = bookings.filter(
    (booking) => booking.paymentStatus === "paid"
  ).length;

  const confirmedBookings = bookings.filter(
    (booking) => booking.bookingStatus === "confirmed"
  ).length;

  const cancelledBookings = bookings.filter(
    (booking) =>
      booking.bookingStatus === "cancelled" ||
      booking.bookingStatus === "partially_cancelled"
  ).length;

  if (loading && bookings.length === 0 && !error) {
    return (
      <>
        <Navbar />

        <div className="bookings-loading">
          <div className="bookings-loader"></div>
          <p>Loading your bookings...</p>
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
                My <em>Bookings.</em>
              </h1>

              <p>
                Every event you've reserved, beautifully
                organised in one place.
              </p>
            </div>

            <div className="bookings-hero-card">
              <img src={vibelyLogo} alt="Vibely" />

              <div>
                <span>VIBELY COLLECTION</span>

                <strong>
                  {bookings.length}{" "}
                  {bookings.length === 1
                    ? "Booking"
                    : "Bookings"}
                </strong>

                <p>EVENTS · EXPERIENCES</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bookings-container">
          {refundNotice && (
            <div
              className="vb-refund-notice"
              role="status"
            >
              <i
                className={`bi ${
                  refundNotice.needsAttention
                    ? "bi-exclamation-circle"
                    : "bi-clock-history"
                }`}
              ></i>

              <div>
                <strong>
                  {refundNotice.needsAttention
                    ? "Refund requires attention"
                    : "Refund request received"}
                </strong>

                <p>{refundNotice.message}</p>

                <p>
                  Requested amount:{" "}
                  <b>{formatPrice(refundNotice.amount)}</b>
                </p>

                <p>
                  Status:{" "}
                  <b>{refundNotice.refundStatus}</b>
                </p>

                {refundNotice.refundId && (
                  <small>
                    Refund ID: {refundNotice.refundId}
                  </small>
                )}
              </div>

              <button
                type="button"
                onClick={() => setRefundNotice(null)}
                aria-label="Dismiss refund notice"
              >
                ×
              </button>
            </div>
          )}

          {error && (
            <div className="bookings-error">
              <div className="bookings-error-icon">
                <i className="bi bi-exclamation-circle"></i>
              </div>

              <div>
                <strong>
                  We couldn't load your bookings.
                </strong>
                <p>{error}</p>

                <button
                  type="button"
                  className="vb-retry-button"
                  onClick={() => fetchBookings()}
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {!error && bookings.length === 0 && (
            <div className="bookings-empty">
              <div className="bookings-empty-icon">
                <i className="bi bi-calendar2-heart"></i>
              </div>

              <span>YOUR EXPERIENCES</span>

              <h2>No event bookings yet.</h2>

              <p>
                Discover something you love and your Vibely
                reservations will appear here.
              </p>

              <Link to="/events">
                Explore Events
                <i className="bi bi-arrow-right"></i>
              </Link>
            </div>
          )}

          {!error && bookings.length > 0 && (
            <>
              <section className="bookings-summary">
                <div className="booking-summary-card">
                  <div className="booking-summary-icon">
                    <i className="bi bi-calendar2-check"></i>
                  </div>

                  <div>
                    <span>ALL BOOKINGS</span>
                    <strong>{bookings.length}</strong>
                    <p>Total reservations</p>
                  </div>
                </div>

                <div className="booking-summary-card">
                  <div className="booking-summary-icon">
                    <i className="bi bi-patch-check"></i>
                  </div>

                  <div>
                    <span>CONFIRMED</span>
                    <strong>{confirmedBookings}</strong>
                    <p>Ready to enjoy</p>
                  </div>
                </div>

                <div className="booking-summary-card">
                  <div className="booking-summary-icon">
                    <i className="bi bi-credit-card"></i>
                  </div>

                  <div>
                    <span>PAID</span>
                    <strong>{paidBookings}</strong>
                    <p>Completed payments</p>
                  </div>
                </div>

                <div className="booking-summary-card">
                  <div className="booking-summary-icon">
                    <i className="bi bi-x-circle"></i>
                  </div>

                  <div>
                    <span>CANCELLED</span>
                    <strong>{cancelledBookings}</strong>
                    <p>Cancelled bookings</p>
                  </div>
                </div>
              </section>

              <div className="bookings-top">
                <div>
                  <span>BOOKING HISTORY</span>

                  <h2>Your event experiences</h2>

                  <p>
                    Review your reservations, payment
                    status and ticket information.
                  </p>
                </div>

                <Link to="/events">
                  Explore Events
                  <i className="bi bi-arrow-right"></i>
                </Link>
              </div>

              <div className="bookings-grid">
                {bookings.map((booking, index) => {
                  const event = booking.event || {};
                  const selections = getSelections(booking);

                  const tickets = Array.isArray(
                    booking.tickets
                  )
                    ? booking.tickets
                    : [];

                  const validTickets = tickets.filter(
                    (ticket) => ticket.status === "valid"
                  );

                  const refundPendingCount = tickets.filter(
                    (ticket) =>
                      ticket.status === "refund_pending"
                  ).length;

                  const canManage =
                    ["paid", "partially_refunded"].includes(
                      booking.paymentStatus
                    ) &&
                    validTickets.length > 0;

                  const categoryLabel =
                    selections.length > 1
                      ? `${selections.length} TICKET CATEGORIES`
                      : selections[0]?.ticketType ||
                        "EVENT BOOKING";

                  return (
                    <article
                      className="booking-card"
                      key={booking._id}
                    >
                      <div className="booking-image">
                        <img
                          src={event.image || concertImage}
                          alt={event.title || "Vibely event"}
                        />

                        <div className="booking-image-overlay"></div>

                        <div className="booking-image-top">
                          <span className="booking-number">
                            BOOKING{" "}
                            {String(index + 1).padStart(
                              2,
                              "0"
                            )}
                          </span>

                          <span
                            className={`booking-status ${
                              booking.bookingStatus ||
                              "pending"
                            }`}
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

                            {bookingStatusLabel(
                              booking.bookingStatus
                            )}
                          </span>
                        </div>

                        <div className="booking-image-content">
                          <span>{categoryLabel}</span>

                          <h2>
                            {event.title || "Vibely Event"}
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
                              <span>EVENT DATE</span>

                              <strong>
                                {formatDate(event.date)}
                              </strong>
                            </div>
                          </div>

                          <div>
                            <div className="booking-info-icon">
                              <i className="bi bi-geo-alt"></i>
                            </div>

                            <div>
                              <span>LOCATION</span>

                              <strong>
                                {event.location ||
                                  "Location unavailable"}
                              </strong>
                            </div>
                          </div>
                        </div>

                        <div className="booking-details">
                          <div className="booking-category-section">
                            <span>Ticket Categories</span>

                            {selections.length > 0 ? (
                              <div className="booking-category-list">
                                {selections.map(
                                  (selection, selectionIndex) => (
                                    <div
                                      className="booking-category-item"
                                      key={
                                        selection.ticketTypeId ||
                                        selectionIndex
                                      }
                                    >
                                      <div className="booking-category-name">
                                        <strong>
                                          {selection.ticketType ||
                                            "Event Ticket"}
                                        </strong>

                                        <small>
                                          {selection.quantity || 0}{" "}
                                          {Number(
                                            selection.quantity
                                          ) === 1
                                            ? "ticket"
                                            : "tickets"}
                                        </small>
                                      </div>

                                      <div className="booking-category-price">
                                        <span>
                                          {selection.quantity || 0} ×{" "}
                                          {formatPrice(
                                            selection.ticketPrice
                                          )}
                                        </span>

                                        <strong>
                                          {formatPrice(
                                            Number(
                                              selection.quantity || 0
                                            ) *
                                              Number(
                                                selection.ticketPrice || 0
                                              )
                                          )}
                                        </strong>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            ) : (
                              <strong>Not specified</strong>
                            )}
                          </div>

                          <div>
                            <span>Total Tickets</span>

                            <strong>
                              {booking.quantity || 0}
                            </strong>
                          </div>

                          <div>
                            <span>Total Amount</span>

                            <strong>
                              {formatPrice(
                                booking.totalAmount
                              )}
                            </strong>
                          </div>
                        </div>

                        <div className="booking-reference">
                          <div>
                            <span>BOOKING REFERENCE</span>

                            <strong>
                              {booking.bookingReference ||
                                "—"}
                            </strong>
                          </div>

                          <span
                            className={`payment-status ${
                              booking.paymentStatus ||
                              "pending"
                            }`}
                          >
                            <i
                              className={
                                booking.paymentStatus === "paid"
                                  ? "bi bi-check-circle-fill"
                                  : [
                                        "refunded",
                                        "partially_refunded"
                                      ].includes(
                                        booking.paymentStatus
                                      )
                                    ? "bi bi-arrow-counterclockwise"
                                    : booking.paymentStatus ===
                                        "failed"
                                      ? "bi bi-x-circle"
                                      : "bi bi-clock"
                              }
                            ></i>

                            {paymentStatusLabel(
                              booking.paymentStatus
                            )}
                          </span>
                        </div>

                        {refundPendingCount > 0 && (
                          <p className="vb-pending-note">
                            <i className="bi bi-clock-history"></i>{" "}
                            {refundPendingCount}{" "}
                            {refundPendingCount === 1
                              ? "ticket has"
                              : "tickets have"}{" "}
                            a pending refund request.
                          </p>
                        )}

                        {tickets.length > 0 && (
                          <p className="vb-ticket-count">
                            {validTickets.length} valid{" "}
                            {validTickets.length === 1
                              ? "ticket"
                              : "tickets"}{" "}
                            remaining
                          </p>
                        )}

                        {[
                          "paid",
                          "partially_refunded"
                        ].includes(
                          booking.paymentStatus
                        ) && (
                          <Link
                            to="/my-tickets"
                            className="booking-ticket-link"
                          >
                            <span>View My Tickets</span>
                            <i className="bi bi-arrow-right"></i>
                          </Link>
                        )}

                        {canManage && (
                          <button
                            type="button"
                            className="vb-manage-button"
                            onClick={() => openManager(booking)}
                          >
                            <i className="bi bi-ticket-perforated"></i>
                            Manage / Cancel Tickets
                            <i className="bi bi-arrow-right"></i>
                          </button>
                        )}
                      </div>

                      <div className="booking-card-bottom">
                        <div>
                          <img
                            src={vibelyLogo}
                            alt="Vibely"
                          />

                          <div>
                            <strong>VIBELY</strong>
                            <span>EVENT RESERVATION</span>
                          </div>
                        </div>

                        <span>Find your vibe.</span>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="bookings-help-card">
                <div className="bookings-help-icon">
                  <i className="bi bi-ticket-perforated"></i>
                </div>

                <div>
                  <span>YOUR ENTRY PASS</span>

                  <h3>Looking for your QR tickets?</h3>

                  <p>
                    Confirmed event bookings have individual
                    digital tickets. Open My Tickets to access
                    your ticket codes and QR entry passes.
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

      {activeBooking && (
        <div
          className="vb-cancel-backdrop"
          onClick={closeManager}
        >
          <section
            className="vb-cancel-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vb-cancel-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="vb-cancel-close"
              onClick={closeManager}
              disabled={submitting}
              aria-label="Close ticket manager"
            >
              ×
            </button>

            <span className="vb-cancel-eyebrow">
              VIBELY · TICKET MANAGEMENT
            </span>

            <h2 id="vb-cancel-title">
              {confirming
                ? "Confirm cancellation"
                : "Manage your tickets"}
            </h2>

            <p className="vb-cancel-intro">
              {activeBooking.event?.title ||
                "Your Vibely Experience"}
            </p>

            {!confirming ? (
              <>
                <p className="vb-cancel-instruction">
                  Select the unused tickets you would like
                  to cancel. Tickets that are used,
                  cancelled or awaiting a refund cannot
                  be selected.
                </p>

                <div className="vb-cancel-ticket-list">
                  {activeTickets.map((ticket) => {
                    const eligible =
                      ticket.status === "valid";

                    const checked =
                      selectedIds.includes(
                        String(ticket._id)
                      );

                    return (
                      <label
                        className={`vb-cancel-ticket ${
                          !eligible ? "vb-ticket-disabled" : ""
                        }`}
                        key={ticket._id}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!eligible || submitting}
                          onChange={() =>
                            toggleTicket(
                              String(ticket._id)
                            )
                          }
                        />

                        <div className="vb-cancel-ticket-info">
                          <strong>
                            {ticket.ticketType ||
                              "Event Ticket"}
                          </strong>

                          <small>
                            {ticket.ticketCode}
                          </small>

                          <span>
                            {ticketStatusLabel(
                              ticket.status
                            )}
                          </span>
                        </div>

                        <strong className="vb-cancel-ticket-price">
                          {formatPrice(
                            ticket.ticketPrice ??
                              activeBooking.ticketPrice
                          )}
                        </strong>
                      </label>
                    );
                  })}
                </div>

                <div className="vb-refund-total">
                  <div>
                    <span>Selected Tickets</span>
                    <strong>
                      {selectedTickets.length}
                    </strong>
                  </div>

                  <div>
                    <span>Requested Refund</span>
                    <strong>
                      {formatPrice(refundAmount)}
                    </strong>
                  </div>
                </div>

                <p className="vb-refund-disclaimer">
                  The refund amount is calculated from the
                  selected ticket prices. Submission does
                  not mean the refund has been completed.
                </p>

                {cancelError && (
                  <p className="vb-cancel-error" role="alert">
                    {cancelError}
                  </p>
                )}

                <button
                  type="button"
                  className="vb-cancel-primary"
                  disabled={!canRequestRefund || submitting}
                  onClick={() => setConfirming(true)}
                >
                  Continue to Cancellation
                  <i className="bi bi-arrow-right"></i>
                </button>
              </>
            ) : (
              <>
                <div className="vb-confirm-summary">
                  <i className="bi bi-exclamation-circle"></i>

                  <h3>
                    Are you sure you want to cancel
                    these tickets?
                  </h3>

                  <p>
                    You selected{" "}
                    <strong>
                      {selectedTickets.length}
                    </strong>{" "}
                    {selectedTickets.length === 1
                      ? "ticket"
                      : "tickets"}{" "}
                    for a refund request of{" "}
                    <strong>
                      {formatPrice(refundAmount)}
                    </strong>
                    .
                  </p>

                  <p>
                    Your other tickets will remain
                    unchanged. Selected tickets will
                    become unavailable for entry while
                    their refund is being processed.
                  </p>
                </div>

                {cancelError && (
                  <p className="vb-cancel-error" role="alert">
                    {cancelError}
                  </p>
                )}

                <button
                  type="button"
                  className="vb-cancel-primary"
                  disabled={submitting}
                  onClick={cancelSelectedTickets}
                >
                  {submitting
                    ? "Submitting Request..."
                    : "Confirm Refund Request"}
                </button>

                <button
                  type="button"
                  className="vb-cancel-secondary"
                  disabled={submitting}
                  onClick={() => setConfirming(false)}
                >
                  Go Back
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
