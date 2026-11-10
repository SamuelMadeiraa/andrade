import { useEffect, useRef, useState } from "react";

/**
 * Entrada suave quando o bloco aparece na tela (uma vez só). A animação é
 * CSS (.revela em site.css): sem IntersectionObserver ou com movimento
 * reduzido, o conteúdo simplesmente já está visível.
 */
export default function Reveal({ as: Tag = "div", atraso = 0, className = "", style, children, ...resto }) {
  const ref = useRef(null);
  const [visto, setVisto] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return setVisto(true);
    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return;
        setVisto(true);
        obs.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`revela ${visto ? "is-visto" : ""} ${className}`}
      style={atraso ? { ...style, "--atraso": `${atraso}s` } : style}
      {...resto}
    >
      {children}
    </Tag>
  );
}
