# SavePoint – documento de contexto para o Antigravity

Oct 28, 2026 · @Isa

O SavePoint é um app web de diário de bordo para quem joga jogos com história e puzzles; este documento reúne tudo que o agente precisa para construir a primeira versão.

## Visão e regras

O SavePoint serve para tornar o jogo mais imersivo: o jogador anota pensamentos, pistas e informações para usar depois, e guarda a experiência de cada "mundo" (jogo) em um lugar só.

**Público:** quem joga jogos com modo história ou que exigem leitura de documentação e resolução de puzzles.

**Ação principal:** organizar anotações e ter um caderno separado para cada jogo.

**Regras que o código precisa respeitar:**

1. Todo registro, de qualquer categoria, tem data, hora e a sessão a que pertence.
2. A sessão nasce do cronômetro: ao abri-lo, registra-se a hora de início. As anotações ficam ligadas à sessão, e cada jogo soma o total de horas.
3. Nem todo jogo tem capítulos ou mostra progresso. A evolução é medida por horas jogadas e sessões, nunca por capítulos.
4. O mesmo cronômetro aparece na tela inicial e em Encerrar Sessão. Com a sessão em andamento, o botão de início vira "Pausar", e o terceiro item continua contando o tempo total.
5. O nome do produto é SavePoint e o idioma da interface é português do Brasil.
6. Visual: tema escuro, destaque em amarelo-âmbar, títulos em fonte serifada e o restante em sans-serif, como nas telas do Stitch.

## Escopo do MVP

A primeira versão entrega o ciclo completo "adicionar jogo → jogar uma sessão → anotar → rever", e nada além disso.

**Entra:**

- Onboarding curto e adicionar jogo (nome, plataforma, gêneros, capa opcional).
- Biblioteca com filtros por situação do jogo.
- Cronômetro de sessão: iniciar, pausar, encerrar.
- Encerrar sessão com três campos: o que fiz, onde parei, próximo passo.
- Anotações por tipo (Diário, Senhas, Documentos, Puzzles, Lembretes, Marco, Região mapeada e Objetivo) com tags, sempre ligadas a uma sessão.
- Objetivos em aberto por jogo (um tipo de anotação), que podem ser marcados como concluídos.
- Jornada do jogo: trilha cronológica, estatísticas simples e diário de sessões.
- Busca por texto nas anotações.

**Fica para depois:**

- Conquistas da Steam (14/44): exigem integração com a API da Steam. Na primeira versão, no máximo um campo manual.
- Catálogo de jogos com sugestões automáticas: na primeira versão, o jogo é cadastrado à mão.
- Proteção contra spoilers: função removida do produto; a frase sobre spoilers sai das telas.
- Login e sincronização entre aparelhos: chegam com o Supabase (Fatia 7), depois que o app funcionar com dados locais.

## Telas e fluxo

Existem 7 telas desenhadas no Stitch e 6 telas que ainda precisam ser desenhadas; o fluxo principal é boas-vindas, adicionar jogo, biblioteca, jornada do jogo, nova anotação e encerrar sessão.

&#91;image: Sem título (2).png\]

| # | Tela | Função | Situação |
| --- | --- | --- | --- |
| 1 | Boas-vindas (2 slides) | Apresenta o produto e leva a "Começar" ou "Já tenho conta" | Desenhada |
| 2 | Primeiro mundo pronto | Confirma o primeiro jogo e oferece criar a primeira nota | Desenhada, com ajuste |
| 3 | O que você está jogando agora? | Busca o jogo pelo nome no onboarding | Desenhada, com ajuste |
| 4 | Adicionar jogo | Formulário: capa, nome, plataforma e gêneros (até 3) | Desenhada |
| 5 | Biblioteca | Lista de todos os jogos, filtros por situação e botão "+" | Desenhada, com ajuste |
| 6 | Jornada do jogo | Cronômetro, trilha, objetivos, estatísticas e diário de sessões | Desenhada, com ajuste |
| 7 | Nova anotação | Texto, tipo de anotação (inclui Marco, Região mapeada e Objetivo), tags e "Registrar anotação" | Desenhada |
| 8 | Encerrar sessão | Campos "O que fiz / Onde parei / Próximo passo" e cronômetro | A desenhar |
| 9 | Login | Entrar em conta existente | A desenhar |
| 10 | Buscar | Busca nas anotações de todos os jogos | A desenhar |
| 11 | Ver todas as sessões | Lista completa do diário de sessões | A desenhar |
| 12 | Abrir notas da sessão | Lista das anotações de uma sessão | A desenhar |
| 13 | Estados vazios e de erro | Biblioteca vazia, jogo sem sessões, falha ao salvar | A desenhar |

A barra inferior tem três abas: Biblioteca, Jornada e Buscar. A Biblioteca lista todos os jogos, a Jornada mostra o jogo atual com o cronômetro e a Buscar procura nas anotações.

## Modelo de dados

Tudo gira em torno da hierarquia Jogo → Sessão → Registro; as horas totais e a média por sessão são sempre calculadas a partir das sessões, nunca digitadas.

| Entidade | Campos principais | Observações |
| --- | --- | --- |
| Jogo | id, nome, plataforma, gêneros (até 3), capa, situação (Jogando, Pausado, Concluído, Quero jogar) | Cada jogo é um "mundo" com seu próprio caderno |
| Sessão | id, jogo, número, início, fim, tempo pausado, o que fiz, onde parei, próximo passo | Duração = fim − início − pausas. Só uma sessão ativa por vez |
| Registro | id, jogo, sessão, tipo, texto, tags, data e hora, concluído (só para Objetivo) | Tipos: Diário, Senhas, Documentos, Puzzles, Lembretes, Marco, Região mapeada e Objetivo. Sessão obrigatória. Marco e Região mapeada aparecem na trilha cronológica; Objetivo aparece em Objetivos em aberto |

Marcos, regiões mapeadas e objetivos não são tabelas separadas: são tipos de Registro, e por isso também exigem sessão, data e hora.

**Regra para anotar sem sessão ativa:** ao tentar criar uma anotação sem cronômetro rodando, o app oferece iniciar uma sessão. Assim a regra "todo registro pertence a uma sessão" nunca é quebrada.

## Ajustes antes de codar

Os ajustes abaixo saíram da avaliação das telas; os três primeiros mudam o comportamento do app e devem ser resolvidos antes de começar a construir.

- [x] Desenhar a tela Encerrar Sessão com o mesmo cronômetro da Jornada.
- [x] Mostrar o cronômetro ou um mini-cronômetro na tela inicial e em qualquer tela enquanto houver sessão em andamento.
- [ ] Ajustar as abas: Biblioteca lista todos os jogos e Jornada mostra o jogo atual com o cronômetro. Hoje a tela inicial lista jogos, mas destaca a aba Jornada.
- [x] Corrigir o texto "sessoes" (sem acento) e o número "2 sessões" em um jogo recém-criado, na tela Primeiro mundo pronto.
- [x] Completar os filtros da biblioteca: o contador soma 6, mas só aparecem Jogando e Pausados. Incluir também Concluído e Quero jogar.
- [x] Trocar os 8 cards repetidos da biblioteca por jogos diferentes, para testar o layout real.
- [ ] Dar margem inferior às telas para o botão "+" e o botão de editar não cobrirem conteúdo.
- [x] Evitar texto cortado na Trilha Cronológica (frases terminando no meio).
- [ ] Aumentar tamanho e contraste dos textos pequenos (rótulos, legendas das estatísticas).
- [x] Dividir a tela Jornada em abas: Trilha, Objetivos, Estatísticas e Diário.
- [x] Desenhar a tela Buscar, Ver todas as sessões, Abrir notas, Login e os estados vazio e de erro se basenado nos critérios e padrao estético da imagem anexada
- [x] Retirar das telas a frase "proteção total contra spoilers" (a função foi removida do produto).

## Plano de construção

Construa em fatias (0 a 7), uma de cada vez, e teste no navegador antes de pedir a próxima; cada fatia abaixo traz o prompt para colar no Antigravity.

**Stack sugerida:** React com Vite e TypeScript, pensado primeiro para celular, com os dados salvos no próprio navegador (IndexedDB). Os dados ficam atrás de uma camada própria, que na Fatia 7 é trocada pelo Supabase (banco de dados com login), sem mexer nas telas.

### Fatia 0 – Preparação

```text
Crie um projeto web com React, Vite e TypeScript, pensado para celular (largura de 390 px) e que também funcione no desktop. Use CSS simples com variáveis para as cores. Crie a pasta /design e a pasta /docs. Salve o texto do documento SavePoint na pasta /docs como SPEC.md. Leia o SPEC.md inteiro antes de escrever código e siga as regras da seção Visão e regras. Não implemente nenhuma tela ainda: entregue só a estrutura do projeto, a navegação por rotas (Biblioteca, Jornada, Buscar) e o tema escuro com destaque amarelo-âmbar e títulos em fonte serifada.
```

### Fatia 1 – Dados

```text
Implemente a camada de dados descrita na seção Modelo de dados do SPEC.md: Jogo, Sessão e Registro (Marco, Região mapeada e Objetivo são tipos de Registro; só o Objetivo tem o campo concluído). Salve por trás de uma interface de repositório, com implementação local em IndexedDB agora, para trocar depois por Supabase sem reescrever as telas. Crie funções para criar, listar, editar e apagar cada entidade. Todo Registro precisa ter jogo, sessão, data e hora. Calcule horas totais, número de sessões e média por sessão a partir das sessões, sem guardar esses números. Permita só uma sessão ativa por vez. Escreva testes simples para essas regras.
```

