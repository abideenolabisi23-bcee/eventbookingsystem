import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import axios from "axios";

const OrganizerProtectedRoute = () => {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const checkOrganizer = async () => {
      const accessToken = localStorage.getItem("accessToken");

      if (!accessToken) {
        setStatus("login");
        return;
      }

      try {
        const response = await axios.get(
          "http://192.168.0.3:5005/api/v1/profile",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        const profileData = response.data.data;
        const user = profileData.user || profileData;

        if (user.role !== "organizer") {
          setStatus("login");
          return;
        }

        if (user.accountStatus === "suspended") {
          setStatus("suspended");
          return;
        }

        if (user.approvalStatus === "rejected") {
          setStatus("rejected");
          return;
        }

        if (user.approvalStatus !== "approved") {
          setStatus("pending");
          return;
        }

        setStatus("approved");
      } catch (error) {
        if (error.response?.status === 403) {
          setStatus("suspended");
          return;
        }

        if (error.response?.status === 401) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("role");

          setStatus("login");
          return;
        }

        setStatus("login");
      }
    };

    checkOrganizer();
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
        }}
      >
        Checking organizer account...
      </div>
    );
  }

  if (status === "login") {
    return <Navigate to="/organizer/login" replace />;
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