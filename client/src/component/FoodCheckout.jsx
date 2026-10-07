import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "./Navbar";
import DetailFooter from "./DetailFooter";
import "../styles/foodCheckout.css";

const FoodCheckout = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState({
    show: false,
    type: "",
    message: ""
  });

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const getToken = () => {
    return localStorage.getItem("accessToken");
  };

  const showNotification = (type, message) => {
    setNotification({
      show: true,
      type,
      message
    });

    setTimeout(() => {
      setNotification({
        show: false,
        type: "",
        message: ""
      });
    }, 4000);
  };

  const fetchOrder = async () => {
    const token = getToken();

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `http://https://eventbookingsystem-sooty.vercel.app/api/v1/food-orders/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setOrder(response.data?.data || null);
    } catch (error) {
      console.log(error);

      setError(
        error.response?.data?.message ||
        "We couldn't load your food order."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0
    }).format(Number(price) || 0);
  };

  const getVendorName = () => {
    if (order?.vendor?.businessName) {
      return order.vendor.businessName;
    }

    const name = `${order?.vendor?.firstname || ""} ${order?.vendor?.lastname || ""
      }`.trim();

    return name || "Vibely Food Vendor";
  };

  const handlePayment = async () => {
    const token = getToken();

    if (!token) {
      navigate("/login");
      return;
    }

    if (!order?._id) {
      showNotification(
        "error",
        "Your order information is unavailable."
      );
      return;
    }

    if (order.paymentStatus === "paid") {
      showNotification(
        "success",
        "This food order has already been paid for."
      );

      setTimeout(() => {
        navigate(`/food-orders/${order._id}`);
      }, 1000);

      return;
    }

    if (order.orderStatus === "cancelled") {
      showNotification(
        "error",
        "This order has been cancelled and cannot be paid for."
      );
      return;
    }

    try {
      setPaying(true);

      const response = await axios.post(
        "http://https://eventbookingsystem-sooty.vercel.app/api/v1/food-payments/initialize",
        {
          orderId: order._id
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = response.data?.data || response.data;

      const authorizationUrl =
        data?.authorization_url ||
        data?.authorizationUrl ||
        data?.paymentUrl ||
        data?.url;

      if (!authorizationUrl) {
        throw new Error(
          "Paystack authorization URL was not returned"
        );
      }

      window.location.href = authorizationUrl;
    } catch (error) {
      console.log(error);

      showNotification(
        "error",
        error.response?.data?.message ||
        "We couldn't start your payment. Please try again."
      );

      setPaying(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />

        <main className="food-checkout-page">
          <div className="food-checkout-loading">
            <div className="food-checkout-spinner"></div>

            <h2>Preparing checkout...</h2>

            <p>We're getting your food order ready.</p>
          </div>
        </main>

        <DetailFooter />
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <Navbar />

        <main className="food-checkout-page">
          <div className="food-checkout-error">
            <div className="food-checkout-error-icon">
              <i className="bi bi-exclamation-circle"></i>
            </div>

            <span>VIBELY FOOD</span>

            <h2>Checkout unavailable</h2>

            <p>
              {error ||
                "We couldn't find this food order."}
            </p>

            <Link to="/food">
              <i className="bi bi-arrow-left"></i>
              Return to Food
            </Link>
          </div>
        </main>

        <DetailFooter />
      </>
    );
  }

  const totalItems =
    order.items?.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    ) || 0;

  return (
    <>
      <Navbar />

      {notification.show && (
        <div
          className={`food-checkout-notification ${notification.type}`}
        >
          <div className="food-checkout-notification-icon">
            <i
              className={
                notification.type === "success"
                  ? "bi bi-check-lg"
                  : "bi bi-exclamation-lg"
              }
            ></i>
          </div>

          <div>
            <span>
              {notification.type === "success"
                ? "SUCCESS"
                : "PLEASE CHECK"}
            </span>

            <p>{notification.message}</p>
          </div>

          <button
            type="button"
            onClick={() =>
              setNotification({
                show: false,
                type: "",
                message: ""
              })
            }
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      )}

      <main className="food-checkout-page">
        <section className="food-checkout-hero">
          <div className="food-checkout-hero-inner">
            <Link to="/food" className="food-checkout-back">
              <i className="bi bi-arrow-left"></i>
              Continue browsing
            </Link>

            <div className="food-checkout-hero-content">
              <div>
                <div className="food-checkout-eyebrow">
                  <span></span>
                  SECURE CHECKOUT
                </div>

                <h1>
                  One last step
                  <em> before the good part.</em>
                </h1>

                <p>
                  Review your order and complete your payment
                  securely.
                </p>
              </div>

              <div className="food-checkout-secure-card">
                <div>
                  <i className="bi bi-shield-lock-fill"></i>
                </div>

                <span>PAYMENT PROTECTED</span>

                <strong>Secure checkout</strong>

                <p>
                  Your payment is processed securely through
                  Paystack.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="food-checkout-content">
          <div className="food-checkout-layout">
            <div className="food-checkout-main">
              <div className="food-checkout-section-heading">
                <div>
                  <span>YOUR ORDER</span>
                  <h2>Order summary</h2>
                </div>

                <div className="food-checkout-item-count">
                  {totalItems}{" "}
                  {totalItems === 1 ? "item" : "items"}
                </div>
              </div>

              <div className="food-checkout-vendor">
                <div className="food-checkout-vendor-icon">
                  <i className="bi bi-shop-window"></i>
                </div>

                <div>
                  <span>PREPARED BY</span>
                  <strong>{getVendorName()}</strong>
                </div>

                <div className="food-checkout-verified">
                  <i className="bi bi-patch-check-fill"></i>
                  Vibely Vendor
                </div>
              </div>

              <div className="food-checkout-items">
                {order.items?.map((item, index) => (
                  <div
                    className="food-checkout-item"
                    key={item._id || `${item.food}-${index}`}
                  >
                    <div className="food-checkout-item-image">
                      {item.food?.image ? (
                        <img
                          src={item.food.image}
                          alt={item.name}
                        />
                      ) : (
                        <div>
                          <i className="bi bi-bag-heart"></i>
                        </div>
                      )}

                      <span>{item.quantity}</span>
                    </div>

                    <div className="food-checkout-item-info">
                      <span>FOOD ITEM</span>
                      <h3>{item.name}</h3>

                      <p>
                        {formatPrice(item.price)} ×{" "}
                        {item.quantity}
                      </p>
                    </div>

                    <strong className="food-checkout-item-price">
                      {formatPrice(item.subtotal)}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="food-checkout-reference-card">
                <div>
                  <span className="food-checkout-reference-icon">
                    <i className="bi bi-receipt"></i>
                  </span>

                  <div>
                    <small>ORDER REFERENCE</small>
                    <strong>
                      {order.orderReference}
                    </strong>
                  </div>
                </div>

                <span
                  className={`food-checkout-status ${order.orderStatus}`}
                >
                  {order.orderStatus}
                </span>
              </div>

              <div className="food-checkout-info-grid">
                <div>
                  <span>
                    <i className="bi bi-bag-check"></i>
                  </span>

                  <div>
                    <strong>Pickup order</strong>
                    <small>
                      Pickup details become available after
                      successful payment.
                    </small>
                  </div>
                </div>

                <div>
                  <span>
                    <i className="bi bi-key"></i>
                  </span>

                  <div>
                    <strong>Unique pickup code</strong>
                    <small>
                      You'll receive your pickup code after
                      payment.
                    </small>
                  </div>
                </div>
              </div>
            </div>

            <aside className="food-checkout-payment-card">
              <div className="food-checkout-payment-header">
                <span>PAYMENT SUMMARY</span>

                <div>
                  <i className="bi bi-lock-fill"></i>
                  Secure
                </div>
              </div>

              <div className="food-checkout-payment-body">
                <div className="food-checkout-payment-row">
                  <span>Items</span>
                  <strong>{totalItems}</strong>
                </div>

                <div className="food-checkout-payment-row">
                  <span>Subtotal</span>

                  <strong>
                    {formatPrice(order.totalAmount)}
                  </strong>
                </div>

                <div className="food-checkout-payment-row">
                  <span>Service fee</span>
                  <strong>₦0</strong>
                </div>

                <div className="food-checkout-payment-divider"></div>

                <div className="food-checkout-total">
                  <div>
                    <span>TOTAL</span>
                    <small>
                      Amount due now
                    </small>
                  </div>

                  <strong>
                    {formatPrice(order.totalAmount)}
                  </strong>
                </div>

                <button
                  type="button"
                  className="food-checkout-pay-button"
                  onClick={handlePayment}
                  disabled={
                    paying ||
                    order.orderStatus === "cancelled"
                  }
                >
                  {paying ? (
                    <>
                      <span className="food-checkout-button-spinner"></span>
                      Connecting to Paystack...
                    </>
                  ) : (
                    <>
                      <span>
                        Pay {formatPrice(order.totalAmount)}
                      </span>

                      <i className="bi bi-arrow-right"></i>
                    </>
                  )}
                </button>

                <div className="food-checkout-paystack">
                  <span>
                    <i className="bi bi-shield-check"></i>
                  </span>

                  <div>
                    <strong>
                      Secure payment
                    </strong>

                    <small>
                      Powered by Paystack
                    </small>
                  </div>
                </div>

                <div className="food-checkout-payment-status">
                  <span>PAYMENT STATUS</span>

                  <strong
                    className={
                      order.paymentStatus === "paid"
                        ? "paid"
                        : ""
                    }
                  >
                    <i
                      className={
                        order.paymentStatus === "paid"
                          ? "bi bi-check-circle-fill"
                          : "bi bi-clock-fill"
                      }
                    ></i>

                    {order.paymentStatus}
                  </strong>
                </div>
              </div>

              <div className="food-checkout-payment-footer">
                <i className="bi bi-info-circle"></i>

                <p>
                  After successful payment, your order will
                  be confirmed and your pickup code will be
                  generated.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="food-checkout-confidence">
          <div className="food-checkout-confidence-inner">
            <div>
              <i className="bi bi-shield-check"></i>

              <span>
                <strong>Protected payment</strong>
                <small>
                  Secure transaction processing
                </small>
              </span>
            </div>

            <div>
              <i className="bi bi-receipt-cutoff"></i>

              <span>
                <strong>Order tracking</strong>
                <small>
                  Follow your food from order to pickup
                </small>
              </span>
            </div>

            <div>
              <i className="bi bi-bag-heart"></i>

              <span>
                <strong>Easy collection</strong>
                <small>
                  Collect with your unique pickup code
                </small>
              </span>
            </div>
          </div>
        </section>
      </main>

      <DetailFooter />
    </>
  );
};

export default FoodCheckout;