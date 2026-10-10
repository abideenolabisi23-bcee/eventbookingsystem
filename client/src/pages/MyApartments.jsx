import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  MapPin,
  Plus,
  Eye,
  Pencil,
  Power,
  BedDouble,
  CalendarCheck2
} from "lucide-react";
import "../styles/myApartments.css";

const MyApartments = () => {
  const navigate = useNavigate();

  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchApartments = async () => {
    const token =
      localStorage.getItem("organizerAccessToken");

    if (!token) {
      navigate("/organizer/login");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "https://eventbookingsystem-sooty.vercel.app/api/v1/organizer/apartments",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const result = await response.json();

      if (response.status === 401) {
        localStorage.removeItem(
          "accessToken"
        );

        localStorage.removeItem(
          "refreshToken"
        );

        navigate("/organizer/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
          "Unable to fetch apartments"
        );
      }

      setApartments(result.data || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApartments();
  }, []);

  const toggleAvailability = async (
    apartmentId
  ) => {
    const token =
      localStorage.getItem("organizerAccessToken");

    if (!token) {
      navigate("/organizer/login");
      return;
    }

    try {
      const response = await fetch(
        `https://eventbookingsystem-sooty.vercel.app/api/v1/apartments/${apartmentId}/availability`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const result = await response.json();

      if (response.status === 401) {
        localStorage.removeItem(
          "organizerAccessToken"
        );

        localStorage.removeItem(
          "organizerRefreshToken"
        );

        navigate("/organizer/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
          "Unable to change availability"
        );
      }

      setApartments(
        (currentApartments) =>
          currentApartments.map(
            (apartment) =>
              apartment._id === apartmentId
                ? result.data
                : apartment
          )
      );

      setMessage(result.message);

      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const formatPrice = (price) => {
    return Number(
      price || 0
    ).toLocaleString("en-NG");
  };

  if (loading) {
    return (
      <div className="my-apartments-loading">
        <div className="apartment-loader"></div>

        <p>
          Loading your apartments...
        </p>
      </div>
    );
  }


  return (
    <div className="my-apartments-page">
      <div className="my-apartments-container">

        <button
  type="button"
  onClick={() => navigate("/organizer/dashboard")}
  className="back-dashboard-btn"
>
  ← Back to Dashboard
</button>
        <div className="my-apartments-header">
          <div>
            <span className="apartments-eyebrow">
              Accommodation Management
            </span>

            <h1>My Apartments</h1>

            <p>
              Manage your apartment listings,
              pricing, rooms, bookings and
              availability.
            </p>
          </div>

          <button
            type="button"
            className="add-apartment-button"
            onClick={() =>
              navigate(
                "/organizer/apartments/create"
              )
            }
          >
            <Plus size={19} />
            Add Apartment
          </button>
        </div>

        {message && (
          <div className="apartment-page-message">
            {message}
          </div>
        )}

        <div className="apartment-summary">
          <div className="apartment-summary-card">
            <div className="summary-icon">
              <Building2 size={22} />
            </div>

            <div>
              <span>Total Listings</span>

              <strong>
                {apartments.length}
              </strong>
            </div>
          </div>

          <div className="apartment-summary-card">
            <div className="summary-icon">
              <BedDouble size={22} />
            </div>

            <div>
              <span>Total Rooms</span>

              <strong>
                {apartments.reduce(
                  (
                    total,
                    apartment
                  ) =>
                    total +
                    Number(
                      apartment.totalUnits ||
                      0
                    ),
                  0
                )}
              </strong>
            </div>
          </div>

          <div className="apartment-summary-card">
            <div className="summary-icon">
              <Power size={22} />
            </div>

            <div>
              <span>Active Listings</span>

              <strong>
                {
                  apartments.filter(
                    (apartment) =>
                      apartment.isAvailable
                  ).length
                }
              </strong>
            </div>
          </div>
        </div>

        {apartments.length === 0 ? (
          <div className="empty-apartments">
            <div className="empty-apartment-icon">
              <Building2 size={36} />
            </div>

            <h2>
              No apartments yet
            </h2>

            <p>
              Create your first
              accommodation listing and
              start accepting bookings.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/organizer/apartments/create"
                )
              }
            >
              <Plus size={18} />
              Create Apartment
            </button>
          </div>
        ) : (
          <div className="apartments-grid">
            {apartments.map(
              (apartment) => (
                <article
                  className="organizer-apartment-card"
                  key={apartment._id}
                >
                  <div className="organizer-apartment-image">
                    {apartment.images
                      ?.exterior ? (
                      <img
                        src={
                          apartment.images
                            .exterior
                        }
                        alt={
                          apartment.title
                        }
                      />
                    ) : (
                      <div className="apartment-image-placeholder">
                        <Building2
                          size={38}
                        />

                        <span>
                          No exterior image
                        </span>
                      </div>
                    )}

                    <span
                      className={`apartment-status ${apartment.isAvailable
                        ? "active"
                        : "inactive"
                        }`}
                    >
                      {apartment.isAvailable
                        ? "Available"
                        : "Unavailable"}
                    </span>

                    <span className="apartment-type">
                      {
                        apartment.apartmentType
                      }
                    </span>
                  </div>

                  <div className="organizer-apartment-content">
                    <div className="apartment-title-row">
                      <div>
                        <h2>
                          {apartment.title}
                        </h2>

                        <p className="apartment-location">
                          <MapPin
                            size={15}
                          />

                          {
                            apartment.location
                          }
                        </p>
                      </div>
                    </div>

                    <div className="apartment-card-information">
                      <div>
                        <span>
                          Nightly Rate
                        </span>

                        <strong>
                          ₦
                          {formatPrice(
                            apartment.pricePerNight
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Day Use
                        </span>

                        <strong>
                          ₦
                          {formatPrice(
                            apartment.dayUsePrice
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Total Rooms
                        </span>

                        <strong>
                          {
                            apartment.totalUnits
                          }
                        </strong>
                      </div>
                    </div>

                    <div className="apartment-card-actions">
                      <button
                        type="button"
                        className="apartment-view-button"
                        onClick={() =>
                          navigate(
                            `/organizer/apartments/${apartment._id}`
                          )
                        }
                      >
                        <Eye size={16} />
                        View
                      </button>

                      <button
                        type="button"
                        className="apartment-bookings-button"
                        onClick={() =>
                          navigate(
                            `/organizer/apartments/${apartment._id}/bookings`
                          )
                        }
                      >
                        <CalendarCheck2
                          size={16}
                        />
                        Bookings
                      </button>

                      <button
                        type="button"
                        className="apartment-edit-button"
                        onClick={() =>
                          navigate(
                            `/organizer/apartments/${apartment._id}/edit`
                          )
                        }
                      >
                        <Pencil size={16} />
                        Edit
                      </button>

                      <button
                        type="button"
                        className={`apartment-toggle-button ${apartment.isAvailable
                          ? "disable"
                          : "enable"
                          }`}
                        onClick={() =>
                          toggleAvailability(
                            apartment._id
                          )
                        }
                      >
                        <Power size={16} />

                        {apartment.isAvailable
                          ? "Disable"
                          : "Enable"}
                      </button>
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyApartments;