
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/foodVendorPickup.css";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1"
).replace(/\/+$/, "");

const formatMoney = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);

const FoodVendorPickup = () => {
  const navigate = useNavigate();

  const [pickupCode, setPickupCode] = useState("");
  const [verifiedOrder, setVerifiedOrder] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [message, setMessage] = useState(null);
  const [completed, setCompleted] = useState(false);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem(
      "foodVendorAccessToken"
    )}`
  });

  const handleVerify = async (event) => {
    event.preventDefault();

    const code = pickupCode.trim();

    if (!code) {
      setMessage({
        type: "error",
        text: "Please enter the customer's pickup code."
      });
      return;
    }

    setVerifying(true);
    setMessage(null);
    setVerifiedOrder(null);
    setCompleted(false);

    try {
      const response = await axios.get(
        `${API_URL}/food-vendor/orders/pickup/${encodeURIComponent(
          code
        )}`,
        { headers: getHeaders() }
      );

      const order = response.data?.data;

      if (!order || !order._id) {
        throw new Error("No valid order was returned.");
      }

      setVerifiedOrder(order);

      setMessage({
        type: "success",
        text: "Pickup code verified successfully."
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          error.message ||
          "Unable to verify this pickup code."
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleConfirmPickup = async () => {
    if (!verifiedOrder || confirming) return;

    setConfirming(true);
    setMessage(null);

    try {
      await axios.patch(
        `${API_URL}/food-vendor/orders/pickup/${encodeURIComponent(
          pickupCode.trim()
        )}/confirm`,
        {},
        { headers: getHeaders() }
      );

      setCompleted(true);
      setShowConfirmation(false);
      setVerifiedOrder((previous) => ({
        ...previous,
        orderStatus: "completed"
      }));

      setMessage({
        type: "success",
        text: "Food collection confirmed successfully!"
      });
    } catch (error) {
      setShowConfirmation(false);

      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Unable to confirm food collection."
      });
    } finally {
      setConfirming(false);
    }
  };

  const resetPickup = () => {
    setPickupCode("");
    setVerifiedOrder(null);
    setCompleted(false);
    setMessage(null);
    setShowConfirmation(false);
  };

  return (
    <div className="fv-pickup-page">
      <div className="fv-pickup-container">
        <button
          className="fv-pickup-back"
          onClick={() => navigate("/food-vendor/dashboard")}
        >
          <i className="bi bi-arrow-left" />
          Back to Dashboard
        </button>

        <header className="fv-pickup-header">
          <span>VIBELY FOOD VENDOR PORTAL</span>
          <h1>Food Pickup Verification</h1>
          <p>
            Verify a customer's pickup code before handing over
            their food order.
          </p>
        </header>

        <section className="fv-pickup-hero">
          <div>
            <span>SECURE ORDER COLLECTION</span>
            <h2>Every pickup, safely confirmed.</h2>
            <p>
              Enter the unique code provided by your customer
              to verify their order and complete collection.
            </p>
          </div>

          <div className="fv-pickup-hero-icon">
            <i className="bi bi-shield-check" />
          </div>
        </section>

        <section className="fv-pickup-card">
          <div className="fv-pickup-card-heading">
            <div className="fv-pickup-card-icon">
              <i className="bi bi-qr-code-scan" />
            </div>

            <div>
              <h2>Verify Pickup Code</h2>
              <p>Ask the customer for their unique pickup code.</p>
            </div>
          </div>

          <form onSubmit={handleVerify}>
            <label htmlFor="pickupCode">
              Customer Pickup Code
            </label>

            <div className="fv-pickup-input">
              <i className="bi bi-key" />

              <input
                id="pickupCode"
                type="text"
                placeholder="Enter pickup code"
                value={pickupCode}
                onChange={(event) => {
                  setPickupCode(event.target.value);
                  setVerifiedOrder(null);
                  setCompleted(false);
                  setMessage(null);
                }}
                autoComplete="off"
                required
              />
            </div>

            <button
              className="fv-pickup-verify-btn"
              type="submit"
              disabled={verifying || !pickupCode.trim()}
            >
              {verifying ? (
                <>
                  <i className="bi bi-arrow-repeat" />
                  Verifying Code...
                </>
              ) : (
                <>
                  <i className="bi bi-shield-check" />
                  Verify Pickup Code
                </>
              )}
            </button>
          </form>

          {message && (
            <div
              className={`fv-pickup-message ${message.type}`}
              role="status"
            >
              <i
                className={`bi ${
                  message.type === "success"
                    ? "bi-check-circle-fill"
                    : "bi-exclamation-circle-fill"
                }`}
              />

              <span>{message.text}</span>
            </div>
          )}
        </section>

        {verifiedOrder && (
          <section className="fv-pickup-order-card">
            <div className="fv-pickup-order-heading">
              <div>
                <span>VERIFIED ORDER</span>
                <h2>{verifiedOrder.orderReference}</h2>
              </div>

              <span
                className={`fv-pickup-status ${
                  completed ? "completed" : "ready"
                }`}
              >
                {completed ? "Collected" : "Ready for Pickup"}
              </span>
            </div>

            <div className="fv-pickup-info-grid">
              <div>
                <span>Customer</span>
                <strong>
                  {[
                    verifiedOrder.user?.firstname,
                    verifiedOrder.user?.lastname
                  ]
                    .filter(Boolean)
                    .join(" ") || "Customer"}
                </strong>
              </div>

              <div>
                <span>Payment Status</span>
                <strong>
                  {verifiedOrder.paymentStatus || "—"}
                </strong>
              </div>

              <div>
                <span>Order Status</span>
                <strong>
                  {verifiedOrder.orderStatus || "—"}
                </strong>
              </div>

              <div>
                <span>Total Amount</span>
                <strong>
                  {formatMoney(verifiedOrder.totalAmount)}
                </strong>
              </div>
            </div>

            <div className="fv-pickup-items">
              <h3>Customer's Food Order</h3>

              {(verifiedOrder.items || []).map(
                (item, index) => (
                  <div
                    className="fv-pickup-item"
                    key={index}
                  >
                    <div className="fv-pickup-food-icon">
                      <i className="bi bi-egg-fried" />
                    </div>

                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        Quantity: {item.quantity}
                      </small>
                    </div>

                    <strong>
                      {formatMoney(item.subtotal)}
                    </strong>
                  </div>
                )
              )}
            </div>

            {completed ? (
              <div className="fv-pickup-completed">
                <i className="bi bi-patch-check-fill" />
                <h3>Pickup Completed!</h3>
                <p>
                  The food has been successfully marked as
                  collected.
                </p>

                <button onClick={resetPickup}>
                  Verify Another Pickup
                </button>
              </div>
            ) : (
              <div className="fv-pickup-actions">
                <p>
                  <i className="bi bi-info-circle" />
                  Confirm collection only after handing the
                  food to the customer.
                </p>

                <button
                  onClick={() => setShowConfirmation(true)}
                  disabled={
                    verifiedOrder.paymentStatus !== "paid" ||
                    verifiedOrder.orderStatus !== "ready"
                  }
                >
                  <i className="bi bi-check2-circle" />
                  Confirm Food Collection
                </button>
              </div>
            )}
          </section>
        )}

        <div className="fv-pickup-help">
          <i className="bi bi-lock" />
          Pickup verification is restricted to approved food
          vendors and their own orders.
        </div>
      </div>

      {showConfirmation && (
        <div className="fv-pickup-overlay">
          <div
            className="fv-pickup-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirm food collection"
          >
            <div className="fv-pickup-confirm-icon">
              <i className="bi bi-bag-check" />
            </div>

            <h2>Confirm Food Collection?</h2>

            <p>
              Are you sure you have handed the food to the
              customer? This action will mark the order as
              completed and cannot be undone.
            </p>

            <div className="fv-pickup-confirm-buttons">
              <button
                onClick={() => setShowConfirmation(false)}
                disabled={confirming}
              >
                Go Back
              </button>

              <button
                onClick={handleConfirmPickup}
                disabled={confirming}
              >
                {confirming
                  ? "Confirming..."
                  : "Yes, Food Collected"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodVendorPickup;
