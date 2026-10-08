import { Navigate, Outlet } from "react-router-dom";

const OrganizerProtectedRoute = () => {
  const accessToken = localStorage.getItem("accessToken");
  const role = localStorage.getItem("role");

  if (!accessToken) {
    return <Navigate to="/organizer/login" replace />;
  }

  if (role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (role === "user") {
    return <Navigate to="/" replace />;
  }

  if (role !== "organizer") {
    return <Navigate to="/organizer/login" replace />;
  }

  return <Outlet />;
};

export default OrganizerProtectedRoute;