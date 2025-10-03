import { useState, useEffect } from "react";
import { useAuth } from "../../context/auth";
import { Outlet, Navigate } from "react-router-dom";
import Spinner from "../Spinner";

// bug diego: added public route for pages not supposed to be accessed by authenticated users
export default function PublicRoute() {
  const [ok, setOk] = useState(null);
  const [auth] = useAuth();

  useEffect(() => {
    // Check if user is authenticated
    if (auth?.token) {
      setOk(true);
    } else {
      setOk(false);
    }
  }, [auth?.token]);

  // Show loading state while checking for authentication
  if (ok === null) {
    return <Spinner path="" />;
  }

  // If user is authenticated, redirect to home page
  return ok ? <Navigate to="/" replace /> : <Outlet />;
}
