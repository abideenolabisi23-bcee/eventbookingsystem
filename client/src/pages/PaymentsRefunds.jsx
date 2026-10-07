import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import Navbar from "../component/Navbar";
import DetailFooter from "../component/DetailFooter";
import vibelyLogo from "../assets/vibely-logo.png";

import "../styles/paymentsRefunds.css";

const PaymentsRefunds = () => {
  const navigate = useNavigate();

  const [payments, setPayments] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [activeTab, setActiveTab] =
    useState("payments");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const accessToken =
        localStorage.getItem("accessToken");

      if (!accessToken) {
        navigate("/login", {
          state: {
            returnTo: "/payments-refunds",
          },
        });

        return;
      }

      try {
        setLoading(true);
        setError("");

        const headers = {
          Authorization: `Bearer ${accessToken}`,
        };

        const [
          paymentsResponse,
          refundsResponse,
        ] = await Promise.all([
          axios.get(
            "https://eventbookingsystem-sooty.vercel.app/api/v1/payments/my",
            {
              headers,
            }
          ),

          axios.get(
            "https://eventbookingsystem-sooty.vercel.app/api/v1/refunds/my",
            {
              headers,
            }
          ),
        ]);

        setPayments(
          paymentsResponse.data.data || []
        );

        setRefunds(
          refundsResponse.data.data || []
        );
      } catch (error) {
        console.log(
          "PAYMENTS AND REFUNDS ERROR:",
          error
        );

        if (error.response?.status === 401) {
          localStorage.removeItem(
            "accessToken"
          );

          localStorage.removeItem(
            "refreshToken"
          );

          navigate("/login", {
            state: {
              returnTo: "/payments-refunds",
            },
          });

          return;
        }

        setError(
          error.response?.data?.message ||
          "Unable to load your payment activity."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const formatPrice = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) {
      return "Unavailable";
    }

    return new Intl.DateTimeFormat("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
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

  const successfulPayments =
    payments.filter(
      (payment) =>
        payment.status === "success" ||
        payment.status === "successful" ||
        payment.status === "paid"
    ).length;

  const totalPaid = payments.reduce(
    (total, payment) => {
      if (
        payment.status === "success" ||
        payment.status === "successful" ||
        payment.status === "paid"
      ) {
        return total + (payment.amount || 0);
      }

      return total;
    },
    0
  );

  const totalRefunded = refunds.reduce(
    (total, refund) =>
      total + (refund.amount || 0),
    0
  );

  if (loading) {
    return (
      <>
        <Navbar />

        <div className="payment-page-loading">
          <div className="payment-loader"></div>

          <h3>
            Loading payment activity...
          </h3>

          <p>
            We're getting your transactions
            ready.
          </p>
        </div>

        <DetailFooter />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="payments-refunds-page">
        <section className="payments-hero">
          <div className="payments-hero-circle payments-circle-one"></div>
          <div className="payments-hero-circle payments-circle-two"></div>

          <div className="payments-hero-inner">
            <div className="payments-hero-copy">
              <span className="payments-eyebrow">
                YOUR ACCOUNT
              </span>

              <h1>
                Payments &
                <em> Refunds.</em>
              </h1>

              <p>
                Keep track of your Vibely
                transactions, payments and
                refund activity in one place.
              </p>
            </div>

            <div className="payments-hero-card">
              <img
                src={vibelyLogo}
                alt="Vibely"
              />

              <div>
                <span>
                  TRANSACTION HISTORY
                </span>

                <strong>
                  {payments.length +
                    refunds.length}{" "}
                  Transactions
                </strong>

                <p>
                  SECURE · VIBELY
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="payments-container">
          {error && (
            <div className="payment-error">
              <div className="payment-error-icon">
                <i className="bi bi-exclamation-circle"></i>
              </div>

              <div>
                <strong>
                  Unable to load your activity
                </strong>

                <p>{error}</p>
              </div>
            </div>
          )}

          {!error && (
            <>
              <section className="payment-summary-grid">
                <div className="payment-summary-card">
                  <div className="payment-summary-icon">
                    <i className="bi bi-credit-card"></i>
                  </div>

                  <div>
                    <span>
                      ALL PAYMENTS
                    </span>

                    <strong>
                      {payments.length}
                    </strong>

                    <p>
                      Payment transactions
                    </p>
                  </div>
                </div>

                <div className="payment-summary-card">
                  <div className="payment-summary-icon">
                    <i className="bi bi-check-circle"></i>
                  </div>

                  <div>
                    <span>
                      SUCCESSFUL
                    </span>

                    <strong>
                      {successfulPayments}
                    </strong>

                    <p>
                      Completed payments
                    </p>
                  </div>
                </div>

                <div className="payment-summary-card">
                  <div className="payment-summary-icon">
                    <i className="bi bi-wallet2"></i>
                  </div>

                  <div>
                    <span>
                      TOTAL PAID
                    </span>

                    <strong className="payment-summary-money">
                      {formatPrice(totalPaid)}
                    </strong>

                    <p>
                      Successful payments
                    </p>
                  </div>
                </div>

                <div className="payment-summary-card">
                  <div className="payment-summary-icon">
                    <i className="bi bi-arrow-counterclockwise"></i>
                  </div>

                  <div>
                    <span>
                      REFUNDED
                    </span>

                    <strong className="payment-summary-money">
                      {formatPrice(
                        totalRefunded
                      )}
                    </strong>

                    <p>
                      {refunds.length}{" "}
                      {refunds.length === 1
                        ? "refund"
                        : "refunds"}
                    </p>
                  </div>
                </div>
              </section>

              <div className="payments-section-heading">
                <div>
                  <span>
                    FINANCIAL ACTIVITY
                  </span>

                  <h2>
                    Transaction history
                  </h2>

                  <p>
                    Review your Vibely payments
                    and refund activity.
                  </p>
                </div>

                <div className="payments-security">
                  <i className="bi bi-shield-check"></i>

                  <div>
                    <strong>
                      Secure payments
                    </strong>

                    <span>
                      Protected transactions
                    </span>
                  </div>
                </div>
              </div>

              <div className="payment-tabs">
                <button
                  type="button"
                  className={
                    activeTab === "payments"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setActiveTab("payments")
                  }
                >
                  <i className="bi bi-credit-card"></i>

                  Payments

                  <span>
                    {payments.length}
                  </span>
                </button>

                <button
                  type="button"
                  className={
                    activeTab === "refunds"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setActiveTab("refunds")
                  }
                >
                  <i className="bi bi-arrow-counterclockwise"></i>

                  Refunds

                  <span>
                    {refunds.length}
                  </span>
                </button>
              </div>

              {activeTab === "payments" && (
                <div className="payment-list">
                  {payments.length === 0 ? (
                    <div className="payment-empty">
                      <div className="payment-empty-icon">
                        <i className="bi bi-credit-card"></i>
                      </div>

                      <span>
                        PAYMENT HISTORY
                      </span>

                      <h3>
                        No payments yet
                      </h3>

                      <p>
                        Your Vibely payment
                        history will appear here
                        after you complete a
                        transaction.
                      </p>
                    </div>
                  ) : (
                    payments.map(
                      (payment, index) => (
                        <article
                          className="payment-card"
                          key={payment._id}
                        >
                          <div className="payment-card-top">
                            <div className="payment-type">
                              <div className="payment-type-icon">
                                <i className="bi bi-credit-card"></i>
                              </div>

                              <div>
                                <span>
                                  PAYMENT{" "}
                                  {String(
                                    index + 1
                                  ).padStart(
                                    2,
                                    "0"
                                  )}
                                </span>

                                <h3>
                                  {payment
                                    .booking
                                    ?.event
                                    ?.title ||
                                    "Event Payment"}
                                </h3>

                                {payment
                                  .booking
                                  ?.event
                                  ?.location && (
                                    <p>
                                      <i className="bi bi-geo-alt"></i>

                                      {
                                        payment
                                          .booking
                                          ?.event
                                          ?.location
                                      }
                                    </p>
                                  )}
                              </div>
                            </div>

                            <div className="payment-amount-area">
                              <span>
                                AMOUNT
                              </span>

                              <strong>
                                {formatPrice(
                                  payment.amount
                                )}
                              </strong>
                            </div>
                          </div>

                          <div className="payment-information">
                            <div>
                              <div className="payment-info-icon">
                                <i className="bi bi-receipt"></i>
                              </div>

                              <div>
                                <span>
                                  REFERENCE
                                </span>

                                <strong>
                                  {payment.paymentReference ||
                                    "—"}
                                </strong>
                              </div>
                            </div>

                            <div>
                              <div className="payment-info-icon">
                                <i className="bi bi-ticket-perforated"></i>
                              </div>

                              <div>
                                <span>
                                  TICKET CATEGORY
                                </span>

                                <strong>
                                  {payment
                                    .booking
                                    ?.ticketType ||
                                    "—"}
                                </strong>
                              </div>
                            </div>

                            <div>
                              <div className="payment-info-icon">
                                <i className="bi bi-wallet2"></i>
                              </div>

                              <div>
                                <span>
                                  METHOD
                                </span>

                                <strong>
                                  {payment.paymentMethod ||
                                    "—"}
                                </strong>
                              </div>
                            </div>

                            <div>
                              <div className="payment-info-icon">
                                <i className="bi bi-calendar3"></i>
                              </div>

                              <div>
                                <span>
                                  DATE
                                </span>

                                <strong>
                                  {formatDate(
                                    payment.createdAt
                                  )}
                                </strong>
                              </div>
                            </div>
                          </div>

                          <div className="payment-bottom">
                            <div>
                              <span
                                className={`transaction-status ${payment.status || ""}`}
                              >
                                <i
                                  className={
                                    payment.status ===
                                      "success" ||
                                      payment.status ===
                                      "successful" ||
                                      payment.status ===
                                      "paid"
                                      ? "bi bi-check-circle-fill"
                                      : payment.status ===
                                        "failed"
                                        ? "bi bi-x-circle-fill"
                                        : "bi bi-clock-fill"
                                  }
                                ></i>

                                {formatStatus(
                                  payment.status
                                )}
                              </span>
                            </div>

                            {payment.refundedAmount >
                              0 && (
                                <div className="payment-refunded-amount">
                                  <span>
                                    REFUNDED
                                  </span>

                                  <strong>
                                    {formatPrice(
                                      payment.refundedAmount
                                    )}
                                  </strong>
                                </div>
                              )}
                          </div>
                        </article>
                      )
                    )
                  )}
                </div>
              )}

              {activeTab === "refunds" && (
                <div className="payment-list">
                  {refunds.length === 0 ? (
                    <div className="payment-empty">
                      <div className="payment-empty-icon">
                        <i className="bi bi-arrow-counterclockwise"></i>
                      </div>

                      <span>
                        REFUND HISTORY
                      </span>

                      <h3>
                        No refunds
                      </h3>

                      <p>
                        You currently have no
                        refund activity on your
                        Vibely account.
                      </p>
                    </div>
                  ) : (
                    refunds.map(
                      (refund, index) => (
                        <article
                          className="payment-card refund-card"
                          key={refund._id}
                        >
                          <div className="payment-card-top">
                            <div className="payment-type">
                              <div className="payment-type-icon refund-icon">
                                <i className="bi bi-arrow-counterclockwise"></i>
                              </div>

                              <div>
                                <span>
                                  REFUND{" "}
                                  {String(
                                    index + 1
                                  ).padStart(
                                    2,
                                    "0"
                                  )}
                                </span>

                                <h3>
                                  {refund.booking
                                    ?.bookingReference ||
                                    "Ticket Refund"}
                                </h3>

                                <p>
                                  <i className="bi bi-receipt"></i>

                                  Vibely refund
                                  transaction
                                </p>
                              </div>
                            </div>

                            <div className="payment-amount-area">
                              <span>
                                REFUND AMOUNT
                              </span>

                              <strong>
                                {formatPrice(
                                  refund.amount
                                )}
                              </strong>
                            </div>
                          </div>

                          <div className="payment-information refund-information">
                            <div>
                              <div className="payment-info-icon">
                                <i className="bi bi-hash"></i>
                              </div>

                              <div>
                                <span>
                                  REFUND ID
                                </span>

                                <strong>
                                  {refund.paystackRefundId ||
                                    "—"}
                                </strong>
                              </div>
                            </div>

                            <div>
                              <div className="payment-info-icon">
                                <i className="bi bi-ticket-perforated"></i>
                              </div>

                              <div>
                                <span>
                                  TICKETS
                                </span>

                                <strong>
                                  {refund
                                    .tickets
                                    ?.length ||
                                    0}
                                </strong>
                              </div>
                            </div>

                            <div>
                              <div className="payment-info-icon">
                                <i className="bi bi-calendar3"></i>
                              </div>

                              <div>
                                <span>
                                  DATE
                                </span>

                                <strong>
                                  {formatDate(
                                    refund.createdAt
                                  )}
                                </strong>
                              </div>
                            </div>
                          </div>

                          <div className="payment-bottom">
                            <span
                              className={`transaction-status ${refund.status || ""}`}
                            >
                              <i
                                className={
                                  refund.status ===
                                    "success" ||
                                    refund.status ===
                                    "successful" ||
                                    refund.status ===
                                    "processed" ||
                                    refund.status ===
                                    "refunded"
                                    ? "bi bi-check-circle-fill"
                                    : refund.status ===
                                      "failed"
                                      ? "bi bi-x-circle-fill"
                                      : "bi bi-clock-fill"
                                }
                              ></i>

                              {formatStatus(
                                refund.status
                              )}
                            </span>

                            <span className="refund-note">
                              <i className="bi bi-shield-check"></i>

                              Refund activity
                            </span>
                          </div>
                        </article>
                      )
                    )
                  )}
                </div>
              )}

              <div className="payment-help-card">
                <div className="payment-help-icon">
                  <i className="bi bi-shield-check"></i>
                </div>

                <div>
                  <span>
                    PAYMENT SECURITY
                  </span>

                  <h3>
                    Your transaction history,
                    all in one place.
                  </h3>

                  <p>
                    Use this page to review
                    your event payments and
                    keep track of refund
                    activity on your Vibely
                    account.
                  </p>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      <DetailFooter />
    </>
  );
};

export default PaymentsRefunds;