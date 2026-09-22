import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useConteudo, whatsappLink } from "../conteudo/Conteudo";
import { EASE } from "../motion/variants";
import "./WhatsAppFab.css";

export default function WhatsAppFab() {
  const { site, menu } = useConteudo();
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisivel(window.scrollY > window.innerHeight * 0.7);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visivel && (
        <motion.a
          className="fab"
          href={whatsappLink(site)}
          target="_blank"
          rel="noreferrer"
          aria-label="Falar no WhatsApp e agendar aula experimental"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          <MessageCircle size={22} strokeWidth={1.75} aria-hidden="true" />
          <span className="fab__txt">{menu.botaoFlutuante}</span>
        </motion.a>
      )}
    </AnimatePresence>
  );
}
