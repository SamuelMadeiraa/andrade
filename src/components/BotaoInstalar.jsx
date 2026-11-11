import { useState } from "react";
import { Download, Share, X } from "lucide-react";
import { useInstalar } from "../lib/pwa";
import "./BotaoInstalar.css";

// Botão "Instalar app". No Android/PC abre o diálogo do navegador;
// no iPhone (que não tem esse diálogo) mostra o passo a passo.
export default function BotaoInstalar({ className = "" }) {
  const { modo, instalar } = useInstalar();
  const [dica, setDica] = useState(false);
  if (!modo) return null;

  return (
    <>
      <button
        type="button"
        className={`instalar ${className}`}
        onClick={() => (modo === "ios" ? setDica(true) : instalar())}
      >
        <Download size={15} /> Instalar app
      </button>
      {dica && (
        <div className="instalar-dica" role="dialog" aria-label="Como instalar no iPhone" onClick={() => setDica(false)}>
          <div className="instalar-dica__caixa" onClick={(e) => e.stopPropagation()}>
            <button className="instalar-dica__fechar" onClick={() => setDica(false)} aria-label="Fechar">
              <X size={18} />
            </button>
            <strong>Instalar no iPhone</strong>
            <ol>
              <li>
                Toque em <Share size={15} aria-label="Compartilhar" /> <b>Compartilhar</b> na barra do Safari
              </li>
              <li>
                Escolha <b>Adicionar à Tela de Início</b>
              </li>
              <li>
                Toque em <b>Adicionar</b>
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
