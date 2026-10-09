import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import axios from "axios";
import "../styles/paymentCallback.css";

const FoodPaymentCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] =
    useState("verifying");

  const [message, setMessage] = useState(
    "Please wait while we confirm your food payment."
  );

  const [order, setOrder] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const accessToken =
        localStorage.getItem("userAccessToken");

      const reference =
        searchParams.get("reference") ||
        searchParams.get("trxref");

      if (!accessToken) {
        navigate("/login", {
          state: {
            returnTo:
              window.location.pathname +
              window.location.search,
          },
        });

        return;
      }

      if (!reference) {
        setStatus("failed");
        setMessage(
          "Payment reference was not found."
        );
        return;
      }

      try {
        const response = await axios.get(
          `https://eventbookingsystem-sooty.vercel.app/api/v1/food-payments/verify/${reference}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        const responseData =
          response.data.data || {};

        const payment = responseData.payment;
const verifiedOrder = responseData.order;

if (
  payment?.status === "paid" &&
  verifiedOrder?.paymentStatus === "paid"
) {
  setOrder(verifiedOrder);
  setStatus("success");
  setMessage(
    "Your food payment was confirmed successfully!"
  );
} else if (
  payment?.status === "refunded" ||
  payment?.refundStatus === "pending" ||
  payment?.refundStatus === "refunded"
) {
  setStatus("refund");
  setMessage(
    response.data.message ||
    "Your payment has refund activity. Please check your refund status."
  );
} else {
  setStatus("pending");
  setMessage(
    response.data.message ||
    "Your food payment is still being confirmed. Please do not pay again."
  );
}
      } catch (error) {
        console.log(
          "FOOD PAYMENT VERIFY ERROR:",
          error
        );

        const responseData =
          error.response?.data;

        if (
          responseData?.refundInitiated ||
          responseData
            ?.refundRequiresReconciliation
        ) {
          setStatus("refund");

          setMessage(
            responseData.message ||
            "Your payment was received, but your order could not be completed. A refund is being processed."
          );

          return;
        }

        if (
          responseData?.paymentRequiresAttention
        ) {
          setStatus("pending");

          setMessage(
            responseData.message ||
            "Your payment requires verification. Please check your food orders shortly."
          );

          return;
        }

        setStatus("failed");

        setMessage(
          responseData?.message ||
          "We could not verify your food payment."
        );
      }
    };

    verifyPayment();
  }, [navigate, searchParams]);

  return (
    <main className="payment-callback-page">
      <div className="payment-callback-card">
        {status === "verifying" && (
          <>
            <div className="payment-callback-loader"></div>

            <span className="payment-callback-label">
              VERIFYING PAYMENT
            </span>

            <h1>Confirming your payment</h1>

            <p>{message}</p>

            <small>
              Please do not close this page.
            </small>
          </>
        )}

        {status === "success" && (
          <>
            <div className="payment-callback-icon success">
              <i className="bi bi-check-lg"></i>
            </div>

            <span className="payment-callback-label">
              PAYMENT SUCCESSFUL
            </span>

            <h1>Food order confirmed!</h1>

            <p>{message}</p>

            {order?.pickupCode && (
              <div className="payment-pickup-code">
                <span>Your Pickup Code</span>

                <strong>
                  {order.pickupCode}
                </strong>

                <small>
                  Keep this code safe. You will
                  need it when collecting your
                  food.
                </small>
              </div>
            )}

            <div className="payment-callback-actions">
              <Link
                to="/my-food-orders"
                className="payment-primary-button"
              >
                View My Food Orders
              </Link>

              <Link
                to="/food"
                className="payment-secondary-button"
              >
                Order More Food
              </Link>
            </div>
          </>
        )}

        {status === "refund" && (
          <>
            <div className="payment-callback-icon pending">
              <i className="bi bi-arrow-repeat"></i>
            </div>

            <span className="payment-callback-label">
              REFUND IN PROGRESS
            </span>

            <h1>We're processing your refund</h1>

            <p>{message}</p>

            <div className="payment-callback-actions">
              <Link
                to="/payments-refunds"
                className="payment-primary-button"
              >
                Payments & Refunds
              </Link>

              <Link
                to="/my-food-orders"
                className="payment-secondary-button"
              >
                My Food Orders
              </Link>
            </div>
          </>
        )}

        {status === "pending" && (
          <>
            <div className="payment-callback-icon pending">
              <i className="bi bi-clock"></i>
            </div>

            <span className="payment-callback-label">
              PAYMENT PROCESSING
            </span>

            <h1>Payment is being confirmed</h1>

            <p>{message}</p>

            <div className="payment-callback-actions">
              <Link
                to="/my-food-orders"
                className="payment-primary-button"
              >
                View My Food Orders
              </Link>

              <Link
                to="/"
                className="payment-secondary-button"
              >
                Back Home
              </Link>
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="payment-callback-icon failed">
              <i className="bi bi-x-lg"></i>
            </div>

            <span className="payment-callback-label">
              PAYMENT NOT CONFIRMED
            </span>

            <h1>We couldn't confirm payment</h1>

            <p>{message}</p>

            <div className="payment-callback-actions">
              <Link
                to="/my-food-orders"
                className="payment-primary-button"
              >
                Check My Orders
              </Link>

              <Link
                to="/food"
                className="payment-secondary-button"
              >
                Back to Food
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default FoodPaymentCallback;