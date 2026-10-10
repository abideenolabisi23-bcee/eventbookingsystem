
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/foodVendorOrders.css";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1"
).replace(/\/+$/, "");

const money = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

const getCustomerName = (user) => {
  if (!user) return "Customer";

  const name = [user.firstname, user.lastname]
    .filter(Boolean)
    .join(" ");

  return name || user.email || "Customer";
};

const getNextStatus = (order) => {
  if (order.paymentStatus !== "paid") return null;

  if (order.orderStatus === "pending") return "packing";
  if (order.orderStatus === "packing") return "ready";

  return null;
};

const FoodVendorOrders = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [confirmOrder, setConfirmOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [notice, setNotice] = useState(null);

  const token = localStorage.getItem("foodVendorAccessToken");

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem(
      "foodVendorAccessToken"
    )}`
  });

  const loadOrders = useCallback(
    async (silent = false) => {
      const accessToken = localStorage.getItem(
        "foodVendorAccessToken"
      );

      if (!accessToken) {
        navigate("/food-vendor/login", { replace: true });
        return;
      }

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response = await axios.get(
          `${API_URL}/food-vendor/orders`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );

        const result = response.data?.data;

        if (!Array.isArray(result)) {
          throw new Error("Unexpected orders response");
        }

        setOrders(result);
      } catch (err) {
        const message =
          err.response?.data?.message ||
          err.message ||
          "Unable to fetch orders";

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const stats = useMemo(() => {
    const paidOrders = orders.filter(
      (order) => order.paymentStatus === "paid"
    );

    return {
      total: orders.length,
      pending: orders.filter(
        (order) =>
          order.orderStatus === "pending" &&
          order.paymentStatus === "paid"
      ).length,
      packing: orders.filter(
        (order) => order.orderStatus === "packing"
      ).length,
      ready: orders.filter(
        (order) => order.orderStatus === "ready"
      ).length,
      completed: orders.filter(
        (order) => order.orderStatus === "completed"
      ).length,
      revenue: paidOrders
        .filter((order) => order.orderStatus !== "cancelled")
        .reduce(
          (sum, order) => sum + Number(order.totalAmount || 0),
          0
        )
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const customer = getCustomerName(order.user);
      const foods = (order.items || [])
        .map((item) => item.name)
        .join(" ");

      const searchable = [
        order.orderReference,
        customer,
        order.user?.email,
        foods
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchable.includes(
        search.trim().toLowerCase()
      );

      const matchesStatus =
        statusFilter === "all" ||
        order.orderStatus === statusFilter;

      const matchesPayment =
        paymentFilter === "all" ||
        order.paymentStatus === paymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, search, statusFilter, paymentFilter]);

  const updateOrderStatus = async () => {
    if (!confirmOrder || updatingId) return;

    const nextStatus = getNextStatus(confirmOrder);

    if (!nextStatus) return;

    setUpdatingId(confirmOrder._id);

    try {
      const response = await axios.patch(
        `${API_URL}/food-vendor/orders/${confirmOrder._id}/status`,
        {
          status: nextStatus
        },
        {
          headers: getHeaders()
        }
      );

      const updatedOrder = response.data?.data;

      setOrders((previous) =>
        previous.map((order) =>
          order._id === confirmOrder._id
            ? {
                ...order,
                ...(updatedOrder || {}),
                user: order.user,
                items: order.items
              }
            : order
        )
      );

      setSelectedOrder((previous) =>
        previous?._id === confirmOrder._id
          ? {
              ...previous,
              ...(updatedOrder || {}),
              user: previous.user,
              items: previous.items
            }
          : previous
      );

      setNotice({
        type: "success",
        message:
          nextStatus === "packing"
            ? "Order is now being packed."
            : "Order marked as ready for pickup."
      });

      setConfirmOrder(null);
    } catch (err) {
      setNotice({
        type: "error",
        message:
          err.response?.data?.message ||
          "Unable to update order status."
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const openOrder = async (order) => {
    setSelectedOrder(order);

    try {
      const response = await axios.get(
        `${API_URL}/food-vendor/orders/${order._id}`,
        {
          headers: getHeaders()
        }
      );

      if (response.data?.data) {
        setSelectedOrder(response.data.data);
      }
    } catch (err) {
      setNotice({
        type: "error",
        message:
          err.response?.data?.message ||
          "Unable to load full order details."
      });
    }
  };

  const renderStatus = (status, prefix = "order") => (
    <span className={`fv-orders-badge ${prefix}-${status || "pending"}`}>
      {String(status || "pending").replaceAll("_", " ")}
    </span>
  );

  if (!token) {
    return null;
  }

  return (
    <div className="fv-orders-page">
      <div className="fv-orders-container">
        <header className="fv-orders-header">
          <div>
            <button
              className="fv-orders-back"
              onClick={() => navigate("/food-vendor/dashboard")}
            >
              <i className="bi bi-arrow-left" />
              Back to Dashboard
            </button>

            <div className="fv-orders-eyebrow">
              VIBELY FOOD VENDOR PORTAL
            </div>

            <h1>Customer Orders</h1>

            <p>
              Manage food orders, track payments and prepare
              meals for customer pickup.
            </p>
          </div>

          <button
            className="fv-orders-refresh"
            onClick={() => loadOrders(true)}
            disabled={refreshing}
          >
            <i
              className={`bi bi-arrow-clockwise ${
                refreshing ? "fv-orders-spinning" : ""
              }`}
            />
            Refresh Orders
          </button>
        </header>

        {notice && (
          <div
            className={`fv-orders-notice ${notice.type}`}
            role="status"
          >
            <i
              className={`bi ${
                notice.type === "success"
                  ? "bi-check-circle-fill"
                  : "bi-exclamation-circle-fill"
              }`}
            />

            <span>{notice.message}</span>

            <button
              onClick={() => setNotice(null)}
              aria-label="Dismiss notification"
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>
        )}

        <section className="fv-orders-hero">
          <div>
            <span className="fv-orders-hero-label">
              FOOD BUSINESS OPERATIONS
            </span>

            <h2>Every order, beautifully managed.</h2>

            <p>
              Stay on top of new orders, preparation and customer
              pickups from one place.
            </p>
          </div>

          <div className="fv-orders-hero-icon">
            <i className="bi bi-bag-heart" />
          </div>
        </section>

        <section className="fv-orders-stats">
          {[
            {
              label: "Total Orders",
              value: stats.total,
              icon: "bi-bag-check"
            },
            {
              label: "Paid & Pending",
              value: stats.pending,
              icon: "bi-clock-history"
            },
            {
              label: "Packing",
              value: stats.packing,
              icon: "bi-box-seam"
            },
            {
              label: "Ready for Pickup",
              value: stats.ready,
              icon: "bi-check2-circle"
            },
            {
              label: "Completed",
              value: stats.completed,
              icon: "bi-patch-check"
            },
            {
              label: "Paid Order Value",
              value: money(stats.revenue),
              icon: "bi-cash-stack"
            }
          ].map((stat) => (
            <div className="fv-orders-stat" key={stat.label}>
              <div className="fv-orders-stat-icon">
                <i className={`bi ${stat.icon}`} />
              </div>

              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </section>

        <section className="fv-orders-panel">
          <div className="fv-orders-panel-heading">
            <div>
              <span>ORDER MANAGEMENT</span>
              <h2>All Customer Orders</h2>
              <p>
                {filteredOrders.length} order
                {filteredOrders.length !== 1 ? "s" : ""} shown
              </p>
            </div>
          </div>

          <div className="fv-orders-filters">
            <div className="fv-orders-search">
              <i className="bi bi-search" />

              <input
                type="search"
                placeholder="Search customer, reference or food..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              aria-label="Filter by order status"
            >
              <option value="all">All Order Statuses</option>
              <option value="pending">Pending</option>
              <option value="packing">Packing</option>
              <option value="ready">Ready</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(event) =>
                setPaymentFilter(event.target.value)
              }
              aria-label="Filter by payment status"
            >
              <option value="all">All Payments</option>
              <option value="pending">Pending Payment</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refund_pending">Refund Pending</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {loading ? (
            <div className="fv-orders-empty">
              <div className="fv-orders-loader" />
              <h3>Loading customer orders...</h3>
              <p>Please wait while we retrieve your orders.</p>
            </div>
          ) : error ? (
            <div className="fv-orders-empty">
              <i className="bi bi-exclamation-triangle" />
              <h3>Unable to load orders</h3>
              <p>{error}</p>

              <button onClick={() => loadOrders()}>
                Try Again
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="fv-orders-empty">
              <i className="bi bi-bag-x" />

              <h3>
                {orders.length === 0
                  ? "No customer orders yet"
                  : "No matching orders"}
              </h3>

              <p>
                {orders.length === 0
                  ? "Orders placed for your food items will appear here."
                  : "Try changing your search or filters."}
              </p>

              {orders.length > 0 && (
                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setPaymentFilter("all");
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="fv-orders-table-wrap">
              <table className="fv-orders-table">
                <thead>
                  <tr>
                    <th>Order Reference</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Order Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order._id}>
                      <td>
                        <strong className="fv-orders-reference">
                          {order.orderReference}
                        </strong>
                      </td>

                      <td>
                        <strong>
                          {getCustomerName(order.user)}
                        </strong>

                        <small>
                          {order.user?.email || "—"}
                        </small>
                      </td>

                      <td>
                        {(order.items || [])
                          .map(
                            (item) =>
                              `${item.name} ×${item.quantity}`
                          )
                          .join(", ")}
                      </td>

                      <td>
                        <strong>
                          {money(order.totalAmount)}
                        </strong>
                      </td>

                      <td>
                        {renderStatus(
                          order.paymentStatus,
                          "payment"
                        )}
                      </td>

                      <td>
                        {renderStatus(order.orderStatus)}
                      </td>

                      <td>{formatDate(order.createdAt)}</td>

                      <td>
                        <button
                          className="fv-orders-view"
                          onClick={() => openOrder(order)}
                        >
                          View
                          <i className="bi bi-arrow-up-right" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="fv-orders-footer">
          <span>VIBELY FOOD VENDOR</span>
          <span>Making every order count.</span>
        </div>
      </div>

      {selectedOrder && (
        <div
          className="fv-orders-modal-overlay"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="fv-orders-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Order details"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fv-orders-modal-header">
              <div>
                <span>ORDER DETAILS</span>
                <h2>{selectedOrder.orderReference}</h2>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                aria-label="Close order details"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="fv-orders-modal-body">
              <div className="fv-orders-detail-statuses">
                {renderStatus(selectedOrder.orderStatus)}
                {renderStatus(
                  selectedOrder.paymentStatus,
                  "payment"
                )}
              </div>

              <div className="fv-orders-detail-grid">
                <div>
                  <span>Customer</span>
                  <strong>
                    {getCustomerName(selectedOrder.user)}
                  </strong>
                </div>

                <div>
                  <span>Email</span>
                  <strong>
                    {selectedOrder.user?.email || "—"}
                  </strong>
                </div>

                <div>
                  <span>Order Date</span>
                  <strong>
                    {formatDate(selectedOrder.createdAt)}
                  </strong>
                </div>

                <div>
                  <span>Pickup Status</span>
                  <strong>
                    {selectedOrder.orderStatus === "completed"
                      ? "Collected"
                      : selectedOrder.orderStatus === "ready"
                      ? "Ready for collection"
                      : "Not yet collected"}
                  </strong>
                </div>
              </div>

              <div className="fv-orders-items">
                <h3>Ordered Items</h3>

                {(selectedOrder.items || []).map(
                  (item, index) => (
                    <div
                      className="fv-orders-item"
                      key={`${item.food?._id || item.food}-${index}`}
                    >
                      <div className="fv-orders-item-icon">
                        <i className="bi bi-egg-fried" />
                      </div>

                      <div>
                        <strong>{item.name}</strong>
                        <small>
                          {money(item.price)} × {item.quantity}
                        </small>
                      </div>

                      <strong>{money(item.subtotal)}</strong>
                    </div>
                  )
                )}
              </div>

              <div className="fv-orders-total">
                <span>Total Amount</span>
                <strong>
                  {money(selectedOrder.totalAmount)}
                </strong>
              </div>

              {selectedOrder.orderStatus === "ready" && (
                <div className="fv-orders-pickup-note">
                  <i className="bi bi-qr-code-scan" />

                  <div>
                    <strong>Ready for Customer Pickup</strong>

                    <p>
                      Verify the pickup code provided by the
                      customer before confirming collection.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="fv-orders-modal-footer">
              <button
                className="fv-orders-outline"
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </button>

              {getNextStatus(selectedOrder) && (
                <button
                  className="fv-orders-primary"
                  onClick={() =>
                    setConfirmOrder(selectedOrder)
                  }
                >
                  {getNextStatus(selectedOrder) === "packing"
                    ? "Start Packing"
                    : "Mark as Ready"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmOrder && (
        <div className="fv-orders-modal-overlay">
          <div
            className="fv-orders-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirm order status update"
          >
            <div className="fv-orders-confirm-icon">
              <i className="bi bi-bag-check" />
            </div>

            <h2>Update Order Status?</h2>

            <p>
              Change order{" "}
              <strong>{confirmOrder.orderReference}</strong>{" "}
              to{" "}
              <strong>
                {getNextStatus(confirmOrder)}
              </strong>
              ?
            </p>

            <div className="fv-orders-confirm-actions">
              <button
                onClick={() => setConfirmOrder(null)}
                disabled={Boolean(updatingId)}
              >
                Cancel
              </button>

              <button
                onClick={updateOrderStatus}
                disabled={Boolean(updatingId)}
              >
                {updatingId ? "Updating..." : "Yes, Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodVendorOrders;
