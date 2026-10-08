
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../component/Navbar";
import DetailFooter from "../component/DetailFooter";
import "../styles/myRefunds.css";

const API =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const money = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const date = (value) => {
  if (!value) return "Not available";

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? "Not available"
    : parsed.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
};

const statusLabel = (status) => {
  const labels = {
    initiating: "Initiating",
    pending: "Pending",
    processing: "Processing",
    processed: "Refunded",
    failed: "Failed",
    "needs-attention": "Needs Attention"
  };

  return labels[status] || status || "Unknown";
};

const statusClass = (status) => {
  if (status === "processed") return "success";
  if (status === "failed") return "failed";
  if (status === "needs-attention") return "attention";
  return "pending";
};

export default function MyRefunds() {
  const navigate = useNavigate();

  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verifyingId, setVerifyingId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedRefund, setSelectedRefund] = useState(null);

  const fetchRefunds = useCallback(async () => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      navigate("/login", {
        state: { returnTo: "/my-refunds" }
      });
      return;
    }

    try {
      setError("");

      const response = await axios.get(`${API}/refunds/my`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setRefunds(
        Array.isArray(response.data?.data)
          ? response.data.data
          : []
      );
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/login", {
          state: { returnTo: "/my-refunds" }
        });
        return;
      }

      setError(
        err.response?.data?.message ||
          "Unable to load your refunds right now."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const verifyRefund = async (refundId) => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      navigate("/login", {
        state: { returnTo: "/my-refunds" }
      });
      return;
    }

    setVerifyingId(refundId);
    setNotice("");
    setError("");

    try {
      const response = await axios.get(
        `${API}/payments/refunds/${refundId}/verify`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setNotice(
        response.data?.message ||
          "Refund status checked successfully."
      );

      await fetchRefunds();
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/login", {
          state: { returnTo: "/my-refunds" }
        });
        return;
      }

      setError(
        err.response?.data?.message ||
          "Unable to verify this refund right now."
      );
    } finally {
      setVerifyingId(null);
    }
  };

  const filteredRefunds = refunds.filter((refund) => {
    const matchesStatus =
      filter === "all" ||
      (filter === "active" &&
        ["initiating", "pending", "processing"].includes(
          refund.status
        )) ||
      (filter === "processed" &&
        refund.status === "processed") ||
      (filter === "attention" &&
        ["failed", "needs-attention"].includes(refund.status));

    const eventName =
      refund.booking?.event?.title || "";

    const ticketNames = (refund.tickets || [])
      .map((ticket) => ticket.ticketType || "")
      .join(" ");

    const searchable = [
      refund.refundReference,
      refund._id,
      eventName,
      refund.booking?.bookingReference,
      ticketNames
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      matchesStatus &&
      searchable.includes(search.trim().toLowerCase())
    );
  });

  const totalRefunded = refunds
    .filter((refund) => refund.status === "processed")
    .reduce(
      (total, refund) => total + Number(refund.amount || 0),
      0
    );

  const pendingCount = refunds.filter((refund) =>
    ["initiating", "pending", "processing"].includes(
      refund.status
    )
  ).length;

  return (
    <>
      <Navbar />

      <main className="refunds-page">
        <section className="refunds-hero">
          <div className="refunds-container">
            <span className="refunds-eyebrow">
              VIBELY · YOUR ACCOUNT
            </span>
            <h1>My Refunds</h1>
            <p>
              Follow every refund request and keep track of
              your ticket cancellations in one beautiful space.
            </p>

            <div className="refunds-hero-actions">
              <Link to="/my-bookings" className="refunds-hero-link">
                My Bookings
              </Link>
              <Link to="/my-tickets" className="refunds-hero-link">
                My Tickets
              </Link>
            </div>
          </div>
        </section>

        <section className="refunds-container refunds-content">
          <div className="refunds-stats">
            <div className="refunds-stat">
              <span>Total Requests</span>
              <strong>{refunds.length}</strong>
            </div>

            <div className="refunds-stat">
              <span>In Progress</span>
              <strong>{pendingCount}</strong>
            </div>

            <div className="refunds-stat">
              <span>Refunds Processed</span>
              <strong>{money(totalRefunded)}</strong>
            </div>
          </div>

          <div className="refunds-heading">
            <div>
              <span className="refunds-section-eyebrow">
                YOUR REFUND HISTORY
              </span>
              <h2>Refund Requests</h2>
              <p>
                View your requests and check their latest
                status.
              </p>
            </div>

            <button
              type="button"
              className="refunds-refresh"
              onClick={fetchRefunds}
            >
              Refresh List
            </button>
          </div>

          <div className="refunds-toolbar">
            <input
              type="search"
              placeholder="Search refund reference or ticket..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              aria-label="Search refunds"
            />

            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value)
              }
              aria-label="Filter refunds"
            >
              <option value="all">All Refunds</option>
              <option value="active">In Progress</option>
              <option value="processed">Refunded</option>
              <option value="attention">Needs Attention</option>
            </select>
          </div>

          {notice && (
            <div className="refunds-notice" role="status">
              {notice}
              <button
                type="button"
                onClick={() => setNotice("")}
                aria-label="Dismiss message"
              >
                ×
              </button>
            </div>
          )}

          {error && (
            <div className="refunds-error" role="alert">
              {error}
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          {loading ? (
            <div className="refunds-empty">
              <div className="refunds-spinner" />
              <h3>Loading your refunds...</h3>
              <p>Please wait a moment.</p>
            </div>
          ) : filteredRefunds.length === 0 ? (
            <div className="refunds-empty">
              <div className="refunds-empty-icon">↺</div>
              <h3>
                {refunds.length === 0
                  ? "No refund requests yet"
                  : "No matching refunds"}
              </h3>
              <p>
                {refunds.length === 0
                  ? "When you request a ticket refund, you can track it here."
                  : "Try changing your search or filter."}
              </p>
              {refunds.length === 0 && (
                <Link to="/my-tickets" className="refunds-primary">
                  View My Tickets
                </Link>
              )}
            </div>
          ) : (
            <div className="refunds-list">
              {filteredRefunds.map((refund) => {
                const canVerify = ![
                  "processed",
                  "failed"
                ].includes(refund.status);

                const tickets = Array.isArray(refund.tickets)
                  ? refund.tickets
                  : [];

                return (
                  <article
                    className="refunds-card"
                    key={refund._id}
                  >
                    <div className="refunds-card-top">
                      <div>
                        <span className="refunds-card-label">
                          REFUND REFERENCE
                        </span>
                        <h3>
                          {refund.refundReference ||
                            String(refund._id).slice(-10)}
                        </h3>
                      </div>

                      <span
                        className={`refunds-status ${statusClass(
                          refund.status
                        )}`}
                      >
                        {statusLabel(refund.status)}
                      </span>
                    </div>

                    <div className="refunds-card-amount">
                      <span>Refund Amount</span>
                      <strong>{money(refund.amount)}</strong>
                    </div>

                    <div className="refunds-card-details">
                      <div>
                        <span>Refund Type</span>
                        <strong>
                          {refund.refundKind === "automatic_full"
                            ? "Automatic Full Refund"
                            : "Ticket Cancellation"}
                        </strong>
                      </div>

                      <div>
                        <span>Tickets</span>
                        <strong>
                          {tickets.length > 0
                            ? `${tickets.length} ticket${
                                tickets.length === 1 ? "" : "s"
                              }`
                            : "Not issued"}
                        </strong>
                      </div>

                      <div>
                        <span>Requested On</span>
                        <strong>
                          {date(refund.createdAt)}
                        </strong>
                      </div>

                      <div>
                        <span>Booking Reference</span>
                        <strong>
                          {refund.booking?.bookingReference ||
                            "Not available"}
                        </strong>
                      </div>
                    </div>

                    {tickets.length > 0 && (
                      <div className="refunds-ticket-types">
                        {tickets.map((ticket) => (
                          <span key={ticket._id}>
                            {ticket.ticketType || "Event Ticket"}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="refunds-card-actions">
                      <button
                        type="button"
                        className="refunds-outline"
                        onClick={() =>
                          setSelectedRefund(refund)
                        }
                      >
                        View Details
                      </button>

                      {canVerify && (
                        <button
                          type="button"
                          className="refunds-primary"
                          disabled={verifyingId === refund._id}
                          onClick={() =>
                            verifyRefund(refund._id)
                          }
                        >
                          {verifyingId === refund._id
                            ? "Checking..."
                            : "Verify Refund"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="refunds-help">
            <div>
              <h3>Need help with a refund?</h3>
              <p>
                Refunds may take time to complete after
                Paystack accepts a request. If a refund needs
                attention, keep your reference handy when
                contacting support.
              </p>
            </div>
            <Link to="/my-bookings">
              View My Bookings →
            </Link>
          </div>
        </section>
      </main>

      <DetailFooter />

      {selectedRefund && (
        <div
          className="refunds-modal-backdrop"
          onClick={() => setSelectedRefund(null)}
        >
          <div
            className="refunds-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="refund-details-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="refunds-modal-close"
              onClick={() => setSelectedRefund(null)}
              aria-label="Close details"
            >
              ×
            </button>

            <span className="refunds-section-eyebrow">
              REFUND DETAILS
            </span>
            <h2 id="refund-details-title">
              Refund Information
            </h2>

            <div className="refunds-modal-row">
              <span>Reference</span>
              <strong>
                {selectedRefund.refundReference}
              </strong>
            </div>

            <div className="refunds-modal-row">
              <span>Amount</span>
              <strong>
                {money(selectedRefund.amount)}
              </strong>
            </div>

            <div className="refunds-modal-row">
              <span>Status</span>
              <strong>
                {statusLabel(selectedRefund.status)}
              </strong>
            </div>

            <div className="refunds-modal-row">
              <span>Requested</span>
              <strong>
                {date(selectedRefund.createdAt)}
              </strong>
            </div>

            <div className="refunds-modal-row">
              <span>Booking</span>
              <strong>
                {selectedRefund.booking?.bookingReference ||
                  "Not available"}
              </strong>
            </div>

            {selectedRefund.reason && (
              <div className="refunds-modal-reason">
                <span>Reason</span>
                <p>{selectedRefund.reason}</p>
              </div>
            )}

            <h3>Associated Tickets</h3>

            {(selectedRefund.tickets || []).length > 0 ? (
              <div className="refunds-modal-tickets">
                {selectedRefund.tickets.map((ticket) => (
                  <div key={ticket._id}>
                    <strong>
                      {ticket.ticketType || "Event Ticket"}
                    </strong>
                    <span>
                      {ticket.ticketCode || "No ticket code"}
                    </span>
                    <small>
                      {statusLabel(ticket.status)}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="refunds-modal-muted">
                No individual tickets were issued for this
                refund.
              </p>
            )}

            <button
              type="button"
              className="refunds-primary refunds-modal-done"
              onClick={() => setSelectedRefund(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
