import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import Navbar from "../component/Navbar";
import DetailFooter from "../component/DetailFooter";
import vibelyLogo from "../assets/vibely-logo.png";

import "../styles/paymentsRefunds.css";

const API =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);

const formatDate = (value) => {
  if (!value) return "Unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
};

const formatStatus = (status) =>
  String(status || "pending")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const isSuccessfulPayment = (payment) =>
  ["paid", "success", "successful", "partially_refunded", "refunded"].includes(
    payment.status
  );

const isCompletedRefund = (refund) =>
  ["processed", "refunded"].includes(refund.status);

const getCategory = (item) => {
  if (item.paymentType === "apartment") {
    return {
      name: "Apartment",
      icon: "bi bi-house-door",
      title:
        item.booking?.apartment?.title ||
        item.booking?.apartment?.name ||
        "Apartment Booking",
      location: item.booking?.apartment?.location,
      detailLabel: "BOOKING REFERENCE",
      detail:
        item.booking?.bookingReference ||
        item.booking?._id ||
        "—"
    };
  }

  if (item.paymentType === "food") {
    return {
      name: "Food",
      icon: "bi bi-basket2",
      title:
        item.order?.orderNumber
          ? `Food Order ${item.order.orderNumber}`
          : "Food Order",
      location: null,
      detailLabel: "ORDER REFERENCE",
      detail:
        item.order?.orderReference ||
        item.order?.orderNumber ||
        item.order?._id ||
        "—"
    };
  }

  return {
    name: "Event",
    icon: "bi bi-ticket-perforated",
    title:
      item.booking?.event?.title ||
      "Event Ticket",
    location: item.booking?.event?.location,
    detailLabel: "TICKET CATEGORY",
    detail:
      item.booking?.ticketType ||
      (Array.isArray(item.booking?.selections)
        ? item.booking.selections
            .map((selection) => selection.ticketType)
            .filter(Boolean)
            .join(", ")
        : "") ||
      "—"
  };
};

const getStatusIcon = (status, isRefund = false) => {
  if (
    isRefund
      ? ["processed", "refunded"].includes(status)
      : ["paid", "success", "successful", "partially_refunded", "refunded"].includes(status)
  ) {
    return "bi bi-check-circle-fill";
  }

  if (status === "failed") return "bi bi-x-circle-fill";

  return "bi bi-clock-fill";
};

