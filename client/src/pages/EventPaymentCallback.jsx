
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import "../styles/vibelyTickets.css";

const API =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const getToken = () =>
  localStorage.getItem("userAccessToken") ||
  localStorage.getItem("token");

export default function EventPaymentCallback() {
  const [params] = useSearchParams();
  const reference = params.get("reference") || params.get("trxref");

  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("");
  const [booking, setBooking] = useState(null);
  const [tickets, setTickets] = useState([]);

  const requestId = useRef(0);

  const verifyPayment = useCallback(async () => {
    const currentRequest = ++requestId.current;

    if (!reference) {
      setStatus("error");
      setMessage("No payment reference was provided.");
      return;
    }

    const token = getToken();

    if (!token) {
      setStatus("login");
      setMessage(
        "Please sign in to verify your payment. You do not need to pay again."
      );
      return;
    }

    setStatus("checking");
    setMessage("We're securely confirming your payment.");

    try {
      const response = await axios.get(
        `${API}/payments/verify/${encodeURIComponent(reference)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (currentRequest !== requestId.current) return;

      const data = response.data?.data || {};
      const payment = data.payment;
      const verifiedBooking = data.booking;
      const verifiedTickets = Array.isArray(data.tickets)
        ? data.tickets
        : [];

      if (
        payment?.status === "paid" &&
        verifiedBooking?.paymentStatus === "paid" &&
        verifiedBooking?.bookingStatus === "confirmed" &&
        verifiedTickets.length === Number(verifiedBooking.quantity)
      ) {
        setBooking(verifiedBooking);
        setTickets(verifiedTickets);
        setStatus("success");
        setMessage(
          "Your payment is confirmed and your tickets are ready!"
        );
        sessionStorage.removeItem("vibelyPendingBooking");
        return;
      }

      if (
        payment?.status === "refunded" ||
        payment?.status === "partially_refunded" ||
        payment?.refundStatus === "pending" ||
        payment?.refundStatus === "refunded" ||
        payment?.refundStatus === "partially_refunded"
      ) {
        setStatus("refund");
        setMessage(
          "This payment has refund activity. Please check your refund status before taking further action."
        );
        return;
      }

      setStatus("pending");
      setMessage(
        response.data?.message ||
          "Your payment is still being confirmed. Please do not pay again."
      );
    } catch (error) {
      if (currentRequest !== requestId.current) return;

      const httpStatus = error.response?.status;
      const data = error.response?.data || {};

      if (httpStatus === 401) {
        setStatus("login");
        setMessage(
          "Your session has expired. Sign in to check your payment."
        );
      } else if (httpStatus === 202) {
        if (data.requiresAttention) {
          setStatus("attention");
        } else {
          setStatus("pending");
        }

        setMessage(
          data.message ||
            "Your payment is still being processed."
        );
      } else if (
        data.requiresAttention ||
        data.paymentReceived
      ) {
        setStatus("attention");
        setMessage(
          data.message ||
            "Your payment requires additional verification. Do not pay again."
        );
      } else if (
        httpStatus === 400 &&
        data.paymentStatus &&
        data.paymentStatus !== "success"
      ) {
        setStatus("pending");
        setMessage(
          "Paystack has not confirmed a successful payment. Check the transaction status before trying again."
        );
      } else {
        setStatus("error");
        setMessage(
          data.message ||
            "We couldn't verify your payment right now. Please check again before making another payment."
        );
      }
    }
  }, [reference]);

  useEffect(() => {
    verifyPayment();

    return () => {
      requestId.current += 1;
    };
  }, [verifyPayment]);

  const details = {
    checking: {
      icon: "✦",
      title: "One little moment",
      subtitle: "We're making sure everything is perfect."
    },
    success: {
      icon: "✓",
      title: "You're going!",
      subtitle: "Your unforgettable experience starts here."
    },
    pending: {
      icon: "◷",
      title: "Almost there",
      subtitle: "Your payment confirmation is in progress."
    },
    refund: {
      icon: "↺",
      title: "Refund update",
      subtitle: "Let's check the status of your refund."
    },
    attention: {
      icon: "!",
      title: "We're looking into it",
      subtitle: "Your transaction needs additional attention."
    },
    login: {
      icon: "♡",
      title: "Welcome back",
      subtitle: "Sign in to continue checking your payment."
    },
    error: {
      icon: "!",
      title: "Unable to verify",
      subtitle: "Your payment status couldn't be confirmed."
    }
  }[status];

  return (
    <main className="vb-page vb-payment-page">
      <div className="vb-payment-card">
        <div className="vb-payment-head">
          <Link to="/" className="vb-logo">
            ✦ VIBELY
          </Link>

          <span className="vb-overline">
            THE ART OF EXPERIENCES
          </span>

          <div className={`vb-payment-symbol vb-symbol-${status}`}>
            {status === "checking" ? (
              <span className="vb-loader" />
            ) : (
              details.icon
            )}
          </div>

          <h1>{details.title}</h1>

          <p className="vb-subtitle">
            {details.subtitle}
          </p>

          <p className="vb-message">
            {message}
          </p>
        </div>

        <div className="vb-payment-body">
          {reference && (
            <div className="vb-reference">
              <span>PAYMENT REFERENCE</span>
              <strong>{reference}</strong>
            </div>
          )}

          {status === "success" && (
            <>
              <div className="vb-notice">
                <strong>✧ Your tickets are ready</strong>

                <p>
                  You have {tickets.length}{" "}
                  {tickets.length === 1 ? "ticket" : "tickets"}.
                  Each ticket has its own unique QR code.
                </p>
              </div>

              <Link
                to="/my-tickets"
                className="vb-main-button"
              >
                View my tickets <span>↗</span>
              </Link>

              <Link
                to="/my-bookings"
                className="vb-outline-button"
              >
                View my bookings
              </Link>
            </>
          )}

          {status === "pending" && (
            <>
              <button
                type="button"
                className="vb-main-button"
                onClick={verifyPayment}
              >
                Check payment again <span>↻</span>
              </button>

              <Link
                to="/my-bookings"
                className="vb-outline-button"
              >
                View my bookings
              </Link>
            </>
          )}

          {status === "refund" && (
            <>
              <Link
                to="/my-refunds"
                className="vb-main-button"
              >
                Check my refunds <span>↗</span>
              </Link>

              <button
                type="button"
                className="vb-outline-button"
                onClick={verifyPayment}
              >
                Refresh payment status
              </button>
            </>
          )}

          {status === "attention" && (
            <>
              <div className="vb-notice">
                <strong>Important</strong>

                <p>
                  Please do not make another payment for this
                  booking until its status has been resolved.
                </p>
              </div>

              <Link
                to="/my-bookings"
                className="vb-main-button"
              >
                View my bookings <span>↗</span>
              </Link>

              <button
                type="button"
                className="vb-outline-button"
                onClick={verifyPayment}
              >
                Check again
              </button>
            </>
          )}

          {status === "login" && (
            <Link
              to="/login"
              state={{
                returnTo: `/event-payment/callback?reference=${encodeURIComponent(reference || "")}`
              }}
              className="vb-main-button"
            >
              Sign in to continue <span>↗</span>
            </Link>
          )}

          {status === "error" && (
            <>
              <button
                type="button"
                className="vb-main-button"
                onClick={verifyPayment}
              >
                Try verification again <span>↻</span>
              </button>

              <Link
                to="/my-bookings"
                className="vb-outline-button"
              >
                View my bookings
              </Link>
            </>
          )}

          {booking?._id && (
            <p className="vb-small-note">
              Booking ID: {booking._id}
            </p>
          )}

          <Link
            to="/events"
            className="vb-text-link"
          >
            Explore more experiences →
          </Link>

          <p className="vb-secure">
            ♢ Secure verification powered by Paystack
          </p>
        </div>
      </div>

      <p className="vb-tagline">
        Beautiful moments. Unforgettable memories.
      </p>
    </main>
  );
}
