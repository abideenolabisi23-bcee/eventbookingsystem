import {
  useEffect,
  useRef,
  useState
} from "react";
import {
  useNavigate,
  useParams
} from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  MapPin,
  Ticket,
  Wallet,
  Save,
  ImagePlus
} from "lucide-react";
import "../styles/editEvent.css";

const EditEvent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    date: "",
    price: "",
    totalTickets: "",
    isAvailable: true
  });

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [feedback, setFeedback] = useState({
    open: false,
    type: "",
    title: "",
    message: ""
  });

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const token =
          localStorage.getItem("organizerAccessToken");

        if (!token) {
          navigate("/organizer/login");
          return;
        }

        const response = await axios.get(
          `https://eventbookingsystem-sooty.vercel.app/api/v1/events/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const event = response.data.data;

        const formattedDate = event.date
          ? new Date(event.date)
            .toISOString()
            .slice(0, 16)
          : "";

        setFormData({
          title: event.title || "",
          description: event.description || "",
          location: event.location || "",
          date: formattedDate,
          price: event.price ?? "",
          totalTickets:
            event.totalTickets ?? "",
          isAvailable:
            event.isAvailable !== false
        });

        setPreview(event.image || "");
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem("organizerAccessToken");
          localStorage.removeItem("organizerRefreshToken");
          localStorage.removeItem("organizerRole");
          navigate("/organizer/login");
          return;
        }

        setFeedback({
          open: true,
          type: "error",
          title: "Unable to load event",
          message:
            error.response?.data?.message ||
            "The event information could not be loaded."
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } =
      e.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        type === "checkbox" ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const selectedImage = e.target.files?.[0];

    if (!selectedImage) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(selectedImage.type)) {
      setFeedback({
        open: true,
        type: "error",
        title: "Invalid image",
        message:
          "Please select a JPG, PNG or WEBP image."
      });

      return;
    }

    if (selectedImage.size > 5 * 1024 * 1024) {
      setFeedback({
        open: true,
        type: "error",
        title: "Image is too large",
        message:
          "Your event image must be 5MB or smaller."
      });

      return;
    }

    setImage(selectedImage);
    setPreview(
      URL.createObjectURL(selectedImage)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      const token =
        localStorage.getItem("organizerAccessToken");

      if (!token) {
        navigate("/organizer/login");
        return;
      }

      const data = new FormData();

      data.append("title", formData.title);
      data.append(
        "description",
        formData.description
      );
      data.append(
        "location",
        formData.location
      );
      data.append("date", formData.date);
      data.append("price", formData.price);
      data.append(
        "totalTickets",
        formData.totalTickets
      );
      data.append(
        "isAvailable",
        formData.isAvailable
      );

      if (image) {
        data.append("image", image);
      }

      await axios.put(
        `https://eventbookingsystem-sooty.vercel.app/api/v1/events/${id}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setFeedback({
        open: true,
        type: "success",
        title: "Event updated",
        message:
          "Your event changes have been saved successfully."
      });
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("organizerAccessToken");
        localStorage.removeItem("organizerRefreshToken");
        localStorage.removeItem("organizerRole");
        navigate("/organizer/login");
        return;
      }

      setFeedback({
        open: true,
        type: "error",
        title: "Unable to update event",
        message:
          error.response?.data?.message ||
          "Your event could not be updated at this time."
      });
    } finally {
      setSaving(false);
    }
  };

  const closeFeedback = () => {
    if (feedback.type === "success") {
      navigate(`/organizer/events/${id}`);
      return;
    }

    setFeedback({
      open: false,
      type: "",
      title: "",
      message: ""
    });
  };

  if (loading) {
    return (
      <div className="edit-event-loading">
        <div className="edit-event-spinner"></div>
        <p>Loading event...</p>
      </div>
    );
  }

  return (
    <div className="edit-event-page">
      <div className="edit-event-container">
        <div className="edit-event-topbar">
          <button
            type="button"
            onClick={() =>
              navigate(
                `/organizer/events/${id}`
              )
            }
          >
            <ArrowLeft size={18} />
            Event Details
          </button>

          <div>
            <span>EVENT MANAGEMENT</span>
            <h1>Edit Event</h1>
          </div>
        </div>

        <form
          className="edit-event-layout"
          onSubmit={handleSubmit}
        >
          <div className="edit-event-main">
            <section className="edit-event-card">
              <div className="edit-card-heading">
                <span>01</span>

                <div>
                  <h2>Event Information</h2>
                  <p>
                    Update the information your
                    customers see.
                  </p>
                </div>
              </div>

              <div className="edit-form-group">
                <label>Event title</label>

                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="edit-form-group">
                <label>Description</label>

                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="6"
                  required
                />
              </div>

              <div className="edit-form-group">
                <label>
                  <MapPin size={16} />
                  Location
                </label>

                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="edit-form-group">
                <label>
                  <CalendarDays size={16} />
                  Date & time
                </label>

                <input
                  type="datetime-local"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>
            </section>

            <section className="edit-event-card">
              <div className="edit-card-heading">
                <span>02</span>

                <div>
                  <h2>Ticket Information</h2>
                  <p>
                    Manage your price and event
                    capacity.
                  </p>
                </div>
              </div>

              <div className="edit-form-row">
                <div className="edit-form-group">
                  <label>
                    <Wallet size={16} />
                    Ticket price
                  </label>

                  <div className="edit-price-input">
                    <span>₦</span>

                    <input
                      type="number"
                      name="price"
                      min="0"
                      value={formData.price}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="edit-form-group">
                  <label>
                    <Ticket size={16} />
                    Total tickets
                  </label>

                  <input
                    type="number"
                    name="totalTickets"
                    min="0"
                    value={
                      formData.totalTickets
                    }
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <label className="edit-availability">
                <div>
                  <strong>
                    Event availability
                  </strong>

                  <span>
                    Allow customers to book this
                    event.
                  </span>
                </div>

                <input
                  type="checkbox"
                  name="isAvailable"
                  checked={
                    formData.isAvailable
                  }
                  onChange={handleChange}
                />

                <span className="edit-switch"></span>
              </label>
            </section>
          </div>

          <aside className="edit-event-sidebar">
            <section className="edit-event-card edit-image-card">
              <div className="edit-card-heading">
                <span>03</span>

                <div>
                  <h2>Event Image</h2>
                  <p>
                    Replace your current event
                    cover.
                  </p>
                </div>
              </div>

              <div
                className="edit-image-preview"
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Event preview"
                  />
                ) : (
                  <div className="edit-empty-image">
                    <ImagePlus size={36} />
                    <span>Add event image</span>
                  </div>
                )}

                <div className="edit-image-overlay">
                  <Camera size={20} />
                  Change Image
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleImageChange}
                hidden
              />

              <p className="edit-image-help">
                JPG, PNG or WEBP. Maximum 5MB.
              </p>
            </section>

            <button
              className="edit-save-button"
              type="submit"
              disabled={saving}
            >
              <Save size={18} />

              {saving
                ? "Saving Changes..."
                : "Save Changes"}
            </button>

            <button
              type="button"
              className="edit-cancel-button"
              onClick={() =>
                navigate(
                  `/organizer/events/${id}`
                )
              }
            >
              Cancel
            </button>
          </aside>
        </form>
      </div>

      {feedback.open && (
        <div className="edit-feedback-overlay">
          <div className="edit-feedback-modal">
            <div
              className={`edit-feedback-icon ${feedback.type}`}
            >
              {feedback.type === "success"
                ? "✓"
                : "!"}
            </div>

            <span className="edit-feedback-label">
              {feedback.type === "success"
                ? "SUCCESS"
                : "SOMETHING WENT WRONG"}
            </span>

            <h2>{feedback.title}</h2>

            <p>{feedback.message}</p>

            <button
              type="button"
              onClick={closeFeedback}
            >
              {feedback.type === "success"
                ? "View Event"
                : "Try Again"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditEvent;