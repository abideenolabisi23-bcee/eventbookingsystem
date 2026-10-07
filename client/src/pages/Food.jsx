import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

import Navbar from "../component/Navbar";
import Footer from "../component/Footer";

import "../styles/food.css";

const Food = () => {
  const [foods, setFoods] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFoods = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          "https://eventbookingsystem-sooty.vercel.app/api/v1/foods"
        );

        setFoods(response.data.data || []);
      } catch (error) {
        console.log("FOOD ERROR:", error);

        setError(
          error.response?.data?.message ||
          "We couldn't load food right now."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchFoods();
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  const categories = [
    "all",
    ...new Set(foods.map((food) => food.category).filter(Boolean)),
  ];

  const filteredFoods = foods.filter((food) => {
    const value = search.toLowerCase().trim();

    const matchesSearch =
      !value ||
      food.name?.toLowerCase().includes(value) ||
      food.category?.toLowerCase().includes(value) ||
      food.description?.toLowerCase().includes(value) ||
      food.createdBy?.businessName?.toLowerCase().includes(value);

    const matchesCategory =
      activeCategory === "all" || food.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <Navbar />

      <main className="food-page">
        <section className="food-hero">
          <div className="container food-hero-container">
            <div className="food-hero-content">
              <div className="food-eyebrow">
                <span></span>
                VIBELY FOOD
              </div>

              <h1>
                Delicious food,
                <em> made for the moment.</em>
              </h1>

              <p>
                Discover delicious meals from local food vendors and find
                something worth craving.
              </p>

              <a href="#food-menu" className="food-explore-button">
                Explore the menu
                <i className="bi bi-arrow-down"></i>
              </a>
            </div>

            <div className="food-hero-visual">
              <div className="food-hero-image">
                <div className="food-hero-image-content">
                  <span>FRESHLY SERVED</span>

                  <div>
                    <h3>Something delicious is waiting.</h3>
                    <p>Discover meals from Vibely vendors.</p>
                  </div>
                </div>
              </div>

              <div className="food-hero-badge">
                <div>
                  <i className="bi bi-stars"></i>
                </div>

                <span>
                  <strong>Made to enjoy</strong>
                  Great food, easy ordering
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="food-search-section">
          <div className="container">
            <div className="food-search">
              <div className="food-search-icon">
                <i className="bi bi-search"></i>
              </div>

              <div className="food-search-field">
                <label>WHAT ARE YOU CRAVING?</label>

                <input
                  type="text"
                  placeholder="Search meals, categories or vendors..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              {search && (
                <button
                  type="button"
                  className="food-clear-search"
                  onClick={() => setSearch("")}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="food-content" id="food-menu">
          <div className="container">
            <div className="food-heading">
              <div>
                <span className="food-section-label">DISCOVER & TASTE</span>

                <h2>
                  {search ? "What we found" : "Something you'll love"}
                </h2>

                <p>
                  Explore delicious dishes prepared by vendors on Vibely.
                </p>
              </div>

              {!loading && !error && (
                <div className="food-result-count">
                  <strong>{filteredFoods.length}</strong>{" "}
                  {filteredFoods.length === 1 ? "dish" : "dishes"}
                </div>
              )}
            </div>

            {categories.length > 1 && (
              <div className="food-categories">
                {categories.map((category) => (
                  <button
                    type="button"
                    key={category}
                    className={`food-category-button ${activeCategory === category ? "active" : ""
                      }`}
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="food-state">
                <div className="food-loader"></div>

                <h3>Preparing the menu</h3>

                <p>Finding something delicious for you.</p>
              </div>
            )}

            {!loading && error && (
              <div className="food-state">
                <div className="food-state-icon">
                  <i className="bi bi-exclamation-circle"></i>
                </div>

                <h3>Unable to load food</h3>

                <p>{error}</p>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                >
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && filteredFoods.length === 0 && (
              <div className="food-state">
                <div className="food-state-icon">
                  <i className="bi bi-search"></i>
                </div>

                <h3>No food found</h3>

                <p>
                  We couldn't find anything matching
                  {search ? ` "${search}".` : " your selection."}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setActiveCategory("all");
                  }}
                >
                  View all food
                </button>
              </div>
            )}

            {!loading && !error && filteredFoods.length > 0 && (
              <div className="food-grid">
                {filteredFoods.map((food) => {
                  const soldOut = Number(food.quantity) <= 0;

                  return (
                    <article className="food-card" key={food._id}>
                      <Link
                        to={`/food/${food._id}`}
                        className="food-image-wrapper"
                      >
                        {food.image ? (
                          <img
                            src={food.image}
                            alt={food.name}
                            className="food-image"
                          />
                        ) : (
                          <div className="food-placeholder">
                            <i className="bi bi-cup-hot"></i>
                          </div>
                        )}

                        <div className="food-image-overlay"></div>

                        {food.category && (
                          <span className="food-category">
                            {food.category}
                          </span>
                        )}

                        {soldOut && (
                          <span className="food-sold-out">Sold out</span>
                        )}

                        <div className="food-image-price">
                          {formatPrice(food.price)}
                        </div>
                      </Link>

                      <div className="food-card-body">
                        <div className="food-vendor">
                          <div className="food-vendor-icon">
                            <i className="bi bi-shop"></i>
                          </div>

                          <span>
                            {food.createdBy?.businessName ||
                              `${food.createdBy?.firstname || ""
                                } ${food.createdBy?.lastname || ""
                                }`.trim() ||
                              "Vibely Vendor"}
                          </span>
                        </div>

                        <div className="food-title-row">
                          <Link
                            to={`/food/${food._id}`}
                            className="food-title"
                          >
                            <h3>{food.name}</h3>
                          </Link>

                          <Link
                            to={`/food/${food._id}`}
                            className="food-arrow-button"
                          >
                            <i className="bi bi-arrow-up-right"></i>
                          </Link>
                        </div>

                        <p className="food-description">
                          {food.description}
                        </p>

                        <div className="food-card-footer">
                          <div className="food-price">
                            <span>PRICE</span>
                            <strong>{formatPrice(food.price)}</strong>
                          </div>

                          <Link
                            to={`/food/${food._id}`}
                            className={
                              soldOut
                                ? "food-order-button sold-out"
                                : "food-order-button"
                            }
                          >
                            {soldOut ? "View dish" : "Order now"}

                            <i className="bi bi-arrow-right"></i>
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default Food;