### Fatia 2 – Biblioteca e adicionar jogo

```text
Implemente a tela Biblioteca e a tela Adicionar jogo, seguindo as imagens da pasta /design (telas 4 e 5). A Biblioteca tem o jogo em destaque, filtros por situação (Todos, Jogando, Pausado, Concluído, Quero jogar) e grade de cards. O formulário tem capa opcional, nome, plataforma (uma escolha) e gêneros (até 3). Inclua o estado vazio da biblioteca, com convite para adicionar o primeiro jogo. Salve os jogos na camada de dados da Fatia 1.
```

### Fatia 3 – Cronômetro e sessões

```text
Implemente o cronômetro de sessão da tela Jornada do jogo e a tela Encerrar Sessão. O mesmo componente de cronômetro aparece nas duas telas. Iniciar cria a sessão e registra a hora; com a sessão em andamento o botão vira Pausar; Encerrar abre a tela com os campos O que fiz, Onde parei e Próximo passo. O terceiro item do cronômetro continua contando o tempo total do jogo. A sessão precisa sobreviver a recarregar a página (guarde o início e as pausas, não um contador em memória). Mostre um mini-cronômetro fixo em todas as telas enquanto houver sessão ativa.
```

### Fatia 4 – Anotações

```text
Implemente a tela Nova anotação e o botão que a abre. Campos: texto, tipo (Diário, Senhas, Documentos, Puzzles, Lembretes, Marco, Região mapeada e Objetivo, escolha única) e tags opcionais, com a opção de criar uma nova tag. Ao salvar, vincule a anotação à sessão ativa, mostrando o texto "Vinculada automaticamente à Sessão N". Se não houver sessão ativa, ofereça iniciar uma antes de salvar. Implemente também a tela Abrir notas, com as anotações de uma sessão agrupadas por categoria.
```

### Fatia 5 – Jornada do jogo

```text
Implemente o restante da tela Jornada, dividida em abas: Trilha cronológica, Objetivos, Estatísticas e Diário de sessões. A trilha mostra as sessões em ordem, com os registros dos tipos Marco e Região mapeada de cada uma. Objetivos lista os registros do tipo Objetivo e permite criar e marcar como concluído. Estatísticas mostra horas totais, sessões feitas e média por sessão, todas calculadas. O Diário mostra, por sessão, os campos O que fiz, Onde parei e Próximo passo, e tem a tela Ver todas as sessões. Não implemente conquistas da Steam.
```

### Fatia 6 – Busca e acabamento

```text
Implemente a tela Buscar, com busca por texto nas anotações de todos os jogos e filtro por jogo e categoria. Depois revise o app inteiro: estados vazios, mensagens de erro ao salvar, textos cortados, contraste dos textos pequenos, margem inferior para os botões flutuantes e acessibilidade básica (foco, rótulos dos botões). Liste o que ficou de fora.
```

### Fatia 7 – Supabase (só depois do app funcionando)

Antes deste prompt, crie um projeto no Supabase e coloque a URL e a chave pública (anon key) em um arquivo .env do projeto. Não cole chaves no chat nem no código.

```text
Troque a implementação local de dados por Supabase, mantendo a interface de repositório criada na Fatia 1 para que as telas não mudem. Crie as tabelas jogos, sessoes e registros com a coluna user_id, ative o Row Level Security para que cada usuário só leia e escreva os próprios dados e use autenticação por e-mail. Implemente a tela Login ("Já tenho conta") e o cadastro. Leia as chaves de variáveis de ambiente. Ofereça importar os dados locais existentes para a conta ao entrar pela primeira vez. Explique como criar as tabelas no painel do Supabase.
```

Em todas as fatias, anexe junto ao prompt as imagens das telas correspondentes e peça ao agente para dizer o que não conseguiu implementar, em vez de improvisar.

## Decisões tomadas

As 5 perguntas que estavam em aberto foram respondidas em 28/10 e já estão refletidas no resto do documento.

- **Marcos, Regiões mapeadas e Objetivos:** são tipos de anotação, não itens separados.
- **Abas da barra inferior:** a Biblioteca lista todos os jogos e a Jornada mostra o jogo atual com o cronômetro.
- **Armazenamento:** banco de dados com Supabase, feito por partes: primeiro dados locais, depois o Supabase na Fatia 7.
- **Situações do jogo:** além de Jogando e Pausado, entram Concluído e Quero jogar.
- **Spoilers:** a função foi removida e a frase sai das telas.
