# Relatório LGPD — site e painéis da Academia Andrade

**Data da auditoria:** 10/11/2026 · **Tipo:** somente leitura (nada foi alterado, instalado ou publicado)

**O que foi avaliado:** o código desta pasta, em dois estados:

- **No ar hoje** (commit `8bb44c6`, de 24/09/2026): site público, ficha de inscrição e painel do professor (`/admin`).
- **Ainda não publicado** (alterações locais): área do aluno (`/aluno`), mensalidades, comprovantes de Pix e a nova página pública com `Matricula.jsx`.

Cada item abaixo diz a qual dos dois se aplica. Não foram feitas requisições ao site no ar, nem usados dados reais ou senhas.

---

## 1. Resumo em 5 linhas

1. O site guarda dados de pessoas (nome, WhatsApp, nascimento, **saúde**, dados de **crianças**) e **não tem política de privacidade** nem explica o que faz com eles.
2. Tudo isso fica atrás de **uma única senha do painel**, sem limite de tentativas. Quem adivinhar a senha lê tudo.
3. A pergunta sobre **lesões e problemas de saúde** é dado sensível pela lei e hoje é coletada sem o consentimento específico que a lei pede.
4. A parte técnica nova (área do aluno) está bem feita: senhas protegidas, comprovantes privados, um aluno não enxerga o outro.
5. Não há rastreadores, anúncios, cookies de marketing nem inteligência artificial. Isso reduz muito o risco.

## 2. Nota geral

**🔴 Crítico** — por causa de um ponto só: a senha única e sem trava que protege dados de saúde e de menores. Os demais problemas são de documentação e processo. Com os itens 1, 2 e 3 resolvidos (poucas horas de trabalho mais a revisão de um advogado), a nota passa para 🟡 Atenção.

## 3. Os 3 problemas mais urgentes

**1) Uma senha só protege todos os dados, e dá para tentar quantas vezes quiser.**
O painel do professor aceita tentativas infinitas de senha. Um programa simples testa milhares por minuto. Se a senha for curta ou previsível, alguém entra e baixa a lista de inscritos com telefone, nascimento, saúde e nome dos responsáveis. Isso seria um vazamento que a lei manda comunicar à ANPD e a cada pessoa afetada.

**2) Não existe política de privacidade.**
A lei exige dizer, antes de pedir os dados, para que servem, quanto tempo ficam guardados, com quem são compartilhados e como a pessoa pede para ver ou apagar. Hoje o site não diz nada disso. É a falha mais fácil de um fiscal ou de um aluno insatisfeito apontar.

**3) Dados de saúde pedidos sem consentimento próprio.**
O campo "Lesões, problemas de saúde ou observações" recolhe dado sensível. A lei pede um consentimento separado e em destaque para isso. Hoje há só uma caixinha genérica de "declaro que as informações são verdadeiras". Para crianças, o consentimento precisa ser de um dos pais ou responsável.

---

## 4. Tabela ranqueada de todos os itens

G = gravidade (1–5), P = probabilidade (1–5). Ordem: G×P, e no empate o de menor esforço.

| # | Prior. | Problema | Onde está | Por que é um problema | Ganho ao corrigir | Risco ao implementar | Esforço | Como corrigir (resumo) | Base legal |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **P0** | Painel com uma única senha, sem limite de tentativas (G5×P4=20) | `server/nucleo.js:101-103, 140` · no ar | Quem acerta a senha lê todos os dados | Fecha a principal porta de vazamento | Travar o próprio professor fora do painel | Baixo | Senha longa e aleatória, limite de tentativas, segredo de sessão separado | Arts. 46, 47 e 49 |
| 2 | **P1** | Não há política de privacidade (G4×P5=20) | Site inteiro (busca por "privacidade" não acha nada) · no ar | A pessoa entrega dados sem saber o uso | Cumpre a exigência mais visível da lei | Texto errado ou que prometa o que o sistema não faz | Médio | Escrever a política, publicar e linkar na ficha, no rodapé e nos logins | Arts. 6º, 9º e 18 |
| 3 | **P1** | Dado de saúde coletado sem consentimento específico (G4×P4=16) | `Matricula.jsx:300-303, 315-318` · `nucleo.js:34` · no ar | Dado sensível exige consentimento destacado | Regulariza o dado mais delicado do sistema | Menos gente preencher o campo | Baixo | Consentimento separado e opcional para saúde, com registro de data e versão | Art. 11, I; Art. 8º |
| 4 | **P1** | Dados de crianças sem consentimento do responsável (G4×P3=12) | `Matricula.jsx:86, 258-268` · no ar | Para criança a lei pede consentimento dos pais | Protege a academia na turma kids | Atrito na matrícula de menores | Baixo | Caixa de consentimento do responsável, com nome e data guardados | Art. 14, §1º; ECA Digital |
| 5 | **P1** | Sem caminho para a pessoa ver, corrigir ou apagar seus dados (G3×P4=12) | Site e `/aluno` (não há botão nem canal indicado) | A lei garante esses direitos com prazo | Atende pedidos sem improviso | Apagar por engano; apagar o que precisa ser guardado | Médio | Publicar canal e prazo; depois, "baixar meus dados" e "excluir conta" na área do aluno | Arts. 18 e 19; Art. 41 |
| 6 | **P2** | Nada é apagado nunca; comprovantes antigos ficam órfãos (G3×P4=12) | `server/alunos.js` (ação `reabrir` e reenvio) · `armazem-blob.js` · parte não publicada | Guardar além do necessário aumenta o dano de um vazamento | Menos dado guardado, menos risco | Apagar arquivo ainda necessário | Médio | Definir prazos e criar rotina de limpeza; apagar o arquivo ao substituir | Arts. 15 e 16; Art. 6º, III |
| 7 | **P2** | Dados vão para empresas no exterior sem contrato conferido (G3×P3=9) | Vercel (hospedagem e arquivos), Google Fonts (`index.html:27-32`), WhatsApp | Envio ao exterior precisa de base e de informação ao titular | Transparência e base para transferência | Baixo | Médio | Conferir o DPA da Vercel e a região do Blob; hospedar as fontes no próprio site; citar tudo na política | Arts. 33 a 36; Art. 39; Res. 19/2024 |
| 8 | **P2** | Não há plano para vazamento nem registro de quem acessou (G4×P2=8) | Todo o projeto (só existe `console.error` em `nucleo.js:212`) | Sem plano não dá para cumprir o prazo de aviso | Resposta rápida e dentro do prazo | Nenhum (é documento) + baixo (logs) | Médio | Escrever plano de 1 página; registrar acessos ao painel | Art. 48; Res. 15/2024 |
| 9 | **P2** | Ficha de inscrição aceita envios ilimitados (G2×P3=6) | `server/nucleo.js:146-158` · no ar | Robô pode encher o sistema de fichas falsas | Painel limpo e custo controlado | Bloquear inscrição legítima | Baixo | Limite por IP/tempo | Art. 46 |
| 10 | **P2** | Página pública de diagnóstico mostra a configuração (G2×P3=6) | `api/index.js:38-50` · no ar | Ajuda um atacante a mapear o sistema | Menos informação exposta | Nenhum relevante | Baixo | Exigir a senha do painel ou remover | Art. 46 |
| 11 | **P2** | 8 pacotes com falhas conhecidas (G2×P2=4) | `package.json` (`npm audit`) | Falhas publicadas são alvo fácil | Reduz superfície de ataque | Atualização quebrar o site | Médio | Atualizar `vite` e `@vercel/blob` com os testes rodando | Art. 46 |
| 12 | **P3** | Sem cabeçalhos de segurança no site | `vercel.json` | Proteção extra contra código malicioso na página | Camada adicional de defesa | Regra errada pode bloquear fontes ou imagens | Baixo | Adicionar CSP, `X-Frame-Options`, `Referrer-Policy` | Art. 46 |
| 13 | **P3** | Senha do painel e sessão do aluno ficam no navegador | `Admin.jsx:95` · `Aluno.jsx:30-37` | Em computador compartilhado, o próximo usuário entra | Menos exposição em aparelho de terceiros | Deslogar todo mundo na troca | Médio | Sessão por cookie protegido e mais curta | Art. 46 |
| 14 | **P3** | Senha do aluno mínima de 6 caracteres; bloqueio pode ser usado para travar um aluno | `server/alunos.js:29-32` · não publicado | Senhas fracas e incômodo proposital | Contas mais difíceis de invadir | Aluno esquecer senha maior | Baixo | Mínimo de 8; bloqueio por origem além de por conta | Art. 46 |

