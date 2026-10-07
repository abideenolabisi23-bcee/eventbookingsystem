import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/organizerDashboard.css";
import vibelyLogo from "../assets/vibely-logo.png";

const OrganizerDashboard = () => {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      const accessToken = localStorage.getItem("accessToken");

      if (!accessToken) {
        navigate("/organizer/login");
        return;
      }

      try {
        const response = await fetch(
          "http://https://eventbookingsystem-sooty.vercel.app/api/v1/organizer/dashboard",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );

        const result = await response.json();

        if (response.status === 401) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("role");
          navigate("/organizer/login");
          return;
        }

        if (!response.ok) {
          setError(result.message || "Unable to load dashboard");
          return;
        }

        setDashboard(result.data);
      } catch (error) {
        setError("Unable to connect to the server");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate]);

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");
    localStorage.removeItem("firstname");
    localStorage.removeItem("lastname");
    navigate("/organizer/login");
  };

  const getInitials = () => {
    if (!dashboard?.organizer) return "VO";

    const firstname = dashboard.organizer.firstname || "";
    const lastname = dashboard.organizer.lastname || "";

    return `${firstname.charAt(0)}${lastname.charAt(0)}`.toUpperCase();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0
    }).format(Number(amount || 0));
  };

  const formatDate = (date) => {
    if (!date) return "No date";

    return new Date(date).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="organizer-loading">
        <div className="organizer-loader"></div>
        <h3>Preparing your workspace</h3>
        <p>Loading your Vibely organizer dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="organizer-error-page">
        <div className="organizer-error-card">
          <div className="organizer-error-icon">
            <i className="bi bi-exclamation-circle"></i>
          </div>

          <h2>We couldn't load your dashboard</h2>
          <p>{error}</p>

          <button onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const organizer = dashboard?.organizer;
  const stats = dashboard?.stats || {};
  const revenue = dashboard?.revenue || {};

  const recentEvents = dashboard?.recentEvents || [];
  const recentApartments = dashboard?.recentApartments || [];
  const recentFoodItems = dashboard?.recentFoodItems || [];
  const recentEventBookings = dashboard?.recentEventBookings || [];
  const recentApartmentBookings =
    dashboard?.recentApartmentBookings || [];
  const recentFoodOrders = dashboard?.recentFoodOrders || [];

  const recentActivity = [
    ...recentEventBookings.map((booking) => ({
      id: booking._id,
      type: "event",
      title: booking.event?.title || "Event booking",
      reference: booking.bookingReference,
      customer: booking.user
        ? `${booking.user.firstname || ""} ${booking.user.lastname || ""
          }`.trim()
        : "Customer",
      amount: booking.totalAmount,
      status: booking.bookingStatus,
      createdAt: booking.createdAt
    })),

    ...recentApartmentBookings.map((booking) => ({
      id: booking._id,
      type: "apartment",
      title: booking.apartment?.title || "Apartment booking",
      reference: booking.bookingReference,
      customer: booking.user
        ? `${booking.user.firstname || ""} ${booking.user.lastname || ""
          }`.trim()
        : "Guest",
      amount: booking.totalAmount,
      status: booking.bookingStatus,
      createdAt: booking.createdAt
    })),

    ...recentFoodOrders.map((order) => ({
      id: order._id,
      type: "food",
      title:
        order.items?.length > 0
          ? `${order.items[0].name}${order.items.length > 1
            ? ` +${order.items.length - 1} more`
            : ""
          }`
          : "Food order",
      reference: order.orderReference,
      customer: order.user
        ? `${order.user.firstname || ""} ${order.user.lastname || ""
          }`.trim()
        : "Customer",
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

  const getActivityIcon = (type) => {
    if (type === "event") return "bi-ticket-perforated";
    if (type === "apartment") return "bi-buildings";
    return "bi-bag-heart";
  };

  const getActivityLabel = (type) => {
    if (type === "event") return "Event";
    if (type === "apartment") return "Stay";
    return "Food";
  };

  return (
    <div className="organizer-dashboard">
      <div
        className={`organizer-sidebar-overlay ${sidebarOpen ? "show" : ""
          }`}
        onClick={closeSidebar}
      ></div>

      <aside
        className={`organizer-sidebar ${sidebarOpen ? "sidebar-open" : ""
          }`}
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

          <button
            className="sidebar-close"
            onClick={closeSidebar}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="organizer-sidebar-profile">
          {organizer?.profilePicture ? (
            <img
              src={organizer.profilePicture}
              alt={organizer.firstname}
            />
          ) : (
            <div className="sidebar-profile-placeholder">
              {getInitials()}
            </div>
          )}

          <div className="organizer-sidebar-profile-info">
            <h4>
              {organizer?.businessName || "Vibely Organizer"}
            </h4>
            <p>
              {organizer?.firstname} {organizer?.lastname}
            </p>
          </div>
        </div>

        <nav className="organizer-nav">
          <div className="organizer-nav-section">
            <span className="organizer-nav-title">OVERVIEW</span>

            <NavLink
              to="/organizer/dashboard"
              className={({ isActive }) =>
                `organizer-nav-link ${isActive ? "active" : ""
                }`
              }
              onClick={closeSidebar}
            >
              <i className="bi bi-grid-1x2-fill"></i>
              <span>Dashboard</span>
            </NavLink>
          </div>

          <div className="organizer-nav-section">
            <span className="organizer-nav-title">
              YOUR SERVICES
            </span>

            <NavLink
              to="/organizer/events"
              className="organizer-nav-link"
              onClick={closeSidebar}
            >
              <i className="bi bi-calendar-event"></i>
              <span>Events</span>
            </NavLink>

            <NavLink
              to="/organizer/apartments"
              className="organizer-nav-link"
              onClick={closeSidebar}
            >
              <i className="bi bi-buildings"></i>
              <span>Apartments</span>
            </NavLink>

            <button
              className="organizer-nav-link"
              onClick={() =>
                document
                  .getElementById("food-management")
                  ?.scrollIntoView({
                    behavior: "smooth"
                  })
              }
            >
              <i className="bi bi-cup-hot"></i>
              <span>Food</span>
            </button>
          </div>

          <div className="organizer-nav-section">
            <span className="organizer-nav-title">
              EVENT OPERATIONS
            </span>

            <NavLink
              to="/organizer/events"
              className="organizer-nav-link"
              onClick={closeSidebar}
            >
              <i className="bi bi-people"></i>
              <span>Bookings & Attendees</span>
            </NavLink>

            <NavLink
              to="/organizer/events"
              className="organizer-nav-link"
              onClick={closeSidebar}
            >
              <i className="bi bi-person-badge"></i>
              <span>Event Staff</span>
            </NavLink>

            <NavLink
              to="/organizer/events"
              className="organizer-nav-link"
              onClick={closeSidebar}
            >
              <i className="bi bi-qr-code-scan"></i>
              <span>QR Check-in</span>
            </NavLink>
          </div>

          <div className="organizer-nav-section">
            <span className="organizer-nav-title">ACCOUNT</span>

            <NavLink
              to="/organizer/profile"
              className="organizer-nav-link"
              onClick={closeSidebar}
            >
              <i className="bi bi-person-circle"></i>
              <span>Profile & Settings</span>
            </NavLink>

            <button
              className="organizer-nav-link organizer-logout"
              onClick={handleLogout}
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
                {organizer?.businessName ||
                  `${organizer?.firstname || ""}'s Workspace`}
              </h3>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              className="topbar-icon-button"
              onClick={() => navigate("/organizer/events")}
            >
              <i className="bi bi-search"></i>
            </button>

            <button className="topbar-icon-button notification-button">
              <i className="bi bi-bell"></i>
              {stats.pendingBookingsAndOrders > 0 && (
                <span></span>
              )}
            </button>

            <div className="topbar-divider"></div>

            <button
              className="topbar-profile"
              onClick={() => navigate("/organizer/profile")}
            >
              {organizer?.profilePicture ? (
                <img
                  src={organizer.profilePicture}
                  alt={organizer.firstname}
                />
              ) : (
                <div className="topbar-profile-placeholder">
                  {getInitials()}
                </div>
              )}

              <div>
                <strong>
                  {organizer?.firstname} {organizer?.lastname}
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
                Welcome back,{" "}
                <span>{organizer?.firstname}</span>
              </h1>

              <p>
                Events, beautiful stays and food experiences all in
                one workspace. Manage your listings, monitor orders
                and bookings, and keep an eye on your revenue.
              </p>

              <div className="welcome-actions">
                <button
                  className="primary-welcome-button"
                  onClick={() =>
                    navigate("/organizer/events/create")
                  }
                >
                  <i className="bi bi-plus-lg"></i>
                  Create Event
                </button>

                <button
                  className="secondary-welcome-button"
                  onClick={() =>
                    navigate("/organizer/apartments/create")
                  }
                >
                  <i className="bi bi-house-add"></i>
                  Add Apartment
                </button>
              </div>
            </div>

            <div className="welcome-business-card">
              <span>ESTIMATED NET REVENUE</span>
              <strong>
                {formatCurrency(revenue.totalRevenue)}
              </strong>

              <div className="welcome-business-meta">
                <div>
                  <i className="bi bi-calendar-event"></i>
                  <span>{stats.totalEvents || 0} events</span>
                </div>

                <div>
                  <i className="bi bi-buildings"></i>
                  <span>
                    {stats.totalApartments || 0} stays
                  </span>
                </div>

                <div>
                  <i className="bi bi-cup-hot"></i>
                  <span>
                    {stats.totalFoodItems || 0} food items
                  </span>
                </div>
              </div>
            </div>

            <div className="welcome-orb welcome-orb-one"></div>
            <div className="welcome-orb welcome-orb-two"></div>
          </section>

          <section className="organizer-overview-grid">
            <article className="overview-card revenue-overview">
              <div className="overview-icon">
                <i className="bi bi-wallet2"></i>
              </div>

              <div>
                <span>Total Revenue</span>
                <h2>
                  {formatCurrency(revenue.totalRevenue)}
                </h2>
                <p>Across your Vibely services</p>
              </div>
            </article>

            <article className="overview-card">
              <div className="overview-icon">
                <i className="bi bi-calendar2-heart"></i>
              </div>

              <div>
                <span>Events</span>
                <h2>{stats.totalEvents || 0}</h2>
                <p>
                  {stats.upcomingEvents || 0} upcoming
                </p>
              </div>
            </article>

            <article className="overview-card">
              <div className="overview-icon">
                <i className="bi bi-buildings"></i>
              </div>

              <div>
                <span>Apartments</span>
                <h2>{stats.totalApartments || 0}</h2>
                <p>
                  {stats.availableApartments || 0} available
                </p>
              </div>
            </article>

            <article className="overview-card">
              <div className="overview-icon">
                <i className="bi bi-cup-hot"></i>
              </div>

              <div>
                <span>Food Items</span>
                <h2>{stats.totalFoodItems || 0}</h2>
                <p>
                  {stats.availableFoodItems || 0} available
                </p>
              </div>
            </article>

            <article className="overview-card">
              <div className="overview-icon">
                <i className="bi bi-receipt-cutoff"></i>
              </div>

              <div>
                <span>Bookings & Orders</span>
                <h2>
                  {stats.totalBookingsAndOrders || 0}
                </h2>
                <p>
                  {stats.pendingBookingsAndOrders || 0} pending
                </p>
              </div>
            </article>
          </section>

          <section className="service-management-section">
            <div className="dashboard-section-heading">
              <div>
                <span className="section-eyebrow">
                  SERVICE MANAGEMENT
                </span>
                <h2>Run every part of your business</h2>
                <p>
                  Jump directly into the Vibely service you want to
                  manage.
                </p>
              </div>
            </div>

            <div className="service-management-grid">
              <article className="service-card event-service-card">
                <div className="service-card-top">
                  <div className="service-icon">
                    <i className="bi bi-calendar-event"></i>
                  </div>

                  <span>
                    {stats.availableEvents || 0} available
                  </span>
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
                    <strong>
                      {stats.upcomingEvents || 0}
                    </strong>
                    <span>Upcoming</span>
                  </div>

                  <div>
                    <strong>
                      {stats.totalEventBookings || 0}
                    </strong>
                    <span>Bookings</span>
                  </div>
                </div>

                <div className="service-actions">
                  <button
                    onClick={() =>
                      navigate("/organizer/events")
                    }
                  >
                    Manage Events
                  </button>

                  <button
                    className="service-square-button"
                    onClick={() =>
                      navigate("/organizer/events/create")
                    }
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
                  Manage your stays, availability, apartment
                  galleries, prices and guest reservations.
                </p>

                <div className="service-card-stats">
                  <div>
                    <strong>
                      {stats.totalApartments || 0}
                    </strong>
                    <span>Total</span>
                  </div>

                  <div>
                    <strong>
                      {stats.availableApartments || 0}
                    </strong>
                    <span>Available</span>
                  </div>

                  <div>
                    <strong>
                      {stats.totalApartmentBookings || 0}
                    </strong>
                    <span>Bookings</span>
                  </div>
                </div>

                <div className="service-actions">
                  <button
                    onClick={() =>
                      navigate("/organizer/apartments")
                    }
                  >
                    Manage Stays
                  </button>

                  <button
                    className="service-square-button"
                    onClick={() =>
                      navigate("/organizer/apartments/create")
                    }
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

                  <span>
                    {stats.availableFoodItems || 0} available
                  </span>
                </div>

                <h3>Food & Orders</h3>

                <p>
                  Track your menu inventory and stay on top of new,
                  active and completed customer food orders.
                </p>

                <div className="service-card-stats">
                  <div>
                    <strong>
                      {stats.totalFoodItems || 0}
                    </strong>
                    <span>Items</span>
                  </div>

                  <div>
                    <strong>
                      {stats.totalFoodOrders || 0}
                    </strong>
                    <span>Orders</span>
                  </div>

                  <div>
                    <strong>
                      {stats.activeFoodOrders || 0}
                    </strong>
                    <span>Active</span>
                  </div>
                </div>

                <div className="food-coming-bar">
                  <i className="bi bi-stars"></i>

                  <div>
                    <strong>Food management</strong>
                    <span>
                      Your dedicated organizer food workspace is
                      next.
                    </span>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section className="revenue-section">
            <div className="dashboard-section-heading">
              <div>
                <span className="section-eyebrow">
                  PERFORMANCE
                </span>
                <h2>Revenue overview</h2>
                <p>
                  A simple breakdown of your paid activity across
                  Vibely.
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
                  {formatCurrency(revenue.eventNetRevenue)}
                </h3>

                <div className="revenue-detail-row">
                  <span>Gross</span>
                  <strong>
                    {formatCurrency(
                      revenue.eventGrossRevenue
                    )}
                  </strong>
                </div>

                <div className="revenue-detail-row">
                  <span>Refunds</span>
                  <strong>
                    {formatCurrency(revenue.eventRefunds)}
                  </strong>
                </div>
              </article>

              <article className="revenue-card">
                <div className="revenue-card-icon">
                  <i className="bi bi-house-heart"></i>
                </div>

                <span>Apartment Revenue</span>
                <h3>
                  {formatCurrency(
                    revenue.apartmentRevenue
                  )}
                </h3>

                <div className="revenue-detail-row">
                  <span>Bookings</span>
                  <strong>
                    {stats.totalApartmentBookings || 0}
                  </strong>
                </div>

                <div className="revenue-detail-row">
                  <span>Confirmed</span>
                  <strong>
                    {stats.confirmedApartmentBookings || 0}
                  </strong>
                </div>
              </article>

              <article className="revenue-card">
                <div className="revenue-card-icon">
                  <i className="bi bi-bag-heart"></i>
                </div>

                <span>Food Revenue</span>
                <h3>
                  {formatCurrency(revenue.foodRevenue)}
                </h3>

                <div className="revenue-detail-row">
                  <span>Orders</span>
                  <strong>
                    {stats.totalFoodOrders || 0}
                  </strong>
                </div>

                <div className="revenue-detail-row">
                  <span>Completed</span>
                  <strong>
                    {stats.completedFoodOrders || 0}
                  </strong>
                </div>
              </article>
            </div>
          </section>

          <section className="dashboard-middle-grid">
            <div className="recent-listings-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-eyebrow">
                    RECENT LISTINGS
                  </span>
                  <h2>Your latest additions</h2>
                  <p>
                    Recently created events, stays and food items.
                  </p>
                </div>
              </div>

              <div className="listing-tabs-content">
                <div className="listing-group">
                  <div className="listing-group-heading">
                    <div>
                      <i className="bi bi-calendar-event"></i>
                      <span>Events</span>
                    </div>

                    <button
                      onClick={() =>
                        navigate("/organizer/events")
                      }
                    >
                      View all
                    </button>
                  </div>

                  {recentEvents.length > 0 ? (
                    recentEvents.slice(0, 3).map((event) => (
                      <button
                        className="compact-listing-item"
                        key={event._id}
                        onClick={() =>
                          navigate(
                            `/organizer/events/${event._id}`
                          )
                        }
                      >
                        <div className="compact-listing-image">
                          {event.image ? (
                            <img
                              src={event.image}
                              alt={event.title}
                            />
                          ) : (
                            <i className="bi bi-calendar-heart"></i>
                          )}
                        </div>

                        <div className="compact-listing-info">
                          <strong>{event.title}</strong>
                          <span>
                            {event.location} ·{" "}
                            {formatDate(event.date)}
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

                    <button
                      onClick={() =>
                        navigate("/organizer/apartments")
                      }
                    >
                      View all
                    </button>
                  </div>

                  {recentApartments.length > 0 ? (
                    recentApartments
                      .slice(0, 3)
                      .map((apartment) => (
                        <button
                          className="compact-listing-item"
                          key={apartment._id}
                          onClick={() =>
                            navigate(
                              `/organizer/apartments/${apartment._id}`
                            )
                          }
                        >
                          <div className="compact-listing-image">
                            {apartment.images?.exterior ? (
                              <img
                                src={
                                  apartment.images.exterior
                                }
                                alt={apartment.title}
                              />
                            ) : (
                              <i className="bi bi-house-heart"></i>
                            )}
                          </div>

                          <div className="compact-listing-info">
                            <strong>
                              {apartment.title}
                            </strong>
                            <span>
                              {apartment.location} ·{" "}
                              {formatCurrency(
                                apartment.pricePerNight
                              )}
                              /night
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
                            <img
                              src={food.image}
                              alt={food.name}
                            />
                          ) : (
                            <i className="bi bi-egg-fried"></i>
                          )}
                        </div>

                        <div className="compact-listing-info">
                          <strong>{food.name}</strong>
                          <span>
                            {formatCurrency(food.price)} ·{" "}
                            {food.quantity} left
                          </span>
                        </div>

                        <span
                          className={`availability-dot ${food.isAvailable &&
                            food.quantity > 0
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
                <span className="section-eyebrow">
                  SHORTCUTS
                </span>
                <h2>Quick Actions</h2>
                <p>
                  Get to your most important tools faster.
                </p>
              </div>

              <button
                className="quick-action-item"
                onClick={() =>
                  navigate("/organizer/events/create")
                }
              >
                <div className="quick-action-icon">
                  <i className="bi bi-calendar-plus"></i>
                </div>

                <div>
                  <strong>Create Event</strong>
                  <span>Publish a new experience</span>
                </div>

                <i className="bi bi-chevron-right"></i>
              </button>

              <button
                className="quick-action-item"
                onClick={() =>
                  navigate("/organizer/apartments/create")
                }
              >
                <div className="quick-action-icon">
                  <i className="bi bi-house-add"></i>
                </div>

                <div>
                  <strong>Add Apartment</strong>
                  <span>Create a beautiful new stay</span>
                </div>

                <i className="bi bi-chevron-right"></i>
              </button>

              <button
                className="quick-action-item"
                onClick={() =>
                  navigate("/organizer/events")
                }
              >
                <div className="quick-action-icon">
                  <i className="bi bi-ticket-perforated"></i>
                </div>

                <div>
                  <strong>Event Bookings</strong>
                  <span>
                    Select an event to view bookings
                  </span>
                </div>

                <i className="bi bi-chevron-right"></i>
              </button>

              <button
                className="quick-action-item"
                onClick={() =>
                  navigate("/organizer/profile")
                }
              >
                <div className="quick-action-icon">
                  <i className="bi bi-person-gear"></i>
                </div>

                <div>
                  <strong>Profile Settings</strong>
                  <span>
                    Manage your organizer information
                  </span>
                </div>

                <i className="bi bi-chevron-right"></i>
              </button>

              <div className="account-status-mini">
                <div className="account-status-mini-icon">
                  <i className="bi bi-patch-check-fill"></i>
                </div>

                <div>
                  <span>ACCOUNT STATUS</span>
                  <strong>
                    {organizer?.approvalStatus === "approved"
                      ? "Approved Organizer"
                      : organizer?.approvalStatus || "Organizer"}
                  </strong>
                  <p>
                    Your Vibely business workspace is active.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="recent-activity-section">
            <div className="dashboard-section-heading activity-heading">
              <div>
                <span className="section-eyebrow">
                  BUSINESS ACTIVITY
                </span>
                <h2>Recent bookings & orders</h2>
                <p>
                  Your latest customer activity across all three
                  services.
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
                            className={`bi ${getActivityIcon(
                              activity.type
                            )}`}
                          ></i>
                        </div>

                        <div>
                          <strong>{activity.title}</strong>
                          <span>
                            {getActivityLabel(activity.type)}
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
                        {String(
                          activity.status || "pending"
                        ).replaceAll("_", " ")}
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
                  Event bookings, apartment reservations and food
                  orders will appear here when customers begin
                  purchasing your services.
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