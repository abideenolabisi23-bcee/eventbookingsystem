
import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/organizerProfile.css";

const API_URL =
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const OrganizerProfile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [organizer, setOrganizer] = useState(null);

  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    phone: "",
    businessName: ""
  });

  const [originalFormData, setOriginalFormData] = useState({
    firstname: "",
    lastname: "",
    phone: "",
    businessName: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [feedback, setFeedback] = useState({
    open: false,
    type: "",
    title: "",
    message: ""
  });

  const accessToken = localStorage.getItem("organizerAccessToken");

  const showFeedback = (type, title, message) => {
    setFeedback({
      open: true,
      type,
      title,
      message
    });
  };

  const closeFeedback = () => {
    setFeedback({
      open: false,
      type: "",
      title: "",
      message: ""
    });
  };

  const clearOrganizerSession = () => {
    localStorage.removeItem("organizerAccessToken");
    localStorage.removeItem("organizerRefreshToken");
    localStorage.removeItem("organizerRole");
  };

  const setProfileInformation = (user) => {
    const profileForm = {
      firstname: user?.firstname || "",
      lastname: user?.lastname || "",
      phone: user?.phone || "",
      businessName: user?.businessName || ""
    };

    setOrganizer(user);
    setFormData(profileForm);
    setOriginalFormData(profileForm);
  };

  const fetchProfile = async () => {
    if (!accessToken) {
      navigate("/organizer/login");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.get(`${API_URL}/profile`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const profileData = response.data.data;
      const user = profileData?.user || profileData;

      if (user?.role !== "organizer") {
        navigate("/");
        return;
      }

      setProfileInformation(user);
    } catch (error) {
      console.log(error);

      if (error.response?.status === 401) {
        clearOrganizerSession();
        navigate("/organizer/login");
        return;
      }

      showFeedback(
        "error",
        "Unable to load profile",
        error.response?.data?.message ||
          "Your organizer profile could not be loaded at this time."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleEditProfile = () => {
    const currentForm = {
      firstname: organizer?.firstname || "",
      lastname: organizer?.lastname || "",
      phone: organizer?.phone || "",
      businessName: organizer?.businessName || ""
    };

    setOriginalFormData(currentForm);
    setFormData(currentForm);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setFormData(originalFormData);
    setIsEditing(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isEditing) return;

    if (!formData.firstname.trim()) {
      showFeedback(
        "error",
        "First name required",
        "Please enter your first name before saving."
      );
      return;
    }

    if (!formData.lastname.trim()) {
      showFeedback(
        "error",
        "Last name required",
        "Please enter your last name before saving."
      );
      return;
    }

    if (!formData.businessName.trim()) {
      showFeedback(
        "error",
        "Business name required",
        "Please enter your business name before saving."
      );
      return;
    }

    try {
      setSaving(true);

      const response = await axios.put(
        `${API_URL}/profile`,
        {
          firstname: formData.firstname.trim(),
          lastname: formData.lastname.trim(),
          phone: formData.phone.trim(),
          businessName: formData.businessName.trim()
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      const updatedData = response.data.data;

      const updatedOrganizer = {
        ...organizer,
        ...updatedData
      };

      const updatedForm = {
        firstname: updatedOrganizer.firstname || "",
        lastname: updatedOrganizer.lastname || "",
        phone: updatedOrganizer.phone || "",
        businessName: updatedOrganizer.businessName || ""
      };

      setOrganizer(updatedOrganizer);
      setFormData(updatedForm);
      setOriginalFormData(updatedForm);
      setIsEditing(false);

      showFeedback(
        "success",
        "Profile updated",
        "Your organizer information has been updated successfully."
      );
    } catch (error) {
      console.log(error);

      if (error.response?.status === 401) {
        clearOrganizerSession();
        navigate("/organizer/login");
        return;
      }

      showFeedback(
        "error",
        "Update failed",
        error.response?.data?.message ||
          "Your profile could not be updated at this time."
      );
    } finally {
      setSaving(false);
    }
  };

  const openPhotoPicker = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      showFeedback(
        "error",
        "Invalid image",
        "Please select a JPG, PNG or WEBP image."
      );
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showFeedback(
        "error",
        "Image too large",
        "Please select an image smaller than 5MB."
      );
      event.target.value = "";
      return;
    }

    const photoData = new FormData();
    photoData.append("profilePicture", file);

    try {
      setUploading(true);

      const response = await axios.patch(
        `${API_URL}/profile-picture`,
        photoData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      const responseData = response.data.data;

      const newProfilePicture =
        responseData?.profilePicture ||
        responseData?.user?.profilePicture ||
        responseData?.secure_url ||
        responseData?.url;

      if (newProfilePicture) {
        setOrganizer((previous) => ({
          ...previous,
          profilePicture: newProfilePicture
        }));
      } else {
        await fetchProfile();
      }

      showFeedback(
        "success",
        "Photo updated",
        "Your organizer profile picture has been updated successfully."
      );
    } catch (error) {
      console.log(error);

      if (error.response?.status === 401) {
        clearOrganizerSession();
        navigate("/organizer/login");
        return;
      }

      showFeedback(
        "error",
        "Upload failed",
        error.response?.data?.message ||
          "Your profile picture could not be updated."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem(
      "organizerRefreshToken"
    );

    try {
      if (accessToken && refreshToken) {
        await axios.post(
          `${API_URL}/logout`,
          { refreshToken },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );
      }
    } catch (error) {
      console.log(error);
    } finally {
      clearOrganizerSession();
      navigate("/organizer/login");
    }
  };

  const getInitials = () => {
    const first = organizer?.firstname?.charAt(0) || "";
    const last = organizer?.lastname?.charAt(0) || "";

    return `${first}${last}`.toUpperCase() || "OR";
  };

  const formatStatus = (status) => {
    if (!status) return "Not available";

    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <div className="organizer-profile-loading">
        <div className="organizer-profile-loader"></div>
        <h2>Vibely</h2>
        <p>Loading your organizer profile...</p>
      </div>
    );
  }

  return (
    <div className="organizer-profile-page">
      <aside
        className={`organizer-profile-sidebar ${
          sidebarOpen ? "sidebar-open" : ""
        }`}
      >
        <div className="organizer-profile-brand">
          <div className="organizer-profile-brand-main">
            <img src={vibelyLogo} alt="Vibely" />

            <div>
              <h2>Vibely</h2>
              <span>ORGANIZER</span>
            </div>
          </div>

          <button
            type="button"
            className="organizer-profile-sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="organizer-profile-user">
          {organizer?.profilePicture ? (
            <img
              src={organizer.profilePicture}
              alt={`${organizer.firstname} ${organizer.lastname}`}
            />
          ) : (
            <div className="organizer-profile-user-placeholder">
              {getInitials()}
            </div>
          )}

          <div>
            <h4>
              {organizer?.firstname} {organizer?.lastname}
            </h4>
            <p>{organizer?.businessName || "Organizer"}</p>
          </div>
        </div>

        <nav>
          <div className="organizer-profile-nav-section">
            <span>OVERVIEW</span>

            <NavLink
              to="/organizer/dashboard"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="bi bi-grid-1x2"></i>
              Dashboard
            </NavLink>
          </div>

          <div className="organizer-profile-nav-section">
            <span>MANAGEMENT</span>

            <NavLink
              to="/organizer/events"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="bi bi-calendar-event"></i>
              Events
            </NavLink>

            <NavLink
              to="/organizer/apartments"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="bi bi-buildings"></i>
              Apartments
            </NavLink>
          </div>

          <div className="organizer-profile-nav-section">
            <span>BUSINESS</span>

          
<NavLink
  to="/organizer/dashboard#organizer-recent-bookings"
  onClick={() => setSidebarOpen(false)}
>
  <i className="bi bi-people"></i>
  Bookings & Attendees
</NavLink>

<NavLink
  to="/organizer/dashboard#organizer-revenue"
  onClick={() => setSidebarOpen(false)}
>
  <i className="bi bi-wallet2"></i>
  Bookings & Revenue
</NavLink>

<NavLink
  to="/organizer/check-in"
  onClick={() => setSidebarOpen(false)}
>
  <i className="bi bi-qr-code-scan"></i>
  QR Check-In
</NavLink>

          </div>

          <div className="organizer-profile-nav-section">
            <span>EVENT OPERATIONS</span>

            <NavLink
              to="/organizer/events"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="bi bi-qr-code-scan"></i>
              QR Check-in
            </NavLink>
          </div>

          <div className="organizer-profile-nav-section">
            <span>ACCOUNT</span>

            <NavLink
              to="/organizer/notifications"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="bi bi-bell"></i>
              Notifications
            </NavLink>

            <NavLink
              to="/organizer/profile"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="bi bi-person-circle"></i>
              Profile & Settings
            </NavLink>

            <button type="button" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right"></i>
              Logout
            </button>
          </div>
        </nav>
      </aside>

      <div
        className={`organizer-profile-overlay ${
          sidebarOpen ? "show" : ""
        }`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      <main className="organizer-profile-main">
        <header className="organizer-profile-topbar">
          <div className="organizer-profile-topbar-left">
            <button
              type="button"
              className="organizer-profile-menu"
              onClick={() => setSidebarOpen(true)}
            >
              <i className="bi bi-list"></i>
            </button>

            <div>
              <span>ORGANIZER PORTAL</span>
              <h3>Profile & Settings</h3>
            </div>
          </div>

          <div className="organizer-profile-topbar-user">
            {organizer?.profilePicture ? (
              <img
                src={organizer.profilePicture}
                alt={organizer.firstname}
              />
            ) : (
              <div>{getInitials()}</div>
            )}

            <section>
              <strong>
                {organizer?.firstname} {organizer?.lastname}
              </strong>
              <span>
                {organizer?.businessName || "Organizer"}
              </span>
            </section>
          </div>
        </header>

        <div className="organizer-profile-content">
          <div className="organizer-profile-heading">
            <div>
              <span className="organizer-profile-eyebrow">
                ACCOUNT SETTINGS
              </span>

              <h1>Organizer Profile</h1>

              <p>
                Manage your personal information, business details and
                account settings.
              </p>
            </div>

            <div className="organizer-profile-status">
              <i className="bi bi-patch-check-fill"></i>

              <div>
                <span>ORGANIZER STATUS</span>
                <strong>
                  {formatStatus(organizer?.approvalStatus)}
                </strong>
              </div>
            </div>
          </div>

          <div className="organizer-profile-grid">
            <section className="organizer-profile-card organizer-profile-identity">
              <div className="organizer-profile-cover">
                <span>VIBELY ORGANIZER</span>
              </div>

              <div className="organizer-profile-photo-wrapper">
                <div className="organizer-profile-photo">
                  {organizer?.profilePicture ? (
                    <img
                      src={organizer.profilePicture}
                      alt={`${organizer.firstname} ${organizer.lastname}`}
                    />
                  ) : (
                    <span>{getInitials()}</span>
                  )}

                  {uploading && (
                    <div className="organizer-profile-photo-loading">
                      <div></div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="organizer-profile-camera"
                  onClick={openPhotoPicker}
                  disabled={uploading}
                >
                  <i className="bi bi-camera-fill"></i>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  hidden
                />
              </div>

              <div className="organizer-profile-identity-details">
                <h2>
                  {organizer?.firstname} {organizer?.lastname}
                </h2>

                <p>{organizer?.businessName || "Organizer"}</p>

                <div className="organizer-profile-role">
                  <i className="bi bi-stars"></i>
                  Vibely Organizer
                </div>
              </div>

              <div className="organizer-profile-account-details">
                <div>
                  <span>
                    <i className="bi bi-envelope"></i>
                  </span>

                  <section>
                    <small>Email Address</small>
                    <strong>
                      {organizer?.email || "Not available"}
                    </strong>
                  </section>
                </div>

                <div>
                  <span>
                    <i className="bi bi-telephone"></i>
                  </span>

                  <section>
                    <small>Phone Number</small>
                    <strong>
                      {organizer?.phone || "Not provided"}
                    </strong>
                  </section>
                </div>

                <div>
                  <span>
                    <i className="bi bi-building"></i>
                  </span>

                  <section>
                    <small>Business Name</small>
                    <strong>
                      {organizer?.businessName || "Not provided"}
                    </strong>
                  </section>
                </div>
              </div>

              <button
                type="button"
                className="organizer-profile-photo-button"
                onClick={openPhotoPicker}
                disabled={uploading}
              >
                <i className="bi bi-camera"></i>
                {uploading
                  ? "Uploading..."
                  : "Change Profile Photo"}
              </button>
            </section>

            <section className="organizer-profile-card organizer-profile-form-card">
              <div className="organizer-profile-card-heading">
                <div>
                  <span>PERSONAL & BUSINESS INFORMATION</span>

                  <h2>Profile details</h2>

                  <p>
                    Keep your organizer information accurate and up to
                    date.
                  </p>
                </div>

                <div className="organizer-profile-heading-icon">
                  <i className="bi bi-person-gear"></i>
                </div>
              </div>

              <form
                className="organizer-profile-form"
                onSubmit={handleSubmit}
              >
                <div className="organizer-profile-form-row">
                  <div className="organizer-profile-field">
                    <label>First Name</label>

                    <div>
                      <i className="bi bi-person"></i>

                      <input
                        type="text"
                        name="firstname"
                        value={formData.firstname}
                        onChange={handleChange}
                        readOnly={!isEditing}
                        placeholder="First name"
                      />
                    </div>
                  </div>

                  <div className="organizer-profile-field">
                    <label>Last Name</label>

                    <div>
                      <i className="bi bi-person"></i>

                      <input
                        type="text"
                        name="lastname"
                        value={formData.lastname}
                        onChange={handleChange}
                        readOnly={!isEditing}
                        placeholder="Last name"
                      />
                    </div>
                  </div>
                </div>

                <div className="organizer-profile-field">
                  <label>Business Name</label>

                  <div>
                    <i className="bi bi-building"></i>

                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      readOnly={!isEditing}
                      placeholder="Business name"
                    />
                  </div>
                </div>

                <div className="organizer-profile-form-row">
                  <div className="organizer-profile-field organizer-profile-field-locked">
                    <label>
                      Email Address

                      <span className="organizer-profile-lock-label">
                        <i className="bi bi-lock-fill"></i>
                        Locked
                      </span>
                    </label>

                    <div>
                      <i className="bi bi-envelope"></i>

                      <input
                        type="email"
                        value={organizer?.email || ""}
                        readOnly
                      />
                    </div>

                    <small className="organizer-profile-field-note">
                      Your account email cannot be changed from profile
                      settings.
                    </small>
                  </div>

                  <div className="organizer-profile-field">
                    <label>Phone Number</label>

                    <div>
                      <i className="bi bi-telephone"></i>

                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        readOnly={!isEditing}
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                </div>

                <div className="organizer-profile-form-footer">
                  <div>
                    <i className="bi bi-shield-check"></i>

                    <span>
                      {isEditing
                        ? "Update your information and save your changes."
                        : "Your information is protected by Vibely."}
                    </span>
                  </div>

                  {!isEditing ? (
                    <button
                      type="button"
                      className="organizer-profile-edit-button"
                      onClick={handleEditProfile}
                    >
                      <i className="bi bi-pencil-square"></i>
                      Edit Profile
                    </button>
                  ) : (
                    <div className="organizer-profile-form-actions">
                      <button
                        type="button"
                        className="organizer-profile-cancel-button"
                        onClick={handleCancelEdit}
                        disabled={saving}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="organizer-profile-save-button"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <span className="organizer-profile-button-spinner"></span>
                            Saving...
                          </>
                        ) : (
                          <>
                            Save Changes
                            <i className="bi bi-arrow-right"></i>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </form>
            </section>
          </div>

          <div className="organizer-profile-bottom-grid">
            <section className="organizer-profile-security-card">
              <div className="organizer-profile-security-icon">
                <i className="bi bi-shield-lock"></i>
              </div>

              <div>
                <span>SECURITY</span>
                <h3>Password & Security</h3>
                <p>
                  Keep your Vibely organizer account secure by updating
                  your password when necessary.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/change-password")}
              >
                Change Password
                <i className="bi bi-arrow-right"></i>
              </button>
            </section>

            <section className="organizer-profile-verification-card">
              <div className="organizer-profile-verification-icon">
                <i className="bi bi-person-check"></i>
              </div>

              <div>
                <span>ACCOUNT</span>
                <h3>Account Status</h3>
                <p>
                  Your organizer access and account standing on Vibely.
                </p>
              </div>

              <div className="organizer-profile-active-status">
                <i className="bi bi-circle-fill"></i>
                {formatStatus(organizer?.accountStatus)}
              </div>
            </section>
          </div>

          <section className="organizer-profile-protected">
            <div className="organizer-profile-protected-heading">
              <div>
                <span>PROTECTED INFORMATION</span>
                <h3>Account information</h3>
              </div>

              <i className="bi bi-lock"></i>
            </div>

            <div className="organizer-profile-protected-grid">
              <div>
                <span>Account Type</span>
                <strong>
                  {formatStatus(organizer?.role)}
                </strong>
                <i className="bi bi-lock-fill"></i>
              </div>

              <div>
                <span>Approval Status</span>
                <strong>
                  {formatStatus(organizer?.approvalStatus)}
                </strong>
                <i className="bi bi-lock-fill"></i>
              </div>

              <div>
                <span>Account Status</span>
                <strong>
                  {formatStatus(organizer?.accountStatus)}
                </strong>
                <i className="bi bi-lock-fill"></i>
              </div>
            </div>

            <p>
              These details are managed by Vibely and cannot be changed
              from your profile.
            </p>
          </section>
        </div>
      </main>

      {feedback.open && (
        <div className="organizer-feedback-backdrop">
          <div className="organizer-feedback-modal">
            <button
              type="button"
              className="organizer-feedback-close"
              onClick={closeFeedback}
            >
              <i className="bi bi-x-lg"></i>
            </button>

            <div
              className={`organizer-feedback-icon ${feedback.type}`}
            >
              <i
                className={
                  feedback.type === "success"
                    ? "bi bi-check-lg"
                    : "bi bi-exclamation-lg"
                }
              ></i>
            </div>

            <span className="organizer-feedback-label">
              {feedback.type === "success"
                ? "SUCCESS"
                : "SOMETHING WENT WRONG"}
            </span>

            <h2>{feedback.title}</h2>
            <p>{feedback.message}</p>

            <button
              type="button"
              className="organizer-feedback-action"
              onClick={closeFeedback}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerProfile;
