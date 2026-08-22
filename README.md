# Andrade BJJ — site

Site de página única da academia. React (Vite) + Framer Motion, CSS puro com design
tokens. Identidade **preto & branco absoluto**, com o meandro grego (a "grega") do
logo como assinatura visual: ele divide todas as seções e se desenha no scroll.

## Rodar

```bash
npm install
npm run dev
```

Build de produção: `npm run build` · Conferir o build: `npm run preview`

## Onde mexer

Quase tudo que muda com o tempo mora em **um arquivo só**:

| O quê | Arquivo |
|---|---|
| Cidade, endereço, WhatsApp, Instagram, e-mail | `src/data/site.js` |
| Modalidades, professores, horários, planos, depoimentos | `src/data/site.js` |
| Vagas restantes da Turma Fundadora | `src/data/site.js` → `fundadora.restantes` |
| Cores, tipografia, escala, espaçamento | `src/styles/tokens.css` |
| Animações reutilizáveis | `src/motion/variants.js` |
| A grega (divisória animada) | `src/components/GregaDivider.jsx` |

## Pendências antes de publicar

Tudo que falta está marcado com `[COLCHETES]` — busque por `[` em `src/data/site.js`
e em `index.html`.

- [ ] **Cidade / bairro / endereço / CEP** — `site.js` e o `<title>` + `<meta description>` do `index.html`
- [ ] **WhatsApp** em formato internacional só com números (ex.: `5511999999999`) — sem isso nenhum CTA funciona
- [ ] **Linhagem do Wesley** — quem o graduou e a cadeia até Maeda. É o campo mais importante da seção: é o que sustenta a credibilidade de uma academia nova.
- [ ] **Bio do Wesley** — uma linha: quando começou, com quem se graduou, títulos, quando fundou a Andrade BJJ.
- [ ] **Anos de tatame e nº de alunos** (a terceira métrica, "aulas por semana", é calculada sozinha a partir da grade de horários)
- [ ] **Data limite da promoção de entrada** — `fundadora.prazo` em `site.js` (hoje está `[30/09]`)
- [ ] **Nomes reais nos depoimentos**
- [ ] **URL de embed do Google Maps** em `site.mapsEmbed` (o rodapé mostra um aviso enquanto estiver vazio)
- [ ] **Fotos**: retrato do Wesley e fotos dos alunos em `src/assets/fotos/` — importe e aponte em `professores[].foto` / `depoimentos[].foto`. Todas saem em P&B automaticamente (`.ph { filter: grayscale(1) }`), não precisa tratar antes.
- [ ] Trocar o logo JPEG por um **SVG limpo** (ver abaixo)

## Promoção de inauguração

A seção de Planos está com a oferta de abertura ligada:

- **Mensal — R$ 129,90/mês**, primeiro mês R$ 99,90, sem matrícula (plano em destaque)
- **Semestral — R$ 699 à vista** (R$ 116,50/mês) com kimono da casa incluso
- **Experimental — grátis**

Acima dos planos há a faixa da **Turma Fundadora**, com contador de vagas e barra de
progresso. Ela é controlada por `fundadora` em `src/data/site.js`:

```js
export const fundadora = {
  ativa: true,      // false esconde a faixa inteira
  total: 50,
  restantes: 50,    // atualize à mão conforme as matrículas entram
  prazo: "[30/09]", // data limite da entrada por 99,90
};
```

Quando `restantes` chegar a 0 — ou `ativa` virar `false` — a faixa some sozinha e a
seção volta a mostrar só o preço cheio. **Atualizar `restantes` é manual**: é o número
que aparece no site, então não deixe envelhecer.

## Sobre o logo

Hoje o brasão é o JPEG original (`src/assets/logo-lobo.jpeg`). O fundo branco é
removido por `mix-blend-mode` no componente `Marca` — funciona bem, mas escala mal
em telas grandes. Quando tiver o SVG vetorizado do lobo, basta trocar o `import`
em `src/components/Marca.jsx`; o resto continua igual.

O anel de grega do hero é desenhado por SVG, independente do logo.

## Formulário

Não há backend: o formulário do CTA monta a mensagem e abre o WhatsApp. Para plugar
um serviço real (Formspree, Resend, etc.), troque o handler `enviar` em
`src/components/CTA.jsx` por um `fetch` — o estado de sucesso já existe.

## Deploy (Vercel)

```bash
npx vercel
```

Framework: Vite · Build: `npm run build` · Output: `dist`

## Acessibilidade / qualidade

- Responsivo até 360px, sem scroll horizontal
- Foco de teclado visível em fundo claro e escuro, com skip link
- `prefers-reduced-motion` desliga os reveals (via `MotionConfig` + CSS)
- Grade de horários é uma `<table>` semântica, com rolagem própria no mobile
- Contraste ink/bone passa AA com folga
