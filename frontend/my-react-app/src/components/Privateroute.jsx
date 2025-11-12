import React from "react";
import { Navigate } from "react-router-dom";

// Check if user is authenticated
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("access_token");  // JWT from login
  console.log("PrivateRoute token:", token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default PrivateRoute;
