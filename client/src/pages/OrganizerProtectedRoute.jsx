
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import axios from "axios";

const API_URL =
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const OrganizerProtectedRoute = () => {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    const checkOrganizer = async () => {
     const accessToken = localStorage.getItem("organizerAccessToken");

      if (!accessToken) {
        if (!cancelled) setStatus("notLoggedIn");
        return;
      }

      try {
        const response = await axios.get(
          `${API_URL}/profile`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            timeout: 15000,
          }
        );

        if (cancelled) return;

        const profileData = response.data.data;
        const user = profileData?.user || profileData;

        if (user?.role !== "organizer") {
          setStatus("notOrganizer");
          return;
        }

        if (user.approvalStatus !== "approved") {
          setStatus("pending");
          return;
        }

        if (user.accountStatus !== "active") {
          setStatus("suspended");
          return;
        }

        setStatus("approved");
      } catch (error) {
        if (cancelled) return;

        console.error("ORGANIZER ROUTE ERROR:", error);

        if (error.response?.status === 401) {
          setStatus("sessionExpired");
          return;
        }

        if (error.response?.status === 403) {
          setStatus("accessDenied");
          return;
        }

        setStatus("error");
      }
    };

    checkOrganizer();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="organizer-route-loading">
        <div className="organizer-route-spinner"></div>
        <h3>Vibely</h3>
        <p>Preparing your organizer workspace...</p>
      </div>
    );
  }

  if (status === "notLoggedIn") {
    return <Navigate to="/organizer/login" replace />;
  }

  if (status === "sessionExpired") {
    return (
      <div className="organizer-route-loading">
        <h3>Session expired</h3>
        <p>Your organizer session has expired. Please sign in again.</p>
        <a href="/organizer/login">Sign in again</a>
      </div>
    );
  }

  if (status === "notOrganizer") {
    return <Navigate to="/" replace />;
  }

  if (status === "pending") {
    return <Navigate to="/organizer/pending" replace />;
  }

  if (status === "suspended") {
    return <Navigate to="/organizer/suspended" replace />;
  }

  if (status === "accessDenied") {
    return (
      <div className="organizer-route-loading">
        <h3>Access denied</h3>
        <p>Your organizer account does not have access to this page.</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="organizer-route-loading">
        <h3>Unable to connect</h3>
        <p>We couldn't verify your organizer account right now.</p>
        <button onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  }

  return <Outlet />;
};

export default OrganizerProtectedRoute;
