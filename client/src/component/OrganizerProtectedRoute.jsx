
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const OrganizerProtectedRoute = () => {
  const location = useLocation();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;

    const checkOrganizer = async () => {
      const accessToken = localStorage.getItem("organizerAccessToken");

      if (!accessToken) {
        if (active) setStatus("login");
        return;
      }

      try {
        const response = await axios.get(
          `${API_URL}/organizer/dashboard`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );

        if (!active) return;

        const organizer = response.data?.data?.organizer;

        if (!organizer) {
          setStatus("error");
          return;
        }

        if (organizer.role && organizer.role !== "organizer") {
          setStatus("login");
          return;
        }

        const accountStatus = String(
          organizer.accountStatus || ""
        ).toLowerCase();

        const approvalStatus = String(
          organizer.approvalStatus || ""
        ).toLowerCase();

        if (
          accountStatus === "suspended" ||
          accountStatus === "inactive"
        ) {
          setStatus("suspended");
          return;
        }

        if (approvalStatus === "rejected") {
          setStatus("rejected");
          return;
        }

        if (approvalStatus === "pending") {
          setStatus("pending");
          return;
        }

        if (
          approvalStatus &&
          approvalStatus !== "approved"
        ) {
          setStatus("error");
          return;
        }

        setStatus("approved");
      } catch (error) {
        if (!active) return;

        const statusCode = error.response?.status;

        if (statusCode === 401) {
          localStorage.removeItem("organizerAccessToken");
          localStorage.removeItem("organizerRefreshToken");
          localStorage.removeItem("organizerRole");

          setStatus("login");
          return;
        }

        if (statusCode === 403) {
          const message = String(
            error.response?.data?.message || ""
          ).toLowerCase();

          if (
            message.includes("suspend") ||
            message.includes("inactive")
          ) {
            setStatus("suspended");
            return;
          }

          if (message.includes("reject")) {
            setStatus("rejected");
            return;
          }

          if (
            message.includes("pending") ||
            message.includes("approval")
          ) {
            setStatus("pending");
            return;
          }

          setStatus("error");
          return;
        }

        setStatus("error");
      }
    };

    checkOrganizer();

    return () => {
      active = false;
    };
  }, []);

  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#fff4f6",
          color: "#68001c",
          fontWeight: 600
        }}
      >
        Checking organizer account...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#fff4f6",
          padding: 24
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <h2 style={{ color: "#68001c" }}>
            Unable to verify your account
          </h2>

          <p>
            We couldn't verify your organizer account.
            Please try again.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: "#68001c",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px 24px",
              cursor: "pointer"
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (status === "login") {
    return (
      <Navigate
        to="/organizer/login"
        replace
        state={{
          returnTo: location.pathname + location.search
        }}
      />
    );
  }

  if (status === "pending") {
    return <Navigate to="/organizer/pending" replace />;
  }

  if (status === "suspended") {
    return <Navigate to="/organizer/suspended" replace />;
  }

  if (status === "rejected") {
    return <Navigate to="/organizer/rejected" replace />;
  }

  return <Outlet />;
};

export default OrganizerProtectedRoute;
