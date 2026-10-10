
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/foodVendorAddFood.css";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1"
).replace(/\/+$/, "");


const categories = [
  { value: "rice", label: "Rice Dishes" },
  { value: "swallow", label: "Swallow" },
  { value: "soups", label: "Soups & Stews" },
  { value: "pasta", label: "Pasta" },
  { value: "noodles", label: "Noodles & Chinese Dishes" },
  { value: "pizza", label: "Pizza" },
  { value: "shawarma", label: "Shawarma" },
  { value: "burgers", label: "Burgers" },
  { value: "sandwiches", label: "Sandwiches" },
  { value: "chicken", label: "Chicken Dishes" },
  { value: "turkey", label: "Turkey Dishes" },
  { value: "grills", label: "Grills & BBQ" },
  { value: "seafood", label: "Seafood" },
  { value: "small_chops", label: "Small Chops" },
  { value: "snacks", label: "Snacks & Pastries" },
  { value: "breakfast", label: "Breakfast" },
  { value: "salads", label: "Salads" },
  { value: "desserts", label: "Desserts" },
  { value: "drinks", label: "Drinks, Cocktails & Mocktails" },
  { value: "local_delicacies", label: "Local Delicacies" },
  { value: "beans", label: "Beans Dishes" },
  { value: "yam", label: "Yam Dishes" },
  { value: "plantain", label: "Plantain Dishes" },
  { value: "porridge", label: "Porridge" },
  { value: "others", label: "Other Foods" }
];


const initialForm = {
  name: "",
  description: "",
  category: "",
  price: "",
  quantity: "",
  isAvailable: true
};

