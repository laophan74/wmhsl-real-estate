import { createBrowserRouter } from "react-router-dom";
import MainLayout from "./layouts/MainLayout/MainLayout";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import LoginPage from "./pages/Login/LoginPage";
import HomePage from "./pages/Home/HomePage";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import ProfilePage from "./pages/Profile/ProfilePage";
import { AdminRoute } from "./auth/AdminRoute";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
  { path: "/", element: <HomePage /> },
  { path: "/dashboard", element: (
    <ProtectedRoute>
      <AdminRoute>
        <DashboardPage />
      </AdminRoute>
    </ProtectedRoute>
  ) },
  { path: "/login", element: <LoginPage /> },
  { path: "/profile", element: (
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  ) },
    ],
  },
]);

export default router;