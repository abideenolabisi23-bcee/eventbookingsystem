import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import axios from "axios";

import Navbar from "../component/Navbar";
import DetailFooter from "../component/DetailFooter";

import "../styles/foodDetails.css";

const FoodDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [food, setFood] = useState(null);
  const [quantity, setQuantity] =
    useState(1);

  const [loading, setLoading] =
    useState(true);

  const [orderLoading, setOrderLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [orderError, setOrderError] =
    useState("");

  useEffect(() => {
    const fetchFood = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `https://eventbookingsystem-sooty.vercel.app/api/v1/foods/${id}`
        );

        setFood(response.data.data);
      } catch (error) {
        console.log(
          "FOOD DETAILS ERROR:",
          error
        );

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

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  const increaseQuantity = () => {
    if (!food) return;

    if (quantity < food.quantity) {
      setQuantity(
        (current) => current + 1
      );
    }
  };

  const decreaseQuantity = () => {
    setQuantity((current) =>
      Math.max(1, current - 1)
    );
  };

  const handleOrder = async () => {
    const accessToken =
      localStorage.getItem("accessToken");

    if (!accessToken) {
      navigate("/login", {
        state: {
          returnTo: `/food/${id}`,
        },
      });

      return;
    }

    if (!food || food.quantity <= 0) {
      setOrderError(
        "This food is sold out."
      );

      return;
    }

    try {
      setOrderLoading(true);
      setOrderError("");

      const orderResponse =
        await axios.post(
          "https://eventbookingsystem-sooty.vercel.app/api/v1/food-orders",
          {
            foodId: food._id,
            quantity: Number(quantity),
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

      const orderData =
        orderResponse.data.data;

      const orderId =
        orderData?._id ||
        orderData?.order?._id;

      if (!orderId) {
        setOrderError(
          "Your order was created but the order ID was not returned."
        );

        return;
      }

      const paymentResponse =
        await axios.post(
          "https://eventbookingsystem-sooty.vercel.app/api/v1/food-payments/initialize",
          {
            orderId,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

      const authorizationUrl =
        paymentResponse.data.data
          ?.authorizationUrl;

      if (!authorizationUrl) {
        setOrderError(
          "Payment link was not returned."
        );

        return;
      }

      window.location.href =
        authorizationUrl;
    } catch (error) {
      console.log(
        "FOOD ORDER ERROR:",
        error
      );

      if (
        error.response?.status === 401
      ) {
        localStorage.removeItem(
          "accessToken"
        );

        localStorage.removeItem(
          "refreshToken"
        );

        navigate("/login", {
          state: {
            returnTo: `/food/${id}`,
          },
        });

        return;
      }

      setOrderError(
        error.response?.data?.message ||
        "Cannot place your order at this time."
      );
    } finally {
      setOrderLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />

        <div className="food-details-state">
          <div className="food-details-loader"></div>

          <h3>
            Loading food...
          </h3>
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

          <h3>
            Food unavailable
          </h3>

          <p>{error}</p>

          <Link to="/food">
            Back to Food
          </Link>
        </div>
      </>
    );
  }

  const soldOut =
    Number(food.quantity) <= 0;

  const total =
    Number(food.price) * quantity;

  const vendorName =
    food.createdBy?.businessName ||
    `${food.createdBy?.firstname || ""} ${food.createdBy?.lastname || ""
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
          </div>

          <section className="food-details-layout">
            <div className="food-details-left">
              <div className="food-details-image">
                {food.image ? (
                  <img
                    src={food.image}
                    alt={food.name}
                  />
                ) : (
                  <div className="food-details-placeholder">
                    <i className="bi bi-cup-hot"></i>

                    <span>
                      Vibely Food
                    </span>
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

                <h2>
                  {food.name}
                </h2>

                <p>
                  {food.description}
                </p>
              </div>
            </div>

            <aside className="food-order-card">
              <div className="food-vendor-name">
                <div>
                  <i className="bi bi-shop"></i>
                </div>

                <span>
                  <small>
                    Prepared by
                  </small>

                  <strong>
                    {vendorName}
                  </strong>
                </span>
              </div>

              <div className="food-order-heading">
                <span>
                  {food.category}
                </span>

                <h1>
                  {food.name}
                </h1>

                <p>
                  {food.description}
                </p>
              </div>

              <div className="food-order-price">
                <span>
                  Price
                </span>

                <strong>
                  {formatPrice(
                    food.price
                  )}
                </strong>

                <small>
                  per item
                </small>
              </div>

              {soldOut ? (
                <div className="food-unavailable-box">
                  <i className="bi bi-exclamation-circle"></i>

                  <div>
                    <strong>
                      Currently sold out
                    </strong>

                    <span>
                      This meal is not
                      available for ordering
                      right now.
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="food-quantity-section">
                    <div>
                      <label>
                        Quantity
                      </label>

                      <span>
                        Choose how many you
                        want
                      </span>
                    </div>

                    <div className="food-quantity-selector">
                      <button
                        type="button"
                        onClick={
                          decreaseQuantity
                        }
                        disabled={
                          quantity <= 1
                        }
                      >
                        −
                      </button>

                      <strong>
                        {quantity}
                      </strong>

                      <button
                        type="button"
                        onClick={
                          increaseQuantity
                        }
                        disabled={
                          quantity >=
                          food.quantity
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="food-order-summary">
                    <div>
                      <span>
                        Item
                      </span>

                      <strong>
                        {food.name}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Quantity
                      </span>

                      <strong>
                        {quantity}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Price
                      </span>

                      <strong>
                        {formatPrice(
                          food.price
                        )}
                      </strong>
                    </div>

                    <div className="food-order-total">
                      <span>
                        Total
                      </span>

                      <strong>
                        {formatPrice(
                          total
                        )}
                      </strong>
                    </div>
                  </div>

                  {orderError && (
                    <div className="food-order-error">
                      <i className="bi bi-exclamation-circle"></i>

                      {orderError}
                    </div>
                  )}

                  <button
                    type="button"
                    className="food-order-button"
                    onClick={handleOrder}
                    disabled={
                      orderLoading
                    }
                  >
                    {orderLoading ? (
                      <>
                        <span className="food-button-loader"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        Order & Continue to
                        Payment

                        <i className="bi bi-arrow-right"></i>
                      </>
                    )}
                  </button>

                  <div className="food-secure-payment">
                    <i className="bi bi-shield-check"></i>
                    Secure payment with
                    Paystack
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