const PaymentsRefunds = () => {
  const navigate = useNavigate();

  const [payments, setPayments] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [activeTab, setActiveTab] = useState("payments");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      const accessToken = localStorage.getItem("userAccessToken");

      if (!accessToken) {
        navigate("/login", {
          replace: true,
          state: { returnTo: "/payments-refunds" }
        });
        return;
      }

      try {
        setLoading(true);
        setError("");

        const headers = {
          Authorization: `Bearer ${accessToken}`
        };

        const [paymentsResponse, refundsResponse] = await Promise.all([
          axios.get(`${API}/payments/my`, { headers }),
          axios.get(`${API}/refunds/my`, { headers })
        ]);

        if (!active) return;

        const paymentData = paymentsResponse.data.data || [];
        const refundData = refundsResponse.data.data || [];

        setPayments(
          [...paymentData].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
          )
        );

        setRefunds(
          [...refundData].sort(
            (a, b) =>
              new Date(b.updatedAt || b.createdAt).getTime() -
              new Date(a.updatedAt || a.createdAt).getTime()
          )
        );
      } catch (requestError) {
        if (!active) return;

        if (requestError.response?.status === 401) {
          localStorage.removeItem("userAccessToken");
          localStorage.removeItem("userRefreshToken");
          localStorage.removeItem("userRole");

          navigate("/login", {
            replace: true,
            state: { returnTo: "/payments-refunds" }
          });
          return;
        }

        setError(
          requestError.response?.data?.message ||
          "Unable to load your payment activity."
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, [navigate]);

  const successfulPayments = payments.filter(isSuccessfulPayment).length;

  const totalPaid = payments.reduce(
    (total, payment) =>
      isSuccessfulPayment(payment)
        ? total + Number(payment.amount || 0)
        : total,
    0
  );

  const completedRefunds = refunds.filter(isCompletedRefund);

  const totalRefunded = completedRefunds.reduce(
    (total, refund) => total + Number(refund.amount || 0),
    0
  );

  const renderInformation = (icon, label, value) => (
    <div>
      <div className="payment-info-icon">
        <i className={icon}></i>
      </div>

      <div>
        <span>{label}</span>
        <strong>{value || "—"}</strong>
      </div>
    </div>
  );

  if (loading) {
    return (
      <>
        <Navbar />

        <div className="payment-page-loading">
          <div className="payment-loader"></div>
          <h3>Loading payment activity...</h3>
          <p>We're getting your transactions ready.</p>
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
              <span className="payments-eyebrow">YOUR ACCOUNT</span>

              <h1>
                Payments & <em>Refunds.</em>
              </h1>

              <p>
                Keep track of your Vibely transactions, payments and
                refund activity in one place.
              </p>
            </div>

            <div className="payments-hero-card">
              <img src={vibelyLogo} alt="Vibely" />

              <div>
                <span>TRANSACTION HISTORY</span>

                <strong>
                  {payments.length + refunds.length} Transactions
                </strong>

                <p>SECURE · VIBELY</p>
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
                <strong>Unable to load your activity</strong>
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
                    <span>ALL PAYMENTS</span>
                    <strong>{payments.length}</strong>
                    <p>Payment transactions</p>
                  </div>
                </div>

                <div className="payment-summary-card">
                  <div className="payment-summary-icon">
                    <i className="bi bi-check-circle"></i>
                  </div>

                  <div>
                    <span>SUCCESSFUL</span>
                    <strong>{successfulPayments}</strong>
                    <p>Completed payments</p>
                  </div>
                </div>

                <div className="payment-summary-card">
                  <div className="payment-summary-icon">
                    <i className="bi bi-wallet2"></i>
                  </div>

                  <div>
                    <span>TOTAL PAID</span>
                    <strong className="payment-summary-money">
                      {formatPrice(totalPaid)}
                    </strong>
                    <p>Successful payments</p>
                  </div>
                </div>

                <div className="payment-summary-card">
                  <div className="payment-summary-icon">
                    <i className="bi bi-arrow-counterclockwise"></i>
                  </div>

                  <div>
                    <span>REFUNDED</span>
                    <strong className="payment-summary-money">
                      {formatPrice(totalRefunded)}
                    </strong>
                    <p>
                      {completedRefunds.length} completed{" "}
                      {completedRefunds.length === 1 ? "refund" : "refunds"}
                    </p>
                  </div>
                </div>
              </section>

              <div className="payments-section-heading">
                <div>
                  <span>FINANCIAL ACTIVITY</span>
                  <h2>Transaction history</h2>
                  <p>
                    Review your Vibely payments and refund activity.
                  </p>
                </div>

                <div className="payments-security">
                  <i className="bi bi-shield-check"></i>

                  <div>
                    <strong>Secure payments</strong>
                    <span>Protected transactions</span>
                  </div>
                </div>
              </div>

              <div className="payment-tabs">
                <button
                  type="button"
                  className={activeTab === "payments" ? "active" : ""}
                  onClick={() => setActiveTab("payments")}
                >
                  <i className="bi bi-credit-card"></i>
                  Payments
                  <span>{payments.length}</span>
                </button>

                <button
                  type="button"
                  className={activeTab === "refunds" ? "active" : ""}
                  onClick={() => setActiveTab("refunds")}
                >
                  <i className="bi bi-arrow-counterclockwise"></i>
                  Refunds
                  <span>{refunds.length}</span>
                </button>
              </div>

              {activeTab === "payments" && (
                <div className="payment-list">
                  {payments.length === 0 ? (
                    <div className="payment-empty">
                      <div className="payment-empty-icon">
                        <i className="bi bi-credit-card"></i>
                      </div>

                      <span>PAYMENT HISTORY</span>
                      <h3>No payments yet</h3>

                      <p>
                        Your Vibely payment history will appear here
                        after you make a transaction.
                      </p>
                    </div>
                  ) : (
                    payments.map((payment, index) => {
                      const category = getCategory(payment);

                      return (
                        <article
                          className="payment-card"
                          key={`${payment.paymentType}-${payment._id}`}
                        >
                          <div className="payment-card-top">
                            <div className="payment-type">
                              <div className="payment-type-icon">
                                <i className={category.icon}></i>
                              </div>

                              <div>
                                <span>
                                  {category.name.toUpperCase()} PAYMENT{" "}
                                  {String(index + 1).padStart(2, "0")}
                                </span>

                                <h3>{category.title}</h3>

                                {category.location && (
                                  <p>
                                    <i className="bi bi-geo-alt"></i>{" "}
                                    {category.location}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="payment-amount-area">
                              <span>AMOUNT</span>
                              <strong>
                                {formatPrice(payment.amount)}
                              </strong>
                            </div>
                          </div>

                          <div className="payment-information">
                            {renderInformation(
                              "bi bi-receipt",
                              "REFERENCE",
                              payment.paymentReference ||
                                payment.reference
                            )}

                            {renderInformation(
                              category.icon,
                              category.detailLabel,
                              category.detail
                            )}

                            {renderInformation(
                              "bi bi-wallet2",
                              "METHOD",
                              payment.paymentMethod ||
                                (payment.paymentType === "food"
                                  ? "Online Payment"
                                  : "—")
                            )}

                            {renderInformation(
                              "bi bi-calendar3",
                              "DATE",
                              formatDate(payment.createdAt)
                            )}
                          </div>

                          <div className="payment-bottom">
                            <div>
                              <span
                                className={`transaction-status ${payment.status || ""}`}
                              >
                                <i
                                  className={getStatusIcon(
                                    payment.status
                                  )}
                                ></i>{" "}
                                {formatStatus(payment.status)}
                              </span>
                            </div>

                            {Number(payment.refundedAmount) > 0 && (
                              <div className="payment-refunded-amount">
                                <span>REFUNDED</span>
                                <strong>
                                  {formatPrice(payment.refundedAmount)}
                                </strong>
                              </div>
                            )}

                            {payment.paymentType === "food" &&
                              Number(payment.refundAmount) > 0 && (
                                <div className="payment-refunded-amount">
                                  <span>REFUND AMOUNT</span>
                                  <strong>
                                    {formatPrice(payment.refundAmount)}
                                  </strong>
                                </div>
                              )}
                          </div>
                        </article>
                      );
                    })
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

                      <span>REFUND HISTORY</span>
                      <h3>No refunds</h3>

                      <p>
                        You currently have no refund activity on your
                        Vibely account.
                      </p>
                    </div>
                  ) : (
                    refunds.map((refund, index) => {
                      const category = getCategory(refund);

                      return (
                        <article
                          className="payment-card refund-card"
                          key={`${refund.paymentType}-${refund._id}`}
                        >
                          <div className="payment-card-top">
                            <div className="payment-type">
                              <div className="payment-type-icon refund-icon">
                                <i className={category.icon}></i>
                              </div>

                              <div>
                                <span>
                                  {category.name.toUpperCase()} REFUND{" "}
                                  {String(index + 1).padStart(2, "0")}
                                </span>

                                <h3>{category.title}</h3>

                                <p>
                                  <i className="bi bi-receipt"></i>{" "}
                                  {category.name} refund transaction
                                </p>
                              </div>
                            </div>

                            <div className="payment-amount-area">
                              <span>REFUND AMOUNT</span>
                              <strong>
                                {formatPrice(refund.amount)}
                              </strong>
                            </div>
                          </div>

                          <div className="payment-information refund-information">
                            {renderInformation(
                              "bi bi-hash",
                              "REFUND REFERENCE",
                              refund.refundReference ||
                                refund.paystackRefundId ||
                                refund._id
                            )}

                            {renderInformation(
                              category.icon,
                              category.detailLabel,
                              category.detail
                            )}

                            {renderInformation(
                              "bi bi-calendar3",
                              "DATE",
                              formatDate(
                                refund.refundedAt ||
                                  refund.updatedAt ||
                                  refund.createdAt
                              )
                            )}

                            {refund.paymentType === "event" &&
                              renderInformation(
                                "bi bi-ticket-perforated",
                                "TICKETS",
                                refund.tickets?.length ?? 0
                              )}
                          </div>

                          <div className="payment-bottom">
                            <span
                              className={`transaction-status ${refund.status || ""}`}
                            >
                              <i
                                className={getStatusIcon(
                                  refund.status,
                                  true
                                )}
                              ></i>{" "}
                              {formatStatus(refund.status)}
                            </span>

                            <span className="refund-note">
                              <i className="bi bi-shield-check"></i>
                              Refund activity
                            </span>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              )}

              <div className="payment-help-card">
                <div className="payment-help-icon">
                  <i className="bi bi-shield-check"></i>
                </div>

                <div>
                  <span>PAYMENT SECURITY</span>

                  <h3>
                    Your transaction history, all in one place.
                  </h3>

                  <p>
                    Use this page to review your event, apartment,
                    and food payments and track refunds on your
                    Vibely account.
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