/**
 * ================================================================
 *  PONTO ÚNICO DE EDIÇÃO DO SITE
 *  Tudo marcado com [ ] precisa ser preenchido antes de publicar.
 *  Busque por "[" neste arquivo para achar todos os pendentes.
 * ================================================================
 */

export const site = {
  nome: "Andrade BJJ",
  cidade: "São José",
  bairro: "Sertão do Maruim",
  estado: "SC",
  endereco: "R. Maria Cristina Zimmermann, 50 — Sertão do Maruim, São José/SC",
  cep: "88122-110",
  fundadaEm: "[ANO]",
  anosDeTatame: "0",
  instagram: "https://www.instagram.com/academia_andradebjj/",
  instagramHandle: "@academia_andradebjj",
  // Formato internacional, só números (país + DDD + número, sem + e sem traço).
  // ATENÇÃO: celular no Brasil tem 9 dígitos. Se o número do Wesley for
  // 9 8867-8250, o correto aqui é "5548988678250" (com o 9 na frente).
  whatsapp: "554888678250",
  // Como o número aparece escrito para o visitante:
  whatsappVisivel: "+55 48 8867-8250",
  email: "[contato@andradebjj.com.br]",
  mapsEmbed:
    "https://www.google.com/maps?q=R.%20Maria%20Cristina%20Zimmermann%2C%2050%20-%20Sert%C3%A3o%20do%20Maruim%2C%20S%C3%A3o%20Jos%C3%A9%20-%20SC%2C%2088122-110&output=embed",
};

/**
 * Um campo só conta como preenchido se não tiver [colchete].
 * O site esconde sozinho tudo que ainda for placeholder — assim dá pra
 * publicar hoje sem nada de "[NOME]" aparecendo pro visitante.
 */
export const ok = (v) => typeof v === "string" && v.length > 0 && !v.includes("[");

export const whatsappLink = (
  msg = "Olá! Vim pelo site e quero agendar minha aula experimental."
) => `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(msg)}`;

export const navLinks = [
  { href: "#sobre", label: "A Academia" },
  { href: "#modalidades", label: "Modalidades" },
  { href: "#professor", label: "Professor" },
  { href: "#horarios", label: "Horários" },
  { href: "#planos", label: "Planos" },
];

export const modalidades = [
  {
    id: "adulto",
    nome: "Jiu-Jitsu Adulto",
    idade: "A partir de 15 anos",
    texto:
      "A base. Guarda, passagem, finalização e o treino duro que forma o resto. Turmas separadas por nível — ninguém entra no fundo da piscina.",
  },
  {
    id: "kids",
    nome: "Kids",
    idade: "4 a 14 anos",
    texto:
      "Disciplina antes de técnica. A criança aprende a cair, a levantar e a respeitar — e sai da aula cansada do jeito certo.",
  },
  {
    id: "feminino",
    nome: "Feminino",
    idade: "Turma exclusiva",
    texto:
      "Espaço próprio, ritmo próprio. Defesa pessoal real, condicionamento e uma turma que treina junto de verdade.",
  },
  {
    id: "nogi",
    nome: "No-Gi",
    idade: "Todos os níveis",
    texto:
      "Sem kimono, sem agarre fácil. Ritmo alto, pegada de luta livre e a leitura de jogo que o gi esconde.",
  },
  {
    id: "competicao",
    nome: "Competição",
    idade: "Por convite / seletiva",
    texto:
      "Para quem vai subir no pódio. Preparação específica, estudo de regra, corte de peso orientado e treino de sparring pesado.",
  },
];

export const professores = [
  {
    nome: "Wesley Andrade",
    faixa: "Faixa-marrom",
    linhagem: "[Mitsuyo Maeda › Carlos Gracie › ... › NOME DO SEU PROFESSOR › Wesley Andrade]",
    papel: "Professor responsável",
    foto: null,
  },
];

