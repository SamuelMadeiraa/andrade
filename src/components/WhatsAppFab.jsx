import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useConteudo, whatsappLink } from "../conteudo/Conteudo";

/** Atalho do WhatsApp: aparece depois da primeira tela, para não brigar com o início. */
export default function WhatsAppFab() {
  const { site, menu } = useConteudo();
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const aoRolar = () => setVisivel(window.scrollY > window.innerHeight * 0.7);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  return (
    <a
      className={`zap ${visivel ? "is-visivel" : ""}`}
      href={whatsappLink(site)}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar no WhatsApp e agendar aula experimental"
      tabIndex={visivel ? 0 : -1}
    >
      <MessageCircle size={22} strokeWidth={1.75} aria-hidden="true" />
      <span>{menu.botaoFlutuante}</span>
    </a>
  );
}
