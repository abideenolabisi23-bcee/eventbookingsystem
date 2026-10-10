import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "./Navbar";
import DetailFooter from "./DetailFooter";
import "../styles/foodDetails.css";
import {
  addFoodToCart,
  getFoodCartCount
} from "../utils/foodCart";

const FoodDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [food, setFood] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState({
    show: false,
    type: "",
    message: ""
  });

  useEffect(() => {
    fetchFood();
  }, [id]);

  const fetchFood = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `https://eventbookingsystem-sooty.vercel.app/api/v1/foods/${id}`
      );

      setFood(response.data?.data || null);
    } catch (error) {
      console.log(error);

      setError(
        error.response?.data?.message ||
        "We couldn't load this food right now."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0
    }).format(Number(price) || 0);
  };

  const vendorName = useMemo(() => {
    if (!food) {
      return "";
    }

    if (food.createdBy?.businessName) {
      return food.createdBy.businessName;
    }

    const name = `${food.createdBy?.firstname || ""} ${food.createdBy?.lastname || ""
      }`.trim();

    return name || "Vibely Food Vendor";
  }, [food]);

  const totalAmount = useMemo(() => {
    if (!food) {
      return 0;
    }

    return Number(food.price || 0) * quantity;
  }, [food, quantity]);

  const soldOut = Number(food?.quantity || 0) <= 0;

  const showNotification = (type, message) => {
    setNotification({
      show: true,
      type,
      message
    });

    setTimeout(() => {
      setNotification({
        show: false,
        type: "",
        message: ""
      });
    }, 3500);
  };

  const decreaseQuantity = () => {
    setQuantity((currentQuantity) =>
      Math.max(1, currentQuantity - 1)
    );
  };

  const increaseQuantity = () => {
    if (!food) {
      return;
    }

    setQuantity((currentQuantity) =>
      Math.min(
        Number(food.quantity),
        currentQuantity + 1
      )
    );
  };

  const handleQuantityInput = (event) => {
    if (!food) {
      return;
    }

    const value = Number(event.target.value);

    if (!Number.isInteger(value)) {
      return;
    }

    if (value < 1) {
      setQuantity(1);
      return;
    }

    if (value > Number(food.quantity)) {
      setQuantity(Number(food.quantity));
      return;
    }

    setQuantity(value);
  };

  const handleAddToCart = () => {
  if (!food || soldOut) {
    return;
  }

  const added = addFoodToCart(food, quantity);

  if (!added) {
    showNotification(
      "error",
      "Unable to add this food. Please check the available quantity or remove food from another vendor."
    );
    return;
  }

  showNotification(
    "success",
    `${quantity} × ${food.name} added to your cart!`
  );

  setQuantity(1);
};

    const token = localStorage.getItem("userAccessToken");

    if (!token) {
      showNotification(
        "error",
        "Please log in before placing your food order."
      );

      setTimeout(() => {
        navigate("/login");
      }, 1200);

      return;
    }

    try {
      setOrdering(true);

      const response = await axios.post(
        "https://eventbookingsystem-sooty.vercel.app/api/v1/food-orders",
        {
          items: [
            {
              food: food._id,
              quantity
            }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const order = response.data?.data;

      if (!order?._id) {
        throw new Error("Food order was created without an order ID");
      }

      showNotification(
        "success",
        "Your food order has been created successfully."
      );

      setTimeout(() => {
        navigate(`/food-checkout/${order._id}`);
      }, 700);
    } catch (error) {
      console.log(error);

      showNotification(
        "error",
        error.response?.data?.message ||
        "Your food order could not be created."
      );
    } finally {
      setOrdering(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />

        <main className="food-details-page">
          <div className="food-details-loading">
            <div className="food-details-spinner"></div>

            <h2>Preparing your menu...</h2>

            <p>Loading the details of this dish.</p>
          </div>
        </main>

        <DetailFooter />
      </>
    );
  }

  if (error || !food) {
    return (
      <>
        <Navbar />

        <main className="food-details-page">
          <div className="food-details-error">
            <div className="food-details-error-icon">
              <i className="bi bi-exclamation-circle"></i>
            </div>

            <span>VIBELY FOOD</span>

            <h2>We couldn't find this dish.</h2>

            <p>
              {error ||
                "This food may no longer be available."}
            </p>

            <Link to="/food">
              <i className="bi bi-arrow-left"></i>
              Back to Food
            </Link>
          </div>
        </main>

        <DetailFooter />
      </>
    );
  }

  return (
    <>
      <Navbar />

      {notification.show && (
        <div
          className={`food-details-notification ${notification.type}`}
        >
          <div className="food-details-notification-icon">
            <i
              className={
                notification.type === "success"
                  ? "bi bi-check-lg"
                  : "bi bi-exclamation-lg"
              }
            ></i>
          </div>

          <div>
            <span>
              {notification.type === "success"
                ? "SUCCESS"
                : "PLEASE CHECK"}
            </span>

            <p>{notification.message}</p>
          </div>

          <button
            type="button"
            onClick={() =>
              setNotification({
                show: false,
                type: "",
                message: ""
              })
            }
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      )}

      <main className="food-details-page">
        <section className="food-details-top">
          <div className="food-details-container">
            <div className="food-details-breadcrumb">
              <Link to="/food">
                <i className="bi bi-arrow-left"></i>
                Food
              </Link>

              <i className="bi bi-chevron-right"></i>

              <span>{food.name}</span>
            </div>

            <div className="food-details-layout">
              <div className="food-details-image-column">
                <div className="food-details-image-card">
                  {food.image ? (
                    <img
                      src={food.image}
                      alt={food.name}
                    />
                  ) : (
                    <div className="food-details-placeholder">
                      <i className="bi bi-image"></i>
                      <span>VIBELY FOOD</span>
                    </div>
                  )}

                  <div className="food-details-image-shade"></div>

                  <div className="food-details-image-badges">
                    <span className="food-details-category">
                      {food.category}
                    </span>

                    <span
                      className={`food-details-stock ${soldOut ? "sold-out" : ""
                        }`}
                    >
                      <span></span>

                      {soldOut
                        ? "Sold out"
                        : "Available"}
                    </span>
                  </div>

                  {soldOut && (
                    <div className="food-details-soldout-overlay">
                      <div>
                        <i className="bi bi-bag-x"></i>
                        <strong>Currently sold out</strong>
                        <span>
                          Check back again for restock.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="food-details-trust-row">
                  <div>
                    <span>
                      <i className="bi bi-shield-check"></i>
                    </span>

                    <div>
                      <strong>Secure checkout</strong>
                      <small>
                        Protected payment experience
                      </small>
                    </div>
                  </div>

                  <div>
                    <span>
                      <i className="bi bi-shop"></i>
                    </span>

                    <div>
                      <strong>Trusted vendor</strong>
                      <small>
                        Powered by Vibely
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="food-details-info">
                <div className="food-details-eyebrow">
                  <span></span>
                  VIBELY FOOD
                </div>

                <div className="food-details-vendor">
                  <div className="food-details-vendor-icon">
                    <i className="bi bi-shop-window"></i>
                  </div>

                  <div>
                    <span>PREPARED BY</span>
                    <strong>{vendorName}</strong>
                  </div>
                </div>

                <h1>{food.name}</h1>

                <p className="food-details-description">
                  {food.description}
                </p>

                <div className="food-details-price-section">
                  <div>
                    <span>PRICE</span>
                    <strong>
                      {formatPrice(food.price)}
                    </strong>
                    <small>per serving</small>
                  </div>

                  {!soldOut && (
                    <div className="food-details-stock-count">
                      <span>
                        <i className="bi bi-box-seam"></i>
                      </span>

                      <div>
                        <strong>
                          {food.quantity}
                        </strong>
                        <small>
                          portions available
                        </small>
                      </div>
                    </div>
                  )}
                </div>

                <div className="food-details-divider"></div>

                {!soldOut ? (
                  <>
                    <div className="food-order-section">
                      <div className="food-order-heading">
                        <div>
                          <span>YOUR ORDER</span>
                          <h3>Choose your quantity</h3>
                        </div>

                        <small>
                          Maximum {food.quantity}
                        </small>
                      </div>

                      <div className="food-quantity-selector">
                        <button
                          type="button"
                          onClick={decreaseQuantity}
                          disabled={quantity <= 1}
                        >
                          <i className="bi bi-dash"></i>
                        </button>

                        <input
                          type="number"
                          min="1"
                          max={food.quantity}
                          value={quantity}
                          onChange={handleQuantityInput}
                        />

                        <button
                          type="button"
                          onClick={increaseQuantity}
                          disabled={
                            quantity >=
                            Number(food.quantity)
                          }
                        >
                          <i className="bi bi-plus"></i>
                        </button>
                      </div>
                    </div>

                    <div className="food-order-summary">
                      <div className="food-order-summary-top">
                        <div>
                          <span>ORDER SUMMARY</span>

                          <strong>
                            {quantity} × {food.name}
                          </strong>
                        </div>

                        <strong>
                          {formatPrice(totalAmount)}
                        </strong>
                      </div>

                      <div className="food-order-summary-line">
                        <span>
                          {formatPrice(food.price)} ×{" "}
                          {quantity}
                        </span>

                        <span>
                          {formatPrice(totalAmount)}
                        </span>
                      </div>

                      <div className="food-order-total">
                        <div>
                          <span>TOTAL</span>
                          <small>
                            Secure payment at checkout
                          </small>
                        </div>

                        <strong>
                          {formatPrice(totalAmount)}
                        </strong>
                      </div>
                    </div>

                    <button
  type="button"
  className="food-place-order-button"
  onClick={handleAddToCart}
>
  <span>
    <i className="bi bi-bag-plus"></i>
    {" "}Add to Cart
    <small>{formatPrice(totalAmount)}</small>
  </span>

  <i className="bi bi-plus-lg"></i>
</button>

<div className="food-details-cart-actions">
  <Link to="/food" className="food-continue-shopping">
    <i className="bi bi-arrow-left"></i>
    Continue Shopping
  </Link>

  <Link to="/food-cart" className="food-view-cart">
    <i className="bi bi-bag-check"></i>
    View Cart ({getFoodCartCount()})
  </Link>
</div>

                    <div className="food-details-payment-note">
                      <i className="bi bi-lock-fill"></i>

                      <span>
                        Your order will only be confirmed
                        after successful payment.
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="food-unavailable-box">
                    <div>
                      <i className="bi bi-clock-history"></i>
                    </div>

                    <span>NOT AVAILABLE RIGHT NOW</span>

                    <h3>This dish is currently sold out.</h3>

                    <p>
                      You can still browse other delicious
                      options from Vibely Food.
                    </p>

                    <Link to="/food">
                      Explore Other Food
                      <i className="bi bi-arrow-right"></i>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="food-details-experience">
          <div className="food-details-container">
            <div className="food-experience-heading">
              <span>HOW IT WORKS</span>

              <h2>
                From craving to collection.
              </h2>

              <p>
                A simple food ordering experience built
                around your moment.
              </p>
            </div>

            <div className="food-experience-grid">
              <div className="food-experience-card">
                <span className="food-experience-number">
                  01
                </span>

                <div className="food-experience-icon">
                  <i className="bi bi-bag-plus"></i>
                </div>

                <h3>Place your order</h3>

                <p>
                  Choose the quantity you want and continue
                  securely to checkout.
                </p>
              </div>

              <div className="food-experience-card">
                <span className="food-experience-number">
                  02
                </span>

                <div className="food-experience-icon">
                  <i className="bi bi-credit-card"></i>
                </div>

                <h3>Pay securely</h3>

                <p>
                  Complete your payment and receive your
                  unique Vibely pickup pass.
                </p>
              </div>

              <div className="food-experience-card">
                <span className="food-experience-number">
                  03
                </span>

                <div className="food-experience-icon">
                  <i className="bi bi-bag-check"></i>
                </div>

                <h3>Collect & enjoy</h3>

                <p>
                  Follow your order status and present your
                  pickup code when your food is ready.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <DetailFooter />
    </>
  );
};

export default FoodDetails;