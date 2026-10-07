import { Link } from "react-router-dom";

const EventCard = ({ event }) => {
  return (
    <div className="card event-card h-100 border-0">
      <div className="event-image-wrapper">
        <img
          src={event.image}
          className="card-img-top event-image"
          alt={event.title}
        />

        <span className="event-category">{event.category}</span>
      </div>

      <div className="card-body p-4">
        <div className="d-flex gap-3">
          <div className="event-date text-center">
            <span className="month">{event.month}</span>
            <strong>{event.day}</strong>
          </div>

          <div>
            <h5 className="fw-bold">{event.title}</h5>

            <p className="text-muted mb-2">
              <i className="bi bi-geo-alt me-1"></i>
              {event.location}
            </p>

            <p className="fw-bold brand-color mb-0">
              From ₦{event.price.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="card-footer bg-white border-0 px-4 pb-4">
        <Link
          to={`/events/${event.id}`}
          className="btn main-btn w-100"
        >
          View Event
        </Link>
      </div>
    </div>
  );
};

export default EventCard;