import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "./Navbar";
import DetailFooter from "./DetailFooter";
import "../styles/food.css";

const Food = () => {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = [
    { name: "all", label: "All", icon: "bi-grid" },
    { name: "rice", label: "Rice", icon: "bi-bowl-hot" },
    { name: "swallow", label: "Swallow", icon: "bi-circle" },
    { name: "snacks", label: "Snacks", icon: "bi-cookie" },
    { name: "drinks", label: "Drinks", icon: "bi-cup-straw" },
    { name: "grills", label: "Grills", icon: "bi-fire" },
    { name: "others", label: "Others", icon: "bi-three-dots" }
  ];

  useEffect(() => {
    fetchFoods();
  }, []);

  const fetchFoods = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        "http://https://eventbookingsystem-sooty.vercel.app/api/v1/foods"
      );

      setFoods(response.data?.data || []);
    } catch (error) {
      console.log(error);

      setError(
        error.response?.data?.message ||
        "We couldn't load the food menu right now."
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredFoods = useMemo(() => {
    return foods.filter((food) => {
      const searchValue = search.trim().toLowerCase();

      const matchesCategory =
        activeCategory === "all" ||
        food.category === activeCategory;

      const vendorName =
        food.createdBy?.businessName ||
        `${food.createdBy?.firstname || ""} ${food.createdBy?.lastname || ""
        }`;

      const matchesSearch =
        !searchValue ||
        food.name?.toLowerCase().includes(searchValue) ||
        food.description?.toLowerCase().includes(searchValue) ||
        food.category?.toLowerCase().includes(searchValue) ||
        vendorName.toLowerCase().includes(searchValue);

      return matchesCategory && matchesSearch;
    });
  }, [foods, search, activeCategory]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0
    }).format(price || 0);
  };

  const getVendorName = (food) => {
    if (food.createdBy?.businessName) {
      return food.createdBy.businessName;
    }

    const fullName = `${food.createdBy?.firstname || ""} ${food.createdBy?.lastname || ""
      }`.trim();

    return fullName || "Vibely Food Vendor";
  };

  const getCategoryLabel = (category) => {
    const foundCategory = categories.find(
      (item) => item.name === category
    );

    return foundCategory?.label || category || "Food";
  };

  return (
    <>
      <Navbar />

      <main className="food-page">
        <section className="food-hero">
          <div className="food-hero-glow food-hero-glow-one"></div>
          <div className="food-hero-glow food-hero-glow-two"></div>

          <div className="food-hero-inner">
            <div className="food-hero-copy">
              <div className="food-eyebrow">
                <span></span>
                VIBELY FOOD
              </div>

              <h1>
                Good food.
                <br />
                <em>Beautiful moments.</em>
              </h1>

              <p>
                Discover delicious meals, snacks, grills and drinks
                from trusted food vendors on Vibely.
              </p>

              <div className="food-hero-search">
                <i className="bi bi-search"></i>

                <input
                  type="text"
                  placeholder="Search meals, vendors or categories..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />

                {search && (
                  <button
                    type="button"
                    className="food-clear-search"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                )}
              </div>
            </div>

            <div className="food-hero-card">
              <div className="food-hero-card-icon">
                <i className="bi bi-bag-heart-fill"></i>
              </div>

              <span className="food-hero-card-label">
                YOUR NEXT CRAVING
              </span>

              <h3>Made for the moment.</h3>

              <p>
                Browse. Pick your favourite. Pay securely. Enjoy.
              </p>

              <div className="food-hero-card-bottom">
                <div>
                  <strong>{foods.length}</strong>
                  <span>Menu items</span>
                </div>

                <div className="food-hero-mini-icon">
                  <i className="bi bi-arrow-down"></i>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="food-content">
          <div className="food-category-section">
            <div className="food-section-heading">
              <div>
                <span className="food-small-heading">
                  EXPLORE THE MENU
                </span>

                <h2>What are you craving?</h2>
              </div>

              <p>
                Find something delicious for every kind of mood.
              </p>
            </div>

            <div className="food-category-list">
              {categories.map((category) => {
                const categoryCount =
                  category.name === "all"
                    ? foods.length
                    : foods.filter(
                      (food) =>
                        food.category === category.name
                    ).length;

                return (
                  <button
                    type="button"
                    key={category.name}
                    className={`food-category-button ${activeCategory === category.name
                      ? "active"
                      : ""
                      }`}
                    onClick={() =>
                      setActiveCategory(category.name)
                    }
                  >
                    <span className="food-category-icon">
                      <i
                        className={`bi ${category.icon}`}
                      ></i>
                    </span>

                    <span className="food-category-info">
                      <strong>{category.label}</strong>
                      <small>
                        {categoryCount}{" "}
                        {categoryCount === 1
                          ? "item"
                          : "items"}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="food-menu-header">
            <div>
              <span className="food-small-heading">
                CURATED FOR YOU
              </span>

              <h2>
                {activeCategory === "all"
                  ? "Explore all dishes"
                  : `${getCategoryLabel(
                    activeCategory
                  )} selection`}
              </h2>
            </div>

            <div className="food-result-count">
              <span>{filteredFoods.length}</span>
              {filteredFoods.length === 1
                ? " dish found"
                : " dishes found"}
            </div>
          </div>

          {loading ? (
            <div className="food-loading">
              <div className="food-loader"></div>
              <h3>Preparing the menu...</h3>
              <p>Finding something delicious for you.</p>
            </div>
          ) : error ? (
            <div className="food-state-card">
              <div className="food-state-icon">
                <i className="bi bi-exclamation-circle"></i>
              </div>

              <h3>Menu unavailable</h3>

              <p>{error}</p>

              <button type="button" onClick={fetchFoods}>
                Try Again
              </button>
            </div>
          ) : filteredFoods.length === 0 ? (
            <div className="food-state-card">
              <div className="food-state-icon">
                <i className="bi bi-search-heart"></i>
              </div>

              <h3>No dishes found</h3>

              <p>
                We couldn't find anything matching your search.
                Try another category or search term.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveCategory("all");
                }}
              >
                View All Food
              </button>
            </div>
          ) : (
            <div className="food-grid">
              {filteredFoods.map((food) => {
                const soldOut = Number(food.quantity) <= 0;

                return (
                  <article
                    className={`food-card ${soldOut ? "food-card-sold-out" : ""
                      }`}
                    key={food._id}
                  >
                    <div className="food-card-image-wrap">
                      {food.image ? (
                        <img
                          src={food.image}
                          alt={food.name}
                          className="food-card-image"
                        />
                      ) : (
                        <div className="food-image-placeholder">
                          <i className="bi bi-image"></i>
                          <span>Vibely Food</span>
                        </div>
                      )}

                      <div className="food-card-image-overlay"></div>

                      <div className="food-card-top">
                        <span className="food-category-badge">
                          {getCategoryLabel(food.category)}
                        </span>

                        <span
                          className={`food-stock-badge ${soldOut ? "sold-out" : ""
                            }`}
                        >
                          <span></span>
                          {soldOut ? "Sold out" : "Available"}
                        </span>
                      </div>

                      {soldOut && (
                        <div className="food-sold-overlay">
                          <span>SOLD OUT</span>
                        </div>
                      )}
                    </div>

                    <div className="food-card-body">
                      <div className="food-vendor-line">
                        <span className="food-vendor-avatar">
                          <i className="bi bi-shop"></i>
                        </span>

                        <span>
                          {getVendorName(food)}
                        </span>
                      </div>

                      <h3>{food.name}</h3>

                      <p className="food-description">
                        {food.description}
                      </p>

                      <div className="food-card-meta">
                        <div className="food-price">
                          <span>FROM</span>
                          <strong>
                            {formatPrice(food.price)}
                          </strong>
                        </div>

                        {!soldOut && (
                          <div className="food-quantity-left">
                            <i className="bi bi-box-seam"></i>
                            {food.quantity} left
                          </div>
                        )}
                      </div>

                      <Link
                        to={`/food/${food._id}`}
                        className={`food-view-button ${soldOut ? "sold-out-button" : ""
                          }`}
                      >
                        <span>
                          {soldOut
                            ? "View Details"
                            : "View & Order"}
                        </span>

                        <i className="bi bi-arrow-up-right"></i>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="food-bottom-banner">
          <div className="food-bottom-banner-inner">
            <div>
              <span>VIBELY FOOD</span>

              <h2>
                Your favourites,
                <em> one order away.</em>
              </h2>
            </div>

            <div className="food-bottom-points">
              <div>
                <i className="bi bi-shield-check"></i>
                <span>Secure payment</span>
              </div>

              <div>
                <i className="bi bi-shop-window"></i>
                <span>Trusted vendors</span>
              </div>

              <div>
                <i className="bi bi-bag-check"></i>
                <span>Easy pickup</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <DetailFooter />
    </>
  );
};

export default Food;