import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../component/Navbar";
import "../styles/orderDetails.css";

function FoodOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      const accessToken = localStorage.getItem("accessToken");

      if (!accessToken) {
        navigate("/login", {
          state: {
            returnTo: `/my-food-orders/${id}`,
          },
        });
        return;
      }

      try {
        const response = await axios.get(
          `http://192.168.0.3:5005/api/v1/food-orders/${id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        setOrder(response.data.data);
      } catch (error) {
        setError(
          error.response?.data?.message ||
          "Cannot fetch this food order."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, navigate]);

  const formatMoney = (amount) => {
    return `₦${Number(amount || 0).toLocaleString()}`;
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatStatus = (status) => {
    if (!status) return "Pending";

    return status.replaceAll("_", " ");
  };

  if (loading) {
    return (
      <>
        <Navbar />

        <main className="account-detail-page">
          <div className="detail-state">
            <div className="detail-loader"></div>
            <p>Loading your food order...</p>
          </div>
        </main>
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <Navbar />

        <main className="account-detail-page">
          <div className="detail-state detail-error-state">
            <h2>Order unavailable</h2>
            <p>{error}</p>

            <Link
              to="/my-food-orders"
              className="detail-primary-button"
            >
              Back to My Food Orders
            </Link>
          </div>
        </main>
      </>
    );
  }

  const vendorName =
    order.vendor?.businessName ||
    `${order.vendor?.firstname || ""} ${order.vendor?.lastname || ""
      }`.trim() ||
    "Food Vendor";

  return (
    <>
      <Navbar />

      <main className="account-detail-page">
        <div className="account-detail-container">
          <div className="detail-back-row">
            <Link
              to="/my-food-orders"
              className="detail-back-link"
            >
              ← My Food Orders
            </Link>
          </div>

          <section className="detail-header-card">
            <div>
              <span className="detail-eyebrow">
                FOOD ORDER
              </span>

              <h1>Your Order</h1>

              <p>
                Order reference:{" "}
                <strong>{order.orderReference}</strong>
              </p>
            </div>

            <div className="detail-statuses">
              <span
                className={`detail-status ${order.orderStatus}`}
              >
                {formatStatus(order.orderStatus)}
              </span>

              <span
                className={`detail-status ${order.paymentStatus}`}
              >
                {formatStatus(order.paymentStatus)}
              </span>
            </div>
          </section>

          {order.pickupCode && (
            <section className="pickup-code-card">
              <span>YOUR PICKUP CODE</span>

              <strong>{order.pickupCode}</strong>

              <p>
                Show this code to the vendor when collecting
                your food.
              </p>
            </section>
          )}

          <div className="detail-grid">
            <section className="detail-main-card">
              <div className="detail-section-heading">
                <span>ORDER ITEMS</span>
                <h2>What you ordered</h2>
              </div>

              <div className="food-order-items">
                {order.items?.map((item, index) => (
                  <div
                    className="food-order-item"
                    key={item._id || index}
                  >
                    <div className="food-order-item-image">
                      {item.food?.image ? (
                        <img
                          src={item.food.image}
                          alt={item.name}
                        />
                      ) : (
                        <div className="food-image-placeholder">
                          <i className="bi bi-bag"></i>
                        </div>
                      )}
                    </div>

                    <div className="food-order-item-info">
                      <h3>{item.name}</h3>

                      {item.food?.category && (
                        <span>
                          {item.food.category}
                        </span>
                      )}

                      <p>
                        {formatMoney(item.price)} ×{" "}
                        {item.quantity}
                      </p>
                    </div>

                    <strong className="food-order-subtotal">
                      {formatMoney(item.subtotal)}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="detail-total-row">
                <span>Total</span>
                <strong>
                  {formatMoney(order.totalAmount)}
                </strong>
              </div>
            </section>

            <aside className="detail-side-card">
              <div className="detail-section-heading">
                <span>ORDER DETAILS</span>
                <h2>Information</h2>
              </div>

              <div className="detail-information-list">
                <div>
                  <span>Vendor</span>
                  <strong>{vendorName}</strong>
                </div>

                {order.vendor?.phone && (
                  <div>
                    <span>Vendor Phone</span>
                    <strong>{order.vendor.phone}</strong>
                  </div>
                )}

                <div>
                  <span>Order Status</span>
                  <strong>
                    {formatStatus(order.orderStatus)}
                  </strong>
                </div>

                <div>
                  <span>Payment Status</span>
                  <strong>
                    {formatStatus(order.paymentStatus)}
                  </strong>
                </div>

                <div>
                  <span>Ordered</span>
                  <strong>
                    {formatDate(order.createdAt)}
                  </strong>
                </div>

                {order.collectedAt && (
                  <div>
                    <span>Collected</span>
                    <strong>
                      {formatDate(order.collectedAt)}
                    </strong>
                  </div>
                )}
              </div>

              <Link
                to="/food"
                className="detail-primary-button"
              >
                Order More Food
              </Link>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}

export default FoodOrderDetails;