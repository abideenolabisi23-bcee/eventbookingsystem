import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import vibelyLogo from "../assets/vibely-logo.png";

import "../styles/adminEvents.css";

const AdminEvents = () => {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventStatistics, setEventStatistics] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [feedback, setFeedback] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  const getToken = () => {
    return localStorage.getItem("accessToken");
  };

  const handleUnauthorized = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");
    navigate("/admin/login");
  };

  const fetchEvents = async () => {
    const accessToken = getToken();

    if (!accessToken) {
      handleUnauthorized();
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        "https://eventbookingsystem-sooty.vercel.app/api/v1/admin/events",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setEvents(
        Array.isArray(response.data?.data)
          ? response.data.data
          : []
      );
    } catch (error) {
      console.log("ADMIN EVENTS ERROR:", error);

      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        handleUnauthorized();
        return;
      }

      setError(
        error.response?.data?.message ||
        "Unable to load platform events."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const getEventStatus = (event) => {
    if (event.isAvailable === false) {
      return "disabled";
    }

    if (!event.date) {
      return "upcoming";
    }

    const eventDate = new Date(event.date);
    const now = new Date();

    if (eventDate < now) {
      return "completed";
    }

    return "upcoming";
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const text = `${event.title || ""} ${event.location || ""
        } ${event.createdBy?.businessName || ""} ${event.createdBy?.firstname || ""
        } ${event.createdBy?.lastname || ""}`.toLowerCase();

      const matchesSearch = text.includes(
        search.trim().toLowerCase()
      );

      const eventStatus = getEventStatus(event);

      const matchesStatus =
        statusFilter === "all" ||
        eventStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [events, search, statusFilter]);

  const upcomingEvents = useMemo(() => {
    return events.filter(
      (event) => getEventStatus(event) === "upcoming"
    ).length;
  }, [events]);

  const disabledEvents = useMemo(() => {
    return events.filter(
      (event) => event.isAvailable === false
    ).length;
  }, [events]);

  const organizerCount = useMemo(() => {
    const organizerIds = new Set();

    events.forEach((event) => {
      if (event.createdBy?._id) {
        organizerIds.add(event.createdBy._id);
      }
    });

    return organizerIds.size;
  }, [events]);

  const totalBookedTickets = useMemo(() => {
    return events.reduce((total, event) => {
      const totalTickets = Number(
        event.totalTickets || 0
      );

      const availableTickets = Number(
        event.availableTickets || 0
      );

      const booked = Math.max(
        totalTickets - availableTickets,
        0
      );

      return total + booked;
    }, 0);
  }, [events]);

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    return new Intl.DateTimeFormat("en-NG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatCurrency = (amount) => {
    return `₦${Number(amount || 0).toLocaleString(
      "en-NG"
    )}`;
  };

  const getOrganizerName = (event) => {
    if (event.createdBy?.businessName) {
      return event.createdBy.businessName;
    }

    const fullName = `${event.createdBy?.firstname || ""
      } ${event.createdBy?.lastname || ""
      }`.trim();

    return fullName || "—";
  };

  const openEventDetails = async (eventId) => {
    const accessToken = getToken();

    if (!accessToken) {
      handleUnauthorized();
      return;
    }

    try {
      setDetailsLoading(true);

      const response = await axios.get(
        `https://eventbookingsystem-sooty.vercel.app/api/v1/admin/events/${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setSelectedEvent(
        response.data?.data?.event || null
      );

      setEventStatistics(
        response.data?.data?.statistics || null
      );
    } catch (error) {
      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        handleUnauthorized();
        return;
      }

      setFeedback({
        show: true,
        type: "error",
        title: "Unable to open event",
        message:
          error.response?.data?.message ||
          "The event details could not be loaded.",
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const runEventAction = async () => {
    if (!confirmAction?.event) {
      return;
    }

    const accessToken = getToken();

    if (!accessToken) {
      handleUnauthorized();
      return;
    }

    const event = confirmAction.event;
    const action = confirmAction.action;

    try {
      setActionLoading(event._id);

      const response = await axios.patch(
        `https://eventbookingsystem-sooty.vercel.app/api/v1/admin/events/${event._id}/${action}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const newAvailability =
        action === "enable";

      setEvents((currentEvents) =>
        currentEvents.map((currentEvent) =>
          currentEvent._id === event._id
            ? {
              ...currentEvent,
              isAvailable: newAvailability,
            }
            : currentEvent
        )
      );

      if (selectedEvent?._id === event._id) {
        setSelectedEvent((currentEvent) => ({
          ...currentEvent,
          isAvailable: newAvailability,
        }));
      }

      setConfirmAction(null);

      setFeedback({
        show: true,
        type: "success",
        title:
          action === "disable"
            ? "Event disabled"
            : "Event restored",
        message:
          response.data?.message ||
          (action === "disable"
            ? "The event has been disabled successfully."
            : "The event has been enabled successfully."),
      });
    } catch (error) {
      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        handleUnauthorized();
        return;
      }

      setConfirmAction(null);

      setFeedback({
        show: true,
        type: "error",
        title: "Action unsuccessful",
        message:
          error.response?.data?.message ||
          "The event status could not be changed.",
      });
    } finally {
      setActionLoading("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");
    navigate("/admin/login");
  };

  return (
    <div className="admin-events-page">
      <aside className="admin-events-sidebar">
        <div className="admin-events-brand">
          <div className="admin-users-logo">
            <img src={vibelyLogo} alt="Vibely Logo" />
          </div>

          <section>
            <strong>VIBELY</strong>
            <span>ADMINISTRATION</span>
          </section>
        </div>

        <nav>
          <p>OVERVIEW</p>

          <Link to="/admin/dashboard">
            <i className="bi bi-grid-1x2"></i>
            Dashboard
          </Link>

          <p>MANAGEMENT</p>

          <Link to="/admin/users">
            <i className="bi bi-people"></i>
            Users
          </Link>

          <Link to="/admin/providers">
            <i className="bi bi-person-badge"></i>
            Providers
          </Link>

          <Link
            className="active"
            to="/admin/events"
          >
            <i className="bi bi-calendar-event"></i>
            Events
          </Link>

          <Link to="/admin/apartments">
            <i className="bi bi-buildings"></i>
            Apartments
          </Link>

          <Link to="/admin/food">
            <i className="bi bi-basket"></i>
            Food & Orders
          </Link>

          <p>BUSINESS</p>

          <Link to="/admin/bookings">
            <i className="bi bi-ticket-perforated"></i>
            Bookings
          </Link>

          <Link to="/admin/payments">
            <i className="bi bi-credit-card"></i>
            Payments
          </Link>

          <p>ACCOUNT</p>

          <Link to="/admin/notifications">
            <i className="bi bi-bell"></i>
            Notifications
          </Link>

          <Link to="/admin/settings">
            <i className="bi bi-gear"></i>
            Settings
          </Link>
        </nav>

        <div className="admin-events-sidebar-bottom">
          <div className="admin-events-mini-profile">
            <div>A</div>

            <section>
              <strong>Vibely Admin</strong>
              <span>Administrator</span>
            </section>
          </div>

          <button
            type="button"
            onClick={handleLogout}
          >
            <i className="bi bi-box-arrow-right"></i>
            Logout
          </button>
        </div>
      </aside>

      <main className="admin-events-main">
        <header className="admin-events-header">
          <div>
            <span>EVENT MANAGEMENT</span>
            <h1>Events</h1>
          </div>

          <div className="admin-events-header-user">
            <Link to="/admin/notifications">
              <i className="bi bi-bell"></i>
            </Link>

            <div>
              <span>A</span>

              <section>
                <strong>Administrator</strong>
                <small>Super Admin</small>
              </section>
            </div>
          </div>
        </header>

        <div className="admin-events-content">
          <section className="admin-events-hero">
            <div>
              <span>PLATFORM EVENTS</span>

              <h2>
                Oversee every experience on Vibely.
              </h2>

              <p>
                Review event listings from all
                organizers, monitor ticket activity and
                control event availability across the
                platform.
              </p>
            </div>

            <div className="admin-events-hero-art">
              <i className="bi bi-calendar2-event"></i>
              <span>EVENT CONTROL</span>
              <strong>{events.length} Events</strong>
            </div>
          </section>

          <section className="admin-events-stats">
            <article>
              <i className="bi bi-calendar-event"></i>

              <div>
                <span>TOTAL EVENTS</span>
                <strong>{events.length}</strong>
              </div>
            </article>

            <article>
              <i className="bi bi-calendar-check"></i>

              <div>
                <span>UPCOMING</span>
                <strong>{upcomingEvents}</strong>
              </div>
            </article>

            <article>
              <i className="bi bi-ticket-perforated"></i>

              <div>
                <span>TICKETS BOOKED</span>
                <strong>{totalBookedTickets}</strong>
              </div>
            </article>

            <article>
              <i className="bi bi-person-badge"></i>

              <div>
                <span>ORGANIZERS</span>
                <strong>{organizerCount}</strong>
              </div>
            </article>
          </section>

          <section className="admin-events-panel">
            <div className="admin-events-panel-heading">
              <div>
                <span>EVENT DIRECTORY</span>
                <h3>All event listings</h3>
              </div>

              <div className="admin-events-heading-actions">
                {disabledEvents > 0 && (
                  <span>
                    {disabledEvents} Disabled
                  </span>
                )}

                <button
                  type="button"
                  onClick={fetchEvents}
                  disabled={loading}
                >
                  <i
                    className={`bi ${loading
                      ? "bi-arrow-repeat"
                      : "bi-arrow-clockwise"
                      }`}
                  ></i>

                  {loading
                    ? "Loading..."
                    : "Refresh"}
                </button>
              </div>
            </div>

            <div className="admin-events-toolbar">
              <div className="admin-events-search">
                <i className="bi bi-search"></i>

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search event, organizer or location..."
                />
              </div>

              <div className="admin-events-filters">
                {[
                  "all",
                  "upcoming",
                  "completed",
                  "disabled",
                ].map((status) => (
                  <button
                    type="button"
                    key={status}
                    className={
                      statusFilter === status
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setStatusFilter(status)
                    }
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="admin-events-empty">
                <div>
                  <i className="bi bi-arrow-repeat"></i>
                </div>

                <span>LOADING</span>
                <h3>Fetching platform events</h3>

                <p>
                  Please wait while Vibely loads events
                  created by organizers.
                </p>
              </div>
            ) : error ? (
              <div className="admin-events-empty">
                <div>
                  <i className="bi bi-exclamation-circle"></i>
                </div>

                <span>UNAVAILABLE</span>
                <h3>Unable to load events</h3>
                <p>{error}</p>

                <button
                  type="button"
                  onClick={fetchEvents}
                >
                  Try Again
                </button>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="admin-events-empty">
                <div>
                  <i className="bi bi-calendar2-event"></i>
                </div>

                <span>EVENT DIRECTORY</span>

                <h3>
                  {events.length === 0
                    ? "No events on Vibely yet"
                    : "No matching events"}
                </h3>

                <p>
                  {events.length === 0
                    ? "Organizer events will appear here once they are created."
                    : "No event matches your current search or status filter."}
                </p>

                <div className="admin-events-preview">
                  <section>
                    <i className="bi bi-eye"></i>
                    <strong>Review</strong>
                    <small>Inspect listings</small>
                  </section>

                  <section>
                    <i className="bi bi-ticket"></i>
                    <strong>Tickets</strong>
                    <small>Monitor activity</small>
                  </section>

                  <section>
                    <i className="bi bi-shield-check"></i>
                    <strong>Control</strong>
                    <small>Manage access</small>
                  </section>
                </div>
              </div>
            ) : (
              <div className="admin-events-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Organizer</th>
                      <th>Date</th>
                      <th>Location</th>
                      <th>Tickets</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredEvents.map((event) => {
                      const status =
                        getEventStatus(event);

                      return (
                        <tr key={event._id}>
                          <td>
                            <div className="admin-event-name">
                              <div>
                                {event.image ? (
                                  <img
                                    src={event.image}
                                    alt={event.title}
                                  />
                                ) : (
                                  <i className="bi bi-calendar-event"></i>
                                )}
                              </div>

                              <section>
                                <strong>
                                  {event.title}
                                </strong>

                                <span>
                                  {formatCurrency(
                                    event.price
                                  )}
                                </span>
                              </section>
                            </div>
                          </td>

                          <td>
                            <div className="admin-event-organizer">
                              <strong>
                                {getOrganizerName(
                                  event
                                )}
                              </strong>

                              <span>
                                {event.createdBy
                                  ?.email || "—"}
                              </span>
                            </div>
                          </td>

                          <td>
                            {formatDate(event.date)}
                          </td>

                          <td>
                            {event.location || "—"}
                          </td>

                          <td>
                            <div className="admin-event-ticket-count">
                              <strong>
                                {event.availableTickets ??
                                  "—"}
                              </strong>

                              <span>
                                of{" "}
                                {event.totalTickets ??
                                  "—"}{" "}
                                left
                              </span>
                            </div>
                          </td>

                          <td>
                            <span
                              className={`admin-event-status ${status}`}
                            >
                              {status}
                            </span>
                          </td>

                          <td>
                            <div className="admin-event-actions">
                              <button
                                type="button"
                                className="view"
                                disabled={
                                  detailsLoading
                                }
                                onClick={() =>
                                  openEventDetails(
                                    event._id
                                  )
                                }
                              >
                                View
                              </button>

                              {event.isAvailable ===
                                false ? (
                                <button
                                  type="button"
                                  className="enable"
                                  title="Enable event"
                                  disabled={
                                    actionLoading ===
                                    event._id
                                  }
                                  onClick={() =>
                                    setConfirmAction({
                                      event,
                                      action:
                                        "enable",
                                    })
                                  }
                                >
                                  <i className="bi bi-check-circle"></i>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="disable"
                                  title="Disable event"
                                  disabled={
                                    actionLoading ===
                                    event._id
                                  }
                                  onClick={() =>
                                    setConfirmAction({
                                      event,
                                      action:
                                        "disable",
                                    })
                                  }
                                >
                                  <i className="bi bi-slash-circle"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="admin-events-note">
            <i className="bi bi-shield-check"></i>

            <div>
              <strong>
                Platform event controls
              </strong>

              <p>
                Administrators can inspect events from
                every organizer and temporarily disable a
                listing when necessary. Disabled events
                can be restored without deleting the
                organizer's event.
              </p>
            </div>
          </section>
        </div>
      </main>

      {selectedEvent && (
        <div className="admin-events-modal-backdrop">
          <div className="admin-event-details-modal">
            <button
              type="button"
              className="admin-event-modal-close"
              onClick={() => {
                setSelectedEvent(null);
                setEventStatistics(null);
              }}
            >
              <i className="bi bi-x-lg"></i>
            </button>

            <div className="admin-event-modal-image">
              {selectedEvent.image ? (
                <img
                  src={selectedEvent.image}
                  alt={selectedEvent.title}
                />
              ) : (
                <i className="bi bi-calendar2-event"></i>
              )}

              <span
                className={`admin-event-modal-status ${getEventStatus(
                  selectedEvent
                )}`}
              >
                {getEventStatus(selectedEvent)}
              </span>
            </div>

            <span className="admin-event-modal-label">
              EVENT DETAILS
            </span>

            <h2>{selectedEvent.title}</h2>

            <p className="admin-event-modal-description">
              {selectedEvent.description ||
                "No event description provided."}
            </p>

            <div className="admin-event-detail-grid">
              <article>
                <span>ORGANIZER</span>
                <strong>
                  {getOrganizerName(selectedEvent)}
                </strong>
              </article>

              <article>
                <span>EVENT DATE</span>
                <strong>
                  {formatDate(selectedEvent.date)}
                </strong>
              </article>

              <article>
                <span>LOCATION</span>
                <strong>
                  {selectedEvent.location || "—"}
                </strong>
              </article>

              <article>
                <span>TICKET PRICE</span>
                <strong>
                  {formatCurrency(
                    selectedEvent.price
                  )}
                </strong>
              </article>

              <article>
                <span>TOTAL TICKETS</span>
                <strong>
                  {selectedEvent.totalTickets ?? "—"}
                </strong>
              </article>

              <article>
                <span>AVAILABLE</span>
                <strong>
                  {selectedEvent.availableTickets ??
                    "—"}
                </strong>
              </article>

              <article>
                <span>BOOKINGS</span>
                <strong>
                  {eventStatistics?.bookings ?? "—"}
                </strong>
              </article>

              <article>
                <span>TICKETS ISSUED</span>
                <strong>
                  {eventStatistics?.tickets ?? "—"}
                </strong>
              </article>
            </div>

            <div className="admin-event-modal-footer">
              <button
                type="button"
                className="close"
                onClick={() => {
                  setSelectedEvent(null);
                  setEventStatistics(null);
                }}
              >
                Close
              </button>

              {selectedEvent.isAvailable ===
                false ? (
                <button
                  type="button"
                  className="enable"
                  onClick={() =>
                    setConfirmAction({
                      event: selectedEvent,
                      action: "enable",
                    })
                  }
                >
                  <i className="bi bi-check-circle"></i>
                  Enable Event
                </button>
              ) : (
                <button
                  type="button"
                  className="disable"
                  onClick={() =>
                    setConfirmAction({
                      event: selectedEvent,
                      action: "disable",
                    })
                  }
                >
                  <i className="bi bi-slash-circle"></i>
                  Disable Event
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="admin-events-modal-backdrop admin-event-confirm-backdrop">
          <div className="admin-event-confirm-modal">
            <div
              className={`admin-event-confirm-icon ${confirmAction.action}`}
            >
              <i
                className={
                  confirmAction.action === "disable"
                    ? "bi bi-slash-circle"
                    : "bi bi-check-circle"
                }
              ></i>
            </div>

            <span>CONFIRM ACTION</span>

            <h3>
              {confirmAction.action === "disable"
                ? "Disable this event?"
                : "Restore this event?"}
            </h3>

            <p>
              {confirmAction.action === "disable"
                ? `"${confirmAction.event.title}" will become unavailable to customers until an administrator enables it again.`
                : `"${confirmAction.event.title}" will become available to customers again.`}
            </p>

            <div className="admin-event-confirm-actions">
              <button
                type="button"
                className="cancel"
                disabled={Boolean(actionLoading)}
                onClick={() =>
                  setConfirmAction(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  confirmAction.action === "disable"
                    ? "disable"
                    : "enable"
                }
                disabled={Boolean(actionLoading)}
                onClick={runEventAction}
              >
                {actionLoading
                  ? "Please wait..."
                  : confirmAction.action ===
                    "disable"
                    ? "Yes, Disable"
                    : "Yes, Enable"}
              </button>
            </div>
          </div>
        </div>
      )}

      {feedback.show && (
        <div className="admin-event-feedback-wrap">
          <div
            className={`admin-event-feedback ${feedback.type}`}
          >
            <div>
              <i
                className={
                  feedback.type === "success"
                    ? "bi bi-check-circle-fill"
                    : "bi bi-exclamation-circle-fill"
                }
              ></i>
            </div>

            <section>
              <strong>{feedback.title}</strong>
              <p>{feedback.message}</p>
            </section>

            <button
              type="button"
              onClick={() =>
                setFeedback((current) => ({
                  ...current,
                  show: false,
                }))
              }
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEvents;