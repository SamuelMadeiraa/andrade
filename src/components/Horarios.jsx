import { useState } from "react";
import Reveal from "./Reveal";
import { useConteudo, Linhas, ok } from "../conteudo/Conteudo";
import { aulasDoDia, colunaDeHoje, proximoTreino } from "../lib/agenda";

export default function Horarios() {
  const { site, horarios: sec } = useConteudo();
  const { dias, linhas } = sec;
  const hoje = colunaDeHoje(sec);
  const proximo = proximoTreino(sec);
  // no celular a grade vira abas: abre no dia de hoje ou no próximo dia de treino
  const [aba, setAba] = useState(hoje >= 0 ? hoje : (proximo?.coluna ?? 0));
  const daAba = aulasDoDia(sec, aba);

  return (
    <section className="secao secao--tinta" id="horarios">
      <div className="conteiner">
        <Reveal as="header" className="cab">
          <p className="rotulo rotulo--claro">{sec.eyebrow}</p>
          <h2 className="titulo">
            <Linhas texto={sec.titulo} />
          </h2>
        </Reveal>

        {/* ---- telas largas: a grade inteira ---- */}
        <Reveal className="grade-caixa">
          <table className="grade">
            <caption className="so-leitor">Grade de horários semanal da {site.nome}</caption>
            <thead>
              <tr>
                <th scope="col">Horário</th>
                {dias.map((d, i) => (
                  <th key={i} scope="col" className={i === hoje ? "is-hoje" : ""}>
                    {d}
                    {i === hoje && <span className="grade__hoje">Hoje</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, li) => (
                <tr key={li}>
                  <th scope="row">
                    <time>{linha.hora}</time>
                  </th>
                  {dias.map((_, i) => {
                    const aula = linha.aulas[i];
                    const eProxima =
                      proximo && proximo.coluna === i && proximo.hora === linha.hora;
                    return (
                      <td key={i} className={`${i === hoje ? "is-hoje" : ""} ${aula ? "" : "vazio"}`}>
                        {aula ? (
                          <span className={`aula ${eProxima ? "aula--proxima" : ""}`}>
                            {aula}
                            {eProxima && <em>a seguir</em>}
                          </span>
                        ) : (
                          <span aria-label="sem aula">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>

        {/* ---- celular: um dia por vez ---- */}
        <div className="dias">
          <div className="dias__abas" role="tablist" aria-label="Dia da semana">
            {dias.map((d, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                id={`aba-${i}`}
                aria-selected={aba === i}
                aria-controls="painel-dia"
                className={aba === i ? "is-on" : ""}
                onClick={() => setAba(i)}
              >
                {d}
                {i === hoje && <small>hoje</small>}
              </button>
            ))}
          </div>
          <ul className="dias__lista" id="painel-dia" role="tabpanel" aria-labelledby={`aba-${aba}`}>
            {daAba.length > 0 ? (
              daAba.map((a) => (
                <li key={a.hora + a.aula}>
                  <time>{a.hora}</time>
                  <span>{a.aula}</span>
                </li>
              ))
            ) : (
              <li className="dias__vazio">Sem treino neste dia.</li>
            )}
          </ul>
        </div>

        <p className="nota nota--clara">
          {sec.nota}
          {ok(site.instagram) && (
            <>
              {" "}
              <a href={site.instagram} target="_blank" rel="noreferrer">
                {site.instagramHandle}
              </a>
              .
            </>
          )}
        </p>
      </div>
    </section>
  );
}
