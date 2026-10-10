
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import Navbar from "./Navbar";
import DetailFooter from "./DetailFooter";
import { getFoodCart } from "../utils/foodCart";

import "../styles/foodCheckout.css";

const API =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const formatPrice = (price) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(price) || 0);

const FoodCheckout = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [priceConfirmed, setPriceConfirmed] = useState(false);

  const submittingRef = useRef(false);

  useEffect(() => {
    let active = true;

    const loadOrder = async () => {
      const token = localStorage.getItem("userAccessToken");

      if (!token) {
        navigate("/login", {
          replace: true,
          state: {
            returnTo: `/food-checkout/${orderId}`
          }
        });
        return;
      }

      try {
        const response = await axios.get(
          `${API}/food-orders/${orderId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (!active) return;

        const fetchedOrder = response.data?.data;

        if (!fetchedOrder?._id) {
          throw new Error("Food order details were not returned.");
        }

        setOrder(fetchedOrder);
      } catch (requestError) {
        if (!active) return;

        setError(
          requestError.response?.data?.message ||
            requestError.message ||
            "Unable to load your food order."
        );
      } finally {
        if (active) setChecking(false);
      }
    };

    loadOrder();

    return () => {
      active = false;
    };
  }, [orderId, navigate]);

  const items = order?.items || [];

  const totalQuantity = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const totalAmount = Number(order?.totalAmount || 0);

  const savedCart = getFoodCart();

  const cartSubtotal = savedCart.reduce(
    (sum, item) =>
      sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

  const priceChanged =
    savedCart.length > 0 &&
    Math.abs(cartSubtotal - totalAmount) > 0.001;

  const handlePayment = async () => {
    if (submittingRef.current || !order) return;

    const token = localStorage.getItem("userAccessToken");

    if (!token) {
      navigate("/login", {
        state: {
          returnTo: `/food-checkout/${orderId}`
        }
      });
      return;
    }

    if (order.orderStatus === "cancelled") {
      setError("This food order has been cancelled.");
      return;
    }

    if (order.paymentStatus === "paid") {
      navigate(`/my-food-orders/${order._id}`);
      return;
    }

    if (
      ["refund_pending", "refunded"].includes(order.paymentStatus)
    ) {
      setError("This order is already in the refund process.");
      return;
    }

    if (priceChanged && !priceConfirmed) {
      setPriceConfirmed(true);
      setError(
        `The confirmed order total is ${formatPrice(totalAmount)}. Please review this amount and click Pay Securely again to continue.`
      );
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(
        `${API}/food-payments/initialize`,
        {
          orderId: order._id
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const authorizationUrl =
        response.data?.data?.authorizationUrl;

      if (!authorizationUrl) {
        throw new Error("Paystack did not return a payment link.");
      }

      const paymentUrl = new URL(authorizationUrl);

      if (
        paymentUrl.protocol !== "https:" ||
        !(
          paymentUrl.hostname === "paystack.com" ||
          paymentUrl.hostname.endsWith(".paystack.com")
        )
      ) {
        throw new Error("Invalid Paystack payment link.");
      }

      const pendingCheckout = JSON.parse(
        sessionStorage.getItem("vibelyFoodCheckout") || "null"
      );

      if (pendingCheckout?.orderId === String(order._id)) {
        sessionStorage.setItem(
          "vibelyPendingFoodOrderId",
          String(order._id)
        );

        sessionStorage.setItem(
          "vibelyPendingFoodCart",
          JSON.stringify(
            savedCart.map((item) => ({
              foodId: item.foodId,
              quantity: Number(item.quantity)
            }))
          )
        );
      }

      window.location.assign(paymentUrl.href);
    } catch (requestError) {
      const responseData = requestError.response?.data;

      if (requestError.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
      } else {
        setError(
          responseData?.message ||
            requestError.message ||
            "Unable to start payment. Please try again."
        );
      }
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <>
        <Navbar />
        <main className="food-checkout-page">
          <div className="food-checkout-loading">
            Preparing your checkout...
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="food-checkout-page">
        <div className="container">
          <div className="food-checkout-top">
            <Link to="/food-cart">
              <i className="bi bi-arrow-left"></i>
              Back to Cart
            </Link>

            <span>SECURE CHECKOUT</span>
            <h1>Almost time to eat!</h1>
            <p>
              Review your delicious selections and complete your
              payment securely.
            </p>
          </div>

          {!order ? (
            <div className="food-checkout-card">
              <h2>Unable to prepare checkout</h2>
              <p>{error}</p>
              <Link to="/food-cart">Return to Cart</Link>
            </div>
          ) : (
            <div className="food-checkout-layout">
              <section className="food-checkout-main">
                <div className="food-checkout-card">
                  <div className="food-checkout-card-heading">
                    <div className="food-checkout-icon">
                      <i className="bi bi-bag-check"></i>
                    </div>

                    <div>
                      <h2>Your Food Order</h2>
                      <p>
                        {totalQuantity}{" "}
                        {totalQuantity === 1 ? "item" : "items"} selected
                      </p>
                    </div>
                  </div>

                  {items.map((item, index) => {
                    const food = item.food || {};

                    return (
                      <div
                        className="food-checkout-item"
                        key={food._id || index}
                      >
                        <div className="food-checkout-image">
                          {food.image ? (
                            <img src={food.image} alt={item.name} />
                          ) : (
                            <i className="bi bi-cup-hot"></i>
                          )}
                        </div>

                        <div className="food-checkout-item-info">
                          <h3>{item.name}</h3>
                          <span>
                            {formatPrice(item.price)} × {item.quantity}
                          </span>
                        </div>

                        <strong>
                          {formatPrice(item.subtotal)}
                        </strong>
                      </div>
                    );
                  })}

                  <Link
                    to="/food-cart"
                    className="food-checkout-edit"
                  >
                    <i className="bi bi-pencil-square"></i>
                    Edit your food selection
                  </Link>
                </div>

                <div className="food-checkout-card">
                  <div className="food-checkout-card-heading">
                    <div className="food-checkout-icon">
                      <i className="bi bi-shield-lock"></i>
                    </div>

                    <div>
                      <h2>Secure Payment</h2>
                      <p>
                        Your payment will be processed securely
                        by Paystack.
                      </p>
                    </div>
                  </div>

                  <div className="food-checkout-payment-info">
                    <i className="bi bi-credit-card"></i>

                    <div>
                      <strong>Paystack Checkout</strong>
                      <span>
                        You will be redirected to Paystack to
                        complete payment.
                      </span>
                    </div>

                    <i className="bi bi-check-circle-fill"></i>
                  </div>
                </div>
              </section>

              <aside className="food-checkout-summary">
                <span className="food-checkout-eyebrow">
                  ORDER SUMMARY
                </span>

                <h2>Payment Details</h2>

                <div className="food-checkout-summary-row">
                  <span>Order reference</span>
                  <strong>{order.orderReference}</strong>
                </div>

                <div className="food-checkout-summary-row">
                  <span>Items</span>
                  <strong>{totalQuantity}</strong>
                </div>

                <div className="food-checkout-summary-row">
                  <span>Payment status</span>
                  <strong>{order.paymentStatus}</strong>
                </div>

                <div className="food-checkout-divider"></div>

                <div className="food-checkout-total">
                  <span>Confirmed order total</span>
                  <strong>{formatPrice(totalAmount)}</strong>
                </div>

                <p className="food-checkout-note">
                  This amount was calculated using food prices
                  from the server when your order was created.
                </p>

                {error && (
                  <div
                    className="food-checkout-error"
                    role="alert"
                  >
                    <i className="bi bi-exclamation-circle"></i>
                    <span>{error}</span>
                  </div>
                )}

                {order.paymentStatus === "paid" ? (
                  <Link
                    to={`/my-food-orders/${order._id}`}
                    className="food-checkout-pay"
                  >
                    View Paid Order
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="food-checkout-pay"
                    onClick={handlePayment}
                    disabled={
                      loading ||
                      order.orderStatus === "cancelled" ||
                      ["refund_pending", "refunded"].includes(
                        order.paymentStatus
                      )
                    }
                  >
                    {loading ? (
                      <>
                        <span className="food-checkout-spinner"></span>
                        Preparing Payment...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-lock-fill"></i>
                        Pay Securely
                        <i className="bi bi-arrow-right"></i>
                      </>
                    )}
                  </button>
                )}

                <div className="food-checkout-trust">
                  <i className="bi bi-shield-check"></i>
                  Your payment is handled by Paystack
                </div>

                <Link
                  to="/food"
                  className="food-checkout-continue"
                >
                  Continue Shopping
                </Link>
              </aside>
            </div>
          )}
        </div>
      </main>

      <DetailFooter />
    </>
  );
};

export default FoodCheckout;
