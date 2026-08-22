export const EASE = [0.22, 1, 0.36, 1];
export const EASE_OUT = [0.16, 1, 0.3, 1];

export const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.9, ease: EASE } },
};

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

export const staggerFast = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

/* título do hero — sobe palavra por palavra */
export const wordReveal = {
  hidden: { opacity: 0, y: "100%" },
  show: { opacity: 1, y: "0%", transition: { duration: 0.8, ease: EASE_OUT } },
};

/* viewport padrão dos reveals */
export const inView = { once: true, margin: "-15%" };
