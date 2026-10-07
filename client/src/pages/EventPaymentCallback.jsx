import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import axios from "axios";
import "../styles/paymentCallback.css";

const EventPaymentCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState("verifying");

  const [message, setMessage] = useState(
    "Please wait while we confirm your event payment."
  );

  const [booking, setBooking] = useState(null);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const verifyPayment = async () => {
      const accessToken =
        localStorage.getItem("accessToken");

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
          `https://eventbookingsystem-sooty.vercel.app/api/v1/payments/verify/${reference}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        const responseData =
          response.data.data || {};

        setBooking(
          responseData.booking || null
        );

        setTickets(
          responseData.tickets || []
        );

        setStatus("success");

        setMessage(
          response.data.message ||
          "Your event payment was confirmed successfully."
        );
      } catch (error) {
        console.log(
          "EVENT PAYMENT VERIFY ERROR:",
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
            "Your payment was received, but your event booking could not be confirmed. A refund is being processed."
          );

          return;
        }

        if (error.response?.status === 202) {
          setStatus("pending");

          setMessage(
            responseData?.message ||
            "Your event payment is still being confirmed."
          );

          return;
        }

        setStatus("failed");

        setMessage(
          responseData?.message ||
          "We could not verify your event payment."
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

  const firstTicket = tickets[0];

  return (
    <main className="payment-callback-page">
      <div className="payment-callback-card">
        {status === "verifying" && (
          <>
            <div className="payment-callback-loader"></div>

            <span className="payment-callback-label">
              VERIFYING PAYMENT
            </span>

            <h1>Confirming your ticket</h1>

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

            <h1>Your ticket is ready!</h1>

            <p>
              Your payment has been confirmed and
              your event ticket is now available
              in your Vibely account.
            </p>

            {booking && (
              <div className="apartment-confirmation-summary">
                {booking.bookingReference && (
                  <div>
                    <span>
                      Booking Reference
                    </span>

                    <strong>
                      {booking.bookingReference}
                    </strong>
                  </div>
                )}

                {booking.ticketType && (
                  <div>
                    <span>Ticket Type</span>

                    <strong>
                      {booking.ticketType}
                    </strong>
                  </div>
                )}

                {booking.quantity && (
                  <div>
                    <span>Tickets</span>

                    <strong>
                      {booking.quantity}
                    </strong>
                  </div>
                )}

                {booking.totalAmount && (
                  <div>
                    <span>Amount Paid</span>

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
                to="/my-tickets"
                className="payment-primary-button"
              >
                View Ticket
              </Link>

              <Link
                to="/events"
                className="payment-secondary-button"
              >
                Explore Events
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
                to="/events"
                className="payment-secondary-button"
              >
                Find Another Event
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
                to="/my-tickets"
                className="payment-primary-button"
              >
                My Tickets
              </Link>

              <Link
                to="/events"
                className="payment-secondary-button"
              >
                Back to Events
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
                to="/my-bookings"
                className="payment-primary-button"
              >
                Check My Bookings
              </Link>

              <Link
                to="/events"
                className="payment-secondary-button"
              >
                Back to Events
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default EventPaymentCallback;