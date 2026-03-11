import { createBrowserRouter } from "react-router";
import { LandingPage } from "./pages/landing-page";
import { DashboardPage } from "./pages/dashboard-page-new";
import { PodcastPage } from "./pages/podcast-page";
import { LoginPage } from "./pages/login-page";
import { SignupPage } from "./pages/signup-page";
import { PricingPage } from "./pages/pricing-page";
import { ProtectedRoute } from "./components/protected-route";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/signup",
    Component: SignupPage,
  },
  {
    path: "/pricing",
    Component: PricingPage,
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/p/:shareId",
    Component: PodcastPage,
  },
]);