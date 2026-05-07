import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import "./styles/design-tokens.css";
import "./index.css";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { router } from "./router";

function RoutedApp() {
  const auth = useAuth();
  return <RouterProvider router={router} context={{ auth }} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <RoutedApp />
    </AuthProvider>
  </StrictMode>,
);
