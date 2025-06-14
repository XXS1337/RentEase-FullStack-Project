import { createContext, useContext, useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import axios from './../api/axiosConfig';
import type { ReactNode } from 'react';
import type User from './../types/User';

// Define the shape of the AuthContext
type AuthContextType = {
  user: User | null; // The currently logged-in user or null
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean; // Indicates if the auth state is being initialized
  login: (userData: User, token: string) => void; // Function to log in a user
  logout: () => void; // Function to log out the user
  isAuthenticated: boolean; // Indicates if a user is logged in
};

type BackendUser = User & { _id: string };

// Create the context with undefined as default to enforce use within a provider
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component that wraps around parts of the app that need authentication context
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null); // Holds the authenticated user
  const [loading, setLoading] = useState(true); // Indicates loading state when initializing

  // On component mount, check if a token exists in cookies and load the user
  useEffect(() => {
    const loadUser = async () => {
      const token = Cookies.get('token');
      if (!token) {
        setLoading(false); // No token, done loading
        return;
      }

      try {
        // Attempt to fetch the current user using the token
        const { data } = await axios.get('/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const transformedUser = { ...data.currentUser, id: data.currentUser._id };
        setUser(transformedUser);
      } catch (error) {
        console.error('Error loading user:', error);
        Cookies.remove('token'); // Remove token if invalid
        setUser(null);
      } finally {
        setLoading(false); // Always stop loading regardless of result
      }
    };

    loadUser(); // Invoke function
  }, []);

  // 🔄 Periodic role or user existence check
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = Cookies.get('token');
      if (!token) return;

      try {
        const { data } = await axios.get('/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUser((prevUser) => {
          if (!data.currentUser) {
            Cookies.remove('token');
            return null;
          }

          if (prevUser && (prevUser.role !== data.currentUser.role || prevUser.email !== data.currentUser.email || prevUser.firstName !== data.currentUser.firstName || prevUser.lastName !== data.currentUser.lastName)) {
            return { ...data.currentUser, id: data.currentUser._id };
          }

          return prevUser;
        });
      } catch (err: any) {
        if (err?.response?.status === 401 || err?.response?.status === 404) {
          Cookies.remove('token');
          setUser(null);
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Log in function: saves token to cookies and sets user
  const login = (userData: User, token: string) => {
    // Save token in browser cookie (expires in 1 day, but JWT itself is valid only for LOGIN_EXPIRES duration set in backend)
    Cookies.set('token', token, { expires: 1 });

    // Reset the "sessionExpired" flag after login so alerts can appear again on next expiration
    sessionStorage.removeItem('sessionExpired');

    setUser({ ...(userData as BackendUser), id: (userData as BackendUser)._id });
  };

  // Log out function: removes token and resets user
  const logout = () => {
    Cookies.remove('token');
    setUser(null);
    // Optional redirect to login page
    window.location.href = '/login';
  };

  // Boolean flag indicating if a user is authenticated
  const isAuthenticated = !!user;

  // Provide context values to children components
  return <AuthContext.Provider value={{ user, setUser, loading, login, logout, isAuthenticated }}>{children}</AuthContext.Provider>;
};

// Custom hook for accessing the AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
