import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import ErrorPage from '../../ErrorPage/ErrorPage';
import Spinner from '../../Shared/Spinner/Spinner';

// Props type definition for ProtectedRoute
type ProtectedRouteProps = {
  adminOnly?: boolean; // Optional flag to restrict route to admin users only
};

// Component to protect routes based on authentication and (optionally) admin role
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ adminOnly = false }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading spinner while auth state is being determined
  if (loading) return <Spinner />;

  // Redirect unauthenticated users to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If adminOnly flag is true, block access for non-admin users
  if (adminOnly && user.role !== 'admin') {
    return <ErrorPage />;
  }

  // Allow access to nested route
  return <Outlet />;
};

export default ProtectedRoute;
