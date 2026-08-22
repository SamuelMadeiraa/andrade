import logo from "../assets/logo-lobo.png";
import "./Marca.css";

/**
 * O lobo dentro da grega. O arquivo é um PNG 1-bit P&B com fundo
 * branco, então o fundo é removido por blend-mode:
 *   on="ink"  -> inverte e usa screen (o branco vira preto e some)
 *   on="bone" -> multiply (o branco some direto)
 * Trocar por um SVG limpo depois é plug-and-play: só mudar o import.
 */
export default function Marca({ size = 64, on = "ink", className = "", alt = "" }) {
  return (
    <div
      className={`mark mark--${on} ${className}`}
      style={{ width: size, height: size }}
    >
      <img src={logo} alt={alt} aria-hidden={alt ? undefined : "true"} draggable="false" />
    </div>
  );
}
