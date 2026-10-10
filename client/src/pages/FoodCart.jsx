
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import Navbar from "../component/Navbar";
import DetailFooter from "../component/DetailFooter";

import {
  getFoodCart,
  updateFoodCartQuantity,
  removeFoodFromCart,
  clearFoodCart
} from "../utils/foodCart";

import "../styles/foodCart.css";

const API_URL = "https://eventbookingsystem-sooty.vercel.app/api/v1";

const formatPrice = (price) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(price) || 0);
};

const FoodCart = () => {
  const navigate = useNavigate();

  const [items, setItems] = useState(() => getFoodCart());
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    const refreshCart = () => {
      setItems(getFoodCart());
    };

    window.addEventListener("vibely-cart-updated", refreshCart);
    window.addEventListener("storage", refreshCart);

    return () => {
      window.removeEventListener("vibely-cart-updated", refreshCart);
      window.removeEventListener("storage", refreshCart);
    };
  }, []);

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const updateQuantity = (foodId, amount) => {
    setMessage("");

    const currentItem = getFoodCart().find(
      (item) => String(item.foodId) === String(foodId)
    );

    if (!currentItem) {
      showMessage("This food is no longer in your cart.", "error");
      return;
    }

    const currentQuantity = Number(currentItem.quantity) || 0;
    const newQuantity = currentQuantity + amount;

    if (newQuantity < 1) {
      showMessage(
        "The minimum quantity is 1. Use Remove to delete this food.",
        "error"
      );
      return;
    }

    const updated = updateFoodCartQuantity(foodId, newQuantity);

    if (!updated) {
      showMessage(
        "You cannot add more portions than are currently available.",
        "error"
      );
      return;
    }

    setItems(getFoodCart());
  };

  const handleRemove = (foodId) => {
    const updatedItems = removeFoodFromCart(foodId);

    setItems(updatedItems);
    showMessage("Food removed from your cart.");
  };

  const handleClearCart = () => {
    clearFoodCart();

    setItems([]);
    setShowClearConfirm(false);
    showMessage("Your cart has been cleared.");
  };

  

