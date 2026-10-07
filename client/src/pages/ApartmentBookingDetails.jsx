import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import axios from "axios";
import Navbar from "../component/Navbar";
import "../styles/apartmentBookingDetails.css";

function ApartmentBookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBooking = async () => {
      const accessToken =
        localStorage.getItem("accessToken");

      if (!accessToken) {
        navigate("/login", {
          state: {
            returnTo: `/my-apartment-bookings/${id}`,
          },
        });

        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `https://eventbookingsystem-sooty.vercel.app/api/v1/apartment-bookings/${id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        setBooking(response.data.data);
      } catch (error) {
        if (error.response?.status === 401) {
          navigate("/login", {
            state: {
              returnTo: `/my-apartment-bookings/${id}`,
            },
          });

          return;
        }

        setError(
          error.response?.data?.message ||
          "Cannot fetch this apartment booking."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [id, navigate]);

  const formatMoney = (amount) => {
    return `₦${Number(
      amount || 0
    ).toLocaleString()}`;
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString(
      "en-NG",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  };

  const formatStatus = (status) => {
    if (!status) return "—";

    return status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  if (loading) {
    return (
      <>
        <Navbar />

        <main className="apartment-booking-detail-page">
          <div className="apartment-detail-state">
            <div className="apartment-detail-loader"></div>

            <h2>Loading your booking</h2>

            <p>
              Please wait while we prepare your
              apartment reservation.
            </p>
          </div>
        </main>
      </>
    );
  }

  if (error || !booking) {
    return (
      <>
        <Navbar />

        <main className="apartment-booking-detail-page">
          <div className="apartment-detail-state apartment-detail-error">
            <div className="apartment-detail-error-icon">
              <i className="bi bi-exclamation-circle"></i>
            </div>

            <h2>Booking unavailable</h2>

            <p>
              {error ||
                "This apartment booking could not be found."}
            </p>

            <Link
              to="/my-apartment-bookings"
              className="apartment-primary-button"
            >
              Back to My Bookings
            </Link>
          </div>
        </main>
      </>
    );
  }

  const apartment = booking.apartment;

  const apartmentImage =
    apartment?.images?.exterior ||
    apartment?.images?.livingRoom ||
    apartment?.images?.bedroom ||
    apartment?.image ||
    apartment?.imageUrl;

  const canViewTicket =
    booking.bookingStatus === "confirmed" &&
    booking.paymentStatus === "paid";

  return (
    <>
      <Navbar />

      <main className="apartment-booking-detail-page">
        <div className="apartment-booking-detail-container">
          <div className="apartment-detail-back">
            <Link to="/my-apartment-bookings">
              <i className="bi bi-arrow-left"></i>
              My Apartment Bookings
            </Link>
          </div>

          <section className="apartment-detail-hero">
            <div className="apartment-detail-hero-content">
              <span className="apartment-detail-eyebrow">
                APARTMENT BOOKING
              </span>

              <h1>
                {apartment?.title ||
                  "Your Apartment Booking"}
              </h1>

              <div className="apartment-booking-reference">
                <span>Booking reference</span>

                <strong>
                  {booking.bookingReference}
                </strong>
              </div>
            </div>

            <div className="apartment-detail-status-group">
              <span
                className={`apartment-detail-status ${booking.bookingStatus}`}
              >
                {formatStatus(
                  booking.bookingStatus
                )}
              </span>

              <span
                className={`apartment-detail-status ${booking.paymentStatus}`}
              >
                {formatStatus(
                  booking.paymentStatus
                )}
              </span>
            </div>
          </section>

          <div className="apartment-detail-layout">
            <section className="apartment-detail-main-card">
              {apartmentImage && (
                <div className="apartment-detail-image">
                  <img
                    src={apartmentImage}
                    alt={
                      apartment?.title ||
                      "Apartment"
                    }
                  />

                  <div className="apartment-detail-image-badge">
                    <i className="bi bi-house-heart"></i>
                    Your stay
                  </div>
                </div>
              )}

              <div className="apartment-detail-main-content">
                <div className="apartment-detail-heading">
                  <span>YOUR APARTMENT</span>

                  <h2>
                    {apartment?.title ||
                      "Apartment"}
                  </h2>
                </div>

                {apartment?.location && (
                  <p className="apartment-detail-location">
                    <i className="bi bi-geo-alt"></i>

                    {apartment.location}
                  </p>
                )}

                {apartment?.description && (
                  <p className="apartment-detail-description">
                    {apartment.description}
                  </p>
                )}

                {apartment?.amenities?.length >
                  0 && (
                    <div className="apartment-detail-amenities">
                      {apartment.amenities.map(
                        (amenity, index) => (
                          <span key={index}>
                            <i className="bi bi-check2"></i>
                            {amenity}
                          </span>
                        )
                      )}
                    </div>
                  )}

                <div className="apartment-detail-total">
                  <div>
                    <span>Total Amount</span>

                    <p>
                      Your complete reservation
                      payment
                    </p>
                  </div>

                  <strong>
                    {formatMoney(
                      booking.totalAmount
                    )}
                  </strong>
                </div>
              </div>
            </section>

            <aside className="apartment-detail-side-card">
              <div className="apartment-detail-heading">
                <span>BOOKING DETAILS</span>

                <h2>Your stay</h2>
              </div>

              <div className="apartment-detail-information">
                <div className="apartment-detail-information-row">
                  <div className="apartment-information-icon">
                    <i className="bi bi-house-door"></i>
                  </div>

                  <div>
                    <span>Booking Type</span>

                    <strong>
                      {booking.stayType ===
                        "day_use"
                        ? "Day Use"
                        : "Overnight"}
                    </strong>
                  </div>
                </div>

                <div className="apartment-detail-information-row">
                  <div className="apartment-information-icon">
                    <i className="bi bi-calendar-check"></i>
                  </div>

                  <div>
                    <span>Check-in</span>

                    <strong>
                      {formatDate(
                        booking.checkInDate
                      )}
                    </strong>
                  </div>
                </div>

                <div className="apartment-detail-information-row">
                  <div className="apartment-information-icon">
                    <i className="bi bi-calendar-x"></i>
                  </div>

                  <div>
                    <span>Check-out</span>

                    <strong>
                      {formatDate(
                        booking.checkOutDate
                      )}
                    </strong>
                  </div>
                </div>

                {booking.expectedCheckInTime && (
                  <div className="apartment-detail-information-row">
                    <div className="apartment-information-icon">
                      <i className="bi bi-clock"></i>
                    </div>

                    <div>
                      <span>
                        Expected Check-in Time
                      </span>

                      <strong>
                        {
                          booking.expectedCheckInTime
                        }
                      </strong>
                    </div>
                  </div>
                )}

                <div className="apartment-detail-information-row">
                  <div className="apartment-information-icon">
                    <i className="bi bi-door-open"></i>
                  </div>

                  <div>
                    <span>Number of Units</span>

                    <strong>
                      {booking.numberOfUnits}
                    </strong>
                  </div>
                </div>

                {booking.stayType ===
                  "overnight" && (
                    <div className="apartment-detail-information-row">
                      <div className="apartment-information-icon">
                        <i className="bi bi-moon-stars"></i>
                      </div>

                      <div>
                        <span>
                          Number of Nights
                        </span>

                        <strong>
                          {booking.numberOfNights}
                        </strong>
                      </div>
                    </div>
                  )}
              </div>

              <div className="apartment-detail-status-section">
                <div>
                  <span>Booking Status</span>

                  <strong>
                    {formatStatus(
                      booking.bookingStatus
                    )}
                  </strong>
                </div>

                <div>
                  <span>Payment Status</span>

                  <strong>
                    {formatStatus(
                      booking.paymentStatus
                    )}
                  </strong>
                </div>

                <div>
                  <span>Stay Status</span>

                  <strong>
                    {formatStatus(
                      booking.stayStatus
                    )}
                  </strong>
                </div>
              </div>

              <div className="apartment-detail-actions">
                {canViewTicket && (
                  <Link
                    to={`/my-tickets?type=apartment&booking=${booking._id}`}
                    className="view-apartment-ticket-button"
                  >
                    <i className="bi bi-ticket-perforated"></i>

                    <span>
                      View Apartment Ticket
                    </span>

                    <i className="bi bi-arrow-right"></i>
                  </Link>
                )}

                <Link
                  to="/apartments"
                  className="apartment-secondary-button"
                >
                  <i className="bi bi-buildings"></i>
                  Browse Apartments
                </Link>
              </div>

              <div className="apartment-detail-secure">
                <i className="bi bi-shield-check"></i>

                <div>
                  <strong>
                    Secure reservation
                  </strong>

                  <span>
                    Your booking information is
                    protected by Vibely.
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}

export default ApartmentBookingDetails;