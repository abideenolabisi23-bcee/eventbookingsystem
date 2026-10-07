import { useEffect, useMemo, useState } from "react";
import {
    Link,
    useNavigate,
    useParams
} from "react-router-dom";
import axios from "axios";
import {
    ArrowLeft,
    BedDouble,
    CalendarDays,
    CheckCircle2,
    Clock3,
    CreditCard,
    DoorOpen,
    LogIn,
    LogOut,
    Mail,
    MapPin,
    Search,
    UserRound,
    UsersRound,
    WalletCards,
    X,
    XCircle
} from "lucide-react";
import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/organizerApartmentBookings.css";

const OrganizerApartmentBookings = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [apartment, setApartment] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] =
        useState("");

    const [error, setError] = useState("");
    const [feedback, setFeedback] = useState(null);
    const [selectedBooking, setSelectedBooking] =
        useState(null);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] =
        useState("all");

    const getAccessToken = () => {
        return localStorage.getItem("accessToken");
    };

    const handleUnauthorized = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("role");

        navigate("/organizer/login");
    };

    const fetchBookings = async () => {
        const accessToken = getAccessToken();

        if (!accessToken) {
            handleUnauthorized();
            return;
        }

        try {
            const response = await axios.get(
                `http://https://eventbookingsystem-sooty.vercel.app/api/v1/organizer/apartments/${id}/bookings`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                }
            );

            const data = response.data.data;

            setApartment(data?.apartment || null);
            setBookings(data?.bookings || []);
        } catch (error) {
            console.log(
                "ORGANIZER APARTMENT BOOKINGS ERROR:",
                error
            );

            if (error.response?.status === 401) {
                handleUnauthorized();
                return;
            }

            setError(
                error.response?.data?.message ||
                "Cannot fetch apartment bookings at this time."
            );
        }
    };

    const fetchStats = async () => {
        const accessToken = getAccessToken();

        if (!accessToken) {
            return;
        }

        try {
            const response = await axios.get(
                `http://https://eventbookingsystem-sooty.vercel.app/api/v1/organizer/apartments/${id}/booking-stats`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                }
            );

            setStats(response.data.data || null);
        } catch (error) {
            console.log(
                "APARTMENT BOOKING STATS ERROR:",
                error
            );

            if (error.response?.status === 401) {
                handleUnauthorized();
            }
        }
    };

    useEffect(() => {
        const loadPage = async () => {
            setLoading(true);
            setError("");

            await Promise.all([
                fetchBookings(),
                fetchStats()
            ]);

            setLoading(false);
        };

        loadPage();
    }, [id]);

    const formatPrice = (amount) => {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatDate = (date) => {
        if (!date) {
            return "Not available";
        }

        return new Date(date).toLocaleDateString(
            "en-NG",
            {
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        );
    };

    const formatDateTime = (date) => {
        if (!date) {
            return "Not available";
        }

        return new Date(date).toLocaleString(
            "en-NG",
            {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    };

    const formatStayType = (stayType) => {
        if (stayType === "day_use") {
            return "Day Use";
        }

        if (stayType === "overnight") {
            return "Overnight";
        }

        return stayType || "Not available";
    };

    const formatStatus = (status) => {
        if (!status) {
            return "Unknown";
        }

        return status
            .replaceAll("_", " ")
            .replace(/\b\w/g, (letter) =>
                letter.toUpperCase()
            );
    };

    const getGuestName = (booking) => {
        const firstname =
            booking.user?.firstname || "";

        const lastname =
            booking.user?.lastname || "";

        const fullName =
            `${firstname} ${lastname}`.trim();

        return fullName || "Guest";
    };

    const getInitials = (booking) => {
        const firstname =
            booking.user?.firstname || "";

        const lastname =
            booking.user?.lastname || "";

        const firstInitial =
            firstname.charAt(0).toUpperCase();

        const lastInitial =
            lastname.charAt(0).toUpperCase();

        return (
            `${firstInitial}${lastInitial}` ||
            "G"
        );
    };

    const showFeedback = (
        type,
        title,
        message
    ) => {
        setFeedback({
            type,
            title,
            message
        });
    };

    const refreshBookingData = async () => {
        await Promise.all([
            fetchBookings(),
            fetchStats()
        ]);
    };

    const handleCheckIn = async (booking) => {
        const accessToken = getAccessToken();

        if (!accessToken) {
            handleUnauthorized();
            return;
        }

        try {
            setActionLoading(booking._id);

            const response = await axios.patch(
                `http://https://eventbookingsystem-sooty.vercel.app/api/v1/organizer/apartment-bookings/${booking._id}/check-in`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                }
            );

            showFeedback(
                "success",
                "Guest checked in",
                response.data.message ||
                "Guest checked in successfully."
            );

            setSelectedBooking(null);

            await refreshBookingData();
        } catch (error) {
            console.log(
                "APARTMENT CHECK-IN ERROR:",
                error
            );

            if (error.response?.status === 401) {
                handleUnauthorized();
                return;
            }

            showFeedback(
                "error",
                "Check-in unsuccessful",
                error.response?.data?.message ||
                "Cannot check in this guest at this time."
            );
        } finally {
            setActionLoading("");
        }
    };

    const handleCheckOut = async (booking) => {
        const accessToken = getAccessToken();

        if (!accessToken) {
            handleUnauthorized();
            return;
        }

        try {
            setActionLoading(booking._id);

            const response = await axios.patch(
                `http://https://eventbookingsystem-sooty.vercel.app/api/v1/organizer/apartment-bookings/${booking._id}/check-out`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                }
            );

            showFeedback(
                "success",
                "Guest checked out",
                response.data.message ||
                "Guest checked out successfully."
            );

            setSelectedBooking(null);

            await refreshBookingData();
        } catch (error) {
            console.log(
                "APARTMENT CHECK-OUT ERROR:",
                error
            );

            if (error.response?.status === 401) {
                handleUnauthorized();
                return;
            }

            showFeedback(
                "error",
                "Check-out unsuccessful",
                error.response?.data?.message ||
                "Cannot check out this guest at this time."
            );
        } finally {
            setActionLoading("");
        }
    };

    const filteredBookings = useMemo(() => {
        const searchValue =
            search.toLowerCase().trim();

        return bookings.filter((booking) => {
            const guestName =
                getGuestName(booking).toLowerCase();

            const email =
                booking.user?.email?.toLowerCase() ||
                "";

            const reference =
                booking.bookingReference?.toLowerCase() ||
                "";

            const matchesSearch =
                !searchValue ||
                guestName.includes(searchValue) ||
                email.includes(searchValue) ||
                reference.includes(searchValue);

            const matchesStatus =
                statusFilter === "all" ||
                booking.bookingStatus ===
                statusFilter ||
                booking.paymentStatus ===
                statusFilter ||
                booking.stayStatus === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [bookings, search, statusFilter]);

    const canCheckIn = (booking) => {
        return (
            booking.bookingStatus === "confirmed" &&
            booking.paymentStatus === "paid" &&
            booking.stayStatus === "upcoming"
        );
    };

    const canCheckOut = (booking) => {
        return (
            booking.bookingStatus !== "cancelled" &&
            booking.stayStatus === "checked_in"
        );
    };

    if (loading) {
        return (
            <div className="oab-loading-page">
                <div className="oab-loader"></div>

                <h2>Loading apartment bookings</h2>

                <p>
                    Preparing your guest and reservation
                    information.
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="oab-error-page">
                <img
                    src={vibelyLogo}
                    alt="Vibely"
                    className="oab-error-logo"
                />

                <div className="oab-error-icon">
                    <XCircle size={27} />
                </div>

                <h2>
                    Unable to load apartment bookings
                </h2>

                <p>{error}</p>

                <button
                    type="button"
                    onClick={() =>
                        navigate("/organizer/apartments")
                    }
                >
                    <ArrowLeft size={16} />
                    Back to Apartments
                </button>
            </div>
        );
    }

    return (
        <div className="oab-page">
            <header className="oab-topbar">
                <div className="oab-topbar-inner">
                    <Link
                        to="/organizer/dashboard"
                        className="oab-brand"
                    >
                        <img
                            src={vibelyLogo}
                            alt="Vibely"
                        />
                    </Link>

                    <div className="oab-topbar-actions">
                        <Link to="/organizer/dashboard">
                            Dashboard
                        </Link>

                        <Link
                            to="/organizer/apartments"
                            className="oab-topbar-active"
                        >
                            Apartments
                        </Link>

                        <Link to="/organizer/profile">
                            Profile
                        </Link>
                    </div>
                </div>
            </header>

            <main className="oab-main">
                <div className="oab-container">
                    <div className="oab-back-row">
                        <Link to="/organizer/apartments">
                            <ArrowLeft size={16} />
                            Back to My Apartments
                        </Link>
                    </div>

                    <section className="oab-hero">
                        <div className="oab-hero-copy">
                            <span className="oab-eyebrow">
                                APARTMENT BOOKINGS
                            </span>

                            <h1>
                                Guests & Reservations
                            </h1>

                            <p>
                                View reservations, monitor
                                payments and manage guest
                                check-ins for this property.
                            </p>

                            {apartment && (
                                <div className="oab-property">
                                    <div className="oab-property-icon">
                                        <BedDouble size={19} />
                                    </div>

                                    <div>
                                        <strong>
                                            {apartment.title}
                                        </strong>

                                        <span>
                                            <MapPin size={12} />
                                            {apartment.location}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="oab-hero-decoration">
                            <div>
                                <span>
                                    {stats?.totalBookings ||
                                        bookings.length}
                                </span>

                                <small>
                                    Total Reservations
                                </small>
                            </div>
                        </div>
                    </section>

                    <section className="oab-stats">
                        <article className="oab-stat-card">
                            <div className="oab-stat-icon">
                                <UsersRound size={20} />
                            </div>

                            <div>
                                <span>Total Bookings</span>

                                <strong>
                                    {stats?.totalBookings ??
                                        bookings.length}
                                </strong>
                            </div>
                        </article>

                        <article className="oab-stat-card">
                            <div className="oab-stat-icon">
                                <CheckCircle2 size={20} />
                            </div>

                            <div>
                                <span>Confirmed</span>

                                <strong>
                                    {stats?.confirmedBookings ??
                                        0}
                                </strong>
                            </div>
                        </article>

                        <article className="oab-stat-card">
                            <div className="oab-stat-icon">
                                <LogIn size={20} />
                            </div>

                            <div>
                                <span>Checked In</span>

                                <strong>
                                    {stats?.checkedInGuests ??
                                        0}
                                </strong>
                            </div>
                        </article>

                        <article className="oab-stat-card">
                            <div className="oab-stat-icon">
                                <WalletCards size={20} />
                            </div>

                            <div>
                                <span>Revenue</span>

                                <strong>
                                    {formatPrice(
                                        stats?.totalRevenue || 0
                                    )}
                                </strong>
                            </div>
                        </article>
                    </section>

                    <section className="oab-bookings-section">
                        <div className="oab-section-heading">
                            <div>
                                <span>
                                    RESERVATION MANAGEMENT
                                </span>

                                <h2>Apartment Bookings</h2>

                                <p>
                                    Review every booking made for
                                    this apartment.
                                </p>
                            </div>

                            <div className="oab-result-count">
                                {filteredBookings.length}{" "}
                                {filteredBookings.length === 1
                                    ? "booking"
                                    : "bookings"}
                            </div>
                        </div>

                        <div className="oab-toolbar">
                            <div className="oab-search">
                                <Search size={17} />

                                <input
                                    type="text"
                                    placeholder="Search guest, email or booking reference"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(
                                            event.target.value
                                        )
                                    }
                                />

                                {search && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSearch("")
                                        }
                                    >
                                        <X size={15} />
                                    </button>
                                )}
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(event) =>
                                    setStatusFilter(
                                        event.target.value
                                    )
                                }
                            >
                                <option value="all">
                                    All bookings
                                </option>

                                <option value="pending">
                                    Pending
                                </option>

                                <option value="confirmed">
                                    Confirmed
                                </option>

                                <option value="cancelled">
                                    Cancelled
                                </option>

                                <option value="paid">
                                    Paid
                                </option>

                                <option value="upcoming">
                                    Upcoming
                                </option>

                                <option value="checked_in">
                                    Checked In
                                </option>

                                <option value="checked_out">
                                    Checked Out
                                </option>
                            </select>
                        </div>

                        {filteredBookings.length ===
                            0 ? (
                            <div className="oab-empty">
                                <div>
                                    <CalendarDays size={27} />
                                </div>

                                <h3>
                                    No bookings found
                                </h3>

                                <p>
                                    {bookings.length === 0
                                        ? "This apartment has not received any bookings yet."
                                        : "No bookings match your current search or filter."}
                                </p>

                                {bookings.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearch("");
                                            setStatusFilter("all");
                                        }}
                                    >
                                        Clear Filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="oab-table-card">
                                <div className="oab-table-scroll">
                                    <table className="oab-table">
                                        <thead>
                                            <tr>
                                                <th>Guest</th>
                                                <th>Stay</th>
                                                <th>Dates</th>
                                                <th>Rooms</th>
                                                <th>Amount</th>
                                                <th>Payment</th>
                                                <th>Stay Status</th>
                                                <th></th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {filteredBookings.map(
                                                (booking) => (
                                                    <tr
                                                        key={booking._id}
                                                    >
                                                        <td>
                                                            <div className="oab-guest-cell">
                                                                <div className="oab-avatar">
                                                                    {getInitials(
                                                                        booking
                                                                    )}
                                                                </div>

                                                                <div>
                                                                    <strong>
                                                                        {getGuestName(
                                                                            booking
                                                                        )}
                                                                    </strong>

                                                                    <span>
                                                                        {booking
                                                                            .user
                                                                            ?.email ||
                                                                            "No email"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            <div className="oab-stay-cell">
                                                                <strong>
                                                                    {formatStayType(
                                                                        booking.stayType
                                                                    )}
                                                                </strong>

                                                                <span>
                                                                    {booking.numberOfNights >
                                                                        0
                                                                        ? `${booking.numberOfNights} night${booking.numberOfNights ===
                                                                            1
                                                                            ? ""
                                                                            : "s"
                                                                        }`
                                                                        : "Same day"}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            <div className="oab-date-cell">
                                                                <span>
                                                                    {formatDate(
                                                                        booking.checkInDate
                                                                    )}
                                                                </span>

                                                                {booking.stayType ===
                                                                    "overnight" && (
                                                                        <small>
                                                                            to{" "}
                                                                            {formatDate(
                                                                                booking.checkOutDate
                                                                            )}
                                                                        </small>
                                                                    )}
                                                            </div>
                                                        </td>

                                                        <td>
                                                            <strong className="oab-room-number">
                                                                {
                                                                    booking.numberOfUnits
                                                                }
                                                            </strong>
                                                        </td>

                                                        <td>
                                                            <strong className="oab-amount">
                                                                {formatPrice(
                                                                    booking.totalAmount
                                                                )}
                                                            </strong>
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={`oab-status oab-status-${booking.paymentStatus}`}
                                                            >
                                                                {formatStatus(
                                                                    booking.paymentStatus
                                                                )}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={`oab-status oab-status-${booking.stayStatus}`}
                                                            >
                                                                {formatStatus(
                                                                    booking.stayStatus
                                                                )}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="oab-view-button"
                                                                onClick={() =>
                                                                    setSelectedBooking(
                                                                        booking
                                                                    )
                                                                }
                                                            >
                                                                View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </main>

            {selectedBooking && (
                <div
                    className="oab-modal-overlay"
                    onClick={() =>
                        setSelectedBooking(null)
                    }
                >
                    <div
                        className="oab-booking-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <div className="oab-modal-header">
                            <div>
                                <span>
                                    BOOKING DETAILS
                                </span>

                                <h2>
                                    {getGuestName(
                                        selectedBooking
                                    )}
                                </h2>

                                <p>
                                    {
                                        selectedBooking.bookingReference
                                    }
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedBooking(null)
                                }
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="oab-modal-status-row">
                            <span
                                className={`oab-status oab-status-${selectedBooking.bookingStatus}`}
                            >
                                {formatStatus(
                                    selectedBooking.bookingStatus
                                )}
                            </span>

                            <span
                                className={`oab-status oab-status-${selectedBooking.paymentStatus}`}
                            >
                                {formatStatus(
                                    selectedBooking.paymentStatus
                                )}
                            </span>

                            <span
                                className={`oab-status oab-status-${selectedBooking.stayStatus}`}
                            >
                                {formatStatus(
                                    selectedBooking.stayStatus
                                )}
                            </span>
                        </div>

                        <div className="oab-modal-section">
                            <h3>Guest Information</h3>

                            <div className="oab-modal-grid">
                                <div className="oab-detail-box">
                                    <UserRound size={18} />

                                    <div>
                                        <span>Guest</span>

                                        <strong>
                                            {getGuestName(
                                                selectedBooking
                                            )}
                                        </strong>
                                    </div>
                                </div>

                                <div className="oab-detail-box">
                                    <Mail size={18} />

                                    <div>
                                        <span>Email</span>

                                        <strong>
                                            {selectedBooking.user
                                                ?.email || "Not available"}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="oab-modal-section">
                            <h3>Stay Information</h3>

                            <div className="oab-modal-grid">
                                <div className="oab-detail-box">
                                    <CalendarDays size={18} />

                                    <div>
                                        <span>Check-in</span>

                                        <strong>
                                            {formatDate(
                                                selectedBooking.checkInDate
                                            )}
                                        </strong>
                                    </div>
                                </div>

                                <div className="oab-detail-box">
                                    <CalendarDays size={18} />

                                    <div>
                                        <span>Check-out</span>

                                        <strong>
                                            {formatDate(
                                                selectedBooking.checkOutDate
                                            )}
                                        </strong>
                                    </div>
                                </div>

                                <div className="oab-detail-box">
                                    <Clock3 size={18} />

                                    <div>
                                        <span>
                                            Expected Arrival
                                        </span>

                                        <strong>
                                            {selectedBooking.expectedCheckInTime ||
                                                (selectedBooking.stayType ===
                                                    "day_use"
                                                    ? "Day use"
                                                    : "Not provided")}
                                        </strong>
                                    </div>
                                </div>

                                <div className="oab-detail-box">
                                    <DoorOpen size={18} />

                                    <div>
                                        <span>Rooms</span>

                                        <strong>
                                            {
                                                selectedBooking.numberOfUnits
                                            }
                                        </strong>
                                    </div>
                                </div>

                                <div className="oab-detail-box">
                                    <BedDouble size={18} />

                                    <div>
                                        <span>Stay Type</span>

                                        <strong>
                                            {formatStayType(
                                                selectedBooking.stayType
                                            )}
                                        </strong>
                                    </div>
                                </div>

                                <div className="oab-detail-box">
                                    <CreditCard size={18} />

                                    <div>
                                        <span>Total Amount</span>

                                        <strong>
                                            {formatPrice(
                                                selectedBooking.totalAmount
                                            )}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {(selectedBooking.checkedInAt ||
                            selectedBooking.checkedOutAt) && (
                                <div className="oab-modal-section">
                                    <h3>
                                        Check-in Activity
                                    </h3>

                                    <div className="oab-activity">
                                        {selectedBooking.checkedInAt && (
                                            <div>
                                                <LogIn size={17} />

                                                <span>
                                                    <small>
                                                        Checked in
                                                    </small>

                                                    <strong>
                                                        {formatDateTime(
                                                            selectedBooking.checkedInAt
                                                        )}
                                                    </strong>
                                                </span>
                                            </div>
                                        )}

                                        {selectedBooking.checkedOutAt && (
                                            <div>
                                                <LogOut size={17} />

                                                <span>
                                                    <small>
                                                        Checked out
                                                    </small>

                                                    <strong>
                                                        {formatDateTime(
                                                            selectedBooking.checkedOutAt
                                                        )}
                                                    </strong>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        <div className="oab-modal-actions">
                            <button
                                type="button"
                                className="oab-secondary-action"
                                onClick={() =>
                                    setSelectedBooking(null)
                                }
                            >
                                Close
                            </button>

                            {canCheckIn(
                                selectedBooking
                            ) && (
                                    <button
                                        type="button"
                                        className="oab-primary-action"
                                        disabled={
                                            actionLoading ===
                                            selectedBooking._id
                                        }
                                        onClick={() =>
                                            handleCheckIn(
                                                selectedBooking
                                            )
                                        }
                                    >
                                        <LogIn size={17} />

                                        {actionLoading ===
                                            selectedBooking._id
                                            ? "Checking In..."
                                            : "Check In Guest"}
                                    </button>
                                )}

                            {canCheckOut(
                                selectedBooking
                            ) && (
                                    <button
                                        type="button"
                                        className="oab-primary-action"
                                        disabled={
                                            actionLoading ===
                                            selectedBooking._id
                                        }
                                        onClick={() =>
                                            handleCheckOut(
                                                selectedBooking
                                            )
                                        }
                                    >
                                        <LogOut size={17} />

                                        {actionLoading ===
                                            selectedBooking._id
                                            ? "Checking Out..."
                                            : "Check Out Guest"}
                                    </button>
                                )}
                        </div>
                    </div>
                </div>
            )}

            {feedback && (
                <div className="oab-feedback-overlay">
                    <div className="oab-feedback-modal">
                        <div
                            className={`oab-feedback-icon ${feedback.type}`}
                        >
                            {feedback.type ===
                                "success" ? (
                                <CheckCircle2 size={30} />
                            ) : (
                                <XCircle size={30} />
                            )}
                        </div>

                        <h3>{feedback.title}</h3>

                        <p>{feedback.message}</p>

                        <button
                            type="button"
                            onClick={() =>
                                setFeedback(null)
                            }
                        >
                            Okay
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrganizerApartmentBookings;