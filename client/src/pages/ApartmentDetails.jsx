import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams
} from "react-router-dom";
import axios from "axios";
import Navbar from "../component/Navbar";
import DetailFooter from "../component/DetailFooter";
import "../styles/apartmentDetails.css";

const ApartmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [apartment, setApartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] =
    useState(false);

  const [error, setError] = useState("");
  const [bookingError, setBookingError] =
    useState("");

  const [stayType, setStayType] =
    useState("overnight");

  const [checkInDate, setCheckInDate] =
    useState("");

  const [checkOutDate, setCheckOutDate] =
    useState("");

  const [numberOfUnits, setNumberOfUnits] =
    useState(1);

  const [
    expectedCheckInTime,
    setExpectedCheckInTime
  ] = useState("");

  const [selectedImageIndex, setSelectedImageIndex] =
    useState(null);

  useEffect(() => {
    const fetchApartment = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `https://eventbookingsystem-sooty.vercel.app/api/v1/apartments/${id}`
        );

        setApartment(response.data.data);
      } catch (error) {
        console.log(
          "APARTMENT DETAILS ERROR:",
          error
        );

        setError(
          error.response?.data?.message ||
          "Cannot load apartment details."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchApartment();
  }, [id]);

  useEffect(() => {
    if (stayType === "day_use") {
      setCheckOutDate("");
    }
  }, [stayType]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0
    }).format(price || 0);
  };

  const calculateNights = () => {
    if (
      stayType !== "overnight" ||
      !checkInDate ||
      !checkOutDate
    ) {
      return 0;
    }

    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);

    const difference =
      end.getTime() - start.getTime();

    if (difference <= 0) {
      return 0;
    }

    return Math.ceil(
      difference / (1000 * 60 * 60 * 24)
    );
  };

  const calculateTotal = () => {
    if (!apartment) {
      return 0;
    }

    const units = Number(numberOfUnits) || 1;

    if (stayType === "day_use") {
      return (
        (apartment.dayUsePrice || 0) * units
      );
    }

    const nights = calculateNights();

    return (
      (apartment.pricePerNight || 0) *
      nights *
      units
    );
  };

  const handleBooking = async (event) => {
    event.preventDefault();

    setBookingError("");

    const accessToken =
      localStorage.getItem("userAccessToken");

    if (!accessToken) {
      navigate("/login", {
        state: {
          returnTo: `/apartments/${id}`
        }
      });

      return;
    }

    if (!checkInDate) {
      setBookingError(
        "Please select your check-in date."
      );

      return;
    }

    if (
      stayType === "overnight" &&
      !checkOutDate
    ) {
      setBookingError(
        "Please select your check-out date."
      );

      return;
    }

    if (
      stayType === "overnight" &&
      calculateNights() < 1
    ) {
      setBookingError(
        "Check-out date must be after check-in date."
      );

      return;
    }

    if (Number(numberOfUnits) < 1) {
      setBookingError(
        "Please select at least one room."
      );

      return;
    }

    try {
      setBookingLoading(true);

      const bookingResponse =
        await axios.post(
          "https://eventbookingsystem-sooty.vercel.app/api/v1/apartment-bookings",
          {
            apartmentId: apartment._id,
            stayType,
            checkInDate,
            checkOutDate:
              stayType === "overnight"
                ? checkOutDate
                : checkInDate,
            numberOfUnits:
              Number(numberOfUnits),
            expectedCheckInTime:
              expectedCheckInTime ||
              undefined
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );

      const booking =
        bookingResponse.data.data;

      const bookingId =
        booking?._id ||
        booking?.booking?._id;

      if (!bookingId) {
        setBookingError(
          "Booking was created but booking ID was not returned."
        );

        return;
      }

      const paymentResponse =
        await axios.post(
          "https://eventbookingsystem-sooty.vercel.app/api/v1/apartment-payments/initialize",
          {
            bookingId
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );

      const paymentData =
        paymentResponse.data.data;

      const authorizationUrl =
        paymentData?.authorizationUrl ||
        paymentData?.authorization_url;

      if (!authorizationUrl) {
        setBookingError(
          "Payment link was not returned."
        );

        return;
      }

      window.location.href =
        authorizationUrl;
    } catch (error) {
      console.log(
        "APARTMENT BOOKING ERROR:",
        error
      );
if (error.response?.status === 401) {
  localStorage.removeItem("userAccessToken");
  localStorage.removeItem("userRefreshToken");
  localStorage.removeItem("userRole");

  navigate("/login", {
    state: {
      returnTo: `/apartments/${id}`,
      notification: {
        type: "error",
        title: "Session expired",
        message: "Please sign in again to continue your booking."
      }
    }
  });

  return;
}

      setBookingError(
  error.response?.status === 409
    ? "Room occupied"
    : error.response?.data?.message ||
        "Cannot complete apartment booking at this time."
);
    } finally {
      setBookingLoading(false);
    }
  };

  const today = new Date()
    .toISOString()
    .split("T")[0];

  const apartmentImages = apartment
    ? [
      {
        name: "Exterior",
        image: apartment.images?.exterior
      },
      {
        name: "Living Room",
        image: apartment.images?.livingRoom
      },
      {
        name: "Bedroom",
        image: apartment.images?.bedroom
      },
      {
        name: "Kitchen",
        image: apartment.images?.kitchen
      },
      {
        name: "Bathroom",
        image: apartment.images?.bathroom
      },
      {
        name: "Balcony",
        image: apartment.images?.balcony
      },
      {
        name: "Extra View",
        image: apartment.images?.extraView
      }
    ].filter((item) => item.image)
    : [];

  const openImage = (index) => {
    setSelectedImageIndex(index);
  };

  const closeImage = () => {
    setSelectedImageIndex(null);
  };

  const showPreviousImage = () => {
    if (!apartmentImages.length) {
      return;
    }

    setSelectedImageIndex((current) =>
      current === 0
        ? apartmentImages.length - 1
        : current - 1
    );
  };

  const showNextImage = () => {
    if (!apartmentImages.length) {
      return;
    }

    setSelectedImageIndex((current) =>
      current === apartmentImages.length - 1
        ? 0
        : current + 1
    );
  };

  if (loading) {
    return (
      <>
        <Navbar />

        <div className="apartment-details-state">
          <div className="apartment-details-loader"></div>

          <h3>Loading apartment...</h3>
        </div>
      </>
    );
  }

  if (error || !apartment) {
    return (
      <>
        <Navbar />

        <div className="apartment-details-state">
          <div className="details-state-icon">
            <i className="bi bi-house-x"></i>
          </div>

          <h3>Apartment unavailable</h3>

          <p>{error}</p>

          <Link to="/apartments">
            Back to Apartments
          </Link>
        </div>
      </>
    );
  }

  const selectedImage =
    selectedImageIndex !== null
      ? apartmentImages[selectedImageIndex]
      : null;

  return (
    <>
      <Navbar />

      <main className="apartment-details-page">
        <div className="container">
          <div className="apartment-back-row">
            <Link to="/apartments">
              <i className="bi bi-arrow-left"></i>
              Apartments
            </Link>
          </div>

          <section className="apartment-details-header">
            <div>
              <div className="details-type">
                {apartment.apartmentType ||
                  "Apartment"}
              </div>

              <h1>{apartment.title}</h1>

              <div className="details-location">
                <i className="bi bi-geo-alt-fill"></i>
                {apartment.location}
              </div>
            </div>

            <div className="details-header-price">
              <span>From</span>

              <strong>
                {formatPrice(
                  apartment.pricePerNight ||
                  apartment.dayUsePrice
                )}
              </strong>

              <small>
                {apartment.pricePerNight
                  ? "per night"
                  : "day use"}
              </small>
            </div>
          </section>

          <section className="customer-apartment-gallery-section">
            <div className="customer-gallery-heading">
              <div>
                <span>EXPLORE THE SPACE</span>

                <h2>
                  A closer look at your stay
                </h2>
              </div>

              <p>
                Explore the apartment before
                choosing your dates and completing
                your reservation.
              </p>
            </div>

            {apartmentImages.length > 0 ? (
              <div className="customer-apartment-gallery">
                {apartmentImages.map(
                  (item, index) => (
                    <button
                      type="button"
                      className={`customer-gallery-image customer-gallery-image-${index}`}
                      key={item.name}
                      onClick={() =>
                        openImage(index)
                      }
                    >
                      <img
                        src={item.image}
                        alt={`${apartment.title} ${item.name}`}
                      />

                      <div className="customer-gallery-shade"></div>

                      <div className="customer-gallery-name">
                        <span>
                          {String(
                            index + 1
                          ).padStart(2, "0")}
                        </span>

                        <strong>
                          {item.name}
                        </strong>
                      </div>

                      <div className="customer-gallery-expand">
                        <i className="bi bi-arrows-fullscreen"></i>
                      </div>
                    </button>
                  )
                )}
              </div>
            ) : (
              <div className="customer-gallery-empty">
                <i className="bi bi-images"></i>

                <h3>
                  Apartment photos coming soon
                </h3>

                <p>
                  Photos for this apartment have
                  not been added yet.
                </p>
              </div>
            )}
          </section>

          <section className="apartment-details-layout">
            <div className="apartment-information">
              <div className="apartment-information-card">
                <span className="details-small-heading">
                  ABOUT THIS APARTMENT
                </span>

                <h2>
                  A comfortable place for your stay.
                </h2>

                <p>
                  {apartment.description ||
                    "Enjoy a comfortable Vibely apartment with everything you need for your stay."}
                </p>
              </div>

              <div className="apartment-information-card">
                <span className="details-small-heading">
                  STAY OPTIONS
                </span>

                <h2>
                  Choose what works for you
                </h2>

                <div className="stay-option-grid">
                  {apartment.pricePerNight > 0 && (
                    <div className="stay-option-card">
                      <div className="stay-option-icon">
                        <i className="bi bi-moon-stars"></i>
                      </div>

                      <div>
                        <h3>Overnight Stay</h3>

                        <p>
                          Stay for one or more nights.
                        </p>

                        <strong>
                          {formatPrice(
                            apartment.pricePerNight
                          )}

                          <small>
                            {" "}
                            / night
                          </small>
                        </strong>
                      </div>
                    </div>
                  )}

                  {apartment.dayUsePrice > 0 && (
                    <div className="stay-option-card">
                      <div className="stay-option-icon">
                        <i className="bi bi-sun"></i>
                      </div>

                      <div>
                        <h3>Day Use</h3>

                        <p>
                          Enjoy the apartment
                          during the day.
                        </p>

                        <strong>
                          {formatPrice(
                            apartment.dayUsePrice
                          )}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="apartment-information-card">
                <span className="details-small-heading">
                  APARTMENT DETAILS
                </span>

                <h2>Everything you need</h2>

                <div className="apartment-detail-items">
                  {apartment.bedrooms && (
                    <div>
                      <i className="bi bi-door-open"></i>

                      <span>
                        <strong>
                          {apartment.bedrooms}
                        </strong>

                        Bedrooms
                      </span>
                    </div>
                  )}

                  {apartment.maxGuests && (
                    <div>
                      <i className="bi bi-people"></i>

                      <span>
                        <strong>
                          {apartment.maxGuests}
                        </strong>

                        Guests
                      </span>
                    </div>
                  )}

                  {apartment.totalUnits && (
                    <div>
                      <i className="bi bi-building"></i>

                      <span>
                        <strong>{apartment.totalUnits}</strong>
Total Rooms
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="apartment-information-card apartment-amenities-card">
                <span className="details-small-heading">
                  AMENITIES
                </span>

                <h2>Comfort included</h2>

                {apartment.amenities?.length >
                  0 ? (
                  <div className="apartment-amenities-list">
                    {apartment.amenities.map(
                      (amenity, index) => (
                        <div
                          className="apartment-amenity-item"
                          key={`${amenity}-${index}`}
                        >
                          <i className="bi bi-check2"></i>

                          <span>
                            {amenity}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p>
                    No amenities have been added
                    yet.
                  </p>
                )}
              </div>
            </div>

            <aside className="apartment-booking-wrapper">
              <form
                className="apartment-booking-card"
                onSubmit={handleBooking}
              >
                <div className="booking-card-heading">
                  <span>BOOK YOUR STAY</span>

                  <h2>
                    Reserve this apartment
                  </h2>

                  <p>
                    Choose your stay details below.
                  </p>
                </div>

                {apartment.isAvailable ===
                  false && (
                    <div className="apartment-not-available">
                      This apartment is currently
                      unavailable.
                    </div>
                  )}

                <div className="booking-field">
                  <label>Stay Type</label>

                  <div className="stay-type-buttons">
                    <button
                      type="button"
                      className={
                        stayType === "overnight"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setStayType(
                          "overnight"
                        )
                      }
                    >
                      <i className="bi bi-moon-stars"></i>
                      Overnight
                    </button>

                    <button
                      type="button"
                      className={
                        stayType === "day_use"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setStayType(
                          "day_use"
                        )
                      }
                    >
                      <i className="bi bi-sun"></i>
                      Day Use
                    </button>
                  </div>
                </div>

                <div className="booking-date-grid">
                  <div className="booking-field">
                    <label>Check-in</label>

                    <input
                      type="date"
                      min={today}
                      value={checkInDate}
                      onChange={(event) =>
                        setCheckInDate(
                          event.target.value
                        )
                      }
                    />
                  </div>

                  {stayType ===
                    "overnight" && (
                      <div className="booking-field">
                        <label>Check-out</label>

                        <input
                          type="date"
                          min={
                            checkInDate ||
                            today
                          }
                          value={checkOutDate}
                          onChange={(event) =>
                            setCheckOutDate(
                              event.target.value
                            )
                          }
                        />
                      </div>
                    )}
                </div>

                <div className="booking-field">
                  <label>
                    Expected Check-in Time
                    <span> Optional</span>
                  </label>

                  <input
                    type="time"
                    value={
                      expectedCheckInTime
                    }
                    onChange={(event) =>
                      setExpectedCheckInTime(
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="booking-field">
                  <label>
                    Number of Rooms
                  </label>

                  <div className="unit-selector">
                    <button
                      type="button"
                      onClick={() =>
                        setNumberOfUnits(
                          (current) =>
                            Math.max(
                              1,
                              Number(
                                current
                              ) - 1
                            )
                        )
                      }
                    >
                      −
                    </button>

                    <span>
                      {numberOfUnits}
                    </span>

                    <button
  type="button"
  onClick={() =>
    setNumberOfUnits((current) =>
      Math.min(
        apartment.totalUnits,
        Number(current) + 1
      )
    )
  }
>
  +
</button>
                  </div>
                </div>

                <div className="booking-summary">
                  <div>
                    <span>Stay</span>

                    <strong>
                      {stayType ===
                        "overnight"
                        ? "Overnight"
                        : "Day Use"}
                    </strong>
                  </div>

                  {stayType ===
                    "overnight" &&
                    calculateNights() > 0 && (
                      <div>
                        <span>Nights</span>

                        <strong>
                          {calculateNights()}
                        </strong>
                      </div>
                    )}

                  <div>
                    <span>Rooms</span>

                    <strong>
                      {numberOfUnits}
                    </strong>
                  </div>

                  <div className="booking-total">
                    <span>
                      Estimated Total
                    </span>

                    <strong>
                      {formatPrice(
                        calculateTotal()
                      )}
                    </strong>
                  </div>
                </div>

                {bookingError && (
                  <div className="apartment-booking-error">
                    <i className="bi bi-exclamation-circle"></i>
                    {bookingError}
                  </div>
                )}

                <button
                  type="submit"
                  className="book-apartment-button"
                  disabled={
                    bookingLoading ||
                    apartment.isAvailable ===
                    false
                  }
                >
                  {bookingLoading ? (
                    <>
                      <span className="booking-button-loader"></span>
                      Processing...
                    </>
                  ) : apartment.isAvailable ===
                    false ? (
                    "Currently Unavailable"
                  ) : (
                    <>
                      Continue to Payment
                      <i className="bi bi-arrow-right"></i>
                    </>
                  )}
                </button>

                <p className="booking-security">
                  <i className="bi bi-shield-check"></i>
                  Secure booking and payment
                </p>
              </form>
            </aside>
          </section>
        </div>
      </main>

      <DetailFooter />

      {selectedImage && (
        <div
          className="apartment-lightbox"
          onClick={closeImage}
        >
          <button
            type="button"
            className="lightbox-close"
            onClick={closeImage}
            aria-label="Close gallery"
          >
            <i className="bi bi-x-lg"></i>
          </button>

          {apartmentImages.length > 1 && (
            <button
              type="button"
              className="lightbox-arrow lightbox-arrow-left"
              onClick={(event) => {
                event.stopPropagation();
                showPreviousImage();
              }}
              aria-label="Previous image"
            >
              <i className="bi bi-chevron-left"></i>
            </button>
          )}

          <div
            className="lightbox-content"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <img
              src={selectedImage.image}
              alt={`${apartment.title} ${selectedImage.name}`}
            />

            <div className="lightbox-caption">
              <div>
                <span>
                  {String(
                    selectedImageIndex + 1
                  ).padStart(2, "0")}{" "}
                  /{" "}
                  {String(
                    apartmentImages.length
                  ).padStart(2, "0")}
                </span>

                <strong>
                  {selectedImage.name}
                </strong>
              </div>

              <p>{apartment.title}</p>
            </div>
          </div>

          {apartmentImages.length > 1 && (
            <button
              type="button"
              className="lightbox-arrow lightbox-arrow-right"
              onClick={(event) => {
                event.stopPropagation();
                showNextImage();
              }}
              aria-label="Next image"
            >
              <i className="bi bi-chevron-right"></i>
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default ApartmentDetails;