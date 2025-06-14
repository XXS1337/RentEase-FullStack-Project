import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import Spinner from '../../Shared/Spinner/Spinner';

interface GuestRouteProps {
  redirectTo?: string; // Optional prop to define where to redirect authenticated users
}

const GuestRoute: React.FC<GuestRouteProps> = ({ redirectTo = '/' }) => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // If user is authenticated and not loading, redirect to specified route
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, loading, navigate, redirectTo]);

  // While auth state is loading, show a spinner
  if (loading) {
    return <Spinner />;
  }

  // If user is not authenticated, allow access to nested route (e.g., login/register)
  return !isAuthenticated ? <Outlet /> : null;
};

export default GuestRoute;
