import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { MotionConfig } from "framer-motion";
import App from "./App";
import { ConteudoProvider } from "./conteudo/Conteudo";
import { ativarPwa } from "./lib/pwa";
import "./styles/global.css";

// o painel fica num pedaço separado do bundle: visitante nunca baixa ele
const Admin = lazy(() => import("./admin/Admin"));
const AreaDoAluno = lazy(() => import("./aluno/Aluno"));
const caminho = window.location.pathname.replace(/\/+$/, "");
const ehAdmin = caminho === "/admin";
const ehAluno = caminho === "/aluno";

// área do aluno e painel do professor viram apps instaláveis (PWA)
if (ehAdmin) ativarPwa("admin");
if (ehAluno) ativarPwa("aluno");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {ehAdmin ? (
      <Suspense fallback={null}>
        <Admin />
      </Suspense>
    ) : ehAluno ? (
      <Suspense fallback={null}>
        <AreaDoAluno />
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
