import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/adminPayments.css";

const AdminPayments = () => {
    const navigate = useNavigate();

    const [serviceFilter, setServiceFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");

    const [eventPayments, setEventPayments] = useState([]);
    const [apartmentPayments, setApartmentPayments] = useState([]);
    const [foodPayments, setFoodPayments] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedPayment, setSelectedPayment] = useState(null);

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
            return "—";
        }

        const fullName = `${person.firstname || ""} ${person.lastname || ""
            }`.trim();

        return fullName || person.email || "—";
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

    const fetchPayments = async () => {
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
            ]);

            setEventPayments(
                Array.isArray(eventResponse.data?.data)
                    ? eventResponse.data.data
                    : []
            );

            setApartmentPayments(
                Array.isArray(apartmentResponse.data?.data)
                    ? apartmentResponse.data.data
                    : []
            );

            setFoodPayments(
                Array.isArray(foodResponse.data?.data)
                    ? foodResponse.data.data
                    : []
            );
        } catch (error) {
            console.log("ADMIN PAYMENTS ERROR:", error);

            if (
                error.response?.status === 401 ||
                error.response?.status === 403
            ) {
                handleUnauthorized();
                return;
            }

            setError(
                error.response?.data?.message ||
                "Unable to load platform payments."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    const payments = useMemo(() => {
        const events = eventPayments.map((payment) => {
            const booking = payment.booking;

            return {
                ...payment,
                service: "event",
                reference: payment.reference || "—",
                customerName: getPersonName(payment.user),
                customerEmail: payment.user?.email || "—",
                providerName: getProviderName(
                    booking?.event?.createdBy
                ),
                providerEmail:
                    booking?.event?.createdBy?.email || "—",
                serviceTitle:
                    booking?.event?.title || "Event Payment",
                bookingReference:
                    booking?.bookingReference || "—",
                amount: payment.amount || 0,
                status: payment.status || "pending",
                createdAt: payment.createdAt,
                paidAt: payment.paidAt,
                refundAmount: payment.refundAmount || 0,
                refundReference:
                    payment.refundReference || null,
                refundReason: payment.refundReason || null,
                refundedAt: payment.refundedAt,
                rawData: payment,
            };
        });

        const apartments = apartmentPayments.map(
            (payment) => {
                const booking = payment.booking;

                return {
                    ...payment,
                    service: "apartment",
                    reference: payment.reference || "—",
                    customerName: getPersonName(payment.user),
                    customerEmail: payment.user?.email || "—",
                    providerName: getProviderName(
                        booking?.apartment?.createdBy
                    ),
                    providerEmail:
                        booking?.apartment?.createdBy?.email ||
                        "—",
                    serviceTitle:
                        booking?.apartment?.title ||
                        "Apartment Payment",
                    bookingReference:
                        booking?.bookingReference || "—",
                    amount: payment.amount || 0,
                    status: payment.status || "pending",
                    createdAt: payment.createdAt,
                    paidAt: payment.paidAt,
                    refundAmount: payment.refundAmount || 0,
                    refundReference:
                        payment.refundReference || null,
                    refundReason: payment.refundReason || null,
                    refundedAt: payment.refundedAt,
                    rawData: payment,
                };
            }
        );

        const foods = foodPayments.map((payment) => {
            const order = payment.order;

            return {
                ...payment,
                service: "food",
                reference: payment.reference || "—",
                customerName: getPersonName(payment.user),
                customerEmail: payment.user?.email || "—",
                providerName: getProviderName(order?.vendor),
                providerEmail: order?.vendor?.email || "—",
                serviceTitle: "Food Order",
                bookingReference:
                    order?.orderReference || "—",
                amount: payment.amount || 0,
                status: payment.status || "pending",
                createdAt: payment.createdAt,
                paidAt: payment.paidAt,
                refundAmount: payment.refundAmount || 0,
                refundReference:
                    payment.refundReference || null,
                refundReason: payment.refundReason || null,
                refundedAt: payment.refundedAt,
                rawData: payment,
            };
        });

        return [...events, ...apartments, ...foods].sort(
            (a, b) =>
                new Date(b.createdAt || 0) -
                new Date(a.createdAt || 0)
        );
    }, [eventPayments, apartmentPayments, foodPayments]);

    const filteredPayments = useMemo(() => {
        return payments.filter((payment) => {
            const text = `${payment.reference || ""} ${payment.bookingReference || ""
                } ${payment.customerName || ""} ${payment.customerEmail || ""
                } ${payment.providerName || ""} ${payment.serviceTitle || ""
                }`.toLowerCase();

            const serviceMatch =
                serviceFilter === "all" ||
                payment.service === serviceFilter;

            const statusMatch =
                statusFilter === "all" ||
                payment.status === statusFilter;

            return (
                text.includes(search.trim().toLowerCase()) &&
                serviceMatch &&
                statusMatch
            );
        });
    }, [payments, search, serviceFilter, statusFilter]);

    const successfulPayments = useMemo(() => {
        return payments.filter(
            (payment) => payment.status === "paid"
        );
    }, [payments]);

    const pendingPayments = useMemo(() => {
        return payments.filter((payment) =>
            ["pending", "processing"].includes(
                payment.status
            )
        );
    }, [payments]);

    const failedPayments = useMemo(() => {
        return payments.filter(
            (payment) => payment.status === "failed"
        );
    }, [payments]);

    const refundPayments = useMemo(() => {
        return payments.filter((payment) =>
            ["refund_pending", "refunded"].includes(
                payment.status
            )
        );
    }, [payments]);

    const totalPaidValue = useMemo(() => {
        return successfulPayments.reduce(
            (total, payment) =>
                total + Number(payment.amount || 0),
            0
        );
    }, [successfulPayments]);

    const totalRefundValue = useMemo(() => {
        return payments.reduce(
            (total, payment) =>
                total + Number(payment.refundAmount || 0),
            0
        );
    }, [payments]);

    const eventPaidValue = useMemo(() => {
        return eventPayments
            .filter((payment) => payment.status === "paid")
            .reduce(
                (total, payment) =>
                    total + Number(payment.amount || 0),
                0
            );
    }, [eventPayments]);

    const apartmentPaidValue = useMemo(() => {
        return apartmentPayments
            .filter((payment) => payment.status === "paid")
            .reduce(
                (total, payment) =>
                    total + Number(payment.amount || 0),
                0
            );
    }, [apartmentPayments]);

    const foodPaidValue = useMemo(() => {
        return foodPayments
            .filter((payment) => payment.status === "paid")
            .reduce(
                (total, payment) =>
                    total + Number(payment.amount || 0),
                0
            );
    }, [foodPayments]);

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

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("role");
        navigate("/admin/login");
    };

    return (
        <div className="admin-payments-page">
            <aside className="admin-payments-sidebar">
                <div className="admin-payments-brand">
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

                    <Link to="/admin/bookings">
                        <i className="bi bi-ticket-perforated"></i>
                        Bookings
                    </Link>

                    <Link
                        className="active"
                        to="/admin/payments"
                    >
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

                <div className="admin-payments-sidebar-bottom">
                    <div className="admin-payments-mini-profile">
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

            <main className="admin-payments-main">
                <header className="admin-payments-header">
                    <div>
                        <span>FINANCIAL OPERATIONS</span>
                        <h1>Payments & Revenue</h1>
                    </div>

                    <div className="admin-payments-header-user">
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

                <div className="admin-payments-content">
                    <section className="admin-payments-hero">
                        <div>
                            <span>FINANCIAL OVERVIEW</span>

                            <h2>
                                Track money moving through Vibely.
                            </h2>

                            <p>
                                Monitor successful payments, pending
                                transactions, failed payments and
                                refunds across Events, Apartments and
                                Food.
                            </p>
                        </div>

                        <div className="admin-payments-hero-art">
                            <i className="bi bi-wallet2"></i>
                            <span>PAYMENT CENTRE</span>
                            <strong>
                                {payments.length} Transactions
                            </strong>
                        </div>
                    </section>

                    <section className="admin-payments-stats">
                        <article>
                            <i className="bi bi-cash-stack"></i>

                            <div>
                                <span>PAID VALUE</span>
                                <strong>
                                    {formatCurrency(totalPaidValue)}
                                </strong>
                            </div>
                        </article>

                        <article>
                            <i className="bi bi-check2-circle"></i>

                            <div>
                                <span>SUCCESSFUL</span>
                                <strong>
                                    {successfulPayments.length}
                                </strong>
                            </div>
                        </article>

                        <article>
                            <i className="bi bi-hourglass-split"></i>

                            <div>
                                <span>PENDING</span>
                                <strong>
                                    {pendingPayments.length}
                                </strong>
                            </div>
                        </article>

                        <article>
                            <i className="bi bi-arrow-counterclockwise"></i>

                            <div>
                                <span>REFUNDS</span>
                                <strong>
                                    {formatCurrency(totalRefundValue)}
                                </strong>
                            </div>
                        </article>
                    </section>

                    <section className="admin-payments-mini-stats">
                        <div>
                            <span>FAILED</span>
                            <strong>{failedPayments.length}</strong>
                        </div>

                        <div>
                            <span>REFUND ACTIVITY</span>
                            <strong>{refundPayments.length}</strong>
                        </div>

                        <div>
                            <span>TOTAL TRANSACTIONS</span>
                            <strong>{payments.length}</strong>
                        </div>
                    </section>

                    <section className="admin-payments-services">
                        <button
                            type="button"
                            className={
                                serviceFilter === "all" ? "active" : ""
                            }
                            onClick={() => setServiceFilter("all")}
                        >
                            <i className="bi bi-grid"></i>

                            <section>
                                <span>ALL</span>
                                <strong>{payments.length}</strong>
                                <small>All Transactions</small>
                            </section>
                        </button>

                        <button
                            type="button"
                            className={
                                serviceFilter === "event"
                                    ? "active"
                                    : ""
                            }
                            onClick={() => setServiceFilter("event")}
                        >
                            <i className="bi bi-calendar-event"></i>

                            <section>
                                <span>EVENTS</span>
                                <strong>{eventPayments.length}</strong>
                                <small>
                                    {formatCurrency(eventPaidValue)}
                                </small>
                            </section>
                        </button>

                        <button
                            type="button"
                            className={
                                serviceFilter === "apartment"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                setServiceFilter("apartment")
                            }
                        >
                            <i className="bi bi-buildings"></i>

                            <section>
                                <span>APARTMENTS</span>
                                <strong>
                                    {apartmentPayments.length}
                                </strong>
                                <small>
                                    {formatCurrency(apartmentPaidValue)}
                                </small>
                            </section>
                        </button>

                        <button
                            type="button"
                            className={
                                serviceFilter === "food"
                                    ? "active"
                                    : ""
                            }
                            onClick={() => setServiceFilter("food")}
                        >
                            <i className="bi bi-basket"></i>

                            <section>
                                <span>FOOD</span>
                                <strong>{foodPayments.length}</strong>
                                <small>
                                    {formatCurrency(foodPaidValue)}
                                </small>
                            </section>
                        </button>
                    </section>

                    <section className="admin-payments-panel">
                        <div className="admin-payments-panel-heading">
                            <div>
                                <span>TRANSACTION HISTORY</span>
                                <h3>Platform payments</h3>
                            </div>

                            <button
                                type="button"
                                onClick={fetchPayments}
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

                        <div className="admin-payments-toolbar">
                            <div className="admin-payments-search">
                                <i className="bi bi-search"></i>

                                <input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search reference, customer, booking or provider..."
                                />
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(event) =>
                                    setStatusFilter(event.target.value)
                                }
                            >
                                <option value="all">
                                    All payment statuses
                                </option>

                                <option value="pending">
                                    Pending
                                </option>

                                <option value="processing">
                                    Processing
                                </option>

                                <option value="paid">
                                    Paid
                                </option>

                                <option value="failed">
                                    Failed
                                </option>

                                <option value="refund_pending">
                                    Refund Pending
                                </option>

                                <option value="refunded">
                                    Refunded
                                </option>
                            </select>
                        </div>

                        {loading ? (
                            <div className="admin-payments-empty">
                                <div>
                                    <i className="bi bi-arrow-repeat"></i>
                                </div>

                                <span>LOADING</span>

                                <h3>
                                    Fetching payment records
                                </h3>

                                <p>
                                    Please wait while Vibely loads Event,
                                    Apartment and Food payment records.
                                </p>
                            </div>
                        ) : error ? (
                            <div className="admin-payments-empty">
                                <div>
                                    <i className="bi bi-exclamation-circle"></i>
                                </div>

                                <span>UNAVAILABLE</span>

                                <h3>
                                    Unable to load payments
                                </h3>

                                <p>{error}</p>

                                <button
                                    type="button"
                                    onClick={fetchPayments}
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : filteredPayments.length === 0 ? (
                            <div className="admin-payments-empty">
                                <div>
                                    <i className="bi bi-credit-card"></i>
                                </div>

                                <span>PAYMENT DATA</span>

                                <h3>
                                    {payments.length === 0
                                        ? "No payment records yet"
                                        : "No matching transactions"}
                                </h3>

                                <p>
                                    {payments.length === 0
                                        ? "Event, Apartment and Food payment records will appear here when customers begin making payments."
                                        : "Try changing your search, service or payment status filter."}
                                </p>

                                <div className="admin-payments-empty-features">
                                    <section>
                                        <i className="bi bi-check-circle"></i>
                                        <strong>Payments</strong>
                                        <small>
                                            Successful charges
                                        </small>
                                    </section>

                                    <section>
                                        <i className="bi bi-x-circle"></i>
                                        <strong>Failures</strong>
                                        <small>
                                            Failed transactions
                                        </small>
                                    </section>

                                    <section>
                                        <i className="bi bi-arrow-return-left"></i>
                                        <strong>Refunds</strong>
                                        <small>
                                            Refund activity
                                        </small>
                                    </section>
                                </div>
                            </div>
                        ) : (
                            <div className="admin-payments-table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Reference</th>
                                            <th>Service</th>
                                            <th>Customer</th>
                                            <th>Provider</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredPayments.map(
                                            (payment) => (
                                                <tr
                                                    key={`${payment.service}-${payment._id}`}
                                                >
                                                    <td>
                                                        <strong className="admin-payment-reference">
                                                            {payment.reference}
                                                        </strong>

                                                        <small className="admin-payment-booking-reference">
                                                            {
                                                                payment.bookingReference
                                                            }
                                                        </small>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`admin-payment-service ${payment.service}`}
                                                        >
                                                            {payment.service}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <div className="admin-payment-person">
                                                            <strong>
                                                                {
                                                                    payment.customerName
                                                                }
                                                            </strong>

                                                            <span>
                                                                {
                                                                    payment.customerEmail
                                                                }
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <div className="admin-payment-person">
                                                            <strong>
                                                                {
                                                                    payment.providerName
                                                                }
                                                            </strong>

                                                            <span>
                                                                {
                                                                    payment.providerEmail
                                                                }
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <strong className="admin-payment-amount">
                                                            {formatCurrency(
                                                                payment.amount
                                                            )}
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`admin-payment-status ${payment.status ||
                                                                "pending"
                                                                }`}
                                                        >
                                                            {payment.status ||
                                                                "pending"}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        {formatDateOnly(
                                                            payment.createdAt
                                                        )}
                                                    </td>

                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="admin-payment-view"
                                                            onClick={() =>
                                                                setSelectedPayment(
                                                                    payment
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

                    <section className="admin-payments-insight">
                        <div>
                            <i className="bi bi-shield-lock"></i>

                            <section>
                                <strong>
                                    Financial data is backend-driven
                                </strong>

                                <p>
                                    Vibely calculates this page directly
                                    from your protected Event, Apartment
                                    and Food payment records. No revenue
                                    figures are manually estimated.
                                </p>
                            </section>
                        </div>

                        <div>
                            <span>PAYSTACK</span>
                            <strong>
                                {payments.length} Payment Records
                            </strong>
                        </div>
                    </section>
                </div>
            </main>

            {selectedPayment && (
                <div className="admin-payment-modal-backdrop">
                    <div className="admin-payment-modal">
                        <button
                            type="button"
                            className="admin-payment-modal-close"
                            onClick={() =>
                                setSelectedPayment(null)
                            }
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>

                        <div className="admin-payment-modal-heading">
                            <div
                                className={`admin-payment-modal-icon ${selectedPayment.service}`}
                            >
                                <i
                                    className={
                                        selectedPayment.service === "event"
                                            ? "bi bi-calendar-event"
                                            : selectedPayment.service ===
                                                "apartment"
                                                ? "bi bi-buildings"
                                                : "bi bi-basket"
                                    }
                                ></i>
                            </div>

                            <section>
                                <span>
                                    {selectedPayment.service} payment
                                </span>

                                <h2>
                                    {selectedPayment.reference}
                                </h2>

                                <p>
                                    {formatDate(
                                        selectedPayment.createdAt
                                    )}
                                </p>
                            </section>
                        </div>

                        <div className="admin-payment-modal-status-row">
                            <span
                                className={`admin-payment-status ${selectedPayment.status ||
                                    "pending"
                                    }`}
                            >
                                {selectedPayment.status ||
                                    "pending"}
                            </span>
                        </div>

                        <div className="admin-payment-modal-amount">
                            <span>TRANSACTION AMOUNT</span>

                            <strong>
                                {formatCurrency(
                                    selectedPayment.amount
                                )}
                            </strong>

                            <small>
                                {selectedPayment.serviceTitle}
                            </small>
                        </div>

                        <div className="admin-payment-modal-grid">
                            <article>
                                <span>CUSTOMER</span>

                                <strong>
                                    {selectedPayment.customerName}
                                </strong>

                                <small>
                                    {selectedPayment.customerEmail}
                                </small>
                            </article>

                            <article>
                                <span>PROVIDER</span>

                                <strong>
                                    {selectedPayment.providerName}
                                </strong>

                                <small>
                                    {selectedPayment.providerEmail}
                                </small>
                            </article>

                            <article>
                                <span>BOOKING / ORDER REF</span>

                                <strong>
                                    {selectedPayment.bookingReference}
                                </strong>
                            </article>

                            <article>
                                <span>SERVICE</span>

                                <strong>
                                    {selectedPayment.service}
                                </strong>
                            </article>

                            <article>
                                <span>CREATED</span>

                                <strong>
                                    {formatDate(
                                        selectedPayment.createdAt
                                    )}
                                </strong>
                            </article>

                            <article>
                                <span>PAID AT</span>

                                <strong>
                                    {formatDate(
                                        selectedPayment.paidAt
                                    )}
                                </strong>
                            </article>
                        </div>

                        {Number(
                            selectedPayment.refundAmount || 0
                        ) > 0 ||
                            selectedPayment.refundReference ||
                            selectedPayment.status ===
                            "refund_pending" ||
                            selectedPayment.status ===
                            "refunded" ? (
                            <div className="admin-payment-refund-box">
                                <div className="admin-payment-refund-heading">
                                    <i className="bi bi-arrow-counterclockwise"></i>

                                    <section>
                                        <span>REFUND ACTIVITY</span>
                                        <strong>
                                            Refund information
                                        </strong>
                                    </section>
                                </div>

                                <div className="admin-payment-refund-grid">
                                    <article>
                                        <span>REFUND AMOUNT</span>
                                        <strong>
                                            {formatCurrency(
                                                selectedPayment.refundAmount
                                            )}
                                        </strong>
                                    </article>

                                    <article>
                                        <span>REFUND REFERENCE</span>
                                        <strong>
                                            {selectedPayment.refundReference ||
                                                "—"}
                                        </strong>
                                    </article>

                                    <article>
                                        <span>REFUNDED AT</span>
                                        <strong>
                                            {formatDate(
                                                selectedPayment.refundedAt
                                            )}
                                        </strong>
                                    </article>
                                </div>

                                {selectedPayment.refundReason && (
                                    <div className="admin-payment-refund-reason">
                                        <span>REASON</span>
                                        <p>
                                            {
                                                selectedPayment.refundReason
                                            }
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : null}

                        <div className="admin-payment-modal-footer">
                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedPayment(null)
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

export default AdminPayments;