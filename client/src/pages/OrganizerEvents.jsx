import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/organizerEvents.css";

const OrganizerEvents = () => {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [organizer, setOrganizer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    event: null,
  });

  const [deleting, setDeleting] = useState(false);

  const [feedback, setFeedback] = useState({
    open: false,
    type: "",
    title: "",
    message: "",
  });

  const accessToken = localStorage.getItem("accessToken");

  const showFeedback = (type, title, message) => {
    setFeedback({
      open: true,
      type,
      title,
      message,
    });
  };

  const closeFeedback = () => {
    setFeedback({
      open: false,
      type: "",
      title: "",
      message: "",
    });
  };

  const fetchPageData = async () => {
    if (!accessToken) {
      navigate("/organizer/login");
      return;
    }

    try {
      setLoading(true);

      const [profileResponse, eventsResponse] = await Promise.all([
        axios.get(
          "https://eventbookingsystem-sooty.vercel.app/api/v1/profile",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        ),

        axios.get(
          "https://eventbookingsystem-sooty.vercel.app/api/v1/organizer/events",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        ),
      ]);

      const profileData = profileResponse.data.data;
      const user = profileData?.user || profileData;

      if (user?.role !== "organizer") {
        navigate("/");
        return;
      }

      setOrganizer(user);
      setEvents(eventsResponse.data.data || []);
    } catch (error) {
      console.log(error);

      if (error.response?.status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("role");

        navigate("/organizer/login");
        return;
      }

      if (error.response?.status === 403) {
        navigate("/organizer/pending");
        return;
      }

      showFeedback(
        "error",
        "Unable to load events",
        error.response?.data?.message ||
          "Your events could not be loaded at this time."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, []);

  const getInitials = () => {
    const first = organizer?.firstname?.charAt(0) || "";
    const last = organizer?.lastname?.charAt(0) || "";

    return `${first}${last}`.toUpperCase() || "OR";
  };

  const formatDate = (date) => {
    if (!date) {
      return "Date unavailable";
    }

    return new Date(date).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatPrice = (price) => {
    const amount = Number(price || 0);

    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getEventStatus = (event) => {
    if (!event?.date) {
      return "Upcoming";
    }

    const eventDate = new Date(event.date);
    const today = new Date();

    if (eventDate < today) {
      return "Past";
    }

    if (Number(event.availableTickets) <= 0) {
      return "Sold Out";
    }

    return "Upcoming";
  };

  const getTicketPercentage = (event) => {
    const total = Number(event.totalTickets || 0);
    const available = Number(event.availableTickets || 0);

    if (total <= 0) {
      return 0;
    }

    const sold = total - available;

    return Math.min(
      100,
      Math.max(0, Math.round((sold / total) * 100))
    );
  };

  const openDeleteModal = (event) => {
    setDeleteModal({
      open: true,
      event,
    });
  };

  const closeDeleteModal = () => {
    if (deleting) {
      return;
    }

    setDeleteModal({
      open: false,
      event: null,
    });
  };

  const handleDeleteEvent = async () => {
    const eventId = deleteModal.event?._id;

    if (!eventId) {
      return;
    }

    try {
      setDeleting(true);

      const response = await axios.delete(
        `https://eventbookingsystem-sooty.vercel.app/api/v1/events/${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setEvents((previousEvents) =>
        previousEvents.filter((event) => event._id !== eventId)
      );

      setDeleteModal({
        open: false,
        event: null,
      });

      showFeedback(
        "success",
        "Event deleted",
        response.data.message ||
          "The event has been deleted successfully."
      );
    } catch (error) {
      console.log(error);

      if (error.response?.status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("role");

        navigate("/organizer/login");
        return;
      }

      showFeedback(
        "error",
        "Unable to delete event",
        error.response?.data?.message ||
          "The event could not be deleted at this time."
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");

    try {
      if (accessToken && refreshToken) {
        await axios.post(
          "https://eventbookingsystem-sooty.vercel.app/api/v1/logout",
          {
            refreshToken,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
      }
    } catch (error) {
      console.log(error);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("role");
      localStorage.removeItem("firstname");
      localStorage.removeItem("lastname");

      navigate("/organizer/login");
    }
  };

  const totalEvents = events.length;

  const upcomingEvents = events.filter(
    (event) => new Date(event.date) >= new Date()
  ).length;

  const pastEvents = events.filter(
    (event) => new Date(event.date) < new Date()
  ).length;

  const totalAvailableTickets = events.reduce(
    (total, event) =>
      total + Number(event.availableTickets || 0),
    0
  );

  if (loading) {
    return (
      <div className="organizer-events-loading">
        <div className="organizer-events-loader"></div>
        <h2>Vibely</h2>
        <p>Loading your events...</p>
      </div>
    );
  }

  return (
    <div className="organizer-events-page">
      <aside
        className={`organizer-events-sidebar ${
          sidebarOpen ? "sidebar-open" : ""
        }`}
      >
        <div className="organizer-events-brand">
          <div className="organizer-events-brand-main">
            <img src={vibelyLogo} alt="Vibely" />

            <div>
              <h2>Vibely</h2>
              <span>ORGANIZER</span>
            </div>
          </div>

          <button
            type="button"
            className="organizer-events-sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="organizer-events-user">
          {organizer?.profilePicture ? (
            <img
              src={organizer.profilePicture}
              alt={organizer.firstname}
            />
          ) : (
            <div className="organizer-events-user-placeholder">
              {getInitials()}
            </div>
          )}

          <div>
            <h4>
              {organizer?.firstname} {organizer?.lastname}
            </h4>

            <p>{organizer?.businessName || "Organizer"}</p>
          </div>
        </div>

        <nav>
          <div className="organizer-events-nav-section">
            <span>OVERVIEW</span>

            <NavLink
              to="/organizer/dashboard"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="bi bi-grid-1x2"></i>
              Dashboard
            </NavLink>
          </div>

          <div className="organizer-events-nav-section">
            <span>MANAGEMENT</span>

            <NavLink
              to="/organizer/events"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="bi bi-calendar-event"></i>
              Events
            </NavLink>

            <NavLink
              to="/organizer/apartments"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="bi bi-buildings"></i>
              Apartments
            </NavLink>
          </div>

          <div className="organizer-events-nav-section">
  <span>EVENT OPERATIONS</span>

  <NavLink
    to="/organizer/events"
    onClick={() => setSidebarOpen(false)}
  >
    <i className="bi bi-people"></i>
    Bookings & Attendees
  </NavLink>

  <NavLink
    to="/organizer/events"
    onClick={() => setSidebarOpen(false)}
  >
    <i className="bi bi-person-badge"></i>
    Event Staff
  </NavLink>

  <NavLink
    to="/organizer/check-in"
    onClick={() => setSidebarOpen(false)}
  >
    <i className="bi bi-qr-code-scan"></i>
    QR Check-in
  </NavLink>
</div>

<div className="organizer-events-nav-section">
  <span>ACCOUNT</span>

  <NavLink
    to="/organizer/profile"
    onClick={() => setSidebarOpen(false)}
  >
    <i className="bi bi-person-circle"></i>
    Profile & Settings
  </NavLink>

  <button
    type="button"
    onClick={handleLogout}
  >
    <i className="bi bi-box-arrow-right"></i>
    Logout
  </button>
</div>
        </nav>
      </aside>

      <div
        className={`organizer-events-overlay ${
          sidebarOpen ? "show" : ""
        }`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      <main className="organizer-events-main">
        <header className="organizer-events-topbar">
          <div className="organizer-events-topbar-left">
            <button
              type="button"
              className="organizer-events-menu"
              onClick={() => setSidebarOpen(true)}
            >
              <i className="bi bi-list"></i>
            </button>

            <div>
              <span>ORGANIZER PORTAL</span>
              <h3>Event Management</h3>
            </div>
          </div>

          <div className="organizer-events-topbar-user">
            {organizer?.profilePicture ? (
              <img
                src={organizer.profilePicture}
                alt={organizer.firstname}
              />
            ) : (
              <div>{getInitials()}</div>
            )}

            <section>
              <strong>
                {organizer?.firstname} {organizer?.lastname}
              </strong>

              <span>
                {organizer?.businessName || "Organizer"}
              </span>
            </section>
          </div>
        </header>

        <div className="organizer-events-content">
          <div className="organizer-events-heading">
            <div>
              <span>EVENT MANAGEMENT</span>

              <h1>My Events</h1>

              <p>
                Create, manage and monitor all your Vibely events
                from one place.
              </p>
            </div>

            <button
              type="button"
              className="organizer-events-create-button"
              onClick={() =>
                navigate("/organizer/events/create")
              }
            >
              <i className="bi bi-plus-lg"></i>
              Create Event
            </button>
          </div>

          <section className="organizer-events-stats">
            <div className="organizer-events-stat-card">
              <div className="organizer-events-stat-icon">
                <i className="bi bi-calendar-event"></i>
              </div>

              <div>
                <span>TOTAL EVENTS</span>
                <strong>{totalEvents}</strong>
                <p>All events created</p>
              </div>
            </div>

            <div className="organizer-events-stat-card">
              <div className="organizer-events-stat-icon">
                <i className="bi bi-calendar-check"></i>
              </div>

              <div>
                <span>UPCOMING</span>
                <strong>{upcomingEvents}</strong>
                <p>Events ahead</p>
              </div>
            </div>

            <div className="organizer-events-stat-card">
              <div className="organizer-events-stat-icon">
                <i className="bi bi-clock-history"></i>
              </div>

              <div>
                <span>PAST EVENTS</span>
                <strong>{pastEvents}</strong>
                <p>Completed events</p>
              </div>
            </div>

            <div className="organizer-events-stat-card">
              <div className="organizer-events-stat-icon">
                <i className="bi bi-ticket-perforated"></i>
              </div>

              <div>
                <span>AVAILABLE TICKETS</span>
                <strong>{totalAvailableTickets}</strong>
                <p>Across all events</p>
              </div>
            </div>
          </section>

          <div className="organizer-events-section-heading">
            <div>
              <span>YOUR COLLECTION</span>
              <h2>All Events</h2>
            </div>

            <div className="organizer-events-count">
              {events.length}{" "}
              {events.length === 1 ? "Event" : "Events"}
            </div>
          </div>

          {events.length === 0 ? (
            <section className="organizer-events-empty">
              <div className="organizer-events-empty-icon">
                <i className="bi bi-calendar2-plus"></i>
              </div>

              <span>NO EVENTS YET</span>

              <h2>Create your first event</h2>

              <p>
                You haven't created any events yet. Start building
                your Vibely event collection by creating your first
                event.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate("/organizer/events/create")
                }
              >
                <i className="bi bi-plus-lg"></i>
                Create Event
              </button>
            </section>
          ) : (
            <section className="organizer-events-grid">
              {events.map((event) => {
                const status = getEventStatus(event);
                const soldPercentage =
                  getTicketPercentage(event);

                return (
                  <article
                    className="organizer-event-card"
                    key={event._id}
                  >
                    <div className="organizer-event-image">
                      {event.image ? (
                        <img
                          src={event.image}
                          alt={event.title}
                        />
                      ) : (
                        <div className="organizer-event-placeholder">
                          <i className="bi bi-calendar-event"></i>
                          <span>VIBELY EVENT</span>
                        </div>
                      )}

                      <span
                        className={`organizer-event-status ${status
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {status}
                      </span>

                      <div className="organizer-event-price">
                        {formatPrice(event.price)}
                      </div>
                    </div>

                    <div className="organizer-event-body">
                      <div className="organizer-event-category">
                        EVENT
                      </div>

                      <h3>{event.title}</h3>

                      <div className="organizer-event-info">
                        <div>
                          <i className="bi bi-calendar3"></i>

                          <span>
                            {formatDate(event.date)}
                          </span>
                        </div>

                        <div>
                          <i className="bi bi-geo-alt"></i>

                          <span>
                            {event.location ||
                              "Location unavailable"}
                          </span>
                        </div>
                      </div>

                      <div className="organizer-event-ticket-section">
                        <div className="organizer-event-ticket-heading">
                          <span>Ticket availability</span>

                          <strong>
                            {event.availableTickets || 0} /{" "}
                            {event.totalTickets || 0} left
                          </strong>
                        </div>

                        <div className="organizer-event-progress">
                          <div
                            style={{
                              width: `${soldPercentage}%`,
                            }}
                          ></div>
                        </div>

                        <small>
                          {soldPercentage}% of tickets sold
                        </small>
                      </div>

                      <div className="organizer-event-actions">
                        <button
                          type="button"
                          className="organizer-event-view"
                          onClick={() =>
                            navigate(
                              `/organizer/events/${event._id}`
                            )
                          }
                        >
                          <i className="bi bi-eye"></i>
                          View
                        </button>

                        <button
                          type="button"
                          className="organizer-event-checkin"
                          onClick={() =>
                            navigate("/organizer/check-in")
                          }
                        >
                          <i className="bi bi-qr-code-scan"></i>
                          QR Check-in
                        </button>

                        <button
                          type="button"
                          className="organizer-event-edit"
                          onClick={() =>
                            navigate(
                              `/organizer/events/${event._id}/edit`
                            )
                          }
                        >
                          <i className="bi bi-pencil-square"></i>
                          Edit
                        </button>

                        <button
                          type="button"
                          className="organizer-event-delete"
                          onClick={() =>
                            openDeleteModal(event)
                          }
                        >
                          <i className="bi bi-trash3"></i>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </main>

      {deleteModal.open && (
        <div className="organizer-event-modal-backdrop">
          <div className="organizer-event-delete-modal">
            <div className="organizer-event-delete-icon">
              <i className="bi bi-trash3"></i>
            </div>

            <span>DELETE EVENT</span>

            <h2>Delete this event?</h2>

            <p>
              You're about to permanently delete{" "}
              <strong>
                {deleteModal.event?.title}
              </strong>
              . This action cannot be undone.
            </p>

            <div className="organizer-event-delete-actions">
              <button
                type="button"
                className="organizer-event-cancel-delete"
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="organizer-event-confirm-delete"
                onClick={handleDeleteEvent}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <span className="organizer-event-button-spinner"></span>
                    Deleting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-trash3"></i>
                    Delete Event
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {feedback.open && (
        <div className="organizer-event-modal-backdrop">
          <div className="organizer-event-feedback-modal">
            <button
              type="button"
              className="organizer-event-feedback-close"
              onClick={closeFeedback}
            >
              <i className="bi bi-x-lg"></i>
            </button>

            <div
              className={`organizer-event-feedback-icon ${feedback.type}`}
            >
              <i
                className={
                  feedback.type === "success"
                    ? "bi bi-check-lg"
                    : "bi bi-exclamation-lg"
                }
              ></i>
            </div>

            <span>
              {feedback.type === "success"
                ? "SUCCESS"
                : "SOMETHING WENT WRONG"}
            </span>

            <h2>{feedback.title}</h2>

            <p>{feedback.message}</p>

            <button
              type="button"
              className="organizer-event-feedback-action"
              onClick={closeFeedback}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerEvents;