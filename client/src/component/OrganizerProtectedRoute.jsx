import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://eventbookingsystem-sooty.vercel.app/api/v1";

const getAccountStatus = (data) => {
  const message = String(data?.message || "").toLowerCase();

  const accountStatus = String(
    data?.accountStatus ||
    data?.data?.accountStatus ||
    data?.data?.organizer?.accountStatus ||
    ""
  ).toLowerCase();

  const approvalStatus = String(
    data?.approvalStatus ||
    data?.data?.approvalStatus ||
    data?.data?.organizer?.approvalStatus ||
    ""
  ).toLowerCase();

  if (
    accountStatus === "suspended" ||
    accountStatus === "inactive" ||
    message.includes("suspend") ||
    message.includes("inactive")
  ) {
    return "suspended";
  }

  if (
    approvalStatus === "rejected" ||
    message.includes("reject")
  ) {
    return "rejected";
  }

  if (
    approvalStatus === "pending" ||
    message.includes("pending") ||
    message.includes("awaiting") ||
    message.includes("not approved")
  ) {
    return "pending";
  }

  if (approvalStatus === "approved") {
    return "approved";
  }

  return "error";
};

const OrganizerProtectedRoute = () => {
  const location = useLocation();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;

    const checkOrganizer = async () => {
      const accessToken = localStorage.getItem(
        "organizerAccessToken"
      );

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

        if (!organizer || organizer.role !== "organizer") {
          setStatus("error");
          return;
        }

        const result = getAccountStatus(response.data);

        setStatus(result);
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

        if (error.response?.data) {
          setStatus(getAccountStatus(error.response.data));
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

  if (status !== "approved") {
    const notifications = {
      pending: {
        type: "error",
        title: "Approval pending",
        message:
          "Your organizer application is still awaiting admin approval. You will be able to access your dashboard after approval."
      },

      rejected: {
        type: "error",
        title: "Application rejected",
        message:
          "Your organizer application was not approved. Please contact Vibely support."
      },

      suspended: {
        type: "error",
        title: "Account suspended",
        message:
          "Your organizer account is currently suspended. Please contact Vibely support."
      },

      error: {
        type: "error",
        title: "Account verification failed",
        message:
          "We couldn't verify your organizer account. Please try signing in again."
      }
    };

    return (
      <Navigate
        to="/organizer/login"
        replace
        state={{
          returnTo: location.pathname + location.search,
          notification: notifications[status] || null
        }}
      />
    );
  }

  return <Outlet />;
};

export default OrganizerProtectedRoute;