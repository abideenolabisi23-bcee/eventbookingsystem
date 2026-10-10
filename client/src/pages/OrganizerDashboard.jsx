
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import "../styles/organizerDashboard.css";
import vibelyLogo from "../assets/vibely-logo.png";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(amount || 0));

const formatDate = (value) => {
  if (!value) return "No date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

const getCustomerName = (user) => {
  if (!user) return "Customer";

  return (
    [user.firstname, user.lastname].filter(Boolean).join(" ") ||
    user.email ||
    "Customer"
  );
};

const OrganizerDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [revenueVisible, setRevenueVisible] = useState(true);
  const [eventOperations, setEventOperations] = useState([]);
  const [operationsLoading, setOperationsLoading] = useState(false);
  const [operationsError, setOperationsError] = useState("");

  useEffect(() => {
    if (loading || !dashboard || !location.hash) return;

    const sectionId = location.hash.substring(1);
    const section = document.getElementById(sectionId);

    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }, [location.hash, loading, dashboard]);

  const logout = useCallback(() => {
    [
      "organizerAccessToken",
      "organizerRefreshToken",
      "organizerRole"
    ].forEach((key) => localStorage.removeItem(key));

    navigate("/organizer/login");
  }, [navigate]);


  const fetchDashboard = useCallback(
    async (showLoader = true) => {
      const token = localStorage.getItem("organizerAccessToken");

      if (!token) {
        navigate("/organizer/login");
        return;
      }

      if (showLoader) setLoading(true);
      else setRefreshing(true);

      setError("");

      try {
        const response = await fetch(`${API_URL}/organizer/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const result = await response.json();

        if (response.status === 401) {
          logout();
          return;
        }

        if (!response.ok) {
          throw new Error(result.message || "Unable to load dashboard");
        }

        setDashboard(result.data);
      } catch (requestError) {
        setError(requestError.message || "Unable to connect to the server");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate, logout]
  );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const recentEvents = useMemo(
    () => dashboard?.recentEvents || [],
    [dashboard]
  );

  useEffect(() => {
    if (!dashboard) return;

    const token = localStorage.getItem("organizerAccessToken");
    if (!token) return;

    let cancelled = false;

    const loadOperations = async () => {
      setOperationsLoading(true);
      setOperationsError("");

      try {
        const response = await fetch(`${API_URL}/organizer/events`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          logout();
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to fetch organizer events");
        }

        const payload = await response.json();

        const eventList = Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload.data?.events)
          ? payload.data.events
          : Array.isArray(payload.events)
          ? payload.events
          : [];

        const results = await Promise.allSettled(
          eventList.map(async (event) => {
            const statsResponse = await fetch(
              `${API_URL}/organizer/events/${event._id}/ticket-stats`,
              {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              }
            );

            if (!statsResponse.ok) {
              throw new Error(`Unable to load statistics for ${event.title}`);
            }

            const statsResult = await statsResponse.json();

            return {
              event,
              stats: statsResult.data || {}
            };
          })
        );

        if (cancelled) return;

        setEventOperations(
          results
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value)
        );

        if (results.some((result) => result.status === "rejected")) {
          setOperationsError(
            "Some ticket statistics are unavailable. Refresh to try again."
          );
        }
      } catch (requestError) {
        if (!cancelled) setOperationsError(requestError.message);
      } finally {
        if (!cancelled) setOperationsLoading(false);
      }
    };

    loadOperations();

    return () => {
      cancelled = true;
    };
  }, [dashboard, logout]);

  const organizer = dashboard?.organizer || {};
  const stats = dashboard?.stats || {};
  const revenue = dashboard?.revenue || {};
  const recentApartments = dashboard?.recentApartments || [];
  const recentEventBookings = dashboard?.recentEventBookings || [];
  const recentApartmentBookings = dashboard?.recentApartmentBookings || [];

  const initials =
    `${organizer.firstname?.charAt(0) || "V"}${organizer.lastname?.charAt(0) || "O"}`.toUpperCase();

  const totalRevenue =
    Number(revenue.eventNetRevenue || 0) +
    Number(revenue.apartmentRevenue || 0);

  const totalBookings =
    Number(stats.totalEventBookings || 0) +
    Number(stats.totalApartmentBookings || 0);

  const eventTotals = eventOperations.reduce(
    (total, item) => {
      total.issued += Number(item.stats.ticketsIssued || 0);
      total.valid += Number(item.stats.validTickets || 0);
      total.used += Number(item.stats.usedTickets || 0);
      total.cancelled += Number(item.stats.cancelledTickets || 0);
      total.refundPending += Number(item.stats.refundPendingTickets || 0);
      return total;
    },
    {
      issued: 0,
      valid: 0,
      used: 0,
      cancelled: 0,
      refundPending: 0
    }
  );

  const recentActivity = [
    ...recentEventBookings.map((booking) => ({
      id: booking._id,
      type: "event",
      title: booking.event?.title || "Event booking",
      reference: booking.bookingReference,
      customer: getCustomerName(booking.user),
      amount: booking.totalAmount,
      status: booking.bookingStatus,
      createdAt: booking.createdAt
    })),
    ...recentApartmentBookings.map((booking) => ({
      id: booking._id,
      type: "apartment",
      title: booking.apartment?.title || "Apartment booking",
      reference: booking.bookingReference,
      customer: getCustomerName(booking.user),
      amount: booking.totalAmount,
      status: booking.bookingStatus,
      createdAt: booking.createdAt
    }))
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    )
    .slice(0, 6);

  const closeSidebar = () => setSidebarOpen(false);
  const go = (path) => navigate(path);

  const scrollToSection = (id) => {
    closeSidebar();
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth"
    });
  };

  const navClass = ({ isActive }) =>
    `organizer-nav-link ${isActive ? "active" : ""}`;

  if (loading) {
    return (
      <div className="organizer-loading">
        <div className="organizer-loader"></div>
        <h3>Preparing your workspace</h3>
        <p>Loading your Vibely organizer dashboard...</p>
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className="organizer-error-page">
        <div className="organizer-error-card">
          <div className="organizer-error-icon">
            <i className="bi bi-exclamation-circle"></i>
          </div>
          <h2>We couldn't load your dashboard</h2>
          <p>{error}</p>
          <button onClick={() => fetchDashboard()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="organizer-dashboard">
      <div
        className={`organizer-sidebar-overlay ${sidebarOpen ? "show" : ""}`}
        onClick={closeSidebar}
      ></div>

      <aside
        className={`organizer-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}
      >
        <div className="organizer-brand">
          <div className="organizer-sidebar-brand">
            <img
              src={vibelyLogo}
              alt="Vibely"
              className="organizer-sidebar-logo"
            />
            <div className="organizer-sidebar-brand-text">
              <h2>Vibely</h2>
              <span>ORGANIZER</span>
            </div>
          </div>

          <button className="sidebar-close" onClick={closeSidebar}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="organizer-sidebar-profile">
          {organizer.profilePicture ? (
            <img src={organizer.profilePicture} alt="Organizer" />
          ) : (
            <div className="sidebar-profile-placeholder">
              {initials}
            </div>
          )}

          <div className="organizer-sidebar-profile-info">
            <h4>{organizer.businessName || "Vibely Organizer"}</h4>
            <p>
              {organizer.firstname} {organizer.lastname}
            </p>
          </div>
        </div>

        <nav className="organizer-nav">
          <div className="organizer-nav-section">
            <span className="organizer-nav-title">OVERVIEW</span>

            <NavLink
              to="/organizer/dashboard"
              className={navClass}
              onClick={closeSidebar}
            >
              <i className="bi bi-grid-1x2-fill"></i>
              <span>Dashboard</span>
            </NavLink>
          </div>

          <div className="organizer-nav-section">
            <span className="organizer-nav-title">YOUR SERVICES</span>

            <NavLink
              to="/organizer/events"
              className={navClass}
              onClick={closeSidebar}
            >
              <i className="bi bi-calendar-event"></i>
              <span>Events</span>
            </NavLink>

            <NavLink
              to="/organizer/apartments"
              className={navClass}
              onClick={closeSidebar}
            >
              <i className="bi bi-buildings"></i>
              <span>Apartments</span>
            </NavLink>
          </div>

          <div className="organizer-nav-section">
            <span className="organizer-nav-title">
              BOOKING OPERATIONS
            </span>

            <button
              type="button"
              className="organizer-nav-link"
              onClick={() => scrollToSection("organizer-recent-bookings")}
            >
              <i className="bi bi-people"></i>
              <span>Bookings & Attendees</span>
            </button>

            <button
              type="button"
              className="organizer-nav-link"
              onClick={() => scrollToSection("organizer-revenue")}
            >
              <i className="bi bi-wallet2"></i>
              <span>Bookings & Revenue</span>
            </button>

            <NavLink
              to="/organizer/check-in"
              className={navClass}
              onClick={closeSidebar}
            >
              <i className="bi bi-qr-code-scan"></i>
              <span>QR Check-In</span>
            </NavLink>
          </div>

          <div className="organizer-nav-section">
            <span className="organizer-nav-title">ACCOUNT</span>

            <NavLink
              to="/organizer/profile"
              className={navClass}
              onClick={closeSidebar}
            >
              <i className="bi bi-person-circle"></i>
              <span>Profile & Settings</span>
            </NavLink>

            <button
              className="organizer-nav-link organizer-logout"
              onClick={logout}
            >
              <i className="bi bi-box-arrow-left"></i>
              <span>Logout</span>
            </button>
          </div>
        </nav>

        <div className="organizer-sidebar-footer">
          <div className="sidebar-support-icon">
            <i className="bi bi-headset"></i>
          </div>
          <div>
            <span>Need assistance?</span>
            <p>Vibely Support</p>
          </div>
        </div>
      </aside>

      <main className="organizer-main">
        <header className="organizer-topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-button"
              onClick={() => setSidebarOpen(true)}
            >
              <i className="bi bi-list"></i>
            </button>

            <div>
              <span className="topbar-eyebrow">
                Organizer Workspace
              </span>
              <h3>
                {organizer.businessName ||
                  `${organizer.firstname || "Organizer"}'s Workspace`}
              </h3>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              className="topbar-icon-button"
              onClick={() => go("/organizer/events")}
              aria-label="Browse events"
            >
              <i className="bi bi-search"></i>
            </button>

            <button
              className="topbar-icon-button"
              onClick={() => fetchDashboard(false)}
              disabled={refreshing}
              aria-label="Refresh dashboard"
            >
              <i
                className={`bi bi-arrow-clockwise ${
                  refreshing ? "spin" : ""
                }`}
              ></i>
            </button>

            <div className="topbar-divider"></div>

            <button
              className="topbar-profile"
              onClick={() => go("/organizer/profile")}
            >
              {organizer.profilePicture ? (
                <img
                  src={organizer.profilePicture}
                  alt="Organizer"
                />
              ) : (
                <div className="topbar-profile-placeholder">
                  {initials}
                </div>
              )}

              <div>
                <strong>
                  {organizer.firstname} {organizer.lastname}
                </strong>
                <span>Organizer</span>
              </div>

              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
        </header>

        <div className="organizer-content">
          <section className="organizer-welcome">
            <div className="welcome-content">
              <span className="welcome-label">
                <i className="bi bi-stars"></i>
                YOUR VIBELY BUSINESS HUB
              </span>

              <h1>
                Welcome back, <span>{organizer.firstname}</span>
              </h1>

              <p>
                Manage your events, apartment stays, guest bookings
                and payments from one elegant workspace.
              </p>

              <div className="welcome-actions">
                <button
                  className="primary-welcome-button"
                  onClick={() => go("/organizer/events/create")}
                >
                  <i className="bi bi-plus-lg"></i>
                  Create Event
                </button>

                <button
                  className="secondary-welcome-button"
                  onClick={() => go("/organizer/apartments/create")}
                >
                  <i className="bi bi-house-add"></i>
                  Add Apartment
                </button>
              </div>
            </div>

            <div className="welcome-business-card">
              <div className="revenue-heading-row">
                <span>EVENT & APARTMENT REVENUE</span>

                <button
                  type="button"
                  className="revenue-visibility-button"
                  onClick={() =>
                    setRevenueVisible((current) => !current)
                  }
                  aria-label={
                    revenueVisible ? "Hide revenue" : "Show revenue"
                  }
                  aria-pressed={revenueVisible}
                >
                  <i
                    className={`bi ${
                      revenueVisible ? "bi-eye" : "bi-eye-slash"
                    }`}
                  ></i>
                </button>
              </div>

              <strong>
                {revenueVisible
                  ? formatCurrency(totalRevenue)
                  : "₦••••••"}
              </strong>

              <div className="welcome-business-meta">
                <div>
                  <i className="bi bi-calendar-event"></i>
                  <span>{stats.totalEvents || 0} events</span>
                </div>

                <div>
                  <i className="bi bi-buildings"></i>
                  <span>{stats.totalApartments || 0} stays</span>
                </div>
              </div>
            </div>

            <div className="welcome-orb welcome-orb-one"></div>
            <div className="welcome-orb welcome-orb-two"></div>
          </section>

          <section className="organizer-overview-grid">
            {[
              {
                icon: "bi-calendar2-heart",
                label: "Events",
                value: stats.totalEvents || 0,
                note: `${stats.upcomingEvents || 0} upcoming`
              },
              {
                icon: "bi-buildings",
                label: "Apartments",
                value: stats.totalApartments || 0,
                note: `${stats.availableApartments || 0} available`
              },
              {
                icon: "bi-receipt-cutoff",
                label: "Bookings",
                value: totalBookings,
                note: "Events and apartment stays"
              }
            ].map((item) => (
              <article className="overview-card" key={item.label}>
                <div className="overview-icon">
                  <i className={`bi ${item.icon}`}></i>
                </div>

                <div>
                  <span>{item.label}</span>
                  <h2>{item.value}</h2>
                  <p>{item.note}</p>
                </div>
              </article>
            ))}
          </section>

          <section className="service-management-section">
            <div className="dashboard-section-heading">
              <div>
                <span className="section-eyebrow">
                  SERVICE MANAGEMENT
                </span>
                <h2>Run every part of your business</h2>
                <p>
                  Manage your events and apartments from one place.
                </p>
              </div>
            </div>

            <div className="service-management-grid">
              <article className="service-card event-service-card">
                <div className="service-card-top">
                  <div className="service-icon">
                    <i className="bi bi-calendar-event"></i>
                  </div>
                  <span>{stats.availableEvents || 0} available</span>
                </div>

                <h3>Events</h3>
                <p>
                  Create experiences, manage tickets, view guest
                  bookings and prepare attendee check-in.
                </p>

                <div className="service-card-stats">
                  <div>
                    <strong>{stats.totalEvents || 0}</strong>
                    <span>Total</span>
                  </div>
                  <div>
                    <strong>{stats.upcomingEvents || 0}</strong>
                    <span>Upcoming</span>
                  </div>
                  <div>
                    <strong>{stats.totalEventBookings || 0}</strong>
                    <span>Bookings</span>
                  </div>
                </div>

                <div className="service-actions">
                  <button onClick={() => go("/organizer/events")}>
                    Manage Events
                  </button>
                  <button
                    className="service-square-button"
                    onClick={() => go("/organizer/events/create")}
                    aria-label="Create event"
                  >
                    <i className="bi bi-plus-lg"></i>
                  </button>
                </div>
              </article>

              <article className="service-card apartment-service-card">
                <div className="service-card-top">
                  <div className="service-icon">
                    <i className="bi bi-buildings"></i>
                  </div>
                  <span>
                    {stats.availableApartments || 0} available
                  </span>
                </div>

                <h3>Apartments</h3>
                <p>
                  Manage apartment listings, availability, galleries,
                  prices and guest reservations.
                </p>

                <div className="service-card-stats">
                  <div>
                    <strong>{stats.totalApartments || 0}</strong>
                    <span>Total</span>
                  </div>
                  <div>
                    <strong>{stats.availableApartments || 0}</strong>
                    <span>Available</span>
                  </div>
                  <div>
                    <strong>{stats.totalApartmentBookings || 0}</strong>
                    <span>Bookings</span>
                  </div>
                </div>

                <div className="service-actions">
                  <button
                    onClick={() => go("/organizer/apartments")}
                  >
                    Manage Stays
                  </button>
                  <button
                    className="service-square-button"
                    onClick={() =>
                      go("/organizer/apartments/create")
                    }
                    aria-label="Add apartment"
                  >
                    <i className="bi bi-plus-lg"></i>
                  </button>
                </div>
              </article>
            </div>
          </section>

          <section
            className="revenue-section"
            id="organizer-revenue"
          >
            <div className="dashboard-section-heading">
              <div>
                <span className="section-eyebrow">
                  FINANCIAL OVERVIEW
                </span>
                <h2>Bookings & Revenue</h2>
                <p>
                  Revenue reported for your events and apartment stays.
                </p>
              </div>
            </div>

            <div className="revenue-grid">
              <article className="revenue-card">
                <div className="revenue-card-icon">
                  <i className="bi bi-ticket-perforated"></i>
                </div>
                <span>Event Revenue</span>
                <h3>
                  {revenueVisible
                    ? formatCurrency(revenue.eventNetRevenue)
                    : "₦••••••"}
                </h3>
                <div className="revenue-detail-row">
                  <span>Gross revenue</span>
                  <strong>
                    {revenueVisible
                      ? formatCurrency(revenue.eventGrossRevenue)
                      : "••••"}
                  </strong>
                </div>
                <div className="revenue-detail-row">
                  <span>Event bookings</span>
                  <strong>{stats.totalEventBookings || 0}</strong>
                </div>
              </article>

              <article className="revenue-card">
                <div className="revenue-card-icon">
                  <i className="bi bi-buildings"></i>
                </div>
                <span>Apartment Revenue</span>
                <h3>
                  {revenueVisible
                    ? formatCurrency(revenue.apartmentRevenue)
                    : "₦••••••"}
                </h3>
                <div className="revenue-detail-row">
                  <span>Apartment bookings</span>
                  <strong>
                    {stats.totalApartmentBookings || 0}
                  </strong>
                </div>
                <div className="revenue-detail-row">
                  <span>Available apartments</span>
                  <strong>
                    {stats.availableApartments || 0}
                  </strong>
                </div>
              </article>
            </div>
          </section>

          <section className="dashboard-middle-grid">
            <div className="recent-listings-panel">
              <div className="panel-heading">
                <span className="section-eyebrow">
                  YOUR LISTINGS
                </span>
                <h2>Recent Events & Apartments</h2>
                <p>Quick access to your latest listings.</p>
              </div>

              <div className="listing-group">
                <div className="listing-group-heading">
                  <div>
                    <i className="bi bi-calendar-event"></i>
                    Events
                  </div>
                  <button onClick={() => go("/organizer/events")}>
                    View All
                  </button>
                </div>

                {recentEvents.length === 0 ? (
                  <p>No events yet.</p>
                ) : (
                  recentEvents.map((event) => (
                    <button
                      key={event._id}
                      className="compact-listing-item"
                      onClick={() =>
                        go(`/organizer/events/${event._id}`)
                      }
                    >
                      <div className="compact-listing-image">
                        <i className="bi bi-calendar-event"></i>
                      </div>
                      <div className="compact-listing-info">
                        <strong>{event.title}</strong>
                        <span>{formatDate(event.date)}</span>
                      </div>
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  ))
                )}
              </div>

              <div className="listing-group">
                <div className="listing-group-heading">
                  <div>
                    <i className="bi bi-buildings"></i>
                    Apartments
                  </div>
                  <button
                    onClick={() => go("/organizer/apartments")}
                  >
                    View All
                  </button>
                </div>

                {recentApartments.length === 0 ? (
                  <p>No apartments yet.</p>
                ) : (
                  recentApartments.map((apartment) => (
                    <button
                      key={apartment._id}
                      className="compact-listing-item"
                      onClick={() =>
                        go(`/organizer/apartments/${apartment._id}`)
                      }
                    >
                      <div className="compact-listing-image">
                        {apartment.images?.exterior ? (
                          <img
                            src={apartment.images.exterior}
                            alt={apartment.title}
                          />
                        ) : (
                          <i className="bi bi-buildings"></i>
                        )}
                      </div>
                      <div className="compact-listing-info">
                        <strong>{apartment.title}</strong>
                        <span>
                          {apartment.location || "Apartment listing"}
                        </span>
                      </div>
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="quick-actions-panel">
              <div className="panel-heading">
                <span className="section-eyebrow">
                  QUICK ACTIONS
                </span>
                <h2>Manage Faster</h2>
                <p>Go directly to important tools.</p>
              </div>

              <div className="organizer-quick-action-list">
                <button
                  onClick={() => go("/organizer/events/create")}
                >
                  <i className="bi bi-calendar-plus"></i>
                  <span>Create Event</span>
                  <i className="bi bi-arrow-right"></i>
                </button>

                <button
                  onClick={() =>
                    go("/organizer/apartments/create")
                  }
                >
                  <i className="bi bi-house-add"></i>
                  <span>Add Apartment</span>
                  <i className="bi bi-arrow-right"></i>
                </button>

                <button
                  onClick={() => go("/organizer/check-in")}
                >
                  <i className="bi bi-qr-code-scan"></i>
                  <span>QR Check-In</span>
                  <i className="bi bi-arrow-right"></i>
                </button>

                <button
                  onClick={() => go("/organizer/profile")}
                >
                  <i className="bi bi-person-circle"></i>
                  <span>Profile & Settings</span>
                  <i className="bi bi-arrow-right"></i>
                </button>
              </div>
            </div>
          </section>

          <section className="service-management-section">
            <div className="dashboard-section-heading">
              <div>
                <span className="section-eyebrow">
                  TICKET OPERATIONS
                </span>
                <h2>Event Ticket Management</h2>
                <p>
                  Track issued tickets, valid tickets, used tickets
                  and cancellations.
                </p>
              </div>
            </div>

            {operationsError && (
              <div className="organizer-operations-error">
                {operationsError}
              </div>
            )}

            <div className="organizer-overview-grid">
              {[
                {
                  label: "Issued Tickets",
                  value: eventTotals.issued,
                  icon: "bi-ticket-perforated"
                },
                {
                  label: "Valid Tickets",
                  value: eventTotals.valid,
                  icon: "bi-check-circle"
                },
                {
                  label: "Used Tickets",
                  value: eventTotals.used,
                  icon: "bi-qr-code-scan"
                }
              ].map((item) => (
                <article className="overview-card" key={item.label}>
                  <div className="overview-icon">
                    <i className={`bi ${item.icon}`}></i>
                  </div>
                  <div>
                    <span>{item.label}</span>
                    <h2>
                      {operationsLoading ? "..." : item.value}
                    </h2>
                    <p>Across your events</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="organizer-ticket-extra">
              <span>
                Cancelled: <strong>{eventTotals.cancelled}</strong>
              </span>
              <span>
                Refund Pending:{" "}
                <strong>{eventTotals.refundPending}</strong>
              </span>
            </div>
          </section>

          <section
            className="recent-activity-section"
            id="organizer-recent-bookings"
          >
            <div className="dashboard-section-heading">
              <div>
                <span className="section-eyebrow">
                  BOOKING ACTIVITY
                </span>
                <h2>Bookings & Attendees</h2>
                <p>
                  Recent customer bookings for your events and
                  apartments.
                </p>
              </div>
            </div>

            <div className="organizer-bookings-panel">
              {recentActivity.length === 0 ? (
                <div className="organizer-bookings-empty">
                  <i className="bi bi-calendar-check"></i>
                  <h3>No recent bookings</h3>
                  <p>
                    New event and apartment bookings will appear here.
                  </p>
                </div>
              ) : (
                <div className="organizer-bookings-table-wrap">
                  <table className="organizer-bookings-table">
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Booking</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentActivity.map((booking) => (
                        <tr
                          key={`${booking.type}-${booking.id}`}
                        >
                          <td>
                            <span className="booking-service-tag">
                              <i
                                className={`bi ${
                                  booking.type === "event"
                                    ? "bi-calendar-event"
                                    : "bi-buildings"
                                }`}
                              ></i>
                              {booking.type === "event"
                                ? "Event"
                                : "Apartment"}
                            </span>
                          </td>
                          <td>
                            <strong>{booking.title}</strong>
                            <small>
                              {booking.reference || "No reference"}
                            </small>
                          </td>
                          <td>{booking.customer}</td>
                          <td>
                            {formatCurrency(booking.amount)}
                          </td>
                          <td>
                            <span className="booking-status-tag">
                              {booking.status || "Pending"}
                            </span>
                          </td>
                          <td>{formatDate(booking.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default OrganizerDashboard;
