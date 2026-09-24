/**
 * Cores de faixa usadas na barrinha do professor.
 * `escura` = a ponteira precisa inverter para continuar visível.
 * O site é P&B; a faixa é a única coisa colorida, de propósito.
 */
export const CORES_FAIXA = [
  { id: "branca", rotulo: "Branca", hex: "#f4f2ed", escura: false },
  { id: "cinza", rotulo: "Cinza", hex: "#9b9b9e", escura: false },
  { id: "amarela", rotulo: "Amarela", hex: "#f0c419", escura: false },
  { id: "laranja", rotulo: "Laranja", hex: "#e8730c", escura: false },
  { id: "verde", rotulo: "Verde", hex: "#1c8a45", escura: true },
  { id: "azul", rotulo: "Azul", hex: "#14539b", escura: true },
  { id: "roxa", rotulo: "Roxa", hex: "#5b2a8c", escura: true },
  { id: "marrom", rotulo: "Marrom", hex: "#5c3418", escura: true },
  { id: "preta", rotulo: "Preta", hex: "#0b0b0c", escura: true },
  { id: "coral", rotulo: "Coral (preta e vermelha)", hex: "#c0261d", escura: true },
  { id: "vermelha", rotulo: "Vermelha", hex: "#b81f1a", escura: true },
];

/** Descobre a cor pelo texto da faixa, para quem não escolheu nada. */
export function corDaFaixa(item = {}) {
  if (item.cor) return CORES_FAIXA.find((c) => c.id === item.cor) || null;
  const texto = String(item.faixa || "").toLowerCase();
  return CORES_FAIXA.find((c) => texto.includes(c.id)) || null;
}
