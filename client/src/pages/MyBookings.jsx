
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../component/Navbar";
import DetailFooter from "../component/DetailFooter";
import concertImage from "../assets/concert.jpg";
import "../styles/myBookings.css";

const API =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const money = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const dateText = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

const pretty = (value) =>
  String(value || "pending")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const selectionsOf = (booking) => {
  if (Array.isArray(booking.ticketSelections) && booking.ticketSelections.length) {
    return booking.ticketSelections;
  }

  if (booking.ticketType) {
    return [{
      ticketType: booking.ticketType,
      ticketPrice: booking.ticketPrice,
      quantity: booking.quantity
    }];
  }

  return [];
};

export default function MyBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState({});
  const [activeBooking, setActiveBooking] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [refundNotice, setRefundNotice] = useState(null);

const goToLogin = useCallback(() => {
  localStorage.removeItem("userAccessToken");
  localStorage.removeItem("userRefreshToken");
  localStorage.removeItem("userRole");

  navigate("/login", {
    replace: true,
    state: { returnTo: "/my-bookings" }
  });
}, [navigate]);

  const fetchBookings = useCallback(async (signal, silent = false) => {
    const token = localStorage.getItem("userAccessToken");

    if (!token) {
      goToLogin();
      return;
    }

    if (silent) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const response = await axios.get(`${API}/bookings/my`, {
        headers: { Authorization: `Bearer ${token}` },
        signal
      });

      const data = response.data?.data;
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.bookings)
          ? data.bookings
          : [];

      if (!signal?.aborted) setBookings(list);
    } catch (err) {
      if (axios.isCancel(err) || signal?.aborted) return;

      if (err.response?.status === 401) {
        goToLogin();
        return;
      }

      setError(
        err.response?.data?.message ||
        "We couldn't load your bookings. Please try again."
      );
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [goToLogin]);

  useEffect(() => {
    const controller = new AbortController();
    fetchBookings(controller.signal);
    return () => controller.abort();
  }, [fetchBookings]);

  const stats = useMemo(() => ({
    total: bookings.length,
    confirmed: bookings.filter(
      (b) => b.bookingStatus === "confirmed"
    ).length,
    tickets: bookings.reduce(
      (sum, b) => sum + (Number(b.quantity) || 0),
      0
    ),
    refunds: bookings.filter(
      (b) =>
        ["partially_refunded", "refunded"].includes(b.paymentStatus) ||
        ["cancelled", "partially_cancelled"].includes(b.bookingStatus) ||
        b.tickets?.some((t) => t.status === "refund_pending")
    ).length
  }), [bookings]);

  const filtered = useMemo(() => {
    return bookings.filter((booking) => {
      const event = booking.event || {};
      const text = [
        event.title,
        event.location,
        booking.bookingReference,
        ...selectionsOf(booking).map((s) => s.ticketType)
      ].join(" ").toLowerCase();

      const matchesSearch = text.includes(search.trim().toLowerCase());

      const matchesFilter =
        filter === "all" ||
        (filter === "confirmed" && booking.bookingStatus === "confirmed") ||
        (filter === "pending" &&
          (booking.bookingStatus === "pending" ||
            booking.paymentStatus === "pending")) ||
        (filter === "refunds" &&
          (["refunded", "partially_refunded"].includes(booking.paymentStatus) ||
            ["cancelled", "partially_cancelled"].includes(booking.bookingStatus) ||
            booking.tickets?.some((t) => t.status === "refund_pending")));

      return matchesSearch && matchesFilter;
    });
  }, [bookings, search, filter]);

  const openManager = (booking) => {
    setActiveBooking(booking);
    setSelectedIds([]);
    setConfirming(false);
    setCancelError("");
  };

  const closeManager = () => {
    if (submitting) return;
    setActiveBooking(null);
    setSelectedIds([]);
    setConfirming(false);
    setCancelError("");
  };

  const activeTickets = Array.isArray(activeBooking?.tickets)
    ? activeBooking.tickets
    : [];

  const selectedTickets = activeTickets.filter((ticket) =>
    selectedIds.includes(String(ticket._id))
  );

  const refundAmount = selectedTickets.reduce(
    (sum, ticket) =>
      sum + Number(ticket.ticketPrice ?? activeBooking?.ticketPrice ?? 0),
    0
  );

  const canRefund =
    selectedTickets.length > 0 &&
    selectedTickets.every(
      (ticket) =>
        ticket.status === "valid" &&
        Number.isFinite(Number(ticket.ticketPrice ?? activeBooking?.ticketPrice)) &&
        Number(ticket.ticketPrice ?? activeBooking?.ticketPrice) >= 0
    ) &&
    refundAmount > 0;

  const submitCancellation = async () => {
    if (!activeBooking || !canRefund || submitting) return;

    const token = localStorage.getItem("userAccessToken");

    if (!token) {
      goToLogin();
      return;
    }

    setSubmitting(true);
    setCancelError("");

    try {
      const response = await axios.patch(
        `${API}/bookings/${activeBooking._id}/cancel-tickets`,
        { ticketIds: selectedIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const result = response.data?.data || {};

      setRefundNotice({
        message: response.data?.message || "Your refund request has been submitted.",
        amount: result.refundAmount ?? refundAmount,
        status: result.refundStatus || "pending",
        refundId: result.refundId
      });

      closeManagerAfterSuccess();
      await fetchBookings(undefined, true);
    } catch (err) {
      if (err.response?.status === 401) {
        goToLogin();
        return;
      }

      setConfirming(false);
      setCancelError(
        err.response?.data?.message ||
        "Unable to submit your request. Please check your booking before trying again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const closeManagerAfterSuccess = () => {
    setActiveBooking(null);
    setSelectedIds([]);
    setConfirming(false);
  };

  return (
    <>
      <Navbar />

      <main className="vmb-page">
        <div className="vmb-container">
          <header className="vmb-header">
            <div>
              <div className="vmb-eyebrow">
                <span className="vmb-eyebrow-line" />
                YOUR VIBELY ACCOUNT
              </div>
              <h1>My <em>Bookings</em></h1>
              <p>All your memorable experiences, beautifully organised.</p>
            </div>

            <div className="vmb-header-actions">
              <Link to="/my-tickets" className="vmb-outline-btn">
                <i className="bi bi-ticket-perforated" />
                My Tickets
              </Link>
              <Link to="/events" className="vmb-primary-btn">
                Explore Events
                <i className="bi bi-arrow-up-right" />
              </Link>
            </div>
          </header>

          <section className="vmb-stats">
            {[
              ["bi-calendar2-check", "Total Bookings", stats.total],
              ["bi-patch-check", "Confirmed", stats.confirmed],
              ["bi-ticket-perforated", "Tickets Booked", stats.tickets],
              ["bi-arrow-counterclockwise", "Refund Activity", stats.refunds]
            ].map(([icon, label, value]) => (
              <div className="vmb-stat" key={label}>
                <span className="vmb-stat-icon"><i className={`bi ${icon}`} /></span>
                <div>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </div>
              </div>
            ))}
          </section>

          {refundNotice && (
            <div className="vmb-notice" role="status">
              <i className="bi bi-info-circle" />
              <div>
                <strong>Refund request received</strong>
                <p>{refundNotice.message}</p>
                <small>
                  {money(refundNotice.amount)} · {pretty(refundNotice.status)}
                </small>
              </div>
              <Link to="/my-refunds">Track refund</Link>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => setRefundNotice(null)}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>
          )}

          <section className="vmb-history">
            <div className="vmb-history-heading">
              <div>
                <span className="vmb-section-label">YOUR RESERVATIONS</span>
                <h2>Booking history</h2>
                <p>View your bookings, ticket categories and payment details.</p>
              </div>
              <button
                type="button"
                className="vmb-refresh"
                onClick={() => fetchBookings(undefined, true)}
                disabled={refreshing || loading}
              >
                <i className={`bi bi-arrow-clockwise ${refreshing ? "vmb-spinning" : ""}`} />
                Refresh
              </button>
            </div>

            {!loading && bookings.length > 0 && (
              <div className="vmb-toolbar">
                <div className="vmb-search">
                  <i className="bi bi-search" />
                  <input
                    type="search"
                    placeholder="Search events or booking references..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="vmb-filters">
                  {[
                    ["all", "All"],
                    ["confirmed", "Confirmed"],
                    ["pending", "Pending"],
                    ["refunds", "Refunds"]
                  ].map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      className={filter === value ? "active" : ""}
                      onClick={() => setFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="vmb-state">
                <i className="bi bi-exclamation-circle" />
                <h3>Couldn't load your bookings</h3>
                <p>{error}</p>
                <button type="button" onClick={() => fetchBookings()}>
                  Try Again
                </button>
              </div>
            )}

            {loading && (
              <div className="vmb-state">
                <div className="vmb-loader" />
                <p>Getting your bookings ready...</p>
              </div>
            )}

            {!loading && !error && bookings.length === 0 && (
              <div className="vmb-state">
                <i className="bi bi-calendar2-heart" />
                <h3>Your story starts here</h3>
                <p>You haven't booked an event yet. Find something unforgettable.</p>
                <Link to="/events">Discover Events</Link>
              </div>
            )}

            {!loading && !error && bookings.length > 0 && filtered.length === 0 && (
              <div className="vmb-state">
                <i className="bi bi-search" />
                <h3>No matching bookings</h3>
                <p>Try another search or filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                >
                  Clear Filters
                </button>
              </div>
            )}

            {!loading && !error && filtered.length > 0 && (
              <div className="vmb-list">
                {filtered.map((booking) => {
                  const event = booking.event || {};
                  const selections = selectionsOf(booking);
                  const tickets = Array.isArray(booking.tickets)
                    ? booking.tickets
                    : [];
                  const validTickets = tickets.filter(
                    (ticket) => ticket.status === "valid"
                  );
                  const pendingRefunds = tickets.filter(
                    (ticket) => ticket.status === "refund_pending"
                  ).length;
                  const canManage =
                    ["paid", "partially_refunded"].includes(booking.paymentStatus) &&
                    validTickets.length > 0;
                  const isExpanded = Boolean(expanded[booking._id]);

                  return (
                    <article className="vmb-booking" key={booking._id}>
                      <div className="vmb-booking-main">
                        <div className="vmb-event-image">
                          <img
                            src={event.image || concertImage}
                            alt={event.title || "Event"}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = concertImage;
                            }}
                          />
                          <span>VIBELY EXPERIENCE</span>
                        </div>

                        <div className="vmb-booking-info">
                          <div className="vmb-booking-badges">
                            <span className={`vmb-pill ${booking.bookingStatus || "pending"}`}>
                              <span className="vmb-dot" />
                              {pretty(booking.bookingStatus)}
                            </span>
                            <span className={`vmb-pill payment-${booking.paymentStatus || "pending"}`}>
                              {pretty(booking.paymentStatus)}
                            </span>
                          </div>

                          <h3>{event.title || "Vibely Event"}</h3>

                          <div className="vmb-meta">
                            <span>
                              <i className="bi bi-calendar3" />
                              {dateText(event.date)}
                            </span>
                            <span>
                              <i className="bi bi-geo-alt" />
                              {event.location || "Location unavailable"}
                            </span>
                          </div>

                          <div className="vmb-category-tags">
                            {selections.map((selection, index) => (
                              <span key={`${selection.ticketType}-${index}`}>
                                {selection.ticketType || "Ticket"} × {selection.quantity}
                              </span>
                            ))}
                          </div>

                          <div className="vmb-reference">
                            REF: {booking.bookingReference || "Unavailable"}
                          </div>
                        </div>

                        <div className="vmb-booking-side">
                          <small>TOTAL PAID / BOOKED</small>
                          <strong>{money(booking.totalAmount)}</strong>
                          <span>
                            <i className="bi bi-ticket-perforated" />
                            {booking.quantity || 0} tickets
                          </span>
                          <button
                            type="button"
                            className="vmb-details-btn"
                            onClick={() =>
                              setExpanded((current) => ({
                                ...current,
                                [booking._id]: !current[booking._id]
                              }))
                            }
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? "Hide Details" : "View Details"}
                            <i className={`bi bi-chevron-${isExpanded ? "up" : "down"}`} />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="vmb-expanded">
                          <div className="vmb-expanded-heading">
                            <div>
                              <span className="vmb-section-label">BOOKING DETAILS</span>
                              <h4>Your ticket breakdown</h4>
                            </div>
                            <span>{booking.quantity || 0} total tickets</span>
                          </div>

                          <div className="vmb-ticket-table">
                            {selections.length ? selections.map((selection, index) => (
                              <div className="vmb-ticket-row" key={index}>
                                <div>
                                  <i className="bi bi-ticket-perforated" />
                                  <div>
                                    <strong>{selection.ticketType || "Event Ticket"}</strong>
                                    <small>{money(selection.ticketPrice)} per ticket</small>
                                  </div>
                                </div>
                                <span>Qty {selection.quantity}</span>
                                <strong>
                                  {money(
                                    Number(selection.ticketPrice || 0) *
                                    Number(selection.quantity || 0)
                                  )}
                                </strong>
                              </div>
                            )) : (
                              <p>Ticket category details are unavailable.</p>
                            )}
                          </div>

                          <div className="vmb-expanded-bottom">
                            <div>
                              <span>Booking reference</span>
                              <strong>{booking.bookingReference || "—"}</strong>
                            </div>
                            <div>
                              <span>Booking date</span>
                              <strong>{dateText(booking.createdAt)}</strong>
                            </div>
                            <div>
                              <span>Ticket status</span>
                              <strong>
                                {validTickets.length} valid
                                {pendingRefunds > 0 ? ` · ${pendingRefunds} refund pending` : ""}
                              </strong>
                            </div>
                          </div>

                          <div className="vmb-expanded-actions">
                            {["paid", "partially_refunded"].includes(
                              booking.paymentStatus
                            ) && (
                              <Link to="/my-tickets" className="vmb-primary-btn">
                                <i className="bi bi-qr-code" />
                                View My Tickets
                              </Link>
                            )}

                            {canManage && (
                              <button
                                type="button"
                                className="vmb-outline-btn"
                                onClick={() => openManager(booking)}
                              >
                                <i className="bi bi-arrow-counterclockwise" />
                                Manage / Cancel Tickets
                              </button>
                            )}

                            <Link to="/my-refunds" className="vmb-text-link">
                              Refund History
                              <i className="bi bi-arrow-right" />
                            </Link>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <div className="vmb-help">
            <div className="vmb-help-icon">
              <i className="bi bi-headset" />
            </div>
            <div>
              <strong>Everything you need, in one place.</strong>
              <p>
                Your tickets are available in My Tickets. You can also
                check the progress of your refund requests anytime.
              </p>
            </div>
            <Link to="/my-refunds">
              View Refunds
              <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </main>

      {activeBooking && (
        <div
          className="vmb-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeManager();
          }}
        >
          <div
            className="vmb-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vmb-modal-title"
          >
            <div className="vmb-modal-header">
              <div>
                <span className="vmb-section-label">TICKET MANAGEMENT</span>
                <h2 id="vmb-modal-title">Manage your tickets</h2>
                <p>{activeBooking.event?.title || "Your event booking"}</p>
              </div>
              <button
                type="button"
                className="vmb-close"
                onClick={closeManager}
                disabled={submitting}
                aria-label="Close"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="vmb-modal-body">
              <p className="vmb-modal-instruction">
                Select the valid tickets you want to cancel and request
                a refund for.
              </p>

              {activeTickets.map((ticket) => {
                const id = String(ticket._id);
                const eligible = ticket.status === "valid";
                const selected = selectedIds.includes(id);

                return (
                  <label
                    key={id}
                    className={`vmb-select-ticket ${selected ? "selected" : ""} ${!eligible ? "disabled" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={!eligible || submitting}
                      onChange={() => {
                        setCancelError("");
                        setConfirming(false);
                        setSelectedIds((current) =>
                          current.includes(id)
                            ? current.filter((value) => value !== id)
                            : [...current, id]
                        );
                      }}
                    />
                    <div>
                      <strong>{ticket.ticketType || "Event Ticket"}</strong>
                      <small>{ticket.ticketCode || id}</small>
                    </div>
                    <div className="vmb-select-ticket-right">
                      <strong>
                        {money(ticket.ticketPrice ?? activeBooking.ticketPrice)}
                      </strong>
                      <span>{pretty(ticket.status)}</span>
                    </div>
                  </label>
                );
              })}

              {activeTickets.length === 0 && (
                <p>Individual ticket details are unavailable for this booking.</p>
              )}

              <div className="vmb-refund-summary">
                <div>
                  <span>Selected tickets</span>
                  <strong>{selectedIds.length}</strong>
                </div>
                <div>
                  <span>Requested refund amount</span>
                  <strong>{money(refundAmount)}</strong>
                </div>
              </div>

              {cancelError && (
                <div className="vmb-modal-error" role="alert">
                  <i className="bi bi-exclamation-circle" />
                  {cancelError}
                </div>
              )}

              {confirming && (
                <div className="vmb-confirmation">
                  <strong>Confirm ticket cancellation?</strong>
                  <p>
                    You are requesting a refund of {money(refundAmount)}
                    for {selectedIds.length} selected ticket(s).
                    Once processed, those tickets will no longer be valid.
                  </p>
                </div>
              )}
            </div>

            <div className="vmb-modal-footer">
              <button
                type="button"
                className="vmb-outline-btn"
                onClick={confirming ? () => setConfirming(false) : closeManager}
                disabled={submitting}
              >
                {confirming ? "Go Back" : "Close"}
              </button>

              <button
                type="button"
                className="vmb-primary-btn"
                disabled={!canRefund || submitting}
                onClick={() => {
                  if (!confirming) setConfirming(true);
                  else submitCancellation();
                }}
              >
                {submitting
                  ? "Submitting..."
                  : confirming
                    ? "Confirm Refund Request"
                    : "Request Refund"}
                <i className="bi bi-arrow-right" />
              </button>
            </div>
          </div>
        </div>
      )}

      <DetailFooter />
    </>
  );
}
