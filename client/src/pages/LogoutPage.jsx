import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function LogoutPage() {
  const { logout } = useAuth();

  useEffect(() => {
    logout();
  }, [logout]);

  return <Navigate to="/login" replace />;
}
