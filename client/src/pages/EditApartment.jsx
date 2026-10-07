import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
    ArrowLeft,
    Building2,
    MapPin,
    Wallet,
    BedDouble,
    Sparkles,
    Image as ImageIcon,
    Upload,
    X,
    Save,
    CheckCircle2,
    AlertCircle,
    Home,
    Sofa,
    CookingPot,
    Bath,
    Fence,
    Camera
} from "lucide-react";
import "../styles/editApartment.css";

const EditApartment = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [feedback, setFeedback] = useState(null);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        apartmentType: "standard",
        location: "",
        pricePerNight: "",
        dayUsePrice: "",
        totalUnits: "",
        amenities: ""
    });

    const [existingImages, setExistingImages] = useState({
        exterior: "",
        livingRoom: "",
        bedroom: "",
        kitchen: "",
        bathroom: "",
        balcony: ""
    });

    const [newImages, setNewImages] = useState({
        exterior: null,
        livingRoom: null,
        bedroom: null,
        kitchen: null,
        bathroom: null,
        balcony: null
    });

    const imageFields = useMemo(
        () => [
            {
                name: "exterior",
                label: "Exterior",
                description: "Main outside view of the property",
                icon: Building2
            },
            {
                name: "livingRoom",
                label: "Living Room",
                description: "Show the sitting and relaxation area",
                icon: Sofa
            },
            {
                name: "bedroom",
                label: "Bedroom",
                description: "Show the sleeping area and interior",
                icon: BedDouble
            },
            {
                name: "kitchen",
                label: "Kitchen",
                description: "Show the kitchen and cooking space",
                icon: CookingPot
            },
            {
                name: "bathroom",
                label: "Bathroom / Toilet",
                description: "Show the bathroom and toilet area",
                icon: Bath
            },
            {
                name: "balcony",
                label: "Balcony",
                description: "Show the balcony or outdoor view",
                icon: Fence
            }
        ],
        []
    );

    const handleUnauthorized = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("role");
        localStorage.removeItem("firstname");
        localStorage.removeItem("lastname");
        navigate("/organizer/login");
    };

    useEffect(() => {
        const fetchApartment = async () => {
            const token = localStorage.getItem("accessToken");

            if (!token) {
                navigate("/organizer/login");
                return;
            }

            try {
                setLoading(true);
                setError("");

                const response = await axios.get(
                    "http://https://eventbookingsystem-sooty.vercel.app/api/v1/organizer/apartments",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const apartments = response.data.data || [];

                const selectedApartment = apartments.find(
                    (apartment) => apartment._id === id
                );

                if (!selectedApartment) {
                    setError(
                        "This apartment could not be found in your listings."
                    );
                    return;
                }

                setFormData({
                    title: selectedApartment.title || "",
                    description: selectedApartment.description || "",
                    apartmentType:
                        selectedApartment.apartmentType || "standard",
                    location: selectedApartment.location || "",
                    pricePerNight:
                        selectedApartment.pricePerNight ?? "",
                    dayUsePrice:
                        selectedApartment.dayUsePrice ?? "",
                    totalUnits:
                        selectedApartment.totalUnits ?? "",
                    amenities: Array.isArray(
                        selectedApartment.amenities
                    )
                        ? selectedApartment.amenities.join(", ")
                        : ""
                });

                setExistingImages({
                    exterior:
                        selectedApartment.images?.exterior || "",
                    livingRoom:
                        selectedApartment.images?.livingRoom || "",
                    bedroom:
                        selectedApartment.images?.bedroom || "",
                    kitchen:
                        selectedApartment.images?.kitchen || "",
                    bathroom:
                        selectedApartment.images?.bathroom || "",
                    balcony:
                        selectedApartment.images?.balcony || ""
                });
            } catch (error) {
                console.log(
                    "FETCH APARTMENT FOR EDIT ERROR:",
                    error
                );

                if (error.response?.status === 401) {
                    handleUnauthorized();
                    return;
                }

                setError(
                    error.response?.data?.message ||
                    "Cannot load this apartment at this time."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchApartment();
    }, [id]);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((current) => ({
            ...current,
            [name]: value
        }));
    };

    const handleImageChange = (event, imageName) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            setFeedback({
                type: "error",
                message: "Please select a valid image file."
            });
            event.target.value = "";
            return;
        }

        setNewImages((current) => ({
            ...current,
            [imageName]: file
        }));
    };

    const removeNewImage = (imageName) => {
        setNewImages((current) => ({
            ...current,
            [imageName]: null
        }));
    };

    const getImagePreview = (imageName) => {
        if (newImages[imageName]) {
            return URL.createObjectURL(
                newImages[imageName]
            );
        }

        return existingImages[imageName];
    };

    const validateForm = () => {
        if (!formData.title.trim()) {
            return "Apartment title is required.";
        }

        if (!formData.description.trim()) {
            return "Apartment description is required.";
        }

        if (!formData.location.trim()) {
            return "Apartment location is required.";
        }

        if (
            !["budget", "standard", "luxury"].includes(
                formData.apartmentType
            )
        ) {
            return "Please select a valid apartment type.";
        }

        if (
            formData.pricePerNight === "" ||
            Number(formData.pricePerNight) < 0
        ) {
            return "Please enter a valid nightly price.";
        }

        if (
            formData.dayUsePrice === "" ||
            Number(formData.dayUsePrice) < 0
        ) {
            return "Please enter a valid day-use price.";
        }

        if (
            formData.totalUnits === "" ||
            !Number.isInteger(Number(formData.totalUnits)) ||
            Number(formData.totalUnits) < 1
        ) {
            return "Total rooms must be at least 1.";
        }

        return "";
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const validationError = validateForm();

        if (validationError) {
            setFeedback({
                type: "error",
                message: validationError
            });
            return;
        }

        const token = localStorage.getItem("accessToken");

        if (!token) {
            navigate("/organizer/login");
            return;
        }

        try {
            setSaving(true);
            setFeedback(null);

            const data = new FormData();

            data.append("title", formData.title.trim());
            data.append(
                "description",
                formData.description.trim()
            );
            data.append(
                "apartmentType",
                formData.apartmentType
            );
            data.append(
                "location",
                formData.location.trim()
            );
            data.append(
                "pricePerNight",
                formData.pricePerNight
            );
            data.append(
                "dayUsePrice",
                formData.dayUsePrice
            );
            data.append(
                "totalUnits",
                formData.totalUnits
            );

            const amenitiesArray = formData.amenities
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);

            data.append(
                "amenities",
                JSON.stringify(amenitiesArray)
            );

            Object.entries(newImages).forEach(
                ([imageName, file]) => {
                    if (file) {
                        data.append(imageName, file);
                    }
                }
            );

            const response = await axios.put(
                `http://https://eventbookingsystem-sooty.vercel.app/api/v1/apartments/${id}`,
                data,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const updatedApartment =
                response.data.data;

            setExistingImages({
                exterior:
                    updatedApartment.images?.exterior || "",
                livingRoom:
                    updatedApartment.images?.livingRoom || "",
                bedroom:
                    updatedApartment.images?.bedroom || "",
                kitchen:
                    updatedApartment.images?.kitchen || "",
                bathroom:
                    updatedApartment.images?.bathroom || "",
                balcony:
                    updatedApartment.images?.balcony || ""
            });

            setNewImages({
                exterior: null,
                livingRoom: null,
                bedroom: null,
                kitchen: null,
                bathroom: null,
                balcony: null
            });

            setFeedback({
                type: "success",
                message:
                    response.data.message ||
                    "Apartment updated successfully."
            });

            setTimeout(() => {
                navigate("/organizer/apartments");
            }, 1500);
        } catch (error) {
            console.log(
                "UPDATE APARTMENT ERROR:",
                error
            );

            if (error.response?.status === 401) {
                handleUnauthorized();
                return;
            }

            setFeedback({
                type: "error",
                message:
                    error.response?.data?.message ||
                    "Cannot update apartment at this time."
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="edit-apartment-loading">
                <div className="edit-apartment-loader"></div>
                <p>Loading apartment information...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="edit-apartment-error-page">
                <div className="edit-apartment-error-card">
                    <div className="edit-apartment-error-icon">
                        <AlertCircle size={34} />
                    </div>

                    <h2>Unable to edit apartment</h2>
                    <p>{error}</p>

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
        <div className="edit-apartment-page">
            <div className="edit-apartment-container">
                <div className="edit-apartment-topbar">
                    <button
                        type="button"
                        className="edit-apartment-back"
                        onClick={() =>
                            navigate("/organizer/apartments")
                        }
                    >
                        <ArrowLeft size={18} />
                        My Apartments
                    </button>

                    <span className="edit-apartment-status">
                        <span></span>
                        Editing listing
                    </span>
                </div>

                <div className="edit-apartment-heading">
                    <span className="edit-apartment-eyebrow">
                        Accommodation Management
                    </span>

                    <h1>Edit Apartment</h1>

                    <p>
                        Update your property information, pricing,
                        amenities and beautiful accommodation photos.
                    </p>
                </div>

                <form
                    className="edit-apartment-form"
                    onSubmit={handleSubmit}
                >
                    <section className="edit-apartment-section">
                        <div className="edit-section-title">
                            <div className="edit-section-icon">
                                <Home size={22} />
                            </div>

                            <div>
                                <h2>Property Information</h2>
                                <p>
                                    Update the main details customers will
                                    see.
                                </p>
                            </div>
                        </div>

                        <div className="edit-apartment-form-grid">
                            <div className="edit-apartment-field edit-field-full">
                                <label htmlFor="title">
                                    Apartment Title
                                </label>

                                <div className="edit-input-wrapper">
                                    <Building2 size={18} />

                                    <input
                                        id="title"
                                        name="title"
                                        type="text"
                                        value={formData.title}
                                        onChange={handleChange}
                                        placeholder="Apartment title"
                                    />
                                </div>
                            </div>

                            <div className="edit-apartment-field">
                                <label htmlFor="apartmentType">
                                    Apartment Type
                                </label>

                                <select
                                    id="apartmentType"
                                    name="apartmentType"
                                    value={formData.apartmentType}
                                    onChange={handleChange}
                                >
                                    <option value="budget">
                                        Budget
                                    </option>
                                    <option value="standard">
                                        Standard
                                    </option>
                                    <option value="luxury">
                                        Luxury
                                    </option>
                                </select>
                            </div>

                            <div className="edit-apartment-field">
                                <label htmlFor="location">
                                    Location
                                </label>

                                <div className="edit-input-wrapper">
                                    <MapPin size={18} />

                                    <input
                                        id="location"
                                        name="location"
                                        type="text"
                                        value={formData.location}
                                        onChange={handleChange}
                                        placeholder="Lekki, Lagos"
                                    />
                                </div>
                            </div>

                            <div className="edit-apartment-field edit-field-full">
                                <label htmlFor="description">
                                    Description
                                </label>

                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="6"
                                    placeholder="Describe the apartment..."
                                />
                            </div>
                        </div>
                    </section>

                    <section className="edit-apartment-section">
                        <div className="edit-section-title">
                            <div className="edit-section-icon">
                                <Wallet size={22} />
                            </div>

                            <div>
                                <h2>Pricing & Rooms</h2>
                                <p>
                                    Manage rates and the number of available
                                    rooms.
                                </p>
                            </div>
                        </div>

                        <div className="edit-apartment-form-grid edit-pricing-grid">
                            <div className="edit-apartment-field">
                                <label htmlFor="pricePerNight">
                                    Price Per Night
                                </label>

                                <div className="edit-money-input">
                                    <span>₦</span>

                                    <input
                                        id="pricePerNight"
                                        name="pricePerNight"
                                        type="number"
                                        min="0"
                                        value={formData.pricePerNight}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="edit-apartment-field">
                                <label htmlFor="dayUsePrice">
                                    Day Use Price
                                </label>

                                <div className="edit-money-input">
                                    <span>₦</span>

                                    <input
                                        id="dayUsePrice"
                                        name="dayUsePrice"
                                        type="number"
                                        min="0"
                                        value={formData.dayUsePrice}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="edit-apartment-field">
                                <label htmlFor="totalUnits">
                                    Total Rooms
                                </label>

                                <div className="edit-input-wrapper">
                                    <BedDouble size={18} />

                                    <input
                                        id="totalUnits"
                                        name="totalUnits"
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={formData.totalUnits}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="edit-room-warning">
                            <AlertCircle size={18} />

                            <p>
                                If this apartment already has active
                                bookings, the system will prevent you from
                                reducing the room count below the number
                                already committed to guests.
                            </p>
                        </div>
                    </section>

                    <section className="edit-apartment-section">
                        <div className="edit-section-title">
                            <div className="edit-section-icon">
                                <Sparkles size={22} />
                            </div>

                            <div>
                                <h2>Amenities</h2>
                                <p>
                                    Separate each amenity with a comma.
                                </p>
                            </div>
                        </div>

                        <div className="edit-apartment-field">
                            <label htmlFor="amenities">
                                Property Amenities
                            </label>

                            <textarea
                                id="amenities"
                                name="amenities"
                                value={formData.amenities}
                                onChange={handleChange}
                                rows="4"
                                placeholder="WiFi, Air Conditioning, Smart TV, Parking, Swimming Pool"
                            />

                            <small>
                                Example: WiFi, Air Conditioning, Parking,
                                Smart TV
                            </small>
                        </div>

                        {formData.amenities.trim() && (
                            <div className="edit-amenities-preview">
                                {formData.amenities
                                    .split(",")
                                    .map((item) => item.trim())
                                    .filter(Boolean)
                                    .map((amenity, index) => (
                                        <span key={`${amenity}-${index}`}>
                                            <CheckCircle2 size={14} />
                                            {amenity}
                                        </span>
                                    ))}
                            </div>
                        )}
                    </section>

                    <section className="edit-apartment-section">
                        <div className="edit-section-title">
                            <div className="edit-section-icon">
                                <Camera size={22} />
                            </div>

                            <div>
                                <h2>Apartment Photos</h2>
                                <p>
                                    Keep the existing photos or replace any
                                    photo with a new one.
                                </p>
                            </div>
                        </div>

                        <div className="edit-apartment-images-grid">
                            {imageFields.map((imageField) => {
                                const Icon = imageField.icon;
                                const preview = getImagePreview(
                                    imageField.name
                                );
                                const hasNewImage =
                                    Boolean(newImages[imageField.name]);

                                return (
                                    <div
                                        className="edit-apartment-image-card"
                                        key={imageField.name}
                                    >
                                        <div className="edit-image-card-heading">
                                            <div>
                                                <Icon size={18} />

                                                <span>
                                                    {imageField.label}
                                                </span>
                                            </div>

                                            {hasNewImage && (
                                                <span className="new-photo-badge">
                                                    New
                                                </span>
                                            )}
                                        </div>

                                        <div className="edit-image-preview">
                                            {preview ? (
                                                <img
                                                    src={preview}
                                                    alt={imageField.label}
                                                />
                                            ) : (
                                                <div className="edit-image-empty">
                                                    <ImageIcon size={34} />
                                                    <span>No photo</span>
                                                </div>
                                            )}

                                            <label
                                                className="edit-image-upload-overlay"
                                                htmlFor={`image-${imageField.name}`}
                                            >
                                                <Upload size={18} />
                                                {preview
                                                    ? "Replace Photo"
                                                    : "Upload Photo"}
                                            </label>
                                        </div>

                                        <div className="edit-image-card-bottom">
                                            <div>
                                                <strong>
                                                    {imageField.label}
                                                </strong>

                                                <p>
                                                    {imageField.description}
                                                </p>
                                            </div>

                                            {hasNewImage && (
                                                <button
                                                    type="button"
                                                    className="edit-remove-new-image"
                                                    onClick={() =>
                                                        removeNewImage(
                                                            imageField.name
                                                        )
                                                    }
                                                    aria-label={`Remove new ${imageField.label} image`}
                                                >
                                                    <X size={17} />
                                                </button>
                                            )}
                                        </div>

                                        <input
                                            id={`image-${imageField.name}`}
                                            className="edit-image-file-input"
                                            type="file"
                                            accept="image/*"
                                            onChange={(event) =>
                                                handleImageChange(
                                                    event,
                                                    imageField.name
                                                )
                                            }
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <div className="edit-apartment-actions">
                        <button
                            type="button"
                            className="edit-apartment-cancel-button"
                            disabled={saving}
                            onClick={() =>
                                navigate("/organizer/apartments")
                            }
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="edit-apartment-save-button"
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <span className="edit-save-spinner"></span>
                                    Saving Changes...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {feedback && (
                <div className="edit-apartment-feedback-backdrop">
                    <div
                        className={`edit-apartment-feedback ${feedback.type
                            }`}
                    >
                        <button
                            type="button"
                            className="edit-feedback-close"
                            onClick={() => setFeedback(null)}
                        >
                            <X size={19} />
                        </button>

                        <div className="edit-feedback-icon">
                            {feedback.type === "success" ? (
                                <CheckCircle2 size={34} />
                            ) : (
                                <AlertCircle size={34} />
                            )}
                        </div>

                        <h3>
                            {feedback.type === "success"
                                ? "Changes Saved"
                                : "Unable to Save"}
                        </h3>

                        <p>{feedback.message}</p>

                        {feedback.type === "error" && (
                            <button
                                type="button"
                                onClick={() =>
                                    setFeedback(null)
                                }
                            >
                                Try Again
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditApartment;