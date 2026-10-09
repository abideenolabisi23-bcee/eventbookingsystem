import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import axios from "axios";
import "../styles/paymentCallback.css";

const ApartmentPaymentCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] =
    useState("verifying");

  const [message, setMessage] = useState(
    "Please wait while we confirm your apartment payment."
  );

  const [booking, setBooking] =
    useState(null);

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
          `https://eventbookingsystem-sooty.vercel.app/api/v1/apartment-payments/verify/${reference}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        const responseData =
          response.data.data || {};

       const payment = responseData.payment;
const confirmedBooking = responseData.booking;

if (
  payment?.status === "paid" &&
  confirmedBooking?.paymentStatus === "paid" &&
  confirmedBooking?.bookingStatus === "confirmed"
) {
  setBooking(confirmedBooking);
  setStatus("success");
  setMessage(
    "Your apartment payment is confirmed and your booking is ready!"
  );
} else if (
  payment?.refundStatus === "pending" ||
  payment?.refundStatus === "refunded" ||
  payment?.status === "refunded"
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
    "Your apartment payment is still being confirmed. Please do not pay again."
  );
}
      } catch (error) {
        console.log(
          "APARTMENT PAYMENT VERIFY ERROR:",
          error
        );

        const responseData =
          error.response?.data;

        if (
          responseData?.refundInitiated ||
          responseData?.refundStarted
        ) {
          setStatus("refund");

          setMessage(
            responseData.message ||
            "Your payment was received, but the apartment could not be confirmed. A refund is being processed."
          );

          return;
        }

        if (
          responseData
            ?.paymentRequiresAttention
        ) {
          setStatus("pending");

          setMessage(
            responseData.message ||
            "Your apartment payment is still being verified."
          );

          return;
        }

        setStatus("failed");

        setMessage(
          responseData?.message ||
          "We could not verify your apartment payment."
        );
      }
    };

    verifyPayment();
  }, [navigate, searchParams]);

  const formatAmount = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <main className="payment-callback-page">
      <div className="payment-callback-card">
        {status === "verifying" && (
          <>
            <div className="payment-callback-loader"></div>

            <span className="payment-callback-label">
              VERIFYING PAYMENT
            </span>

            <h1>
              Confirming your apartment
            </h1>

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
              BOOKING CONFIRMED
            </span>

            <h1>
              Your apartment is booked!
            </h1>

            <p>{message}</p>

            {booking && (
              <div className="apartment-confirmation-summary">
                {booking.bookingReference && (
                  <div>
                    <span>
                      Booking Reference
                    </span>

                    <strong>
                      {
                        booking.bookingReference
                      }
                    </strong>
                  </div>
                )}

                {booking.stayType && (
                  <div>
                    <span>
                      Booking Type
                    </span>

                    <strong>
                      {booking.stayType}
                    </strong>
                  </div>
                )}

                {booking.numberOfUnits && (
                  <div>
                    <span>
                      Units
                    </span>

                    <strong>
                      {booking.numberOfUnits}
                    </strong>
                  </div>
                )}

                {booking.totalAmount && (
                  <div>
                    <span>
                      Amount Paid
                    </span>

                    <strong>
                      {formatAmount(
                        booking.totalAmount
                      )}
                    </strong>
                  </div>
                )}
              </div>
            )}

            <div className="payment-callback-actions">
              <Link
                to="/my-apartment-bookings"
                className="payment-primary-button"
              >
                View My Apartment Bookings
              </Link>

              <Link
                to="/apartments"
                className="payment-secondary-button"
              >
                Explore Apartments
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

            <h1>
              We're processing your refund
            </h1>

            <p>{message}</p>

            <div className="payment-callback-actions">
              <Link
                to="/payments-refunds"
                className="payment-primary-button"
              >
                Payments & Refunds
              </Link>

              <Link
                to="/apartments"
                className="payment-secondary-button"
              >
                Find Another Apartment
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

            <h1>
              Payment is being confirmed
            </h1>

            <p>{message}</p>

            <div className="payment-callback-actions">
              <Link
                to="/my-apartment-bookings"
                className="payment-primary-button"
              >
                My Apartment Bookings
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

            <h1>
              We couldn't confirm payment
            </h1>

            <p>{message}</p>

            <div className="payment-callback-actions">
              <Link
                to="/my-apartment-bookings"
                className="payment-primary-button"
              >
                Check My Bookings
              </Link>

              <Link
                to="/apartments"
                className="payment-secondary-button"
              >
                Back to Apartments
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default ApartmentPaymentCallback;