---

## 5. Detalhe de cada item

### Item 1 — Painel com uma única senha, sem limite de tentativas (P0)

**Evidência — Confirmado.**
- `server/nucleo.js:101-103`: toda rota do professor compara o cabeçalho `x-admin-senha` com `ADMIN_SENHA`. Não há contador de erros, espera ou bloqueio.
- `server/nucleo.js:140`: `/api/login` só confere a senha.
- A senha do painel foi escrita nesta conversa (começa com `andr****`). Segue um padrão previsível e deve ser considerada exposta. **Não foi testada contra o site.**
- Na versão não publicada, a sessão dos alunos é assinada com um segredo derivado dessa mesma senha (`server/alunos.js:78`). Quem souber a senha consegue fabricar o login de qualquer aluno.
- Como a senha é uma só, não há como saber quem entrou nem tirar o acesso de uma pessoa.

**Passo a passo.**
1. Você gera uma senha nova, longa e aleatória (20+ caracteres), e troca em Vercel → Settings → Environment Variables → `ADMIN_SENHA`, seguido de Redeploy. **Essa troca é sua, no painel da Vercel.**
2. Criar a variável `SESSAO_SEGREDO` (o código já a aceita) com outro valor aleatório, para separar a sessão dos alunos da senha do painel.
3. No código: limitar tentativas de senha do painel (por exemplo, 5 erros → espera crescente).
4. Opcional, mais adiante: um login por professor, em vez de senha compartilhada.

**Como testar.** Errar a senha várias vezes e ver o bloqueio; entrar com a nova; a antiga não entra. Os testes automáticos existentes (`npm test`) devem continuar passando.

**Cuidados.** Guarde a senha nova num gerenciador de senhas antes de trocar. Trocar `ADMIN_SENHA` ou `SESSAO_SEGREDO` desloga todos os alunos (eles só entram de novo).

### Item 2 — Não há política de privacidade (P1)

**Evidência — Confirmado.** Busca por "privacidade", "LGPD" e "cookie" em todo o código não encontra nenhum texto ou link. A ficha (`Matricula.jsx`) só mostra o termo de `conteudo.json:244`, que fala de aptidão física, não de dados.

**Passo a passo.**
1. Redigir a política usando o mapa de dados (seção 8) como base: quem é o controlador (nome, CNPJ, contato), que dados, para quê, por quanto tempo, com quem compartilha (Vercel, WhatsApp), direitos e como pedir.
2. Publicar numa página do site, com data e versão.
3. Colocar o link ao lado do botão da ficha, no rodapé e nas telas de login.
4. Passar o texto por um advogado.

**Como testar.** O link aparece antes do envio da ficha, abre no celular, e cada dado do mapa está citado no texto.

**Cuidados.** A política não pode prometer o que o sistema não faz (por exemplo, prazo de exclusão sem rotina que apague — ver item 6).

### Item 3 — Dado de saúde sem consentimento específico (P1)

**Evidência — Confirmado.**
- `Matricula.jsx:300-303`: campo livre "Lesões, problemas de saúde ou observações".
- `server/nucleo.js:34` e `146-158`: o campo `saude` é gravado junto com a ficha.
- `Matricula.jsx:151` e `383`: o mesmo texto vai na mensagem do WhatsApp.
- `Matricula.jsx:315-318`: a única caixa de aceite é genérica. Ela **não vem pré-marcada** (ponto positivo), mas não fala de dados de saúde e não há registro de quando foi aceita.
- Na versão nova, "Tornar aluno" copia a saúde para as observações do aluno (`src/admin/Inscricoes.jsx`).

**Passo a passo.**
1. Decidir se o dado é mesmo necessário no site. Alternativa mais simples: perguntar pessoalmente na primeira aula e tirar o campo.
2. Se ficar: caixa separada, opcional e destacada ("Autorizo a academia a usar as informações de saúde acima apenas para adaptar meus treinos"). Sem a caixa marcada, o campo não é enviado.
3. Guardar data e versão do texto aceito junto com a ficha.
4. Tirar a saúde da mensagem do WhatsApp.

**Como testar.** Enviar a ficha sem marcar a caixa e conferir no painel que o campo veio vazio; marcar e conferir data e versão gravadas.

**Cuidados.** As fichas antigas já têm esse dado. Decidir com o advogado se ficam, se pedem novo consentimento ou se o campo é apagado.

### Item 4 — Crianças e adolescentes (P1)

**Evidência — Confirmado (coleta) / Provável (enquadramento no ECA Digital).**
- `index.html:11` anuncia turma "kids". `Matricula.jsx:86` detecta menor pela idade ou pela turma e `258-268` pede só o **nome** do responsável.
- Não há consentimento específico do responsável nem registro dele.
- A área do aluno (não publicada) pode ser usada por adolescentes. Não há publicidade, perfilamento nem conteúdo impróprio, o que mantém o risco baixo.

**Passo a passo.**
1. Para menor de 18: caixa de consentimento em nome do responsável, com nome e data gravados.
2. Na política, um trecho curto e claro sobre dados de menores.
3. Confirmar com advogado se o ECA Digital exige algo além disso para um site de academia.

**Como testar.** Preencher com data de nascimento de criança: a ficha só envia com o consentimento do responsável marcado.

**Cuidados.** Não pedir documento do responsável sem necessidade — seria coleta excessiva.

### Item 5 — Direitos do titular e canal de contato (P1)

**Evidência — Confirmado.**
- O site mostra e-mail e WhatsApp da academia, mas não os apresenta como canal para pedidos sobre dados, nem informa prazo.
- Na área do aluno não há "baixar meus dados" nem "excluir minha conta".
- Ponto positivo: o professor consegue apagar um aluno e a exclusão **apaga de verdade** cadastro, login e comprovantes (`server/armazem-blob.js`, `apagarAluno`; coberto por teste automático). Inscrições também podem ser apagadas.

**Passo a passo.**
1. Publicar na política o canal (um e-mail basta) e o prazo de resposta.
2. Escrever um roteiro interno de meia página: quem responde, como confirma a identidade, como apaga.
3. Depois: botões "baixar meus dados" e "pedir exclusão" na área do aluno.

**Como testar.** Simular um pedido de acesso e um de exclusão do começo ao fim.

**Cuidados.** Exclusão precisa confirmar a identidade de quem pede. Registros de pagamento podem ter de ser guardados por obrigação fiscal — confirmar com o contador.

### Item 6 — Retenção e arquivos órfãos (P2)

**Evidência — Confirmado.**
- Não existe nenhum prazo nem rotina de limpeza. Inscrições canceladas e alunos inativos ficam guardados indefinidamente.
- `server/alunos.js`: ao reenviar um comprovante, o arquivo anterior continua no armazenamento; a ação `reabrir` apaga o registro do pagamento, mas não o arquivo. Esses arquivos só somem se o aluno inteiro for apagado.

**Passo a passo.** Definir prazos (ex.: inscrição não convertida, 6 meses; ex-aluno, o prazo fiscal). Apagar o arquivo antigo ao substituir. Criar rotina periódica de limpeza.

**Como testar.** Reenviar um comprovante e conferir que só existe um arquivo; rodar a limpeza num ambiente de teste.

**Cuidados.** Fazer cópia de segurança antes da primeira limpeza. Exige plano com backup e teste antes de executar.

### Item 7 — Terceiros e transferência internacional (P2)

**Evidência.**

| Terceiro | O que recebe | Onde | Situação |
|---|---|---|---|
| Vercel (hospedagem, funções e Blob) | Tudo: fichas, alunos, comprovantes, endereços IP | EUA / região do Blob desconhecida | **Não verificável** — conferir DPA e região no painel |
| Google Fonts | Endereço IP de todo visitante, antes de qualquer aviso (`index.html:27-32`) | EUA | **Confirmado** |
| WhatsApp (Meta) | A ficha completa, quando a pessoa clica em enviar; a senha temporária do aluno | EUA | **Confirmado** — é o próprio titular que envia, mas precisa constar na política |
| Instagram | Só um link | — | Sem envio de dados |

Não há analytics, pixel, e-mail marketing, monitoramento de erros nem provedor de IA.

