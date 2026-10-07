import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/adminNotifications.css";

const AdminNotifications = () => {
    const navigate = useNavigate();

    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [notifications, setNotifications] = useState([]);
    const [readNotifications, setReadNotifications] = useState(() => {
        try {
            return JSON.parse(
                localStorage.getItem("adminReadNotifications") || "[]"
            );
        } catch {
            return [];
        }
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedNotification, setSelectedNotification] = useState(null);

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
        navigate("/admin/login");
    };

    const getPersonName = (person) => {
        if (!person) {
            return "Unknown user";
        }

        const name = `${person.firstname || ""} ${person.lastname || ""
            }`.trim();

        return name || person.email || "Unknown user";
    };

    const formatCurrency = (amount) => {
        return `₦${Number(amount || 0).toLocaleString("en-NG")}`;
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

    const buildProviderNotifications = (providers) => {
        return providers.map((provider) => {
            const providerName =
                provider.businessName || getPersonName(provider);

            const providerType =
                provider.role === "food_vendor"
                    ? "Food vendor"
                    : "Organizer";

            return {
                _id: `provider-${provider._id}`,
                sourceId: provider._id,
                type: "provider",
                priority: "attention",
                title: `${providerType} approval request`,
                message: `${providerName} is waiting for administrator approval.`,
                createdAt: provider.createdAt,
                route: "/admin/providers",
                actionLabel: "Review Provider",
                details: {
                    Provider: providerName,
                    Email: provider.email || "—",
                    Type: providerType,
                    Status: provider.approvalStatus || "pending",
                },
            };
        });
    };

    const buildPaymentNotifications = (payments, service) => {
        return payments
            .filter((payment) =>
                [
                    "pending",
                    "processing",
                    "failed",
                    "refund_pending",
                    "refunded",
                ].includes(payment.status)
            )
            .map((payment) => {
                const customer = getPersonName(payment.user);

                const serviceName =
                    service === "event"
                        ? "Event"
                        : service === "apartment"
                            ? "Apartment"
                            : "Food";

                let title = `${serviceName} payment update`;
                let priority = "normal";

                if (payment.status === "failed") {
                    title = `${serviceName} payment failed`;
                    priority = "attention";
                }

                if (payment.status === "refund_pending") {
                    title = `${serviceName} refund requires attention`;
                    priority = "attention";
                }

                if (payment.status === "refunded") {
                    title = `${serviceName} payment refunded`;
                }

                if (
                    payment.status === "pending" ||
                    payment.status === "processing"
                ) {
                    title = `${serviceName} payment pending`;
                }

                return {
                    _id: `payment-${service}-${payment._id}`,
                    sourceId: payment._id,
                    type: "payment",
                    priority,
                    title,
                    message: `${customer}'s ${serviceName.toLowerCase()} transaction of ${formatCurrency(
                        payment.amount
                    )} is ${String(payment.status || "pending").replaceAll(
                        "_",
                        " "
                    )}.`,
                    createdAt:
                        payment.refundedAt ||
                        payment.paidAt ||
                        payment.updatedAt ||
                        payment.createdAt,
                    route: "/admin/payments",
                    actionLabel: "View Payments",
                    details: {
                        Customer: customer,
                        Service: serviceName,
                        Reference: payment.reference || "—",
                        Amount: formatCurrency(payment.amount),
                        Status: String(payment.status || "pending").replaceAll(
                            "_",
                            " "
                        ),
                    },
                };
            });
    };

    const buildBookingNotifications = (records, service) => {
        return records
            .filter((record) => {
                const status =
                    service === "food"
                        ? record.orderStatus
                        : record.bookingStatus;

                return ["pending", "cancelled"].includes(status);
            })
            .map((record) => {
                const status =
                    service === "food"
                        ? record.orderStatus
                        : record.bookingStatus;

                const customer = getPersonName(record.user);

                const serviceName =
                    service === "event"
                        ? "Event"
                        : service === "apartment"
                            ? "Apartment"
                            : "Food";

                const reference =
                    record.bookingReference ||
                    record.orderReference ||
                    "—";

                return {
                    _id: `booking-${service}-${record._id}`,
                    sourceId: record._id,
                    type: "booking",
                    priority:
                        status === "cancelled" ? "attention" : "normal",
                    title:
                        status === "cancelled"
                            ? `${serviceName} booking cancelled`
                            : `Pending ${serviceName.toLowerCase()} ${service === "food" ? "order" : "booking"
                            }`,
                    message:
                        status === "cancelled"
                            ? `${customer}'s ${serviceName.toLowerCase()} ${service === "food" ? "order" : "booking"
                            } has been cancelled.`
                            : `${customer} has a pending ${serviceName.toLowerCase()} ${service === "food" ? "order" : "booking"
                            }.`,
                    createdAt: record.updatedAt || record.createdAt,
                    route: "/admin/bookings",
                    actionLabel: "View Bookings",
                    details: {
                        Customer: customer,
                        Service: serviceName,
                        Reference: reference,
                        Amount: formatCurrency(record.totalAmount),
                        Status: status || "pending",
                    },
                };
            });
    };

    const fetchNotifications = async () => {
        const accessToken = getToken();

        if (!accessToken) {
            handleUnauthorized();
            return;
        }

        try {
            setLoading(true);
            setError("");

            const responses = await Promise.allSettled([
                axios.get(
                    "https://eventbookingsystem-sooty.vercel.app/api/v1/admin/providers/pending",
                    {
                        headers: getHeaders(),
                    }
                ),
                axios.get(
                    "https://eventbookingsystem-sooty.vercel.app/api/v1/admin/event-payments",
                    {
                        headers: getHeaders(),
                    }
                ),
                axios.get(
                    "https://eventbookingsystem-sooty.vercel.app/api/v1/admin/apartment-payments",
                    {
                        headers: getHeaders(),
                    }
                ),
                axios.get(
                    "https://eventbookingsystem-sooty.vercel.app/api/v1/admin/food-payments",
                    {
                        headers: getHeaders(),
                    }
                ),
                axios.get(
                    "https://eventbookingsystem-sooty.vercel.app/api/v1/admin/event-bookings",
                    {
                        headers: getHeaders(),
                    }
                ),
                axios.get(
                    "https://eventbookingsystem-sooty.vercel.app/api/v1/admin/apartment-bookings",
                    {
                        headers: getHeaders(),
                    }
                ),
                axios.get(
                    "https://eventbookingsystem-sooty.vercel.app/api/v1/admin/food-orders",
                    {
                        headers: getHeaders(),
                    }
                ),
            ]);

            const unauthorized = responses.some(
                (result) =>
                    result.status === "rejected" &&
                    [401, 403].includes(result.reason?.response?.status)
            );

            if (unauthorized) {
                handleUnauthorized();
                return;
            }

            const getData = (index) => {
                const result = responses[index];

                if (result.status !== "fulfilled") {
                    return [];
                }

                return Array.isArray(result.value.data?.data)
                    ? result.value.data.data
                    : [];
            };

            const providers = getData(0);
            const eventPayments = getData(1);
            const apartmentPayments = getData(2);
            const foodPayments = getData(3);
            const eventBookings = getData(4);
            const apartmentBookings = getData(5);
            const foodOrders = getData(6);

            const generatedNotifications = [
                ...buildProviderNotifications(providers),
                ...buildPaymentNotifications(eventPayments, "event"),
                ...buildPaymentNotifications(
                    apartmentPayments,
                    "apartment"
                ),
                ...buildPaymentNotifications(foodPayments, "food"),
                ...buildBookingNotifications(eventBookings, "event"),
                ...buildBookingNotifications(
                    apartmentBookings,
                    "apartment"
                ),
                ...buildBookingNotifications(foodOrders, "food"),
            ].sort(
                (a, b) =>
                    new Date(b.createdAt || 0) -
                    new Date(a.createdAt || 0)
            );

            setNotifications(generatedNotifications);

            const failedRequests = responses.filter(
                (result) => result.status === "rejected"
            ).length;

            if (failedRequests > 0) {
                setError(
                    `${failedRequests} activity source${failedRequests === 1 ? "" : "s"
                    } could not be loaded. Available alerts are still shown below.`
                );
            }
        } catch (error) {
            console.log("ADMIN NOTIFICATIONS ERROR:", error);

            if (
                error.response?.status === 401 ||
                error.response?.status === 403
            ) {
                handleUnauthorized();
                return;
            }

            setError(
                error.response?.data?.message ||
                "Unable to load admin activity."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const notificationsWithReadState = useMemo(() => {
        return notifications.map((notification) => ({
            ...notification,
            isRead: readNotifications.includes(notification._id),
        }));
    }, [notifications, readNotifications]);

    const filteredNotifications = useMemo(() => {
        return notificationsWithReadState.filter((notification) => {
            const text = `${notification.title || ""} ${notification.message || ""
                } ${notification.type || ""}`.toLowerCase();

            const matchesSearch = text.includes(
                search.trim().toLowerCase()
            );

            const matchesFilter =
                filter === "all" ||
                (filter === "unread" && !notification.isRead) ||
                notification.type === filter;

            return matchesSearch && matchesFilter;
        });
    }, [notificationsWithReadState, filter, search]);

    const unreadCount = notificationsWithReadState.filter(
        (notification) => !notification.isRead
    ).length;

    const providerCount = notificationsWithReadState.filter(
        (notification) => notification.type === "provider"
    ).length;

    const attentionCount = notificationsWithReadState.filter(
        (notification) => notification.priority === "attention"
    ).length;

    const saveReadNotifications = (ids) => {
        setReadNotifications(ids);

        localStorage.setItem(
            "adminReadNotifications",
            JSON.stringify(ids)
        );
    };

    const markAsRead = (notificationId) => {
        if (readNotifications.includes(notificationId)) {
            return;
        }

        saveReadNotifications([
            ...readNotifications,
            notificationId,
        ]);
    };

    const markAllAsRead = () => {
        const allIds = notifications.map(
            (notification) => notification._id
        );

        saveReadNotifications([
            ...new Set([...readNotifications, ...allIds]),
        ]);
    };

    const openNotification = (notification) => {
        markAsRead(notification._id);

        setSelectedNotification({
            ...notification,
            isRead: true,
        });
    };

    const goToNotificationPage = () => {
        if (!selectedNotification?.route) {
            return;
        }

        setSelectedNotification(null);
        navigate(selectedNotification.route);
    };

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("role");
        navigate("/admin/login");
    };

    return (
        <div className="admin-notifications-page">
            <aside className="admin-notifications-sidebar">
                <div className="admin-notifications-brand">
                    <div className="admin-bookings-brand">
                        <div className="admin-bookings-logo">
                            <img src={vibelyLogo} alt="Vibely Logo" />
                        </div>

                        <section>
                            <strong>VIBELY</strong>
                            <span>ADMINISTRATION</span>
                        </section>
                    </div>
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

                    <Link to="/admin/bookings">
                        <i className="bi bi-ticket-perforated"></i>
                        Bookings
                    </Link>

                    <Link to="/admin/payments">
                        <i className="bi bi-credit-card"></i>
                        Payments
                    </Link>

                    <p>ACCOUNT</p>

                    <Link
                        className="active"
                        to="/admin/notifications"
                    >
                        <i className="bi bi-bell"></i>
                        Notifications

                        {unreadCount > 0 && (
                            <span className="admin-notifications-sidebar-badge">
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                        )}
                    </Link>

                    <Link to="/admin/settings">
                        <i className="bi bi-gear"></i>
                        Settings
                    </Link>
                </nav>

                <div className="admin-notifications-sidebar-bottom">
                    <div className="admin-notifications-mini-profile">
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

            <main className="admin-notifications-main">
                <header className="admin-notifications-header">
                    <div>
                        <span>ADMIN ACTIVITY</span>
                        <h1>Notifications</h1>
                    </div>

                    <div className="admin-notifications-header-user">
                        <div className="admin-notifications-bell">
                            <i className="bi bi-bell"></i>

                            {unreadCount > 0 && (
                                <span>
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                        </div>

                        <div>
                            <span>A</span>

                            <section>
                                <strong>Administrator</strong>
                                <small>Super Admin</small>
                            </section>
                        </div>
                    </div>
                </header>

                <div className="admin-notifications-content">
                    <section className="admin-notifications-hero">
                        <div>
                            <span>VIBELY ACTIVITY CENTRE</span>

                            <h2>
                                Stay on top of what needs attention.
                            </h2>

                            <p>
                                Review provider applications, payment
                                activity, booking updates and important
                                platform alerts from one place.
                            </p>
                        </div>

                        <div className="admin-notifications-hero-art">
                            <i className="bi bi-bell"></i>
                            <span>ADMIN ALERTS</span>

                            <strong>
                                {unreadCount === 0
                                    ? "You're up to date"
                                    : `${unreadCount} Unread`}
                            </strong>
                        </div>
                    </section>

                    <section className="admin-notifications-stats">
                        <article>
                            <i className="bi bi-bell"></i>

                            <div>
                                <span>ALL ALERTS</span>
                                <strong>
                                    {notificationsWithReadState.length}
                                </strong>
                            </div>
                        </article>

                        <article>
                            <i className="bi bi-envelope"></i>

                            <div>
                                <span>UNREAD</span>
                                <strong>{unreadCount}</strong>
                            </div>
                        </article>

                        <article>
                            <i className="bi bi-person-check"></i>

                            <div>
                                <span>PROVIDER REQUESTS</span>
                                <strong>{providerCount}</strong>
                            </div>
                        </article>

                        <article>
                            <i className="bi bi-exclamation-circle"></i>

                            <div>
                                <span>NEEDS ATTENTION</span>
                                <strong>{attentionCount}</strong>
                            </div>
                        </article>
                    </section>

                    <section className="admin-notifications-panel">
                        <div className="admin-notifications-panel-heading">
                            <div>
                                <span>NOTIFICATION INBOX</span>
                                <h3>Platform activity</h3>
                            </div>

                            <div className="admin-notifications-panel-actions">
                                <button
                                    type="button"
                                    onClick={fetchNotifications}
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

                                <button
                                    type="button"
                                    onClick={markAllAsRead}
                                    disabled={
                                        loading ||
                                        notifications.length === 0 ||
                                        unreadCount === 0
                                    }
                                >
                                    <i className="bi bi-check2-all"></i>
                                    Mark all as read
                                </button>
                            </div>
                        </div>

                        <div className="admin-notifications-toolbar">
                            <div className="admin-notifications-search">
                                <i className="bi bi-search"></i>

                                <input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search notifications..."
                                />
                            </div>

                            <div className="admin-notifications-filters">
                                {[
                                    ["all", "All"],
                                    ["unread", "Unread"],
                                    ["provider", "Providers"],
                                    ["payment", "Payments"],
                                    ["booking", "Bookings"],
                                ].map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        className={
                                            filter === value ? "active" : ""
                                        }
                                        onClick={() => setFilter(value)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="admin-notifications-warning">
                                <i className="bi bi-exclamation-triangle"></i>

                                <span>{error}</span>
                            </div>
                        )}

                        {loading ? (
                            <div className="admin-notifications-empty">
                                <div>
                                    <i className="bi bi-arrow-repeat"></i>
                                </div>

                                <span>LOADING</span>

                                <h3>
                                    Checking platform activity
                                </h3>

                                <p>
                                    Vibely is gathering provider,
                                    payment and booking activity for your
                                    administration workspace.
                                </p>
                            </div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="admin-notifications-empty">
                                <div>
                                    <i className="bi bi-bell-slash"></i>
                                </div>

                                <span>NOTIFICATION DATA</span>

                                <h3>
                                    {notifications.length === 0
                                        ? "No admin alerts right now"
                                        : "No matching notifications"}
                                </h3>

                                <p>
                                    {notifications.length === 0
                                        ? "There are currently no pending provider applications, payment alerts or booking updates that need to be displayed."
                                        : "Try changing your search or notification filter."}
                                </p>

                                <div className="admin-notifications-empty-features">
                                    <section>
                                        <i className="bi bi-person-badge"></i>
                                        <strong>Providers</strong>
                                        <small>
                                            Approval requests
                                        </small>
                                    </section>

                                    <section>
                                        <i className="bi bi-credit-card"></i>
                                        <strong>Payments</strong>
                                        <small>
                                            Financial alerts
                                        </small>
                                    </section>

                                    <section>
                                        <i className="bi bi-journal-check"></i>
                                        <strong>Bookings</strong>
                                        <small>
                                            Activity updates
                                        </small>
                                    </section>
                                </div>
                            </div>
                        ) : (
                            <div className="admin-notifications-list">
                                {filteredNotifications.map(
                                    (notification) => (
                                        <article
                                            key={notification._id}
                                            className={`${notification.isRead
                                                ? ""
                                                : "unread"
                                                } ${notification.priority ===
                                                    "attention"
                                                    ? "attention"
                                                    : ""
                                                }`}
                                            onClick={() =>
                                                openNotification(notification)
                                            }
                                        >
                                            <div
                                                className={`admin-notification-icon ${notification.type || "general"
                                                    }`}
                                            >
                                                <i
                                                    className={
                                                        notification.type ===
                                                            "provider"
                                                            ? "bi bi-person-badge"
                                                            : notification.type ===
                                                                "payment"
                                                                ? "bi bi-credit-card"
                                                                : notification.type ===
                                                                    "booking"
                                                                    ? "bi bi-journal-check"
                                                                    : "bi bi-bell"
                                                    }
                                                ></i>
                                            </div>

                                            <div className="admin-notification-copy">
                                                <div>
                                                    <strong>
                                                        {notification.title}
                                                    </strong>

                                                    {!notification.isRead && (
                                                        <span>NEW</span>
                                                    )}

                                                    {notification.priority ===
                                                        "attention" && (
                                                            <span className="attention-label">
                                                                ATTENTION
                                                            </span>
                                                        )}
                                                </div>

                                                <p>
                                                    {notification.message}
                                                </p>

                                                <small>
                                                    {formatDate(
                                                        notification.createdAt
                                                    )}
                                                </small>
                                            </div>

                                            <button
                                                type="button"
                                                aria-label="View notification"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    openNotification(notification);
                                                }}
                                            >
                                                <i className="bi bi-chevron-right"></i>
                                            </button>
                                        </article>
                                    )
                                )}
                            </div>
                        )}
                    </section>

                    <section className="admin-notifications-note">
                        <i className="bi bi-info-circle"></i>

                        <div>
                            <strong>
                                Built from your existing admin data
                            </strong>

                            <p>
                                These alerts are generated from your
                                existing provider, payment and booking
                                records. Read and unread state is kept
                                locally until a dedicated notification
                                backend is added later.
                            </p>
                        </div>
                    </section>
                </div>
            </main>

            {selectedNotification && (
                <div className="admin-notification-modal-backdrop">
                    <div className="admin-notification-modal">
                        <button
                            type="button"
                            className="admin-notification-modal-close"
                            onClick={() =>
                                setSelectedNotification(null)
                            }
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>

                        <div className="admin-notification-modal-heading">
                            <div
                                className={`admin-notification-modal-icon ${selectedNotification.type || "general"
                                    }`}
                            >
                                <i
                                    className={
                                        selectedNotification.type ===
                                            "provider"
                                            ? "bi bi-person-badge"
                                            : selectedNotification.type ===
                                                "payment"
                                                ? "bi bi-credit-card"
                                                : selectedNotification.type ===
                                                    "booking"
                                                    ? "bi bi-journal-check"
                                                    : "bi bi-bell"
                                    }
                                ></i>
                            </div>

                            <section>
                                <span>
                                    {selectedNotification.type} alert
                                </span>

                                <h2>
                                    {selectedNotification.title}
                                </h2>

                                <small>
                                    {formatDate(
                                        selectedNotification.createdAt
                                    )}
                                </small>
                            </section>
                        </div>

                        {selectedNotification.priority ===
                            "attention" && (
                                <div className="admin-notification-attention">
                                    <i className="bi bi-exclamation-circle"></i>
                                    This activity may require administrator
                                    attention.
                                </div>
                            )}

                        <p className="admin-notification-modal-message">
                            {selectedNotification.message}
                        </p>

                        {selectedNotification.details && (
                            <div className="admin-notification-modal-details">
                                {Object.entries(
                                    selectedNotification.details
                                ).map(([label, value]) => (
                                    <article key={label}>
                                        <span>{label}</span>
                                        <strong>{value || "—"}</strong>
                                    </article>
                                ))}
                            </div>
                        )}

                        <div className="admin-notification-modal-footer">
                            <button
                                type="button"
                                className="secondary"
                                onClick={() =>
                                    setSelectedNotification(null)
                                }
                            >
                                Close
                            </button>

                            <button
                                type="button"
                                onClick={goToNotificationPage}
                            >
                                {selectedNotification.actionLabel ||
                                    "Open"}
                                <i className="bi bi-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminNotifications;