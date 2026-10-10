
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Navbar from "../component/Navbar";
import DetailFooter from "../component/DetailFooter";

import {
  getFoodCart,
  saveFoodCart,
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

  const updateQuantity = (foodId, amount) => {
    setMessage("");

    const updatedItems = getFoodCart()
      .map((item) => {
        if (String(item.foodId) !== String(foodId)) {
          return item;
        }

        return {
          ...item,
          quantity: Math.max(
            0,
            (Number(item.quantity) || 0) + amount
          )
        };
      })
      .filter((item) => item.quantity > 0);

    saveFoodCart(updatedItems);
    setItems(updatedItems);
  };

  const handleRemove = (foodId) => {
    const updatedItems = removeFoodFromCart(foodId);

    setItems(updatedItems);
    setMessage("Food removed from your cart.");
  };

  const handleClearCart = () => {
    clearFoodCart();

    setItems([]);
    setShowClearConfirm(false);
    setMessage("Your cart has been cleared.");
  };

  const handleCheckout = () => {
    if (items.length === 0) {
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
              role="status"
            >
              <i className="bi bi-check-circle"></i>
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
                onClick={() =>
                  setShowClearConfirm(false)
                }
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
