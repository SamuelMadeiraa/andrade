import { ArrowRight, Clock } from "lucide-react";
import Reveal from "./Reveal";
import { useConteudo, Linhas } from "../conteudo/Conteudo";
import { turmaNaGrade } from "../lib/agenda";
import { irParaMatricula } from "../lib/matricula";

const curto = (dia = "") => dia.slice(0, 3);

export default function Turmas() {
  const { modalidades, horarios } = useConteudo();
  return (
    <section className="secao secao--nevoa" id="turmas">
      <div className="conteiner">
        <Reveal as="header" className="cab">
          <p className="rotulo">Turmas</p>
          <h2 className="titulo">
            <Linhas texto={modalidades.titulo} />
          </h2>
        </Reveal>

        <ul className="turmas">
          {modalidades.itens.map((m, i) => {
            const grade = turmaNaGrade(horarios, m.nome);
            return (
              <Reveal as="li" className="turma" key={i} atraso={i * 0.06}>
                <h3 className="turma__nome">{m.nome}</h3>
                {m.idade && <p className="turma__publico">{m.idade}</p>}
                {m.texto && <p className="turma__texto">{m.texto}</p>}

                <div className="turma__pe">
                  {grade && (
                    <p className="turma__quando">
                      <Clock size={15} strokeWidth={1.75} aria-hidden="true" />
                      <span>
                        {grade.dias.map(curto).join(" · ")} — <b>{grade.horas.join(" e ")}</b>
                      </span>
                    </p>
                  )}
                  <button
                    type="button"
                    className="turma__link"
                    onClick={() => irParaMatricula({ turma: grade?.nome })}
                  >
                    Matricular nesta turma
                    <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
