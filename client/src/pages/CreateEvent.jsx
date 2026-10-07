import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/createEvent.css";

const CreateEvent = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    date: "",
    price: "",
    totalTickets: ""
  });

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [feedback, setFeedback] = useState({
    open: false,
    type: "",
    title: "",
    message: ""
  });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      setFeedback({
        open: true,
        type: "error",
        title: "Invalid image",
        message: "Please select a JPG, PNG or WEBP image."
      });

      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({
        open: true,
        type: "error",
        title: "Image too large",
        message: "Your event image must not be larger than 5MB."
      });

      event.target.value = "";
      return;
    }

    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setImage(null);
    setPreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !formData.title.trim() ||
      !formData.description.trim() ||
      !formData.location.trim() ||
      !formData.date ||
      formData.price === "" ||
      formData.totalTickets === ""
    ) {
      setFeedback({
        open: true,
        type: "error",
        title: "Complete your event",
        message: "Please fill in all the required event information."
      });

      return;
    }

    if (Number(formData.price) < 0) {
      setFeedback({
        open: true,
        type: "error",
        title: "Invalid price",
        message: "Event price cannot be less than zero."
      });

      return;
    }

    if (Number(formData.totalTickets) <= 0) {
      setFeedback({
        open: true,
        type: "error",
        title: "Invalid ticket quantity",
        message: "Total tickets must be greater than zero."
      });

      return;
    }

    const accessToken = localStorage.getItem("accessToken");

    if (!accessToken) {
      navigate("/organizer/login");
      return;
    }

    try {
      setSubmitting(true);

      const data = new FormData();

      data.append("title", formData.title.trim());
      data.append("description", formData.description.trim());
      data.append("location", formData.location.trim());
      data.append("date", formData.date);
      data.append("price", formData.price);
      data.append("totalTickets", formData.totalTickets);

      if (image) {
        data.append("image", image);
      }

      await axios.post(
        "https://eventbookingsystem-sooty.vercel.app/api/v1/events",
        data,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      setFeedback({
        open: true,
        type: "success",
        title: "Event created",
        message:
          "Your event has been created successfully and is now available in My Events."
      });

    } catch (error) {
      console.log(error);

      if (error.response?.status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("role");

        navigate("/organizer/login");
        return;
      }

      setFeedback({
        open: true,
        type: "error",
        title: "Unable to create event",
        message:
          error.response?.data?.message ||
          "Your event could not be created at this time."
      });

    } finally {
      setSubmitting(false);
    }
  };

  const closeFeedback = () => {
    if (feedback.type === "success") {
      navigate("/organizer/events");
      return;
    }

    setFeedback({
      open: false,
      type: "",
      title: "",
      message: ""
    });
  };

  return (
    <div className="create-event-page">
      <header className="create-event-header">
        <button
          type="button"
          className="create-event-back"
          onClick={() => navigate("/organizer/events")}
        >
          <i className="bi bi-arrow-left"></i>
          My Events
        </button>

        <div className="create-event-brand">
          <img src={vibelyLogo} alt="Vibely" />

          <div>
            <h2>Vibely</h2>
            <span>ORGANIZER</span>
          </div>
        </div>

        <button
          type="button"
          className="create-event-dashboard"
          onClick={() => navigate("/organizer/dashboard")}
        >
          Dashboard
        </button>
      </header>

      <main className="create-event-main">
        <section className="create-event-intro">
          <span>EVENT MANAGEMENT</span>

          <h1>Create a New Event</h1>

          <p>
            Bring your next experience to life. Add the important
            details your guests need before booking their tickets.
          </p>
        </section>

        <form
          className="create-event-form"
          onSubmit={handleSubmit}
        >
          <section className="create-event-card">
            <div className="create-event-card-heading">
              <div className="create-event-step">01</div>

              <div>
                <h2>Event Details</h2>
                <p>
                  Tell your guests what your event is all about.
                </p>
              </div>
            </div>

            <div className="create-event-fields">
              <div className="create-event-field full">
                <label htmlFor="title">Event title</label>

                <input
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. Lagos Fashion Night"
                />
              </div>

              <div className="create-event-field full">
                <label htmlFor="description">
                  Event description
                </label>

                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Tell guests about the experience, what to expect and other important information..."
                  rows="6"
                ></textarea>

                <small>
                  Give your guests enough information to understand
                  the event.
                </small>
              </div>
            </div>
          </section>

          <section className="create-event-card">
            <div className="create-event-card-heading">
              <div className="create-event-step">02</div>

              <div>
                <h2>Date & Location</h2>
                <p>
                  Let guests know when and where the event will happen.
                </p>
              </div>
            </div>

            <div className="create-event-fields two-columns">
              <div className="create-event-field">
                <label htmlFor="date">Event date & time</label>

                <div className="create-event-input-icon">
                  <i className="bi bi-calendar3"></i>

                  <input
                    id="date"
                    name="date"
                    type="datetime-local"
                    value={formData.date}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="create-event-field">
                <label htmlFor="location">Location</label>

                <div className="create-event-input-icon">
                  <i className="bi bi-geo-alt"></i>

                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g. Victoria Island, Lagos"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="create-event-card">
            <div className="create-event-card-heading">
              <div className="create-event-step">03</div>

              <div>
                <h2>Tickets</h2>
                <p>
                  Set the ticket price and total event capacity.
                </p>
              </div>
            </div>

            <div className="create-event-fields two-columns">
              <div className="create-event-field">
                <label htmlFor="price">
                  Ticket price
                </label>

                <div className="create-event-price-input">
                  <span>₦</span>

                  <input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="15000"
                  />
                </div>

                <small>
                  Enter 0 if the event is free.
                </small>
              </div>

              <div className="create-event-field">
                <label htmlFor="totalTickets">
                  Total tickets
                </label>

                <div className="create-event-input-icon">
                  <i className="bi bi-ticket-perforated"></i>

                  <input
                    id="totalTickets"
                    name="totalTickets"
                    type="number"
                    min="1"
                    value={formData.totalTickets}
                    onChange={handleChange}
                    placeholder="200"
                  />
                </div>

                <small>
                  Maximum number of guests who can book.
                </small>
              </div>
            </div>
          </section>

          <section className="create-event-card">
            <div className="create-event-card-heading">
              <div className="create-event-step">04</div>

              <div>
                <h2>Event Cover</h2>
                <p>
                  Upload an attractive image for your event.
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="create-event-file-input"
            />

            {!preview ? (
              <button
                type="button"
                className="create-event-upload"
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                <div className="create-event-upload-icon">
                  <i className="bi bi-cloud-arrow-up"></i>
                </div>

                <strong>Upload event image</strong>

                <span>
                  JPG, PNG or WEBP · Maximum 5MB
                </span>

                <div className="create-event-browse">
                  Choose Image
                </div>
              </button>
            ) : (
              <div className="create-event-preview">
                <img src={preview} alt="Event preview" />

                <div className="create-event-preview-overlay">
                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                  >
                    <i className="bi bi-image"></i>
                    Change
                  </button>

                  <button
                    type="button"
                    onClick={removeImage}
                  >
                    <i className="bi bi-trash3"></i>
                    Remove
                  </button>
                </div>
              </div>
            )}
          </section>

          <div className="create-event-footer">
            <div>
              <i className="bi bi-shield-check"></i>

              <p>
                Review your event information carefully before
                publishing.
              </p>
            </div>

            <section>
              <button
                type="button"
                className="create-event-cancel"
                onClick={() =>
                  navigate("/organizer/events")
                }
                disabled={submitting}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="create-event-submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="create-event-spinner"></span>
                    Creating Event...
                  </>
                ) : (
                  <>
                    <i className="bi bi-plus-lg"></i>
                    Create Event
                  </>
                )}
              </button>
            </section>
          </div>
        </form>
      </main>

      {feedback.open && (
        <div className="create-event-modal-backdrop">
          <div className="create-event-modal">
            <div
              className={`create-event-modal-icon ${feedback.type}`}
            >
              <i
                className={
                  feedback.type === "success"
                    ? "bi bi-check-lg"
                    : "bi bi-exclamation-lg"
                }
              ></i>
            </div>

            <span>
              {feedback.type === "success"
                ? "EVENT CREATED"
                : "SOMETHING WENT WRONG"}
            </span>

            <h2>{feedback.title}</h2>

            <p>{feedback.message}</p>

            <button
              type="button"
              onClick={closeFeedback}
            >
              {feedback.type === "success"
                ? "View My Events"
                : "Try Again"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateEvent;