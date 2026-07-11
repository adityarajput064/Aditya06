import { Navigate } from "react-router-dom";

export const ProtectedRoute = ({ children }) => {
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  // Ab dono chahiye - token na ho to bhi login pe bhej do
  if (!username || username === "undefined" || username === "null" || !token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
