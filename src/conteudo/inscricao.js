/** Abre o formulário de inscrição de qualquer lugar do site. */
export const abrirInscricao = (plano) =>
  window.dispatchEvent(new CustomEvent("abrir-inscricao", { detail: { plano } }));