**Passo a passo.** Aceitar/arquivar o DPA da Vercel e anotar a região do Blob; baixar as duas fontes e servi-las do próprio site; listar esses terceiros na política.

**Como testar.** Abrir o site com as ferramentas do navegador e conferir que nenhuma requisição sai para `fonts.googleapis.com`.

**Cuidados.** Ao hospedar as fontes, conferir que o visual não muda.

### Item 8 — Plano de incidentes e registro de acessos (P2)

**Evidência — Confirmado.** Não há documento de resposta a incidentes. O único registro é `console.error` (`nucleo.js:212`), que não guarda quem acessou o quê. Com senha compartilhada, não dá para investigar um acesso indevido.

**Passo a passo.** Plano de uma página (quem decide, como avaliar o risco, modelo de aviso, prazo). Registrar entradas no painel e ações sensíveis (ver comprovante, apagar), sem gravar dados pessoais no log. Manter um registro de incidentes, mesmo os não comunicados.

**Como testar.** Simulação de mesa: "a senha vazou hoje, o que fazemos?".

### Item 9 — Ficha de inscrição sem limite de envios (P2)

**Evidência — Confirmado.** `nucleo.js:146-158` aceita qualquer quantidade de envios; a única defesa é um campo-isca (`149`). **Correção:** limite por origem e por tempo. **Cuidado:** não bloquear famílias que usam a mesma rede.

### Item 10 — Diagnóstico público (P2)

**Evidência — Confirmado.** `api/index.js:38-50` responde sem senha se há senha e Blob configurados e os **nomes** das variáveis (nunca os valores). **Correção:** exigir a senha do painel ou remover a rota.

### Item 11 — Dependências com falhas conhecidas (P2)

**Evidência — Confirmado** (`npm audit` em 10/11/2026): 8 avisos, 7 altos e 1 moderado.
- `vite`, `esbuild`, `source-map-js`: só afetam o computador de desenvolvimento, não o site no ar.
- `@vercel/blob` → `@vercel/oidc` → `@vercel/cli-config` → `zod`, e `undici`: rodam no servidor. São falhas de negação de serviço (derrubar, não vazar).

**Correção:** atualizar com os testes automáticos rodando antes e depois. **Cuidado:** o `npm audit fix --force` sugere **rebaixar** o `@vercel/blob` para 2.4.0 — não aceitar sem testar, pode quebrar o armazenamento.

### Itens 12 a 14 — Boas práticas (P3)

- **12. Cabeçalhos de segurança.** `vercel.json` não define nenhum. Adicionar CSP e afins, testando para não bloquear fontes e imagens.
- **13. Credenciais no navegador.** A senha do painel fica em `sessionStorage` (`Admin.jsx:95`) e vai em toda requisição; a sessão do aluno fica 30 dias em `localStorage` (`Aluno.jsx:30-37`). Em aparelho compartilhado, é preciso clicar em "Sair".
- **14. Senhas do aluno.** Mínimo de 6 caracteres (`alunos.js:32`). O bloqueio após 6 erros (`alunos.js:30`) é por conta, então alguém que saiba o celular de um aluno pode travá-lo por 15 minutos de propósito. A senha temporária viaja pelo WhatsApp, mas é trocada no primeiro acesso.

---

## 6. O que já está bom

- **Sem rastreamento:** nenhum analytics, pixel, cookie de marketing ou IA.
- **Segredos fora do código:** nenhum token ou senha no repositório nem no histórico do git; `.env.local` está no `.gitignore`.
- **Senhas dos alunos** guardadas só como hash forte (scrypt com sal), nunca em texto.
- **Sessões** assinadas, com validade de 30 dias, derrubadas ao trocar a senha.
- **Um aluno não acessa dados de outro:** as rotas usam o dono da sessão, não um ID vindo do navegador. Verificado por 79 testes automáticos.
- **Comprovantes privados:** só o dono e o professor abrem; tipos de arquivo restritos; servidos com `nosniff`.
- **Rotas do professor protegidas no servidor**, não só escondidas na tela.
- **Exclusão real:** apagar um aluno remove cadastro, login e arquivos.
- **Observações do professor** não são enviadas ao aluno.
- **Caixa de aceite não vem pré-marcada**; e-mail é opcional; o nome do responsável só é pedido para menores.
- **HTTPS** em todo o site (padrão da Vercel).

