# Plano de Implementacao em Fases — Plataforma de Tarot com IA

## Objetivo

Transformar o roadmap de produto em um plano executavel para este backend NestJS, priorizando:

1. entrega incremental de valor;
2. validacao rapida de retencao e monetizacao;
3. separacao modular por dominio;
4. baixo acoplamento entre regras de negocio, IA, pagamentos, comunidade e analytics.

Este plano considera o estado atual do repositorio:

- `auth`, `profile`, `role`, `database` e guardas globais ja existem;
- a base esta pronta para evoluir por modulos de dominio;
- ainda faltam os dominios centrais de Tarot, IA, conteudo, assinatura, comunidade e notificacoes.

---

## Analise do Roadmap

O roadmap mistura quatro tipos de escopo:

1. **capacidade core do produto**: tarot, leituras, biblioteca de cartas, diario;
2. **inteligencia pedagogica**: mentor IA, treino, feedback, perfil de evolucao;
3. **negocio e operacao**: assinaturas, pagamentos, analytics, admin;
4. **efeitos de rede e escala**: comunidade, marketplace, mobile, internacionalizacao.

A melhor estrategia nao e implementar por lista de features, e sim por **ondas de capacidade**:

1. fundacao de dominio;
2. experiencia principal do usuario;
3. retencao e aprendizagem;
4. monetizacao madura;
5. rede/comunidade;
6. escala e expansao.

---

## Principios de Implementacao

- Cada fase precisa ser potencialmente deployavel.
- Cada modulo precisa expor contratos claros e evitar acesso direto a internals de outros modulos.
- IA deve nascer com arquitetura de adaptador/provedor, nao acoplada a um vendor.
- Conteudo, regras de interpretacao e metodo da especialista devem virar ativos estruturados, nao texto solto em prompt.
- Analytics devem entrar desde cedo como eventos de dominio, mesmo que os dashboards venham depois.
- Paywall e autorizacao de features devem usar capacidades/entitlements, nao ifs espalhados no codigo.
- Tudo que impacta recomendacao futura deve registrar historico versionado.

---

## Dominios Recomendados

### Dominios de base

- `auth`
- `profile`
- `role`
- `users`
- `media`
- `preferences`
- `audit`

### Dominios core de produto

- `tarot-decks`
- `tarot-cards`
- `spreads`
- `readings`
- `reading-history`
- `journal`

### Dominios de IA e aprendizagem

- `ai`
- `ai-prompts`
- `ai-context`
- `learning`
- `content`
- `training`
- `feedback`
- `progress`
- `recommendations`

### Dominios de negocio

- `plans`
- `subscriptions`
- `billing`
- `payments`
- `entitlements`
- `analytics`
- `notifications`

### Dominios sociais e escala

- `community`
- `forum`
- `gamification`
- `leaderboards`
- `marketplace`
- `scheduling`
- `i18n`
- `mobile`
- `admin`

---

## Arquitetura-Alvo

## Camadas

- **API/Application**: controllers, DTOs, guards, policies.
- **Domain**: entidades, value objects, regras, servicos de dominio.
- **Infrastructure**: TypeORM, provedores de IA, pagamentos, storage, email, filas.
- **Integration**: eventos de dominio, webhooks, jobs assincros, notificacoes.

## Padroes recomendados

- adapter pattern para IA, pagamentos, storage de imagem, push e email;
- eventos de dominio para analytics, gamificacao, notificacoes e automacoes;
- modulo de `entitlements` para liberar recursos por plano;
- filas para tarefas lentas: geracao IA, emails, webhooks, agregacoes, recomendacoes;
- tabela de `prompt templates` e `knowledge assets` versionados para o metodo da especialista;
- RBAC para equipe interna e permissions/entitlements para usuarios finais.

---

## Plano Mestre

## Fase 0 — Fundacao Tecnica e Modelagem

### Objetivo

Preparar a base para crescer sem retrabalho grande quando entrarem IA, assinatura, conteudo e comunidade.

### Entregaveis

