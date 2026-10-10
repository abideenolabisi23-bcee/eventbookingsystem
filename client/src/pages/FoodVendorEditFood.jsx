
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "../styles/foodVendorAddFood.css";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1"
).replace(/\/+$/, "");

const categories = [
  "Rice Dishes",
  "Swallow & Soup",
  "Pasta & Noodles",
  "Grills & BBQ",
  "Chicken & Turkey",
  "Pizza",
  "Shawarma",
  "Burgers & Sandwiches",
  "Small Chops",
  "Breakfast",
  "Snacks & Pastries",
  "Seafood",
  "Drinks",
  "Desserts",
  "Other"
];

const FoodVendorEditFood = () => {
  const { foodId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    price: "",
    quantity: "",
    isAvailable: true
  });

  const [existingImage, setExistingImage] = useState("");
  const [newImage, setNewImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (!newImage) {
      setPreview(existingImage);
      return;
    }

    const url = URL.createObjectURL(newImage);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [newImage, existingImage]);

  useEffect(() => {
    let active = true;

    const fetchFood = async () => {
      const token = localStorage.getItem(
        "foodVendorAccessToken"
      );

      if (!token) {
        navigate("/food-vendor/login", {
          replace: true
        });
        return;
      }

      try {
        setLoading(true);

        const response = await axios.get(
          `${API_URL}/foods/${foodId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (!active) return;

        const food =
          response.data?.data?.food ||
          response.data?.food ||
          response.data?.data ||
          response.data;

        if (!food || !food._id) {
          throw new Error("Food information not found.");
        }

        setForm({
          name: food.name || "",
          description: food.description || "",
          category: food.category || "",
          price: String(food.price ?? ""),
          quantity: String(food.quantity ?? ""),
          isAvailable: food.isAvailable !== false
        });

        setExistingImage(
          typeof food.image === "string"
            ? food.image
            : food.image?.url ||
                food.imageUrl ||
                ""
        );
      } catch (error) {
        if (!active) return;

        setNotice({
          type: "error",
          title: "Unable to load food",
          message:
            error.response?.data?.message ||
            error.message ||
            "Please try again."
        });
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchFood();

    return () => {
      active = false;
    };
  }, [foodId, navigate]);

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

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp"
      ].includes(file.type)
    ) {
      setErrors((previous) => ({
        ...previous,
        image: "Choose a JPG, PNG, or WebP image."
      }));
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((previous) => ({
        ...previous,
        image: "Image size must not exceed 5MB."
      }));
      event.target.value = "";
      return;
    }

    setNewImage(file);

    setErrors((previous) => ({
      ...previous,
      image: ""
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Food name is required.";
    }

    if (!form.description.trim()) {
      nextErrors.description =
        "Food description is required.";
    }

    if (!form.category) {
      nextErrors.category =
        "Select a food category.";
    }

    if (
      form.price === "" ||
      !Number.isFinite(Number(form.price)) ||
      Number(form.price) <= 0
    ) {
      nextErrors.price =
        "Enter a valid price greater than zero.";
    }

    if (
      form.quantity === "" ||
      !Number.isInteger(Number(form.quantity)) ||
      Number(form.quantity) < 0
    ) {
      nextErrors.quantity =
        "Enter a valid whole-number quantity.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving || !validate()) return;

    const token = localStorage.getItem(
      "foodVendorAccessToken"
    );

    if (!token) {
      navigate("/food-vendor/login", {
        replace: true
      });
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const formData = new FormData();

      formData.append("name", form.name.trim());
      formData.append(
        "description",
        form.description.trim()
      );
      formData.append("category", form.category);
      formData.append(
        "price",
        String(Number(form.price))
      );
      formData.append(
        "quantity",
        String(Number(form.quantity))
      );
      formData.append(
        "isAvailable",
        String(form.isAvailable)
      );

      if (newImage) {
        formData.append("image", newImage);
      }

      await axios.put(
        `${API_URL}/foods/${foodId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setShowSuccessModal(true);
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/food-vendor/login", {
          replace: true
        });
        return;
      }

      setNotice({
        type: "error",
        title: "Unable to update food",
        message:
          error.response?.data?.message ||
          "Your changes could not be saved. Please try again."
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fv-add-page">
        <div className="fv-add-container">
          <div className="fv-add-loading">
            <i className="bi bi-arrow-repeat fv-add-spin" />
            <h2>Loading Food Details...</h2>
            <p>Please wait while we prepare your listing.</p>
          </div>
        </div>
      </div>
    );
  }

  if (notice?.title === "Unable to load food") {
    return (
      <div className="fv-add-page">
        <div className="fv-add-container">
          <div className="fv-add-loading">
            <i className="bi bi-exclamation-circle" />
            <h2>{notice.title}</h2>
            <p>{notice.message}</p>

            <button
              type="button"
              onClick={() =>
                navigate("/food-vendor/menu")
              }
            >
              Back to My Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fv-add-page">
      <div className="fv-add-container">
        <button
          type="button"
          className="fv-add-back"
          onClick={() =>
            navigate("/food-vendor/menu")
          }
        >
          <i className="bi bi-arrow-left" />
          Back to My Menu
        </button>

        <header className="fv-add-header">
          <div>
            <span>VIBELY FOOD VENDOR</span>
            <h1>Edit Food Listing</h1>
            <p>
              Update your food information, pricing,
              stock, and availability.
            </p>
          </div>

          <div className="fv-add-header-icon">
            <i className="bi bi-pencil-square" />
          </div>
        </header>

        {notice && (
          <div
            className={`fv-add-notice ${notice.type}`}
            role="alert"
          >
            <i className="bi bi-exclamation-circle-fill" />

            <div>
              <strong>{notice.title}</strong>
              <p>{notice.message}</p>
            </div>

            <button
              type="button"
              onClick={() => setNotice(null)}
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
                    Edit the details of this meal.
                  </p>
                </div>
              </div>

              <div className="fv-add-field">
                <label htmlFor="edit-food-name">
                  Food Name <span>*</span>
                </label>

                <input
                  id="edit-food-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  maxLength={120}
                />

                {errors.name && (
                  <small className="fv-add-error">
                    {errors.name}
                  </small>
                )}
              </div>

              <div className="fv-add-field">
                <label htmlFor="edit-food-description">
                  Description <span>*</span>
                </label>

                <textarea
                  id="edit-food-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={5}
                  maxLength={1500}
                />

                {errors.description && (
                  <small className="fv-add-error">
                    {errors.description}
                  </small>
                )}
              </div>

              <div className="fv-add-field">
                <label htmlFor="edit-food-category">
                  Category <span>*</span>
                </label>

                <select
                  id="edit-food-category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                >
                  <option value="">
                    Select a category
                  </option>

                  {form.category &&
!categories.some((category) => category.value === form.category) && (
                      <option value={form.category}>
                        {form.category}
                      </option>
                    )}

                  {categories.map((category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
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
                    Adjust your selling price and quantity.
                  </p>
                </div>
              </div>

              <div className="fv-add-two-columns">
                <div className="fv-add-field">
                  <label htmlFor="edit-food-price">
                    Price (₦) <span>*</span>
                  </label>

                  <div className="fv-add-input-icon">
                    <span>₦</span>

                    <input
                      id="edit-food-price"
                      type="number"
                      name="price"
                      value={form.price}
                      onChange={handleChange}
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
                  <label htmlFor="edit-food-quantity">
                    Available Quantity <span>*</span>
                  </label>

                  <input
                    id="edit-food-quantity"
                    type="number"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleChange}
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
                    Food Availability
                  </strong>

                  <p>
                    Control whether customers can order
                    this food.
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
                      isAvailable:
                        !previous.isAvailable
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
                    Keep the existing image or upload a new one.
                  </p>
                </div>
              </div>

              <div className="fv-add-upload">
                {preview ? (
                  <div className="fv-add-image-preview">
                    <img
                      src={preview}
                      alt={form.name || "Food"}
                    />

                    {newImage && (
                      <button
                        type="button"
                        onClick={() =>
                          setNewImage(null)
                        }
                        aria-label="Discard new image"
                      >
                        <i className="bi bi-x-lg" />
                      </button>
                    )}
                  </div>
                ) : (
                  <label
                    htmlFor="edit-food-image"
                    className="fv-add-upload-placeholder"
                  >
                    <i className="bi bi-cloud-arrow-up" />

                    <strong>
                      Upload Food Image
                    </strong>

                    <span>
                      JPG, PNG or WebP · Maximum 5MB
                    </span>
                  </label>
                )}

                <input
                  id="edit-food-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                />

                {preview && (
                  <label
                    htmlFor="edit-food-image"
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
                  <h2>Updated Preview</h2>
                  <p>
                    Preview your changes before saving.
                  </p>
                </div>
              </div>

              <div className="fv-add-preview-food">
                <div className="fv-add-preview-picture">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Updated food preview"
                    />
                  ) : (
                    <i className="bi bi-egg-fried" />
                  )}
                </div>

                <div className="fv-add-preview-content">
                  <span>
                    {form.category || "FOOD CATEGORY"}
                  </span>

                  <h3>
                    {form.name || "Food Name"}
                  </h3>

                  <p>
                    {form.description ||
                      "Food description"}
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
              <h3>Save Your Changes</h3>

              <p>
                Your updates will be applied to this
                existing food listing.
              </p>

              <button
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <i className="bi bi-arrow-repeat fv-add-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle" />
                    Save Changes
                  </>
                )}
              </button>

              <button
                type="button"
                className="fv-add-cancel"
                onClick={() =>
                  navigate("/food-vendor/menu")
                }
                disabled={saving}
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
            aria-labelledby="fv-edit-success-title"
          >
            <div className="fv-add-success-icon">
              <i className="bi bi-check-lg" />
            </div>

            <h2 id="fv-edit-success-title">
              Food Updated Successfully!
            </h2>

            <p>
              Your changes have been saved to your
              existing Vibely food listing.
            </p>

            <div className="fv-add-success-actions">
              <button
                type="button"
                onClick={() =>
                  navigate("/food-vendor/menu")
                }
              >
                Back to My Menu
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowSuccessModal(false)
                }
              >
                Continue Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodVendorEditFood;
