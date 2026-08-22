import { useId } from "react";
import { motion } from "framer-motion";
import { EASE } from "../motion/variants";
import "./GregaDivider.css";

/**
 * A assinatura da marca: o meandro grego do logo, tileável,
 * que se DESENHA da esquerda pra direita quando entra na viewport.
 *
 * A unidade é o meandro contínuo — 20px de largura em userSpaceOnUse
 * (sem viewBox), então o traço repete sem distorcer em nenhuma largura.
 * A revelação é feita no wrapper (div), não no <rect>: clip-path em
 * elemento HTML é previsível em todos os navegadores.
 */
export default function GregaDivider({
  dark = false,
  height = 24,
  animate = true,
  flip = false,
  className = "",
}) {
  const id = useId().replace(/:/g, "");
  const stroke = dark ? "var(--bone)" : "var(--ink)";
  // a unidade do meandro tem 24px de altura — escala pra caber em qualquer altura
  const s = height / 24;

  return (
    <div
      className={`grega ${dark ? "grega--dark" : ""} ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      <motion.div
        className="grega__reveal"
        initial={animate ? { clipPath: "inset(0 100% 0 0)" } : false}
        whileInView={animate ? { clipPath: "inset(0 0% 0 0)" } : undefined}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 1.2, ease: EASE }}
      >
        <svg
          width="100%"
          height={height}
          style={{ transform: flip ? "scaleY(-1)" : undefined }}
        >
          <defs>
            <pattern
              id={`meander-${id}`}
              width="20"
              height="24"
              patternUnits="userSpaceOnUse"
              patternTransform={`scale(${s})`}
            >
              <path
                d="M0 21 H20 M2 21 V3 H18 V17 H6 V7 H14"
                fill="none"
                stroke={stroke}
                strokeWidth="2"
                strokeLinecap="square"
              />
            </pattern>
          </defs>
          <rect x="0" y="0" width="100%" height={height} fill={`url(#meander-${id})`} />
        </svg>
      </motion.div>
    </div>
  );
}
