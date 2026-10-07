import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/adminBookings.css";

const AdminBookings = () => {
    const navigate = useNavigate();

    const [bookingType, setBookingType] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");

    const [eventBookings, setEventBookings] = useState([]);
    const [apartmentBookings, setApartmentBookings] = useState([]);
    const [foodOrders, setFoodOrders] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedBooking, setSelectedBooking] = useState(null);

    const getToken = () => {
        return localStorage.getItem("accessToken");
    };

    const getHeaders = () => {
        return {
            Authorization: `Bearer ${getToken()}`,
        };
    };

    const handleUnauthorized = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("role");
        navigate("admin/login");
    };

    const getPersonName = (person) => {
        if (!person) {
            return "—";
        }

        const name = `${person.firstname || ""} ${person.lastname || ""
            }`.trim();

        return name || person.email || "—";
    };

    const getProviderName = (provider) => {
        if (!provider) {
            return "—";
        }

        if (provider.businessName) {
            return provider.businessName;
        }

        return getPersonName(provider);
    };

    const fetchBookings = async () => {
        const accessToken = getToken();

        if (!accessToken) {
            handleUnauthorized();
            return;
        }

        try {
            setLoading(true);
            setError("");

            const [
                eventResponse,
                apartmentResponse,
                foodResponse,
            ] = await Promise.all([
                axios.get(
                    "http://192.168.0.3:5005/api/v1/admin/event-bookings",
                    {
                        headers: getHeaders(),
                    }
                ),
                axios.get(
                    "http://192.168.0.3:5005/api/v1/admin/apartment-bookings",
                    {
                        headers: getHeaders(),
                    }
                ),
                axios.get(
                    "http://192.168.0.3:5005/api/v1/admin/food-orders",
                    {
                        headers: getHeaders(),
                    }
                ),
            ]);

            setEventBookings(
                Array.isArray(eventResponse.data?.data)
                    ? eventResponse.data.data
                    : []
            );

            setApartmentBookings(
                Array.isArray(apartmentResponse.data?.data)
                    ? apartmentResponse.data.data
                    : []
            );

            setFoodOrders(
                Array.isArray(foodResponse.data?.data)
                    ? foodResponse.data.data
                    : []
            );
        } catch (error) {
            console.log("ADMIN BOOKINGS ERROR:", error);

            if (
                error.response?.status === 401 ||
                error.response?.status === 403
            ) {
                handleUnauthorized();
                return;
            }

            setError(
                error.response?.data?.message ||
                "Unable to load platform bookings."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const bookings = useMemo(() => {
        const normalizedEvents = eventBookings.map((booking) => {
            return {
                ...booking,
                type: "event",
                reference:
                    booking.bookingReference ||
                    booking.reference ||
                    "—",
                customerName: getPersonName(booking.user),
                customerEmail: booking.user?.email || "—",
                title: booking.event?.title || "Event Booking",
                providerName: getProviderName(
                    booking.event?.createdBy
                ),
                totalAmount: booking.totalAmount || 0,
                paymentStatus:
                    booking.paymentStatus || "pending",
                status:
                    booking.bookingStatus ||
                    booking.status ||
                    "pending",
                date: booking.createdAt,
                rawData: booking,
            };
        });

        const normalizedApartments = apartmentBookings.map(
            (booking) => {
                return {
                    ...booking,
                    type: "apartment",
                    reference:
                        booking.bookingReference ||
                        booking.reference ||
                        "—",
                    customerName: getPersonName(booking.user),
                    customerEmail: booking.user?.email || "—",
                    title:
                        booking.apartment?.title ||
                        "Apartment Booking",
                    providerName: getProviderName(
                        booking.apartment?.createdBy
                    ),
                    totalAmount: booking.totalAmount || 0,
                    paymentStatus:
                        booking.paymentStatus || "pending",
                    status:
                        booking.bookingStatus ||
                        booking.status ||
                        "pending",
                    date: booking.createdAt,
                    rawData: booking,
                };
            }
        );

        const normalizedFood = foodOrders.map((order) => {
            return {
                ...order,
                type: "food",
                reference:
                    order.orderReference ||
                    order.reference ||
                    "—",
                customerName: getPersonName(order.user),
                customerEmail: order.user?.email || "—",
                title:
                    Array.isArray(order.items) &&
                        order.items.length > 0
                        ? `${order.items.length} ${order.items.length === 1
                            ? "Food Item"
                            : "Food Items"
                        }`
                        : "Food Order",
                providerName: getProviderName(order.vendor),
                totalAmount: order.totalAmount || 0,
                paymentStatus:
                    order.paymentStatus || "pending",
                status:
                    order.orderStatus ||
                    order.status ||
                    "pending",
                date: order.createdAt,
                rawData: order,
            };
        });

        return [
            ...normalizedEvents,
            ...normalizedApartments,
            ...normalizedFood,
        ].sort((a, b) => {
            return new Date(b.date || 0) - new Date(a.date || 0);
        });
    }, [eventBookings, apartmentBookings, foodOrders]);

    const filteredBookings = useMemo(() => {
        return bookings.filter((booking) => {
            const text = `${booking.reference || ""} ${booking.customerName || ""
                } ${booking.customerEmail || ""} ${booking.title || ""
                } ${booking.providerName || ""}`.toLowerCase();

            const typeMatch =
                bookingType === "all" ||
                booking.type === bookingType;

            const statusMatch =
                statusFilter === "all" ||
                booking.status === statusFilter;

            return (
                text.includes(search.trim().toLowerCase()) &&
                typeMatch &&
                statusMatch
            );
        });
    }, [bookings, bookingType, statusFilter, search]);

    const formatCurrency = (amount) => {
        return `₦${Number(amount || 0).toLocaleString(
            "en-NG"
        )}`;
    };

    const formatDate = (date) => {
        if (!date) {
            return "—";
        }

        return new Intl.DateTimeFormat("en-NG", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(date));
    };

    const formatDateOnly = (date) => {
        if (!date) {
            return "—";
        }

        return new Intl.DateTimeFormat("en-NG", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).format(new Date(date));
    };

    const eventCount = eventBookings.length;
    const apartmentCount = apartmentBookings.length;
    const foodCount = foodOrders.length;

    const pendingCount = bookings.filter(
        (booking) => booking.status === "pending"
    ).length;

    const paidCount = bookings.filter(
        (booking) => booking.paymentStatus === "paid"
    ).length;

    const completedCount = bookings.filter((booking) =>
        ["confirmed", "completed"].includes(booking.status)
    ).length;

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("role");
        navigate("/admin/login");
    };

    return (
        <div className="admin-bookings-page">
            <aside className="admin-bookings-sidebar">
                <div className="admin-bookings-brand">
                    <div className="admin-bookings-logo">
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

                    <Link to="/admin/apartments">
                        <i className="bi bi-buildings"></i>
                        Apartments
                    </Link>

                    <Link to="/admin/food">
                        <i className="bi bi-basket"></i>
                        Food & Orders
                    </Link>

                    <p>BUSINESS</p>

                    <Link
                        className="active"
                        to="/admin/bookings"
                    >
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

                <div className="admin-bookings-sidebar-bottom">
                    <div className="admin-bookings-mini-profile">
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

            <main className="admin-bookings-main">
                <header className="admin-bookings-header">
                    <div>
                        <span>BUSINESS OPERATIONS</span>
                        <h1>Bookings & Orders</h1>
                    </div>

                    <div className="admin-bookings-header-user">
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

                <div className="admin-bookings-content">
                    <section className="admin-bookings-hero">
                        <div>
                            <span>PLATFORM ACTIVITY</span>

                            <h2>
                                One view for every Vibely booking.
                            </h2>

                            <p>
                                Monitor event tickets, apartment
                                reservations and food orders from a
                                single administration workspace.
                            </p>
                        </div>

                        <div className="admin-bookings-hero-art">
                            <i className="bi bi-journal-check"></i>
                            <span>BOOKING CENTRE</span>
                            <strong>
                                {bookings.length} Activities
                            </strong>
                        </div>
                    </section>

                    <section className="admin-bookings-stats">
                        <article>
                            <i className="bi bi-collection"></i>

                            <div>
                                <span>ALL BOOKINGS</span>
                                <strong>{bookings.length}</strong>
                            </div>
                        </article>

                        <article>
                            <i className="bi bi-ticket-perforated"></i>

                            <div>
                                <span>EVENT TICKETS</span>
                                <strong>{eventCount}</strong>
                            </div>
                        </article>

                        <article>
                            <i className="bi bi-building-check"></i>

                            <div>
                                <span>APARTMENT STAYS</span>
                                <strong>{apartmentCount}</strong>
                            </div>
                        </article>

                        <article>
                            <i className="bi bi-bag-check"></i>

                            <div>
                                <span>FOOD ORDERS</span>
                                <strong>{foodCount}</strong>
                            </div>
                        </article>
                    </section>

                    <section className="admin-bookings-summary">
                        <div>
                            <i className="bi bi-hourglass-split"></i>

                            <section>
                                <span>PENDING</span>
                                <strong>{pendingCount}</strong>
                            </section>
                        </div>

                        <div>
                            <i className="bi bi-credit-card"></i>

                            <section>
                                <span>PAID</span>
                                <strong>{paidCount}</strong>
                            </section>
                        </div>

                        <div>
                            <i className="bi bi-check2-circle"></i>

                            <section>
                                <span>CONFIRMED / COMPLETED</span>
                                <strong>{completedCount}</strong>
                            </section>
                        </div>
                    </section>

                    <section className="admin-bookings-breakdown">
                        <button
                            type="button"
                            className={
                                bookingType === "all" ? "active" : ""
                            }
                            onClick={() => setBookingType("all")}
                        >
                            <i className="bi bi-grid"></i>

                            <div>
                                <span>ALL ACTIVITY</span>
                                <strong>{bookings.length}</strong>
                            </div>
                        </button>

                        <button
                            type="button"
                            className={
                                bookingType === "event"
                                    ? "active"
                                    : ""
                            }
                            onClick={() => setBookingType("event")}
                        >
                            <i className="bi bi-calendar-event"></i>

                            <div>
                                <span>EVENTS</span>
                                <strong>{eventCount}</strong>
                            </div>
                        </button>

                        <button
                            type="button"
                            className={
                                bookingType === "apartment"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                setBookingType("apartment")
                            }
                        >
                            <i className="bi bi-buildings"></i>

                            <div>
                                <span>APARTMENTS</span>
                                <strong>{apartmentCount}</strong>
                            </div>
                        </button>

                        <button
                            type="button"
                            className={
                                bookingType === "food"
                                    ? "active"
                                    : ""
                            }
                            onClick={() => setBookingType("food")}
                        >
                            <i className="bi bi-basket"></i>

                            <div>
                                <span>FOOD</span>
                                <strong>{foodCount}</strong>
                            </div>
                        </button>
                    </section>

                    <section className="admin-bookings-panel">
                        <div className="admin-bookings-panel-heading">
                            <div>
                                <span>TRANSACTION DIRECTORY</span>
                                <h3>Bookings & orders</h3>
                            </div>

                            <button
                                type="button"
                                onClick={fetchBookings}
                                disabled={loading}
                            >
                                <i
                                    className={`bi ${loading
                                            ? "bi-arrow-repeat"
                                            : "bi-arrow-clockwise"
                                        }`}
                                ></i>

                                {loading ? "Loading..." : "Refresh"}
                            </button>
                        </div>

                        <div className="admin-bookings-toolbar">
                            <div className="admin-bookings-search">
                                <i className="bi bi-search"></i>

                                <input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search reference, customer, listing or provider..."
                                />
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(event) =>
                                    setStatusFilter(event.target.value)
                                }
                            >
                                <option value="all">
                                    All statuses
                                </option>
                                <option value="pending">
                                    Pending
                                </option>
                                <option value="confirmed">
                                    Confirmed
                                </option>
                                <option value="packing">
                                    Packing
                                </option>
                                <option value="ready">
                                    Ready
                                </option>
                                <option value="completed">
                                    Completed
                                </option>
                                <option value="cancelled">
                                    Cancelled
                                </option>
                            </select>
                        </div>

                        {loading ? (
                            <div className="admin-bookings-empty">
                                <div>
                                    <i className="bi bi-arrow-repeat"></i>
                                </div>

                                <span>LOADING</span>

                                <h3>
                                    Fetching platform bookings
                                </h3>

                                <p>
                                    Please wait while Vibely loads event
                                    bookings, apartment stays and food
                                    orders.
                                </p>
                            </div>
                        ) : error ? (
                            <div className="admin-bookings-empty">
                                <div>
                                    <i className="bi bi-exclamation-circle"></i>
                                </div>

                                <span>UNAVAILABLE</span>

                                <h3>
                                    Unable to load bookings
                                </h3>

                                <p>{error}</p>

                                <button
                                    type="button"
                                    onClick={fetchBookings}
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : filteredBookings.length === 0 ? (
                            <div className="admin-bookings-empty">
                                <div>
                                    <i className="bi bi-journal-text"></i>
                                </div>

                                <span>BOOKING DATA</span>

                                <h3>
                                    {bookings.length === 0
                                        ? "No platform bookings yet"
                                        : bookingType === "event"
                                            ? "No matching event bookings"
                                            : bookingType === "apartment"
                                                ? "No matching apartment bookings"
                                                : bookingType === "food"
                                                    ? "No matching food orders"
                                                    : "No matching bookings"}
                                </h3>

                                <p>
                                    {bookings.length === 0
                                        ? "Event bookings, apartment reservations and food orders will appear here when customers begin making bookings."
                                        : "Try changing your search, booking type or status filter."}
                                </p>

                                <div className="admin-bookings-empty-features">
                                    <section>
                                        <i className="bi bi-ticket"></i>
                                        <strong>Events</strong>
                                        <small>
                                            Ticket references
                                        </small>
                                    </section>

                                    <section>
                                        <i className="bi bi-building"></i>
                                        <strong>Stays</strong>
                                        <small>
                                            Check-in activity
                                        </small>
                                    </section>

                                    <section>
                                        <i className="bi bi-bag"></i>
                                        <strong>Food</strong>
                                        <small>
                                            Order activity
                                        </small>
                                    </section>
                                </div>
                            </div>
                        ) : (
                            <div className="admin-bookings-table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Reference</th>
                                            <th>Type</th>
                                            <th>Customer</th>
                                            <th>Booking / Order</th>
                                            <th>Provider</th>
                                            <th>Amount</th>
                                            <th>Payment</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredBookings.map(
                                            (booking) => (
                                                <tr
                                                    key={`${booking.type}-${booking._id}`}
                                                >
                                                    <td>
                                                        <strong className="admin-booking-reference">
                                                            {booking.reference}
                                                        </strong>

                                                        <small className="admin-booking-date">
                                                            {formatDateOnly(
                                                                booking.date
                                                            )}
                                                        </small>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`admin-booking-type ${booking.type}`}
                                                        >
                                                            {booking.type}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="admin-booking-person">
                                                            <strong>
                                                                {
                                                                    booking.customerName
                                                                }
                                                            </strong>

                                                            <span>
                                                                {
                                                                    booking.customerEmail
                                                                }
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <strong className="admin-booking-title">
                                                            {booking.title}
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        {booking.providerName}
                                                    </td>

                                                    <td>
                                                        <strong>
                                                            {formatCurrency(
                                                                booking.totalAmount
                                                            )}
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`admin-booking-payment ${booking.paymentStatus ||
                                                                "pending"
                                                                }`}
                                                        >
                                                            {booking.paymentStatus ||
                                                                "pending"}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`admin-booking-status ${booking.status ||
                                                                "pending"
                                                                }`}
                                                        >
                                                            {booking.status ||
                                                                "pending"}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="admin-booking-view"
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
                        )}
                    </section>

                    <section className="admin-bookings-note">
                        <i className="bi bi-shield-check"></i>

                        <div>
                            <strong>
                                Unified without changing your existing
                                modules
                            </strong>

                            <p>
                                Your event, apartment and food booking
                                systems remain separate in the backend.
                                This admin workspace combines their
                                records into one protected operational
                                view.
                            </p>
                        </div>
                    </section>
                </div>
            </main>

            {selectedBooking && (
                <div className="admin-booking-modal-backdrop">
                    <div className="admin-booking-modal">
                        <button
                            type="button"
                            className="admin-booking-modal-close"
                            onClick={() =>
                                setSelectedBooking(null)
                            }
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>

                        <div className="admin-booking-modal-heading">
                            <div
                                className={`admin-booking-modal-icon ${selectedBooking.type}`}
                            >
                                <i
                                    className={
                                        selectedBooking.type === "event"
                                            ? "bi bi-ticket-perforated"
                                            : selectedBooking.type ===
                                                "apartment"
                                                ? "bi bi-buildings"
                                                : "bi bi-basket"
                                    }
                                ></i>
                            </div>

                            <section>
                                <span>
                                    {selectedBooking.type} activity
                                </span>

                                <h2>
                                    {selectedBooking.reference}
                                </h2>

                                <p>
                                    {formatDate(
                                        selectedBooking.date
                                    )}
                                </p>
                            </section>
                        </div>

                        <div className="admin-booking-modal-statuses">
                            <span
                                className={`admin-booking-payment ${selectedBooking.paymentStatus ||
                                    "pending"
                                    }`}
                            >
                                Payment:{" "}
                                {selectedBooking.paymentStatus ||
                                    "pending"}
                            </span>

                            <span
                                className={`admin-booking-status ${selectedBooking.status ||
                                    "pending"
                                    }`}
                            >
                                Status:{" "}
                                {selectedBooking.status ||
                                    "pending"}
                            </span>
                        </div>

                        <div className="admin-booking-modal-grid">
                            <article>
                                <span>CUSTOMER</span>
                                <strong>
                                    {selectedBooking.customerName}
                                </strong>
                                <small>
                                    {selectedBooking.customerEmail}
                                </small>
                            </article>

                            <article>
                                <span>PROVIDER</span>
                                <strong>
                                    {selectedBooking.providerName}
                                </strong>
                            </article>

                            <article>
                                <span>BOOKING / ORDER</span>
                                <strong>
                                    {selectedBooking.title}
                                </strong>
                            </article>

                            <article>
                                <span>TOTAL AMOUNT</span>
                                <strong>
                                    {formatCurrency(
                                        selectedBooking.totalAmount
                                    )}
                                </strong>
                            </article>
                        </div>

                        {selectedBooking.type === "event" && (
                            <div className="admin-booking-specific">
                                <div>
                                    <span>QUANTITY</span>
                                    <strong>
                                        {selectedBooking.rawData
                                            ?.quantity ?? "—"}
                                    </strong>
                                </div>

                                <div>
                                    <span>EVENT DATE</span>
                                    <strong>
                                        {formatDateOnly(
                                            selectedBooking.rawData
                                                ?.event?.date
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>LOCATION</span>
                                    <strong>
                                        {selectedBooking.rawData
                                            ?.event?.location || "—"}
                                    </strong>
                                </div>
                            </div>
                        )}

                        {selectedBooking.type ===
                            "apartment" && (
                                <div className="admin-booking-specific">
                                    <div>
                                        <span>STAY TYPE</span>
                                        <strong>
                                            {selectedBooking.rawData
                                                ?.stayType || "—"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>CHECK-IN</span>
                                        <strong>
                                            {formatDateOnly(
                                                selectedBooking.rawData
                                                    ?.checkInDate
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>CHECK-OUT</span>
                                        <strong>
                                            {formatDateOnly(
                                                selectedBooking.rawData
                                                    ?.checkOutDate
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>UNITS</span>
                                        <strong>
                                            {selectedBooking.rawData
                                                ?.numberOfUnits ?? "—"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>STAY STATUS</span>
                                        <strong>
                                            {selectedBooking.rawData
                                                ?.stayStatus || "—"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>EXPECTED TIME</span>
                                        <strong>
                                            {selectedBooking.rawData
                                                ?.expectedCheckInTime || "—"}
                                        </strong>
                                    </div>
                                </div>
                            )}

                        {selectedBooking.type === "food" && (
                            <div className="admin-booking-food-items">
                                <div className="admin-booking-food-heading">
                                    <span>ORDER ITEMS</span>

                                    <strong>
                                        {selectedBooking.rawData?.items
                                            ?.length || 0}{" "}
                                        items
                                    </strong>
                                </div>

                                {Array.isArray(
                                    selectedBooking.rawData?.items
                                ) &&
                                    selectedBooking.rawData.items
                                        .length > 0 ? (
                                    selectedBooking.rawData.items.map(
                                        (item, index) => (
                                            <div
                                                className="admin-booking-food-row"
                                                key={
                                                    item._id ||
                                                    `${item.name}-${index}`
                                                }
                                            >
                                                <section>
                                                    <strong>
                                                        {item.name ||
                                                            "Food item"}
                                                    </strong>

                                                    <small>
                                                        Quantity:{" "}
                                                        {item.quantity || 0}
                                                    </small>
                                                </section>

                                                <strong>
                                                    {formatCurrency(
                                                        item.subtotal
                                                    )}
                                                </strong>
                                            </div>
                                        )
                                    )
                                ) : (
                                    <p>
                                        No order items available.
                                    </p>
                                )}

                                <div className="admin-booking-pickup">
                                    <span>PICKUP CODE</span>

                                    <strong>
                                        {selectedBooking.rawData
                                            ?.pickupCode || "—"}
                                    </strong>
                                </div>
                            </div>
                        )}

                        <div className="admin-booking-modal-footer">
                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedBooking(null)
                                }
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminBookings;