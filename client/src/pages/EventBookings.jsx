import { useEffect, useState } from "react";
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
  ReceiptText
} from "lucide-react";
import logo from "../assets/vibely-logo.png";
import "../styles/eventBookings.css";

const EventBookings = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const accessToken = localStorage.getItem("accessToken");

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await axios.get(
          `http://192.168.0.3:5005/api/v1/organizer/events/${id}/bookings`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );

        setEvent(response.data.data.event);
        setBookings(response.data.data.bookings || []);
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("role");
          navigate("/organizer/login");
          return;
        }

        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [id, accessToken, navigate]);

  const formatMoney = (amount) => {
    return `₦${Number(amount || 0).toLocaleString()}`;
  };

  const formatDate = (date) => {
    if (!date) return "Not available";

    return new Date(date).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const paidBookings = bookings.filter(
    (booking) =>
      booking.paymentStatus === "paid" ||
      booking.paymentStatus === "partially_refunded"
  );

  const totalRevenue = paidBookings.reduce(
    (total, booking) => total + Number(booking.totalAmount || 0),
    0
  );

  const totalBookedTickets = bookings.reduce(
    (total, booking) => total + Number(booking.quantity || 0),
    0
  );

  const filteredBookings = bookings.filter((booking) => {
    const customer = `${booking.user?.firstname || ""} ${booking.user?.lastname || ""
      } ${booking.user?.email || ""} ${booking.bookingReference || ""
      }`.toLowerCase();

    const matchesSearch = customer.includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      booking.paymentStatus === filter ||
      booking.bookingStatus === filter;

    return matchesSearch && matchesFilter;
  });

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
          onClick={() => navigate(`/organizer/events/${id}`)}
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
              View customers, ticket purchases and payment information for
              this event.
            </p>
          </div>

          <button
            className="event-bookings-staff-btn"
            onClick={() =>
              navigate(`/organizer/events/${id}/staff`)
            }
          >
            Manage Staff
          </button>
        </section>

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
              <span>Paid Revenue</span>
              <strong>{formatMoney(totalRevenue)}</strong>
            </div>
          </div>
        </section>

        <section className="event-bookings-content">
          <div className="event-bookings-toolbar">
            <div className="event-bookings-search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search customer or booking reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

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
          </div>

          {filteredBookings.length === 0 ? (
            <div className="event-bookings-empty">
              <UserRound size={42} />
              <h3>No bookings found</h3>
              <p>
                Bookings for this event will appear here when customers
                purchase tickets.
              </p>
            </div>
          ) : (
            <div className="event-bookings-table-wrapper">
              <table className="event-bookings-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Reference</th>
                    <th>Ticket</th>
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
                            {booking.user?.firstname?.charAt(0) || "U"}
                          </div>

                          <div>
                            <strong>
                              {booking.user?.firstname || "Customer"}{" "}
                              {booking.user?.lastname || ""}
                            </strong>
                            <span>
                              {booking.user?.email || "No email"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="event-bookings-reference">
                          {booking.bookingReference}
                        </span>
                      </td>

                      <td>{booking.ticketType || "Regular"}</td>

                      <td>{booking.quantity}</td>

                      <td>{formatMoney(booking.totalAmount)}</td>

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
        </section>
      </main>
    </div>
  );
};

export default EventBookings;