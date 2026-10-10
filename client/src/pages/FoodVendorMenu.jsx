
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/foodVendorMenu.css";

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

const FoodVendorMenu = () => {
  const navigate = useNavigate();

  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [notification, setNotification] = useState(null);
  const [selectedFood, setSelectedFood] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(null);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem(
      "foodVendorAccessToken"
    )}`
  });

  const showNotice = (type, title, message) => {
    setNotification({ type, title, message });
  };

  const fetchFoods = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const token = localStorage.getItem("foodVendorAccessToken");

      if (!token) {
        navigate("/food-vendor/login", { replace: true });
        return;
      }

      const response = await axios.get(
        `${API_URL}/food-vendor/foods`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const payload = response.data;
      const list = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.foods)
        ? payload.data.foods
        : Array.isArray(payload?.foods)
        ? payload.foods
        : [];

      setFoods(list);
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/food-vendor/login", { replace: true });
        return;
      }

      showNotice(
        "error",
        "Unable to load menu",
        error.response?.data?.message ||
          "We couldn't retrieve your food listings."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchFoods();
  }, [fetchFoods]);

  useEffect(() => {
    if (!notification) return;

    const timer = setTimeout(() => {
      setNotification(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification]);

  const stats = useMemo(() => {
    const available = foods.filter(
      (food) => food.isAvailable && Number(food.quantity) > 0
    ).length;

    return {
      total: foods.length,
      available,
      unavailable: foods.length - available,
      categories: new Set(
        foods.map((food) => food.category).filter(Boolean)
      ).size
    };
  }, [foods]);

  const filteredFoods = useMemo(() => {
    return foods.filter((food) => {
      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        food.name?.toLowerCase().includes(query) ||
        food.category?.toLowerCase().includes(query) ||
        food.description?.toLowerCase().includes(query);

      const isAvailable =
        food.isAvailable && Number(food.quantity) > 0;

      const matchesFilter =
        filter === "all" ||
        (filter === "available" && isAvailable) ||
        (filter === "unavailable" && !isAvailable);

      return matchesSearch && matchesFilter;
    });
  }, [foods, search, filter]);

  const handleAvailability = async (food) => {
    if (availabilityLoading) return;

    const nextAvailability = !food.isAvailable;

    setAvailabilityLoading(food._id);

    try {
      const response = await axios.patch(
        `${API_URL}/foods/${food._id}/availability`,
        { isAvailable: nextAvailability },
        { headers: getHeaders() }
      );

      const updatedFood = response.data?.data;

      setFoods((previous) =>
        previous.map((item) =>
          item._id === food._id
            ? {
                ...item,
                ...(updatedFood?._id === food._id
                  ? updatedFood
                  : { isAvailable: nextAvailability })
              }
            : item
        )
      );

      showNotice(
        "success",
        "Availability updated",
        `${food.name} is now ${
          nextAvailability ? "available" : "unavailable"
        }.`
      );
    } catch (error) {
      showNotice(
        "error",
        "Update failed",
        error.response?.data?.message ||
          "Unable to update food availability."
      );
    } finally {
      setAvailabilityLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedFood || actionLoading) return;

    setActionLoading(true);

    try {
      await axios.delete(
        `${API_URL}/foods/${selectedFood._id}`,
        { headers: getHeaders() }
      );

      setFoods((previous) =>
        previous.filter((food) => food._id !== selectedFood._id)
      );

      showNotice(
        "success",
        "Food deleted",
        `${selectedFood.name} has been removed from your menu.`
      );

      setSelectedFood(null);
    } catch (error) {
      showNotice(
        "error",
        "Delete failed",
        error.response?.data?.message ||
          "Unable to delete this food item."
      );

      setSelectedFood(null);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fv-menu-page">
      <div className="fv-menu-container">
        <button
          className="fv-menu-back"
          onClick={() => navigate("/food-vendor/dashboard")}
        >
          <i className="bi bi-arrow-left" />
          Back to Dashboard
        </button>

        <header className="fv-menu-header">
          <div>
            <span>VIBELY FOOD VENDOR PORTAL</span>
            <h1>Manage Your Menu</h1>
            <p>
              Organize your meals, update availability, and
              keep your food business looking its best.
            </p>
          </div>

          <button
            className="fv-menu-add-btn"
            onClick={() =>
              navigate("/food-vendor/foods/create")
            }
          >
            <i className="bi bi-plus-lg" />
            Add New Food
          </button>
        </header>

        {notification && (
          <div
            className={`fv-menu-notice ${notification.type}`}
            role="alert"
          >
            <i
              className={`bi ${
                notification.type === "success"
                  ? "bi-check-circle-fill"
                  : "bi-exclamation-circle-fill"
              }`}
            />

            <div>
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
            </div>

            <button
              onClick={() => setNotification(null)}
              aria-label="Dismiss notification"
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>
        )}

        <section className="fv-menu-hero">
          <div>
            <span>YOUR DIGITAL KITCHEN</span>
            <h2>Great food deserves a beautiful menu.</h2>
            <p>
              Keep your food listings fresh and ready for
              customers to discover.
            </p>
          </div>

          <div className="fv-menu-hero-icon">
            <i className="bi bi-journal-richtext" />
          </div>
        </section>

        <section className="fv-menu-stats">
          {[
            {
              label: "Total Food Items",
              value: stats.total,
              icon: "bi-grid"
            },
            {
              label: "Available Meals",
              value: stats.available,
              icon: "bi-check-circle"
            },
            {
              label: "Unavailable Meals",
              value: stats.unavailable,
              icon: "bi-slash-circle"
            },
            {
              label: "Food Categories",
              value: stats.categories,
              icon: "bi-tags"
            }
          ].map((stat) => (
            <div className="fv-menu-stat-card" key={stat.label}>
              <div className="fv-menu-stat-icon">
                <i className={`bi ${stat.icon}`} />
              </div>

              <div>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            </div>
          ))}
        </section>

        <section className="fv-menu-main">
          <div className="fv-menu-section-heading">
            <div>
              <span>FOOD MANAGEMENT</span>
              <h2>My Food Listings</h2>
              <p>
                View and manage everything currently on your menu.
              </p>
            </div>

            <button
              onClick={() => fetchFoods(false)}
              disabled={refreshing}
            >
              <i
                className={`bi bi-arrow-clockwise ${
                  refreshing ? "fv-menu-spin" : ""
                }`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="fv-menu-toolbar">
            <div className="fv-menu-search">
              <i className="bi bi-search" />

              <input
                type="search"
                placeholder="Search food name, category..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </div>

            <div className="fv-menu-filters">
              {[
                { value: "all", label: "All Foods" },
                { value: "available", label: "Available" },
                { value: "unavailable", label: "Unavailable" }
              ].map((option) => (
                <button
                  key={option.value}
                  className={
                    filter === option.value ? "active" : ""
                  }
                  onClick={() => setFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="fv-menu-loading">
              <div className="fv-menu-spinner" />
              <h3>Preparing your menu...</h3>
              <p>Loading your food listings.</p>
            </div>
          ) : filteredFoods.length === 0 ? (
            <div className="fv-menu-empty">
              <i className="bi bi-egg-fried" />

              <h3>
                {foods.length === 0
                  ? "Your menu is waiting for its first meal"
                  : "No matching food items"}
              </h3>

              <p>
                {foods.length === 0
                  ? "Start building your menu by adding your first food item."
                  : "Try another search or change your filter."}
              </p>

              {foods.length === 0 ? (
                <button
                  onClick={() =>
                    navigate("/food-vendor/foods/create")
                  }
                >
                  <i className="bi bi-plus-lg" />
                  Add Your First Food
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="fv-menu-results">
                Showing {filteredFoods.length} of {foods.length} food
                items
              </div>

              <div className="fv-menu-grid">
                {filteredFoods.map((food) => {
                  const available =
                    food.isAvailable &&
                    Number(food.quantity) > 0;

                  return (
                    <article
                      className="fv-menu-food-card"
                      key={food._id}
                    >
                      <div className="fv-menu-food-image">
                        {food.image ? (
                          <img
                            src={food.image}
                            alt={food.name}
                            loading="lazy"
                          />
                        ) : (
                          <div className="fv-menu-no-image">
                            <i className="bi bi-egg-fried" />
                          </div>
                        )}

                        <span
                          className={`fv-menu-food-badge ${
                            available
                              ? "available"
                              : "unavailable"
                          }`}
                        >
                          {available
                            ? "Available"
                            : "Unavailable"}
                        </span>
                      </div>

                      <div className="fv-menu-food-content">
                        <span className="fv-menu-food-category">
                          {food.category || "Food"}
                        </span>

                        <h3>{food.name}</h3>

                        <p className="fv-menu-food-description">
                          {food.description ||
                            "A delicious addition to your menu."}
                        </p>

                        <div className="fv-menu-food-details">
                          <div>
                            <span>PRICE</span>
                            <strong>
                              {formatMoney(food.price)}
                            </strong>
                          </div>

                          <div>
                            <span>QUANTITY</span>
                            <strong>
                              {Number(food.quantity) || 0}
                            </strong>
                          </div>
                        </div>

                        <div className="fv-menu-availability-row">
                          <div>
                            <strong>Menu Availability</strong>
                            <small>
                              {food.isAvailable
                                ? "Visible as available when in stock"
                                : "Marked as unavailable"}
                            </small>
                          </div>

                          <button
                            type="button"
                            className={`fv-menu-toggle ${
                              food.isAvailable ? "on" : ""
                            }`}
                            onClick={() =>
                              handleAvailability(food)
                            }
                            disabled={
                              availabilityLoading === food._id
                            }
                            aria-label={`Change availability for ${food.name}`}
                            aria-pressed={Boolean(
                              food.isAvailable
                            )}
                          >
                            <span />
                          </button>
                        </div>

                        <div className="fv-menu-food-actions">
                          <button
                            className="fv-menu-edit-btn"
                            onClick={() =>
                              navigate(
                                `/food-vendor/foods/${food._id}/edit`
                              )
                            }
                          >
                            <i className="bi bi-pencil-square" />
                            Edit Food
                          </button>

                          <button
                            className="fv-menu-delete-btn"
                            onClick={() =>
                              setSelectedFood(food)
                            }
                          >
                            <i className="bi bi-trash3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      {selectedFood && (
        <div className="fv-menu-modal-overlay">
          <div
            className="fv-menu-delete-modal"
            role="alertdialog"
            aria-modal="true"
            aria-label="Delete food confirmation"
          >
            <div className="fv-menu-delete-icon">
              <i className="bi bi-trash3" />
            </div>

            <h2>Delete This Food?</h2>

            <p>
              Are you sure you want to remove{" "}
              <strong>{selectedFood.name}</strong> from your
              menu? This action cannot be undone.
            </p>

            <div className="fv-menu-modal-actions">
              <button
                onClick={() => setSelectedFood(null)}
                disabled={actionLoading}
              >
                Keep Food
              </button>

              <button
                onClick={handleDelete}
                disabled={actionLoading}
              >
                {actionLoading
                  ? "Deleting..."
                  : "Yes, Delete Food"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodVendorMenu;
