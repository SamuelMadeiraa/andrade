/**
 * Uma faixa de jiu-jitsu: o tecido na cor da graduação, a ponteira e os graus.
 * Na preta a ponteira é vermelha, como no kimono.
 */
export default function Faixa({ cor, graus = 0, className = "" }) {
  if (!cor) return null;
  return (
    <span
      className={`faixa ${cor.ponteiraClara ? "faixa--preta" : ""} ${className}`}
      style={{ "--faixa": cor.hex }}
      aria-hidden="true"
    >
      <span className="faixa__ponteira">
        {Array.from({ length: Math.min(graus, 6) }).map((_, i) => (
          <i key={i} />
        ))}
      </span>
    </span>
  );
}
