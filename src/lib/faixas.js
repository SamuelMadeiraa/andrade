/**
 * Cores de faixa usadas na barrinha do professor.
 * A ponteira é preta, como no kimono. `ponteiraClara` marca as faixas escuras
 * demais para isso (preta e coral): nelas a ponteira inverte para não sumir.
 * O site é P&B; a faixa é a única coisa colorida, de propósito.
 */
export const CORES_FAIXA = [
  { id: "branca", rotulo: "Branca", hex: "#f4f2ed", ponteiraClara: false },
  { id: "cinza", rotulo: "Cinza", hex: "#9b9b9e", ponteiraClara: false },
  { id: "amarela", rotulo: "Amarela", hex: "#f0c419", ponteiraClara: false },
  { id: "laranja", rotulo: "Laranja", hex: "#e8730c", ponteiraClara: false },
  { id: "verde", rotulo: "Verde", hex: "#1c8a45", ponteiraClara: false },
  { id: "azul", rotulo: "Azul", hex: "#14539b", ponteiraClara: false },
  { id: "roxa", rotulo: "Roxa", hex: "#5b2a8c", ponteiraClara: false },
  { id: "marrom", rotulo: "Marrom", hex: "#5c3418", ponteiraClara: false },
  { id: "preta", rotulo: "Preta", hex: "#0b0b0c", ponteiraClara: true },
  { id: "coral", rotulo: "Coral (preta e vermelha)", hex: "#c0261d", ponteiraClara: true },
  { id: "vermelha", rotulo: "Vermelha", hex: "#b81f1a", ponteiraClara: false },
];

/** Descobre a cor pelo texto da faixa, para quem não escolheu nada. */
export function corDaFaixa(item = {}) {
  if (item.cor) return CORES_FAIXA.find((c) => c.id === item.cor) || null;
  const texto = String(item.faixa || "").toLowerCase();
  return CORES_FAIXA.find((c) => texto.includes(c.id)) || null;
}
