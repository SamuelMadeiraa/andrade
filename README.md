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

## Painel de administração (/admin)

Todo o texto do site, horários, planos, preços, Pix, fotos e contatos são
editados em **http://localhost:5173/admin** — com prévia ao vivo ao lado.

1. `npm run dev`
2. Abra `localhost:5173/admin` e entre com a senha de `ADMIN_SENHA` no arquivo `.env.local`
   (fica fora do git; se não existir, crie com `ADMIN_SENHA=sua-senha` e reinicie o servidor)
3. Edite, clique **Salvar** (ou Ctrl+S). Grava em `src/data/conteudo.json`
   e guarda um backup em `data/backups/`.
4. Para publicar: faça commit do `src/data/conteudo.json` (e de `public/uploads/`, se enviou fotos) e dê push/deploy.

A aba **Inscrições recebidas** lista quem preencheu a ficha, com status
(aguardando Pix / pago / cancelado) e exportação em planilha CSV. As inscrições
ficam em `data/inscricoes.json` — **fora do git**, porque têm dados pessoais.

> **Limitação atual:** o servidor do painel roda só no seu computador. No site publicado
> (Vercel) o /admin abre em modo exportação e as inscrições não ficam salvas lá — mas o
> aluno sempre termina enviando os dados + comprovante pelo WhatsApp, então nada se perde.
> Para editar e receber inscrições direto no site publicado é preciso um banco
> (ex.: Vercel Blob ou Supabase): a API está toda em `server/api.js`.

## Inscrição + Pix

Os botões dos planos com "Botão abre a ficha de inscrição" ligado abrem a ficha. Depois
de preencher, o aluno vê o QR Code e o **Pix copia e cola** com o valor do plano
(campo "Valor cobrado no Pix"), as chaves Pix e um botão que manda os dados +
comprovante no WhatsApp. O QR é gerado a partir da chave em **Pix → Chave usada no QR
Code** (`src/lib/pix.js`), então mudar o preço no painel já muda o QR.

## Sobre o logo

Hoje o brasão é o JPEG original (`src/assets/logo-lobo.jpeg`). O fundo branco é
removido por `mix-blend-mode` no componente `Marca` — funciona bem, mas escala mal
em telas grandes. Quando tiver o SVG vetorizado do lobo, basta trocar o `import`
em `src/components/Marca.jsx`; o resto continua igual.

O anel de grega do hero é desenhado por SVG, independente do logo.

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
