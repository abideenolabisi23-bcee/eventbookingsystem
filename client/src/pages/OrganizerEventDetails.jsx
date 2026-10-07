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
  Pencil,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";
import "../styles/organizerEventDetails.css";

const OrganizerEventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const token = localStorage.getItem("accessToken");

        if (!token) {
          navigate("/organizer/login");
          return;
        }

        const response = await axios.get(
          `http://192.168.0.3:5005/api/v1/events/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        setEvent(response.data.data);
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("role");
          navigate("/organizer/login");
          return;
        }

        setError(
          error.response?.data?.message ||
          "Unable to load event details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, navigate]);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return "Not available";

    return new Date(date).toLocaleDateString("en-NG", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  const formatTime = (date) => {
    if (!date) return "Not available";

    return new Date(date).toLocaleTimeString("en-NG", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="organizer-event-details-state">
        <div className="event-details-loader"></div>
        <p>Loading your event...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="organizer-event-details-state">
        <h2>Unable to load event</h2>
        <p>{error}</p>

        <button
          onClick={() => navigate("/organizer/events")}
        >
          Back to My Events
        </button>
      </div>
    );
  }

  const soldTickets =
    Number(event.totalTickets || 0) -
    Number(event.availableTickets || 0);

  const soldPercentage =
    event.totalTickets > 0
      ? Math.round(
        (soldTickets / event.totalTickets) * 100
      )
      : 0;

  return (
    <div className="organizer-event-details-page">
      <div className="event-details-topbar">
        <button
          className="event-back-button"
          onClick={() => navigate("/organizer/events")}
        >
          <ArrowLeft size={18} />
          Back to My Events
        </button>

        <button
          className="event-edit-button"
          onClick={() =>
            navigate(`/organizer/events/${event._id}/edit`)
          }
        >
          <Pencil size={17} />
          Edit Event
        </button>
      </div>

      <section className="event-details-hero">
        <div className="event-details-image">
          {event.image ? (
            <img
              src={event.image}
              alt={event.title}
            />
          ) : (
            <div className="event-no-image">
              <CalendarDays size={50} />
              <span>Vibely Event</span>
            </div>
          )}

          <div
            className={`event-availability-badge ${event.isAvailable === false
                ? "event-unavailable"
                : ""
              }`}
          >
            {event.isAvailable === false ? (
              <>
                <XCircle size={15} />
                Unavailable
              </>
            ) : (
              <>
                <CheckCircle2 size={15} />
                Available
              </>
            )}
          </div>
        </div>

        <div className="event-details-heading">
          <span className="event-details-label">
            Event Management
          </span>

          <h1>{event.title}</h1>

          <p className="event-details-description">
            {event.description}
          </p>

          <div className="event-details-meta">
            <div>
              <CalendarDays size={19} />
              <span>{formatDate(event.date)}</span>
            </div>

            <div>
              <Clock size={19} />
              <span>{formatTime(event.date)}</span>
            </div>

            <div>
              <MapPin size={19} />
              <span>{event.location}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="event-details-stat-grid">
        <div className="event-detail-stat-card">
          <div className="event-stat-icon">
            <Wallet size={21} />
          </div>

          <div>
            <span>Ticket Price</span>
            <h3>{formatMoney(event.price)}</h3>
          </div>
        </div>

        <div className="event-detail-stat-card">
          <div className="event-stat-icon">
            <Ticket size={21} />
          </div>

          <div>
            <span>Total Tickets</span>
            <h3>{event.totalTickets || 0}</h3>
          </div>
        </div>

        <div className="event-detail-stat-card">
          <div className="event-stat-icon">
            <Users size={21} />
          </div>

          <div>
            <span>Tickets Sold</span>
            <h3>{soldTickets}</h3>
          </div>
        </div>

        <div className="event-detail-stat-card">
          <div className="event-stat-icon">
            <CheckCircle2 size={21} />
          </div>

          <div>
            <span>Available</span>
            <h3>{event.availableTickets || 0}</h3>
          </div>
        </div>
      </section>

      <section className="event-management-grid">
        <div className="event-information-card">
          <div className="event-section-heading">
            <div>
              <span>OVERVIEW</span>
              <h2>Event Information</h2>
            </div>
          </div>

          <div className="event-info-list">
            <div className="event-info-row">
              <span>Event title</span>
              <strong>{event.title}</strong>
            </div>

            <div className="event-info-row">
              <span>Location</span>
              <strong>{event.location}</strong>
            </div>

            <div className="event-info-row">
              <span>Date</span>
              <strong>{formatDate(event.date)}</strong>
            </div>

            <div className="event-info-row">
              <span>Time</span>
              <strong>{formatTime(event.date)}</strong>
            </div>

            <div className="event-info-row">
              <span>Price</span>
              <strong>{formatMoney(event.price)}</strong>
            </div>

            <div className="event-info-row">
              <span>Status</span>
              <strong>
                {event.isAvailable === false
                  ? "Unavailable"
                  : "Available"}
              </strong>
            </div>
          </div>
        </div>

        <div className="event-ticket-card">
          <div className="event-section-heading">
            <div>
              <span>TICKET SALES</span>
              <h2>Capacity</h2>
            </div>
          </div>

          <div className="event-ticket-number">
            <strong>{soldTickets}</strong>
            <span>of {event.totalTickets || 0} tickets sold</span>
          </div>

          <div className="event-progress-track">
            <div
              className="event-progress-fill"
              style={{
                width: `${Math.min(
                  soldPercentage,
                  100
                )}%`
              }}
            ></div>
          </div>

          <div className="event-progress-footer">
            <span>{soldPercentage}% sold</span>

            <span>
              {event.availableTickets || 0} remaining
            </span>
          </div>

          <div className="event-management-actions">
            <button
              onClick={() =>
                navigate(
                  `/organizer/events/${event._id}/bookings`
                )
              }
            >
              View Attendees
            </button>

            <button
              onClick={() =>
                navigate(
                  `/organizer/events/${event._id}/staff`
                )
              }
            >
              Manage Staff
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default OrganizerEventDetails;