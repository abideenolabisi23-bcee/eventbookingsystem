import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import vibelyLogo from "../assets/vibely-logo.png";

import "../styles/adminApartments.css";

const AdminApartments = () => {
    const navigate = useNavigate();

    const [apartments, setApartments] = useState([]);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [availabilityFilter, setAvailabilityFilter] =
        useState("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedApartment, setSelectedApartment] =
        useState(null);
    const [apartmentBookings, setApartmentBookings] =
        useState(null);
    const [detailsLoading, setDetailsLoading] =
        useState(false);
    const [actionLoading, setActionLoading] =
        useState("");
    const [confirmAction, setConfirmAction] =
        useState(null);
    const [feedback, setFeedback] = useState({
        show: false,
        type: "success",
        title: "",
        message: "",
    });

    const getToken = () => {
        return localStorage.getItem("accessToken");
    };

    const handleUnauthorized = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("role");
        navigate("/admin/login");
    };

    const fetchApartments = async () => {
        const accessToken = getToken();

        if (!accessToken) {
            handleUnauthorized();
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await axios.get(
                "https://eventbookingsystem-sooty.vercel.app/api/v1/admin/apartments",
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            setApartments(
                Array.isArray(response.data?.data)
                    ? response.data.data
                    : []
            );
        } catch (error) {
            console.log("ADMIN APARTMENTS ERROR:", error);

            if (
                error.response?.status === 401 ||
                error.response?.status === 403
            ) {
                handleUnauthorized();
                return;
            }

            setError(
                error.response?.data?.message ||
                "Unable to load apartment listings."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApartments();
    }, []);

    const filteredApartments = useMemo(() => {
        return apartments.filter((apartment) => {
            const text = `${apartment.title || ""} ${apartment.location || ""
                } ${apartment.createdBy?.businessName || ""} ${apartment.createdBy?.firstname || ""
                } ${apartment.createdBy?.lastname || ""
                }`.toLowerCase();

            const typeMatch =
                typeFilter === "all" ||
                apartment.apartmentType === typeFilter;

            const availabilityMatch =
                availabilityFilter === "all" ||
                (availabilityFilter === "available" &&
                    apartment.isAvailable) ||
                (availabilityFilter === "unavailable" &&
                    !apartment.isAvailable);

            return (
                text.includes(search.trim().toLowerCase()) &&
                typeMatch &&
                availabilityMatch
            );
        });
    }, [
        apartments,
        search,
        typeFilter,
        availabilityFilter,
    ]);

    const availableCount = useMemo(() => {
        return apartments.filter(
            (apartment) => apartment.isAvailable
        ).length;
    }, [apartments]);

    const unavailableCount = useMemo(() => {
        return apartments.filter(
            (apartment) => !apartment.isAvailable
        ).length;
    }, [apartments]);

    const totalUnits = useMemo(() => {
        return apartments.reduce(
            (total, apartment) =>
                total + Number(apartment.totalUnits || 0),
            0
        );
    }, [apartments]);

    const budgetCount = useMemo(() => {
        return apartments.filter(
            (apartment) =>
                apartment.apartmentType === "budget"
        ).length;
    }, [apartments]);

    const standardCount = useMemo(() => {
        return apartments.filter(
            (apartment) =>
                apartment.apartmentType === "standard"
        ).length;
    }, [apartments]);

    const luxuryCount = useMemo(() => {
        return apartments.filter(
            (apartment) =>
                apartment.apartmentType === "luxury"
        ).length;
    }, [apartments]);

    const formatCurrency = (amount) => {
        return `₦${Number(amount || 0).toLocaleString(
            "en-NG"
        )}`;
    };

    const getProviderName = (apartment) => {
        if (apartment.createdBy?.businessName) {
            return apartment.createdBy.businessName;
        }

        const fullName = `${apartment.createdBy?.firstname || ""
            } ${apartment.createdBy?.lastname || ""
            }`.trim();

        return fullName || "—";
    };

    const openApartmentDetails = async (
        apartmentId
    ) => {
        const accessToken = getToken();

        if (!accessToken) {
            handleUnauthorized();
            return;
        }

        try {
            setDetailsLoading(true);

            const response = await axios.get(
                `https://eventbookingsystem-sooty.vercel.app/api/v1/admin/apartments/${apartmentId}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            setSelectedApartment(
                response.data?.data?.apartment || null
            );

            setApartmentBookings(
                response.data?.data?.totalBookings ?? 0
            );
        } catch (error) {
            if (
                error.response?.status === 401 ||
                error.response?.status === 403
            ) {
                handleUnauthorized();
                return;
            }

            setFeedback({
                show: true,
                type: "error",
                title: "Unable to open apartment",
                message:
                    error.response?.data?.message ||
                    "The apartment details could not be loaded.",
            });
        } finally {
            setDetailsLoading(false);
        }
    };

    const runApartmentAction = async () => {
        if (!confirmAction?.apartment) {
            return;
        }

        const accessToken = getToken();

        if (!accessToken) {
            handleUnauthorized();
            return;
        }

        const apartment = confirmAction.apartment;
        const action = confirmAction.action;

        try {
            setActionLoading(apartment._id);

            const response = await axios.patch(
                `https://eventbookingsystem-sooty.vercel.app/api/v1/admin/apartments/${apartment._id}/${action}`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            const newAvailability =
                action === "enable";

            setApartments((currentApartments) =>
                currentApartments.map(
                    (currentApartment) =>
                        currentApartment._id ===
                            apartment._id
                            ? {
                                ...currentApartment,
                                isAvailable:
                                    newAvailability,
                            }
                            : currentApartment
                )
            );

            if (
                selectedApartment?._id === apartment._id
            ) {
                setSelectedApartment(
                    (currentApartment) => ({
                        ...currentApartment,
                        isAvailable: newAvailability,
                    })
                );
            }

            setConfirmAction(null);

            setFeedback({
                show: true,
                type: "success",
                title:
                    action === "disable"
                        ? "Apartment disabled"
                        : "Apartment restored",
                message:
                    response.data?.message ||
                    (action === "disable"
                        ? "The apartment listing has been disabled successfully."
                        : "The apartment listing has been enabled successfully."),
            });
        } catch (error) {
            if (
                error.response?.status === 401 ||
                error.response?.status === 403
            ) {
                handleUnauthorized();
                return;
            }

            setConfirmAction(null);

            setFeedback({
                show: true,
                type: "error",
                title: "Action unsuccessful",
                message:
                    error.response?.data?.message ||
                    "The apartment status could not be changed.",
            });
        } finally {
            setActionLoading("");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("role");
        navigate("/navigate/login");
    };

    return (
        <div className="admin-apartments-page">
            <aside className="admin-apartments-sidebar">
                <div className="admin-apartments-brand">
                    <div className="admin-apartments-logo">
                        <img src={vibelyLogo} alt="Vibely Logo" />
                    </div>

                    <section>
                        <strong>VIBELY</strong>
                        <span>ADMINISTRATION</span>
                    </section>
                </div>

                <nav>
                    <p>OVERVIEW</p>

                    <Link to="/admin/dashboard">
                        <i className="bi bi-grid-1x2"></i>
                        Dashboard
                    </Link>

                    <p>MANAGEMENT</p>

                    <Link to="/admin/users">
                        <i className="bi bi-people"></i>
                        Users
                    </Link>

                    <Link to="/admin/providers">
                        <i className="bi bi-person-badge"></i>
                        Providers
                    </Link>

                    <Link to="/admin/events">
                        <i className="bi bi-calendar-event"></i>
                        Events
                    </Link>

                    <Link
                        className="active"
                        to="/admin/apartments"
                    >
                        <i className="bi bi-buildings"></i>
                        Apartments
                    </Link>

                    <Link to="/admin/food">
                        <i className="bi bi-basket"></i>
                        Food & Orders
                    </Link>

                    <p>BUSINESS</p>

                    <Link to="/admin/bookings">
                        <i className="bi bi-ticket-perforated"></i>
                        Bookings
                    </Link>

                    <Link to="/admin/payments">
                        <i className="bi bi-credit-card"></i>
                        Payments
                    </Link>

                    <p>ACCOUNT</p>

                    <Link to="/admin/notifications">
                        <i className="bi bi-bell"></i>
                        Notifications
                    </Link>

                    <Link to="/admin/settings">
                        <i className="bi bi-gear"></i>
                        Settings
                    </Link>
                </nav>

                <div className="admin-apartments-sidebar-bottom">
                    <div className="admin-apartments-mini-profile">
                        <div>A</div>

                        <section>
                            <strong>Vibely Admin</strong>
                            <span>Administrator</span>
                        </section>
                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                    >
                        <i className="bi bi-box-arrow-right"></i>
                        Logout
                    </button>
                </div>
            </aside>

            <main className="admin-apartments-main">
                <header className="admin-apartments-header">
                    <div>
                        <span>
                            ACCOMMODATION MANAGEMENT
                        </span>
                        <h1>Apartments</h1>
                    </div>

                    <div className="admin-apartments-header-user">
                        <Link to="/admin/notifications">
                            <i className="bi bi-bell"></i>
                        </Link>

                        <div>
                            <span>A</span>

                            <section>
                                <strong>Administrator</strong>
                                <small>Super Admin</small>
                            </section>
                        </div>
                    </div>
                </header>

                <div className="admin-apartments-content">
                    <section className="admin-apartments-hero">
                        <div>
                            <span>VIBELY STAYS</span>

                            <h2>
                                Manage accommodation across the
                                platform.
                            </h2>

                            <p>
                                Oversee Budget, Standard and Luxury
                                apartment listings, provider inventory,
                                availability and accommodation activity.
                            </p>
                        </div>

                        <div className="admin-apartments-hero-art">
                            <i className="bi bi-buildings"></i>
                            <span>ACCOMMODATION</span>
                            <strong>
                                {apartments.length} Listings
                            </strong>
                        </div>
                    </section>

                    <section className="admin-apartments-stats">
                        <article>
                            <i className="bi bi-buildings"></i>

                            <div>
                                <span>TOTAL LISTINGS</span>
                                <strong>
                                    {apartments.length}
                                </strong>
                            </div>
                        </article>

                        <article>
                            <i className="bi bi-house-check"></i>

                            <div>
                                <span>AVAILABLE</span>
                                <strong>{availableCount}</strong>
                            </div>
                        </article>

                        <article>
                            <i className="bi bi-door-open"></i>

                            <div>
                                <span>TOTAL UNITS</span>
                                <strong>{totalUnits}</strong>
                            </div>
                        </article>

                        <article>
                            <i className="bi bi-house-slash"></i>

                            <div>
                                <span>UNAVAILABLE</span>
                                <strong>{unavailableCount}</strong>
                            </div>
                        </article>
                    </section>

                    <section className="admin-apartments-types">
                        <article>
                            <div>
                                <i className="bi bi-house"></i>
                            </div>

                            <section>
                                <span>BUDGET</span>
                                <strong>Budget Stays</strong>
                                <p>
                                    Affordable accommodation listings
                                </p>
                            </section>

                            <strong>{budgetCount}</strong>
                        </article>

                        <article>
                            <div>
                                <i className="bi bi-house-door"></i>
                            </div>

                            <section>
                                <span>STANDARD</span>
                                <strong>Standard Stays</strong>
                                <p>
                                    Comfort-focused accommodation
                                </p>
                            </section>

                            <strong>{standardCount}</strong>
                        </article>

                        <article>
                            <div>
                                <i className="bi bi-stars"></i>
                            </div>

                            <section>
                                <span>LUXURY</span>
                                <strong>Luxury Stays</strong>
                                <p>
                                    Premium Vibely accommodation
                                </p>
                            </section>

                            <strong>{luxuryCount}</strong>
                        </article>
                    </section>

                    <section className="admin-apartments-panel">
                        <div className="admin-apartments-panel-heading">
                            <div>
                                <span>LISTING DIRECTORY</span>
                                <h3>All apartments</h3>
                            </div>

                            <button
                                type="button"
                                onClick={fetchApartments}
                                disabled={loading}
                            >
                                <i
                                    className={`bi ${loading
                                        ? "bi-arrow-repeat"
                                        : "bi-arrow-clockwise"
                                        }`}
                                ></i>

                                {loading
                                    ? "Loading..."
                                    : "Refresh"}
                            </button>
                        </div>

                        <div className="admin-apartments-toolbar">
                            <div className="admin-apartments-search">
                                <i className="bi bi-search"></i>

                                <input
                                    type="text"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search apartment, provider or location..."
                                />
                            </div>

                            <div className="admin-apartments-type-filter">
                                {[
                                    "all",
                                    "budget",
                                    "standard",
                                    "luxury",
                                ].map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        className={
                                            typeFilter === type
                                                ? "active"
                                                : ""
                                        }
                                        onClick={() =>
                                            setTypeFilter(type)
                                        }
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>

                            <select
                                value={availabilityFilter}
                                onChange={(event) =>
                                    setAvailabilityFilter(
                                        event.target.value
                                    )
                                }
                            >
                                <option value="all">
                                    All availability
                                </option>

                                <option value="available">
                                    Available
                                </option>

                                <option value="unavailable">
                                    Unavailable
                                </option>
                            </select>
                        </div>

                        {loading ? (
                            <div className="admin-apartments-empty">
                                <div>
                                    <i className="bi bi-arrow-repeat"></i>
                                </div>

                                <span>LOADING</span>

                                <h3>
                                    Fetching apartment listings
                                </h3>

                                <p>
                                    Please wait while Vibely loads
                                    accommodation from every provider.
                                </p>
                            </div>
                        ) : error ? (
                            <div className="admin-apartments-empty">
                                <div>
                                    <i className="bi bi-exclamation-circle"></i>
                                </div>

                                <span>UNAVAILABLE</span>

                                <h3>
                                    Unable to load apartments
                                </h3>

                                <p>{error}</p>

                                <button
                                    type="button"
                                    onClick={fetchApartments}
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : filteredApartments.length === 0 ? (
                            <div className="admin-apartments-empty">
                                <div>
                                    <i className="bi bi-building"></i>
                                </div>

                                <span>APARTMENT DATA</span>

                                <h3>
                                    {apartments.length === 0
                                        ? "No accommodation listings yet"
                                        : "No matching apartments"}
                                </h3>

                                <p>
                                    {apartments.length === 0
                                        ? "Apartment listings created by providers will appear here."
                                        : "No apartment matches your current search or filters."}
                                </p>

                                <div className="admin-apartments-empty-features">
                                    <section>
                                        <i className="bi bi-images"></i>
                                        <strong>Listings</strong>
                                        <small>
                                            Review properties
                                        </small>
                                    </section>

                                    <section>
                                        <i className="bi bi-door-open"></i>
                                        <strong>Inventory</strong>
                                        <small>Monitor units</small>
                                    </section>

                                    <section>
                                        <i className="bi bi-calendar-check"></i>
                                        <strong>Bookings</strong>
                                        <small>Track stays</small>
                                    </section>
                                </div>
                            </div>
                        ) : (
                            <div className="admin-apartments-table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Apartment</th>
                                            <th>Provider</th>
                                            <th>Type</th>
                                            <th>Location</th>
                                            <th>Units</th>
                                            <th>Night</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredApartments.map(
                                            (apartment) => (
                                                <tr key={apartment._id}>
                                                    <td>
                                                        <div className="admin-apartment-name">
                                                            <div>
                                                                {apartment.images
                                                                    ?.exterior ? (
                                                                    <img
                                                                        src={
                                                                            apartment
                                                                                .images
                                                                                .exterior
                                                                        }
                                                                        alt={
                                                                            apartment.title
                                                                        }
                                                                    />
                                                                ) : (
                                                                    <i className="bi bi-building"></i>
                                                                )}
                                                            </div>

                                                            <section>
                                                                <strong>
                                                                    {apartment.title}
                                                                </strong>

                                                                <span>
                                                                    Day use{" "}
                                                                    {formatCurrency(
                                                                        apartment.dayUsePrice
                                                                    )}
                                                                </span>
                                                            </section>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <div className="admin-apartment-provider">
                                                            <strong>
                                                                {getProviderName(
                                                                    apartment
                                                                )}
                                                            </strong>

                                                            <span>
                                                                {apartment.createdBy
                                                                    ?.email || "—"}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <span className="admin-apartment-type">
                                                            {apartment.apartmentType ||
                                                                "—"}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        {apartment.location ||
                                                            "—"}
                                                    </td>

                                                    <td>
                                                        {apartment.totalUnits ??
                                                            "—"}
                                                    </td>

                                                    <td>
                                                        {formatCurrency(
                                                            apartment.pricePerNight
                                                        )}
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`admin-apartment-status ${apartment.isAvailable
                                                                ? "available"
                                                                : "unavailable"
                                                                }`}
                                                        >
                                                            {apartment.isAvailable
                                                                ? "Available"
                                                                : "Unavailable"}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="admin-apartment-actions">
                                                            <button
                                                                type="button"
                                                                className="view"
                                                                disabled={
                                                                    detailsLoading
                                                                }
                                                                onClick={() =>
                                                                    openApartmentDetails(
                                                                        apartment._id
                                                                    )
                                                                }
                                                            >
                                                                View
                                                            </button>

                                                            {apartment.isAvailable ? (
                                                                <button
                                                                    type="button"
                                                                    className="disable"
                                                                    title="Disable apartment"
                                                                    disabled={
                                                                        actionLoading ===
                                                                        apartment._id
                                                                    }
                                                                    onClick={() =>
                                                                        setConfirmAction({
                                                                            apartment,
                                                                            action:
                                                                                "disable",
                                                                        })
                                                                    }
                                                                >
                                                                    <i className="bi bi-slash-circle"></i>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    className="enable"
                                                                    title="Enable apartment"
                                                                    disabled={
                                                                        actionLoading ===
                                                                        apartment._id
                                                                    }
                                                                    onClick={() =>
                                                                        setConfirmAction({
                                                                            apartment,
                                                                            action:
                                                                                "enable",
                                                                        })
                                                                    }
                                                                >
                                                                    <i className="bi bi-check-circle"></i>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    <section className="admin-apartments-note">
                        <i className="bi bi-shield-check"></i>

                        <div>
                            <strong>
                                Admin accommodation controls
                            </strong>

                            <p>
                                Administrators can inspect apartment
                                listings from every provider and disable
                                or restore availability without deleting
                                the listing.
                            </p>
                        </div>
                    </section>
                </div>
            </main>

            {selectedApartment && (
                <div className="admin-apartments-modal-backdrop">
                    <div className="admin-apartment-details-modal">
                        <button
                            type="button"
                            className="admin-apartment-modal-close"
                            onClick={() => {
                                setSelectedApartment(null);
                                setApartmentBookings(null);
                            }}
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>

                        <div className="admin-apartment-modal-image">
                            {selectedApartment.images?.exterior ? (
                                <img
                                    src={
                                        selectedApartment.images.exterior
                                    }
                                    alt={selectedApartment.title}
                                />
                            ) : (
                                <i className="bi bi-buildings"></i>
                            )}

                            <span
                                className={`admin-apartment-modal-status ${selectedApartment.isAvailable
                                    ? "available"
                                    : "unavailable"
                                    }`}
                            >
                                {selectedApartment.isAvailable
                                    ? "Available"
                                    : "Unavailable"}
                            </span>
                        </div>

                        <span className="admin-apartment-modal-label">
                            APARTMENT DETAILS
                        </span>

                        <h2>{selectedApartment.title}</h2>

                        <p className="admin-apartment-modal-description">
                            {selectedApartment.description ||
                                "No apartment description provided."}
                        </p>

                        <div className="admin-apartment-detail-grid">
                            <article>
                                <span>PROVIDER</span>
                                <strong>
                                    {getProviderName(
                                        selectedApartment
                                    )}
                                </strong>
                            </article>

                            <article>
                                <span>TYPE</span>
                                <strong>
                                    {selectedApartment.apartmentType ||
                                        "—"}
                                </strong>
                            </article>

                            <article>
                                <span>LOCATION</span>
                                <strong>
                                    {selectedApartment.location || "—"}
                                </strong>
                            </article>

                            <article>
                                <span>TOTAL UNITS</span>
                                <strong>
                                    {selectedApartment.totalUnits ??
                                        "—"}
                                </strong>
                            </article>

                            <article>
                                <span>PRICE PER NIGHT</span>
                                <strong>
                                    {formatCurrency(
                                        selectedApartment.pricePerNight
                                    )}
                                </strong>
                            </article>

                            <article>
                                <span>DAY USE PRICE</span>
                                <strong>
                                    {formatCurrency(
                                        selectedApartment.dayUsePrice
                                    )}
                                </strong>
                            </article>

                            <article>
                                <span>TOTAL BOOKINGS</span>
                                <strong>
                                    {apartmentBookings ?? "—"}
                                </strong>
                            </article>

                            <article>
                                <span>STATUS</span>
                                <strong>
                                    {selectedApartment.isAvailable
                                        ? "Available"
                                        : "Unavailable"}
                                </strong>
                            </article>
                        </div>

                        {Array.isArray(
                            selectedApartment.amenities
                        ) &&
                            selectedApartment.amenities.length >
                            0 && (
                                <div className="admin-apartment-amenities">
                                    <span>AMENITIES</span>

                                    <div>
                                        {selectedApartment.amenities.map(
                                            (amenity, index) => (
                                                <small
                                                    key={`${amenity}-${index}`}
                                                >
                                                    <i className="bi bi-check2"></i>
                                                    {amenity}
                                                </small>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}

                        <div className="admin-apartment-modal-footer">
                            <button
                                type="button"
                                className="close"
                                onClick={() => {
                                    setSelectedApartment(null);
                                    setApartmentBookings(null);
                                }}
                            >
                                Close
                            </button>

                            {selectedApartment.isAvailable ? (
                                <button
                                    type="button"
                                    className="disable"
                                    onClick={() =>
                                        setConfirmAction({
                                            apartment:
                                                selectedApartment,
                                            action: "disable",
                                        })
                                    }
                                >
                                    <i className="bi bi-slash-circle"></i>
                                    Disable Apartment
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="enable"
                                    onClick={() =>
                                        setConfirmAction({
                                            apartment:
                                                selectedApartment,
                                            action: "enable",
                                        })
                                    }
                                >
                                    <i className="bi bi-check-circle"></i>
                                    Enable Apartment
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {confirmAction && (
                <div className="admin-apartments-modal-backdrop admin-apartment-confirm-backdrop">
                    <div className="admin-apartment-confirm-modal">
                        <div
                            className={`admin-apartment-confirm-icon ${confirmAction.action}`}
                        >
                            <i
                                className={
                                    confirmAction.action === "disable"
                                        ? "bi bi-slash-circle"
                                        : "bi bi-check-circle"
                                }
                            ></i>
                        </div>

                        <span>CONFIRM ACTION</span>

                        <h3>
                            {confirmAction.action === "disable"
                                ? "Disable this apartment?"
                                : "Restore this apartment?"}
                        </h3>

                        <p>
                            {confirmAction.action === "disable"
                                ? `"${confirmAction.apartment.title}" will become unavailable to customers until an administrator enables it again.`
                                : `"${confirmAction.apartment.title}" will become available to customers again.`}
                        </p>

                        <div className="admin-apartment-confirm-actions">
                            <button
                                type="button"
                                className="cancel"
                                disabled={Boolean(actionLoading)}
                                onClick={() =>
                                    setConfirmAction(null)
                                }
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className={
                                    confirmAction.action === "disable"
                                        ? "disable"
                                        : "enable"
                                }
                                disabled={Boolean(actionLoading)}
                                onClick={runApartmentAction}
                            >
                                {actionLoading
                                    ? "Please wait..."
                                    : confirmAction.action ===
                                        "disable"
                                        ? "Yes, Disable"
                                        : "Yes, Enable"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {feedback.show && (
                <div className="admin-apartment-feedback-wrap">
                    <div
                        className={`admin-apartment-feedback ${feedback.type}`}
                    >
                        <div>
                            <i
                                className={
                                    feedback.type === "success"
                                        ? "bi bi-check-circle-fill"
                                        : "bi bi-exclamation-circle-fill"
                                }
                            ></i>
                        </div>

                        <section>
                            <strong>{feedback.title}</strong>
                            <p>{feedback.message}</p>
                        </section>

                        <button
                            type="button"
                            onClick={() =>
                                setFeedback((current) => ({
                                    ...current,
                                    show: false,
                                }))
                            }
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminApartments;