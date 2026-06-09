import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import "./styles/design-tokens.css";
import "./index.css";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ToastProvider } from "./components/ui";
import { router } from "./router";

const savedTheme = localStorage.getItem("app-theme");
if (savedTheme && savedTheme !== "light") {
  document.documentElement.setAttribute("data-theme", savedTheme);
}

function RoutedApp() {
  const auth = useAuth();
  return <RouterProvider router={router} context={{ auth }} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <RoutedApp />
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
);
