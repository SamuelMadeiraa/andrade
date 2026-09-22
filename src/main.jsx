import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { MotionConfig } from "framer-motion";
import App from "./App";
import { ConteudoProvider } from "./conteudo/Conteudo";
import "./styles/global.css";

// o painel fica num pedaço separado do bundle: visitante nunca baixa ele
const Admin = lazy(() => import("./admin/Admin"));
const ehAdmin = window.location.pathname.replace(/\/+$/, "") === "/admin";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {ehAdmin ? (
      <Suspense fallback={null}>
        <Admin />
      </Suspense>
    ) : (
      <ConteudoProvider>
        {/* respeita prefers-reduced-motion em todo o site */}
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
      </ConteudoProvider>
    )}
  </React.StrictMode>
);
