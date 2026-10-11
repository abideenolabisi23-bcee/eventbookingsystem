
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

const API_URL = "https://eventbookingsystem-sooty.vercel.app/api/v1";

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

  const [eventHasTicketTypes, setEventHasTicketTypes] = useState(false);
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
        const token = localStorage.getItem("organizerAccessToken");

        if (!token) {
          navigate("/organizer/login");
          return;
        }

        const response = await axios.get(
          `${API_URL}/events/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const event = response.data.data;

        setEventHasTicketTypes(
          Array.isArray(event.ticketTypes) &&
          event.ticketTypes.length > 0
        );

        const formattedDate = event.date
          ? new Date(
              new Date(event.date).getTime() -
              new Date(event.date).getTimezoneOffset() * 60000
            ).toISOString().slice(0, 16)
          : "";

        setFormData({
          title: event.title || "",
          description: event.description || "",
          location: event.location || "",
          date: formattedDate,
          price: event.price ?? "",
          totalTickets: event.totalTickets ?? "",
          isAvailable: event.isAvailable !== false
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
            error.response?.data?.error ||
            error.response?.data?.message ||
            error.message ||
            "The event information could not be loaded."
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value
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
        message: "Please select a JPG, PNG or WEBP image."
      });
      e.target.value = "";
      return;
    }

    if (selectedImage.size > 5 * 1024 * 1024) {
      setFeedback({
        open: true,
        type: "error",
        title: "Image is too large",
        message: "Your event image must be 5MB or smaller."
      });
      e.target.value = "";
      return;
    }

    setImage(selectedImage);
    setPreview(URL.createObjectURL(selectedImage));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (saving) return;

    try {
      setSaving(true);

      const token = localStorage.getItem("organizerAccessToken");

      if (!token) {
        navigate("/organizer/login");
        return;
      }

      const data = new FormData();

      data.append("title", formData.title.trim());
      data.append("description", formData.description.trim());
      data.append("location", formData.location.trim());
      data.append("date", new Date(formData.date).toISOString());
      data.append("isAvailable", String(formData.isAvailable));

      if (!eventHasTicketTypes) {
        data.append("price", String(formData.price));
        data.append("totalTickets", String(formData.totalTickets));
      }

      if (image) {
        data.append("image", image);
      }

      const response = await axios.put(
        `${API_URL}/events/${id}`,
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
          response.data?.message ||
          "Your event changes have been saved successfully."
      });
    } catch (error) {
      console.error("UPDATE EVENT ERROR:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      if (error.response?.status === 401) {
        localStorage.removeItem("organizerAccessToken");
        localStorage.removeItem("organizerRefreshToken");
        localStorage.removeItem("organizerRole");
        navigate("/organizer/login");
        return;
      }

      const serverError = error.response?.data?.error;
      const serverMessage = error.response?.data?.message;

      const errorMessage =
        (typeof serverError === "string" && serverError) ||
        (typeof serverMessage === "string" && serverMessage) ||
        (error.response
          ? `Request failed with status ${error.response.status}.`
          : error.message === "Network Error"
            ? "Unable to connect to the server. Please check your internet connection and the API server."
            : error.message || "Your event could not be updated at this time.");

      setFeedback({
        open: true,
        type: "error",
        title: "Unable to update event",
        message: errorMessage
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
            onClick={() => navigate(`/organizer/events/${id}`)}
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
                    Update the information your customers see.
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
                    Manage your price and event capacity.
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
                      disabled={eventHasTicketTypes}
                      required={!eventHasTicketTypes}
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
                    step="1"
                    value={formData.totalTickets}
                    onChange={handleChange}
                    disabled={eventHasTicketTypes}
                    required={!eventHasTicketTypes}
                  />
                </div>
              </div>

              {eventHasTicketTypes && (
                <p>
                  This event uses ticket categories. The displayed
                  price and capacity are calculated from those
                  categories and cannot be changed here.
                </p>
              )}

              <label className="edit-availability">
                <div>
                  <strong>Event availability</strong>
                  <span>
                    Allow customers to book this event.
                  </span>
                </div>

                <input
                  type="checkbox"
                  name="isAvailable"
                  checked={formData.isAvailable}
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
                    Replace your current event cover.
                  </p>
                </div>
              </div>

              <div
                className="edit-image-preview"
                onClick={() => fileInputRef.current?.click()}
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
              {saving ? "Saving Changes..." : "Save Changes"}
            </button>

            <button
              type="button"
              className="edit-cancel-button"
              onClick={() => navigate(`/organizer/events/${id}`)}
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
              {feedback.type === "success" ? "✓" : "!"}
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
