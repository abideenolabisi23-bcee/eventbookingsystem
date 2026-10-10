
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/foodVendorEarnings.css";

const API = (
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1"
).replace(/\/+$/, "");

const money = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

const dateLabel = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
};

const customerName = (user) =>
  [user?.firstname, user?.lastname].filter(Boolean).join(" ") ||
  user?.email ||
  "Customer";

const extractOrders = (payload) => {
  if (Array.isArray(payload?.data?.orders)) return payload.data.orders;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.orders)) return payload.orders;
  return null;
};

const readVisibility = () => {
  try {
    return localStorage.getItem("vibelyVendorEarningsVisible") === "true";
  } catch {
    return false;
  }
};

export default function FoodVendorEarnings() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(readVisibility);
  const [period, setPeriod] = useState("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleVisibility = () => {
    setVisible((previous) => {
      const next = !previous;
      localStorage.setItem(
        "vibelyVendorEarningsVisible",
        String(next)
      );
      return next;
    });
  };

  const displayMoney = (amount) =>
    visible ? money(amount) : "₦••••••";

  const loadEarnings = useCallback(async (initial = false) => {
    const token = localStorage.getItem("foodVendorAccessToken");

    if (!token) {
      navigate("/food-vendor/login", { replace: true });
      return;
    }

    if (initial) setLoading(true);
    else setRefreshing(true);

    setError("");

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [profileResponse, ordersResponse] = await Promise.all([
        axios.get(`${API}/profile`, { headers }),
        axios.get(`${API}/food-vendor/orders`, { headers })
      ]);

      const profile =
        profileResponse.data?.data?.user ||
        profileResponse.data?.data;

      if (
        profile?.role !== "food_vendor" ||
        profile?.approvalStatus !== "approved" ||
        profile?.accountStatus === "suspended"
      ) {
        throw new Error("Your vendor account is not approved for access.");
      }

      const list = extractOrders(ordersResponse.data);

      if (!list) {
        throw new Error("The server returned an unexpected orders format.");
      }

      setVendor(profile);
      setOrders(list);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate("/food-vendor/login", { replace: true });
        return;
      }

      setError(
        requestError.response?.data?.message ||
        requestError.message ||
        "Unable to load earnings."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadEarnings(true);
  }, [loadEarnings]);

  const paidOrders = useMemo(
    () => orders.filter((order) => order.paymentStatus === "paid"),
    [orders]
  );

  const stats = useMemo(() => {
    const total = paidOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount || 0),
      0
    );

    const completed = paidOrders.filter(
      (order) => order.orderStatus === "completed"
    );

    const completedValue = completed.reduce(
      (sum, order) => sum + Number(order.totalAmount || 0),
      0
    );

    const processing = paidOrders.filter(
      (order) =>
        ["pending", "packing", "ready"].includes(order.orderStatus)
    );

    return {
      total,
      completedValue,
      completedCount: completed.length,
      processingCount: processing.length,
      paidCount: paidOrders.length,
      average: paidOrders.length ? total / paidOrders.length : 0
    };
  }, [paidOrders]);

  const monthlyData = useMemo(() => {
    const now = new Date();

    return Array.from({ length: 6 }, (_, index) => {
      const month = new Date(
        now.getFullYear(),
        now.getMonth() - (5 - index),
        1
      );

      const amount = paidOrders.reduce((sum, order) => {
        const paidAt = new Date(
          order.paidAt || order.updatedAt || order.createdAt
        );

        if (
          paidAt.getFullYear() === month.getFullYear() &&
          paidAt.getMonth() === month.getMonth()
        ) {
          return sum + Number(order.totalAmount || 0);
        }

        return sum;
      }, 0);

      return {
        label: month.toLocaleDateString("en-NG", { month: "short" }),
        amount
      };
    });
  }, [paidOrders]);

  const maxMonth = Math.max(
    ...monthlyData.map((item) => item.amount),
    1
  );

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const query = search.trim().toLowerCase();

    return [...orders]
      .filter((order) => {
        if (status !== "all" && order.paymentStatus !== status) {
          return false;
        }

        const orderDate = new Date(order.createdAt);
        if (Number.isNaN(orderDate.getTime())) return period === "all";

        if (period === "7days") {
          const start = new Date(now);
          start.setDate(start.getDate() - 7);
          if (orderDate < start) return false;
        }

        if (period === "30days") {
          const start = new Date(now);
          start.setDate(start.getDate() - 30);
          if (orderDate < start) return false;
        }

        if (period === "month") {
          if (
            orderDate.getMonth() !== now.getMonth() ||
            orderDate.getFullYear() !== now.getFullYear()
          ) return false;
        }

        const searchable = [
          order.orderReference,
          customerName(order.user),
          order.paymentStatus,
          order.orderStatus
        ].join(" ").toLowerCase();

        return searchable.includes(query);
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
      );
  }, [orders, period, status, search]);

  const pageSize = 8;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / pageSize)
  );

  const currentPage = Math.min(page, totalPages);
  const pageOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const exportCSV = () => {
    const rows = [
      ["Order Reference", "Customer", "Date", "Amount NGN", "Payment", "Order Status"],
      ...filteredOrders.map((order) => [
        order.orderReference || "",
        customerName(order.user),
        dateLabel(order.createdAt),
        Number(order.totalAmount || 0),
        order.paymentStatus || "",
        order.orderStatus || ""
      ])
    ];

    const csv = rows
      .map((row) =>
        row.map((value) =>
          `"${String(value).replace(/"/g, '""')}"`
        ).join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vibely-food-sales.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const menu = [
    ["bi-grid-1x2", "Dashboard", "/food-vendor/dashboard"],
    ["bi-journal-richtext", "Manage Menu", "/food-vendor/menu"],
    ["bi-plus-circle", "Add Food", "/food-vendor/foods/create"],
    ["bi-bag-check", "Customer Orders", "/food-vendor/orders"],
    ["bi-qr-code-scan", "Verify Pickup", "/food-vendor/pickup"],
    ["bi-graph-up-arrow", "Earnings", "/food-vendor/earnings"],
    ["bi-person-circle", "Profile & Settings", "/food-vendor/profile"]
  ];

  if (loading) {
    return (
      <div className="fve-loading">
        <div className="fve-spinner" />
        <h2>Preparing your earnings workspace</h2>
        <p>Fetching your food business records...</p>
      </div>
    );
  }

  return (
    <div className="fve-layout">
      {sidebarOpen && (
        <button
          className="fve-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside className={`fve-sidebar ${sidebarOpen ? "open" : ""}`}>
        <Link to="/food-vendor/dashboard" className="fve-brand">
          <img src={vibelyLogo} alt="Vibely" />
          <div>
            <strong>Vibely</strong>
            <span>FOOD VENDOR</span>
          </div>
        </Link>

        <div className="fve-vendor">
          <div className="fve-avatar">
            {vendor?.firstname?.[0] || "V"}
          </div>
          <div>
            <strong>{vendor?.businessName || "My Kitchen"}</strong>
            <small>
              {vendor?.firstname} {vendor?.lastname}
            </small>
          </div>
        </div>

        <span className="fve-nav-heading">YOUR WORKSPACE</span>

        <nav className="fve-nav">
          {menu.map(([icon, label, path]) => (
            <Link
              key={path}
              to={path}
              onClick={() => setSidebarOpen(false)}
              className={
                path === "/food-vendor/earnings" ? "active" : ""
              }
            >
              <i className={`bi ${icon}`} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="fve-sidebar-bottom">
          <i className="bi bi-shield-check" />
          <span>Secure vendor workspace</span>
        </div>
      </aside>

      <main className="fve-main">
        <header className="fve-topbar">
          <div className="fve-topbar-title">
            <button
              className="fve-mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <i className="bi bi-list" />
            </button>

            <div>
              <small>FOOD VENDOR WORKSPACE</small>
              <h2>Sales & Earnings</h2>
            </div>
          </div>

          <div className="fve-topbar-actions">
            <button
              className="fve-icon-btn"
              onClick={toggleVisibility}
              title={visible ? "Hide amounts" : "Show amounts"}
              aria-label={visible ? "Hide amounts" : "Show amounts"}
            >
              <i className={`bi bi-eye${visible ? "-slash" : ""}`} />
            </button>

            <button
              className="fve-icon-btn"
              onClick={() => loadEarnings(false)}
              disabled={refreshing}
              title="Refresh"
            >
              <i className={`bi bi-arrow-clockwise ${refreshing ? "fve-spin" : ""}`} />
            </button>

            <div className="fve-topbar-user">
              <div className="fve-avatar">
                {vendor?.firstname?.[0] || "V"}
              </div>
              <span>{vendor?.firstname || "Vendor"}</span>
            </div>
          </div>
        </header>

        <div className="fve-content">
          <section className="fve-intro">
            <div>
              <span className="fve-eyebrow">YOUR BUSINESS FINANCES</span>
              <h1>Every sale, beautifully tracked.</h1>
              <p>
                Keep an eye on your food sales, completed orders,
                and customer payments in one place.
              </p>
            </div>

            <button onClick={exportCSV} className="fve-export">
              <i className="bi bi-download" />
              Export Report
            </button>
          </section>

          {error && (
            <div className="fve-alert" role="alert">
              <i className="bi bi-exclamation-triangle" />
              <span>{error}</span>
              <button onClick={() => loadEarnings(false)}>
                Retry
              </button>
            </div>
          )}

          <section className="fve-hero">
            <div className="fve-hero-content">
              <div className="fve-hero-label">
                <i className="bi bi-wallet2" />
                TOTAL PAID ORDER VALUE
              </div>

              <div className="fve-hero-amount">
                <h2>{displayMoney(stats.total)}</h2>
                <button
                  onClick={toggleVisibility}
                  aria-label={visible ? "Hide earnings" : "Show earnings"}
                  title={visible ? "Hide earnings" : "Show earnings"}
                >
                  <i className={`bi bi-eye${visible ? "-slash" : ""}`} />
                </button>
              </div>

              <p>
                Gross value of recorded paid food orders, before
                fees, refunds and payouts.
              </p>

              <div className="fve-hero-pills">
                <span>
                  <i className="bi bi-check-circle" />
                  {stats.paidCount} paid orders
                </span>
                <span>
                  <i className="bi bi-bag-heart" />
                  {stats.completedCount} completed
                </span>
              </div>
            </div>

            <div className="fve-hero-decoration">
              <i className="bi bi-graph-up-arrow" />
            </div>
          </section>

          <section className="fve-stat-grid">
            {[
              {
                title: "Completed Sales Value",
                value: displayMoney(stats.completedValue),
                note: "Paid orders collected",
                icon: "bi-bag-check"
              },
              {
                title: "Paid Orders",
                value: stats.paidCount,
                note: "Successful payment status",
                icon: "bi-credit-card-2-front"
              },
              {
                title: "Orders in Progress",
                value: stats.processingCount,
                note: "Paid and awaiting collection",
                icon: "bi-clock-history"
              },
              {
                title: "Average Paid Order",
                value: displayMoney(stats.average),
                note: "Average recorded sale",
                icon: "bi-graph-up"
              }
            ].map((item) => (
              <article className="fve-stat" key={item.title}>
                <div className="fve-stat-icon">
                  <i className={`bi ${item.icon}`} />
                </div>
                <span>{item.title}</span>
                <h3>{item.value}</h3>
                <small>{item.note}</small>
              </article>
            ))}
          </section>

          <section className="fve-analytics">
            <article className="fve-panel">
              <div className="fve-panel-head">
                <div>
                  <span className="fve-eyebrow">SALES PERFORMANCE</span>
                  <h2>Revenue Overview</h2>
                  <p>Recorded paid orders over the last six months.</p>
                </div>
                <span className="fve-panel-chip">6 Months</span>
              </div>

              <div className="fve-chart">
                {monthlyData.map((item, index) => (
                  <div className="fve-chart-col" key={index}>
                    <div className="fve-chart-bar-area">
                      <div
                        className="fve-chart-bar"
                        style={{
                          height: `${
                            item.amount
                              ? Math.max(7, (item.amount / maxMonth) * 100)
                              : 2
                          }%`
                        }}
                        title={
                          visible ? money(item.amount) : "Amount hidden"
                        }
                      />
                    </div>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="fve-panel fve-breakdown">
              <div className="fve-panel-head">
                <div>
                  <span className="fve-eyebrow">ORDER BREAKDOWN</span>
                  <h2>Payment Summary</h2>
                  <p>Your food sales at a glance.</p>
                </div>
              </div>

              <div className="fve-breakdown-total">
                <span>Paid Order Value</span>
                <strong>{displayMoney(stats.total)}</strong>
              </div>

              <div className="fve-breakdown-progress">
                <div
                  style={{
                    width: `${
                      stats.paidCount
                        ? (stats.completedCount / stats.paidCount) * 100
                        : 0
                    }%`
                  }}
                />
              </div>

              <div className="fve-breakdown-row">
                <span>
                  <i className="bi bi-circle-fill completed" />
                  Completed & collected
                </span>
                <strong>{stats.completedCount}</strong>
              </div>

              <div className="fve-breakdown-row">
                <span>
                  <i className="bi bi-circle-fill processing" />
                  Paid orders in progress
                </span>
                <strong>{stats.processingCount}</strong>
              </div>

              <div className="fve-balance-note">
                <i className="bi bi-info-circle" />
                <p>
                  Available withdrawal balance is not shown yet.
                  It requires verified fee, refund and payout records.
                </p>
              </div>
            </article>
          </section>

          <section className="fve-panel fve-transactions">
            <div className="fve-panel-head">
              <div>
                <span className="fve-eyebrow">PAYMENT ACTIVITY</span>
                <h2>Order Payment History</h2>
                <p>Review your customers' recorded food orders.</p>
              </div>
              <span className="fve-panel-chip">
                {filteredOrders.length} records
              </span>
            </div>

            <div className="fve-filters">
              <div className="fve-search">
                <i className="bi bi-search" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search customer or order reference"
                />
              </div>

              <select
                value={period}
                onChange={(event) => {
                  setPeriod(event.target.value);
                  setPage(1);
                }}
                aria-label="Filter by date"
              >
                <option value="all">All Time</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="month">This Month</option>
              </select>

              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                aria-label="Filter by payment status"
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
                <option value="partially_refunded">Partially Refunded</option>
              </select>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="fve-empty">
                <i className="bi bi-receipt-cutoff" />
                <h3>No matching orders</h3>
                <p>
                  Your orders will appear here when available.
                  Try adjusting your filters.
                </p>
              </div>
            ) : (
              <>
                <div className="fve-table-scroll">
                  <table className="fve-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Order Reference</th>
                        <th>Date</th>
                        <th>Amount Paid</th>
                        <th>Payment</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageOrders.map((order) => (
                        <tr key={order._id}>
                          <td>
                            <div className="fve-customer">
                              <div className="fve-customer-avatar">
                                {customerName(order.user).charAt(0).toUpperCase()}
                              </div>
                              <strong>{customerName(order.user)}</strong>
                            </div>
                          </td>
                          <td>{order.orderReference || "—"}</td>
                          <td>{dateLabel(order.createdAt)}</td>
                          

<td className="fve-amount">
  {order.paymentStatus === "paid" ? (
    <div className="fve-customer-payment">
      <strong>{money(order.totalAmount)}</strong>
      <span>
        <i className="bi bi-check-circle-fill" />
        Payment received
      </span>
    </div>
  ) : (
    <div className="fve-customer-payment">
      <strong>—</strong>
      <span className="fve-unpaid">
        {order.paymentStatus === "pending"
          ? "Awaiting payment"
          : String(order.paymentStatus || "Unpaid").replaceAll("_", " ")}
      </span>
    </div>
  )}
</td>


                          <td>
                            <span
                              className={`fve-status ${
                                order.paymentStatus === "paid"
                                  ? "paid"
                                  : order.paymentStatus === "pending"
                                    ? "pending"
                                    : "other"
                              }`}
                            >
                              {String(
                                order.paymentStatus || "pending"
                              ).replaceAll("_", " ")}
                            </span>
                          </td>
                          <td>
                            <button
                              className="fve-view"
                              onClick={() => setSelectedOrder(order)}
                            >
                              View <i className="bi bi-arrow-up-right" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="fve-pagination">
                  <span>
                    Showing {(currentPage - 1) * pageSize + 1}–
                    {Math.min(
                      currentPage * pageSize,
                      filteredOrders.length
                    )} of {filteredOrders.length}
                  </span>
                  <div>
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      <i className="bi bi-chevron-left" />
                    </button>
                    <span>{currentPage} / {totalPages}</span>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      <i className="bi bi-chevron-right" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          <div className="fve-footer">
            <i className="bi bi-shield-lock" />
            Financial information is visible only within your vendor account.
          </div>
        </div>
      </main>

      {selectedOrder && (
        <div
          className="fve-modal-overlay"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="fve-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Order payment details"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fve-modal-header">
              <div>
                <span className="fve-eyebrow">ORDER DETAILS</span>
                <h2>{selectedOrder.orderReference || "Food Order"}</h2>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                aria-label="Close details"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="fve-modal-rows">
              <div><span>Customer</span><strong>{customerName(selectedOrder.user)}</strong></div>
              <div><span>Date</span><strong>{dateLabel(selectedOrder.createdAt)}</strong></div>
              <div><span>Order Status</span><strong>{selectedOrder.orderStatus}</strong></div>
              <div><span>Payment Status</span><strong>{selectedOrder.paymentStatus}</strong></div>
              <div><span>Total Amount</span><strong>{displayMoney(selectedOrder.totalAmount)}</strong></div>
            </div>

            <h3>Food Items</h3>
            {(selectedOrder.items || []).map((item, index) => (
              <div className="fve-modal-item" key={index}>
                <span>{item.name} × {item.quantity}</span>
                <strong>{displayMoney(item.subtotal)}</strong>
              </div>
            ))}

            <button
              className="fve-modal-done"
              onClick={() => setSelectedOrder(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
