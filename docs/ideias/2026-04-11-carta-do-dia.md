# Ideia: Carta do Dia

**Data:** 2026-04-11
**Status:** Pré-brainstorm — contexto inicial para próxima sessão
**Referência:** `docs/roadmap-plataforma-tarot-ia.md` item #20 (Fase 2 — Validar retenção)

## Contexto — o que já está pronto

- Auth + perfis/permissões
- Admin de baralhos, cartas e anotações
- Leituras (modo normal) + histórico + quota
- Modo treino (prática) — recém-concluído
- Admin de planos (sem integração Stripe — billing fica pra depois)
- Admin de usuários

## Por que Carta do Dia é a próxima feature certa

1. **Loop de retenção diário.** É o tipo de feature que faz o usuário abrir o app *todo dia*, não só quando sente necessidade de uma leitura. Hoje o usuário só entra quando quer uma leitura ou praticar — ambos são eventos esporádicos. O roadmap posiciona isso na Fase 2 ("Validar retenção") e é exatamente o que falta.

2. **Aproveita 90% da infra existente.** Usa:
   - `Deck` e `Card` que já existem
   - AI provider (mesmo padrão do `generateInterpretation`) — basta adicionar um método tipo `generateDailyCardReflection(card)`
   - Sistema de quota? Não — é grátis e diário (ou tem cota própria)
   - Dashboard já existe, só adicionar o widget

3. **Escopo pequeno e bem delimitado.** Daria para spec + plan + execução em um ciclo curto. Nada de refactor profundo.

4. **Alavanca features futuras:** abre caminho natural pra **gamificação (streak diário)** — que é uma das próximas fases do roadmap — e depois notificações ("sua carta de hoje chegou").

5. **Emocionalmente alinhado com o produto.** Tarot tem uma dimensão ritualística forte. Carta do Dia captura isso sem exigir o peso de uma leitura completa.

## Esboço conceitual (pra discutir no brainstorm, não é spec ainda)

### Comportamento

- Uma carta aleatória por dia, **mesma carta o dia inteiro para o mesmo usuário** (determinístico, não re-rola)
- Revelada ao clicar "Revelar minha carta do dia" (ou já aparece aberta — decidir)
- Interpretação curta gerada por IA, cacheada por carta (não por usuário-por-dia — reutilizável)
- Campo opcional de **reflexão do usuário** ("o que isso ressoa para você hoje?") — salvo privado
- Histórico: ver suas cartas dos últimos N dias

### Dados novos (duas abordagens a discutir)

**Opção A — persistida:**
`DailyCard { userId, date (YYYY-MM-DD), deckId, cardId, userReflection?, createdAt }` com índice único `(userId, date)`.

**Opção B — derivada (mais leve):**
Calcular a carta via hash determinístico `hash(userId + date) % deck.cards.length`, e só persistir `userReflection` quando existir. Sem tabela nova de verdade — só uma coleção opcional de reflexões.

### Escolha do baralho

- Por configuração global (admin escolhe o "baralho do dia" padrão), ou
- Por preferência do usuário na tela de perfil (quando o `/perfil` sair do "em breve")

### UI

- Widget na home do dashboard (o `app/(dashboard)/page.tsx` hoje está magrinho)
- Página dedicada `/carta-do-dia` com a carta revelada, interpretação, campo de reflexão, botão "ver histórico"

### Fora de escopo (primeira versão)

- Notificações push (depende de infra nova)
- Streak counter (vira a próxima feature)
- Compartilhamento
- Múltiplos baralhos configuráveis pelo usuário

## Decisões em aberto pro brainstorm

1. **Determinístico derivado (B) ou persistido (A)?** Trade-off: B é mais simples, mas A dá histórico "real" e resistente a mudanças no baralho.
2. **Baralho do dia: global (admin) ou por usuário (preferência)?**
3. **Carta revelada vs escondida:** a ritualização (clicar pra revelar) agrega ou atrapalha?
4. **Onde a reflexão do usuário aparece?** Só nessa feature, ou vira ponto de entrada pro futuro "Diário Espiritual" (item #21 do roadmap)?
5. **Widget no dashboard home:** estado "não revelada" vs "revelada hoje" vs "reflita" — quantos estados visuais?
6. **Cota/limite:** grátis pra todos os planos? Ou é um benefício de plano pago?
7. **Histórico:** até quando o usuário vê suas cartas passadas? Últimos 7/30 dias, ou tudo?

## Por que não os outros agora (para referência)

- **Chat IA mentor** — é o diferencial mais forte da tese, mas é um feature grande (UI de chat, histórico de conversas, modelo de mensagens, abstração de streaming no AI provider). Vale a pena, mas não é o próximo passo.
- **Tipos de tiragem (spreads)** — requer reformular o fluxo de leitura que acabamos de mexer. Esperar o modo treino estabilizar antes.
- **Gamificação** — depende de ter um comportamento recorrente pra contar (streak). Faz mais sentido *depois* de Carta do Dia.
- **Biblioteca de cartas** — já existe parcialmente em `/baralhos/[id]/carta/[cardId]`.
- **Módulo de cursos** — escopo grande (CMS-like), alto custo.
