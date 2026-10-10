
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/foodVendorDashboard.css";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1"
).replace(/\/+$/, "");

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(amount || 0));

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

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

const getList = (payload, key) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  if (Array.isArray(payload?.[key])) return payload[key];
  return [];
};

const FoodVendorDashboard = () => {
  const navigate = useNavigate();

  const [vendor, setVendor] = useState(null);
  const [foods, setFoods] = useState([]);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const logout = useCallback(() => {
    [
      "foodVendorAccessToken",
      "foodVendorRefreshToken",
      "foodVendorRole"
    ].forEach((key) => localStorage.removeItem(key));

    navigate("/food-vendor/login", { replace: true });
  }, [navigate]);

  const fetchDashboard = useCallback(
    async (showLoader = true) => {
      const token = localStorage.getItem("foodVendorAccessToken");

      if (!token) {
        navigate("/food-vendor/login", { replace: true });
        return;
      }

      if (showLoader) setLoading(true);
      else setRefreshing(true);

      setError("");

      try {
        const profileResponse = await fetch(`${API_URL}/profile`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (profileResponse.status === 401) {
          logout();
          return;
        }

        const profileResult = await profileResponse.json();

        if (!profileResponse.ok) {
          throw new Error(
            profileResult.message || "Unable to verify vendor account"
          );
        }

        const profileData = profileResult.data;
        const account = profileData?.user || profileData;

        if (account?.role !== "food_vendor") {
          logout();
          return;
        }

        if (
          account.approvalStatus !== "approved" ||
          account.accountStatus === "suspended"
        ) {
          setError(
            "Your food vendor account is not currently approved for dashboard access."
          );
          setVendor(null);
          setFoods([]);
          setOrders([]);
          return;
        }

        setVendor(account);

        const headers = {
          Authorization: `Bearer ${token}`
        };

        const results = await Promise.allSettled([
          fetch(`${API_URL}/food-vendor/foods`, { headers }),
          fetch(`${API_URL}/food-vendor/orders`, { headers })
        ]);

        const readResult = async (result, key) => {
          if (result.status !== "fulfilled") return null;

          const response = result.value;

          if (response.status === 401) {
            logout();
            return null;
          }

          if (!response.ok) return null;

          const payload = await response.json();
          return getList(payload, key);
        };

        const foodList = await readResult(results[0], "foods");
        const orderList = await readResult(results[1], "orders");

        setFoods(foodList || []);
        setOrders(orderList || []);

        if (foodList === null || orderList === null) {
          setNotification({
            type: "error",
            title: "Some information is unavailable",
            message:
              "Your account loaded, but menu or order information could not be retrieved. Check that your vendor API routes are connected."
          });
        }
      } catch (requestError) {
        setError(
          requestError.message || "Unable to connect to the server"
        );
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

  useEffect(() => {
    if (!notification) return;

    const timer = setTimeout(() => {
      setNotification(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification]);

  const stats = useMemo(() => {
    const paidOrders = orders.filter(
      (order) => order.paymentStatus === "paid"
    );

    const revenue = paidOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount || 0),
      0
    );

    const pendingOrders = orders.filter(
      (order) =>
       ["pending", "packing", "ready"].includes(order.orderStatus)
    );

    return {
      totalFoods: foods.length,
      availableFoods: foods.filter(
        (food) => food.isAvailable && Number(food.quantity) > 0
      ).length,
      totalOrders: orders.length,
      pendingOrders: pendingOrders.length,
      completedOrders: orders.filter(
        (order) => order.orderStatus === "completed"
      ).length,
      paidRevenue: revenue
    };
  }, [foods, orders]);

  const recentFoods = useMemo(
    () =>
      [...foods]
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        )
        .slice(0, 4),
    [foods]
  );

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        )
        .slice(0, 6),
    [orders]
  );

  const initials = `${
    vendor?.firstname?.charAt(0) || "F"
  }${vendor?.lastname?.charAt(0) || "V"}`.toUpperCase();

  const closeSidebar = () => setSidebarOpen(false);

  const go = (path) => {
    closeSidebar();
    navigate(path);
  };

  const navClass = ({ isActive }) =>
    `food-vendor-nav-link ${isActive ? "active" : ""}`;

  if (loading) {
    return (
      <div className="food-vendor-dashboard-loading">
        <div className="food-vendor-dashboard-spinner" />
        <h3>Preparing your kitchen workspace</h3>
        <p>Loading your Vibely Food Vendor Dashboard...</p>
      </div>
    );
  }

  if (error && !vendor) {
    return (
      <div className="food-vendor-dashboard-error-page">
        <div className="food-vendor-dashboard-error-card">
          <i className="bi bi-exclamation-circle" />
          <h2>Dashboard unavailable</h2>
          <p>{error}</p>

          <button onClick={() => fetchDashboard()}>
            Try Again
          </button>

          <button
            className="food-vendor-dashboard-secondary"
            onClick={logout}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="food-vendor-dashboard">
      <div
        className={`food-vendor-sidebar-overlay ${
          sidebarOpen ? "show" : ""
        }`}
        onClick={closeSidebar}
      />

      <aside
        className={`food-vendor-sidebar ${
          sidebarOpen ? "sidebar-open" : ""
        }`}
      >
        <div className="food-vendor-sidebar-brand">
          <img src={vibelyLogo} alt="Vibely" />

          <div>
            <h2>Vibely</h2>
            <span>FOOD VENDOR</span>
          </div>

          <button
            className="food-vendor-sidebar-close"
            onClick={closeSidebar}
            aria-label="Close sidebar"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="food-vendor-sidebar-profile">
          {vendor?.profilePicture ? (
            <img
              src={vendor.profilePicture}
              alt="Food vendor"
            />
          ) : (
            <div className="food-vendor-profile-placeholder">
              {initials}
            </div>
          )}

          <div>
            <h4>{vendor?.businessName || "My Food Business"}</h4>
            <p>
              {vendor?.firstname} {vendor?.lastname}
            </p>
          </div>
        </div>

        <nav className="food-vendor-sidebar-nav">
          <div className="food-vendor-nav-section">
            <span>OVERVIEW</span>

            <NavLink
              to="/food-vendor/dashboard"
              className={navClass}
              onClick={closeSidebar}
            >
              <i className="bi bi-grid-1x2-fill" />
              Dashboard
            </NavLink>
          </div>

          <div className="food-vendor-nav-section">
            <span>FOOD MANAGEMENT</span>

            <button
              className="food-vendor-nav-link"
              onClick={() => go("/food-vendor/menu")}
            >
              <i className="bi bi-journal-richtext" />
              Manage Menu
            </button>

            <button
              className="food-vendor-nav-link"
              onClick={() => go("/food-vendor/foods/create")}
            >
              <i className="bi bi-plus-circle" />
              Add Food
            </button>

            <button
              className="food-vendor-nav-link"
              onClick={() => go("/food-vendor/orders")}
            >
              <i className="bi bi-bag-check" />
              Customer Orders
            </button>

            <button
  className="food-vendor-nav-link"
  onClick={() => go("/food-vendor/pickup")}
>
  <i className="bi bi-qr-code-scan" />
  Verify Pickup
</button>
          </div>

          <div className="food-vendor-nav-section">
            <span>BUSINESS</span>

            <button
              className="food-vendor-nav-link"
              onClick={() => go("/food-vendor/earnings")}
            >
              <i className="bi bi-graph-up-arrow" />
              Earnings
            </button>

            <button
              className="food-vendor-nav-link"
              onClick={() => go("/food-vendor/profile")}
            >
              <i className="bi bi-person-circle" />
              Profile & Settings
            </button>

            <button
              className="food-vendor-nav-link food-vendor-logout"
              onClick={() => setShowLogoutModal(true)}
            >
              <i className="bi bi-box-arrow-left" />
              Logout
            </button>
          </div>
        </nav>

        <div className="food-vendor-sidebar-footer">
          <i className="bi bi-headset" />

          <div>
            <span>Need assistance?</span>
            <strong>Vibely Support</strong>
          </div>
        </div>
      </aside>

      <main className="food-vendor-dashboard-main">
        <header className="food-vendor-dashboard-topbar">
          <div className="food-vendor-topbar-left">
            <button
              className="food-vendor-mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <i className="bi bi-list" />
            </button>

            <div>
              <span>Food Vendor Workspace</span>
              <h3>
                {vendor?.businessName || "My Food Business"}
              </h3>
            </div>
          </div>

          <div className="food-vendor-topbar-actions">
            <button
              className="food-vendor-topbar-icon"
              onClick={() => fetchDashboard(false)}
              disabled={refreshing}
              aria-label="Refresh dashboard"
            >
              <i
                className={`bi bi-arrow-clockwise ${
                  refreshing ? "food-vendor-spin" : ""
                }`}
              />
            </button>

            <button
              className="food-vendor-topbar-profile"
              onClick={() => go("/food-vendor/profile")}
            >
              {vendor?.profilePicture ? (
                <img
                  src={vendor.profilePicture}
                  alt="Profile"
                />
              ) : (
                <div>{initials}</div>
              )}

              <span>
                <strong>{vendor?.firstname}</strong>
                <small>Food Vendor</small>
              </span>
            </button>
          </div>
        </header>

        <div className="food-vendor-dashboard-content">
          {notification && (
            <div
              role="alert"
              className={`food-vendor-dashboard-notice ${notification.type}`}
            >
              <i className="bi bi-exclamation-circle" />

              <div>
                <strong>{notification.title}</strong>
                <p>{notification.message}</p>
              </div>

              <button
                onClick={() => setNotification(null)}
                aria-label="Dismiss notification"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>
          )}

          <section className="food-vendor-dashboard-welcome">
            <div className="food-vendor-welcome-content">
              <span className="food-vendor-welcome-label">
                <i className="bi bi-stars" />
                YOUR VIBELY FOOD BUSINESS
              </span>

              <h1>
                Welcome back,{" "}
                <span>{vendor?.firstname || "Vendor"}</span>
              </h1>

              <p>
                Your kitchen, customers, and food business
                all in one place. Manage your meals, monitor
                customer orders, and track your sales.
              </p>

              <div className="food-vendor-welcome-actions">
                <button
                  onClick={() => go("/food-vendor/foods/create")}
                >
                  <i className="bi bi-plus-lg" />
                  Add New Food
                </button>

                <button
                  onClick={() => go("/food-vendor/orders")}
                >
                  <i className="bi bi-bag-check" />
                  View Orders
                </button>
              </div>
            </div>

            <div className="food-vendor-welcome-revenue">
              <span>REPORTED PAID ORDER VALUE</span>
              <strong>
                {formatCurrency(stats.paidRevenue)}
              </strong>

              <div>
                <span>
                  <i className="bi bi-cup-hot" />
                  {stats.totalFoods} meals
                </span>

                <span>
                  <i className="bi bi-bag" />
                  {stats.totalOrders} orders
                </span>
              </div>
            </div>
          </section>

          <section className="food-vendor-dashboard-stats">
            {[
              {
                label: "Total Food Items",
                value: stats.totalFoods,
                note: `${stats.availableFoods} available`,
                icon: "bi-cup-hot"
              },
              {
                label: "Customer Orders",
                value: stats.totalOrders,
                note: "All recorded orders",
                icon: "bi-bag-check"
              },
              {
                label: "Active Orders",
                value: stats.pendingOrders,
                note: "Pending and processing",
                icon: "bi-clock-history"
              },
              {
                label: "Completed Orders",
                value: stats.completedOrders,
                note: "Successfully completed",
                icon: "bi-check-circle"
              },
              {
                label: "Paid Order Value",
                value: formatCurrency(stats.paidRevenue),
                note: "Before fees and refunds",
                icon: "bi-wallet2"
              }
            ].map((item) => (
              <article
                className="food-vendor-stat-card"
                key={item.label}
              >
                <div className="food-vendor-stat-icon">
                  <i className={`bi ${item.icon}`} />
                </div>

                <div>
                  <span>{item.label}</span>
                  <h2>{item.value}</h2>
                  <p>{item.note}</p>
                </div>
              </article>
            ))}
          </section>

          <section className="food-vendor-dashboard-section">
            <div className="food-vendor-section-heading">
              <div>
                <span>FOOD MANAGEMENT</span>
                <h2>Manage your food business</h2>
                <p>
                  Everything you need to run your kitchen
                  on Vibely.
                </p>
              </div>
            </div>

            <div className="food-vendor-service-grid">
              <article className="food-vendor-service-card">
                <div className="food-vendor-service-icon">
                  <i className="bi bi-journal-richtext" />
                </div>

                <h3>Food Menu</h3>
                <p>
                  Create and manage your food listings,
                  prices, images, and availability.
                </p>

                <div className="food-vendor-service-count">
                  <strong>{stats.totalFoods}</strong>
                  <span>Food items</span>
                </div>

                <button
                  onClick={() => go("/food-vendor/menu")}
                >
                  Manage Menu
                  <i className="bi bi-arrow-right" />
                </button>
              </article>

              <article className="food-vendor-service-card">
                <div className="food-vendor-service-icon">
                  <i className="bi bi-bag-heart" />
                </div>

                <h3>Customer Orders</h3>
                <p>
                  View customer purchases, track order
                  progress, and manage fulfilment.
                </p>

                <div className="food-vendor-service-count">
                  <strong>{stats.pendingOrders}</strong>
                  <span>Active orders</span>
                </div>

                <button
                  onClick={() => go("/food-vendor/orders")}
                >
                  Manage Orders
                  <i className="bi bi-arrow-right" />
                </button>
              </article>

              <article className="food-vendor-service-card">
                <div className="food-vendor-service-icon">
                  <i className="bi bi-graph-up-arrow" />
                </div>

                <h3>Sales & Earnings</h3>
                <p>
                  Monitor paid food orders and keep track
                  of your business performance.
                </p>

                <div className="food-vendor-service-count">
                  <strong>
                    {formatCurrency(stats.paidRevenue)}
                  </strong>
                  <span>Paid order value</span>
                </div>

                <button
                  onClick={() => go("/food-vendor/earnings")}
                >
                  View Earnings
                  <i className="bi bi-arrow-right" />
                </button>
              </article>
            </div>
          </section>

          <section className="food-vendor-dashboard-middle">
            <div className="food-vendor-dashboard-panel">
              <div className="food-vendor-panel-heading">
                <div>
                  <span>YOUR MENU</span>
                  <h2>Recently added meals</h2>
                  <p>Your latest food listings.</p>
                </div>

                <button
                  onClick={() => go("/food-vendor/menu")}
                >
                  View all
                </button>
              </div>

              {recentFoods.length > 0 ? (
                <div className="food-vendor-food-list">
                  {recentFoods.map((food) => (
                    <div
                      className="food-vendor-food-item"
                      key={food._id}
                    >
                      <div className="food-vendor-food-image">
                        {food.image ? (
                          <img
                            src={food.image}
                            alt={food.name}
                          />
                        ) : (
                          <i className="bi bi-egg-fried" />
                        )}
                      </div>

                      <div className="food-vendor-food-info">
                        <strong>{food.name}</strong>
                        <span>
                          {formatCurrency(food.price)} ·{" "}
                          {food.quantity} available
                        </span>
                      </div>

                      <span
                        className={`food-vendor-availability ${
                          food.isAvailable && food.quantity > 0
                            ? "available"
                            : "unavailable"
                        }`}
                      >
                        {food.isAvailable && food.quantity > 0
                          ? "Available"
                          : "Unavailable"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="food-vendor-empty-state">
                  <i className="bi bi-cup-hot" />
                  <h3>No food items yet</h3>
                  <p>
                    Start by adding your first delicious meal.
                  </p>

                  <button
                    onClick={() => go("/food-vendor/foods/create")}
                  >
                    Add Food
                  </button>
                </div>
              )}
            </div>

            <div className="food-vendor-dashboard-panel">
              <div className="food-vendor-panel-heading">
                <div>
                  <span>QUICK ACTIONS</span>
                  <h2>Business shortcuts</h2>
                  <p>Manage your kitchen faster.</p>
                </div>
              </div>

              <div className="food-vendor-quick-actions">
                {[
                  [
                    "Add New Food",
                    "Create a food listing",
                    "bi-plus-circle",
                    "/food-vendor/foods/create"
                  ],
                  [
                    "Manage Menu",
                    "Update meals and prices",
                    "bi-journal-richtext",
                    "/food-vendor/menu"
                  ],
                  [
                    "Customer Orders",
                    "View incoming orders",
                    "bi-bag-check",
                    "/food-vendor/orders"
                  ],
                  [
                    "Sales Overview",
                    "Check your paid orders",
                    "bi-wallet2",
                    "/food-vendor/earnings"
                  ],
                  [
                    "Profile & Settings",
                    "Manage your vendor account",
                    "bi-person-gear",
                    "/food-vendor/profile"
                  ]
                ].map(([title, description, icon, path]) => (
                  <button
                    key={title}
                    className="food-vendor-quick-action"
                    onClick={() => go(path)}
                  >
                    <div>
                      <i className={`bi ${icon}`} />
                    </div>

                    <span>
                      <strong>{title}</strong>
                      <small>{description}</small>
                    </span>

                    <i className="bi bi-chevron-right" />
                  </button>
                ))}
              </div>

              <div className="food-vendor-account-status">
                <i className="bi bi-patch-check-fill" />

                <div>
                  <span>ACCOUNT STATUS</span>
                  <strong>Approved Food Vendor</strong>
                  <p>
                    Your food business workspace is active.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="food-vendor-dashboard-section">
            <div className="food-vendor-section-heading">
              <div>
                <span>CUSTOMER ACTIVITY</span>
                <h2>Recent food orders</h2>
                <p>
                  Track your latest customer food purchases.
                </p>
              </div>

              <button
                onClick={() => go("/food-vendor/orders")}
              >
                View All Orders
                <i className="bi bi-arrow-right" />
              </button>
            </div>

            {recentOrders.length > 0 ? (
              <div className="food-vendor-orders-table-wrap">
                <table className="food-vendor-orders-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Reference</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Order Status</th>
                      <th>Payment</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order._id}>
                        <td>{getCustomerName(order.user)}</td>
                        <td>{order.orderReference || "—"}</td>
                        <td>{formatDate(order.createdAt)}</td>
                        <td>
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td>
                          <span className="food-vendor-order-status">
                            {String(
                              order.orderStatus || "pending"
                            ).replaceAll("_", " ")}
                          </span>
                        </td>
                        <td>
                          <span className="food-vendor-payment-status">
                            {order.paymentStatus || "pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="food-vendor-empty-state">
                <i className="bi bi-receipt" />
                <h3>No customer orders yet</h3>
                <p>
                  Your customer orders will appear here
                  when people begin purchasing your meals.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      {showLogoutModal && (
        <div
          className="food-vendor-modal-overlay"
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            className="food-vendor-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="food-vendor-logout-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="food-vendor-modal-icon">
              <i className="bi bi-box-arrow-right" />
            </div>

            <h2 id="food-vendor-logout-title">
              Sign out of Vibely Food?
            </h2>

            <p>
              Are you sure you want to sign out of your
              food vendor account?
            </p>

            <div className="food-vendor-modal-actions">
              <button
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>

              <button onClick={logout}>
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodVendorDashboard;
