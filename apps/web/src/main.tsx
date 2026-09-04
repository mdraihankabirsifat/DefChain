import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { CopyToastProvider } from "./copy-toast";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CopyToastProvider>
      <App />
    </CopyToastProvider>
  </StrictMode>,
);