## 7. O que não deu para verificar

Preciso que você confira ou me passe:

1. **A senha de produção** é mesmo a que apareceu na conversa? Quem mais a conhece?
2. **Conta da Vercel:** quem tem acesso, se há verificação em duas etapas, a região do Blob e se o DPA foi aceito.
3. **Enquadramento como agente de pequeno porte:** porte da empresa (MEI/ME/EPP) e faturamento. Disso dependem a dispensa de encarregado e os prazos em dobro.
4. **Fora do sistema:** fichas em papel, planilhas, e por quanto tempo as conversas de WhatsApp com fichas e comprovantes ficam no celular da academia.
5. **Cópias de segurança** do Blob: existem? Quem acessa?
6. **Obrigação fiscal** de guardar comprovantes de pagamento (com o contador).
7. **Resolução CD/ANPD nº 15/2024:** não consegui abrir o texto oficial; os prazos abaixo vêm de fontes secundárias.

## 8. Mapa de dados

| Dado | Onde é coletado | Onde fica guardado | Para que é usado | Com quem é compartilhado | Por quanto tempo | Sensível? |
|---|---|---|---|---|---|---|
| Nome completo | Ficha de matrícula; cadastro pelo professor | Blob `inscricoes/`, `alunos/` | Identificar o aluno | Vercel; WhatsApp (se a pessoa enviar) | Indefinido | Não |
| Data de nascimento | Ficha (obrigatória); cadastro | Idem | Idade, turma, saber se é menor | Idem | Indefinido | Não (de menor: atenção) |
| WhatsApp / celular | Ficha; cadastro | Idem + `logins/` | Contato, cobrança, login do aluno | Idem | Indefinido | Não |
| E-mail (opcional) | Ficha; cadastro | Idem | Contato | Vercel | Indefinido | Não |
| Nome do responsável | Ficha (só menores) | `inscricoes/`; observações do aluno | Contato do responsável | Vercel; WhatsApp | Indefinido | Não |
| **Lesões / problemas de saúde** | Ficha (campo livre) | `inscricoes/`; observações do aluno | Adaptar o treino | Vercel; WhatsApp | Indefinido | **SIM** |
| Experiência, turma, plano, valor, forma de pagamento | Ficha; cadastro | `inscricoes/`, `alunos/` | Organizar turmas e cobrança | Vercel | Indefinido | Não |
| Faixa, data de entrada, observações | Cadastro pelo professor | `alunos/` | Acompanhamento | Vercel | Indefinido | Depende do que for escrito |
| Senha do aluno | Área do aluno | `alunos/` (só o hash) | Login | Vercel | Enquanto a conta existir | Não |
| Histórico de mensalidades | Área do aluno; painel | `alunos/` | Controle de pagamento | Vercel | Indefinido | Não (financeiro) |
| **Comprovante de Pix** (pode mostrar nome, banco, parte do CPF) | Área do aluno | Blob `comprovantes/` (privado) | Conferir pagamento | Vercel | Indefinido; versões antigas ficam órfãs | Não (financeiro: atenção) |
| Tentativas de login | Área do aluno | `alunos/` | Bloquear ataque | Vercel | Até o próximo login | Não |
| Sessão do aluno | Navegador (`localStorage`) | Aparelho do aluno | Manter logado | — | 30 dias | Não |
| Senha do painel | Navegador (`sessionStorage`) | Aparelho do professor | Manter logado | — | Até fechar a aba | Credencial |
| Endereço IP | Toda visita | Logs da Vercel; Google (fontes) | Funcionamento | Vercel; Google | Definido por eles | Não |

## 9. Anexo — O que a lei exige hoje

Consulta em 10/11/2026.

**Confirmado em fonte oficial**

