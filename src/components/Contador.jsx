import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

/**
 * Conta de 0 até o valor quando entra na tela.
 * Se o valor ainda for placeholder ("[XX]"), só exibe o texto como está.
 */
export default function Contador({ valor, sufixo = "", duracao = 1400 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });
  const alvo = Number(String(valor).replace(/\D/g, ""));
  const numerico = Number.isFinite(alvo) && alvo > 0 && !String(valor).includes("[");
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView || !numerico) return;
    const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduz) return setN(alvo);
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / duracao, 1);
      setN(Math.round(alvo * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, numerico, alvo, duracao]);

  return (
    <span ref={ref}>
      {numerico ? n : valor}
      {sufixo}
    </span>
  );
}
