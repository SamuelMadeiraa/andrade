import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import apiAndrade from "./server/api.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), apiAndrade({ senha: env.ADMIN_SENHA })],
    server: {
      // o painel grava estes arquivos; recarregar a página a cada salvamento
      // atrapalharia a edição (o site já busca a versão nova em /api/conteudo)
      watch: { ignored: ["**/src/data/conteudo.json", "**/data/**"] },
    },
  };
});
