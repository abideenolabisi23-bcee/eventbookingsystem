
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Navbar from "../component/Navbar";
import DetailFooter from "../component/DetailFooter";

import {
  getFoodCart,
  updateFoodCartQuantity,
  removeFoodFromCart,
  clearFoodCart
} from "../utils/foodCart";

import "../styles/foodCart.css";

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
      return;
    }

    const newQuantity = Number(currentItem.quantity) + amount;

    const updated = updateFoodCartQuantity(
      foodId,
      newQuantity
    );

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

  const handleCheckout = () => {
    setMessage("");

    const cart = getFoodCart();

    if (cart.length === 0) {
      showMessage(
        "Your cart is empty. Add some food before checkout.",
        "error"
      );
      return;
    }

    const vendorIds = [
      ...new Set(
        cart.map((item) => String(item.vendorId || ""))
      )
    ];

    if (
      vendorIds.length !== 1 ||
      !vendorIds[0] ||
      vendorIds[0] === "[object Object]"
    ) {
      showMessage(
        "Your cart must contain food from one vendor only. Please review your items.",
        "error"
      );
      return;
    }

    const invalidItem = cart.some(
      (item) =>
        !item.foodId ||
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) < 1 ||
        !Number.isFinite(Number(item.price)) ||
        Number(item.price) < 0
    );

    if (invalidItem) {
      showMessage(
        "Some cart items are invalid. Please review your cart.",
        "error"
      );
      return;
    }

    const token = localStorage.getItem("userAccessToken");

    if (!token) {
      navigate("/login", {
        state: {
          returnTo: "/food-cart"
        }
      });

      return;
    }

    navigate("/food-checkout");
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
                All your favourite meals, ready for one
                easy checkout.
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

              {message}
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
                        onClick={() => handleRemove(item.foodId)}
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
                >
                  Proceed to Checkout
                  <i className="bi bi-arrow-right"></i>
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
