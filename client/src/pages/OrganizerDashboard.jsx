
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [eventOperations, setEventOperations] = useState([]);
  const [operationsLoading, setOperationsLoading] = useState(false);
  const [operationsError, setOperationsError] = useState("");

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

        const successful = results
          .filter((result) => result.status === "fulfilled")
          .map((result) => result.value);

        setEventOperations(successful);

        if (results.some((result) => result.status === "rejected")) {
          setOperationsError(
            "Some event ticket statistics are unavailable. Refresh to try again."
          );
        }
      } catch (requestError) {
        if (!cancelled) {
          setOperationsError(requestError.message);
        }
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
  const recentFoodItems = dashboard?.recentFoodItems || [];
  const recentEventBookings = dashboard?.recentEventBookings || [];
  const recentApartmentBookings = dashboard?.recentApartmentBookings || [];
  const recentFoodOrders = dashboard?.recentFoodOrders || [];

  const initials =
    `${organizer.firstname?.charAt(0) || "V"}${organizer.lastname?.charAt(0) || "O"}`.toUpperCase();

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
    })),
    ...recentFoodOrders.map((order) => ({
      id: order._id,
      type: "food",
      title:
        order.items?.length > 0
          ? `${order.items[0].name}${order.items.length > 1 ? ` +${order.items.length - 1} more` : ""}`
          : "Food order",
      reference: order.orderReference,
      customer: getCustomerName(order.user),
      amount: order.totalAmount,
      status: order.orderStatus,
      createdAt: order.createdAt
    }))
  ]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    )
    .slice(0, 6);

  const closeSidebar = () => setSidebarOpen(false);

  const goToFood = () => {
    closeSidebar();
    document.getElementById("food-management")?.scrollIntoView({
      behavior: "smooth"
    });
  };

  const navClass = ({ isActive }) =>
    `organizer-nav-link ${isActive ? "active" : ""}`;

  const go = (path) => navigate(path);

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
            <div className="sidebar-profile-placeholder">{initials}</div>
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

            <button className="organizer-nav-link" onClick={goToFood}>
              <i className="bi bi-cup-hot"></i>
              <span>Food</span>
            </button>
          </div>

          <div className="organizer-nav-section">
            <span className="organizer-nav-title">EVENT OPERATIONS</span>

            <NavLink
              to="/organizer/events"
              className={navClass}
              onClick={closeSidebar}
            >
              <i className="bi bi-people"></i>
              <span>Bookings & Attendees</span>
            </NavLink>

            <NavLink
              to="/organizer/events"
              className={navClass}
              onClick={closeSidebar}
            >
              <i className="bi bi-person-badge"></i>
              <span>Event Staff</span>
            </NavLink>

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
              <span className="topbar-eyebrow">Organizer Workspace</span>
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
              <i className={`bi bi-arrow-clockwise ${refreshing ? "spin" : ""}`}></i>
            </button>

            <div className="topbar-divider"></div>

            <button
              className="topbar-profile"
              onClick={() => go("/organizer/profile")}
            >
              {organizer.profilePicture ? (
                <img src={organizer.profilePicture} alt="Organizer" />
              ) : (
                <div className="topbar-profile-placeholder">{initials}</div>
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
                Events, beautiful stays and food experiences all in one
                workspace. Manage your listings, monitor orders and bookings,
                and keep an eye on your revenue.
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
              <span>REPORTED TOTAL REVENUE</span>
              <strong>{formatCurrency(revenue.totalRevenue)}</strong>

              <div className="welcome-business-meta">
                <div>
                  <i className="bi bi-calendar-event"></i>
                  <span>{stats.totalEvents || 0} events</span>
                </div>
                <div>
                  <i className="bi bi-buildings"></i>
                  <span>{stats.totalApartments || 0} stays</span>
                </div>
                <div>
                  <i className="bi bi-cup-hot"></i>
                  <span>{stats.totalFoodItems || 0} food items</span>
                </div>
              </div>
            </div>

            <div className="welcome-orb welcome-orb-one"></div>
            <div className="welcome-orb welcome-orb-two"></div>
          </section>

          <section className="organizer-overview-grid">
            {[
              {
                icon: "bi-wallet2",
                label: "Total Revenue",
                value: formatCurrency(revenue.totalRevenue),
                note: "Across your Vibely services",
                className: "revenue-overview"
              },
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
                icon: "bi-cup-hot",
                label: "Food Items",
                value: stats.totalFoodItems || 0,
                note: `${stats.availableFoodItems || 0} available`
              },
              {
                icon: "bi-receipt-cutoff",
                label: "Bookings & Orders",
                value: stats.totalBookingsAndOrders || 0,
                note: `${stats.pendingBookingsAndOrders || 0} pending`
              }
            ].map((item) => (
              <article
                className={`overview-card ${item.className || ""}`}
                key={item.label}
              >
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
                <span className="section-eyebrow">SERVICE MANAGEMENT</span>
                <h2>Run every part of your business</h2>
                <p>Jump directly into the Vibely service you want to manage.</p>
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
                  Create experiences, manage tickets, view bookings,
                  assign staff and prepare guest check-in.
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
                  <span>{stats.availableApartments || 0} available</span>
                </div>

                <h3>Apartments</h3>
                <p>
                  Manage your stays, availability, apartment galleries,
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
                  <button onClick={() => go("/organizer/apartments")}>
                    Manage Stays
                  </button>
                  <button
                    className="service-square-button"
                    onClick={() => go("/organizer/apartments/create")}
                  >
                    <i className="bi bi-plus-lg"></i>
                  </button>
                </div>
              </article>

              <article
                className="service-card food-service-card"
                id="food-management"
              >
                <div className="service-card-top">
                  <div className="service-icon">
                    <i className="bi bi-cup-hot"></i>
                  </div>
                  <span>{stats.availableFoodItems || 0} available</span>
                </div>

                <h3>Food & Orders</h3>
                <p>
                  Track your menu inventory and stay on top of new,
                  active and completed customer food orders.
                </p>

                <div className="service-card-stats">
                  <div>
                    <strong>{stats.totalFoodItems || 0}</strong>
                    <span>Items</span>
                  </div>
                  <div>
                    <strong>{stats.totalFoodOrders || 0}</strong>
                    <span>Orders</span>
                  </div>
                  <div>
                    <strong>{stats.activeFoodOrders || 0}</strong>
                    <span>Active</span>
                  </div>
                </div>

                <div className="food-coming-bar">
                  <i className="bi bi-stars"></i>
                  <div>
                    <strong>Food management</strong>
                    <span>Your dedicated organizer food workspace is next.</span>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section className="service-management-section">
            <div className="dashboard-section-heading">
              <div>
                <span className="section-eyebrow">EVENT OPERATIONS</span>
                <h2>Tickets & Guest Attendance</h2>
                <p>
                  Monitor tickets issued, guest check-ins, cancellations
                  and pending ticket refunds.
                </p>
              </div>

              <button
                className="secondary-welcome-button"
                onClick={() => go("/organizer/check-in")}
              >
                <i className="bi bi-qr-code-scan"></i>
                Open Check-In Center
              </button>
            </div>

            {operationsError && (
              <p style={{ color: "#9b2946", marginBottom: 16 }}>
                {operationsError}
              </p>
            )}

            {operationsLoading ? (
              <div className="compact-empty-state">
                Loading event ticket statistics...
              </div>
            ) : (
              <>
                <div className="organizer-overview-grid">
                  {[
                    ["Tickets Issued", eventTotals.issued, "bi-ticket-perforated"],
                    ["Valid Tickets", eventTotals.valid, "bi-shield-check"],
                    ["Checked In", eventTotals.used, "bi-check-circle"],
                    ["Cancelled", eventTotals.cancelled, "bi-x-circle"],
                    ["Refund Pending", eventTotals.refundPending, "bi-clock-history"]
                  ].map(([label, value, icon]) => (
                    <article className="overview-card" key={label}>
                      <div className="overview-icon">
                        <i className={`bi ${icon}`}></i>
                      </div>
                      <div>
                        <span>{label}</span>
                        <h2>{value}</h2>
                        <p>Across loaded events</p>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="recent-listings-panel" style={{ marginTop: 22 }}>
                  <div className="panel-heading">
                    <div>
                      <span className="section-eyebrow">YOUR EVENTS</span>
                      <h2>Manage attendees & check-ins</h2>
                      <p>Select an event to manage its tickets and guests.</p>
                    </div>
                  </div>

                  {eventOperations.length === 0 ? (
                    <div className="compact-empty-state">
                      No event ticket information is available yet.
                    </div>
                  ) : (
                    <div className="listing-tabs-content">
                      <div className="listing-group">
                        {eventOperations.map(({ event, stats: ticketStats }) => (
                          <div
                            key={event._id}
                            className="compact-listing-item"
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              alignItems: "center",
                              gap: 14,
                              padding: 18
                            }}
                          >
                            <div className="compact-listing-image">
                              {event.image ? (
                                <img src={event.image} alt={event.title} />
                              ) : (
                                <i className="bi bi-calendar-heart"></i>
                              )}
                            </div>

                            <div
                              className="compact-listing-info"
                              style={{ flex: "1 1 180px" }}
                            >
                              <strong>{event.title}</strong>
                              <span>
                                {formatDate(event.date)} ·{" "}
                                {ticketStats.ticketsIssued || 0} issued ·{" "}
                                {ticketStats.usedTickets || 0} checked in
                              </span>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 8
                              }}
                            >
                              <button
                                className="secondary-welcome-button"
                                onClick={() =>
                                  go(`/organizer/events/${event._id}/bookings`)
                                }
                              >
                                Attendees
                              </button>

                              <button
                                className="secondary-welcome-button"
                                onClick={() =>
                                  go(`/organizer/events/${event._id}/staff`)
                                }
                              >
                                Staff
                              </button>

                              <button
                                className="primary-welcome-button"
                                onClick={() =>
                                  go(`/organizer/events/${event._id}/check-in`)
                                }
                              >
                                <i className="bi bi-qr-code-scan"></i>
                                Check In
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          <section className="revenue-section">
            <div className="dashboard-section-heading">
              <div>
                <span className="section-eyebrow">PERFORMANCE</span>
                <h2>Revenue overview</h2>
                <p>
                  A breakdown of your reported paid activity across Vibely.
                </p>
              </div>
            </div>

            <div className="revenue-grid">
              <article className="revenue-card">
                <div className="revenue-card-icon">
                  <i className="bi bi-ticket-perforated"></i>
                </div>
                <span>Event Revenue</span>
                <h3>{formatCurrency(revenue.eventNetRevenue)}</h3>
                <div className="revenue-detail-row">
                  <span>Gross</span>
                  <strong>{formatCurrency(revenue.eventGrossRevenue)}</strong>
                </div>
                <div className="revenue-detail-row">
                  <span>Refunds</span>
                  <strong>{formatCurrency(revenue.eventRefunds)}</strong>
                </div>
              </article>

              <article className="revenue-card">
                <div className="revenue-card-icon">
                  <i className="bi bi-house-heart"></i>
                </div>
                <span>Apartment Revenue</span>
                <h3>{formatCurrency(revenue.apartmentRevenue)}</h3>
                <div className="revenue-detail-row">
                  <span>Bookings</span>
                  <strong>{stats.totalApartmentBookings || 0}</strong>
                </div>
                <div className="revenue-detail-row">
                  <span>Confirmed</span>
                  <strong>{stats.confirmedApartmentBookings || 0}</strong>
                </div>
              </article>

              <article className="revenue-card">
                <div className="revenue-card-icon">
                  <i className="bi bi-bag-heart"></i>
                </div>
                <span>Food Revenue</span>
                <h3>{formatCurrency(revenue.foodRevenue)}</h3>
                <div className="revenue-detail-row">
                  <span>Orders</span>
                  <strong>{stats.totalFoodOrders || 0}</strong>
                </div>
                <div className="revenue-detail-row">
                  <span>Completed</span>
                  <strong>{stats.completedFoodOrders || 0}</strong>
                </div>
              </article>
            </div>
          </section>

          <section className="dashboard-middle-grid">
            <div className="recent-listings-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-eyebrow">RECENT LISTINGS</span>
                  <h2>Your latest additions</h2>
                  <p>Recently created events, stays and food items.</p>
                </div>
              </div>

              <div className="listing-tabs-content">
                <div className="listing-group">
                  <div className="listing-group-heading">
                    <div>
                      <i className="bi bi-calendar-event"></i>
                      <span>Events</span>
                    </div>
                    <button onClick={() => go("/organizer/events")}>
                      View all
                    </button>
                  </div>

                  {recentEvents.length > 0 ? (
                    recentEvents.slice(0, 3).map((event) => (
                      <button
                        className="compact-listing-item"
                        key={event._id}
                        onClick={() => go(`/organizer/events/${event._id}`)}
                      >
                        <div className="compact-listing-image">
                          {event.image ? (
                            <img src={event.image} alt={event.title} />
                          ) : (
                            <i className="bi bi-calendar-heart"></i>
                          )}
                        </div>
                        <div className="compact-listing-info">
                          <strong>{event.title}</strong>
                          <span>
                            {event.location} · {formatDate(event.date)}
                          </span>
                        </div>
                        <i className="bi bi-chevron-right"></i>
                      </button>
                    ))
                  ) : (
                    <div className="compact-empty-state">
                      No events created yet.
                    </div>
                  )}
                </div>

                <div className="listing-group">
                  <div className="listing-group-heading">
                    <div>
                      <i className="bi bi-buildings"></i>
                      <span>Apartments</span>
                    </div>
                    <button onClick={() => go("/organizer/apartments")}>
                      View all
                    </button>
                  </div>

                  {recentApartments.length > 0 ? (
                    recentApartments.slice(0, 3).map((apartment) => (
                      <button
                        className="compact-listing-item"
                        key={apartment._id}
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
                            <i className="bi bi-house-heart"></i>
                          )}
                        </div>
                        <div className="compact-listing-info">
                          <strong>{apartment.title}</strong>
                          <span>
                            {apartment.location} ·{" "}
                            {formatCurrency(apartment.pricePerNight)}/night
                          </span>
                        </div>
                        <i className="bi bi-chevron-right"></i>
                      </button>
                    ))
                  ) : (
                    <div className="compact-empty-state">
                      No apartments created yet.
                    </div>
                  )}
                </div>

                <div className="listing-group">
                  <div className="listing-group-heading">
                    <div>
                      <i className="bi bi-cup-hot"></i>
                      <span>Food</span>
                    </div>
                    <span className="coming-soon-label">
                      Management coming next
                    </span>
                  </div>

                  {recentFoodItems.length > 0 ? (
                    recentFoodItems.slice(0, 3).map((food) => (
                      <div
                        className="compact-listing-item static-item"
                        key={food._id}
                      >
                        <div className="compact-listing-image">
                          {food.image ? (
                            <img src={food.image} alt={food.name} />
                          ) : (
                            <i className="bi bi-egg-fried"></i>
                          )}
                        </div>
                        <div className="compact-listing-info">
                          <strong>{food.name}</strong>
                          <span>
                            {formatCurrency(food.price)} · {food.quantity} left
                          </span>
                        </div>
                        <span
                          className={`availability-dot ${
                            food.isAvailable && food.quantity > 0
                              ? "available"
                              : "unavailable"
                          }`}
                        ></span>
                      </div>
                    ))
                  ) : (
                    <div className="compact-empty-state">
                      No food items created yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="quick-actions-panel">
              <div className="side-panel-heading">
                <span className="section-eyebrow">SHORTCUTS</span>
                <h2>Quick Actions</h2>
                <p>Get to your most important tools faster.</p>
              </div>

              {[
                [
                  "Create Event",
                  "Publish a new experience",
                  "bi-calendar-plus",
                  "/organizer/events/create"
                ],
                [
                  "Add Apartment",
                  "Create a beautiful new stay",
                  "bi-house-add",
                  "/organizer/apartments/create"
                ],
                [
                  "Event Bookings",
                  "Select an event to view attendees",
                  "bi-ticket-perforated",
                  "/organizer/events"
                ],
                [
                  "QR Check-In",
                  "Scan and validate event tickets",
                  "bi-qr-code-scan",
                  "/organizer/check-in"
                ],
                [
                  "Manage Event Staff",
                  "Select an event to manage staff",
                  "bi-person-badge",
                  "/organizer/events"
                ],
                [
                  "Profile Settings",
                  "Manage organizer information",
                  "bi-person-gear",
                  "/organizer/profile"
                ]
              ].map(([title, subtitle, icon, path]) => (
                <button
                  className="quick-action-item"
                  key={title}
                  onClick={() => go(path)}
                >
                  <div className="quick-action-icon">
                    <i className={`bi ${icon}`}></i>
                  </div>
                  <div>
                    <strong>{title}</strong>
                    <span>{subtitle}</span>
                  </div>
                  <i className="bi bi-chevron-right"></i>
                </button>
              ))}

              <div className="account-status-mini">
                <div className="account-status-mini-icon">
                  <i className="bi bi-patch-check-fill"></i>
                </div>
                <div>
                  <span>ACCOUNT STATUS</span>
                  <strong>
                    {organizer.approvalStatus === "approved"
                      ? "Approved Organizer"
                      : organizer.approvalStatus || "Organizer"}
                  </strong>
                  <p>Manage your Vibely business workspace.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="recent-activity-section">
            <div className="dashboard-section-heading activity-heading">
              <div>
                <span className="section-eyebrow">BUSINESS ACTIVITY</span>
                <h2>Recent bookings & orders</h2>
                <p>
                  Your latest customer activity across all three services.
                </p>
              </div>

              <div className="activity-count">
                <i className="bi bi-activity"></i>
                {stats.totalBookingsAndOrders || 0} total
              </div>
            </div>

            {recentActivity.length > 0 ? (
              <div className="activity-table-wrap">
                <div className="activity-table">
                  <div className="activity-table-header">
                    <span>Service</span>
                    <span>Customer</span>
                    <span>Reference</span>
                    <span>Amount</span>
                    <span>Status</span>
                  </div>

                  {recentActivity.map((activity) => (
                    <div
                      className="activity-table-row"
                      key={`${activity.type}-${activity.id}`}
                    >
                      <div className="activity-service">
                        <div
                          className={`activity-service-icon ${activity.type}`}
                        >
                          <i
                            className={`bi ${
                              activity.type === "event"
                                ? "bi-ticket-perforated"
                                : activity.type === "apartment"
                                ? "bi-buildings"
                                : "bi-bag-heart"
                            }`}
                          ></i>
                        </div>
                        <div>
                          <strong>{activity.title}</strong>
                          <span>
                            {activity.type === "apartment"
                              ? "Stay"
                              : activity.type === "event"
                              ? "Event"
                              : "Food"}
                          </span>
                        </div>
                      </div>

                      <span className="activity-customer">
                        {activity.customer}
                      </span>

                      <span className="activity-reference">
                        {activity.reference || "—"}
                      </span>

                      <strong className="activity-amount">
                        {formatCurrency(activity.amount)}
                      </strong>

                      <span
                        className={`activity-status ${String(
                          activity.status || "pending"
                        )
                          .toLowerCase()
                          .replaceAll("_", "-")}`}
                      >
                        {String(activity.status || "pending").replaceAll(
                          "_",
                          " "
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="activity-empty-state">
                <div>
                  <i className="bi bi-receipt"></i>
                </div>
                <h3>No customer activity yet</h3>
                <p>
                  Event bookings, apartment reservations and food orders
                  will appear here when customers begin purchasing your
                  services.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default OrganizerDashboard;
