import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Upload,
  X,
  Plus
} from "lucide-react";
import "../styles/addApartment.css";

const imageFields = [
  {
    name: "exterior",
    label: "Exterior"
  },
  {
    name: "livingRoom",
    label: "Living Room"
  },
  {
    name: "bedroom",
    label: "Bedroom"
  },
  {
    name: "kitchen",
    label: "Kitchen"
  },
  {
    name: "bathroom",
    label: "Bathroom"
  },
  {
    name: "balcony",
    label: "Balcony"
  },
  {
    name: "extraView",
    label: "Extra View"
  }
];

const AddApartment = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    apartmentType: "budget",
    location: "",
    pricePerNight: "",
    dayUsePrice: "",
    totalUnits: "50",
    amenities: []
  });

  const [amenity, setAmenity] = useState("");

  const [images, setImages] = useState({
    exterior: null,
    livingRoom: null,
    bedroom: null,
    kitchen: null,
    bathroom: null,
    balcony: null,
    extraView: null
  });

  const [previews, setPreviews] = useState({
    exterior: "",
    livingRoom: "",
    bedroom: "",
    kitchen: "",
    bathroom: "",
    balcony: "",
    extraView: ""
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleImageChange = (event, imageName) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    setImages((current) => ({
      ...current,
      [imageName]: file
    }));

    setPreviews((current) => ({
      ...current,
      [imageName]: URL.createObjectURL(file)
    }));
  };

  const removeImage = (imageName) => {
    if (previews[imageName]) {
      URL.revokeObjectURL(previews[imageName]);
    }

    setImages((current) => ({
      ...current,
      [imageName]: null
    }));

    setPreviews((current) => ({
      ...current,
      [imageName]: ""
    }));
  };

  const addAmenity = () => {
    const cleanAmenity = amenity.trim();

    if (!cleanAmenity) {
      return;
    }

    if (formData.amenities.includes(cleanAmenity)) {
      setAmenity("");
      return;
    }

    setFormData((current) => ({
      ...current,
      amenities: [...current.amenities, cleanAmenity]
    }));

    setAmenity("");
  };

  const removeAmenity = (item) => {
    setFormData((current) => ({
      ...current,
      amenities: current.amenities.filter(
        (amenityItem) => amenityItem !== item
      )
    }));
  };

  const handleAmenityKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addAmenity();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const token = localStorage.getItem("accessToken");

    if (!token) {
      navigate("/organizer/login");
      return;
    }

    const missingImage = imageFields.find(
      (field) => !images[field.name]
    );

    if (missingImage) {
      setMessage(
        `Please upload the ${missingImage.label.toLowerCase()} image`
      );
      setMessageType("error");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const apartmentData = new FormData();

      apartmentData.append("title", formData.title);
      apartmentData.append(
        "description",
        formData.description
      );
      apartmentData.append(
        "apartmentType",
        formData.apartmentType
      );
      apartmentData.append(
        "location",
        formData.location
      );
      apartmentData.append(
        "pricePerNight",
        formData.pricePerNight
      );
      apartmentData.append(
        "dayUsePrice",
        formData.dayUsePrice
      );
      apartmentData.append(
        "totalUnits",
        formData.totalUnits
      );

      apartmentData.append(
        "amenities",
        JSON.stringify(formData.amenities)
      );

      imageFields.forEach((field) => {
        apartmentData.append(
          field.name,
          images[field.name]
        );
      });

      const response = await fetch(
        "http://192.168.0.3:5005/api/v1/apartments",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: apartmentData
        }
      );

      const result = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        navigate("/organizer/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to create apartment"
        );
      }

      setMessage("Apartment created successfully");
      setMessageType("success");

      setTimeout(() => {
        navigate("/organizer/apartments");
      }, 1300);
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-apartment-page">
      <div className="add-apartment-container">
        <button
          className="back-apartments-button"
          onClick={() =>
            navigate("/organizer/apartments")
          }
        >
          <ArrowLeft size={18} />
          Back to Apartments
        </button>

        <div className="add-apartment-heading">
          <div className="add-apartment-heading-icon">
            <Building2 size={27} />
          </div>

          <div>
            <span>Accommodation Management</span>
            <h1>Add New Apartment</h1>

            <p>
              Create your apartment listing, set pricing and
              upload the complete property gallery.
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`add-apartment-message ${messageType}`}
          >
            {message}
          </div>
        )}

        <form
          className="add-apartment-form"
          onSubmit={handleSubmit}
        >
          <section className="apartment-form-section">
            <div className="apartment-section-heading">
              <span>01</span>

              <div>
                <h2>Apartment Information</h2>

                <p>
                  Add the basic information customers will see.
                </p>
              </div>
            </div>

            <div className="apartment-form-grid">
              <div className="apartment-input-group full">
                <label>Apartment Title</label>

                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Standard Apartment"
                  required
                />
              </div>

              <div className="apartment-input-group">
                <label>Apartment Type</label>

                <select
                  name="apartmentType"
                  value={formData.apartmentType}
                  onChange={handleChange}
                  required
                >
                  <option value="budget">
                    Budget Apartment
                  </option>

                  <option value="standard">
                    Standard Apartment
                  </option>

                  <option value="luxury">
                    Luxury Apartment
                  </option>
                </select>
              </div>

              <div className="apartment-input-group">
                <label>Location</label>

                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. Lekki, Lagos"
                  required
                />
              </div>

              <div className="apartment-input-group full">
                <label>Description</label>

                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe the apartment, atmosphere and what makes it special..."
                  rows="6"
                  required
                />
              </div>
            </div>
          </section>

          <section className="apartment-form-section">
            <div className="apartment-section-heading">
              <span>02</span>

              <div>
                <h2>Pricing & Rooms</h2>

                <p>
                  Set accommodation rates and room capacity.
                </p>
              </div>
            </div>

            <div className="apartment-form-grid three-columns">
              <div className="apartment-input-group">
                <label>Price Per Night</label>

                <div className="price-input">
                  <span>₦</span>

                  <input
                    type="number"
                    name="pricePerNight"
                    value={formData.pricePerNight}
                    onChange={handleChange}
                    placeholder="25000"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="apartment-input-group">
                <label>Day Use Price</label>

                <div className="price-input">
                  <span>₦</span>

                  <input
                    type="number"
                    name="dayUsePrice"
                    value={formData.dayUsePrice}
                    onChange={handleChange}
                    placeholder="15000"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="apartment-input-group">
                <label>Total Rooms</label>

                <input
                  type="number"
                  name="totalUnits"
                  value={formData.totalUnits}
                  onChange={handleChange}
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="room-capacity-note">
              For our Vibely setup, use 50 rooms for Budget,
              50 for Standard and 50 for Luxury.
            </div>
          </section>

          <section className="apartment-form-section">
            <div className="apartment-section-heading">
              <span>03</span>

              <div>
                <h2>Amenities</h2>

                <p>
                  Add the facilities included with this
                  apartment.
                </p>
              </div>
            </div>

            <div className="amenity-entry">
              <input
                type="text"
                value={amenity}
                onChange={(event) =>
                  setAmenity(event.target.value)
                }
                onKeyDown={handleAmenityKeyDown}
                placeholder="e.g. Free Wi-Fi"
              />

              <button
                type="button"
                onClick={addAmenity}
              >
                <Plus size={17} />
                Add
              </button>
            </div>

            {formData.amenities.length > 0 && (
              <div className="amenities-list">
                {formData.amenities.map((item) => (
                  <span key={item}>
                    {item}

                    <button
                      type="button"
                      onClick={() =>
                        removeAmenity(item)
                      }
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="apartment-form-section">
            <div className="apartment-section-heading">
              <span>04</span>

              <div>
                <h2>Apartment Gallery</h2>

                <p>
                  Upload all seven property images. These
                  photos will appear throughout the customer
                  apartment experience.
                </p>
              </div>
            </div>

            <div className="apartment-gallery-note">
              <div className="apartment-gallery-note-icon">
                <Upload size={18} />
              </div>

              <div>
                <strong>7 property photos required</strong>

                <span>
                  Exterior, living room, bedroom, kitchen,
                  bathroom, balcony and one extra view.
                </span>
              </div>
            </div>

            <div className="apartment-images-grid">
              {imageFields.map((field, index) => (
                <div
                  className={`apartment-image-upload ${field.name === "extraView"
                      ? "extra-view-upload"
                      : ""
                    }`}
                  key={field.name}
                >
                  <div className="image-upload-title">
                    <div>
                      <span className="image-upload-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <strong>{field.label}</strong>
                    </div>

                    <span>Required</span>
                  </div>

                  {previews[field.name] ? (
                    <div className="apartment-preview">
                      <img
                        src={previews[field.name]}
                        alt={`${field.label} preview`}
                      />

                      <div className="apartment-preview-label">
                        {field.label}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeImage(field.name)
                        }
                        aria-label={`Remove ${field.label}`}
                      >
                        <X size={17} />
                      </button>
                    </div>
                  ) : (
                    <label className="apartment-upload-box">
                      <div className="apartment-upload-icon">
                        <Upload size={23} />
                      </div>

                      <strong>
                        Upload {field.label}
                      </strong>

                      <span>
                        JPG, PNG or WEBP • Max 5MB
                      </span>

                      {field.name === "exterior" && (
                        <small>
                          This will be the main customer
                          listing photo.
                        </small>
                      )}

                      {field.name === "extraView" && (
                        <small>
                          Add another attractive view of the
                          property.
                        </small>
                      )}

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) =>
                          handleImageChange(
                            event,
                            field.name
                          )
                        }
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </section>

          <div className="apartment-form-actions">
            <button
              type="button"
              className="cancel-apartment-button"
              onClick={() =>
                navigate("/organizer/apartments")
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="save-apartment-button"
              disabled={loading}
            >
              {loading
                ? "Creating Apartment..."
                : "Create Apartment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddApartment;