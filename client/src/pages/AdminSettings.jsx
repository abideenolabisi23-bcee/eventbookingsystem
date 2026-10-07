import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import vibelyLogo from "../assets/vibely-logo.png";
import "../styles/adminSettings.css";

const AdminSettings = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [activeSection, setActiveSection] = useState("profile");

    const [profile, setProfile] = useState({
        firstname: "",
        lastname: "",
        email: "",
        role: "admin",
        accountStatus: "active",
        profilePicture: "",
    });

    const [editProfile, setEditProfile] = useState({
        firstname: "",
        lastname: "",
    });

    const [isEditingProfile, setIsEditingProfile] = useState(false);

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const [preferences, setPreferences] = useState(() => {
        try {
            const saved = JSON.parse(
                localStorage.getItem("adminNotificationPreferences")
            );

            return (
                saved || {
                    providerAlerts: true,
                    paymentAlerts: true,
                    bookingAlerts: true,
                    securityAlerts: true,
                }
            );
        } catch {
            return {
                providerAlerts: true,
                paymentAlerts: true,
                bookingAlerts: true,
                securityAlerts: true,
            };
        }
    });

    const [loading, setLoading] = useState(true);
    const [profileError, setProfileError] = useState("");
    const [savingProfile, setSavingProfile] = useState(false);
    const [uploadingPicture, setUploadingPicture] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [notice, setNotice] = useState("");
    const [noticeType, setNoticeType] = useState("success");

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
        localStorage.removeItem("firstname");
        localStorage.removeItem("lastname");
        navigate("/admin/login");
    };

    const showNotice = (message, type = "success") => {
        setNotice(message);
        setNoticeType(type);

        window.setTimeout(() => {
            setNotice("");
        }, 3500);
    };

    const fetchAdminProfile = async () => {
        const accessToken = getToken();

        if (!accessToken) {
            handleUnauthorized();
            return;
        }

        try {
            setLoading(true);
            setProfileError("");

            const response = await axios.get(
                "http://192.168.0.3:5005/api/v1/profile",
                {
                    headers: getHeaders(),
                }
            );

            const user = response.data?.data || response.data?.user;

            if (!user) {
                setProfileError(
                    "Administrator profile information could not be found."
                );
                return;
            }

            const profileData = {
                firstname: user.firstname || "",
                lastname: user.lastname || "",
                email: user.email || "",
                role: user.role || "admin",
                accountStatus: user.accountStatus || "active",
                profilePicture:
                    user.profilePicture ||
                    user.profileImage ||
                    user.image ||
                    "",
            };

            setProfile(profileData);

            setEditProfile({
                firstname: profileData.firstname,
                lastname: profileData.lastname,
            });
        } catch (error) {
            console.log("ADMIN PROFILE ERROR:", error);

            if (
                error.response?.status === 401 ||
                error.response?.status === 403
            ) {
                handleUnauthorized();
                return;
            }

            setProfileError(
                error.response?.data?.message ||
                "Unable to load administrator profile."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminProfile();
    }, []);

    const handleProfileInput = (event) => {
        const { name, value } = event.target;

        setEditProfile((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const handleStartProfileEdit = () => {
        setEditProfile({
            firstname: profile.firstname,
            lastname: profile.lastname,
        });

        setIsEditingProfile(true);
    };

    const handleCancelProfileEdit = () => {
        setEditProfile({
            firstname: profile.firstname,
            lastname: profile.lastname,
        });

        setIsEditingProfile(false);
    };

    const validateName = (value, label) => {
        const cleanValue = value.trim();
        const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;

        if (!cleanValue) {
            showNotice(`${label} is required.`, "error");
            return false;
        }

        if (cleanValue.length < 2) {
            showNotice(
                `${label} must contain at least 2 letters.`,
                "error"
            );
            return false;
        }

        if (!nameRegex.test(cleanValue)) {
            showNotice(
                `${label} can only contain letters.`,
                "error"
            );
            return false;
        }

        return true;
    };

    const handleProfileSave = async (event) => {
        event.preventDefault();

        if (!isEditingProfile) {
            return;
        }

        if (
            !validateName(editProfile.firstname, "First name") ||
            !validateName(editProfile.lastname, "Last name")
        ) {
            return;
        }

        try {
            setSavingProfile(true);

            const response = await axios.put(
                "http://192.168.0.3:5005/api/v1/profile",
                {
                    firstname: editProfile.firstname.trim(),
                    lastname: editProfile.lastname.trim(),
                },
                {
                    headers: getHeaders(),
                }
            );

            const updatedUser = response.data?.data;

            const newFirstname =
                updatedUser?.firstname ||
                editProfile.firstname.trim();

            const newLastname =
                updatedUser?.lastname ||
                editProfile.lastname.trim();

            setProfile((current) => ({
                ...current,
                firstname: newFirstname,
                lastname: newLastname,
            }));

            setEditProfile({
                firstname: newFirstname,
                lastname: newLastname,
            });

            localStorage.setItem("firstname", newFirstname);
            localStorage.setItem("lastname", newLastname);

            setIsEditingProfile(false);

            showNotice(
                response.data?.message ||
                "Profile updated successfully."
            );
        } catch (error) {
            console.log("ADMIN PROFILE UPDATE ERROR:", error);

            if (
                error.response?.status === 401 ||
                error.response?.status === 403
            ) {
                handleUnauthorized();
                return;
            }

            showNotice(
                error.response?.data?.message ||
                "Unable to update profile.",
                "error"
            );
        } finally {
            setSavingProfile(false);
        }
    };

    const handlePictureSelect = () => {
        fileInputRef.current?.click();
    };

    const handlePictureUpload = async (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            showNotice(
                "Please select a valid image file.",
                "error"
            );

            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showNotice(
                "Profile picture must not be larger than 5MB.",
                "error"
            );

            event.target.value = "";
            return;
        }

        try {
            setUploadingPicture(true);

            const formData = new FormData();

            formData.append("profilePicture", file);

            const response = await axios.patch(
                "http://192.168.0.3:5005/api/v1/profile-picture",
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${getToken()}`,
                    },
                }
            );

            const profilePicture =
                response.data?.data?.profilePicture;

            if (profilePicture) {
                setProfile((current) => ({
                    ...current,
                    profilePicture,
                }));
            }

            showNotice(
                response.data?.message ||
                "Profile picture updated successfully."
            );
        } catch (error) {
            console.log(
                "ADMIN PROFILE PICTURE ERROR:",
                error
            );

            if (
                error.response?.status === 401 ||
                error.response?.status === 403
            ) {
                handleUnauthorized();
                return;
            }

            showNotice(
                error.response?.data?.message ||
                "Unable to upload profile picture.",
                "error"
            );
        } finally {
            setUploadingPicture(false);
            event.target.value = "";
        }
    };

    const handlePasswordInput = (event) => {
        const { name, value } = event.target;

        setPasswordForm((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const handleChangePassword = async (event) => {
        event.preventDefault();

        if (
            !passwordForm.currentPassword ||
            !passwordForm.newPassword ||
            !passwordForm.confirmPassword
        ) {
            showNotice(
                "Please complete all password fields.",
                "error"
            );
            return;
        }

        if (passwordForm.newPassword.length < 8) {
            showNotice(
                "New password must be at least 8 characters.",
                "error"
            );
            return;
        }

        if (
            passwordForm.newPassword !==
            passwordForm.confirmPassword
        ) {
            showNotice(
                "New passwords do not match.",
                "error"
            );
            return;
        }

        if (
            passwordForm.currentPassword ===
            passwordForm.newPassword
        ) {
            showNotice(
                "New password must be different from your current password.",
                "error"
            );
            return;
        }

        try {
            setChangingPassword(true);

            const response = await axios.patch(
                "http://192.168.0.3:5005/api/v1/change-password",
                {
                    currentPassword:
                        passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword,
                    confirmPassword:
                        passwordForm.confirmPassword,
                },
                {
                    headers: getHeaders(),
                }
            );

            setPasswordForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });

            showNotice(
                response.data?.message ||
                "Password changed successfully."
            );

            window.setTimeout(() => {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("role");
                localStorage.removeItem("firstname");
                localStorage.removeItem("lastname");

                navigate("/admin/login");
            }, 1800);
        } catch (error) {
            console.log(
                "ADMIN CHANGE PASSWORD ERROR:",
                error
            );

            if (
                error.response?.status === 401 ||
                error.response?.status === 403
            ) {
                handleUnauthorized();
                return;
            }

            showNotice(
                error.response?.data?.message ||
                "Unable to change password.",
                "error"
            );
        } finally {
            setChangingPassword(false);
        }
    };

    const handlePreference = (name) => {
        setPreferences((current) => ({
            ...current,
            [name]: !current[name],
        }));
    };

    const savePreferences = () => {
        localStorage.setItem(
            "adminNotificationPreferences",
            JSON.stringify(preferences)
        );

        showNotice(
            "Notification preferences saved successfully."
        );
    };

    const getInitials = () => {
        const first =
            profile.firstname?.trim()?.charAt(0) || "";

        const last =
            profile.lastname?.trim()?.charAt(0) || "";

        const initials =
            `${first}${last}`.toUpperCase();

        return initials || "A";
    };

    const getFullName = () => {
        const name = `${profile.firstname || ""} ${profile.lastname || ""
            }`.trim();

        return name || "Vibely Admin";
    };

    const formatRole = (role) => {
        if (!role) {
            return "Administrator";
        }

        return role
            .replaceAll("_", " ")
            .replace(/\b\w/g, (letter) =>
                letter.toUpperCase()
            );
    };

    const formatStatus = (status) => {
        if (!status) {
            return "Active";
        }

        return status
            .replaceAll("_", " ")
            .replace(/\b\w/g, (letter) =>
                letter.toUpperCase()
            );
    };

    const handleLogout = async () => {
        const refreshToken =
            localStorage.getItem("refreshToken");

        try {
            if (getToken() && refreshToken) {
                await axios.post(
                    "http://192.168.0.3:5005/api/v1/logout",
                    {
                        refreshToken,
                    },
                    {
                        headers: getHeaders(),
                    }
                );
            }
        } catch (error) {
            console.log("ADMIN LOGOUT ERROR:", error);
        } finally {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("role");
            localStorage.removeItem("firstname");
            localStorage.removeItem("lastname");

            navigate("/admin/login");
        }
    };

    return (
        <div className="admin-settings-page">
            {notice && (
                <div
                    className={`admin-settings-toast ${noticeType}`}
                >
                    <i
                        className={
                            noticeType === "success"
                                ? "bi bi-check-circle"
                                : "bi bi-exclamation-circle"
                        }
                    ></i>

                    <span>{notice}</span>
                </div>
            )}

            <aside className="admin-settings-sidebar">
                <div className="admin-settings-brand">
                    <div className="admin-settings-logo">
                        <img
                            src={vibelyLogo}
                            alt="Vibely Logo"
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

                    <Link
                        className="active"
                        to="/admin/settings"
                    >
                        <i className="bi bi-gear"></i>
                        Settings
                    </Link>
                </nav>

                <div className="admin-settings-sidebar-bottom">
                    <div className="admin-settings-mini-profile">
                        {profile.profilePicture ? (
                            <img
                                src={profile.profilePicture}
                                alt={getFullName()}
                            />
                        ) : (
                            <div>{getInitials()}</div>
                        )}

                        <section>
                            <strong>{getFullName()}</strong>
                            <span>{formatRole(profile.role)}</span>
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

            <main className="admin-settings-main">
                <header className="admin-settings-header">
                    <div>
                        <span>ADMIN ACCOUNT</span>
                        <h1>Profile & Settings</h1>
                    </div>

                    <div className="admin-settings-header-user">
                        <Link to="/admin/notifications">
                            <i className="bi bi-bell"></i>
                        </Link>

                        <div>
                            {profile.profilePicture ? (
                                <img
                                    src={profile.profilePicture}
                                    alt={getFullName()}
                                />
                            ) : (
                                <span>{getInitials()}</span>
                            )}

                            <section>
                                <strong>{getFullName()}</strong>
                                <small>
                                    {formatRole(profile.role)}
                                </small>
                            </section>
                        </div>
                    </div>
                </header>

                <div className="admin-settings-content">
                    <section className="admin-settings-hero">
                        <div>
                            <span>ADMINISTRATOR ACCOUNT</span>

                            <h2>
                                Manage your Vibely admin workspace.
                            </h2>

                            <p>
                                Update your administrator profile,
                                manage security and control your
                                workspace preferences.
                            </p>
                        </div>

                        <div className="admin-settings-hero-art">
                            {profile.profilePicture ? (
                                <img
                                    src={profile.profilePicture}
                                    alt={getFullName()}
                                />
                            ) : (
                                <div>{getInitials()}</div>
                            )}

                            <span>ADMINISTRATOR</span>
                            <strong>{getFullName()}</strong>
                        </div>
                    </section>

                    <section className="admin-settings-layout">
                        <aside className="admin-settings-menu">
                            <div className="admin-settings-account-card">
                                {profile.profilePicture ? (
                                    <img
                                        src={profile.profilePicture}
                                        alt={getFullName()}
                                    />
                                ) : (
                                    <div>{getInitials()}</div>
                                )}

                                <strong>{getFullName()}</strong>
                                <span>{formatRole(profile.role)}</span>

                                <small>
                                    <i className="bi bi-shield-check"></i>
                                    Protected account
                                </small>
                            </div>

                            <button
                                type="button"
                                className={
                                    activeSection === "profile"
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setActiveSection("profile")
                                }
                            >
                                <i className="bi bi-person"></i>

                                <span>
                                    <strong>Profile</strong>
                                    <small>Account information</small>
                                </span>
                            </button>

                            <button
                                type="button"
                                className={
                                    activeSection === "security"
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setActiveSection("security")
                                }
                            >
                                <i className="bi bi-shield-lock"></i>

                                <span>
                                    <strong>Security</strong>
                                    <small>Password & access</small>
                                </span>
                            </button>

                            <button
                                type="button"
                                className={
                                    activeSection === "notifications"
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setActiveSection("notifications")
                                }
                            >
                                <i className="bi bi-bell"></i>

                                <span>
                                    <strong>Notifications</strong>
                                    <small>Alert preferences</small>
                                </span>
                            </button>

                            <button
                                type="button"
                                className={
                                    activeSection === "system"
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setActiveSection("system")
                                }
                            >
                                <i className="bi bi-sliders"></i>

                                <span>
                                    <strong>System</strong>
                                    <small>Workspace information</small>
                                </span>
                            </button>
                        </aside>

                        <section className="admin-settings-panel">
                            {activeSection === "profile" && (
                                <div className="admin-settings-section">
                                    <div className="admin-settings-section-heading">
                                        <div>
                                            <span>PROFILE DETAILS</span>

                                            <h3>
                                                Administrator information
                                            </h3>

                                            <p>
                                                View and manage your
                                                administrator account
                                                information.
                                            </p>
                                        </div>

                                        <div className="admin-settings-secure">
                                            <i className="bi bi-shield-check"></i>
                                            Protected
                                        </div>
                                    </div>

                                    {loading ? (
                                        <div className="admin-settings-loading">
                                            <div className="admin-settings-loader"></div>

                                            <span>
                                                Loading administrator
                                                profile...
                                            </span>
                                        </div>
                                    ) : profileError ? (
                                        <div className="admin-settings-error">
                                            <i className="bi bi-exclamation-circle"></i>

                                            <div>
                                                <strong>
                                                    Unable to load profile
                                                </strong>

                                                <span>{profileError}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="admin-settings-picture-section">
                                                <div className="admin-settings-picture">
                                                    {profile.profilePicture ? (
                                                        <img
                                                            src={
                                                                profile.profilePicture
                                                            }
                                                            alt={getFullName()}
                                                        />
                                                    ) : (
                                                        <span>
                                                            {getInitials()}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="admin-settings-picture-copy">
                                                    <strong>
                                                        Profile picture
                                                    </strong>

                                                    <p>
                                                        Upload a clear image for
                                                        your administrator account.
                                                    </p>

                                                    <button
                                                        type="button"
                                                        onClick={
                                                            handlePictureSelect
                                                        }
                                                        disabled={
                                                            uploadingPicture
                                                        }
                                                    >
                                                        {uploadingPicture ? (
                                                            <>
                                                                <i className="bi bi-arrow-repeat"></i>
                                                                Uploading...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="bi bi-camera"></i>
                                                                Change picture
                                                            </>
                                                        )}
                                                    </button>

                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={
                                                            handlePictureUpload
                                                        }
                                                        hidden
                                                    />
                                                </div>
                                            </div>

                                            <form
                                                className="admin-settings-profile-form"
                                                onSubmit={handleProfileSave}
                                            >
                                                <div className="admin-settings-form-grid">
                                                    <label>
                                                        <span>First name</span>

                                                        <div
                                                            className={
                                                                !isEditingProfile
                                                                    ? "admin-settings-locked-input"
                                                                    : ""
                                                            }
                                                        >
                                                            <input
                                                                type="text"
                                                                name="firstname"
                                                                value={
                                                                    isEditingProfile
                                                                        ? editProfile.firstname
                                                                        : profile.firstname
                                                                }
                                                                onChange={
                                                                    handleProfileInput
                                                                }
                                                                placeholder="First name"
                                                                readOnly={
                                                                    !isEditingProfile
                                                                }
                                                            />

                                                            {!isEditingProfile && (
                                                                <i className="bi bi-lock"></i>
                                                            )}
                                                        </div>
                                                    </label>

                                                    <label>
                                                        <span>Last name</span>

                                                        <div
                                                            className={
                                                                !isEditingProfile
                                                                    ? "admin-settings-locked-input"
                                                                    : ""
                                                            }
                                                        >
                                                            <input
                                                                type="text"
                                                                name="lastname"
                                                                value={
                                                                    isEditingProfile
                                                                        ? editProfile.lastname
                                                                        : profile.lastname
                                                                }
                                                                onChange={
                                                                    handleProfileInput
                                                                }
                                                                placeholder="Last name"
                                                                readOnly={
                                                                    !isEditingProfile
                                                                }
                                                            />

                                                            {!isEditingProfile && (
                                                                <i className="bi bi-lock"></i>
                                                            )}
                                                        </div>
                                                    </label>

                                                    <label>
                                                        <span>Email address</span>

                                                        <div className="admin-settings-locked-input">
                                                            <input
                                                                type="email"
                                                                value={profile.email}
                                                                readOnly
                                                            />

                                                            <i className="bi bi-lock"></i>
                                                        </div>

                                                        <small>
                                                            Admin email is permanently
                                                            locked.
                                                        </small>
                                                    </label>

                                                    <label>
                                                        <span>Role</span>

                                                        <div className="admin-settings-locked-input">
                                                            <input
                                                                type="text"
                                                                value={formatRole(
                                                                    profile.role
                                                                )}
                                                                readOnly
                                                            />

                                                            <i className="bi bi-shield-lock"></i>
                                                        </div>
                                                    </label>

                                                    <label>
                                                        <span>
                                                            Account status
                                                        </span>

                                                        <div className="admin-settings-locked-input">
                                                            <input
                                                                type="text"
                                                                value={formatStatus(
                                                                    profile.accountStatus
                                                                )}
                                                                readOnly
                                                            />

                                                            <i className="bi bi-lock"></i>
                                                        </div>
                                                    </label>
                                                </div>

                                                <div className="admin-settings-form-actions">
                                                    {!isEditingProfile ? (
                                                        <button
                                                            type="button"
                                                            className="admin-settings-primary-btn"
                                                            onClick={
                                                                handleStartProfileEdit
                                                            }
                                                        >
                                                            <i className="bi bi-pencil-square"></i>
                                                            Edit Profile
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="admin-settings-secondary-btn"
                                                                onClick={
                                                                    handleCancelProfileEdit
                                                                }
                                                                disabled={
                                                                    savingProfile
                                                                }
                                                            >
                                                                Cancel
                                                            </button>

                                                            <button
                                                                type="submit"
                                                                className="admin-settings-primary-btn"
                                                                disabled={
                                                                    savingProfile
                                                                }
                                                            >
                                                                {savingProfile ? (
                                                                    <>
                                                                        <i className="bi bi-arrow-repeat"></i>
                                                                        Saving...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <i className="bi bi-check2"></i>
                                                                        Save Changes
                                                                    </>
                                                                )}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </form>
                                        </>
                                    )}
                                </div>
                            )}

                            {activeSection === "security" && (
                                <div className="admin-settings-section">
                                    <div className="admin-settings-section-heading">
                                        <div>
                                            <span>SECURITY</span>

                                            <h3>
                                                Password & account security
                                            </h3>

                                            <p>
                                                Change your administrator
                                                password securely.
                                            </p>
                                        </div>

                                        <div className="admin-settings-secure">
                                            <i className="bi bi-shield-lock"></i>
                                            Secured
                                        </div>
                                    </div>

                                    <div className="admin-settings-security-card">
                                        <div className="admin-settings-security-icon">
                                            <i className="bi bi-key"></i>
                                        </div>

                                        <div>
                                            <strong>
                                                Change your password
                                            </strong>

                                            <p>
                                                Enter your current password
                                                before creating a new password.
                                                You will be required to log in
                                                again after changing it.
                                            </p>
                                        </div>
                                    </div>

                                    <form
                                        className="admin-settings-password-form"
                                        onSubmit={handleChangePassword}
                                    >
                                        <label>
                                            <span>Current password</span>

                                            <div className="admin-settings-password-input">
                                                <input
                                                    type={
                                                        showCurrentPassword
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    name="currentPassword"
                                                    value={
                                                        passwordForm.currentPassword
                                                    }
                                                    onChange={
                                                        handlePasswordInput
                                                    }
                                                    placeholder="Enter current password"
                                                />

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowCurrentPassword(
                                                            (current) => !current
                                                        )
                                                    }
                                                >
                                                    <i
                                                        className={
                                                            showCurrentPassword
                                                                ? "bi bi-eye-slash"
                                                                : "bi bi-eye"
                                                        }
                                                    ></i>
                                                </button>
                                            </div>
                                        </label>

                                        <label>
                                            <span>New password</span>

                                            <div className="admin-settings-password-input">
                                                <input
                                                    type={
                                                        showNewPassword
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    name="newPassword"
                                                    value={
                                                        passwordForm.newPassword
                                                    }
                                                    onChange={
                                                        handlePasswordInput
                                                    }
                                                    placeholder="At least 8 characters"
                                                />

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowNewPassword(
                                                            (current) => !current
                                                        )
                                                    }
                                                >
                                                    <i
                                                        className={
                                                            showNewPassword
                                                                ? "bi bi-eye-slash"
                                                                : "bi bi-eye"
                                                        }
                                                    ></i>
                                                </button>
                                            </div>
                                        </label>

                                        <label>
                                            <span>
                                                Confirm new password
                                            </span>

                                            <div className="admin-settings-password-input">
                                                <input
                                                    type={
                                                        showConfirmPassword
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    name="confirmPassword"
                                                    value={
                                                        passwordForm.confirmPassword
                                                    }
                                                    onChange={
                                                        handlePasswordInput
                                                    }
                                                    placeholder="Repeat new password"
                                                />

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowConfirmPassword(
                                                            (current) => !current
                                                        )
                                                    }
                                                >
                                                    <i
                                                        className={
                                                            showConfirmPassword
                                                                ? "bi bi-eye-slash"
                                                                : "bi bi-eye"
                                                        }
                                                    ></i>
                                                </button>
                                            </div>
                                        </label>

                                        <div className="admin-settings-password-note">
                                            <i className="bi bi-info-circle"></i>

                                            <span>
                                                Your new password must contain
                                                at least 8 characters and must
                                                be different from your current
                                                password.
                                            </span>
                                        </div>

                                        <button
                                            type="submit"
                                            className="admin-settings-primary-btn"
                                            disabled={changingPassword}
                                        >
                                            {changingPassword ? (
                                                <>
                                                    <i className="bi bi-arrow-repeat"></i>
                                                    Changing password...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-shield-check"></i>
                                                    Change password
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </div>
                            )}

                            {activeSection === "notifications" && (
                                <div className="admin-settings-section">
                                    <div className="admin-settings-section-heading">
                                        <div>
                                            <span>
                                                NOTIFICATION PREFERENCES
                                            </span>

                                            <h3>
                                                Choose your admin alerts
                                            </h3>

                                            <p>
                                                Control which platform
                                                activities you want highlighted
                                                in your admin workspace.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="admin-settings-preferences">
                                        <div className="admin-settings-preference">
                                            <div>
                                                <i className="bi bi-person-check"></i>

                                                <section>
                                                    <strong>
                                                        Provider applications
                                                    </strong>

                                                    <span>
                                                        Alerts for new organizer
                                                        and food vendor
                                                        applications.
                                                    </span>
                                                </section>
                                            </div>

                                            <button
                                                type="button"
                                                className={
                                                    preferences.providerAlerts
                                                        ? "active"
                                                        : ""
                                                }
                                                onClick={() =>
                                                    handlePreference(
                                                        "providerAlerts"
                                                    )
                                                }
                                            >
                                                <span></span>
                                            </button>
                                        </div>

                                        <div className="admin-settings-preference">
                                            <div>
                                                <i className="bi bi-credit-card"></i>

                                                <section>
                                                    <strong>
                                                        Payment alerts
                                                    </strong>

                                                    <span>
                                                        Alerts for payment and
                                                        refund activity.
                                                    </span>
                                                </section>
                                            </div>

                                            <button
                                                type="button"
                                                className={
                                                    preferences.paymentAlerts
                                                        ? "active"
                                                        : ""
                                                }
                                                onClick={() =>
                                                    handlePreference(
                                                        "paymentAlerts"
                                                    )
                                                }
                                            >
                                                <span></span>
                                            </button>
                                        </div>

                                        <div className="admin-settings-preference">
                                            <div>
                                                <i className="bi bi-ticket-perforated"></i>

                                                <section>
                                                    <strong>
                                                        Booking alerts
                                                    </strong>

                                                    <span>
                                                        Alerts for booking and order
                                                        activity.
                                                    </span>
                                                </section>
                                            </div>

                                            <button
                                                type="button"
                                                className={
                                                    preferences.bookingAlerts
                                                        ? "active"
                                                        : ""
                                                }
                                                onClick={() =>
                                                    handlePreference(
                                                        "bookingAlerts"
                                                    )
                                                }
                                            >
                                                <span></span>
                                            </button>
                                        </div>

                                        <div className="admin-settings-preference">
                                            <div>
                                                <i className="bi bi-shield-exclamation"></i>

                                                <section>
                                                    <strong>
                                                        Security alerts
                                                    </strong>

                                                    <span>
                                                        Keep important account and
                                                        security notifications
                                                        enabled.
                                                    </span>
                                                </section>
                                            </div>

                                            <button
                                                type="button"
                                                className={
                                                    preferences.securityAlerts
                                                        ? "active"
                                                        : ""
                                                }
                                                onClick={() =>
                                                    handlePreference(
                                                        "securityAlerts"
                                                    )
                                                }
                                            >
                                                <span></span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="admin-settings-form-actions">
                                        <button
                                            type="button"
                                            className="admin-settings-primary-btn"
                                            onClick={savePreferences}
                                        >
                                            <i className="bi bi-check2"></i>
                                            Save preferences
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeSection === "system" && (
                                <div className="admin-settings-section">
                                    <div className="admin-settings-section-heading">
                                        <div>
                                            <span>SYSTEM</span>

                                            <h3>
                                                Vibely workspace
                                            </h3>

                                            <p>
                                                Administrator workspace and
                                                account information.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="admin-settings-system-grid">
                                        <article>
                                            <i className="bi bi-shield-check"></i>

                                            <div>
                                                <span>Access level</span>
                                                <strong>
                                                    {formatRole(profile.role)}
                                                </strong>
                                            </div>
                                        </article>

                                        <article>
                                            <i className="bi bi-person-check"></i>

                                            <div>
                                                <span>Account status</span>
                                                <strong>
                                                    {formatStatus(
                                                        profile.accountStatus
                                                    )}
                                                </strong>
                                            </div>
                                        </article>

                                        <article>
                                            <i className="bi bi-envelope"></i>

                                            <div>
                                                <span>Admin email</span>
                                                <strong>
                                                    {profile.email || "—"}
                                                </strong>
                                            </div>
                                        </article>

                                        <article>
                                            <i className="bi bi-lock"></i>

                                            <div>
                                                <span>Authentication</span>
                                                <strong>
                                                    Protected access
                                                </strong>
                                            </div>
                                        </article>
                                    </div>
                                </div>
                            )}
                        </section>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default AdminSettings;