import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Navbar from "./Navbar";
import DetailFooter from "./DetailFooter";
import "../styles/foodPaymentSuccess.css";

const FoodPaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const reference =
    searchParams.get("reference") ||
    searchParams.get("trxref");

  useEffect(() => {
    verifyPayment();
  }, [reference]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0
    }).format(Number(price) || 0);
  };

  const getVendorName = (foodOrder) => {
    if (foodOrder?.vendor?.businessName) {
      return foodOrder.vendor.businessName;
    }

    const fullName = `${foodOrder?.vendor?.firstname || ""
      } ${foodOrder?.vendor?.lastname || ""}`.trim();

    return fullName || "Vibely Food Vendor";
  };

  const fetchOrder = async (orderId, token) => {
    const response = await axios.get(
      `http://https://eventbookingsystem-sooty.vercel.app/api/v1/food-orders/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    return response.data?.data || null;
  };

  const verifyPayment = async () => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      navigate("/login");
      return;
    }

    if (!reference) {
      setError(
        "The payment reference is missing. We couldn't verify this payment."
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `http://https://eventbookingsystem-sooty.vercel.app/api/v1/food-payments/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const responseData = response.data?.data || response.data;

      const orderId =
        responseData?.order?._id ||
        responseData?.order?.id ||
        responseData?.orderId ||
        responseData?.foodOrder?._id ||
        responseData?.foodOrder?.id;

      if (responseData?.order?.items) {
        setOrder(responseData.order);
        return;
      }

      if (responseData?.foodOrder?.items) {
        setOrder(responseData.foodOrder);
        return;
      }

      if (orderId) {
        const freshOrder = await fetchOrder(orderId, token);
        setOrder(freshOrder);
        return;
      }

      throw new Error(
        "Payment verified but order information was not returned."
      );
    } catch (error) {
      console.log(error);

      setError(
        error.response?.data?.message ||
        error.message ||
        "We couldn't verify your food payment."
      );
    } finally {
      setLoading(false);
    }
  };

  const copyPickupCode = async () => {
    if (!order?.pickupCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        order.pickupCode
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.log(error);
    }
  };

  const totalItems =
    order?.items?.reduce(
      (total, item) =>
        total + Number(item.quantity || 0),
      0
    ) || 0;

  if (loading) {
    return (
      <>
        <Navbar />

        <main className="food-success-page">
          <div className="food-success-loading">
            <div className="food-success-spinner"></div>

            <span>SECURE VERIFICATION</span>

            <h2>Confirming your payment...</h2>

            <p>
              Please wait while Vibely confirms your
              transaction with Paystack.
            </p>
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

        <main className="food-success-page">
          <div className="food-success-error">
            <div className="food-success-error-icon">
              <i className="bi bi-exclamation-circle"></i>
            </div>

            <span>PAYMENT VERIFICATION</span>

            <h2>We couldn't confirm this payment.</h2>

            <p>
              {error ||
                "Your food order information could not be loaded."}
            </p>

            <div className="food-success-error-actions">
              <button
                type="button"
                onClick={verifyPayment}
              >
                Try Again
              </button>

              <Link to="/food">
                Return to Food
              </Link>
            </div>
          </div>
        </main>

        <DetailFooter />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="food-success-page">
        <section className="food-success-hero">
          <div className="food-success-confetti food-success-confetti-one"></div>
          <div className="food-success-confetti food-success-confetti-two"></div>
          <div className="food-success-confetti food-success-confetti-three"></div>

          <div className="food-success-hero-inner">
            <div className="food-success-check">
              <i className="bi bi-check-lg"></i>
            </div>

            <span className="food-success-eyebrow">
              PAYMENT SUCCESSFUL
            </span>

            <h1>
              Your order is
              <em> officially in.</em>
            </h1>

            <p>
              Payment confirmed. Your food order has
              been sent to {getVendorName(order)}.
            </p>

            <div className="food-success-reference">
              <span>ORDER REFERENCE</span>
              <strong>
                {order.orderReference || "—"}
              </strong>
            </div>
          </div>
        </section>

        <section className="food-success-content">
          <div className="food-success-layout">
            <div className="food-success-pass">
              <div className="food-success-pass-top">
                <div>
                  <span>VIBELY</span>
                  <strong>FOOD PASS</strong>
                </div>

                <div className="food-success-pass-status">
                  <span></span>
                  {order.orderStatus === "ready"
                    ? "READY FOR PICKUP"
                    : order.orderStatus?.toUpperCase() ||
                    "ORDER RECEIVED"}
                </div>
              </div>

              <div className="food-success-pass-body">
                <div className="food-success-vendor">
                  <div>
                    <i className="bi bi-shop-window"></i>
                  </div>

                  <span>
                    <small>PREPARED BY</small>
                    <strong>
                      {getVendorName(order)}
                    </strong>
                  </span>
                </div>

                <div className="food-success-food-list">
                  <span className="food-success-label">
                    YOUR ORDER
                  </span>

                  {order.items?.map((item, index) => (
                    <div
                      className="food-success-food-item"
                      key={
                        item._id ||
                        `${item.food}-${index}`
                      }
                    >
                      <div>
                        <span className="food-success-item-quantity">
                          {item.quantity}×
                        </span>

                        <div>
                          <strong>{item.name}</strong>

                          <small>
                            {formatPrice(item.price)} each
                          </small>
                        </div>
                      </div>

                      <strong>
                        {formatPrice(item.subtotal)}
                      </strong>
                    </div>
                  ))}
                </div>

                <div className="food-success-ticket-divider">
                  <span></span>
                  <div></div>
                  <span></span>
                </div>

                <div className="food-success-code-section">
                  <span className="food-success-label">
                    YOUR PICKUP CODE
                  </span>

                  {order.pickupCode ? (
                    <>
                      <strong className="food-success-pickup-code">
                        {order.pickupCode}
                      </strong>

                      <p>
                        Show this code to the vendor when
                        collecting your order.
                      </p>

                      <button
                        type="button"
                        onClick={copyPickupCode}
                      >
                        <i
                          className={
                            copied
                              ? "bi bi-check-lg"
                              : "bi bi-copy"
                          }
                        ></i>

                        {copied
                          ? "Copied"
                          : "Copy pickup code"}
                      </button>
                    </>
                  ) : (
                    <div className="food-success-code-pending">
                      <i className="bi bi-clock-history"></i>

                      <div>
                        <strong>
                          Pickup code is being prepared
                        </strong>

                        <p>
                          Refresh your order shortly. Your
                          code will appear after payment
                          processing is completed.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="food-success-pass-details">
                  <div>
                    <span>ORDER REF</span>
                    <strong>
                      {order.orderReference || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>ITEMS</span>
                    <strong>{totalItems}</strong>
                  </div>

                  <div>
                    <span>TOTAL PAID</span>
                    <strong>
                      {formatPrice(order.totalAmount)}
                    </strong>
                  </div>
                </div>

                <div className="food-success-pass-footer">
                  <div>
                    <i className="bi bi-shield-check"></i>

                    <span>
                      <small>PAYMENT</small>
                      <strong>
                        {order.paymentStatus?.toUpperCase()}
                      </strong>
                    </span>
                  </div>

                  <div>
                    <i className="bi bi-bag-check"></i>

                    <span>
                      <small>ORDER STATUS</small>
                      <strong>
                        {order.orderStatus?.toUpperCase()}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <aside className="food-success-side">
              <div className="food-success-side-heading">
                <span>WHAT HAPPENS NEXT?</span>

                <h2>
                  We'll take it from here.
                </h2>

                <p>
                  Follow your order as your vendor prepares
                  it for collection.
                </p>
              </div>

              <div className="food-success-timeline">
                <div className="food-success-timeline-item active">
                  <div>
                    <i className="bi bi-check-lg"></i>
                  </div>

                  <span>
                    <small>STEP 01</small>
                    <strong>Payment confirmed</strong>
                    <p>
                      Your payment has been received
                      successfully.
                    </p>
                  </span>
                </div>

                <div className="food-success-timeline-line"></div>

                <div className="food-success-timeline-item">
                  <div>
                    <i className="bi bi-bag-heart"></i>
                  </div>

                  <span>
                    <small>STEP 02</small>
                    <strong>Vendor prepares order</strong>
                    <p>
                      Your order moves from pending to
                      packing.
                    </p>
                  </span>
                </div>

                <div className="food-success-timeline-line"></div>

                <div className="food-success-timeline-item">
                  <div>
                    <i className="bi bi-bell"></i>
                  </div>

                  <span>
                    <small>STEP 03</small>
                    <strong>Ready for pickup</strong>
                    <p>
                      Your order status changes to ready.
                    </p>
                  </span>
                </div>

                <div className="food-success-timeline-line"></div>

                <div className="food-success-timeline-item">
                  <div>
                    <i className="bi bi-check2-circle"></i>
                  </div>

                  <span>
                    <small>STEP 04</small>
                    <strong>Collect your food</strong>
                    <p>
                      Give your pickup code to the vendor
                      for confirmation.
                    </p>
                  </span>
                </div>
              </div>

              <div className="food-success-actions">
                <Link
                  to="/my-tickets?type=food"
                  className="food-success-primary"
                >
                  <span>
                    <i className="bi bi-ticket-perforated"></i>
                    View Food Pass
                  </span>

                  <i className="bi bi-arrow-right"></i>
                </Link>

                <Link
                  to={`/food-orders/${order._id}`}
                  className="food-success-secondary"
                >
                  <span>
                    <i className="bi bi-receipt"></i>
                    View Order Details
                  </span>

                  <i className="bi bi-arrow-up-right"></i>
                </Link>

                <Link
                  to="/food"
                  className="food-success-text-link"
                >
                  Order more food
                </Link>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <DetailFooter />
    </>
  );
};

export default FoodPaymentSuccess;