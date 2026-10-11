
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "./Navbar";
import DetailFooter from "./DetailFooter";
import { addFoodToCart } from "../utils/foodCart";
import "../styles/food.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const categories = [
  { name: "all", label: "All Food", icon: "bi-grid" },
  { name: "rice", label: "Rice", icon: "bi-bowl-hot" },
  { name: "swallow", label: "Swallow", icon: "bi-circle" },
  { name: "snacks", label: "Snacks", icon: "bi-cookie" },
  { name: "drinks", label: "Drinks", icon: "bi-cup-straw" },
  { name: "grills", label: "Grills", icon: "bi-fire" },
  { name: "others", label: "Others", icon: "bi-three-dots" }
];

const formatPrice = (price) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(Number(price) || 0);

const getVendorName = (food) => {
  if (food.createdBy?.businessName) {
    return food.createdBy.businessName;
  }

  const fullName = [
    food.createdBy?.firstname,
    food.createdBy?.lastname
  ]
    .filter(Boolean)
    .join(" ");

  return fullName || "Vibely Food Vendor";
};

const Food = () => {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [visibleCount, setVisibleCount] = useState(12);
  const [foodQuantities, setFoodQuantities] = useState({});
  const [notification, setNotification] = useState({
    show: false,
    type: "",
    message: ""
  });

  const fetchFoods = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_URL}/foods`);

      setFoods(
        Array.isArray(response.data?.data)
          ? response.data.data
          : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "We couldn't load the food menu right now."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFoods();
  }, []);

  const menuCategories = useMemo(() => {
    const known = new Set(categories.map((item) => item.name));

    const extra = [
      ...new Set(
        foods
          .map((food) => food.category?.toLowerCase())
          .filter(Boolean)
      )
    ]
      .filter((category) => !known.has(category))
      .map((category) => ({
        name: category,
        label:
          category.charAt(0).toUpperCase() +
          category.slice(1),
        icon: "bi-egg-fried"
      }));

    return [...categories, ...extra];
  }, [foods]);

  const filteredFoods = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    const result = foods.filter((food) => {
      const matchesCategory =
        activeCategory === "all" ||
        food.category?.toLowerCase() === activeCategory;

      const vendorName = getVendorName(food);

      const matchesSearch =
        !searchValue ||
        [
          food.name,
          food.description,
          food.category,
          vendorName
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(searchValue)
        );

      return matchesCategory && matchesSearch;
    });

    if (sortBy === "price-low") {
      result.sort(
        (a, b) => Number(a.price) - Number(b.price)
      );
    }

    if (sortBy === "price-high") {
      result.sort(
        (a, b) => Number(b.price) - Number(a.price)
      );
    }

    if (sortBy === "name") {
      result.sort((a, b) =>
        String(a.name || "").localeCompare(
          String(b.name || "")
        )
      );
    }

    return result;
  }, [foods, search, activeCategory, sortBy]);

  useEffect(() => {
    setVisibleCount(12);
  }, [search, activeCategory, sortBy]);

  const visibleFoods = filteredFoods.slice(0, visibleCount);

  const heroFood = foods.find(
    (food) => typeof food.image === "string" && food.image
  );

  const getCategoryLabel = (category) => {
    return (
      menuCategories.find(
        (item) => item.name === category
      )?.label ||
      category ||
      "Food"
    );
  };

  const showNotification = (type, message) => {
    setNotification({
      show: true,
      type,
      message
    });
  };

  const getFoodQuantity = (foodId) => {
  return foodQuantities[foodId] || 1;
};

const changeFoodQuantity = (food, amount) => {
  const foodId = food._id;

  setFoodQuantities((previous) => {
    const current = previous[foodId] || 1;
    const maximum = Number(food.quantity) || 1;

    return {
      ...previous,
      [foodId]: Math.max(1, Math.min(current + amount, maximum))
    };
  });
};
const handleAddToCart = (food) => {
  const quantity = getFoodQuantity(food._id);

  const soldOut =
    Number(food.quantity || 0) <= 0 ||
    food.isAvailable === false;

  if (soldOut) {
    showNotification("error", "This dish is currently unavailable.");
    return;
  }

  if (quantity > Number(food.quantity)) {
    showNotification("error", "Selected quantity exceeds available stock.");
    return;
  }

  try {
    const added = addFoodToCart(food, quantity);

    if (!added) {
      showNotification(
        "error",
        "Unable to add this food. Check stock or remove food from another vendor."
      );
      return;
    }

    showNotification(
      "success",
      `${quantity} × ${food.name} added to your cart!`
    );

    setFoodQuantities((previous) => ({
      ...previous,
      [food._id]: 1
    }));
  } catch {
    showNotification(
      "error",
      "Something went wrong while adding this food."
    );
  }
};


  return (
    <>
      <Navbar />

      {notification.show && (
        <div
          className={`vibely-food-toast ${notification.type}`}
          role="status"
        >
          <span className="vibely-food-toast-icon">
            <i
              className={
                notification.type === "success"
                  ? "bi bi-check-lg"
                  : "bi bi-exclamation-lg"
              }
            ></i>
          </span>

          <div>
            <strong>
              {notification.type === "success"
                ? "Added successfully"
                : "Please check"}
            </strong>
            <p>{notification.message}</p>
          </div>

          <button
            type="button"
            aria-label="Close notification"
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

      <main className="food-page">
        <section className="food-hero">
          <div className="food-hero-inner">
            <div className="food-hero-copy">
              <div className="food-eyebrow">
                <span></span>
                VIBELY FOOD EXPERIENCE
              </div>

              <h1>
                Good food.
                <br />
                <em>Beautiful moments.</em>
              </h1>

              <p>
                From comforting local favourites to
                irresistible grills, snacks and treats.
                Discover delicious meals from food vendors
                on Vibely.
              </p>

              <div className="food-hero-search">
                <i className="bi bi-search"></i>

                <input
                  type="search"
                  placeholder="Search meals, vendors or categories..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />

                {search && (
                  <button
                    type="button"
                    className="food-clear-search"
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                )}
              </div>

              <div className="food-hero-highlights">
                <span>
                  <i className="bi bi-patch-check"></i>
                  Trusted vendors
                </span>
                <span>
                  <i className="bi bi-bag-heart"></i>
                  Easy ordering
                </span>
              </div>
            </div>

            <div className="food-hero-visual">
              <div className="food-hero-image">
                {heroFood ? (
                  <img
                    src={heroFood.image}
                    alt="Delicious food available on Vibely"
                  />
                ) : (
                  <div className="food-hero-placeholder">
                    <i className="bi bi-egg-fried"></i>
                    <span>Delicious moments await</span>
                  </div>
                )}
              </div>

              <div className="food-hero-floating-label">
                <i className="bi bi-stars"></i>
                <div>
                  <strong>Fresh flavours</strong>
                  <span>Made for every craving</span>
                </div>
              </div>

              <div className="food-hero-count">
                <strong>{foods.length}+</strong>
                <span>Menu choices</span>
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
                Find something delicious for every mood.
              </p>
            </div>

            <div className="food-category-list">
              {menuCategories.map((category) => {
                const count =
                  category.name === "all"
                    ? foods.length
                    : foods.filter(
                        (food) =>
                          food.category?.toLowerCase() ===
                          category.name
                      ).length;

                return (
                  <button
                    key={category.name}
                    type="button"
                    className={`food-category-button ${
                      activeCategory === category.name
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setActiveCategory(category.name)
                    }
                    aria-pressed={
                      activeCategory === category.name
                    }
                  >
                    <i className={`bi ${category.icon}`}></i>
                    <span>{category.label}</span>
                    <small>{count}</small>
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

              <p>
                {filteredFoods.length}{" "}
                {filteredFoods.length === 1
                  ? "delicious dish"
                  : "delicious dishes"}{" "}
                to explore
              </p>
            </div>

            <div className="food-menu-tools">
              <label htmlFor="food-sort">Sort by</label>

              <select
                id="food-sort"
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value)
                }
              >
                <option value="featured">Featured</option>
                <option value="price-low">
                  Price: Low to High
                </option>
                <option value="price-high">
                  Price: High to Low
                </option>
                <option value="name">Name: A to Z</option>
              </select>
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
              <i className="bi bi-exclamation-circle"></i>
              <h3>Menu unavailable</h3>
              <p>{error}</p>

              <button type="button" onClick={fetchFoods}>
                Try Again
              </button>
            </div>
          ) : filteredFoods.length === 0 ? (
            <div className="food-state-card">
              <i className="bi bi-search-heart"></i>
              <h3>No dishes found</h3>
              <p>
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
            <>
              <div className="food-grid">
                {visibleFoods.map((food) => {
                  const soldOut =
                    Number(food.quantity || 0) <= 0 ||
                    food.isAvailable === false;

                  return (
                    <article
                      key={food._id}
                      className={`food-card ${
                        soldOut
                          ? "food-card-sold-out"
                          : ""
                      }`}
                    >
                      <Link
                        to={`/food/${food._id}`}
                        className="food-card-image-wrap"
                        aria-label={`View ${food.name}`}
                      >
                        {food.image ? (
                          <img
                            src={food.image}
                            alt={food.name}
                            className="food-card-image"
                            loading="lazy"
                          />
                        ) : (
                          <div className="food-image-placeholder">
                            <i className="bi bi-image"></i>
                            <span>Vibely Food</span>
                          </div>
                        )}

                        <span className="food-category-badge">
                          {getCategoryLabel(food.category)}
                        </span>

                        {soldOut && (
                          <span className="food-sold-overlay">
                            Sold out
                          </span>
                        )}
                      </Link>

                      <div className="food-card-body">
                        <div className="food-vendor-line">
                          <i className="bi bi-shop"></i>
                          <span>
                            {getVendorName(food)}
                          </span>
                        </div>

                        <Link
                          to={`/food/${food._id}`}
                          className="food-card-title-link"
                        >
                          <h3>{food.name}</h3>
                        </Link>

                        <p className="food-description">
                          {food.description ||
                            "Deliciously prepared for your enjoyment."}
                        </p>
{!soldOut && (
  <div className="food-quantity-row">
    <span className="food-quantity-label">Quantity</span>

    <div className="food-quantity-control">
      <button
        type="button"
        onClick={() => changeFoodQuantity(food, -1)}
        disabled={getFoodQuantity(food._id) <= 1}
        aria-label={`Decrease ${food.name} quantity`}
      >
        <i className="bi bi-dash"></i>
      </button>

      <span>{getFoodQuantity(food._id)}</span>

      <button
        type="button"
        onClick={() => changeFoodQuantity(food, 1)}
        disabled={
          getFoodQuantity(food._id) >= Number(food.quantity)
        }
        aria-label={`Increase ${food.name} quantity`}
      >
        <i className="bi bi-plus"></i>
      </button>
    </div>
  </div>
)}
                        

                        <div className="food-card-bottom">
                          <div className="food-price">
                            <small>PRICE</small>
                            <strong>
                              {formatPrice(food.price)}
                            </strong>
                          </div>

                          <div className="food-card-actions">
  

  <button
    type="button"
    className="food-listing-add-button"
    disabled={soldOut}
    onClick={() => handleAddToCart(food)}
    aria-label={
      soldOut
        ? `${food.name} unavailable`
        : `Add ${food.name} to cart`
    }
  >
    <i
      className={
        soldOut ? "bi bi-x-lg" : "bi bi-bag-plus"
      }
    ></i>

    <span>{soldOut ? "Sold out" : "Add to Cart"}</span>
  </button>
</div>
                        </div>

                        <Link
                          to={`/food/${food._id}`}
                          className="food-listing-details-button"
                        >
                          View details
                          <i className="bi bi-arrow-up-right"></i>
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>

              {visibleCount < filteredFoods.length && (
                <div className="food-load-more">
                  <p>
                    Showing {visibleFoods.length} of{" "}
                    {filteredFoods.length} dishes
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount(
                        (previous) => previous + 12
                      )
                    }
                  >
                    Load More Foods
                    <i className="bi bi-arrow-down"></i>
                  </button>
                </div>
              )}
            </>
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
