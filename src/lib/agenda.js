/** Ajuda a ler a grade de horários: que dia é cada coluna e qual é o próximo treino. */

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

export const semAcento = (s = "") =>
  String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** "Segunda" → 1, "Sábado" → 6; -1 quando o texto não é um dia da semana. */
export const indiceDoDia = (nome) => DIAS.indexOf(semAcento(nome).slice(0, 3));

const minutos = (hora = "") => {
  const m = /^(\d{1,2})[:h](\d{2})?/.exec(String(hora).trim());
  return m ? Number(m[1]) * 60 + Number(m[2] || 0) : null;
};

/** Aulas de uma coluna (dia) da grade, em ordem de horário. */
export function aulasDoDia(horarios, coluna) {
  return (horarios?.linhas || [])
    .map((l) => ({ hora: l.hora, aula: l.aulas?.[coluna] }))
    .filter((a) => a.aula && String(a.aula).trim());
}

/**
 * O próximo treino a partir de agora: em qual coluna da grade cai, quantos
 * dias faltam e qual aula é. Devolve null quando a grade não tem dias legíveis.
 */
export function proximoTreino(horarios, agora = new Date()) {
  const hoje = agora.getDay();
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();
  let melhor = null;
  (horarios?.dias || []).forEach((nome, coluna) => {
    const dia = indiceDoDia(nome);
    if (dia < 0) return;
    for (const { hora, aula } of aulasDoDia(horarios, coluna)) {
      const min = minutos(hora);
      if (min === null) continue;
      let faltam = (dia - hoje + 7) % 7;
      if (faltam === 0 && min <= agoraMin) faltam = 7;
      const peso = faltam * 1440 + min;
      if (!melhor || peso < melhor.peso) melhor = { peso, coluna, faltam, hora, aula, dia: nome };
    }
  });
  if (!melhor) return null;
  const { peso, ...resto } = melhor;
  return { ...resto, quando: melhor.faltam === 0 ? "Hoje" : melhor.faltam === 1 ? "Amanhã" : melhor.dia };
}

/** Coluna da grade que corresponde a hoje, ou -1. */
export const colunaDeHoje = (horarios, agora = new Date()) =>
  (horarios?.dias || []).findIndex((d) => indiceDoDia(d) === agora.getDay());

/**
 * Liga uma turma da seção "Turmas" à grade: o nome na grade costuma ser mais
 * curto ("Adulto" para "Jiu-Jitsu Adulto"). Devolve o nome da grade, os dias e as horas.
 */
export function turmaNaGrade(horarios, nomeDaTurma) {
  const alvo = semAcento(nomeDaTurma);
  const nomes = [...new Set((horarios?.linhas || []).flatMap((l) => l.aulas || []).filter(Boolean))];
  const nome = nomes.find((n) => alvo.includes(semAcento(n)) || semAcento(n).includes(alvo));
  if (!nome) return null;
  const dias = new Set();
  const horas = [];
  for (const l of horarios.linhas) {
    (l.aulas || []).forEach((a, i) => {
      if (a !== nome) return;
      dias.add(i);
      if (!horas.includes(l.hora)) horas.push(l.hora);
    });
  }
  return { nome, horas, dias: [...dias].sort().map((i) => horarios.dias[i]).filter(Boolean) };
}
