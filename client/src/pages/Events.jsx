import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../component/Navbar";
import Footer from "../component/Footer";
import "../styles/events.css";

import vibelyLogo from "../assets/vibely-logo.png";
import concertImage from "../assets/concert.jpg";

const Events = () => {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(
          "https://eventbookingsystem-sooty.vercel.app/api/v1/events"
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Unable to fetch events");
        }

        const eventData = Array.isArray(result)
          ? result
          : result.data || [];

        setEvents(eventData);
      } catch (error) {
        console.log(error);
        setError("We couldn't load events right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const searchText = search.trim().toLowerCase();

  const searchResults = searchText
    ? events.filter((event) => {
      return (
        event.title?.toLowerCase().includes(searchText) ||
        event.location?.toLowerCase().includes(searchText) ||
        event.description?.toLowerCase().includes(searchText)
      );
    })
    : [];

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0
    }).format(price || 0);
  };

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const getDay = (date) => {
    if (!date) return "";

    return new Date(date).getDate();
  };

  const getMonth = (date) => {
    if (!date) return "";

    return new Date(date)
      .toLocaleDateString("en-NG", {
        month: "short"
      })
      .toUpperCase();
  };

  const trendingEvents = events.slice(0, 3);

  return (
    <main className="events-page">
      <Navbar />

      <section className="events-hero">
        <div className="hero-left">
          <p className="hero-small-title">EVENTS</p>

          <h1>
            Find something
            <span> worth showing up for.</span>
          </h1>

          <p className="hero-description">
            Concerts, festivals, conferences and unique experiences
            curated for every vibe.
          </p>

          <div className="search-wrapper">
            <div className="events-search">
              <span className="search-icon">⌕</span>

              <input
                type="text"
                placeholder="Search events or locations..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              {search && (
                <button
                  type="button"
                  className="clear-search"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            {searchText && (
              <div className="search-results">
                {searchResults.length > 0 ? (
                  <>
                    <div className="search-results-heading">
                      <span>Search results</span>

                      <span>
                        {searchResults.length}{" "}
                        {searchResults.length === 1
                          ? "event"
                          : "events"}
                      </span>
                    </div>

                    <div className="search-results-list">
                      {searchResults.map((event) => {
                        const soldOut =
                          event.availableTickets === 0;

                        return (
                          <Link
                            to={`/events/${event._id}`}
                            className="search-result-item"
                            key={event._id}
                          >
                            <img
                              src={event.image || concertImage}
                              alt={event.title}
                            />

                            <div className="search-result-details">
                              <h4>{event.title}</h4>

                              <p>
                                <span>⌖</span>
                                {event.location ||
                                  "Location coming soon"}
                              </p>

                              <div className="search-result-meta">
                                <span>
                                  {formatDate(event.date)}
                                </span>

                                <span>
                                  {soldOut
                                    ? "Sold out"
                                    : `${event.availableTickets} tickets left`}
                                </span>
                              </div>
                            </div>

                            <div className="search-result-right">
                              {soldOut ? (
                                <span className="search-sold-out">
                                  SOLD OUT
                                </span>
                              ) : (
                                <strong>
                                  {formatPrice(event.price)}
                                </strong>
                              )}

                              <span className="search-result-arrow">
                                →
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="no-search-result">
                    <span>⌕</span>

                    <div>
                      <h4>No event found</h4>
                      <p>
                        We couldn't find anything matching
                        {" "}
                        <strong>"{search}"</strong>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="hero-image">
          <img src={concertImage} alt="Live event" />

          <a href="#trending" className="hero-arrow">
            →
          </a>
        </div>
      </section>

      <section className="event-listing-section" id="trending">
        <div className="trending-area">
          <div className="section-title-row">
            <h2>Trending events</h2>

            <span>
              {events.length}{" "}
              {events.length === 1 ? "event" : "events"}
            </span>
          </div>

          {loading && (
            <div className="events-status">
              <div className="loader"></div>
              <p>Loading events...</p>
            </div>
          )}

          {error && (
            <div className="events-status">
              <h3>Unable to load events</h3>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && events.length === 0 && (
            <div className="events-status">
              <h3>No events available</h3>
              <p>Check back soon for upcoming experiences.</p>
            </div>
          )}

          {!loading && !error && trendingEvents.length > 0 && (
            <div className="trending-grid">
              {trendingEvents.map((event) => {
                const soldOut = event.availableTickets === 0;

                return (
                  <article className="trending-card" key={event._id}>
                    <div className="trending-image">
                      <img
                        src={event.image || concertImage}
                        alt={event.title}
                      />

                      <div className="date-badge">
                        <span>{getMonth(event.date)}</span>
                        <strong>{getDay(event.date)}</strong>
                      </div>

                      <button
                        className="heart-button"
                        type="button"
                        aria-label="Save event"
                      >
                        ♡
                      </button>

                      {soldOut && (
                        <span className="sold-out-label">
                          SOLD OUT
                        </span>
                      )}
                    </div>

                    <div className="trending-card-body">
                      <p className="card-location">
                        <span>⌖</span>
                        {event.location ||
                          "Location coming soon"}
                      </p>

                      <h3>{event.title}</h3>

                      <p className="card-description">
                        {event.description ||
                          "Discover an unforgettable experience with Vibely."}
                      </p>

                      <div className="card-info">
                        <span>▣ {formatDate(event.date)}</span>

                        <span>
                          {soldOut
                            ? "Sold out"
                            : `${event.availableTickets} tickets left`}
                        </span>
                      </div>

                      <div className="card-bottom">
                        <strong>
                          {formatPrice(event.price)}
                        </strong>

                        <Link to={`/events/${event._id}`}>
                          →
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="all-events-area">
          <div className="all-events-heading">
            <h2>All events</h2>
            <span>By date</span>
          </div>

          <div className="event-list">
            {!loading &&
              !error &&
              events.map((event) => {
                const soldOut =
                  event.availableTickets === 0;

                return (
                  <Link
                    to={`/events/${event._id}`}
                    className="event-list-item"
                    key={event._id}
                  >
                    <div className="list-date">
                      <span>{getMonth(event.date)}</span>
                      <strong>{getDay(event.date)}</strong>
                    </div>

                    <img
                      src={event.image || concertImage}
                      alt={event.title}
                    />

                    <div className="list-event-details">
                      <h4>{event.title}</h4>
                      <p>{event.location}</p>
                    </div>

                    <div className="list-event-price">
                      {soldOut ? (
                        <span className="list-sold-out">
                          Sold out
                        </span>
                      ) : (
                        <strong>
                          {formatPrice(event.price)}
                        </strong>
                      )}
                    </div>

                    <div className="list-arrow">
                      →
                    </div>
                  </Link>
                );
              })}
          </div>
        </aside>
      </section>

      <section className="event-newsletter">
        <div className="newsletter-text">
          <div className="newsletter-icon">✉</div>

          <div>
            <h2>
              Be the first to know about new events.
            </h2>

            <p>
              Get updates on upcoming events, early access and
              exclusive experiences.
            </p>
          </div>
        </div>

        <div className="newsletter-form">
          <input
            type="email"
            placeholder="Your email address"
          />

          <button type="button">
            Get updates
            <span>→</span>
          </button>
        </div>
      </section>

      <Footer />
      {/* <Footer /> */}
      {/* <footer className="events-footer" id="contact">
        <div className="footer-brand-column">
          <div className="footer-brand">
            <img src={vibelyLogo} alt="Vibely" />

            <div>
              <h2>Vibely</h2>
              <span>EVENTS · STAYS · DINING</span>
            </div>
          </div>

          <p>
            Beautiful experiences,
            <br />
            all in one place.
          </p>

          <div className="social-links">
            <a href="#">IG</a>
            <a href="#">X</a>
            <a href="#">FB</a>
            <a href="#">TK</a>
          </div>
        </div>

        <div className="footer-column">
          <h4>Explore</h4>

          <Link to="/events">Events</Link>
          <Link to="/apartments">Stays</Link>
          <Link to="/food">Dining</Link>
        </div>

        <div className="footer-column">
          <h4>Company</h4>

          <a href="/#about">About Us</a>
          <a href="/#contact">Contact</a>
          <a href="#">Careers</a>
        </div>

        <div className="footer-column">
          <h4>Support</h4>

          <a href="#">Help Center</a>
          <a href="#">FAQs</a>
          <a href="#">Terms & Conditions</a>
          <a href="#">Privacy Policy</a>
        </div>

        <div className="footer-column contact-column">
          <h4>Contact Us</h4>

          <p>Lagos, Nigeria</p>
          <p>hello@vibely.com</p>
          <p>+234 810 123 4567</p>
          <p>Mon - Fri, 9:00 AM - 6:00 PM</p>
        </div>

        <div className="footer-vibe">
          Find your vibe.
        </div>
      </footer> */}
    </main>
  );
};

export default Events;