
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/vibelyTickets.css";

const API =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const formatDate = (value) => {
  if (!value) return "To be announced";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "To be announced";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
};

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);

const getStatusLabel = (status) => {
  const labels = {
    valid: "Ready to use",
    used: "Checked in",
    cancelled: "Cancelled",
    refund_pending: "Refund pending"
  };

  return labels[status] || status || "Unknown";
};

const getToken = () =>
  localStorage.getItem("accessToken") ||
  localStorage.getItem("token");

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState(null);

  const fetchTickets = useCallback(async (signal) => {
    const token = getToken();

    if (!token) {
      setError("Please sign in to view your tickets.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.get(`${API}/tickets/my`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        signal
      });

      const result = response.data?.data;
      const list = Array.isArray(result)
        ? result
        : Array.isArray(result?.tickets)
          ? result.tickets
          : [];

      setTickets(list);
    } catch (err) {
      if (axios.isCancel(err)) return;

      setError(
        err.response?.data?.message ||
        "We couldn't load your tickets right now."
      );
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetchTickets(controller.signal);

    return () => controller.abort();
  }, [fetchTickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const event = ticket.event || {};

      const text = [
        event.title,
        event.location,
        ticket.ticketCode,
        ticket.ticketType
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = text.includes(
        search.trim().toLowerCase()
      );

      const matchesFilter =
        filter === "all" || ticket.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [tickets, search, filter]);

  const downloadQR = (ticket) => {
    if (
      !ticket.qrCode ||
      !ticket.qrCode.startsWith("data:image/png;base64,")
    ) {
      return;
    }

    const link = document.createElement("a");
    link.href = ticket.qrCode;
    link.download = `Vibely-${ticket.ticketCode}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <main className="vb-page vb-tickets-page">
      <div className="vb-container">
        <header className="vb-tickets-header">
          <Link to="/" className="vb-logo">
            ✦ VIBELY
          </Link>

          <span className="vb-overline">
            YOUR PERSONAL COLLECTION
          </span>

          <h1>
            Your tickets.
            <br />
            <em>Your moments.</em>
          </h1>

          <p>
            Every beautiful experience begins with an invitation.
            Here are yours.
          </p>
        </header>

        <div className="vb-tickets-toolbar">
          <div className="vb-ticket-counter">
            <span>MY COLLECTION</span>
            <strong>
              {tickets.length}{" "}
              {tickets.length === 1 ? "Ticket" : "Tickets"}
            </strong>
          </div>

          <div className="vb-ticket-controls">
            <input
              type="search"
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All tickets</option>
              <option value="valid">Ready to use</option>
              <option value="used">Checked in</option>
              <option value="refund_pending">Refund pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="vb-empty">
            <span className="vb-loader vb-dark-loader" />
            <h2>Gathering your experiences...</h2>
          </div>
        ) : error ? (
          <div className="vb-empty">
            <span className="vb-empty-symbol">♡</span>
            <h2>We couldn't load your tickets</h2>
            <p>{error}</p>

            <Link to="/login" className="vb-main-button">
              Sign in
            </Link>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="vb-empty">
            <span className="vb-empty-symbol">✧</span>

            <h2>
              {tickets.length
                ? "No matching tickets"
                : "Your story starts here"}
            </h2>

            <p>
              {tickets.length
                ? "Try a different search or status."
                : "Discover your next unforgettable experience."}
            </p>

            <Link to="/events" className="vb-main-button">
              Explore events <span>↗</span>
            </Link>
          </div>
        ) : (
          <div className="vb-tickets-grid">
            {filteredTickets.map((ticket) => {
              const event = ticket.event || {};
              const booking = ticket.booking || {};

              return (
                <article
                  key={ticket._id || ticket.ticketCode}
                  className="vb-ticket-card"
                >
                  <div className="vb-ticket-top">
                    <div className="vb-ticket-topline">
                      <span>✦ VIBELY</span>
                      <small>ADMIT ONE</small>
                    </div>

                    <div className="vb-ticket-main">
                      <span className="vb-overline">
                        AN INVITATION TO
                      </span>

                      <h2>
                        {event.title || "Vibely Experience"}
                      </h2>

                      <span className="vb-category">
                        ✧ {ticket.ticketType || "Event Ticket"}
                      </span>
                    </div>

                    <div className="vb-ticket-info">
                      <div>
                        <small>DATE & TIME</small>
                        <strong>{formatDate(event.date)}</strong>
                      </div>

                      <div>
                        <small>VENUE</small>
                        <strong>
                          {event.location || "To be announced"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="vb-ticket-perforation">
                    <span />
                    <div />
                    <span />
                  </div>

                  <div className="vb-ticket-bottom">
                    <div className="vb-ticket-bottom-row">
                      {ticket.qrCode ? (
                        <img
                          src={ticket.qrCode}
                          alt={`QR code for ${ticket.ticketCode}`}
                          className="vb-qr"
                        />
                      ) : (
                        <div className="vb-qr vb-qr-missing">
                          QR unavailable
                        </div>
                      )}

                      <div className="vb-ticket-meta">
                        <small>TICKET CODE</small>
                        <strong>{ticket.ticketCode}</strong>

                        <span
                          className={`vb-status vb-status-${ticket.status}`}
                        >
                          {getStatusLabel(ticket.status)}
                        </span>

                        <small>PRICE</small>
                        <strong>
                          {formatPrice(ticket.ticketPrice)}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="vb-ticket-action"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      View ticket details <span>↗</span>
                    </button>

                    {booking.bookingReference && (
                      <p className="vb-booking-ref">
                        Booking: {booking.bookingReference}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="vb-discover-banner">
          <div>
            <span className="vb-overline">
              MORE MAGIC AWAITS
            </span>

            <h2>
              The best memories
              <br />
              <em>are still ahead.</em>
            </h2>
          </div>

          <Link to="/events">
            Discover events ↗
          </Link>
        </div>
      </div>

      {selectedTicket && (
        <div
          className="vb-modal-backdrop"
          onClick={() => setSelectedTicket(null)}
        >
          <section
            className="vb-ticket-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Ticket details"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="vb-modal-close"
              onClick={() => setSelectedTicket(null)}
            >
              ×
            </button>

            <span className="vb-logo">
              ✦ VIBELY
            </span>

            <span className="vb-overline">
              YOUR DIGITAL INVITATION
            </span>

            <h2>
              {selectedTicket.event?.title ||
                "Vibely Experience"}
            </h2>

            {selectedTicket.qrCode ? (
              <img
                src={selectedTicket.qrCode}
                alt="Ticket QR code"
                className="vb-modal-qr"
              />
            ) : (
              <p>QR code unavailable.</p>
            )}

            <p className="vb-modal-code">
              {selectedTicket.ticketCode}
            </p>

            <div className="vb-modal-details">
              <p>
                <span>Category</span>
                <strong>
                  {selectedTicket.ticketType}
                </strong>
              </p>

              <p>
                <span>Date</span>
                <strong>
                  {formatDate(selectedTicket.event?.date)}
                </strong>
              </p>

              <p>
                <span>Status</span>
                <strong>
                  {getStatusLabel(selectedTicket.status)}
                </strong>
              </p>
            </div>

            {selectedTicket.qrCode?.startsWith(
              "data:image/png;base64,"
            ) && (
              <button
                type="button"
                className="vb-main-button"
                onClick={() => downloadQR(selectedTicket)}
              >
                Download QR code <span>↓</span>
              </button>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
