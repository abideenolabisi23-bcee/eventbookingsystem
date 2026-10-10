
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Ticket,
  Users,
  Wallet,
  Search,
  UserRound,
  ReceiptText,
  CheckCircle2,
  Clock3,
  XCircle,
  RefreshCw,
  QrCode,
  ShieldCheck,
  AlertCircle
} from "lucide-react";

import logo from "../assets/vibely-logo.png";
import "../styles/eventBookings.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const formatMoney = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(amount || 0));

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

const formatDateTime = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

const getCustomerName = (user) => {
  if (!user) return "Customer";

  const name = [user.firstname, user.lastname]
    .filter(Boolean)
    .join(" ");

  return name || user.email || "Customer";
};

const getTicketCategories = (booking) => {
  if (
    Array.isArray(booking.ticketSelections) &&
    booking.ticketSelections.length > 0
  ) {
    return booking.ticketSelections
      .map((selection) => {
        const name =
          selection.ticketType ||
          selection.name ||
          "Regular";

        return `${name} (${selection.quantity || 0})`;
      })
      .join(", ");
  }

  return booking.ticketType || "Regular";
};

const EventBookings = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [ticketStats, setTicketStats] = useState(null);
  const [checkIns, setCheckIns] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("bookings");
  const [ticketFilter, setTicketFilter] = useState("all");

  const fetchDashboard = useCallback(
    async (showLoader = true) => {
      const accessToken = localStorage.getItem("organizerAccessToken");

      if (!accessToken) {
        navigate("/organizer/login");
        return;
      }

      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const config = {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      };

      try {
        const results = await Promise.allSettled([
          axios.get(
            `${API_URL}/organizer/events/${id}/bookings`,
            config
          ),
          axios.get(
            `${API_URL}/organizer/events/${id}/tickets`,
            config
          ),
          axios.get(
            `${API_URL}/organizer/events/${id}/ticket-stats`,
            config
          ),
          axios.get(
            `${API_URL}/organizer/events/${id}/check-ins`,
            config
          )
        ]);

        const unauthorized = results.some(
          (result) =>
            result.status === "rejected" &&
            result.reason?.response?.status === 401
        );

        if (unauthorized) {
          localStorage.removeItem("organizerAccessToken");
          localStorage.removeItem("organizerRefreshToken");
          localStorage.removeItem("organizerRole");
          navigate("/organizer/login");
          return;
        }

        const forbidden = results.some(
          (result) =>
            result.status === "rejected" &&
            result.reason?.response?.status === 403
        );

        if (forbidden) {
          setError(
            "You do not have permission to view this event's booking and ticket information."
          );
          return;
        }

        const [
          bookingsResult,
          ticketsResult,
          statsResult,
          checkInsResult
        ] = results;

        if (bookingsResult.status === "fulfilled") {
          const payload = bookingsResult.value.data?.data;

          setEvent(payload?.event || null);
          setBookings(
            Array.isArray(payload?.bookings)
              ? payload.bookings
              : []
          );
        }

        if (ticketsResult.status === "fulfilled") {
          const data = ticketsResult.value.data?.data;

          setTickets(Array.isArray(data) ? data : []);
        }

        if (statsResult.status === "fulfilled") {
          setTicketStats(
            statsResult.value.data?.data || null
          );
        }

        if (checkInsResult.status === "fulfilled") {
          const data = checkInsResult.value.data?.data;

          setCheckIns(Array.isArray(data) ? data : []);
        }

        const failed = results.filter(
          (result) => result.status === "rejected"
        );

        if (failed.length > 0) {
          setError(
            "Some event information could not be loaded. Please refresh to try again."
          );
        }
      } catch (requestError) {
        console.error(requestError);
        setError("Unable to load event bookings.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, navigate]
  );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const paidBookings = useMemo(
    () =>
      bookings.filter((booking) =>
        ["paid", "partially_refunded"].includes(
          booking.paymentStatus
        )
      ),
    [bookings]
  );

  const totalRevenue = useMemo(
    () =>
      paidBookings.reduce(
        (total, booking) =>
          total + Number(booking.totalAmount || 0),
        0
      ),
    [paidBookings]
  );

  const totalBookedTickets = useMemo(
    () =>
      bookings.reduce(
        (total, booking) =>
          total + Number(booking.quantity || 0),
        0
      ),
    [bookings]
  );

  const stats = useMemo(
    () => ({
      ticketsIssued:
        ticketStats?.ticketsIssued ?? tickets.length,
      validTickets:
        ticketStats?.validTickets ??
        tickets.filter((ticket) => ticket.status === "valid")
          .length,
      usedTickets:
        ticketStats?.usedTickets ??
        tickets.filter((ticket) => ticket.status === "used")
          .length,
      cancelledTickets:
        ticketStats?.cancelledTickets ??
        tickets.filter(
          (ticket) => ticket.status === "cancelled"
        ).length,
      refundPendingTickets:
        ticketStats?.refundPendingTickets ??
        tickets.filter(
          (ticket) => ticket.status === "refund_pending"
        ).length,
      totalCapacity: ticketStats?.totalCapacity,
      availableTickets: ticketStats?.availableTickets
    }),
    [ticketStats, tickets]
  );

  const filteredBookings = useMemo(
    () =>
      bookings.filter((booking) => {
        const searchable = [
          booking.user?.firstname,
          booking.user?.lastname,
          booking.user?.email,
          booking.bookingReference,
          getTicketCategories(booking)
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch = searchable.includes(
          search.toLowerCase()
        );

        const matchesFilter =
          filter === "all" ||
          booking.paymentStatus === filter ||
          booking.bookingStatus === filter;

        return matchesSearch && matchesFilter;
      }),
    [bookings, search, filter]
  );

  const filteredTickets = useMemo(
    () =>
      tickets.filter((ticket) => {
        const searchable = [
          ticket.user?.firstname,
          ticket.user?.lastname,
          ticket.user?.email,
          ticket.ticketCode,
          ticket.ticketType,
          ticket.booking?.bookingReference
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          searchable.includes(search.toLowerCase()) &&
          (ticketFilter === "all" ||
            ticket.status === ticketFilter)
        );
      }),
    [tickets, search, ticketFilter]
  );

  const filteredCheckIns = useMemo(
    () =>
      checkIns.filter((ticket) => {
        const searchable = [
          ticket.user?.firstname,
          ticket.user?.lastname,
          ticket.user?.email,
          ticket.ticketCode,
          ticket.ticketType,
          ticket.booking?.bookingReference,
          ticket.checkedInBy?.firstname,
          ticket.checkedInBy?.lastname
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(search.toLowerCase());
      }),
    [checkIns, search]
  );

  if (loading) {
    return (
      <div className="event-bookings-loading">
        <div className="event-bookings-spinner"></div>
        <p>Loading event bookings...</p>
      </div>
    );
  }

  return (
    <div className="event-bookings-page">
      <header className="event-bookings-topbar">
        <div
          className="event-bookings-brand"
          onClick={() => navigate("/organizer/dashboard")}
        >
          <img src={logo} alt="Vibely" />

          <div>
            <h2>Vibely</h2>
            <span>Organizer</span>
          </div>
        </div>

        <button
          className="event-bookings-back"
          onClick={() =>
            navigate(`/organizer/events/${id}`)
          }
        >
          <ArrowLeft size={18} />
          Event Details
        </button>
      </header>

      <main className="event-bookings-main">
        <section className="event-bookings-heading">
          <div>
            <span className="event-bookings-eyebrow">
              EVENT MANAGEMENT
            </span>

            <h1>Attendees & Bookings</h1>

            <p>
              Manage ticket purchases, monitor attendance
              and review check-in activity for your event.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap"
            }}
          >
            <button
              className="event-bookings-staff-btn"
              onClick={() => fetchDashboard(false)}
              disabled={refreshing}
            >
              <RefreshCw size={16} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            <button
              className="event-bookings-staff-btn"
              onClick={() =>
                navigate(`/organizer/events/${id}/check-in`)
              }
            >
              <QrCode size={16} />
              QR Check-In
            </button>

            <button
              className="event-bookings-staff-btn"
              onClick={() =>
                navigate(`/organizer/events/${id}/staff`)
              }
            >
              Manage Staff
            </button>
          </div>
        </section>

        {error && (
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: "#fff0f2",
              color: "#92253b",
              display: "flex",
              gap: 10,
              alignItems: "center",
              marginBottom: 20
            }}
          >
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {event && (
          <section className="event-bookings-event-card">
            <div className="event-bookings-event-icon">
              <Ticket size={26} />
            </div>

            <div className="event-bookings-event-info">
              <h2>{event.title}</h2>

              <div>
                <span>
                  <CalendarDays size={16} />
                  {formatDate(event.date)}
                </span>

                {event.location && (
                  <span>
                    <MapPin size={16} />
                    {event.location}
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="event-bookings-stats">
          <div className="event-bookings-stat">
            <div className="event-bookings-stat-icon">
              <ReceiptText size={22} />
            </div>

            <div>
              <span>Total Bookings</span>
              <strong>{bookings.length}</strong>
            </div>
          </div>

          <div className="event-bookings-stat">
            <div className="event-bookings-stat-icon">
              <Users size={22} />
            </div>

            <div>
              <span>Tickets Booked</span>
              <strong>{totalBookedTickets}</strong>
            </div>
          </div>

          <div className="event-bookings-stat">
            <div className="event-bookings-stat-icon">
              <Wallet size={22} />
            </div>

            <div>
              <span>Gross Paid Bookings</span>
              <strong>{formatMoney(totalRevenue)}</strong>
            </div>
          </div>

          <div className="event-bookings-stat">
            <div className="event-bookings-stat-icon">
              <Ticket size={22} />
            </div>

            <div>
              <span>Tickets Issued</span>
              <strong>{stats.ticketsIssued}</strong>
            </div>
          </div>

          <div className="event-bookings-stat">
            <div className="event-bookings-stat-icon">
              <CheckCircle2 size={22} />
            </div>

            <div>
              <span>Checked In</span>
              <strong>{stats.usedTickets}</strong>
            </div>
          </div>

          <div className="event-bookings-stat">
            <div className="event-bookings-stat-icon">
              <Clock3 size={22} />
            </div>

            <div>
              <span>Valid Tickets</span>
              <strong>{stats.validTickets}</strong>
            </div>
          </div>

          <div className="event-bookings-stat">
            <div className="event-bookings-stat-icon">
              <XCircle size={22} />
            </div>

            <div>
              <span>Cancelled</span>
              <strong>{stats.cancelledTickets}</strong>
            </div>
          </div>

          <div className="event-bookings-stat">
            <div className="event-bookings-stat-icon">
              <RefreshCw size={22} />
            </div>

            <div>
              <span>Refund Pending</span>
              <strong>{stats.refundPendingTickets}</strong>
            </div>
          </div>
        </section>

        <section className="event-bookings-content">
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 24
            }}
          >
            {[
              ["bookings", "Bookings"],
              ["tickets", "Attendees & Tickets"],
              ["checkins", "Check-In History"]
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => {
                  setActiveTab(value);
                  setSearch("");
                }}
                style={{
                  border: "1px solid #e9d5db",
                  borderRadius: 12,
                  padding: "11px 17px",
                  cursor: "pointer",
                  fontWeight: 700,
                  background:
                    activeTab === value
                      ? "#751d38"
                      : "#ffffff",
                  color:
                    activeTab === value
                      ? "#ffffff"
                      : "#751d38"
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="event-bookings-toolbar">
            <div className="event-bookings-search">
              <Search size={18} />

              <input
                type="text"
                placeholder={
                  activeTab === "bookings"
                    ? "Search customer, booking reference or ticket category..."
                    : "Search attendee, email or ticket code..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {activeTab === "bookings" && (
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All bookings</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="confirmed">Confirmed</option>
                <option value="partially_cancelled">
                  Partially Cancelled
                </option>
                <option value="cancelled">Cancelled</option>
                <option value="partially_refunded">
                  Partially Refunded
                </option>
                <option value="refunded">Refunded</option>
              </select>
            )}

            {activeTab === "tickets" && (
              <select
                value={ticketFilter}
                onChange={(e) =>
                  setTicketFilter(e.target.value)
                }
              >
                <option value="all">All tickets</option>
                <option value="valid">Valid</option>
                <option value="used">Checked In</option>
                <option value="cancelled">Cancelled</option>
                <option value="refund_pending">
                  Refund Pending
                </option>
              </select>
            )}
          </div>

          {activeTab === "bookings" && (
            <>
              {filteredBookings.length === 0 ? (
                <div className="event-bookings-empty">
                  <UserRound size={42} />
                  <h3>No bookings found</h3>
                  <p>
                    Bookings for this event will appear here
                    when customers purchase tickets.
                  </p>
                </div>
              ) : (
                <div className="event-bookings-table-wrapper">
                  <table className="event-bookings-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Reference</th>
                        <th>Ticket Categories</th>
                        <th>Qty</th>
                        <th>Amount</th>
                        <th>Booking</th>
                        <th>Payment</th>
                        <th>Date</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredBookings.map((booking) => (
                        <tr key={booking._id}>
                          <td>
                            <div className="event-bookings-customer">
                              <div className="event-bookings-avatar">
                                {booking.user?.firstname?.charAt(0) ||
                                  "U"}
                              </div>

                              <div>
                                <strong>
                                  {getCustomerName(booking.user)}
                                </strong>
                                <span>
                                  {booking.user?.email ||
                                    "No email"}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="event-bookings-reference">
                              {booking.bookingReference}
                            </span>
                          </td>

                          <td>{getTicketCategories(booking)}</td>
                          <td>{booking.quantity}</td>
                          <td>
                            {formatMoney(booking.totalAmount)}
                          </td>

                          <td>
                            <span
                              className={`event-bookings-badge ${booking.bookingStatus}`}
                            >
                              {booking.bookingStatus}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`event-bookings-badge ${booking.paymentStatus}`}
                            >
                              {booking.paymentStatus}
                            </span>
                          </td>

                          <td>{formatDate(booking.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === "tickets" && (
            <>
              {filteredTickets.length === 0 ? (
                <div className="event-bookings-empty">
                  <Ticket size={42} />
                  <h3>No tickets found</h3>
                  <p>
                    Issued tickets for this event will
                    appear here.
                  </p>
                </div>
              ) : (
                <div className="event-bookings-table-wrapper">
                  <table className="event-bookings-table">
                    <thead>
                      <tr>
                        <th>Attendee</th>
                        <th>Ticket Code</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Checked In At</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredTickets.map((ticket) => (
                        <tr key={ticket._id}>
                          <td>
                            <div className="event-bookings-customer">
                              <div className="event-bookings-avatar">
                                {ticket.user?.firstname?.charAt(0) ||
                                  "U"}
                              </div>

                              <div>
                                <strong>
                                  {getCustomerName(ticket.user)}
                                </strong>

                                <span>
                                  {ticket.user?.email ||
                                    "No email"}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="event-bookings-reference">
                              {ticket.ticketCode}
                            </span>
                          </td>

                          <td>
                            {ticket.ticketType || "Regular"}
                          </td>

                          <td>
                            {formatMoney(ticket.ticketPrice)}
                          </td>

                          <td>
                            <span
                              className={`event-bookings-badge ${ticket.status}`}
                            >
                              {ticket.status === "used"
                                ? "Checked In"
                                : ticket.status === "refund_pending"
                                ? "Refund Pending"
                                : ticket.status}
                            </span>
                          </td>

                          <td>
                            {formatDateTime(ticket.checkedInAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === "checkins" && (
            <>
              {filteredCheckIns.length === 0 ? (
                <div className="event-bookings-empty">
                  <ShieldCheck size={42} />
                  <h3>No check-ins found</h3>
                  <p>
                    Guests who have checked in will appear
                    here.
                  </p>
                </div>
              ) : (
                <div className="event-bookings-table-wrapper">
                  <table className="event-bookings-table">
                    <thead>
                      <tr>
                        <th>Guest</th>
                        <th>Ticket Code</th>
                        <th>Ticket Type</th>
                        <th>Checked In By</th>
                        <th>Check-In Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredCheckIns.map((ticket) => (
                        <tr key={ticket._id}>
                          <td>
                            <div className="event-bookings-customer">
                              <div className="event-bookings-avatar">
                                {ticket.user?.firstname?.charAt(0) ||
                                  "U"}
                              </div>

                              <div>
                                <strong>
                                  {getCustomerName(ticket.user)}
                                </strong>

                                <span>
                                  {ticket.user?.email ||
                                    "No email"}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="event-bookings-reference">
                              {ticket.ticketCode}
                            </span>
                          </td>

                          <td>
                            {ticket.ticketType || "Regular"}
                          </td>

                          <td>
                            {getCustomerName(ticket.checkedInBy)}
                          </td>

                          <td>
                            {formatDateTime(ticket.checkedInAt)}
                          </td>

                          <td>
                            <span className="event-bookings-badge confirmed">
                              Checked In
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default EventBookings;
