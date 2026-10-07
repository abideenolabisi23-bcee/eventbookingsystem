import { Navigate, Outlet } from "react-router-dom";

const AdminProtectedRoute = () => {
  const accessToken =
    localStorage.getItem("accessToken");

  const role =
    localStorage.getItem("role");

  if (!accessToken || role !== "admin") {
    return (
      <Navigate
        to="/admin/login"
        replace
      />
    );
  }

  return <Outlet />;
};

export default AdminProtectedRoute;