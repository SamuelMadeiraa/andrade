import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Sobre from "./components/Sobre";
import Turmas from "./components/Turmas";
import Horarios from "./components/Horarios";
import Professor from "./components/Professor";
import Planos from "./components/Planos";
import Depoimentos from "./components/Depoimentos";
import Matricula from "./components/Matricula";
import Faq from "./components/Faq";
import Local from "./components/Local";
import Footer from "./components/Footer";
import WhatsAppFab from "./components/WhatsAppFab";
import "./styles/site.css";

export default function App() {
  return (
    <div className="site">
      <a className="pular" href="#sobre">
        Pular para o conteúdo
      </a>

      <Nav />

      <main>
        <Hero />
        <Sobre />
        <Turmas />
        <Horarios />
        <Professor />
        <Planos />
        <Depoimentos />
        <Matricula />
        <Faq />
        <Local />
      </main>

      <Footer />
      <WhatsAppFab />
    </div>
  );
}
