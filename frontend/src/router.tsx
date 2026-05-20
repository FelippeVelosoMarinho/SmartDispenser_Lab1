import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";
import type { AuthContextValue } from "./auth/AuthContext";
import { AppLayout } from "./layouts/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { PatientsPage } from "./pages/PatientsPage";
import { AddPatientPage } from "./pages/AddPatientPage";
import { EditPatientPage } from "./pages/EditPatientPage";
import { DispensersPage } from "./pages/DispensersPage";
import { PairDispenserPage } from "./pages/PairDispenserPage";
import { PatientMedicationsPage } from "./pages/PatientMedicationsPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { NotFoundPage } from "./pages/NotFoundPage";

interface RouterContext {
  auth: AuthContextValue;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
  notFoundComponent: NotFoundPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: (search: Record<string, unknown>) => ({
    redirect:
      typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: LoginPage,
});

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_authenticated",
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: AppLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const patientsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/patients",
  component: PatientsPage,
});

const addPatientRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/patients/new",
  component: AddPatientPage,
});

const editPatientRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/patients/$patientId/edit",
  component: EditPatientPage,
});

const patientMedicationsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/patients/$patientId/medications",
  component: PatientMedicationsPage,
});

const dispensersRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dispensers",
  component: DispensersPage,
});

const pairDispenserRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dispensers/pair",
  component: PairDispenserPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/register",
    component: RegisterPage,
  }),
  authenticatedRoute.addChildren([
    indexRoute,
    dashboardRoute,
    patientsRoute,
    addPatientRoute,
    editPatientRoute,
    patientMedicationsRoute,
    dispensersRoute,
    pairDispenserRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  context: { auth: undefined! },
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