const handleCheckout = async () => {
  if (checkingOut) return;

  setMessage("");

  const cart = getFoodCart();

  if (!cart.length) {
    showMessage("Your cart is empty.", "error");
    return;
  }

  const vendorIds = [
    ...new Set(cart.map((item) => String(item.vendorId || "")))
  ];

  if (
    vendorIds.length !== 1 ||
    !vendorIds[0] ||
    vendorIds[0] === "[object Object]"
  ) {
    showMessage(
      "You can only order food from one vendor at a time.",
      "error"
    );
    return;
  }

  const invalidItem = cart.some(
    (item) =>
      !item.foodId ||
      !Number.isInteger(Number(item.quantity)) ||
      Number(item.quantity) < 1
  );

  if (invalidItem) {
    showMessage("Please review your cart items.", "error");
    return;
  }

  const token = localStorage.getItem("userAccessToken");

  if (!token) {
    navigate("/login", {
      state: { returnTo: "/food-cart" }
    });
    return;
  }

  const signature = JSON.stringify(
    cart
      .map((item) => ({
        foodId: String(item.foodId),
        quantity: Number(item.quantity)
      }))
      .sort((a, b) => a.foodId.localeCompare(b.foodId))
  );

  try {
    setCheckingOut(true);

    let savedCheckout = null;

    try {
      savedCheckout = JSON.parse(
        sessionStorage.getItem("vibelyFoodCheckout") || "null"
      );
    } catch {
      sessionStorage.removeItem("vibelyFoodCheckout");
    }

    if (
      savedCheckout?.signature === signature &&
      savedCheckout?.orderId
    ) {
      const existingResponse = await axios.get(
        `${API_URL}/food-orders/${savedCheckout.orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      ).catch((error) => {
        if (error.response?.status === 404) return null;
        throw error;
      });

      const existingOrder = existingResponse?.data?.data;

      if (
        existingOrder &&
        existingOrder.orderStatus !== "cancelled" &&
        existingOrder.paymentStatus === "pending"
      ) {
        navigate(`/food-checkout/${existingOrder._id}`);
        return;
      }

      if (existingOrder?.paymentStatus === "paid") {
        navigate(`/my-food-orders/${existingOrder._id}`);
        return;
      }

      if (
        existingOrder &&
        existingOrder.paymentStatus !== "failed" &&
        existingOrder.orderStatus !== "cancelled"
      ) {
        showMessage(
          "This order already has payment activity. Please check My Food Orders before trying again.",
          "error"
        );
        return;
      }

      sessionStorage.removeItem("vibelyFoodCheckout");
    }

    const response = await axios.post(
      `${API_URL}/food-orders`,
      {
        items: cart.map((item) => ({
          food: item.foodId,
          quantity: Number(item.quantity)
        }))
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const order = response.data?.data;

    if (!order?._id) {
      showMessage(
        "Your order may have been created. Please check My Food Orders before trying again.",
        "error"
      );
      return;
    }

    sessionStorage.setItem(
      "vibelyFoodCheckout",
      JSON.stringify({
        orderId: String(order._id),
        totalAmount: Number(order.totalAmount),
        signature
      })
    );

    navigate(`/food-checkout/${order._id}`);
  } catch (error) {
    console.error("FOOD CHECKOUT ERROR:", error);

    showMessage(
      error.response?.data?.message ||
        "Unable to prepare checkout. Please check My Food Orders before retrying.",
      "error"
    );
  } finally {
    setCheckingOut(false);
  }
};



  const totalQuantity = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0
  );

  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      (Number(item.price) || 0) *
        (Number(item.quantity) || 0),
    0
  );

  return (
    <>
      <Navbar />

      <main className="vibely-cart-page">
        <div className="container">
          <div className="vibely-cart-top">
            <div>
              <span className="vibely-cart-eyebrow">
                YOUR FOOD SELECTION
              </span>

              <h1>Your Food Cart</h1>

              <p>
                All your favourite meals, ready for one easy
                checkout.
              </p>
            </div>

            <Link
              to="/food"
              className="vibely-cart-back"
            >
              <i className="bi bi-arrow-left"></i>
              Continue Shopping
            </Link>
          </div>

          {message && (
            <div
              className="vibely-cart-message"
              role={messageType === "error" ? "alert" : "status"}
              style={
                messageType === "error"
                  ? {
                      background: "#fff1f2",
                      border: "1px solid #fecdd3",
                      color: "#9f1239"
                    }
                  : undefined
              }
            >
              <i
                className={
                  messageType === "error"
                    ? "bi bi-exclamation-circle"
                    : "bi bi-check-circle"
                }
              ></i>

              <span>{message}</span>

              <button
                type="button"
                onClick={() => setMessage("")}
                aria-label="Dismiss message"
                style={{
                  marginLeft: "auto",
                  border: "none",
                  background: "transparent",
                  color: "inherit",
                  cursor: "pointer"
                }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          )}

          {items.length === 0 ? (
            <div className="vibely-cart-empty">
              <div className="vibely-cart-empty-icon">
                <i className="bi bi-bag-heart"></i>
              </div>

              <h2>Your cart is empty</h2>

              <p>
                Discover delicious meals and add something
                you love.
              </p>

              <Link
                to="/food"
                className="vibely-cart-primary"
              >
                Explore Food
                <i className="bi bi-arrow-right"></i>
              </Link>
            </div>
          ) : (
            <div className="vibely-cart-layout">
              <section className="vibely-cart-items">
                <div className="vibely-cart-items-header">
                  <h2>
                    Your Items <span>({totalQuantity})</span>
                  </h2>

                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="vibely-cart-clear"
                  >
                    <i className="bi bi-trash3"></i>
                    Clear Cart
                  </button>
                </div>

                {items.map((item) => (
                  <article
                    key={item.foodId}
                    className="vibely-cart-item"
                  >
                    <div className="vibely-cart-item-image">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                        />
                      ) : (
                        <i className="bi bi-cup-hot"></i>
                      )}
                    </div>

                    <div className="vibely-cart-item-info">
                      <Link to={`/food/${item.foodId}`}>
                        <h3>{item.name}</h3>
                      </Link>

                      <span className="vibely-cart-unit-price">
                        {formatPrice(item.price)} each
                      </span>

                      <button
                        type="button"
                        className="vibely-cart-remove"
                        onClick={() =>
                          handleRemove(item.foodId)
                        }
                      >
                        <i className="bi bi-x-circle"></i>
                        Remove
                      </button>
                    </div>

                    <div className="vibely-cart-item-actions">
                      <div className="vibely-cart-quantity">
                        <button
                          type="button"
                          aria-label={`Decrease ${item.name}`}
                          onClick={() =>
                            updateQuantity(item.foodId, -1)
                          }
                          disabled={Number(item.quantity) <= 1}
                        >
                          −
                        </button>

                        <strong>{item.quantity}</strong>

                        <button
                          type="button"
                          aria-label={`Increase ${item.name}`}
                          onClick={() =>
                            updateQuantity(item.foodId, 1)
                          }
                          disabled={
                            item.availableQuantity !== null &&
                            item.availableQuantity !== undefined &&
                            Number(item.quantity) >=
                              Number(item.availableQuantity)
                          }
                        >
                          +
                        </button>
                      </div>

                      <strong className="vibely-cart-line-total">
                        {formatPrice(
                          Number(item.price) *
                            Number(item.quantity)
                        )}
                      </strong>
                    </div>
                  </article>
                ))}
              </section>

              <aside className="vibely-cart-summary">
                <span className="vibely-cart-eyebrow">
                  YOUR ORDER
                </span>

                <h2>Order Summary</h2>

                <div className="vibely-cart-summary-row">
                  <span>Items</span>
                  <strong>{totalQuantity}</strong>
                </div>

                <div className="vibely-cart-summary-row">
                  <span>Subtotal</span>
                  <strong>{formatPrice(subtotal)}</strong>
                </div>

                <div className="vibely-cart-summary-divider"></div>

                <div className="vibely-cart-summary-total">
                  <span>Total</span>
                  <strong>{formatPrice(subtotal)}</strong>
                </div>

                <p className="vibely-cart-price-note">
                  Final prices and availability will be
                  confirmed before payment.
                </p>

                <button
                  type="button"
                  className="vibely-cart-checkout"
                  onClick={handleCheckout}
                  disabled={checkingOut}
                >
                  {checkingOut
                    ? "Preparing Checkout..."
                    : "Proceed to Checkout"}

                  <i
                    className={
                      checkingOut
                        ? "bi bi-hourglass-split"
                        : "bi bi-arrow-right"
                    }
                  ></i>
                </button>

                <div className="vibely-cart-secure">
                  <i className="bi bi-shield-check"></i>
                  Secure checkout with Paystack
                </div>

                <Link
                  to="/food"
                  className="vibely-cart-more"
                >
                  <i className="bi bi-plus-circle"></i>
                  Add More Food
                </Link>
              </aside>
            </div>
          )}
        </div>
      </main>

      {showClearConfirm && (
        <div
          className="vibely-cart-modal-backdrop"
          role="presentation"
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="vibely-cart-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-cart-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="vibely-cart-modal-icon">
              <i className="bi bi-trash3"></i>
            </div>

            <h2 id="clear-cart-title">
              Clear your cart?
            </h2>

            <p>
              All selected meals will be removed from
              your cart.
            </p>

            <div className="vibely-cart-modal-actions">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
              >
                Keep Items
              </button>

              <button
                type="button"
                onClick={handleClearCart}
              >
                Clear Cart
              </button>
            </div>
          </div>
        </div>
      )}

      <DetailFooter />
    </>
  );
};

export default FoodCart;
