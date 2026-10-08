import { Navigate, Outlet } from "react-router-dom";

const UserProtectedRoute = () => {
  const accessToken = localStorage.getItem("accessToken");
  const role = localStorage.getItem("role");

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (role === "organizer") {
    return <Navigate to="/organizer/dashboard" replace />;
  }

  if (role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (role !== "user") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default UserProtectedRoute;