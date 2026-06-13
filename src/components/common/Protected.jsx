import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../AuthContext.jsx";
import PageLoader from "../ui/PageLoader.jsx";

export default function Protected({ children, admin = false }) {
  const auth = useAuth();
  const location = useLocation();
  if (auth.loading) return <PageLoader />;
  if (!auth.isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname, message: "Please login to continue" }} />;
  if (admin && !auth.isAdmin) return <Navigate to="/faqs" replace />;
  return children;
}