- consolidar convencoes de modulos, eventos e adapters;
- criar modulo de `users` para separar identidade de autenticacao e perfil;
- criar `media` para foto de perfil e assets futuros;
- criar `preferences` para baralho favorito, idioma, preferencias de estudo e notificacao;
- criar `audit` e trilha minima de eventos;
- definir estrategia de ids, timestamps, soft delete e ownership;
- criar seed inicial para cartas, baralhos e spreads basicos;
- criar contrato para provedores de IA e pagamentos;
- criar padrao para `feature flags` e `entitlements`;
- adicionar observabilidade minima: logs estruturados, correlation id, health checks.

### Subplano tecnico

1. Modelar entidades compartilhadas e enums base.
2. Criar infraestrutura para upload/storage de avatar e imagens.
3. Introduzir eventos de dominio com publisher simples.
4. Criar tabelas de configuracao e seeds iniciais.
5. Definir testes padrao por modulo: unitario, integracao e e2e.

### Dependencias

- nenhuma externa forte, alem da escolha inicial de storage e provedor de IA;
- pode ser iniciada imediatamente.

### Criterio de pronto

- repositorio suporta novos modulos sem duplicar patterns;
- assets e preferencias deixam de ser improvisados dentro de `profile`;
- seeds e contratos base existem para tarot, IA e assinatura.

---

## Fase 1 — MVP de Valor: Tarot + IA Basica + Conteudo + Plano Pago

### Objetivo

Entregar o menor produto cobravel e utilizavel com repeticao real.

### Escopo funcional

- escolha de baralho principal;
- biblioteca visual de cartas;
- tiragem de 1 carta;
- tiragem de 3 cartas;
- tiragem passado/presente/futuro;
- significado basico da carta;
- interpretacao inicial com IA;
- historico de tiragens;
- modulo introdutorio de conteudo;
- glossario;
- plano gratuito, trial, plano mensal;
- paywall e controle de acesso.

### Modulos a implementar

- `tarot-decks`
- `tarot-cards`
- `spreads`
- `readings`
- `reading-history`
- `ai`
- `ai-context`
- `content`
- `plans`
- `subscriptions`
- `billing`
- `entitlements`
- `analytics`

### Subplano 1A — Core de Tarot

- modelar `Deck`, `Card`, `CardMeaning`, `SpreadTemplate`, `SpreadPosition`;
- cadastrar ao menos 1 baralho completo;
- expor endpoints para listar baralhos, cartas e spreads;
- criar servico de geracao de leitura com snapshot das cartas e posicoes;
- salvar leitura com contexto do usuario, pergunta opcional e timestamp;
- persistir interpretacao manual e interpretacao IA separadamente.

### Subplano 1B — IA Basica

- criar `IAProviderAdapter` com implementacao inicial;
- montar pipeline de contexto com:
  - carta(s);
  - posicoes;
  - significado estruturado;
  - pergunta do usuario;
  - estilo base do metodo da especialista;
- salvar prompt/resultados e metadados minimos para auditoria;
- limitar custo com cotas por plano e rate limiting;
- criar endpoints de chat contextual por leitura.

### Subplano 1C — Conteudo Inicial

- modelar `Course`, `Module`, `Lesson`, `GlossaryTerm`;
- publicar conteudo introdutorio e fundamentos do tarot;
- registrar progresso de leitura/aula por usuario;
- controlar acesso entre free e paid.

### Subplano 1D — Monetizacao Inicial

- modelar produtos, planos, trial e status de assinatura;
- integrar gateway de pagamento;
- implementar webhook de cobranca;
- criar entitlements:
  - numero de leituras IA;
  - acesso a conteudos premium;
  - historico ampliado;
  - chat mentor.

### Subplano 1E — Analytics do MVP

- registrar eventos:
  - `user_registered`
  - `deck_selected`
  - `reading_created`
  - `ai_interpretation_generated`
  - `lesson_started`
  - `lesson_completed`
  - `trial_started`
  - `subscription_started`
- expor consultas internas para dashboard operacional.

### Dependencias

- Fase 0 concluida ao menos no essencial;
- definicao do primeiro baralho e base de significados;
- definicao do gateway de pagamento e provedor de IA.

### Criterio de pronto

- usuario se cadastra, faz tiragem, recebe interpretacao IA, consulta historico, consome conteudo e consegue assinar.

---

## Fase 2 — Retencao e Aprendizagem

### Objetivo

Transformar uso ocasional em rotina e evolucao perceptivel.

### Escopo funcional

- sistema de treino de leitura;
- feedback inteligente;
- gamificacao;
- carta do dia;
- perfil de evolucao;
- diario espiritual / diario de tiragens;
- modo de estudo com quiz/flashcards.

### Modulos a implementar

- `training`
- `feedback`
- `gamification`
- `progress`
- `recommendations`
- `journal`
- `notifications`
- extensoes em `analytics` e `ai`

### Subplano 2A — Sistema de Treino

- criar `TrainingScenario`, `ScenarioCardSet`, `ExpectedSignals`, `Difficulty`;
- suportar cenarios ficticios e futuramente anonimizados;
- permitir resposta textual do usuario;
- acionar IA avaliadora com rubrica controlada;
- armazenar nota, criterios e justificativas.

### Subplano 2B — Feedback Inteligente

- definir rubrica formal:
  - profundidade;
  - coerencia;
  - contexto;
  - combinacao entre cartas;
  - fidelidade simbolica;
- gerar feedback estruturado e nao so texto livre;
- destacar lacunas e sugerir melhoria acionavel;
- salvar historico de feedback para comparacao futura.

### Subplano 2C — Perfil de Evolucao

- agregar:
  - praticas concluidas;
  - cartas mais estudadas;
  - temas mais treinados;
  - tempo de estudo;
  - pontos fortes/fracos;
- oferecer recomendacoes de proximo estudo;
- criar visao cronologica de evolucao.

### Subplano 2D — Gamificacao

- eventos baseados em atividade;
- XP, niveis, streak, conquistas e desafios diarios;
- regras de recompensa desacopladas via eventos;
- cuidado para nao misturar gamificacao com autorizacao.

### Subplano 2E — Carta do Dia e Notificacoes

- gerar carta diaria por usuario;
- produzir interpretacao curta;
- disparar notificacoes in-app e depois push/email;
- usar preferencia de horario e fuso.

### Dependencias

- Fase 1 em producao;
- eventos de analytics confiaveis;
- IA basica auditavel e barata o suficiente.

### Criterio de pronto

- usuario percebe evolucao, recebe feedback recorrente e tem motivos claros para voltar diariamente.

---

## Fase 3 — Comunidade e Prova Social

### Objetivo

Criar efeito de rede e ampliar valor sem depender so de leitura individual.

### Escopo funcional

- feed de posts;
- publicacao de interpretacoes;
- comentarios e curtidas;
- compartilhamento interno;
- perfil publico basico;
- forum/perguntas e respostas;
- respostas de especialistas;
- notificacoes de interacao.

### Modulos a implementar

- `community`
- `forum`
- `notifications`
- `moderation`
- `public-profiles`
- extensoes em `analytics`

### Subplano 3A — Comunidade V1

- modelar posts, comentarios, likes e relacoes de visibilidade;
- permitir publicar leitura como post;
- criar feed por ordem cronologica antes de ranking sofisticado;
- manter moderacao simples com report e ocultacao.

### Subplano 3B — Forum

- modelar topicos, respostas, tags e marcacao de especialista;
- separar pergunta tecnica de post social;
- preparar reputacao, mas sem acoplar na primeira entrega.

### Subplano 3C — Perfis Publicos

- pagina publica com bio, nivel, badges e posts visiveis;
- configuracoes de privacidade claras;
- slug ou identificador publico consistente.

### Dependencias

- auth/profile/preferences maduros;
- notificacoes minimas;
- politica de moderacao e privacidade definida.

### Criterio de pronto

- usuario consegue aprender tambem com outras pessoas e receber reconhecimento social.

---

## Fase 4 — IA Especializada e Ensino Premium

### Objetivo

Transformar a plataforma em mentoria assistida, nao apenas interpretacao automatica.

### Escopo funcional

- IA com metodo da especialista;
- estilos de resposta;
- adaptacao por nivel do usuario;
- memoria contextual;
- recomendacoes automaticas;
- cursos premium;
- workshops, lives, certificados.

### Modulos a implementar

- `ai-prompts`
- `knowledge-assets`
- `recommendations`
- `content`
- `certification`
- `events/live-sessions`

### Subplano 4A — Base de Conhecimento Estruturada

- converter metodo da especialista em assets versionados:
  - significados por carta;
  - combinacoes;
  - interpretacao por tema;
  - padroes de erro;
  - heuristicas pedagogicas;
- separar conteudo editorial de prompt operacional.

### Subplano 4B — Mentor IA Especializado

- perfis de mentor:
  - tecnico;
  - espiritual;
  - terapeutico;
- adaptacao por maturidade do usuario;
- memoria curta por sessao e memoria longa resumida;
- explicacao progressiva e comparacao com leituras antigas.

### Subplano 4C — Escola Premium

- trilhas por nivel;
- cursos pagos;
- certificado baseado em progresso/avaliacoes;
- workshops e aulas especiais;
- regras de acesso por entitlement.

### Dependencias

- historico suficiente de uso;
- governanca de prompts e conteudo;
- estrategia de custo de IA e observabilidade mais madura.

### Criterio de pronto

- o valor percebido da plataforma passa a estar na metodologia e na evolucao personalizada, nao apenas na interface.

---

## Fase 5 — Marketplace e Ferramentas Profissionais

### Objetivo

Abrir nova linha de receita e atender usuarios avancados/profissionais.

### Escopo funcional

- perfil de profissionais;
- agendamento;
- pagamento dentro da plataforma;
- avaliacao de profissionais;
- modo profissional;
- gestao de clientes;
- anotações privadas;
- agenda.

### Modulos a implementar

- `marketplace`
- `scheduling`
- `payments`
- `professional-tools`
- `crm-lite`
- `reviews`

### Subplano 5A — Marketplace Basico

- onboarding de tarotistas;
- perfil publico profissional;
- catalogo e descoberta;
- avaliacao e reputacao;
- regras de comissao.

### Subplano 5B — Agenda e Sessao

- disponibilidade;
- reservas;
- cancelamento e reembolso;
- preparacao para sessao em video no futuro.

### Subplano 5C — Ferramentas Profissionais

- historico de clientes;
- notas privadas;
- leituras realizadas;
- organizacao por cliente/tema.

### Dependencias

- pagamentos robustos;
- compliance minimo para dados sensiveis;
- politicas comerciais e operacionais definidas.

### Criterio de pronto

- a plataforma passa a monetizar tambem por transacao e por oferta de servico.

---

## Fase 6 — Escala, Internacionalizacao e Mobile

### Objetivo

Expandir alcance e melhorar frequencia de uso.

### Escopo funcional

- multiplos idiomas;
- moedas diferentes;
- app mobile;
- push notifications;
- experiencia mobile-first;
- widgets e modo offline parcial;
- expansao geografica.

### Modulos a implementar

- `i18n`
- `localization-assets`
- `mobile`
- `push-notifications`
- extensoes em `billing`, `content` e `community`

### Subplano 6A — Internacionalizacao

- localizar conteudo editorial e significados de cartas;
- separar texto de interface de conteudo pedagogico;
- tratar moeda, timezone, idioma e segmentacao regional;
- adaptar planos e meios de pagamento por pais.

### Subplano 6B — Mobile

- definir BFF ou API adaptada para app;
- push para carta do dia, streak, interacoes e renovacoes;
- priorizar fluxos:
  - carta do dia;
  - chat mentor;
  - leitura rapida;
  - estudo rapido.

### Dependencias

- metricas consolidadas de onde existe tracao;
- jornada principal estabilizada na web/backend.

### Criterio de pronto

- plataforma preparada para crescer fora do canal inicial e fora do mercado inicial.

---

## Sequencia Recomendada de Sprints

## Trilha A — Proxima entrega realista para este repositorio

1. Fase 0 parcial
2. Fase 1 inteira
3. Fase 2 parcial

Essa trilha e a melhor para validar negocio porque entrega:

- uso principal;
- IA percebida;
- conteudo;
- assinatura;
- primeiros mecanismos de retencao.

## Trilha B — Quando o produto provar retencao

1. concluir Fase 2;
2. executar Fase 3;
3. iniciar Fase 4.

## Trilha C — Quando houver caixa ou tracao forte

1. concluir Fase 4;
2. executar Fase 5;
3. executar Fase 6.

---

## Roadmap Tecnico por Sprint Macro

## Sprint 1

- fundacao de tarot: cartas, baralhos, spreads;
- preferences/media;
- seeds iniciais;
- eventos base.

## Sprint 2

- readings e historico;
- interpretacao IA basica;
- auditoria de prompts/resultados;
- analytics MVP.

## Sprint 3

- content e glossario;
- planos, assinaturas e paywall;
- trial e entitlements.

## Sprint 4

- treino de leitura;
- feedback estruturado;
- carta do dia;
- streak inicial.

## Sprint 5

- perfil de evolucao;
- recomendacoes;
- quizzes/flashcards;
- notificacoes.

## Sprint 6

- comunidade V1;
- perfil publico;
- forum V1.

## Sprint 7+

- mentor IA especializado;
- escola premium;
- marketplace;
- mobile/i18n conforme tracao.

---

## Dependencias Criticas

- **Conteudo estruturado do Tarot**: sem isso a IA vira improviso e o produto perde consistencia.
- **Escolha do gateway de pagamento**: impacta modelagem de assinatura e webhooks.
- **Escolha do storage de media**: impacta avatar, assets de cartas e conteudo premium.
- **Estrategia de custo de IA**: impacta limites por plano, cache, cotas e margem.
- **Politica de privacidade/comunidade**: impacta diario, perfis publicos, feed e marketplace.

---

## Riscos Maiores

- tentar entregar comunidade e marketplace antes de validar o loop principal de leitura e aprendizagem;
- embutir conhecimento da especialista apenas em prompts manuais, sem estrutura versionada;
- acoplar monetizacao diretamente em controllers, em vez de centralizar em entitlements;
- deixar analytics para depois e perder capacidade de medir retencao;
- construir gamificacao antes de ter feedback e treino realmente bons;
- crescer o modulo `profile` para carregar responsabilidades de `users`, `preferences`, `media` e `public-profile`.

---

## Definicao de Pronto por Dominio

### Tarot

- seeds consistentes;
- leituras reproduziveis;
- historico com snapshots;
- suporte a multiplos tipos de spread.

### IA

- provider desacoplado;
- contexto estruturado;
- logs e auditoria;
- limites de uso por plano;
- testes de contrato e fallback.

### Conteudo

- versionamento;
- progresso por usuario;
- paywall;
- capacidade de publicar sem migracoes complexas.

### Assinaturas

- estado consistente por webhook;
- reconciliacao;
- entitlements confiaveis;
- trilha de eventos financeiros.

### Comunidade

- moderacao minima;
- privacidade;
- notificacoes;
- relacao clara entre conteudo publico e privado.

---

## Recomendacao Final

Para este repositorio, a melhor implementacao nao e "seguir as 27 features" em ordem. A melhor abordagem e:

1. fechar fundacao curta;
2. construir o loop principal `tiragem -> interpretacao IA -> historico -> conteudo -> assinatura`;
3. construir o loop de retencao `treino -> feedback -> progresso -> notificacao`;
4. so depois investir pesado em comunidade, escola premium e marketplace.

Se precisarmos transformar este documento em execucao imediata, o proximo passo recomendado e quebrar a **Fase 0 + Fase 1** em tasks tecnicas por arquivo/modulo, no mesmo formato dos planos ja existentes em `docs/superpowers/plans/`.
