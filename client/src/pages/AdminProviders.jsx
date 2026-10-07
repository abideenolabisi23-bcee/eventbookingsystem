import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/adminProviders.css";

const AdminProviders = () => {
  const navigate = useNavigate();

  const [providers, setProviders] = useState([]);
  const [activeStatus, setActiveStatus] = useState("pending");
  const [providerType, setProviderType] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedProviderStats, setSelectedProviderStats] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState("");
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

  const fetchProviders = async () => {
    const accessToken = getToken();

    if (!accessToken) {
      handleUnauthorized();
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        "http://192.168.0.3:5005/api/v1/admin/providers",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setProviders(
        Array.isArray(response.data?.data)
          ? response.data.data
          : []
      );
    } catch (error) {
      console.log("ADMIN PROVIDERS ERROR:", error);

      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        handleUnauthorized();
        return;
      }

      setError(
        error.response?.data?.message ||
        "Unable to load providers."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const counts = useMemo(() => {
    const pending = providers.filter(
      (provider) => provider.approvalStatus === "pending"
    ).length;

    const approved = providers.filter(
      (provider) =>
        provider.approvalStatus === "approved" &&
        provider.accountStatus !== "suspended"
    ).length;

    const suspended = providers.filter(
      (provider) =>
        provider.approvalStatus === "approved" &&
        provider.accountStatus === "suspended"
    ).length;

    const rejected = providers.filter(
      (provider) => provider.approvalStatus === "rejected"
    ).length;

    const organizers = providers.filter(
      (provider) => provider.role === "organizer"
    ).length;

    const foodVendors = providers.filter(
      (provider) => provider.role === "food_vendor"
    ).length;

    return {
      pending,
      approved,
      suspended,
      rejected,
      organizers,
      foodVendors,
    };
  }, [providers]);

  const filteredProviders = useMemo(() => {
    return providers.filter((provider) => {
      const text = `${provider.firstname || ""} ${provider.lastname || ""
        } ${provider.businessName || ""} ${provider.email || ""
        }`.toLowerCase();

      const matchesSearch = text.includes(
        search.trim().toLowerCase()
      );

      const matchesType =
        providerType === "all" ||
        provider.role === providerType;

      let matchesStatus = false;

      if (activeStatus === "pending") {
        matchesStatus =
          provider.approvalStatus === "pending";
      }

      if (activeStatus === "approved") {
        matchesStatus =
          provider.approvalStatus === "approved" &&
          provider.accountStatus !== "suspended";
      }

      if (activeStatus === "suspended") {
        matchesStatus =
          provider.approvalStatus === "approved" &&
          provider.accountStatus === "suspended";
      }

      if (activeStatus === "rejected") {
        matchesStatus =
          provider.approvalStatus === "rejected";
      }

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus
      );
    });
  }, [
    providers,
    activeStatus,
    providerType,
    search,
  ]);

  const getInitials = (provider) => {
    const first =
      provider?.firstname?.charAt(0) || "";

    const last =
      provider?.lastname?.charAt(0) || "";

    return `${first}${last}`.toUpperCase() || "P";
  };

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

  const formatRole = (role) => {
    if (role === "food_vendor") {
      return "Food Vendor";
    }

    if (role === "organizer") {
      return "Organizer";
    }

    return role || "Provider";
  };

  const formatStatus = (status) => {
    if (!status) {
      return "Active";
    }

    return (
      status.charAt(0).toUpperCase() +
      status.slice(1)
    );
  };

  const getStatusTitle = () => {
    if (activeStatus === "pending") {
      return "Pending applications";
    }

    if (activeStatus === "approved") {
      return "Approved providers";
    }

    if (activeStatus === "suspended") {
      return "Suspended providers";
    }

    return "Rejected applications";
  };

  const getStatusDescription = () => {
    if (activeStatus === "pending") {
      return "Review organizer and food vendor applications waiting for approval.";
    }

    if (activeStatus === "approved") {
      return "Manage approved organizers and food vendors currently active on Vibely.";
    }

    if (activeStatus === "suspended") {
      return "Review providers whose access has been suspended or removed.";
    }

    return "Review provider applications that were rejected by an administrator.";
  };

  const openProviderDetails = async (provider) => {
    const accessToken = getToken();

    if (!accessToken) {
      handleUnauthorized();
      return;
    }

    try {
      setSelectedProvider(provider);
      setSelectedProviderStats(null);
      setDetailsLoading(true);

      const response = await axios.get(
        `http://192.168.0.3:5005/api/v1/admin/providers/${provider._id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data?.data?.provider) {
        setSelectedProvider(
          response.data.data.provider
        );

        setSelectedProviderStats(
          response.data.data.statistics || null
        );
      }
    } catch (error) {
      console.log(
        "ADMIN PROVIDER DETAILS ERROR:",
        error
      );

      if (
        error.response?.status === 401 ||
        error.response?.status === 403
      ) {
        handleUnauthorized();
        return;
      }

      setSelectedProvider(null);

      setFeedback({
        show: true,
        type: "error",
        title: "Unable to open provider",
        message:
          error.response?.data?.message ||
          "Provider details could not be loaded.",
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const runProviderAction = async () => {
    if (!confirmAction?.provider) {
      return;
    }

    const accessToken = getToken();

    if (!accessToken) {
      handleUnauthorized();
      return;
    }

    const provider = confirmAction.provider;
    const action = confirmAction.action;

    try {
      setActionLoading(provider._id);

      let response;

      if (
        action === "approve" ||
        action === "reject"
      ) {
        response = await axios.patch(
          `http://192.168.0.3:5005/api/v1/admin/providers/${provider._id}/${action}`,
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
      }

      if (action === "suspend") {
        response = await axios.patch(
          `http://192.168.0.3:5005/api/v1/admin/users/${provider._id}/suspend`,
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
      }

      if (action === "reactivate") {
        response = await axios.patch(
          `http://192.168.0.3:5005/api/v1/admin/users/${provider._id}/reactivate`,
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
      }

      if (action === "remove") {
        response = await axios.delete(
          `http://192.168.0.3:5005/api/v1/admin/providers/${provider._id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
      }

      setConfirmAction(null);
      setSelectedProvider(null);
      setSelectedProviderStats(null);

      await fetchProviders();

      const feedbackContent = {
        approve: {
          title: "Provider approved",
          message: `${provider.firstname} ${provider.lastname} has been approved successfully.`,
        },
        reject: {
          title: "Application rejected",
          message: `${provider.firstname} ${provider.lastname}'s application has been rejected.`,
        },
        suspend: {
          title: "Provider suspended",
          message: `${provider.firstname} ${provider.lastname}'s access has been suspended.`,
        },
        reactivate: {
          title: "Provider reactivated",
          message: `${provider.firstname} ${provider.lastname}'s access has been restored.`,
        },
        remove: {
          title: "Provider access removed",
          message: `${provider.firstname} ${provider.lastname} no longer has active provider access.`,
        },
      };

      setFeedback({
        show: true,
        type: "success",
        title:
          feedbackContent[action]?.title ||
          "Action completed",
        message:
          response?.data?.message ||
          feedbackContent[action]?.message ||
          "The provider was updated successfully.",
      });
    } catch (error) {
      console.log(
        "ADMIN PROVIDER ACTION ERROR:",
        error
      );

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
          "The provider could not be updated.",
      });
    } finally {
      setActionLoading("");
    }
  };

  const getConfirmContent = () => {
    if (!confirmAction) {
      return {};
    }

    const provider = confirmAction.provider;
    const name = `${provider.firstname} ${provider.lastname}`;

    if (confirmAction.action === "approve") {
      return {
        icon: "bi bi-check-circle",
        label: "CONFIRM APPROVAL",
        title: "Approve this provider?",
        message: `${name} will be approved as a ${formatRole(
          provider.role
        ).toLowerCase()} on Vibely.`,
        button: "Yes, Approve",
      };
    }

    if (confirmAction.action === "reject") {
      return {
        icon: "bi bi-x-circle",
        label: "CONFIRM REJECTION",
        title: "Reject this application?",
        message: `${name}'s provider application will be rejected.`,
        button: "Yes, Reject",
      };
    }

    if (confirmAction.action === "suspend") {
      return {
        icon: "bi bi-pause-circle",
        label: "CONFIRM SUSPENSION",
        title: "Suspend this provider?",
        message: `${name} will temporarily lose access to provider features. Their existing platform records will remain available.`,
        button: "Yes, Suspend",
      };
    }

    if (confirmAction.action === "reactivate") {
      return {
        icon: "bi bi-arrow-counterclockwise",
        label: "CONFIRM REACTIVATION",
        title: "Reactivate this provider?",
        message: `${name}'s provider access will be restored.`,
        button: "Yes, Reactivate",
      };
    }

    return {
      icon: "bi bi-person-x",
      label: "REMOVE PROVIDER ACCESS",
      title: "Remove this provider?",
      message: `${name} will lose provider access. Existing booking, payment and platform records will remain preserved.`,
      button: "Remove Access",
    };
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");
    navigate("/admin/login");
  };

  const confirmContent = getConfirmContent();

  return (
    <div className="admin-providers-page">
      <aside className="admin-providers-sidebar">
        <div className="admin-providers-brand">
          <div className="admin-providers-logo">
            <img
              src={vibelyLogo}
              alt="Vibely"
            />
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

          <Link
            className="active"
            to="/admin/providers"
          >
            <i className="bi bi-person-badge"></i>
            Providers

            {counts.pending > 0 && (
              <span className="admin-providers-nav-badge">
                {counts.pending}
              </span>
            )}
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

        <div className="admin-providers-sidebar-bottom">
          <div className="admin-providers-profile">
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

      <main className="admin-providers-main">
        <header className="admin-providers-header">
          <div>
            <span>PROVIDER MANAGEMENT</span>
            <h1>Providers</h1>
          </div>

          <div className="admin-providers-header-user">
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

        <div className="admin-providers-content">
          <section className="admin-providers-hero">
            <div>
              <span>PROVIDER CONTROL CENTRE</span>

              <h2>
                Manage the people powering Vibely.
              </h2>

              <p>
                Review applications, manage approved
                organizers and food vendors, suspend
                problematic accounts and restore access
                whenever necessary.
              </p>
            </div>

            <div className="admin-providers-hero-badge">
              <i className="bi bi-patch-check"></i>
              <span>ACTIVE PROVIDERS</span>
              <strong>
                {counts.approved} Approved
              </strong>
            </div>
          </section>

          <section className="admin-providers-stats">
            <article>
              <i className="bi bi-hourglass-split"></i>

              <div>
                <span>PENDING</span>
                <strong>{counts.pending}</strong>
              </div>
            </article>

            <article>
              <i className="bi bi-patch-check"></i>

              <div>
                <span>APPROVED</span>
                <strong>{counts.approved}</strong>
              </div>
            </article>

            <article>
              <i className="bi bi-pause-circle"></i>

              <div>
                <span>SUSPENDED</span>
                <strong>{counts.suspended}</strong>
              </div>
            </article>

            <article className="attention">
              <i className="bi bi-x-circle"></i>

              <div>
                <span>REJECTED</span>
                <strong>{counts.rejected}</strong>
              </div>
            </article>
          </section>

          <section className="admin-providers-panel">
            <div className="admin-providers-panel-heading">
              <div>
                <span>PROVIDER DIRECTORY</span>
                <h3>{getStatusTitle()}</h3>
                <p>
                  {getStatusDescription()}
                </p>
              </div>

              <button
                type="button"
                onClick={fetchProviders}
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

            <div className="admin-provider-status-tabs">
              <button
                type="button"
                className={
                  activeStatus === "pending"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveStatus("pending")
                }
              >
                Pending
                <span>{counts.pending}</span>
              </button>

              <button
                type="button"
                className={
                  activeStatus === "approved"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveStatus("approved")
                }
              >
                Approved
                <span>{counts.approved}</span>
              </button>

              <button
                type="button"
                className={
                  activeStatus === "suspended"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveStatus("suspended")
                }
              >
                Suspended
                <span>{counts.suspended}</span>
              </button>

              <button
                type="button"
                className={
                  activeStatus === "rejected"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveStatus("rejected")
                }
              >
                Rejected
                <span>{counts.rejected}</span>
              </button>
            </div>

            <div className="admin-providers-toolbar">
              <div className="admin-providers-search">
                <i className="bi bi-search"></i>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search name, business or email..."
                />
              </div>

              <div className="admin-providers-type-tabs">
                <button
                  type="button"
                  className={
                    providerType === "all"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setProviderType("all")
                  }
                >
                  All
                </button>

                <button
                  type="button"
                  className={
                    providerType === "organizer"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setProviderType("organizer")
                  }
                >
                  Organizers
                </button>

                <button
                  type="button"
                  className={
                    providerType === "food_vendor"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setProviderType("food_vendor")
                  }
                >
                  Food Vendors
                </button>
              </div>
            </div>

            {loading ? (
              <div className="admin-providers-empty">
                <div>
                  <i className="bi bi-arrow-repeat"></i>
                </div>

                <span>LOADING</span>
                <h3>Fetching providers</h3>

                <p>
                  Please wait while Vibely loads the
                  provider directory.
                </p>
              </div>
            ) : error ? (
              <div className="admin-providers-empty">
                <div>
                  <i className="bi bi-exclamation-circle"></i>
                </div>

                <span>UNAVAILABLE</span>
                <h3>Unable to load providers</h3>

                <p>{error}</p>

                <button
                  type="button"
                  onClick={fetchProviders}
                >
                  Try Again
                </button>
              </div>
            ) : filteredProviders.length === 0 ? (
              <div className="admin-providers-empty">
                <div>
                  <i className="bi bi-person-check"></i>
                </div>

                <span>
                  {activeStatus.toUpperCase()}
                </span>

                <h3>
                  No {activeStatus} providers
                </h3>

                <p>
                  There are currently no providers
                  matching this status and your selected
                  filters.
                </p>
              </div>
            ) : (
              <div className="admin-providers-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>Type</th>
                      <th>Business</th>
                      <th>Approval</th>
                      <th>Account</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProviders.map(
                      (provider) => (
                        <tr key={provider._id}>
                          <td>
                            <div className="admin-provider-person">
                              <div>
                                {getInitials(provider)}
                              </div>

                              <section>
                                <strong>
                                  {provider.firstname}{" "}
                                  {provider.lastname}
                                </strong>

                                <span>
                                  {provider.email}
                                </span>
                              </section>
                            </div>
                          </td>

                          <td>
                            <span className="admin-provider-role">
                              {formatRole(
                                provider.role
                              )}
                            </span>
                          </td>

                          <td>
                            {provider.businessName ||
                              "—"}
                          </td>

                          <td>
                            <span
                              className={`admin-provider-approval ${provider.approvalStatus ||
                                "pending"
                                }`}
                            >
                              {formatStatus(
                                provider.approvalStatus ||
                                "pending"
                              )}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`admin-provider-account ${provider.accountStatus ||
                                "active"
                                }`}
                            >
                              {formatStatus(
                                provider.accountStatus ||
                                "active"
                              )}
                            </span>
                          </td>

                          <td>
                            {formatDate(
                              provider.createdAt
                            )}
                          </td>

                          <td>
                            <div className="admin-provider-actions">
                              <button
                                type="button"
                                className="review"
                                onClick={() =>
                                  openProviderDetails(
                                    provider
                                  )
                                }
                              >
                                View
                              </button>

                              {provider.approvalStatus ===
                                "pending" && (
                                  <>
                                    <button
                                      type="button"
                                      className="approve"
                                      title="Approve"
                                      disabled={
                                        actionLoading ===
                                        provider._id
                                      }
                                      onClick={() =>
                                        setConfirmAction({
                                          provider,
                                          action:
                                            "approve",
                                        })
                                      }
                                    >
                                      <i className="bi bi-check-lg"></i>
                                    </button>

                                    <button
                                      type="button"
                                      className="reject"
                                      title="Reject"
                                      disabled={
                                        actionLoading ===
                                        provider._id
                                      }
                                      onClick={() =>
                                        setConfirmAction({
                                          provider,
                                          action:
                                            "reject",
                                        })
                                      }
                                    >
                                      <i className="bi bi-x-lg"></i>
                                    </button>
                                  </>
                                )}

                              {provider.approvalStatus ===
                                "approved" &&
                                provider.accountStatus !==
                                "suspended" && (
                                  <button
                                    type="button"
                                    className="suspend"
                                    disabled={
                                      actionLoading ===
                                      provider._id
                                    }
                                    onClick={() =>
                                      setConfirmAction({
                                        provider,
                                        action:
                                          "suspend",
                                      })
                                    }
                                  >
                                    Suspend
                                  </button>
                                )}

                              {provider.accountStatus ===
                                "suspended" && (
                                  <button
                                    type="button"
                                    className="reactivate"
                                    disabled={
                                      actionLoading ===
                                      provider._id
                                    }
                                    onClick={() =>
                                      setConfirmAction({
                                        provider,
                                        action:
                                          "reactivate",
                                      })
                                    }
                                  >
                                    Reactivate
                                  </button>
                                )}

                              {provider.approvalStatus !==
                                "pending" && (
                                  <button
                                    type="button"
                                    className="remove"
                                    disabled={
                                      actionLoading ===
                                      provider._id
                                    }
                                    onClick={() =>
                                      setConfirmAction({
                                        provider,
                                        action: "remove",
                                      })
                                    }
                                  >
                                    Remove Access
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

          <section className="admin-providers-guidance">
            <div>
              <i className="bi bi-shield-check"></i>

              <section>
                <strong>
                  Protected provider management
                </strong>

                <p>
                  Provider accounts remain connected to
                  their historical platform records.
                  Suspend access for temporary issues,
                  reactivate resolved accounts, or remove
                  provider access when necessary.
                </p>
              </section>
            </div>

            <div className="admin-providers-flow">
              <span>APPLICATION</span>
              <i className="bi bi-arrow-right"></i>
              <span>APPROVAL</span>
              <i className="bi bi-arrow-right"></i>
              <span>MANAGEMENT</span>
            </div>
          </section>
        </div>
      </main>

      {selectedProvider && (
        <div className="admin-providers-modal-backdrop">
          <div className="admin-provider-review-modal">
            <button
              type="button"
              className="admin-provider-modal-close"
              onClick={() => {
                setSelectedProvider(null);
                setSelectedProviderStats(null);
              }}
            >
              <i className="bi bi-x-lg"></i>
            </button>

            <div className="admin-provider-modal-top">
              <div className="admin-provider-modal-avatar">
                {getInitials(selectedProvider)}
              </div>

              <div>
                <span>PROVIDER PROFILE</span>

                <h2>
                  {selectedProvider.firstname}{" "}
                  {selectedProvider.lastname}
                </h2>

                <p>{selectedProvider.email}</p>
              </div>
            </div>

            {detailsLoading ? (
              <div className="admin-provider-details-loading">
                <i className="bi bi-arrow-repeat"></i>
                Loading provider details...
              </div>
            ) : (
              <>
                <div className="admin-provider-review-grid">
                  <article>
                    <span>PROVIDER TYPE</span>
                    <strong>
                      {formatRole(
                        selectedProvider.role
                      )}
                    </strong>
                  </article>

                  <article>
                    <span>APPROVAL STATUS</span>
                    <strong>
                      {formatStatus(
                        selectedProvider.approvalStatus
                      )}
                    </strong>
                  </article>

                  <article>
                    <span>BUSINESS NAME</span>
                    <strong>
                      {selectedProvider.businessName ||
                        "Not provided"}
                    </strong>
                  </article>

                  <article>
                    <span>ACCOUNT STATUS</span>
                    <strong>
                      {formatStatus(
                        selectedProvider.accountStatus ||
                        "active"
                      )}
                    </strong>
                  </article>

                  <article>
                    <span>JOINED</span>
                    <strong>
                      {formatDate(
                        selectedProvider.createdAt
                      )}
                    </strong>
                  </article>

                  {selectedProvider.phone && (
                    <article>
                      <span>PHONE NUMBER</span>
                      <strong>
                        {selectedProvider.phone}
                      </strong>
                    </article>
                  )}
                </div>

                {selectedProviderStats && (
                  <div className="admin-provider-statistics">
                    <span>PLATFORM ACTIVITY</span>

                    <div>
                      <article>
                        <i className="bi bi-calendar-event"></i>
                        <strong>
                          {selectedProviderStats.totalEvents ||
                            0}
                        </strong>
                        <small>Events</small>
                      </article>

                      <article>
                        <i className="bi bi-buildings"></i>
                        <strong>
                          {selectedProviderStats.totalApartments ||
                            0}
                        </strong>
                        <small>Apartments</small>
                      </article>

                      <article>
                        <i className="bi bi-basket"></i>
                        <strong>
                          {selectedProviderStats.totalFoods ||
                            0}
                        </strong>
                        <small>Food Listings</small>
                      </article>
                    </div>
                  </div>
                )}

                {selectedProvider.businessDescription && (
                  <div className="admin-provider-description">
                    <span>ABOUT THE BUSINESS</span>

                    <p>
                      {
                        selectedProvider.businessDescription
                      }
                    </p>
                  </div>
                )}

                <div className="admin-provider-review-footer">
                  <button
                    type="button"
                    className="close"
                    onClick={() => {
                      setSelectedProvider(null);
                      setSelectedProviderStats(null);
                    }}
                  >
                    Close
                  </button>

                  {selectedProvider.approvalStatus ===
                    "pending" && (
                      <>
                        <button
                          type="button"
                          className="reject"
                          onClick={() =>
                            setConfirmAction({
                              provider:
                                selectedProvider,
                              action: "reject",
                            })
                          }
                        >
                          <i className="bi bi-x-circle"></i>
                          Reject
                        </button>

                        <button
                          type="button"
                          className="approve"
                          onClick={() =>
                            setConfirmAction({
                              provider:
                                selectedProvider,
                              action: "approve",
                            })
                          }
                        >
                          <i className="bi bi-check-circle"></i>
                          Approve
                        </button>
                      </>
                    )}

                  {selectedProvider.approvalStatus ===
                    "approved" &&
                    selectedProvider.accountStatus !==
                    "suspended" && (
                      <button
                        type="button"
                        className="suspend"
                        onClick={() =>
                          setConfirmAction({
                            provider:
                              selectedProvider,
                            action: "suspend",
                          })
                        }
                      >
                        <i className="bi bi-pause-circle"></i>
                        Suspend
                      </button>
                    )}

                  {selectedProvider.accountStatus ===
                    "suspended" && (
                      <button
                        type="button"
                        className="reactivate"
                        onClick={() =>
                          setConfirmAction({
                            provider:
                              selectedProvider,
                            action: "reactivate",
                          })
                        }
                      >
                        <i className="bi bi-arrow-counterclockwise"></i>
                        Reactivate
                      </button>
                    )}

                  {selectedProvider.approvalStatus !==
                    "pending" && (
                      <button
                        type="button"
                        className="remove"
                        onClick={() =>
                          setConfirmAction({
                            provider:
                              selectedProvider,
                            action: "remove",
                          })
                        }
                      >
                        <i className="bi bi-person-x"></i>
                        Remove Access
                      </button>
                    )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="admin-providers-modal-backdrop admin-provider-confirm-backdrop">
          <div className="admin-provider-confirm-modal">
            <div
              className={`admin-provider-confirm-icon ${confirmAction.action}`}
            >
              <i
                className={confirmContent.icon}
              ></i>
            </div>

            <span>{confirmContent.label}</span>

            <h3>{confirmContent.title}</h3>

            <p>{confirmContent.message}</p>

            <div className="admin-provider-confirm-actions">
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
                  confirmAction.action
                }
                disabled={Boolean(actionLoading)}
                onClick={runProviderAction}
              >
                {actionLoading
                  ? "Please wait..."
                  : confirmContent.button}
              </button>
            </div>
          </div>
        </div>
      )}

      {feedback.show && (
        <div className="admin-provider-feedback-wrap">
          <div
            className={`admin-provider-feedback ${feedback.type}`}
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

export default AdminProviders;