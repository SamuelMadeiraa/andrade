/** Leva o visitante até a ficha de matrícula, já com plano e/ou turma escolhidos. */
export function irParaMatricula(escolha = {}) {
  window.dispatchEvent(new CustomEvent("matricula:escolher", { detail: escolha }));
  document.getElementById("matricula")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
