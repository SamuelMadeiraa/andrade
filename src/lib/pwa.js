// Transforma /aluno e /admin em apps instaláveis (PWA).
// Cada um tem seu manifesto e escopo, então viram dois apps separados no celular.

import { useEffect, useState } from "react";

// o Chrome dispara este evento cedo, às vezes antes do React montar o botão
let promptGuardado = null;
const ouvintes = new Set();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    promptGuardado = e;
    ouvintes.forEach((f) => f());
  });
  window.addEventListener("appinstalled", () => {
    promptGuardado = null;
    ouvintes.forEach((f) => f());
  });
}

export function ativarPwa(app) {
  const head = document.head;
  const add = (tag, attrs) => {
    const el = document.createElement(tag);
    Object.assign(el, attrs);
    head.appendChild(el);
  };
  add("link", { rel: "manifest", href: `/${app}.webmanifest` });
  // iPhone/iPad
  head.querySelector('link[rel="apple-touch-icon"]')?.remove();
  add("link", { rel: "apple-touch-icon", href: "/icones/apple-touch-icon.png" });
  add("meta", { name: "apple-mobile-web-app-capable", content: "yes" });
  add("meta", { name: "mobile-web-app-capable", content: "yes" });
  add("meta", { name: "apple-mobile-web-app-status-bar-style", content: "black" });
  add("meta", { name: "apple-mobile-web-app-title", content: app === "aluno" ? "Andrade Aluno" : "Andrade Prof" });

  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js", { scope: `/${app}` }).catch(() => {});
    });
  }
}

const rodandoComoApp = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

const ehIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// { modo: "prompt" | "ios" | null, instalar() }
export function useInstalar() {
  const [, forcar] = useState(0);
  useEffect(() => {
    const f = () => forcar((n) => n + 1);
    ouvintes.add(f);
    return () => ouvintes.delete(f);
  }, []);

  if (rodandoComoApp()) return { modo: null, instalar: () => {} };
  if (promptGuardado) {
    return {
      modo: "prompt",
      instalar: async () => {
        const p = promptGuardado;
        try {
          await p.prompt();
          await p.userChoice;
        } catch {
          return; // sem gesto do usuário o navegador recusa; o botão continua lá
        }
        promptGuardado = null;
        ouvintes.forEach((f) => f());
      },
    };
  }
  if (ehIOS()) return { modo: "ios", instalar: () => {} };
  return { modo: null, instalar: () => {} };
}
