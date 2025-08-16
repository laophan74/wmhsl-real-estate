import { createBrowserRouter } from "react-router-dom";
import MainLayout from "./layouts/MainLayout/MainLayout";
import HomePage from "./pages/Home/HomePage";
import PropertiesPage from "./pages/Properties/PropertiesPage";
import AboutPage from "./pages/About/AboutPage";
import ContactPage from "./pages/Contact/ContactPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
  { path: "/", element: <HomePage /> },
  { path: "/homepage", element: <HomePage /> },
      { path: "/properties", element: <PropertiesPage /> },
      { path: "/about", element: <AboutPage /> },
      { path: "/contact", element: <ContactPage /> },
    ],
  },
]);

export default router;