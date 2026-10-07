import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import "../styles/adminDashboard.css";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [pendingProviders, setPendingProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleUnauthorized = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");

    navigate("/login");
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      const accessToken = localStorage.getItem("accessToken");

      if (!accessToken) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const config = {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        };

        const [dashboardResponse, providersResponse] =
          await Promise.all([
            axios.get(
              "http://192.168.0.3:5005/api/v1/admin/dashboard",
              config
            ),
            axios.get(
              "http://192.168.0.3:5005/api/v1/admin/providers/pending",
              config
            ),
          ]);

        setDashboard(dashboardResponse.data?.data || null);

        setPendingProviders(
          Array.isArray(providersResponse.data?.data)
            ? providersResponse.data.data
            : []
        );
      } catch (error) {
        console.log("ADMIN DASHBOARD ERROR:", error);

        if (
          error.response?.status === 401 ||
          error.response?.status === 403
        ) {
          handleUnauthorized();
          return;
        }

        setError(
          error.response?.data?.message ||
          "Unable to load the admin dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate]);

  const formatNumber = (value) => {
    return new Intl.NumberFormat("en-NG").format(
      Number(value) || 0
    );
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  };

  const users = dashboard?.users || {};
  const approvals = dashboard?.pendingApprovals || {};
  const events = dashboard?.events || {};
  const apartments = dashboard?.apartments || {};
  const food = dashboard?.food || {};
  const revenue = dashboard?.revenue || {};

  const totalProviders =
    Number(users.totalOrganizers || 0) +
    Number(users.totalFoodVendors || 0);

  const totalBookings =
    Number(events.totalBookings || 0) +
    Number(apartments.totalBookings || 0) +
    Number(food.totalOrders || 0);

  const stats = [
    {
      label: "Total Users",
      value: formatNumber(users.totalUsers),
      icon: "bi bi-people",
      note: "Registered customers",
    },
    {
      label: "Providers",
      value: formatNumber(totalProviders),
      icon: "bi bi-person-badge",
      note: `${formatNumber(
        users.totalOrganizers
      )} organizers · ${formatNumber(
        users.totalFoodVendors
      )} food vendors`,
    },
    {
      label: "Events",
      value: formatNumber(events.totalEvents),
      icon: "bi bi-calendar-event",
      note: `${formatNumber(
        events.totalBookings
      )} event bookings`,
    },
    {
      label: "Apartments",
      value: formatNumber(apartments.totalApartments),
      icon: "bi bi-buildings",
      note: `${formatNumber(
        apartments.totalBookings
      )} apartment bookings`,
    },
    {
      label: "Food Orders",
      value: formatNumber(food.totalOrders),
      icon: "bi bi-bag-check",
      note: `${formatNumber(food.totalFoods)} food listings`,
    },
    {
      label: "Platform Revenue",
      value: formatMoney(revenue.total),
      icon: "bi bi-credit-card",
      note: "Paid transactions",
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");

    navigate("/login");
  };

  if (loading) {
    return (
      <div className="vibely-admin">
        <main
          className="vibely-admin-main"
          style={{
            marginLeft: 0,
            display: "grid",
            placeItems: "center",
          }}
        >
          <div className="vibely-admin-empty">
            <div>
              <i className="bi bi-arrow-repeat"></i>
            </div>

            <strong>Loading admin dashboard</strong>

            <p>
              Vibely is preparing your platform statistics.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vibely-admin">
        <main
          className="vibely-admin-main"
          style={{
            marginLeft: 0,
            display: "grid",
            placeItems: "center",
          }}
        >
          <div className="vibely-admin-empty">
            <div>
              <i className="bi bi-exclamation-circle"></i>
            </div>

            <strong>Dashboard unavailable</strong>

            <p>{error}</p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                marginTop: "16px",
                border: 0,
                borderRadius: "10px",
                padding: "11px 18px",
                background: "#68001c",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="vibely-admin">
      <aside className="vibely-admin-sidebar">
        <div className="vibely-admin-brand">
          <div className="vibely-admin-brand-mark">
            V
          </div>

          <div>
            <strong>VIBELY</strong>
            <span>ADMINISTRATION</span>
          </div>
        </div>

        <nav className="vibely-admin-nav">
          <p>OVERVIEW</p>

          <Link
            className="active"
            to="/admin/dashboard"
          >
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

            {Number(approvals.total || 0) > 0 && (
              <span className="vibely-admin-nav-badge">
                {formatNumber(approvals.total)}
              </span>
            )}
          </Link>

          <Link to="/admin/events">
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

        <div className="vibely-admin-sidebar-bottom">
          <div className="vibely-admin-profile-mini">
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

      <main className="vibely-admin-main">
        <header className="vibely-admin-header">
          <div>
            <span>ADMIN CONSOLE</span>
            <h1>Dashboard</h1>
          </div>

          <div className="vibely-admin-header-actions">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() =>
                navigate("/admin/notifications")
              }
            >
              <i className="bi bi-bell"></i>
            </button>

            <div className="vibely-admin-header-user">
              <div>A</div>

              <section>
                <strong>Administrator</strong>
                <span>Super Admin</span>
              </section>
            </div>
          </div>
        </header>

        <section className="vibely-admin-welcome">
          <div>
            <span>VIBELY CONTROL CENTRE</span>

            <h2>
              Everything happening on Vibely, in one
              place.
            </h2>

            <p>
              Manage customers, providers, listings,
              bookings and platform activity from your
              administration workspace.
            </p>
          </div>

          <div className="vibely-admin-welcome-art">
            <i className="bi bi-shield-check"></i>
            <span>ADMIN ACCESS</span>
            <strong>Platform Control</strong>
          </div>
        </section>

        <section className="vibely-admin-stats">
          {stats.map((item) => (
            <article key={item.label}>
              <div className="vibely-admin-stat-icon">
                <i className={item.icon}></i>
              </div>

              <section>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </section>
            </article>
          ))}
        </section>

        <section className="vibely-admin-middle">
          <article className="vibely-admin-panel">
            <div className="vibely-admin-panel-title">
              <div>
                <span>APPROVAL CENTRE</span>
                <h3>Pending providers</h3>
              </div>

              <Link to="/admin/providers">
                View all
                <i className="bi bi-arrow-right"></i>
              </Link>
            </div>

            {pendingProviders.length === 0 ? (
              <div className="vibely-admin-empty">
                <div>
                  <i className="bi bi-person-check"></i>
                </div>

                <strong>
                  No pending provider applications
                </strong>

                <p>
                  New organizer and food vendor
                  applications awaiting approval will
                  appear here.
                </p>
              </div>
            ) : (
              <div className="vibely-admin-activity-placeholder">
                {pendingProviders
                  .slice(0, 4)
                  .map((provider) => (
                    <div
                      className="vibely-admin-activity-line"
                      key={provider._id}
                    >
                      <span>
                        <i
                          className={
                            provider.role ===
                              "food_vendor"
                              ? "bi bi-basket"
                              : "bi bi-calendar-event"
                          }
                        ></i>
                      </span>

                      <div>
                        <strong>
                          {provider.businessName ||
                            `${provider.firstname || ""} ${provider.lastname || ""
                              }`.trim() ||
                            "Provider"}
                        </strong>

                        <p>
                          {provider.role ===
                            "food_vendor"
                            ? "Food Vendor"
                            : "Organizer"}{" "}
                          · Awaiting approval
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </article>

          <article className="vibely-admin-panel vibely-admin-quick-panel">
            <div className="vibely-admin-panel-title">
              <div>
                <span>QUICK ACCESS</span>
                <h3>Administration</h3>
              </div>
            </div>

            <div className="vibely-admin-quick-links">
              <Link to="/admin/users">
                <i className="bi bi-people"></i>

                <div>
                  <strong>Manage Users</strong>
                  <span>
                    {formatNumber(users.totalUsers)}{" "}
                    customer accounts
                  </span>
                </div>

                <i className="bi bi-chevron-right"></i>
              </Link>

              <Link to="/admin/providers">
                <i className="bi bi-person-check"></i>

                <div>
                  <strong>Provider Approvals</strong>
                  <span>
                    {formatNumber(approvals.total)}{" "}
                    awaiting review
                  </span>
                </div>

                <i className="bi bi-chevron-right"></i>
              </Link>

              <Link to="/admin/payments">
                <i className="bi bi-wallet2"></i>

                <div>
                  <strong>Transactions</strong>
                  <span>
                    {formatMoney(revenue.total)} paid
                    revenue
                  </span>
                </div>

                <i className="bi bi-chevron-right"></i>
              </Link>

              <Link to="/admin/bookings">
                <i className="bi bi-journal-check"></i>

                <div>
                  <strong>Bookings</strong>
                  <span>
                    {formatNumber(totalBookings)}{" "}
                    bookings & orders
                  </span>
                </div>

                <i className="bi bi-chevron-right"></i>
              </Link>
            </div>
          </article>
        </section>

        <section className="vibely-admin-bottom">
          <article className="vibely-admin-panel">
            <div className="vibely-admin-panel-title">
              <div>
                <span>PLATFORM OVERVIEW</span>
                <h3>Business activity</h3>
              </div>
            </div>

            <div className="vibely-admin-activity-placeholder">
              <div className="vibely-admin-activity-line">
                <span>
                  <i className="bi bi-calendar2-check"></i>
                </span>

                <div>
                  <strong>
                    {formatNumber(events.totalBookings)}{" "}
                    event bookings
                  </strong>

                  <p>
                    {formatNumber(events.totalTickets)}{" "}
                    individual event tickets generated.
                  </p>
                </div>
              </div>

              <div className="vibely-admin-activity-line muted">
                <span>
                  <i className="bi bi-buildings"></i>
                </span>

                <div>
                  <strong>
                    {formatNumber(
                      apartments.totalBookings
                    )}{" "}
                    apartment bookings
                  </strong>

                  <p>
                    {formatNumber(
                      apartments.totalApartments
                    )}{" "}
                    apartment listings currently on
                    Vibely.
                  </p>
                </div>
              </div>

              <div className="vibely-admin-activity-line muted">
                <span>
                  <i className="bi bi-bag-check"></i>
                </span>

                <div>
                  <strong>
                    {formatNumber(food.totalOrders)} food
                    orders
                  </strong>

                  <p>
                    {formatNumber(food.totalFoods)} food
                    listings across Vibely vendors.
                  </p>
                </div>
              </div>
            </div>
          </article>

          <article className="vibely-admin-system-card">
            <div className="vibely-admin-system-icon">
              <i className="bi bi-wallet2"></i>
            </div>

            <span>PLATFORM REVENUE</span>

            <h3>{formatMoney(revenue.total)}</h3>

            <p>
              Total value of successful paid
              transactions currently recorded across
              Vibely.
            </p>

            <div className="vibely-admin-quick-links">
              <Link to="/admin/payments">
                <i className="bi bi-calendar-event"></i>

                <div>
                  <strong>Events</strong>
                  <span>
                    {formatMoney(revenue.events)}
                  </span>
                </div>

                <i className="bi bi-chevron-right"></i>
              </Link>

              <Link to="/admin/payments">
                <i className="bi bi-buildings"></i>

                <div>
                  <strong>Apartments</strong>
                  <span>
                    {formatMoney(revenue.apartments)}
                  </span>
                </div>

                <i className="bi bi-chevron-right"></i>
              </Link>

              <Link to="/admin/payments">
                <i className="bi bi-basket"></i>

                <div>
                  <strong>Food</strong>
                  <span>
                    {formatMoney(revenue.food)}
                  </span>
                </div>

                <i className="bi bi-chevron-right"></i>
              </Link>
            </div>

            <div className="vibely-admin-system-status">
              <span></span>
              Live backend data connected
            </div>
          </article>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;