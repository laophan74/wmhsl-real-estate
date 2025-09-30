import { createBrowserRouter } from "react-router-dom";
import MainLayout from "./layouts/MainLayout/MainLayout";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import LoginPage from "./pages/Login/LoginPage";
import HomePage from "./pages/Home/HomePage";
import { ProtectedRoute } from "./auth/ProtectedRoute";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
  { path: "/", element: <HomePage /> },
  { path: "/dashboard", element: (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  ) },
  { path: "/login", element: <LoginPage /> },
    ],
  },
]);

export default router;