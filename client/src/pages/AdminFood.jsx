import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import vibelyLogo from "../assets/vibely-logo.png";

import "../styles/adminFood.css";

const AdminFood = () => {
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState("menu");
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [orderFilter, setOrderFilter] = useState("all");

    const [foods, setFoods] = useState([]);
    const [orders, setOrders] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [selectedFood, setSelectedFood] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const [detailsLoading, setDetailsLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState("");

    const [confirmAction, setConfirmAction] = useState(null);

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

    const getHeaders = () => {
        return {
            Authorization: `Bearer ${getToken()}`,
        };
    };

    const fetchFoodData = async () => {
        const accessToken = getToken();

        if (!accessToken) {
            handleUnauthorized();
            return;
        }

        try {
            setLoading(true);
            setError("");

            const [foodsResponse, ordersResponse] =
                await Promise.all([
                    axios.get(
                        "http://https://eventbookingsystem-sooty.vercel.app/api/v1/admin/foods",
                        {
                            headers: getHeaders(),
                        }
                    ),
                    axios.get(
                        "http://https://eventbookingsystem-sooty.vercel.app/api/v1/admin/food-orders",
                        {
                            headers: getHeaders(),
                        }
                    ),
                ]);

            setFoods(
                Array.isArray(foodsResponse.data?.data)
                    ? foodsResponse.data.data
                    : []
            );

            setOrders(
                Array.isArray(ordersResponse.data?.data)
                    ? ordersResponse.data.data
                    : []
            );
        } catch (error) {
            console.log("ADMIN FOOD ERROR:", error);

            if (
                error.response?.status === 401 ||
                error.response?.status === 403
            ) {
                handleUnauthorized();
                return;
            }

            setError(
                error.response?.data?.message ||
                "Unable to load food marketplace data."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFoodData();
    }, []);

    const filteredFoods = useMemo(() => {
        return foods.filter((food) => {
            const text = `${food.name || ""} ${food.category || ""
                } ${food.createdBy?.businessName || ""} ${food.createdBy?.firstname || ""
                } ${food.createdBy?.lastname || ""
                }`.toLowerCase();

            return (
                text.includes(search.trim().toLowerCase()) &&
                (categoryFilter === "all" ||
                    food.category === categoryFilter)
            );
        });
    }, [foods, search, categoryFilter]);

    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            const text = `${order.orderReference || ""} ${order.vendor?.businessName || ""
                } ${order.vendor?.firstname || ""} ${order.user?.firstname || ""
                } ${order.user?.lastname || ""}`.toLowerCase();

            return (
                text.includes(search.trim().toLowerCase()) &&
                (orderFilter === "all" ||
                    order.orderStatus === orderFilter)
            );
        });
    }, [orders, search, orderFilter]);

    const availableFoods = useMemo(() => {
        return foods.filter((food) => food.isAvailable).length;
    }, [foods]);

    const soldOutFoods = useMemo(() => {
        return foods.filter(
            (food) => Number(food.quantity || 0) <= 0
        ).length;
    }, [foods]);

    const vendorCount = useMemo(() => {
        const vendorIds = new Set();

        foods.forEach((food) => {
            if (food.createdBy?._id) {
                vendorIds.add(food.createdBy._id);
            }
        });

        orders.forEach((order) => {
            if (order.vendor?._id) {
                vendorIds.add(order.vendor._id);
            }
        });

        return vendorIds.size;
    }, [foods, orders]);

    const activeOrders = useMemo(() => {
        return orders.filter((order) =>
            ["pending", "packing", "ready"].includes(
                order.orderStatus
            )
        ).length;
    }, [orders]);

    const paidOrders = useMemo(() => {
        return orders.filter(
            (order) => order.paymentStatus === "paid"
        ).length;
    }, [orders]);

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

    const getVendorName = (vendor) => {
        if (!vendor) {
            return "—";
        }

        if (vendor.businessName) {
            return vendor.businessName;
        }

        const fullName = `${vendor.firstname || ""} ${vendor.lastname || ""
            }`.trim();

        return fullName || "—";
    };

    const openFoodDetails = async (foodId) => {
        const accessToken = getToken();

        if (!accessToken) {
            handleUnauthorized();
            return;
        }

        try {
            setDetailsLoading(true);

            const response = await axios.get(
                `http://https://eventbookingsystem-sooty.vercel.app/api/v1/admin/foods/${foodId}`,
                {
                    headers: getHeaders(),
                }
            );

            setSelectedFood(response.data?.data || null);
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
                title: "Unable to open food",
                message:
                    error.response?.data?.message ||
                    "The food details could not be loaded.",
            });
        } finally {
            setDetailsLoading(false);
        }
    };

    const openOrderDetails = (order) => {
        setSelectedOrder(order);
    };

    const runFoodAction = async () => {
        if (!confirmAction?.food) {
            return;
        }

        const accessToken = getToken();

        if (!accessToken) {
            handleUnauthorized();
            return;
        }

        const food = confirmAction.food;
        const action = confirmAction.action;

        try {
            setActionLoading(food._id);

            const response = await axios.patch(
                `http://https://eventbookingsystem-sooty.vercel.app/api/v1/admin/foods/${food._id}/${action}`,
                {},
                {
                    headers: getHeaders(),
                }
            );

            const newAvailability = action === "enable";

            setFoods((currentFoods) =>
                currentFoods.map((currentFood) =>
                    currentFood._id === food._id
                        ? {
                            ...currentFood,
                            isAvailable: newAvailability,
                        }
                        : currentFood
                )
            );

            if (selectedFood?._id === food._id) {
                setSelectedFood((currentFood) => ({
                    ...currentFood,
                    isAvailable: newAvailability,
                }));
            }

            setConfirmAction(null);

            setFeedback({
                show: true,
                type: "success",
                title:
                    action === "disable"
                        ? "Food listing disabled"
                        : "Food listing restored",
                message:
                    response.data?.message ||
                    (action === "disable"
                        ? "The food listing has been disabled successfully."
                        : "The food listing has been enabled successfully."),
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
                    "The food listing status could not be changed.",
            });
        } finally {
            setActionLoading("");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("role");
        navigate("/admin/login");
    };

    return (
        <div className="admin-food-page">
            <aside className="admin-food-sidebar">
                <div className="admin-food-brand">
                    <div className="admin-food-logo">
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

                    <Link className="active" to="/admin/food">
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

                <div className="admin-food-sidebar-bottom">
                    <div className="admin-food-mini-profile">
                        <div>A</div>

                        <section>
                            <strong>Vibely Admin</strong>
                            <span>Administrator</span>
                        </section>
                    </div>

                    <button type="button" onClick={handleLogout}>
                        <i className="bi bi-box-arrow-right"></i>
                        Logout
                    </button>
                </div>
            </aside>

            <main className="admin-food-main">
                <header className="admin-food-header">
                    <div>
                        <span>FOOD MANAGEMENT</span>
                        <h1>Food & Orders</h1>
                    </div>

                    <div className="admin-food-header-user">
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

                <div className="admin-food-content">
                    <section className="admin-food-hero">
                        <div>
                            <span>VIBELY FOOD</span>

                            <h2>
                                Oversee menus, vendors and customer
                                orders.
                            </h2>

                            <p>
                                Keep track of food listings, stock,
                                approved vendors and customer orders
                                across the Vibely marketplace.
                            </p>
                        </div>

                        <div className="admin-food-hero-art">
                            <i className="bi bi-basket2"></i>
                            <span>FOOD OPERATIONS</span>
                            <strong>
                                {foods.length} Menu Items
                            </strong>
                        </div>
                    </section>

                    <section className="admin-food-stats">
                        <article>
                            <i className="bi bi-basket"></i>

                            <div>
                                <span>MENU ITEMS</span>
                                <strong>{foods.length}</strong>
                            </div>
                        </article>

                        <article>
                            <i className="bi bi-shop"></i>

                            <div>
                                <span>FOOD VENDORS</span>
                                <strong>{vendorCount}</strong>
                            </div>
                        </article>

                        <article>
                            <i className="bi bi-bag-check"></i>

                            <div>
                                <span>TOTAL ORDERS</span>
                                <strong>{orders.length}</strong>
                            </div>
                        </article>

                        <article>
                            <i className="bi bi-clock-history"></i>

                            <div>
                                <span>ACTIVE ORDERS</span>
                                <strong>{activeOrders}</strong>
                            </div>
                        </article>
                    </section>

                    <section className="admin-food-mini-stats">
                        <div>
                            <span>AVAILABLE ITEMS</span>
                            <strong>{availableFoods}</strong>
                        </div>

                        <div>
                            <span>SOLD OUT</span>
                            <strong>{soldOutFoods}</strong>
                        </div>

                        <div>
                            <span>PAID ORDERS</span>
                            <strong>{paidOrders}</strong>
                        </div>
                    </section>

                    <section className="admin-food-panel">
                        <div className="admin-food-panel-heading">
                            <div>
                                <span>FOOD OPERATIONS</span>
                                <h3>Marketplace directory</h3>
                            </div>

                            <button
                                type="button"
                                onClick={fetchFoodData}
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

                        <div className="admin-food-tabs">
                            <button
                                type="button"
                                className={
                                    activeTab === "menu" ? "active" : ""
                                }
                                onClick={() => {
                                    setActiveTab("menu");
                                    setSearch("");
                                }}
                            >
                                <i className="bi bi-grid"></i>
                                Menu Listings
                                <span>{foods.length}</span>
                            </button>

                            <button
                                type="button"
                                className={
                                    activeTab === "orders" ? "active" : ""
                                }
                                onClick={() => {
                                    setActiveTab("orders");
                                    setSearch("");
                                }}
                            >
                                <i className="bi bi-receipt"></i>
                                Customer Orders
                                <span>{orders.length}</span>
                            </button>
                        </div>

                        {loading ? (
                            <div className="admin-food-empty">
                                <div>
                                    <i className="bi bi-arrow-repeat"></i>
                                </div>

                                <span>LOADING</span>
                                <h3>Fetching marketplace data</h3>

                                <p>
                                    Please wait while Vibely loads food
                                    listings and customer orders.
                                </p>
                            </div>
                        ) : error ? (
                            <div className="admin-food-empty">
                                <div>
                                    <i className="bi bi-exclamation-circle"></i>
                                </div>

                                <span>UNAVAILABLE</span>
                                <h3>Unable to load food data</h3>

                                <p>{error}</p>

                                <button
                                    type="button"
                                    onClick={fetchFoodData}
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : activeTab === "menu" ? (
                            <>
                                <div className="admin-food-toolbar">
                                    <div className="admin-food-search">
                                        <i className="bi bi-search"></i>

                                        <input
                                            value={search}
                                            onChange={(event) =>
                                                setSearch(event.target.value)
                                            }
                                            placeholder="Search food, category or vendor..."
                                        />
                                    </div>

                                    <select
                                        value={categoryFilter}
                                        onChange={(event) =>
                                            setCategoryFilter(
                                                event.target.value
                                            )
                                        }
                                    >
                                        <option value="all">
                                            All categories
                                        </option>
                                        <option value="rice">Rice</option>
                                        <option value="swallow">
                                            Swallow
                                        </option>
                                        <option value="snacks">
                                            Snacks
                                        </option>
                                        <option value="drinks">
                                            Drinks
                                        </option>
                                        <option value="grills">
                                            Grills
                                        </option>
                                        <option value="others">
                                            Others
                                        </option>
                                    </select>
                                </div>

                                {filteredFoods.length === 0 ? (
                                    <div className="admin-food-empty">
                                        <div>
                                            <i className="bi bi-basket2"></i>
                                        </div>

                                        <span>MENU DATA</span>

                                        <h3>
                                            {foods.length === 0
                                                ? "No food listings yet"
                                                : "No matching food items"}
                                        </h3>

                                        <p>
                                            {foods.length === 0
                                                ? "Food listings created by approved vendors will appear here."
                                                : "No food item matches your current search or category filter."}
                                        </p>

                                        <div className="admin-food-empty-features">
                                            <section>
                                                <i className="bi bi-shop"></i>
                                                <strong>Vendors</strong>
                                                <small>
                                                    Review providers
                                                </small>
                                            </section>

                                            <section>
                                                <i className="bi bi-box-seam"></i>
                                                <strong>Stock</strong>
                                                <small>
                                                    Monitor quantity
                                                </small>
                                            </section>

                                            <section>
                                                <i className="bi bi-eye"></i>
                                                <strong>Listings</strong>
                                                <small>
                                                    Review menu items
                                                </small>
                                            </section>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="admin-food-table-wrap">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Food</th>
                                                    <th>Vendor</th>
                                                    <th>Category</th>
                                                    <th>Price</th>
                                                    <th>Stock</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {filteredFoods.map((food) => (
                                                    <tr key={food._id}>
                                                        <td>
                                                            <div className="admin-food-item">
                                                                <div>
                                                                    {food.image ? (
                                                                        <img
                                                                            src={food.image}
                                                                            alt={food.name}
                                                                        />
                                                                    ) : (
                                                                        <i className="bi bi-basket"></i>
                                                                    )}
                                                                </div>

                                                                <section>
                                                                    <strong>
                                                                        {food.name}
                                                                    </strong>

                                                                    <span>
                                                                        {Number(
                                                                            food.quantity || 0
                                                                        ) <= 0
                                                                            ? "Sold out"
                                                                            : `${food.quantity} in stock`}
                                                                    </span>
                                                                </section>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            <div className="admin-food-vendor">
                                                                <strong>
                                                                    {getVendorName(
                                                                        food.createdBy
                                                                    )}
                                                                </strong>

                                                                <span>
                                                                    {food.createdBy
                                                                        ?.email || "—"}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            <span className="admin-food-category">
                                                                {food.category}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            {formatCurrency(
                                                                food.price
                                                            )}
                                                        </td>

                                                        <td>{food.quantity}</td>

                                                        <td>
                                                            <span
                                                                className={`admin-food-status ${food.isAvailable
                                                                    ? "available"
                                                                    : "unavailable"
                                                                    }`}
                                                            >
                                                                {food.isAvailable
                                                                    ? "Available"
                                                                    : "Unavailable"}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <div className="admin-food-actions">
                                                                <button
                                                                    type="button"
                                                                    className="view"
                                                                    disabled={
                                                                        detailsLoading
                                                                    }
                                                                    onClick={() =>
                                                                        openFoodDetails(
                                                                            food._id
                                                                        )
                                                                    }
                                                                >
                                                                    View
                                                                </button>

                                                                {food.isAvailable ? (
                                                                    <button
                                                                        type="button"
                                                                        className="disable"
                                                                        title="Disable food"
                                                                        disabled={
                                                                            actionLoading ===
                                                                            food._id
                                                                        }
                                                                        onClick={() =>
                                                                            setConfirmAction({
                                                                                food,
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
                                                                        title="Enable food"
                                                                        disabled={
                                                                            actionLoading ===
                                                                            food._id
                                                                        }
                                                                        onClick={() =>
                                                                            setConfirmAction({
                                                                                food,
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
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="admin-food-toolbar">
                                    <div className="admin-food-search">
                                        <i className="bi bi-search"></i>

                                        <input
                                            value={search}
                                            onChange={(event) =>
                                                setSearch(event.target.value)
                                            }
                                            placeholder="Search order, customer or vendor..."
                                        />
                                    </div>

                                    <select
                                        value={orderFilter}
                                        onChange={(event) =>
                                            setOrderFilter(
                                                event.target.value
                                            )
                                        }
                                    >
                                        <option value="all">
                                            All order statuses
                                        </option>
                                        <option value="pending">
                                            Pending
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

                                {filteredOrders.length === 0 ? (
                                    <div className="admin-food-empty">
                                        <div>
                                            <i className="bi bi-receipt"></i>
                                        </div>

                                        <span>ORDER DATA</span>

                                        <h3>
                                            {orders.length === 0
                                                ? "No customer food orders yet"
                                                : "No matching orders"}
                                        </h3>

                                        <p>
                                            {orders.length === 0
                                                ? "Customer food orders will appear here once orders are placed."
                                                : "No order matches your current search or order status filter."}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="admin-food-table-wrap">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Reference</th>
                                                    <th>Customer</th>
                                                    <th>Vendor</th>
                                                    <th>Amount</th>
                                                    <th>Payment</th>
                                                    <th>Order Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {filteredOrders.map(
                                                    (order) => (
                                                        <tr key={order._id}>
                                                            <td>
                                                                <strong className="admin-order-reference">
                                                                    {order.orderReference}
                                                                </strong>
                                                            </td>

                                                            <td>
                                                                <div className="admin-order-person">
                                                                    <strong>
                                                                        {order.user
                                                                            ? `${order.user
                                                                                .firstname ||
                                                                                ""
                                                                                } ${order.user
                                                                                    .lastname ||
                                                                                ""
                                                                                }`.trim()
                                                                            : "—"}
                                                                    </strong>

                                                                    <span>
                                                                        {order.user
                                                                            ?.email || "—"}
                                                                    </span>
                                                                </div>
                                                            </td>

                                                            <td>
                                                                <div className="admin-order-person">
                                                                    <strong>
                                                                        {getVendorName(
                                                                            order.vendor
                                                                        )}
                                                                    </strong>

                                                                    <span>
                                                                        {order.vendor
                                                                            ?.email || "—"}
                                                                    </span>
                                                                </div>
                                                            </td>

                                                            <td>
                                                                {formatCurrency(
                                                                    order.totalAmount
                                                                )}
                                                            </td>

                                                            <td>
                                                                <span
                                                                    className={`admin-food-payment ${order.paymentStatus ||
                                                                        "pending"
                                                                        }`}
                                                                >
                                                                    {order.paymentStatus ||
                                                                        "pending"}
                                                                </span>
                                                            </td>

                                                            <td>
                                                                <span
                                                                    className={`admin-food-order-status ${order.orderStatus ||
                                                                        "pending"
                                                                        }`}
                                                                >
                                                                    {order.orderStatus ||
                                                                        "pending"}
                                                                </span>
                                                            </td>

                                                            <td>
                                                                <button
                                                                    type="button"
                                                                    className="admin-food-order-view"
                                                                    onClick={() =>
                                                                        openOrderDetails(
                                                                            order
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
                            </>
                        )}
                    </section>

                    <section className="admin-food-note">
                        <i className="bi bi-shield-check"></i>

                        <div>
                            <strong>Admin food controls</strong>

                            <p>
                                Administrators can review food listings
                                from all vendors, monitor customer orders
                                and disable or restore marketplace items
                                without affecting the vendor's account.
                            </p>
                        </div>
                    </section>
                </div>
            </main>

            {selectedFood && (
                <div className="admin-food-modal-backdrop">
                    <div className="admin-food-details-modal">
                        <button
                            type="button"
                            className="admin-food-modal-close"
                            onClick={() => setSelectedFood(null)}
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>

                        <div className="admin-food-modal-image">
                            {selectedFood.image ? (
                                <img
                                    src={selectedFood.image}
                                    alt={selectedFood.name}
                                />
                            ) : (
                                <i className="bi bi-basket2"></i>
                            )}

                            <span
                                className={`admin-food-modal-status ${selectedFood.isAvailable
                                    ? "available"
                                    : "unavailable"
                                    }`}
                            >
                                {selectedFood.isAvailable
                                    ? "Available"
                                    : "Unavailable"}
                            </span>
                        </div>

                        <span className="admin-food-modal-label">
                            MENU ITEM
                        </span>

                        <h2>{selectedFood.name}</h2>

                        <p className="admin-food-modal-description">
                            {selectedFood.description ||
                                "No food description provided."}
                        </p>

                        <div className="admin-food-detail-grid">
                            <article>
                                <span>VENDOR</span>
                                <strong>
                                    {getVendorName(
                                        selectedFood.createdBy
                                    )}
                                </strong>
                            </article>

                            <article>
                                <span>CATEGORY</span>
                                <strong>
                                    {selectedFood.category || "—"}
                                </strong>
                            </article>

                            <article>
                                <span>PRICE</span>
                                <strong>
                                    {formatCurrency(
                                        selectedFood.price
                                    )}
                                </strong>
                            </article>

                            <article>
                                <span>STOCK</span>
                                <strong>
                                    {selectedFood.quantity ?? 0}
                                </strong>
                            </article>
                        </div>

                        <div className="admin-food-modal-footer">
                            <button
                                type="button"
                                className="close"
                                onClick={() =>
                                    setSelectedFood(null)
                                }
                            >
                                Close
                            </button>

                            {selectedFood.isAvailable ? (
                                <button
                                    type="button"
                                    className="disable"
                                    onClick={() =>
                                        setConfirmAction({
                                            food: selectedFood,
                                            action: "disable",
                                        })
                                    }
                                >
                                    <i className="bi bi-slash-circle"></i>
                                    Disable Listing
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="enable"
                                    onClick={() =>
                                        setConfirmAction({
                                            food: selectedFood,
                                            action: "enable",
                                        })
                                    }
                                >
                                    <i className="bi bi-check-circle"></i>
                                    Enable Listing
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {selectedOrder && (
                <div className="admin-food-modal-backdrop">
                    <div className="admin-order-details-modal">
                        <button
                            type="button"
                            className="admin-food-modal-close"
                            onClick={() =>
                                setSelectedOrder(null)
                            }
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>

                        <div className="admin-order-modal-top">
                            <div>
                                <i className="bi bi-receipt"></i>
                            </div>

                            <section>
                                <span>FOOD ORDER</span>
                                <h2>
                                    {selectedOrder.orderReference}
                                </h2>

                                <p>
                                    {formatDate(
                                        selectedOrder.createdAt
                                    )}
                                </p>
                            </section>
                        </div>

                        <div className="admin-order-status-row">
                            <span
                                className={`admin-food-payment ${selectedOrder.paymentStatus ||
                                    "pending"
                                    }`}
                            >
                                Payment:{" "}
                                {selectedOrder.paymentStatus ||
                                    "pending"}
                            </span>

                            <span
                                className={`admin-food-order-status ${selectedOrder.orderStatus ||
                                    "pending"
                                    }`}
                            >
                                Order:{" "}
                                {selectedOrder.orderStatus ||
                                    "pending"}
                            </span>
                        </div>

                        <div className="admin-food-detail-grid">
                            <article>
                                <span>CUSTOMER</span>
                                <strong>
                                    {selectedOrder.user
                                        ? `${selectedOrder.user.firstname ||
                                            ""
                                            } ${selectedOrder.user.lastname ||
                                            ""
                                            }`.trim()
                                        : "—"}
                                </strong>
                            </article>

                            <article>
                                <span>VENDOR</span>
                                <strong>
                                    {getVendorName(
                                        selectedOrder.vendor
                                    )}
                                </strong>
                            </article>

                            <article>
                                <span>TOTAL AMOUNT</span>
                                <strong>
                                    {formatCurrency(
                                        selectedOrder.totalAmount
                                    )}
                                </strong>
                            </article>

                            <article>
                                <span>PICKUP CODE</span>
                                <strong>
                                    {selectedOrder.pickupCode || "—"}
                                </strong>
                            </article>
                        </div>

                        <div className="admin-order-items">
                            <span>ORDER ITEMS</span>

                            {Array.isArray(selectedOrder.items) &&
                                selectedOrder.items.length > 0 ? (
                                selectedOrder.items.map(
                                    (item, index) => (
                                        <div
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
                                                    Qty {item.quantity}
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
                        </div>

                        <div className="admin-order-modal-footer">
                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedOrder(null)
                                }
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmAction && (
                <div className="admin-food-modal-backdrop admin-food-confirm-backdrop">
                    <div className="admin-food-confirm-modal">
                        <div
                            className={`admin-food-confirm-icon ${confirmAction.action}`}
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
                                ? "Disable this food listing?"
                                : "Restore this food listing?"}
                        </h3>

                        <p>
                            {confirmAction.action === "disable"
                                ? `"${confirmAction.food.name}" will become unavailable to customers until it is enabled again.`
                                : `"${confirmAction.food.name}" will become available to customers again.`}
                        </p>

                        <div className="admin-food-confirm-actions">
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
                                onClick={runFoodAction}
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
                <div className="admin-food-feedback-wrap">
                    <div
                        className={`admin-food-feedback ${feedback.type}`}
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

export default AdminFood;