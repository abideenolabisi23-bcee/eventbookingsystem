import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import Navbar from "../component/Navbar";
import DetailFooter from "../component/DetailFooter";

import vibelyLogo from "../assets/vibely-logo.png";

import "../styles/myFoodOrders.css";

const MyFoodOrders = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      const accessToken =
        localStorage.getItem("accessToken");

      if (!accessToken) {
        navigate("/login", {
          state: {
            returnTo: "/my-food-orders",
          },
        });

        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          "https://eventbookingsystem-sooty.vercel.app/api/v1/food-orders/my",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        setOrders(response.data.data || []);
      } catch (error) {
        console.log(
          "MY FOOD ORDERS ERROR:",
          error
        );

        if (error.response?.status === 401) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");

          navigate("/login", {
            state: {
              returnTo: "/my-food-orders",
            },
          });

          return;
        }

        setError(
          error.response?.data?.message ||
          "Cannot load your food orders."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [navigate]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  const formatDate = (date) => {
    if (!date) {
      return "Not available";
    }

    return new Date(date).toLocaleDateString(
      "en-NG",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  };

  const formatStatus = (status) => {
    if (!status) {
      return "Pending";
    }

    return status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  const paidOrders = orders.filter(
    (order) => order.paymentStatus === "paid"
  ).length;

  const readyOrders = orders.filter(
    (order) =>
      order.orderStatus === "ready" ||
      order.orderStatus === "completed"
  ).length;

  const processingOrders = orders.filter(
    (order) =>
      order.orderStatus === "processing" ||
      order.orderStatus === "pending"
  ).length;

  return (
    <>
      <Navbar />

      <main className="my-food-orders-page">
        <section className="my-food-orders-hero">
          <div className="food-hero-circle food-circle-one"></div>
          <div className="food-hero-circle food-circle-two"></div>

          <div className="my-food-hero-inner">
            <div className="my-food-hero-copy">
              <span className="my-food-eyebrow">
                YOUR VIBELY ORDERS
              </span>

              <h1>
                My Food
                <em> Orders.</em>
              </h1>

              <p>
                Your meals, payments and pickup
                details, beautifully organised
                in one place.
              </p>
            </div>

            <div className="my-food-hero-card">
              <img
                src={vibelyLogo}
                alt="Vibely"
              />

              <div>
                <span>MY ORDERS</span>

                <strong>
                  {orders.length}{" "}
                  {orders.length === 1
                    ? "Order"
                    : "Orders"}
                </strong>

                <p>FOOD · VIBELY</p>
              </div>
            </div>
          </div>
        </section>

        <section className="my-food-orders-content">
          <div className="my-food-container">
            {loading && (
              <div className="my-food-state">
                <div className="my-food-loader"></div>

                <h3>
                  Loading your orders...
                </h3>

                <p>
                  We're getting your food
                  orders ready.
                </p>
              </div>
            )}

            {!loading && error && (
              <div className="my-food-state">
                <div className="my-food-state-icon">
                  <i className="bi bi-exclamation-circle"></i>
                </div>

                <span className="my-food-state-label">
                  SOMETHING WENT WRONG
                </span>

                <h3>
                  Unable to load orders
                </h3>

                <p>{error}</p>

                <button
                  type="button"
                  onClick={() =>
                    window.location.reload()
                  }
                >
                  Try Again
                  <i className="bi bi-arrow-clockwise"></i>
                </button>
              </div>
            )}

            {!loading &&
              !error &&
              orders.length === 0 && (
                <div className="my-food-state">
                  <div className="my-food-state-icon">
                    <i className="bi bi-bag-heart"></i>
                  </div>

                  <span className="my-food-state-label">
                    YOUR ORDERS
                  </span>

                  <h3>
                    No food orders yet
                  </h3>

                  <p>
                    Find something delicious
                    on Vibely. Your food orders
                    and pickup information will
                    appear here.
                  </p>

                  <Link to="/food">
                    Explore Food
                    <i className="bi bi-arrow-right"></i>
                  </Link>
                </div>
              )}

            {!loading &&
              !error &&
              orders.length > 0 && (
                <>
                  <section className="my-food-summary">
                    <div className="food-summary-card">
                      <div className="food-summary-icon">
                        <i className="bi bi-bag"></i>
                      </div>

                      <div>
                        <span>
                          ALL ORDERS
                        </span>

                        <strong>
                          {orders.length}
                        </strong>

                        <p>
                          Total food orders
                        </p>
                      </div>
                    </div>

                    <div className="food-summary-card">
                      <div className="food-summary-icon">
                        <i className="bi bi-credit-card"></i>
                      </div>

                      <div>
                        <span>PAID</span>

                        <strong>
                          {paidOrders}
                        </strong>

                        <p>
                          Completed payments
                        </p>
                      </div>
                    </div>

                    <div className="food-summary-card">
                      <div className="food-summary-icon">
                        <i className="bi bi-fire"></i>
                      </div>

                      <div>
                        <span>
                          PROCESSING
                        </span>

                        <strong>
                          {processingOrders}
                        </strong>

                        <p>
                          Being prepared
                        </p>
                      </div>
                    </div>

                    <div className="food-summary-card">
                      <div className="food-summary-icon">
                        <i className="bi bi-check-circle"></i>
                      </div>

                      <div>
                        <span>
                          READY / DONE
                        </span>

                        <strong>
                          {readyOrders}
                        </strong>

                        <p>
                          Ready or completed
                        </p>
                      </div>
                    </div>
                  </section>

                  <div className="my-food-orders-heading">
                    <div>
                      <span>
                        YOUR ORDERS
                      </span>

                      <h2>
                        Your food collection
                      </h2>

                      <p>
                        Track your meals,
                        payment status and
                        pickup information.
                      </p>
                    </div>

                    <Link
                      to="/food"
                      className="order-more-food"
                    >
                      Order Food
                      <i className="bi bi-arrow-right"></i>
                    </Link>
                  </div>

                  <div className="my-food-orders-grid">
                    {orders.map(
                      (order, index) => {
                        const food =
                          order.food;

                        return (
                          <article
                            className="my-food-order-card"
                            key={order._id}
                          >
                            <div className="my-food-order-image">
                              {food?.image ? (
                                <img
                                  src={food.image}
                                  alt={
                                    food?.name ||
                                    "Food"
                                  }
                                />
                              ) : (
                                <div className="my-food-image-placeholder">
                                  <i className="bi bi-cup-hot"></i>
                                </div>
                              )}

                              <div className="my-food-image-overlay"></div>

                              <div className="my-food-image-top">
                                <span>
                                  ORDER{" "}
                                  {String(
                                    index + 1
                                  ).padStart(
                                    2,
                                    "0"
                                  )}
                                </span>

                                <span
                                  className={`food-order-status ${order.orderStatus || ""}`}
                                >
                                  <i
                                    className={
                                      order.orderStatus ===
                                        "ready" ||
                                        order.orderStatus ===
                                        "completed"
                                        ? "bi bi-check-circle-fill"
                                        : order.orderStatus ===
                                          "cancelled"
                                          ? "bi bi-x-circle-fill"
                                          : "bi bi-clock-fill"
                                    }
                                  ></i>

                                  {formatStatus(
                                    order.orderStatus
                                  )}
                                </span>
                              </div>

                              <div className="my-food-image-content">
                                <span>
                                  {food?.category ||
                                    "VIBELY FOOD"}
                                </span>

                                <h3>
                                  {food?.name ||
                                    "Food Order"}
                                </h3>

                                <p>
                                  <i className="bi bi-calendar3"></i>
                                  Ordered{" "}
                                  {formatDate(
                                    order.createdAt
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="my-food-order-body">
                              <div className="my-food-statuses">
                                <span
                                  className={`food-payment-status ${order.paymentStatus || ""}`}
                                >
                                  <i
                                    className={
                                      order.paymentStatus ===
                                        "paid"
                                        ? "bi bi-check-circle-fill"
                                        : order.paymentStatus ===
                                          "failed"
                                          ? "bi bi-x-circle-fill"
                                          : order.paymentStatus ===
                                            "refunded" ||
                                            order.paymentStatus ===
                                            "refund_pending"
                                            ? "bi bi-arrow-counterclockwise"
                                            : "bi bi-clock"
                                    }
                                  ></i>

                                  {formatStatus(
                                    order.paymentStatus
                                  )}
                                </span>

                                {food?.category && (
                                  <span className="my-food-category-badge">
                                    <i className="bi bi-cup-hot"></i>
                                    {food.category}
                                  </span>
                                )}
                              </div>

                              <div className="my-food-order-information">
                                <div>
                                  <div className="food-info-icon">
                                    <i className="bi bi-bag"></i>
                                  </div>

                                  <div>
                                    <span>
                                      QUANTITY
                                    </span>

                                    <strong>
                                      {order.quantity ||
                                        0}
                                    </strong>
                                  </div>
                                </div>

                                <div>
                                  <div className="food-info-icon">
                                    <i className="bi bi-tag"></i>
                                  </div>

                                  <div>
                                    <span>
                                      PRICE PER ITEM
                                    </span>

                                    <strong>
                                      {formatPrice(
                                        order.pricePerItem ||
                                        food?.price
                                      )}
                                    </strong>
                                  </div>
                                </div>
                              </div>

                              {order.pickupCode && (
                                <div className="food-pickup-code">
                                  <div className="pickup-code-icon">
                                    <i className="bi bi-qr-code"></i>
                                  </div>

                                  <div>
                                    <span>
                                      PICKUP CODE
                                    </span>

                                    <strong>
                                      {
                                        order.pickupCode
                                      }
                                    </strong>

                                    <small>
                                      Present this
                                      code when
                                      collecting your
                                      order.
                                    </small>
                                  </div>
                                </div>
                              )}

                              <div className="my-food-total-row">
                                <div>
                                  <span>
                                    ORDER TOTAL
                                  </span>

                                  <strong>
                                    {formatPrice(
                                      order.totalAmount
                                    )}
                                  </strong>
                                </div>

                                <div className="my-food-payment-label">
                                  <span>
                                    PAYMENT
                                  </span>

                                  <strong>
                                    {formatStatus(
                                      order.paymentStatus
                                    )}
                                  </strong>
                                </div>
                              </div>

                              <Link
                                to={`/my-food-orders/${order._id}`}
                                className="my-food-view-button"
                              >
                                <span>
                                  View Order Details
                                </span>

                                <i className="bi bi-arrow-right"></i>
                              </Link>
                            </div>

                            <div className="my-food-card-bottom">
                              <div>
                                <img
                                  src={
                                    vibelyLogo
                                  }
                                  alt="Vibely"
                                />

                                <div>
                                  <strong>
                                    VIBELY
                                  </strong>

                                  <span>
                                    FOOD ORDER
                                  </span>
                                </div>
                              </div>

                              <span>
                                Taste the vibe.
                              </span>
                            </div>
                          </article>
                        );
                      }
                    )}
                  </div>

                  <div className="my-food-help-card">
                    <div className="my-food-help-icon">
                      <i className="bi bi-qr-code-scan"></i>
                    </div>

                    <div>
                      <span>
                        PICKUP READY
                      </span>

                      <h3>
                        Don't forget your
                        pickup code.
                      </h3>

                      <p>
                        When your order has a
                        pickup code, keep it
                        ready and present it
                        when collecting your
                        meal.
                      </p>
                    </div>

                    <Link to="/food">
                      Order More Food
                      <i className="bi bi-arrow-right"></i>
                    </Link>
                  </div>
                </>
              )}
          </div>
        </section>
      </main>

      <DetailFooter />
    </>
  );
};

export default MyFoodOrders;