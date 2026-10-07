import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/accountMenu.css";

const AccountMenu = () => {
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const accessToken = localStorage.getItem("accessToken");

  const fetchUser = async () => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      setUser(null);
      return;
    }

    try {
      setLoading(true);

      const response = await axios.get(
        "http://192.168.0.3:5005/api/v1/profile",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const profileData = response.data.data;

      setUser(profileData?.user || profileData);
    } catch (error) {
      console.log("ACCOUNT MENU ERROR:", error);

      if (error.response?.status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("role");
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    const handleProfilePictureUpdated = () => {
      fetchUser();
    };

    window.addEventListener(
      "profilePictureUpdated",
      handleProfilePictureUpdated
    );

    return () => {
      window.removeEventListener(
        "profilePictureUpdated",
        handleProfilePictureUpdated
      );
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const getInitials = () => {
    if (!user) {
      return "";
    }

    const firstInitial =
      user.firstname?.charAt(0)?.toUpperCase() || "";

    const lastInitial =
      user.lastname?.charAt(0)?.toUpperCase() || "";

    return `${firstInitial}${lastInitial}`;
  };

  const getFullName = () => {
    if (!user) {
      return "";
    }

    return `${user.firstname || ""} ${user.lastname || ""
      }`.trim();
  };

  const getRoleName = () => {
    if (user?.role === "organizer") {
      return "Organizer";
    }

    if (user?.role === "admin") {
      return "Administrator";
    }

    if (user?.role === "food_vendor") {
      return "Food Vendor";
    }

    return "Customer";
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    const token = localStorage.getItem("accessToken");
    const refreshToken =
      localStorage.getItem("refreshToken");

    try {
      if (token) {
        await axios.post(
          "http://192.168.0.3:5005/api/v1/logout",
          {
            refreshToken,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
    } catch (error) {
      console.log("LOGOUT ERROR:", error);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("role");

      setUser(null);
      setMenuOpen(false);

      navigate("/");
      window.location.reload();
    }
  };

  if (!accessToken) {
    return (
      <div className="account-auth-buttons">
        <Link
          to="/login"
          className="account-login-button"
        >
          Login
        </Link>

        <Link
          to="/signup"
          className="account-signup-button"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  if (loading && !user) {
    return (
      <div className="account-menu-loading">
        <div className="account-loading-circle"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="account-auth-buttons">
        <Link
          to="/login"
          className="account-login-button"
        >
          Login
        </Link>

        <Link
          to="/signup"
          className="account-signup-button"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div
      className="account-menu"
      ref={menuRef}
    >
      <button
        type="button"
        className="account-menu-trigger"
        onClick={() =>
          setMenuOpen((current) => !current)
        }
      >
        <div className="account-trigger-avatar">
          {user.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={getFullName()}
            />
          ) : (
            <span>{getInitials()}</span>
          )}
        </div>

        <div className="account-trigger-info">
          <span>{getRoleName()}</span>

          <strong>
            {user.firstname || "Account"}
          </strong>
        </div>

        <i
          className={`bi ${menuOpen
              ? "bi-chevron-up"
              : "bi-chevron-down"
            }`}
        ></i>
      </button>

      {menuOpen && (
        <div className="account-dropdown">
          <div className="account-dropdown-profile">
            <div className="account-dropdown-avatar">
              {user.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={getFullName()}
                />
              ) : (
                <span>{getInitials()}</span>
              )}
            </div>

            <div className="account-dropdown-user">
              <strong>{getFullName()}</strong>
              <span>{user.email}</span>
            </div>
          </div>

          <div className="account-dropdown-divider"></div>

          <nav className="account-dropdown-links">
            {user.role === "organizer" && (
              <>
                <Link
                  to="/organizer/dashboard"
                  onClick={closeMenu}
                >
                  <div className="account-link-icon">
                    <i className="bi bi-grid"></i>
                  </div>

                  <div>
                    <strong>
                      Organizer Dashboard
                    </strong>

                    <span>
                      Manage your Vibely business
                    </span>
                  </div>
                </Link>

                <Link
                  to="/profile"
                  onClick={closeMenu}
                >
                  <div className="account-link-icon">
                    <i className="bi bi-person"></i>
                  </div>

                  <div>
                    <strong>My Profile</strong>

                    <span>
                      View your account information
                    </span>
                  </div>
                </Link>

                <Link
                  to="/change-password"
                  onClick={closeMenu}
                >
                  <div className="account-link-icon">
                    <i className="bi bi-shield-lock"></i>
                  </div>

                  <div>
                    <strong>
                      Change Password
                    </strong>

                    <span>
                      Update your account password
                    </span>
                  </div>
                </Link>
              </>
            )}

            {user.role === "admin" && (
              <>
                <Link
                  to="/admin/dashboard"
                  onClick={closeMenu}
                >
                  <div className="account-link-icon">
                    <i className="bi bi-speedometer2"></i>
                  </div>

                  <div>
                    <strong>
                      Admin Dashboard
                    </strong>

                    <span>
                      Manage the Vibely platform
                    </span>
                  </div>
                </Link>

                <Link
                  to="/profile"
                  onClick={closeMenu}
                >
                  <div className="account-link-icon">
                    <i className="bi bi-person"></i>
                  </div>

                  <div>
                    <strong>My Profile</strong>

                    <span>
                      View your account information
                    </span>
                  </div>
                </Link>

                <Link
                  to="/change-password"
                  onClick={closeMenu}
                >
                  <div className="account-link-icon">
                    <i className="bi bi-shield-lock"></i>
                  </div>

                  <div>
                    <strong>
                      Change Password
                    </strong>

                    <span>
                      Update your account password
                    </span>
                  </div>
                </Link>
              </>
            )}

            {user.role === "food_vendor" && (
              <>
                <Link
                  to="/profile"
                  onClick={closeMenu}
                >
                  <div className="account-link-icon">
                    <i className="bi bi-person"></i>
                  </div>

                  <div>
                    <strong>My Profile</strong>

                    <span>
                      View your account information
                    </span>
                  </div>
                </Link>

                <Link
                  to="/change-password"
                  onClick={closeMenu}
                >
                  <div className="account-link-icon">
                    <i className="bi bi-shield-lock"></i>
                  </div>

                  <div>
                    <strong>
                      Change Password
                    </strong>

                    <span>
                      Update your account password
                    </span>
                  </div>
                </Link>
              </>
            )}

            {user.role === "user" && (
              <>
                <Link
                  to="/profile"
                  onClick={closeMenu}
                >
                  <div className="account-link-icon">
                    <i className="bi bi-person"></i>
                  </div>

                  <div>
                    <strong>My Profile</strong>

                    <span>
                      View your account information
                    </span>
                  </div>
                </Link>

                <Link
                  to="/my-tickets"
                  onClick={closeMenu}
                >
                  <div className="account-link-icon">
                    <i className="bi bi-ticket-perforated"></i>
                  </div>

                  <div>
                    <strong>My Tickets</strong>

                    <span>
                      View your event tickets
                    </span>
                  </div>
                </Link>

                <Link
                  to="/my-bookings"
                  onClick={closeMenu}
                >
                  <div className="account-link-icon">
                    <i className="bi bi-calendar-check"></i>
                  </div>

                  <div>
                    <strong>
                      My Event Bookings
                    </strong>

                    <span>
                      Manage your event bookings
                    </span>
                  </div>
                </Link>

                <Link
                  to="/my-apartment-bookings"
                  onClick={closeMenu}
                >
                  <div className="account-link-icon">
                    <i className="bi bi-building"></i>
                  </div>

                  <div>
                    <strong>
                      My Apartment Bookings
                    </strong>

                    <span>
                      View your apartment reservations
                    </span>
                  </div>
                </Link>

                <Link
                  to="/my-food-orders"
                  onClick={closeMenu}
                >
                  <div className="account-link-icon">
                    <i className="bi bi-bag"></i>
                  </div>

                  <div>
                    <strong>
                      My Food Orders
                    </strong>

                    <span>
                      Track your food orders
                    </span>
                  </div>
                </Link>

                <Link
                  to="/payments-refunds"
                  onClick={closeMenu}
                >
                  <div className="account-link-icon">
                    <i className="bi bi-credit-card"></i>
                  </div>

                  <div>
                    <strong>
                      Payments & Refunds
                    </strong>

                    <span>
                      View payments and refunds
                    </span>
                  </div>
                </Link>

                <Link
                  to="/change-password"
                  onClick={closeMenu}
                >
                  <div className="account-link-icon">
                    <i className="bi bi-shield-lock"></i>
                  </div>

                  <div>
                    <strong>
                      Change Password
                    </strong>

                    <span>
                      Update your account password
                    </span>
                  </div>
                </Link>
              </>
            )}
          </nav>

          <div className="account-dropdown-divider"></div>

          <button
            type="button"
            className="account-logout-button"
            onClick={handleLogout}
          >
            <div className="account-link-icon">
              <i className="bi bi-box-arrow-right"></i>
            </div>

            <div>
              <strong>Logout</strong>

              <span>
                Sign out of your Vibely account
              </span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default AccountMenu;