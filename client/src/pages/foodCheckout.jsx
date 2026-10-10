
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import Navbar from "../component/Navbar";
import DetailFooter from "../component/DetailFooter";
import { getFoodCart } from "../utils/foodCart";

import "../styles/foodCheckout.css";

const API =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const formatPrice = (price) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(price) || 0);
};

const FoodCheckout = () => {
  const navigate = useNavigate();

  const [cart, setCart] = useState(getFoodCart);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [confirmedTotal, setConfirmedTotal] = useState(null);

  const submittingRef = useRef(false);

  const [priceConfirmation, setPriceConfirmation] = useState(null);

const getCartSignature = (items) =>
  JSON.stringify(
    items
      .map((item) => ({
        foodId: String(item.foodId),
        quantity: Number(item.quantity)
      }))
      .sort((a, b) => a.foodId.localeCompare(b.foodId))
  );

const readPendingCheckout = () => {
  try {
    return JSON.parse(
      sessionStorage.getItem("vibelyFoodCheckout") || "null"
    );
  } catch {
    return null;
  }
};

  useEffect(() => {
    const token = localStorage.getItem("userAccessToken");

    if (!token) {
      navigate("/login", {
        replace: true,
        state: {
          returnTo: "/food-checkout"
        }
      });

      return;
    }

    const items = getFoodCart();

    if (!items.length) {
      navigate("/food-cart", {
        replace: true
      });

      return;
    }

    setCart(items);
    setChecking(false);
  }, [navigate]);

  const subtotal = cart.reduce(
    (sum, item) =>
      sum + Number(item.price) * Number(item.quantity),
    0
  );

  const totalQuantity = cart.reduce(
    (sum, item) => sum + Number(item.quantity),
    0
  );

  
const handlePayment = async () => {
  if (submittingRef.current) return;

  const token = localStorage.getItem("userAccessToken");

  if (!token) {
    navigate("/login", {
      state: {
        returnTo: "/food-checkout"
      }
    });
    return;
  }

  const currentCart = getFoodCart();

  if (!currentCart.length) {
    navigate("/food-cart");
    return;
  }

  const signature = getCartSignature(currentCart);

  submittingRef.current = true;
  setLoading(true);
  setError("");

  try {
    let savedCheckout = readPendingCheckout();

    if (
      savedCheckout &&
      savedCheckout.signature !== signature
    ) {
      sessionStorage.removeItem("vibelyFoodCheckout");
      savedCheckout = null;
      setPriceConfirmation(null);
    }

    let orderId = savedCheckout?.orderId;
    let serverTotal = savedCheckout?.totalAmount;

    if (!orderId) {
      const response = await axios.post(
        `${API}/food-orders`,
        {
          items: currentCart.map((item) => ({
            foodId: item.foodId,
            quantity: Number(item.quantity)
          }))
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const createdOrder = response.data?.data;

      orderId = createdOrder?._id;
      serverTotal = Number(createdOrder?.totalAmount);

      if (
        !orderId ||
        !Number.isSafeInteger(serverTotal) ||
        serverTotal <= 0
      ) {
        throw new Error(
          "The server returned incomplete order information."
        );
      }

      savedCheckout = {
        orderId,
        totalAmount: serverTotal,
        signature
      };

      sessionStorage.setItem(
        "vibelyFoodCheckout",
        JSON.stringify(savedCheckout)
      );
    }

    setConfirmedTotal(serverTotal);

    const currentSubtotal = currentCart.reduce(
      (total, item) =>
        total +
        Number(item.price) * Number(item.quantity),
      0
    );

    if (
      serverTotal !== currentSubtotal &&
      priceConfirmation !==
        `${orderId}:${serverTotal}`
    ) {
      setPriceConfirmation(`${orderId}:${serverTotal}`);

      setError(
        `The current food prices have changed. Your updated total is ${formatPrice(
          serverTotal
        )}. Please review this amount and click Pay Securely again to confirm.`
      );

      return;
    }

    const paymentResponse = await axios.post(
      `${API}/food-payments/initialize`,
      { orderId },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const authorizationUrl =
      paymentResponse.data?.data?.authorizationUrl;

    if (!authorizationUrl) {
      throw new Error(
        "Paystack did not return a payment link."
      );
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

    sessionStorage.setItem(
      "vibelyPendingFoodOrderId",
      String(orderId)
    );

    sessionStorage.setItem(
      "vibelyPendingFoodCart",
      JSON.stringify(
        currentCart.map((item) => ({
          foodId: item.foodId,
          quantity: Number(item.quantity)
        }))
      )
    );

    window.location.assign(paymentUrl.href);
  } catch (requestError) {
    const responseStatus = requestError.response?.status;
    const responseMessage =
      requestError.response?.data?.message;

    if (responseStatus === 401) {
      setError(
        "Your session has expired. Please log in again."
      );
      return;
    }

    if (responseStatus === 409) {
      setError(
        responseMessage ||
          "This order already has a payment in progress. Check My Food Orders before trying again."
      );
      return;
    }

    setError(
      responseMessage ||
        requestError.message ||
        "Unable to start payment. Please try again."
    );
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
              Review your delicious selections and complete
              your payment securely.
            </p>
          </div>

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
                      {totalQuantity === 1
                        ? "item"
                        : "items"}{" "}
                      selected
                    </p>
                  </div>
                </div>

                {cart.map((item) => (
                  <div
                    className="food-checkout-item"
                    key={item.foodId}
                  >
                    <div className="food-checkout-image">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                        />
                      ) : (
                        <i className="bi bi-cup-hot"></i>
                      )}
                    </div>

                    <div className="food-checkout-item-info">
                      <h3>{item.name}</h3>

                      <span>
                        {formatPrice(item.price)} ×{" "}
                        {item.quantity}
                      </span>
                    </div>

                    <strong>
                      {formatPrice(
                        item.price * item.quantity
                      )}
                    </strong>
                  </div>
                ))}

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
                      Your payment will be processed
                      securely by Paystack.
                    </p>
                  </div>
                </div>

                <div className="food-checkout-payment-info">
                  <i className="bi bi-credit-card"></i>

                  <div>
                    <strong>Paystack Checkout</strong>
                    <span>
                      You will be redirected to Paystack
                      to complete payment.
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
                <span>Items</span>
                <strong>{totalQuantity}</strong>
              </div>

              <div className="food-checkout-summary-row">
                <span>Cart subtotal</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>

              <div className="food-checkout-divider"></div>

              <div className="food-checkout-total">
                <span>
                  {confirmedTotal !== null
                    ? "Confirmed order total"
                    : "Estimated total"}
                </span>

                <strong>
                  {formatPrice(
                    confirmedTotal !== null
                      ? confirmedTotal
                      : subtotal
                  )}
                </strong>
              </div>

              <p className="food-checkout-note">
                The final amount is calculated using
                current food prices from the server.
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

              <button
                type="button"
                className="food-checkout-pay"
                onClick={handlePayment}
                disabled={loading || !cart.length}
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
        </div>
      </main>

      <DetailFooter />
    </>
  );
};

export default FoodCheckout;