const FoodVendorAddFood = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (!image) {
      setPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(image);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  useEffect(() => {
    if (!notification) return;

    const timer = setTimeout(() => {
      setNotification(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: ""
    }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      setErrors((previous) => ({
        ...previous,
        image: "Please select a JPG, PNG, or WebP image."
      }));
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((previous) => ({
        ...previous,
        image: "Your image must not exceed 5MB."
      }));
      event.target.value = "";
      return;
    }

    setImage(file);
    setErrors((previous) => ({
      ...previous,
      image: ""
    }));
  };

  const removeImage = () => {
    setImage(null);
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Food name is required.";
    }

    if (!form.description.trim()) {
      nextErrors.description = "Food description is required.";
    }

    if (!form.category) {
      nextErrors.category = "Please select a food category.";
    }

    if (
      form.price === "" ||
      !Number.isFinite(Number(form.price)) ||
      Number(form.price) <= 0
    ) {
      nextErrors.price = "Enter a valid price greater than zero.";
    }

    if (
      form.quantity === "" ||
      !Number.isInteger(Number(form.quantity)) ||
      Number(form.quantity) < 0
    ) {
      nextErrors.quantity = "Enter a valid whole-number quantity.";
    }

    if (!image) {
      nextErrors.image = "Please upload a food image.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting || !validate()) return;

    const token = localStorage.getItem("foodVendorAccessToken");

    if (!token) {
      navigate("/food-vendor/login", { replace: true });
      return;
    }

    setSubmitting(true);
    setNotification(null);

    try {
      const formData = new FormData();

      formData.append("name", form.name.trim());
      formData.append("description", form.description.trim());
      formData.append("category", form.category);
      formData.append("price", String(Number(form.price)));
      formData.append("quantity", String(Number(form.quantity)));
      formData.append(
        "isAvailable",
        String(form.isAvailable)
      );
      formData.append("image", image);

      await axios.post(`${API_URL}/foods`, formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setShowSuccessModal(true);
    } catch (error) {
        console.log(
  "BACKEND ERROR MESSAGE:",
  JSON.stringify(error.response?.data, null, 2)
);
      if (error.response?.status === 401) {
        navigate("/food-vendor/login", { replace: true });
        return;
      }

      setNotification({
        type: "error",
        title: "Unable to add food",
        message:
          error.response?.data?.message ||
          "Your food listing could not be saved. Please try again."
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fv-add-page">
      <div className="fv-add-container">
        <button
          type="button"
          className="fv-add-back"
          onClick={() => navigate("/food-vendor/menu")}
        >
          <i className="bi bi-arrow-left" />
          Back to My Menu
        </button>

        <header className="fv-add-header">
          <div>
            <span>VIBELY FOOD VENDOR</span>
            <h1>Add New Food</h1>
            <p>
              Create an attractive food listing for your
              customers to discover and order.
            </p>
          </div>

          <div className="fv-add-header-icon">
            <i className="bi bi-plus-circle" />
          </div>
        </header>

        {notification && (
          <div
            className={`fv-add-notice ${notification.type}`}
            role="alert"
          >
            <i className="bi bi-exclamation-circle-fill" />

            <div>
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
            </div>

            <button
              type="button"
              onClick={() => setNotification(null)}
              aria-label="Dismiss notification"
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>
        )}

        <form
          className="fv-add-layout"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="fv-add-form-column">
            <section className="fv-add-card">
              <div className="fv-add-card-heading">
                <div className="fv-add-heading-icon">
                  <i className="bi bi-card-text" />
                </div>

                <div>
                  <h2>Food Information</h2>
                  <p>
                    Tell your customers about this meal.
                  </p>
                </div>
              </div>

              <div className="fv-add-field">
                <label htmlFor="food-name">
                  Food Name <span>*</span>
                </label>

                <input
                  id="food-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Special Chicken Fried Rice"
                  maxLength={120}
                />

                {errors.name && (
                  <small className="fv-add-error">
                    {errors.name}
                  </small>
                )}
              </div>

              <div className="fv-add-field">
                <label htmlFor="food-description">
                  Food Description <span>*</span>
                </label>

                <textarea
                  id="food-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the ingredients, taste, and what makes this meal special..."
                  rows={5}
                  maxLength={1500}
                />

                <div className="fv-add-field-footer">
                  {errors.description ? (
                    <small className="fv-add-error">
                      {errors.description}
                    </small>
                  ) : (
                    <small>
                      Make your description appealing to customers.
                    </small>
                  )}

                  <small>
                    {form.description.length}/1500
                  </small>
                </div>
              </div>

              <div className="fv-add-field">
                <label htmlFor="food-category">
                  Food Category <span>*</span>
                </label>

                <select
                  id="food-category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                >
                  <option value="">Select food category</option>

{categories.map((category) => (
  <option key={category.value} value={category.value}>
    {category.label}
  </option>
))}
                </select>

                {errors.category && (
                  <small className="fv-add-error">
                    {errors.category}
                  </small>
                )}
              </div>
            </section>

            <section className="fv-add-card">
              <div className="fv-add-card-heading">
                <div className="fv-add-heading-icon">
                  <i className="bi bi-cash-stack" />
                </div>

                <div>
                  <h2>Pricing & Stock</h2>
                  <p>
                    Set the selling price and available quantity.
                  </p>
                </div>
              </div>

              <div className="fv-add-two-columns">
                <div className="fv-add-field">
                  <label htmlFor="food-price">
                    Price (₦) <span>*</span>
                  </label>

                  <div className="fv-add-input-icon">
                    <span>₦</span>

                    <input
                      id="food-price"
                      type="number"
                      name="price"
                      value={form.price}
                      onChange={handleChange}
                      placeholder="5000"
                      min="1"
                      step="0.01"
                    />
                  </div>

                  {errors.price && (
                    <small className="fv-add-error">
                      {errors.price}
                    </small>
                  )}
                </div>

                <div className="fv-add-field">
                  <label htmlFor="food-quantity">
                    Available Quantity <span>*</span>
                  </label>

                  <input
                    id="food-quantity"
                    type="number"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleChange}
                    placeholder="20"
                    min="0"
                    step="1"
                  />

                  {errors.quantity && (
                    <small className="fv-add-error">
                      {errors.quantity}
                    </small>
                  )}
                </div>
              </div>

              <div className="fv-add-availability">
                <div>
                  <strong>
                    Make This Food Available
                  </strong>

                  <p>
                    Customers can order this food when it is
                    enabled and in stock.
                  </p>
                </div>

                <button
                  type="button"
                  className={`fv-add-toggle ${
                    form.isAvailable ? "active" : ""
                  }`}
                  onClick={() =>
                    setForm((previous) => ({
                      ...previous,
                      isAvailable: !previous.isAvailable
                    }))
                  }
                  aria-pressed={form.isAvailable}
                  aria-label="Toggle food availability"
                >
                  <span />
                </button>
              </div>
            </section>
          </div>

          <div className="fv-add-side-column">
            <section className="fv-add-card">
              <div className="fv-add-card-heading">
                <div className="fv-add-heading-icon">
                  <i className="bi bi-image" />
                </div>

                <div>
                  <h2>Food Photography</h2>
                  <p>
                    Upload a clear, attractive picture.
                  </p>
                </div>
              </div>

              <div className="fv-add-upload">
                {preview ? (
                  <div className="fv-add-image-preview">
                    <img
                      src={preview}
                      alt="Food preview"
                    />

                    <button
                      type="button"
                      onClick={removeImage}
                      aria-label="Remove selected image"
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="food-image"
                    className="fv-add-upload-placeholder"
                  >
                    <i className="bi bi-cloud-arrow-up" />

                    <strong>
                      Click to Upload Food Image
                    </strong>

                    <span>
                      JPG, PNG or WebP · Maximum 5MB
                    </span>
                  </label>
                )}

                <input
                  id="food-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                />

                {preview && (
                  <label
                    htmlFor="food-image"
                    className="fv-add-change-image"
                  >
                    <i className="bi bi-arrow-repeat" />
                    Change Image
                  </label>
                )}

                {errors.image && (
                  <small className="fv-add-error">
                    {errors.image}
                  </small>
                )}
              </div>
            </section>

            <section className="fv-add-card fv-add-preview-card">
              <div className="fv-add-card-heading">
                <div className="fv-add-heading-icon">
                  <i className="bi bi-eye" />
                </div>

                <div>
                  <h2>Listing Preview</h2>
                  <p>
                    See how your food details look.
                  </p>
                </div>
              </div>

              <div className="fv-add-preview-food">
                <div className="fv-add-preview-picture">
                  {preview ? (
                    <img src={preview} alt="Food listing" />
                  ) : (
                    <i className="bi bi-egg-fried" />
                  )}
                </div>

                <div className="fv-add-preview-content">
                  <span>
                    {form.category || "FOOD CATEGORY"}
                  </span>

                  <h3>
                    {form.name || "Your Delicious Food"}
                  </h3>

                  <p>
                    {form.description ||
                      "Your food description will appear here."}
                  </p>

                  <strong>
                    ₦
                    {Number(
                      form.price || 0
                    ).toLocaleString("en-NG")}
                  </strong>
                </div>
              </div>
            </section>

            <section className="fv-add-card fv-add-publish-card">
              <h3>Ready to Publish?</h3>

              <p>
                Review your food details before adding
                this item to your Vibely menu.
              </p>

              <button
                type="submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <i className="bi bi-arrow-repeat fv-add-spin" />
                    Publishing Food...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle" />
                    Publish Food
                  </>
                )}
              </button>

              <button
                type="button"
                className="fv-add-cancel"
                onClick={() =>
                  navigate("/food-vendor/menu")
                }
                disabled={submitting}
              >
                Cancel
              </button>
            </section>
          </div>
        </form>
      </div>

      {showSuccessModal && (
        <div className="fv-add-modal-overlay">
          <div
            className="fv-add-success-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fv-add-success-title"
          >
            <div className="fv-add-success-icon">
              <i className="bi bi-check-lg" />
            </div>

            <h2 id="fv-add-success-title">
              Food Added Successfully!
            </h2>

            <p>
              Your delicious food listing has been
              created successfully on Vibely.
            </p>

            <div className="fv-add-success-actions">
              <button
                type="button"
                onClick={() =>
                  navigate("/food-vendor/menu")
                }
              >
                View My Menu
              </button>

              <button
                type="button"
                onClick={() => {
                  setForm(initialForm);
                  setImage(null);
                  setErrors({});
                  setShowSuccessModal(false);
                }}
              >
                Add Another Food
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodVendorAddFood;