export const dias = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** null = sem aula. Cada célula: { turma, hora } */
export const horarios = [
  {
    hora: "06:30",
    aulas: ["Adulto", null, "Adulto", null, "Adulto", null],
  },
  {
    hora: "09:00",
    aulas: [null, "Feminino", null, "Feminino", null, "Open Mat"],
  },
  {
    hora: "16:00",
    aulas: ["Kids", "Kids", "Kids", "Kids", "Kids", null],
  },
  {
    hora: "18:00",
    aulas: ["Kids 1", null, "Kids 1", null, "Kids 1", null],
  },
  {
    hora: "19:00",
    aulas: ["Kids 2", "No-Gi", "Kids 2", "No-Gi", "Kids 2", null],
  },
  {
    hora: "20:00",
    aulas: ["Juvenil", null, "Juvenil", null, "Juvenil", null],
  },
  {
    hora: "21:00",
    aulas: ["Adulto", null, "Adulto", null, "Adulto", null],
  },
];

/** Números da seção "A filosofia". */
export const numeros = [
  { valor: site.anosDeTatame, sufixo: "", label: "Anos de tatame" },
  { valor: "0", sufixo: "", label: "Alunos ativos" },
  // para voltar a contar sozinho a partir da grade acima, troque "0" por:
  // horarios.flatMap((l) => l.aulas).filter(Boolean).length
  { valor: "0", sufixo: "", label: "Aulas por semana" },
];

/**
 * Promoção de inauguração — Turma Fundadora.
 * Atualize `restantes` à mão conforme as matrículas entram: é o número
 * que aparece no site. Quando chegar a 0 — ou `ativa` virar false — a
 * faixa some sozinha e a seção volta a mostrar só o preço cheio.
 */
export const fundadora = {
  ativa: true,
  total: 50,
  restantes: 50,
  prazo: "[30/09]",
};

export const planos = [
  {
    nome: "Experimental",
    preco: "0",
    gratis: true,
    periodo: "aula avulsa",
    destaque: false,
    itens: [
      "Uma aula completa",
      "Kimono emprestado",
      "Avaliação de nível",
      "Sem compromisso",
    ],
    cta: "Agendar",
  },
  {
    nome: "Mensal",
    preco: "129,90",
    periodo: "por mês",
    destaque: true,
    selo: "Turma fundadora",
    nota: "Primeiro mês R$ 99,90. Sem matrícula, sem taxa.",
    itens: [
      "Todas as turmas, todos os dias",
      "Gi + No-Gi liberados",
      "Open mat de sábado",
      "Acompanhamento de graduação",
      "Preço travado enquanto você for aluno",
    ],
    cta: "Quero entrar",
  },
  {
    nome: "Semestral",
    preco: "699",
    periodo: "à vista · 6 meses",
    destaque: false,
    nota: "Sai a R$ 116,50 por mês.",
    itens: [
      "Tudo do plano Mensal",
      "Kimono da casa incluso",
      "Seis meses garantidos",
      "Sem reajuste no período",
    ],
    cta: "Garantir",
  },
];

/**
 * ATENÇÃO: as falas abaixo são EXEMPLOS de formato, não depoimentos reais.
 * Nenhum aluno disse isso. Troque nome E fala por depoimentos de verdade —
 * publicar depoimento inventado é propaganda enganosa.
 * Enquanto o nome tiver [colchete], a seção inteira fica fora do ar.
 */
export const depoimentos = [
  {
    nome: "[NOME DO ALUNO]",
    faixa: "Faixa-azul · 2 anos de casa",
    fala: "Cheguei sem condicionamento nenhum e achando que ia desistir na primeira semana. Dois anos depois é a parte do dia que eu não abro mão.",
    foto: null,
  },
  {
    nome: "[NOME DA ALUNA]",
    faixa: "Faixa-branca · 8 meses de casa",
    fala: "Vim pela defesa pessoal e fiquei pela turma. Aqui ninguém te deixa treinando sozinho num canto.",
    foto: null,
  },
  {
    nome: "[NOME DO ALUNO]",
    faixa: "Faixa-roxa · 5 anos de casa",
    fala: "Já treinei em outras academias. A diferença daqui é que o professor sabe o nome e o jogo de cada um.",
    foto: null,
  },
];

/** Depoimentos prontos para publicação (descarta os que ainda são placeholder). */
export const depoimentosPublicaveis = depoimentos.filter((d) => ok(d.nome));
