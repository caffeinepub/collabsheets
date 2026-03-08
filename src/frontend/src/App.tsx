import { Toaster } from "@/components/ui/sonner";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { createRootRoute, createRoute } from "@tanstack/react-router";
import { UserProvider } from "./context/UserContext";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import SheetPage from "./pages/SheetPage";

// Root route
const rootRoute = createRootRoute({
  component: () => <></>,
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: AuthPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const sheetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sheet/$id",
  component: SheetPage,
});

const routeTree = rootRoute.addChildren([
  authRoute,
  dashboardRoute,
  sheetRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <UserProvider>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" theme="dark" />
    </UserProvider>
  );
}
