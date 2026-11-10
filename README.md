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

## Alunos e mensalidades

**Professor** — aba **Alunos e mensalidades** do `/admin`:

- cadastra o aluno (ou clica **Tornar aluno** numa inscrição recebida) e recebe o
  **login + senha temporária** para mandar no WhatsApp — a senha aparece uma vez só;
- vê quem está em dia, em aberto, atrasado e os **comprovantes a conferir**;
- abre o comprovante, **confirma** ou **recusa**, dá baixa manual (dinheiro/cartão),
  cobra no WhatsApp e gera nova senha temporária se o aluno esquecer.

**Aluno** — `/aluno` (link "Área do aluno" no menu do site):

- entra com o **celular + senha temporária** e, no primeiro acesso, **cria a própria senha**;
- vê desde quando está na academia, o plano e todas as mensalidades;
- paga no **Pix** (QR Code / copia e cola com o valor dele) e **envia o comprovante**:
  o mês já fica como pago e entra na fila "a conferir" do professor.

**Conta da família** — o login é o celular. Se o professor cadastra um aluno com um
celular que já é login de outro (irmãos com o WhatsApp da mãe), o painel pergunta se é a
mesma família: confirmando, ele entra na conta que já existe, **sem senha nova**, e quem
entra com esse celular escolhe o filho em abas no topo. A senha é da conta (trocar ou
gerar nova vale para todos). Quando um filho ganha celular próprio, basta trocar o
WhatsApp dele no cadastro: ele sai para uma conta só dele, com senha temporária nova.
`scripts/importar-inscricoes.mjs` já junta irmãos na conta da família.

Uma mensalidade por mês, do mês de entrada até o atual, vencendo no dia definido no
cadastro (`src/lib/mensalidades.js`). As rotas estão em `server/alunos.js`. Senhas são
guardadas só como hash (scrypt); comprovantes ficam privados — só o aluno dono e o
professor abrem. No computador os dados vão para `data/alunos.json` e
`data/comprovantes/`; no site no ar, para o Blob (`alunos/`, `logins/`, `comprovantes/`).

**Sessões e travas (LGPD/segurança):**

- Professor e aluno ficam logados por um **cookie protegido** (HttpOnly, SameSite=Strict,
  Secure no ar): a página não guarda senha nem sessão no navegador. Professor: 8 horas.
  Aluno: 30 dias. "Sair" apaga o cookie.
- Painel: **5 senhas erradas** pelo mesmo endereço fecham o painel por **15 minutos**
  (até para a senha certa). O painel avisa se `ADMIN_SENHA` tiver menos de 12 caracteres.
- Aluno: 6 erros numa conta a bloqueiam por 15 minutos, e **10 erros do mesmo endereço**
  (em celulares diferentes) também. Senha nova precisa de **8 caracteres**.
- Pedidos que mudam dados vindos de outro site são recusados.
- Reenviar um comprovante ou desfazer uma baixa apaga o arquivo antigo daquele mês.
- Scripts (`importar-inscricoes.mjs`, `test:fumaca`) continuam mandando a senha no
  cabeçalho `x-admin-senha`, com a mesma trava de erros.

As sessões são assinadas com `SESSAO_SEGREDO` (ou, sem ela, com um segredo derivado de
`ADMIN_SENHA`): **trocar a senha do painel desloga todo mundo**, que só precisa entrar de novo.

## Testes

Precisa do Node 22 ou mais novo. Nenhum teste toca nos alunos reais do computador.

| Comando | O que confere |
| --- | --- |
| `npm test` | Contas das mensalidades, código Pix e toda a API de alunos por HTTP, duas vezes: gravando em disco e pela função da Vercel (`api/index.js`) com o armazenamento do Blob falando com um Blob em memória (`tests/blob-falso.js`). |
| `npm run test:e2e` | Chrome de verdade no build de produção: professor cadastra, aluno entra com a senha temporária, cria a senha, paga, envia comprovante, professor confere… Precisa do Chrome instalado. |
| `ADMIN_SENHA=… npm run test:fumaca` | Um site que já está rodando (`URL=https://…`, padrão `localhost:5173`): cria um aluno "TESTE AUTOMÁTICO", faz o caminho inteiro e apaga no final. É o teste para rodar **logo depois de cada deploy**, contra o site no ar. |

### No site no ar (Vercel)

O mesmo painel funciona em **https://andrade-two.vercel.app/admin**. Lá os dados
ficam num **Vercel Blob privado** (conteúdo, backups, inscrições e fotos), pela
função `api/index.js`. Precisa de duas configurações no projeto da Vercel:

1. **Storage → Create → Blob**, acesso **Private**, e conectar ao projeto `andrade`
   (isso cria a variável `BLOB_READ_WRITE_TOKEN`).
2. **Settings → Environment Variables → `ADMIN_SENHA`** com a senha do painel.

Depois de qualquer mudança de variável, faça um **Redeploy**. Sem o Blob, o site
funciona normalmente com o conteúdo do `src/data/conteudo.json`, e as inscrições
chegam só pelo WhatsApp.

> Depois que o painel do site no ar salvar pela primeira vez, **a versão do Blob passa a
> valer** no site publicado — editar `src/data/conteudo.json` no computador não muda mais
> o site no ar. Edite pelo /admin do site.

## Inscrição + Pix

A página inicial (`src/App.jsx`, estilos em `src/styles/site.css`) tem: início com o
próximo treino, a academia, turmas, grade de horários, professor, planos, ficha de
matrícula, dúvidas frequentes, localização com mapa e rodapé com o endereço. A ficha
fica na própria página (`src/components/Matricula.jsx`, seção `#matricula`); os botões
dos planos e das turmas levam até ela já com o plano ou a turma escolhidos. As dúvidas
frequentes ficam em `faq` no `src/data/conteudo.json`. Depois de preencher, o aluno vê o QR Code e o **Pix copia e cola** com o valor do plano
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
