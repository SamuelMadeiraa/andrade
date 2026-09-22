import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Sobre from "./components/Sobre";
import Modalidades from "./components/Modalidades";
import Professores from "./components/Professores";
import Horarios from "./components/Horarios";
import Planos from "./components/Planos";
import Depoimentos from "./components/Depoimentos";
import CTA from "./components/CTA";
import Footer from "./components/Footer";
import GregaDivider from "./components/GregaDivider";
import Inscricao from "./components/Inscricao";
import { useConteudo, publicaveis } from "./conteudo/Conteudo";
import WhatsAppFab from "./components/WhatsAppFab";
import "./App.css";

export default function App() {
  const { depoimentos } = useConteudo();
  return (
    <>
      <a className="skip-link" href="#sobre">
        Pular para o conteúdo
      </a>

      {/* moldura de grega que abre o site — o rodapé fecha */}
      <div className="frame-top" aria-hidden="true">
        <GregaDivider dark height={12} animate={false} />
      </div>

      <Nav />

      <main>
        <Hero />
        <GregaDivider dark />
        <Sobre />
        <GregaDivider />
        <Modalidades />
        <GregaDivider dark />
        <Professores />
        <GregaDivider />
        <Horarios />
        <GregaDivider dark />
        <Planos />
        {/* sem depoimento real, a seção não entra — e a divisória
            volta a ser clara para não deixar uma faixa preta solta
            entre duas seções claras */}
        {publicaveis(depoimentos).length > 0 ? (
          <>
            <GregaDivider />
            <Depoimentos />
            <GregaDivider dark />
          </>
        ) : (
          <GregaDivider />
        )}
        <CTA />
      </main>

      <Footer />
      <WhatsAppFab />
      <Inscricao />
    </>
  );
}
