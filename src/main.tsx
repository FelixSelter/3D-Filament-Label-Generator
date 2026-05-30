import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppContextWrapper from "./AppContextWrapper.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppContextWrapper>
      <App />
    </AppContextWrapper>
  </StrictMode>,
);
