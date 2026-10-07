import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../component/Navbar";
import Footer from "../component/Footer";
import "../styles/apartments.css";

const Apartments = () => {
  const [apartments, setApartments] = useState([]);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchApartments = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          "http://192.168.0.3:5005/api/v1/apartments"
        );

        setApartments(response.data.data || []);
      } catch (error) {
        console.log(error);

        setError(
          "We couldn't load the apartments right now."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchApartments();
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0
    }).format(price || 0);
  };

  const apartmentTypes = [
    "all",
    ...new Set(
      apartments
        .map((apartment) => apartment.apartmentType)
        .filter(Boolean)
    )
  ];

  const filteredApartments = apartments.filter(
    (apartment) => {
      const searchValue = search
        .toLowerCase()
        .trim();

      const matchesSearch =
        !searchValue ||
        apartment.title
          ?.toLowerCase()
          .includes(searchValue) ||
        apartment.location
          ?.toLowerCase()
          .includes(searchValue) ||
        apartment.apartmentType
          ?.toLowerCase()
          .includes(searchValue);

      const matchesType =
        activeType === "all" ||
        apartment.apartmentType === activeType;

      return matchesSearch && matchesType;
    }
  );

  return (
    <div className="apartments-page">
      <Navbar />

      <section className="apartments-hero">
        <div className="container apartments-hero-container">
          <div className="apartments-hero-content">
            <span className="apartments-eyebrow">
              VIBELY STAYS
            </span>

            <h1>
              Find a stay you'll
              <span> love coming home to.</span>
            </h1>

            <p>
              Discover thoughtfully selected apartments
              for weekend escapes, business trips,
              celebrations, and everything in between.
            </p>

            <a
              href="#stays"
              className="explore-stays-btn"
            >
              Explore stays

              <i className="fa-solid fa-arrow-down"></i>
            </a>
          </div>

          <div className="apartments-hero-visual">
            <div className="hero-visual-main">
              <div className="hero-image-text">
                <span>CURATED STAYS</span>

                <p>
                  Comfort, style and memorable spaces.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="apartment-search-area">
        <div className="container">
          <div className="apartment-search-box">
            <div className="search-icon">
              <i className="fa-solid fa-magnifying-glass"></i>
            </div>

            <div className="search-input-area">
              <span>
                WHERE DO YOU WANT TO STAY?
              </span>

              <input
                type="text"
                placeholder="Search Lagos, Lekki, apartment..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </div>

            {search && (
              <button
                type="button"
                className="clear-search"
                onClick={() => setSearch("")}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
        </div>
      </section>

      <section
        className="apartments-content"
        id="stays"
      >
        <div className="container">
          <div className="apartments-heading">
            <div>
              <span className="apartments-section-label">
                STAYS
              </span>

              <h2>Places you'll love</h2>

              <p>
                Beautiful spaces selected for comfort,
                style and convenience.
              </p>
            </div>

            {!loading && (
              <span className="apartments-result-count">
                {filteredApartments.length}{" "}
                {filteredApartments.length === 1
                  ? "stay"
                  : "stays"}
              </span>
            )}
          </div>

          {apartmentTypes.length > 1 && (
            <div className="apartment-filters">
              {apartmentTypes.map((type) => (
                <button
                  type="button"
                  key={type}
                  className={`apartment-filter ${activeType === type
                      ? "active"
                      : ""
                    }`}
                  onClick={() =>
                    setActiveType(type)
                  }
                >
                  {type}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="apartments-state">
              <div className="apartment-loader"></div>

              <h3>Finding beautiful stays</h3>

              <p>
                Just a moment while we prepare the
                collection for you.
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="apartments-state">
              <div className="state-icon">
                <i className="fa-solid fa-house"></i>
              </div>

              <h3>
                We couldn't load the stays
              </h3>

              <p>{error}</p>
            </div>
          )}

          {!loading &&
            !error &&
            filteredApartments.length === 0 && (
              <div className="apartments-state">
                <div className="state-icon">
                  <i className="fa-solid fa-magnifying-glass"></i>
                </div>

                <h3>No stays found</h3>

                <p>
                  Try another location, apartment name
                  or category.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setActiveType("all");
                  }}
                >
                  Clear search
                </button>
              </div>
            )}

          {!loading &&
            !error &&
            filteredApartments.length > 0 && (
              <div className="apartments-grid">
                {filteredApartments.map(
                  (apartment) => {
                    const image =
                      apartment.images?.exterior ||
                      apartment.image ||
                      apartment.imageUrl;

                    const price =
                      apartment.pricePerNight ||
                      apartment.dayUsePrice ||
                      0;

                    return (
                      <article
                        className="apartment-card"
                        key={apartment._id}
                      >
                        <Link
                          to={`/apartments/${apartment._id}`}
                          className="apartment-image-wrapper"
                        >
                          {image ? (
                            <img
                              src={image}
                              alt={apartment.title}
                              className="apartment-image"
                            />
                          ) : (
                            <div className="apartment-image-placeholder">
                              <i className="fa-regular fa-image"></i>
                            </div>
                          )}

                          {apartment.apartmentType && (
                            <span className="apartment-type">
                              {
                                apartment.apartmentType
                              }
                            </span>
                          )}

                          <span
                            className={`apartment-availability ${apartment.isAvailable ===
                                false
                                ? "unavailable"
                                : "available"
                              }`}
                          >
                            {apartment.isAvailable ===
                              false
                              ? "Unavailable"
                              : "Available"}
                          </span>
                        </Link>

                        <div className="apartment-card-content">
                          <div className="apartment-title-row">
                            <div>
                              <Link
                                to={`/apartments/${apartment._id}`}
                                className="apartment-title"
                              >
                                {apartment.title}
                              </Link>

                              <p className="apartment-location">
                                <i className="fa-solid fa-location-dot"></i>

                                {apartment.location ||
                                  "Location unavailable"}
                              </p>
                            </div>

                            <Link
                              to={`/apartments/${apartment._id}`}
                              className="apartment-view-icon"
                              aria-label={`View ${apartment.title}`}
                            >
                              <i className="fa-solid fa-arrow-up-right-from-square"></i>
                            </Link>
                          </div>

                          <div className="apartment-details">
                            {apartment.bedrooms !==
                              undefined && (
                                <span>
                                  <i className="fa-solid fa-bed"></i>

                                  {apartment.bedrooms}{" "}
                                  {apartment.bedrooms === 1
                                    ? "bedroom"
                                    : "bedrooms"}
                                </span>
                              )}

                            {apartment.maxGuests !==
                              undefined && (
                                <span>
                                  <i className="fa-regular fa-user"></i>

                                  {apartment.maxGuests}{" "}
                                  guests
                                </span>
                              )}
                          </div>

                          <div className="apartment-card-bottom">
                            <div className="apartment-price">
                              <strong>
                                {formatPrice(price)}
                              </strong>

                              <span>/ night</span>
                            </div>

                            <Link
                              to={`/apartments/${apartment._id}`}
                              className="view-stay-link"
                            >
                              View stay

                              <i className="fa-solid fa-arrow-right"></i>
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Apartments;