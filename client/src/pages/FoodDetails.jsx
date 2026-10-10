
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import Navbar from "../component/Navbar";
import DetailFooter from "../component/DetailFooter";
import { addFoodToCart, getFoodCart } from "../utils/foodCart";

import "../styles/foodDetails.css";

const API =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const FoodDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [food, setFood] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderError, setOrderError] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const fetchFood = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `${API}/foods/${encodeURIComponent(id)}`
        );

        setFood(response.data.data);
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Cannot load this food item."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchFood();
  }, [id]);

  useEffect(() => {
    const updateCartCount = () => {
      const cart = getFoodCart();

      setCartCount(
        cart.reduce(
          (total, item) => total + item.quantity,
          0
        )
      );
    };

    updateCartCount();

    window.addEventListener(
      "vibely-cart-updated",
      updateCartCount
    );

    return () => {
      window.removeEventListener(
        "vibely-cart-updated",
        updateCartCount
      );
    };
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0
    }).format(price || 0);
  };

  const availableQuantity = Number(food?.quantity || 0);

  const increaseQuantity = () => {
    setQuantity((current) =>
      Math.min(current + 1, availableQuantity)
    );
  };

  const decreaseQuantity = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  const handleAddToCart = () => {
    setOrderError("");
    setCartMessage("");

    if (!food || availableQuantity <= 0 || food.isAvailable === false) {
      setOrderError("This food is currently unavailable.");
      return;
    }

    const existingItem = getFoodCart().find(
      (item) => item.foodId === String(food._id)
    );

    const existingQuantity = existingItem?.quantity || 0;

    if (existingQuantity + quantity > availableQuantity) {
      setOrderError(
        `Only ${availableQuantity} portions are currently available. You already have ${existingQuantity} in your cart.`
      );
      return;
    }

    const added = addFoodToCart(
      {
        ...food,
        vendor: food.vendor || food.createdBy
      },
      quantity
    );

    if (!added) {
      setOrderError("Could not add this food to your cart.");
      return;
    }

    setCartMessage(
      `${quantity} ${quantity === 1 ? "portion" : "portions"} of ${food.name} added to your cart!`
    );
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="food-details-state">
          <div className="food-details-loader"></div>
          <h3>Loading food...</h3>
        </div>
      </>
    );
  }

  if (error || !food) {
    return (
      <>
        <Navbar />
        <div className="food-details-state">
          <div className="food-details-state-icon">
            <i className="bi bi-cup-hot"></i>
          </div>
          <h3>Food unavailable</h3>
          <p>{error}</p>
          <Link to="/food">Back to Food</Link>
        </div>
      </>
    );
  }

  const soldOut =
    availableQuantity <= 0 || food.isAvailable === false;

  const total = Number(food.price) * quantity;

  const vendorName =
    food.createdBy?.businessName ||
    `${food.createdBy?.firstname || ""} ${
      food.createdBy?.lastname || ""
    }`.trim() ||
    "Vibely Vendor";

  return (
    <>
      <Navbar />

      <main className="food-details-page">
        <div className="container">
          <div className="food-details-back">
            <Link to="/food">
              <i className="bi bi-arrow-left"></i>
              Back to Food
            </Link>

            <Link to="/food-cart" className="food-cart-shortcut">
              <i className="bi bi-bag"></i>
              My Cart ({cartCount})
            </Link>
          </div>

          <section className="food-details-layout">
            <div className="food-details-left">
              <div className="food-details-image">
                {food.image ? (
                  <img src={food.image} alt={food.name} />
                ) : (
                  <div className="food-details-placeholder">
                    <i className="bi bi-cup-hot"></i>
                    <span>Vibely Food</span>
                  </div>
                )}

                <span className="food-details-category">
                  {food.category}
                </span>

                {soldOut && (
                  <span className="food-details-soldout">
                    Sold Out
                  </span>
                )}
              </div>

              <div className="food-about-card">
                <span className="food-small-heading">
                  ABOUT THIS MEAL
                </span>

                <h2>{food.name}</h2>
                <p>{food.description}</p>
              </div>
            </div>

            <aside className="food-order-card">
              <div className="food-vendor-name">
                <div>
                  <i className="bi bi-shop"></i>
                </div>

                <span>
                  <small>Prepared by</small>
                  <strong>{vendorName}</strong>
                </span>
              </div>

              <div className="food-order-heading">
                <span>{food.category}</span>
                <h1>{food.name}</h1>
                <p>{food.description}</p>
              </div>

              <div className="food-order-price">
                <span>Price</span>
                <strong>{formatPrice(food.price)}</strong>
                <small>per item</small>
              </div>

              {soldOut ? (
                <div className="food-unavailable-box">
                  <i className="bi bi-exclamation-circle"></i>

                  <div>
                    <strong>Currently sold out</strong>
                    <span>
                      This meal is not available for ordering
                      right now.
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="food-quantity-section">
                    <div>
                      <label>Quantity</label>
                      <span>Choose how many you want</span>
                    </div>

                    <div className="food-quantity-selector">
                      <button
                        type="button"
                        onClick={decreaseQuantity}
                        disabled={quantity <= 1}
                      >
                        −
                      </button>

                      <strong>{quantity}</strong>

                      <button
                        type="button"
                        onClick={increaseQuantity}
                        disabled={quantity >= availableQuantity}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="food-order-summary">
                    <div>
                      <span>Item</span>
                      <strong>{food.name}</strong>
                    </div>

                    <div>
                      <span>Quantity</span>
                      <strong>{quantity}</strong>
                    </div>

                    <div>
                      <span>Price</span>
                      <strong>{formatPrice(food.price)}</strong>
                    </div>

                    <div className="food-order-total">
                      <span>Total</span>
                      <strong>{formatPrice(total)}</strong>
                    </div>
                  </div>

                  {orderError && (
                    <div className="food-order-error">
                      <i className="bi bi-exclamation-circle"></i>
                      {orderError}
                    </div>
                  )}

                  {cartMessage && (
                    <div className="food-cart-success" role="status">
                      <i className="bi bi-check-circle-fill"></i>
                      <span>{cartMessage}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    className="food-order-button"
                    onClick={handleAddToCart}
                  >
                    <i className="bi bi-bag-plus"></i>
                    Add to Cart
                    <i className="bi bi-arrow-right"></i>
                  </button>

                  <button
                    type="button"
                    className="food-cart-view-button"
                    onClick={() => navigate("/food-cart")}
                  >
                    View Cart ({cartCount})
                  </button>

                  <div className="food-secure-payment">
                    <i className="bi bi-shield-check"></i>
                    Add more meals and pay once at checkout
                  </div>
                </>
              )}
            </aside>
          </section>
        </div>
      </main>

      <DetailFooter />
    </>
  );
};

export default FoodDetails;
