import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';

import './App.css';
import AppLayout from './components/Layout/AppLayout/AppLayout';
import Home, { homeLoader } from './components/Pages/Flats/Home/Home';
import Login, { loginAction } from './components/Auth/Login';
import ForgotPassword, { forgotPasswordAction } from './components/Auth/ForgotPassword';
import ResetPassword, { resetPasswordAction } from './components/Auth/ResetPassword';
import ErrorPage from './components/ErrorPage/ErrorPage';
import GuestRoute from './components/Shared/GuestRoute/GuestRoute';
import ProtectedRoute from './components/Shared/ProtectedRoute/ProtectedRoute';
import Register, { registerAction } from './components/Auth/Register';
import MyFlats, { myFlatsLoader } from './components/User/MyFlats/MyFlats';
import Favorites, { favoritesLoader } from './components/User/Favorites/Favorites';
import ViewFlat, { viewFlatLoader } from './components/Pages/Flats/ViewFlat/ViewFlat';
import Messages, { messagesLoader, messagesAction } from './components/Pages/Flats/Messages/Messages';
import EditFlat, { editFlatLoader, editFlatAction } from './components/Pages/Flats/EditFlat/EditFlat';
import NewFlat, { newFlatAction } from './components/Pages/Flats/NewFlat/NewFlat';
import MyProfile, { myProfileLoader, myProfileAction } from './components/User/MyProfile/MyProfile';
import AllUsers, { allUsersLoader } from './components/Pages/Admin/AllUsers/AllUsers';
import EditUser, { editUserLoader, editUserAction } from './components/Pages/Admin/EditUser/EditUser';

// Router configuration
const router = createBrowserRouter([
  {
    // Main application layout
    path: '/',
    element: <AppLayout />,
    children: [
      {
        // Home page route
        index: true,
        element: <Home />,
        loader: homeLoader,
      },
      {
        // Restrict login and register to guests only
        element: <GuestRoute />,
        children: [
          {
            path: 'login',
            element: <Login />,
            action: loginAction,
          },
          {
            path: 'register',
            element: <Register />,
            action: registerAction,
          },
          {
            path: 'forgot-password',
            element: <ForgotPassword />,
            action: forgotPasswordAction,
          },
          {
            path: 'reset-password/:token',
            element: <ResetPassword />,
            action: resetPasswordAction,
          },
        ],
      },
      {
        // MyFlats section under protected routes
        path: 'myFlats',
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: <MyFlats />,
            loader: myFlatsLoader,
          },
        ],
      },
      {
        // Favorites section under protected routes
        path: 'favorites',
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: <Favorites />,
            loader: favoritesLoader,
          },
        ],
      },
      {
        // Routes related to flats (new, edit, view)
        path: 'flats',
        element: <ProtectedRoute />,
        children: [
          {
            path: 'new',
            element: <NewFlat />,
            action: newFlatAction,
          },
          {
            path: 'edit/:flatID',
            element: <EditFlat />,
            loader: editFlatLoader,
            action: editFlatAction,
            errorElement: <ErrorPage />,
          },
          {
            path: 'view/:flatID',
            element: <ViewFlat />,
            loader: viewFlatLoader,
            errorElement: <ErrorPage />,
            children: [
              {
                path: 'messages',
                element: <Messages />,
                loader: messagesLoader,
                action: messagesAction,
              },
            ],
          },
        ],
      },
      {
        // User profile page route
        path: 'profile',
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: <MyProfile />,
            loader: myProfileLoader,
            action: myProfileAction,
          },
        ],
      },
      {
        // Admin-specific routes
        path: 'admin',
        element: <ProtectedRoute adminOnly={true} />,
        children: [
          {
            path: 'all-users',
            element: <AllUsers />,
            loader: allUsersLoader,
          },
          {
            path: 'edit-user/:id',
            element: <EditUser />,
            loader: editUserLoader,
            action: editUserAction,
            errorElement: <ErrorPage />,
          },
        ],
      },
      {
        // Catch-all for undefined routes
        path: '*',
        element: <ErrorPage />,
      },
    ],
  },
]);

// Main application entry point
const App: React.FC = () => (
  <AuthProvider>
    <ThemeProvider>
      <LanguageProvider>
        <RouterProvider router={router} />
      </LanguageProvider>
    </ThemeProvider>
  </AuthProvider>
);

export default App;
