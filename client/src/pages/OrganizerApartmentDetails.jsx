import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  MapPin,
  BedDouble,
  Building2,
  CalendarDays,
  CalendarCheck2,
  Pencil,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Home,
  Bath,
  CookingPot,
  Sofa,
  Fence,
  Images
} from "lucide-react";
import "../styles/organizerApartmentDetails.css";

const OrganizerApartmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [apartment, setApartment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);

  useEffect(() => {
    const fetchApartment = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `http://192.168.0.3:5005/api/v1/apartments/${id}`
        );

        setApartment(response.data.data);
      } catch (error) {
        console.log(
          "ORGANIZER APARTMENT DETAILS ERROR:",
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

  const apartmentImages = useMemo(() => {
    if (!apartment) {
      return [];
    }

    return [
      {
        label: "Exterior",
        src: apartment.images?.exterior,
        icon: Building2
      },
      {
        label: "Living Room",
        src: apartment.images?.livingRoom,
        icon: Sofa
      },
      {
        label: "Bedroom",
        src: apartment.images?.bedroom,
        icon: BedDouble
      },
      {
        label: "Kitchen",
        src: apartment.images?.kitchen,
        icon: CookingPot
      },
      {
        label: "Bathroom",
        src: apartment.images?.bathroom,
        icon: Bath
      },
      {
        label: "Balcony",
        src: apartment.images?.balcony,
        icon: Fence
      },
      {
        label: "Extra View",
        src: apartment.images?.extraView,
        icon: Images
      }
    ].filter((image) => image.src);
  }, [apartment]);

  const formatPrice = (price) => {
    return Number(price || 0).toLocaleString("en-NG");
  };

  const openImage = (index) => {
    setSelectedImageIndex(index);
  };

  const closeImage = () => {
    setSelectedImageIndex(null);
  };

  const showPreviousImage = () => {
    setSelectedImageIndex((currentIndex) => {
      if (currentIndex === null) {
        return null;
      }

      return currentIndex === 0
        ? apartmentImages.length - 1
        : currentIndex - 1;
    });
  };

  const showNextImage = () => {
    setSelectedImageIndex((currentIndex) => {
      if (currentIndex === null) {
        return null;
      }

      return currentIndex === apartmentImages.length - 1
        ? 0
        : currentIndex + 1;
    });
  };

  if (loading) {
    return (
      <div className="organizer-apartment-details-loading">
        <div className="organizer-details-loader"></div>
        <p>Preparing apartment details...</p>
      </div>
    );
  }

  if (error || !apartment) {
    return (
      <div className="organizer-apartment-error-page">
        <div className="organizer-apartment-error-card">
          <div className="organizer-apartment-error-icon">
            <Building2 size={34} />
          </div>

          <h2>Cannot load apartment</h2>

          <p>
            {error || "Apartment information is unavailable."}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/organizer/apartments")
            }
          >
            <ArrowLeft size={18} />
            Back to My Apartments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="organizer-apartment-details-page">
      <div className="organizer-apartment-details-container">
        <div className="organizer-details-navigation">
          <button
            type="button"
            className="organizer-details-back-button"
            onClick={() =>
              navigate("/organizer/apartments")
            }
          >
            <ArrowLeft size={18} />
            My Apartments
          </button>

          <div className="organizer-details-navigation-actions">
            <button
              type="button"
              className="organizer-details-bookings-button"
              onClick={() =>
                navigate(
                  `/organizer/apartments/${apartment._id}/bookings`
                )
              }
            >
              <CalendarCheck2 size={17} />
              Manage Bookings
            </button>

            <button
              type="button"
              className="organizer-details-edit-button"
              onClick={() =>
                navigate(
                  `/organizer/apartments/${apartment._id}/edit`
                )
              }
            >
              <Pencil size={17} />
              Edit Apartment
            </button>
          </div>
        </div>

        <section className="organizer-apartment-hero">
          <div className="organizer-apartment-heading">
            <div className="organizer-apartment-heading-top">
              <span className="organizer-property-label">
                <Home size={15} />
                Accommodation
              </span>

              <span
                className={`organizer-property-status ${apartment.isAvailable
                    ? "available"
                    : "unavailable"
                  }`}
              >
                <span></span>

                {apartment.isAvailable
                  ? "Available"
                  : "Unavailable"}
              </span>
            </div>

            <h1>{apartment.title}</h1>

            <div className="organizer-property-location">
              <MapPin size={18} />
              <span>{apartment.location}</span>
            </div>
          </div>
        </section>

        {apartmentImages.length > 0 ? (
          <section className="organizer-apartment-gallery">
            <button
              type="button"
              className="organizer-gallery-main"
              onClick={() => openImage(0)}
            >
              <img
                src={apartmentImages[0].src}
                alt={apartmentImages[0].label}
              />

              <div className="organizer-gallery-overlay">
                <span>
                  <ImageIcon size={17} />
                  {apartmentImages[0].label}
                </span>
              </div>
            </button>

            <div className="organizer-gallery-side">
              {apartmentImages
                .slice(1, 7)
                .map((image, index) => {
                  const ImageTypeIcon = image.icon;
                  const realIndex = index + 1;

                  return (
                    <button
                      type="button"
                      className="organizer-gallery-small"
                      key={`${image.label}-${realIndex}`}
                      onClick={() =>
                        openImage(realIndex)
                      }
                    >
                      <img
                        src={image.src}
                        alt={image.label}
                      />

                      <div className="organizer-small-image-overlay">
                        <ImageTypeIcon size={15} />
                        <span>{image.label}</span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </section>
        ) : (
          <div className="organizer-no-apartment-images">
            <ImageIcon size={38} />
            <h3>No apartment photos yet</h3>

            <p>
              Add beautiful property photos when editing this
              apartment.
            </p>
          </div>
        )}

        {apartmentImages.length > 0 && (
          <section className="organizer-photo-strip-section">
            <div className="organizer-section-heading">
              <div>
                <span>Property Gallery</span>
                <h2>Explore every space</h2>
              </div>

              <p>
                {apartmentImages.length}{" "}
                {apartmentImages.length === 1
                  ? "property photo"
                  : "property photos"}
              </p>
            </div>

            <div className="organizer-photo-strip">
              {apartmentImages.map((image, index) => {
                const ImageTypeIcon = image.icon;

                return (
                  <button
                    type="button"
                    className="organizer-photo-card"
                    key={`${image.label}-gallery`}
                    onClick={() => openImage(index)}
                  >
                    <div className="organizer-photo-card-image">
                      <img
                        src={image.src}
                        alt={image.label}
                      />
                    </div>

                    <div className="organizer-photo-card-label">
                      <span>
                        <ImageTypeIcon size={16} />
                        {image.label}
                      </span>

                      <ImageIcon size={16} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="organizer-apartment-information">
          <div className="organizer-apartment-main-information">
            <div className="organizer-section-heading details-heading">
              <div>
                <span>About this property</span>
                <h2>Apartment Details</h2>
              </div>
            </div>

            <p className="organizer-apartment-description">
              {apartment.description}
            </p>

            <div className="organizer-property-highlights">
              <div className="organizer-highlight-card">
                <div className="organizer-highlight-icon">
                  <Building2 size={21} />
                </div>

                <div>
                  <span>Property Type</span>
                  <strong>
                    {apartment.apartmentType || "Apartment"}
                  </strong>
                </div>
              </div>

              <div className="organizer-highlight-card">
                <div className="organizer-highlight-icon">
                  <BedDouble size={21} />
                </div>

                <div>
                  <span>Total Rooms</span>
                  <strong>
                    {apartment.totalUnits || 0}
                  </strong>
                </div>
              </div>

              <div className="organizer-highlight-card">
                <div className="organizer-highlight-icon">
                  <CalendarDays size={21} />
                </div>

                <div>
                  <span>Availability</span>

                  <strong>
                    {apartment.isAvailable
                      ? "Accepting bookings"
                      : "Not accepting bookings"}
                  </strong>
                </div>
              </div>
            </div>

            {Array.isArray(apartment.amenities) &&
              apartment.amenities.length > 0 && (
                <div className="organizer-amenities-section">
                  <div className="organizer-section-heading amenities-heading">
                    <div>
                      <span>Included with this stay</span>
                      <h2>Amenities</h2>
                    </div>
                  </div>

                  <div className="organizer-amenities-grid">
                    {apartment.amenities.map(
                      (amenity, index) => (
                        <div
                          className="organizer-amenity-item"
                          key={`${amenity}-${index}`}
                        >
                          <span className="organizer-amenity-dot"></span>
                          <span>{amenity}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
          </div>

          <aside className="organizer-apartment-price-card">
            <span className="organizer-price-card-label">
              Pricing
            </span>

            <div className="organizer-nightly-price">
              <small>From</small>

              <strong>
                ₦{formatPrice(apartment.pricePerNight)}
              </strong>

              <span>/ night</span>
            </div>

            <div className="organizer-price-divider"></div>

            <div className="organizer-price-row">
              <span>Nightly Rate</span>

              <strong>
                ₦{formatPrice(apartment.pricePerNight)}
              </strong>
            </div>

            <div className="organizer-price-row">
              <span>Day Use</span>

              <strong>
                ₦{formatPrice(apartment.dayUsePrice)}
              </strong>
            </div>

            <div className="organizer-price-row">
              <span>Total Rooms</span>

              <strong>{apartment.totalUnits || 0}</strong>
            </div>

            <button
              type="button"
              className="organizer-price-bookings-button"
              onClick={() =>
                navigate(
                  `/organizer/apartments/${apartment._id}/bookings`
                )
              }
            >
              <CalendarCheck2 size={17} />
              Manage Bookings
            </button>

            <button
              type="button"
              className="organizer-price-edit-button"
              onClick={() =>
                navigate(
                  `/organizer/apartments/${apartment._id}/edit`
                )
              }
            >
              <Pencil size={17} />
              Edit Listing
            </button>
          </aside>
        </section>
      </div>

      {selectedImageIndex !== null &&
        apartmentImages[selectedImageIndex] && (
          <div
            className="organizer-image-lightbox"
            onClick={closeImage}
          >
            <button
              className="organizer-lightbox-close"
              onClick={closeImage}
              type="button"
              aria-label="Close image"
            >
              <X size={25} />
            </button>

            {apartmentImages.length > 1 && (
              <button
                className="organizer-lightbox-arrow organizer-lightbox-left"
                onClick={(event) => {
                  event.stopPropagation();
                  showPreviousImage();
                }}
                type="button"
                aria-label="Previous image"
              >
                <ChevronLeft size={28} />
              </button>
            )}

            <div
              className="organizer-lightbox-content"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <img
                src={
                  apartmentImages[selectedImageIndex].src
                }
                alt={
                  apartmentImages[selectedImageIndex].label
                }
              />

              <div className="organizer-lightbox-caption">
                <span>
                  {selectedImageIndex + 1} /{" "}
                  {apartmentImages.length}
                </span>

                <strong>
                  {
                    apartmentImages[selectedImageIndex]
                      .label
                  }
                </strong>
              </div>
            </div>

            {apartmentImages.length > 1 && (
              <button
                className="organizer-lightbox-arrow organizer-lightbox-right"
                onClick={(event) => {
                  event.stopPropagation();
                  showNextImage();
                }}
                type="button"
                aria-label="Next image"
              >
                <ChevronRight size={28} />
              </button>
            )}
          </div>
        )}
    </div>
  );
};

export default OrganizerApartmentDetails;