- **Multa (LGPD, art. 52, II):** até 2% do faturamento no Brasil no último exercício, limitada a R$ 50 milhões **por infração**. Há também advertência, publicização, bloqueio e eliminação dos dados. — [planalto.gov.br](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- **Prazo para responder ao titular (art. 19):** formato simplificado, imediatamente; declaração completa, em até 15 dias. — mesma fonte
- **Crianças (art. 14):** tratamento no melhor interesse; para crianças, consentimento específico e em destaque de um dos pais ou responsável. — mesma fonte
- **Dado sensível (art. 11):** consentimento específico e destacado, ou uma das hipóteses do inciso II (obrigação legal, exercício de direitos, proteção da vida, tutela da saúde por profissional de saúde, entre outras). — mesma fonte
- **Encarregado (art. 41):** o controlador deve indicar e divulgar o contato. — mesma fonte
- **Incidente (art. 48):** comunicar à ANPD e ao titular quando houver risco ou dano relevante. — mesma fonte
- **Pequeno porte (Res. CD/ANPD nº 2/2022):** dispensa de encarregado, desde que haja canal de comunicação com o titular (art. 11); prazos em dobro para pedidos de titulares e comunicação de incidentes (art. 14); a flexibilização **não vale para tratamento de alto risco**, que exige um critério geral (larga escala ou afetar significativamente direitos) **e** um específico — entre eles, uso de dados sensíveis ou de crianças, adolescentes e idosos (art. 4º). — [gov.br/anpd](https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/regulamentacoes-da-anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022)
  - *Leitura para este caso:* a academia atende o critério específico (saúde e crianças). Pelo volume pequeno, provavelmente não atende o geral, e continuaria como pequeno porte. **A confirmar com advogado.**
- **ECA Digital (Lei nº 15.211/2025):** vale para produto ou serviço de tecnologia direcionado a crianças e adolescentes ou de acesso provável por eles; em vigor desde 17/03/2026. — [planalto.gov.br](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15211.htm)
- **ANPD virou agência reguladora:** a MP nº 1.317/2025 foi convertida na Lei nº 15.352/2026. — [Senado Notícias](https://www12.senado.leg.br/noticias/materias/2026/02/26/sancionada-lei-que-cria-a-agencia-nacional-de-protecao-de-dados)

**A confirmar (só fontes secundárias)**

- **Incidentes (Res. CD/ANPD nº 15/2024):** comunicar em 3 dias úteis a partir do conhecimento; complementar em 20 dias úteis; guardar o registro de todo incidente por 5 anos; prazo em dobro para pequeno porte. — [Mattos Filho](https://www.mattosfilho.com.br/unico/regulamento-incidente-seguranca/), [Confidata](https://confidata.com.br/blog/comunicacao-incidente-seguranca-anpd)
- **Dosimetria (Res. CD/ANPD nº 4/2023):** cálculo da multa em etapas, conforme a gravidade. Há consulta pública aberta para atualizá-la. — [Felsberg](https://www.felsberg.com.br/anpd-aprova-regulamento-de-dosimetria-e-aplicacao-de-sancoes-administrativas/)
- **Encarregado (Res. CD/ANPD nº 18/2024)** e **transferência internacional (Res. CD/ANPD nº 19/2024):** o prazo para adotar as cláusulas-padrão terminou em 23/08/2025. — [Mattos Filho](https://www.mattosfilho.com.br/unico/regulamentacao-transferencia-internacional-dados/), [Lefosse](https://lefosse.com/noticias/transferencia-internacional-de-dados-prazo-para-adocao-das-clausulas-padrao-da-anpd-se-encerra-em-23-de-agosto/)
- **ECA Digital, regulamentação:** Decreto nº 12.880/2026; ANPD como fiscalizadora; fiscalização de verificação de idade prevista a partir de janeiro de 2027. — [Data Privacy Brasil](https://www.dataprivacybr.org/eca-digital-entra-em-vigor-o-que-a-lei-preve-e-o-que-ainda-falta-regulamentar/)
- **Agenda da ANPD 2025–2026:** direitos dos titulares, dados sensíveis e medidas de segurança estão na pauta, mas não encontrei norma nova aprovada sobre esses temas em 2026. — [Lefosse](https://lefosse.com/noticias/alerta/anpd-sinaliza-prioridades-de-fiscalizacao-e-regulacao-para-os-proximos-anos/)

## 10. Aviso

Este relatório é uma avaliação técnica e **não substitui orientação jurídica**. Textos como a política de privacidade, os termos de consentimento e a decisão sobre o enquadramento como agente de pequeno porte devem passar pela revisão de um profissional de direito.
