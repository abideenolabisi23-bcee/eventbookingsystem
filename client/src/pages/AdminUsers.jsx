import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/adminUsers.css";

const AdminUsers = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
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

  const fetchUsers = async () => {
    const accessToken = getToken();

    if (!accessToken) {
      handleUnauthorized();
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        "http://192.168.0.3:5005/api/v1/admin/users?role=user",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setUsers(
        Array.isArray(response.data?.data)
          ? response.data.data
          : []
      );
    } catch (error) {
      console.log("ADMIN USERS ERROR:", error);

      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        handleUnauthorized();
        return;
      }

      setError(
        error.response?.data?.message ||
        "Unable to load customer accounts."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const text = `${user.firstname || ""} ${user.lastname || ""
        } ${user.email || ""}`.toLowerCase();

      const matchesSearch = text.includes(
        search.trim().toLowerCase()
      );

      const accountStatus =
        user.accountStatus || "active";

      const matchesStatus =
        statusFilter === "all" ||
        accountStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [users, search, statusFilter]);

  const activeUsers = useMemo(() => {
    return users.filter(
      (user) =>
        (user.accountStatus || "active") === "active"
    ).length;
  }, [users]);

  const suspendedUsers = useMemo(() => {
    return users.filter(
      (user) => user.accountStatus === "suspended"
    ).length;
  }, [users]);

  const newUsers = useMemo(() => {
    const now = new Date();

    return users.filter((user) => {
      if (!user.createdAt) {
        return false;
      }

      const createdAt = new Date(user.createdAt);
      const difference = now - createdAt;
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      return difference >= 0 && difference <= sevenDays;
    }).length;
  }, [users]);

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    return new Intl.DateTimeFormat("en-NG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  const getInitials = (user) => {
    const first = user?.firstname?.charAt(0) || "";
    const last = user?.lastname?.charAt(0) || "";

    return `${first}${last}`.toUpperCase() || "U";
  };

  const openUser = async (userId) => {
    const accessToken = getToken();

    if (!accessToken) {
      handleUnauthorized();
      return;
    }

    try {
      setActionLoading(userId);

      const response = await axios.get(
        `http://192.168.0.3:5005/api/v1/admin/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setSelectedUser(response.data?.data || null);
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
        title: "Unable to open user",
        message:
          error.response?.data?.message ||
          "The customer details could not be loaded.",
      });
    } finally {
      setActionLoading("");
    }
  };

  const runAccountAction = async () => {
    if (!confirmAction?.user) {
      return;
    }

    const accessToken = getToken();

    if (!accessToken) {
      handleUnauthorized();
      return;
    }

    const user = confirmAction.user;
    const action = confirmAction.action;

    try {
      setActionLoading(user._id);

      const response = await axios.patch(
        `http://192.168.0.3:5005/api/v1/admin/users/${user._id}/${action}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const updatedUser = response.data?.data;

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser._id === user._id
            ? {
              ...currentUser,
              accountStatus:
                updatedUser?.accountStatus ||
                (action === "suspend"
                  ? "suspended"
                  : "active"),
            }
            : currentUser
        )
      );

      if (selectedUser?._id === user._id) {
        setSelectedUser((currentUser) => ({
          ...currentUser,
          accountStatus:
            updatedUser?.accountStatus ||
            (action === "suspend"
              ? "suspended"
              : "active"),
        }));
      }

      setConfirmAction(null);

      setFeedback({
        show: true,
        type: "success",
        title:
          action === "suspend"
            ? "Account suspended"
            : "Account reactivated",
        message:
          response.data?.message ||
          (action === "suspend"
            ? "The customer account has been suspended successfully."
            : "The customer account has been reactivated successfully."),
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
          "The account status could not be changed.",
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
    <div className="admin-users-page">
      <aside className="admin-users-sidebar">
        <div className="admin-users-brand">
          <div className="admin-users-logo">
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

          <Link className="active" to="/admin/users">
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

          <Link to="/admin/notifications">
            <i className="bi bi-bell"></i>
            Notifications
          </Link>

          <Link to="/admin/settings">
            <i className="bi bi-gear"></i>
            Settings
          </Link>
        </nav>

        <div className="admin-users-sidebar-bottom">
          <div className="admin-users-mini-profile">
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

      <main className="admin-users-main">
        <header className="admin-users-header">
          <div>
            <span>USER MANAGEMENT</span>
            <h1>Customers</h1>
          </div>

          <div className="admin-users-header-actions">
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

        <div className="admin-users-content">
          <section className="admin-users-intro">
            <div>
              <span>VIBELY CUSTOMERS</span>
              <h2>User management</h2>

              <p>
                Review customer accounts, search registered
                users and manage account access from one
                workspace.
              </p>
            </div>

            <div className="admin-users-total">
              <i className="bi bi-people"></i>

              <section>
                <span>TOTAL USERS</span>
                <strong>{users.length}</strong>
              </section>
            </div>
          </section>

          <section className="admin-users-summary">
            <article>
              <i className="bi bi-people"></i>

              <div>
                <span>ALL CUSTOMERS</span>
                <strong>{users.length}</strong>
              </div>
            </article>

            <article>
              <i className="bi bi-person-check"></i>

              <div>
                <span>ACTIVE</span>
                <strong>{activeUsers}</strong>
              </div>
            </article>

            <article>
              <i className="bi bi-person-dash"></i>

              <div>
                <span>SUSPENDED</span>
                <strong>{suspendedUsers}</strong>
              </div>
            </article>

            <article>
              <i className="bi bi-person-plus"></i>

              <div>
                <span>NEW THIS WEEK</span>
                <strong>{newUsers}</strong>
              </div>
            </article>
          </section>

          <section className="admin-users-card">
            <div className="admin-users-card-heading">
              <div>
                <span>REGISTERED ACCOUNTS</span>
                <h3>Customer directory</h3>
              </div>

              <button
                type="button"
                onClick={fetchUsers}
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

            <div className="admin-users-toolbar">
              <div className="admin-users-search">
                <i className="bi bi-search"></i>

                <input
                  type="text"
                  placeholder="Search by customer name or email..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />
              </div>

              <div className="admin-users-filters">
                {["all", "active", "suspended"].map(
                  (filter) => (
                    <button
                      type="button"
                      key={filter}
                      className={
                        statusFilter === filter
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setStatusFilter(filter)
                      }
                    >
                      {filter}
                    </button>
                  )
                )}
              </div>
            </div>

            {loading ? (
              <div className="admin-users-empty">
                <div>
                  <i className="bi bi-arrow-repeat"></i>
                </div>

                <span>LOADING</span>
                <h3>Fetching customer accounts</h3>
                <p>
                  Please wait while Vibely loads the
                  registered customers.
                </p>
              </div>
            ) : error ? (
              <div className="admin-users-empty">
                <div>
                  <i className="bi bi-exclamation-circle"></i>
                </div>

                <span>UNAVAILABLE</span>
                <h3>Unable to load customers</h3>
                <p>{error}</p>

                <button type="button" onClick={fetchUsers}>
                  Try Again
                </button>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="admin-users-empty">
                <div>
                  <i className="bi bi-people"></i>
                </div>

                <span>NO RESULTS</span>
                <h3>No customers found</h3>

                <p>
                  No customer accounts match your current
                  search or account status filter.
                </p>
              </div>
            ) : (
              <div className="admin-users-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Account</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.map((user) => {
                      const accountStatus =
                        user.accountStatus || "active";

                      return (
                        <tr key={user._id}>
                          <td>
                            <div className="admin-users-customer">
                              <div>
                                {getInitials(user)}
                              </div>

                              <section>
                                <strong>
                                  {user.firstname}{" "}
                                  {user.lastname}
                                </strong>

                                <span>Customer</span>
                              </section>
                            </div>
                          </td>

                          <td>{user.email}</td>

                          <td>
                            <span
                              className={`admin-users-status ${accountStatus}`}
                            >
                              {accountStatus}
                            </span>
                          </td>

                          <td>
                            {formatDate(user.createdAt)}
                          </td>

                          <td>
                            <span className="admin-users-role">
                              {user.role || "user"}
                            </span>
                          </td>

                          <td>
                            <div className="admin-users-actions">
                              <button
                                type="button"
                                className="view"
                                onClick={() =>
                                  openUser(user._id)
                                }
                                disabled={
                                  actionLoading === user._id
                                }
                                title="View customer"
                              >
                                <i className="bi bi-eye"></i>
                              </button>

                              {accountStatus ===
                                "suspended" ? (
                                <button
                                  type="button"
                                  className="reactivate"
                                  onClick={() =>
                                    setConfirmAction({
                                      user,
                                      action:
                                        "reactivate",
                                    })
                                  }
                                  disabled={
                                    actionLoading ===
                                    user._id
                                  }
                                  title="Reactivate customer"
                                >
                                  <i className="bi bi-person-check"></i>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="suspend"
                                  onClick={() =>
                                    setConfirmAction({
                                      user,
                                      action:
                                        "suspend",
                                    })
                                  }
                                  disabled={
                                    actionLoading ===
                                    user._id
                                  }
                                  title="Suspend customer"
                                >
                                  <i className="bi bi-person-slash"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="admin-users-note">
            <i className="bi bi-shield-check"></i>

            <div>
              <strong>Protected administration</strong>

              <p>
                Customer information and account controls
                are protected by administrator
                authentication. Suspended customers can be
                reactivated whenever access should be
                restored.
              </p>
            </div>
          </section>
        </div>
      </main>

      {selectedUser && (
        <div className="admin-users-modal-backdrop">
          <div className="admin-users-details-modal">
            <button
              type="button"
              className="admin-users-modal-close"
              onClick={() => setSelectedUser(null)}
            >
              <i className="bi bi-x-lg"></i>
            </button>

            <div className="admin-users-modal-avatar">
              {getInitials(selectedUser)}
            </div>

            <span className="admin-users-modal-label">
              CUSTOMER ACCOUNT
            </span>

            <h2>
              {selectedUser.firstname}{" "}
              {selectedUser.lastname}
            </h2>

            <p className="admin-users-modal-email">
              {selectedUser.email}
            </p>

            <div className="admin-users-detail-grid">
              <article>
                <span>ROLE</span>
                <strong>
                  {selectedUser.role || "user"}
                </strong>
              </article>

              <article>
                <span>ACCOUNT STATUS</span>
                <strong>
                  {selectedUser.accountStatus ||
                    "active"}
                </strong>
              </article>

              <article>
                <span>JOINED</span>
                <strong>
                  {formatDate(selectedUser.createdAt)}
                </strong>
              </article>

              <article>
                <span>LAST UPDATED</span>
                <strong>
                  {formatDate(selectedUser.updatedAt)}
                </strong>
              </article>
            </div>

            <div className="admin-users-modal-footer">
              <button
                type="button"
                className="secondary"
                onClick={() => setSelectedUser(null)}
              >
                Close
              </button>

              {(selectedUser.accountStatus ||
                "active") === "suspended" ? (
                <button
                  type="button"
                  className="reactivate"
                  onClick={() =>
                    setConfirmAction({
                      user: selectedUser,
                      action: "reactivate",
                    })
                  }
                >
                  Reactivate Account
                </button>
              ) : (
                <button
                  type="button"
                  className="suspend"
                  onClick={() =>
                    setConfirmAction({
                      user: selectedUser,
                      action: "suspend",
                    })
                  }
                >
                  Suspend Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="admin-users-modal-backdrop admin-users-confirm-backdrop">
          <div className="admin-users-confirm-modal">
            <div
              className={`admin-users-confirm-icon ${confirmAction.action
                }`}
            >
              <i
                className={
                  confirmAction.action === "suspend"
                    ? "bi bi-person-slash"
                    : "bi bi-person-check"
                }
              ></i>
            </div>

            <span>CONFIRM ACTION</span>

            <h3>
              {confirmAction.action === "suspend"
                ? "Suspend this customer?"
                : "Reactivate this customer?"}
            </h3>

            <p>
              {confirmAction.action === "suspend"
                ? `${confirmAction.user.firstname} ${confirmAction.user.lastname} will lose account access until an administrator reactivates the account.`
                : `${confirmAction.user.firstname} ${confirmAction.user.lastname} will regain access to their Vibely account.`}
            </p>

            <div className="admin-users-confirm-actions">
              <button
                type="button"
                className="cancel"
                onClick={() =>
                  setConfirmAction(null)
                }
                disabled={Boolean(actionLoading)}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  confirmAction.action === "suspend"
                    ? "suspend"
                    : "reactivate"
                }
                onClick={runAccountAction}
                disabled={Boolean(actionLoading)}
              >
                {actionLoading
                  ? "Please wait..."
                  : confirmAction.action ===
                    "suspend"
                    ? "Yes, Suspend"
                    : "Yes, Reactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {feedback.show && (
        <div className="admin-users-feedback-wrap">
          <div
            className={`admin-users-feedback ${feedback.type}`}
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

export default AdminUsers;