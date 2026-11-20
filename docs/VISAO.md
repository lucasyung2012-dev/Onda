# Onda — do mundo até você

Documento de visão do projeto. É a referência permanente: toda decisão nova
que mudar algo daqui deve ser registrada neste arquivo.

> Versão 1 do documento — 20/11/2026. Junta três visões: a do autor (estudante),
> um prompt de radar geopolítico feito com o ChatGPT e o plano do Claude.

---

## 1. Para que serve

Entender **como os acontecimentos do mundo chegam até o meu dia a dia** no
Brasil: preços, combustível, dólar, tecnologia, empregos, mídia, política.

O problema de partida: pedir a uma IA "a notícia mais impactante do dia" dá
uma notícia só, com análise rasa. O Onda mostra **várias notícias**, destaca
**uma** como a mais importante e, para cada uma, monta a **cadeia de efeitos**
do fato até a minha vida.

Quem usa: só o autor, principalmente no celular e no iPad.

## 2. O que o app faz (versão 1)

| Parte | O que é |
|---|---|
| **Radar de hoje** | Todas as notícias do dia, de mais de 30 fontes de países e visões diferentes, organizadas por região e tema. |
| **Destaque do dia** | Um fato escolhido como o mais importante, com a justificativa da escolha e as três notas. |
| **Tema do dia** | Uma análise de um assunto da biblioteca (ex.: "Ucrânia → petróleo → sua gasolina"), em rodízio. |
| **Acompanhar** | Eu escolho de 3 a 5 notícias por dia para acompanhar e escrever a cadeia de efeitos. |
| **Cadeia de efeitos** | Formulário com os passos do fato até mim, as notas e as etiquetas de confirmação. |
| **Copiar prompt** | Monta um texto pronto para colar em qualquer IA e pedir um rascunho da cadeia. |
| **Biblioteca** | 42 temas com base pronta, que crescem com as notícias ligadas a eles. |
| **Histórico** | Tudo que já foi escrito, com busca por tema, região, país, data e importância. |

### Cadeia de efeitos

1. **O que aconteceu** — com a data do fato.
2. **Quem é afetado diretamente** — países, empresas, pessoas.
3. **Efeitos em camadas** — economia, preços, energia, tecnologia,
   mídia e informação, sociedade, política. Nem toda notícia preenche todas.
4. **Como chega em mim / no Brasil** — classificado como
   *direto*, *indireto*, *risco potencial* ou *sem impacto imediato*.
5. **Três notas de 0 a 10**, separadas e justificadas:
   - **Importância geral** (histórica, política, estratégica);
   - **Impacto no cenário mundial**;
   - **Impacto no meu dia a dia**.

### Régua das notas (0 a 10)

| Nota | Significado |
|---|---|
| 0–2 | Repercussão mínima |
| 3–4 | Importância limitada ou regional |
| 5–6 | Importância internacional relevante |
| 7–8 | Grande acontecimento; mexe no equilíbrio regional ou entre potências |
| 9 | Excepcional; muda segurança, diplomacia ou economia mundial |
| 10 | Raríssima: transformação histórica da ordem mundial |

Um fato pode ter importância geral 8, impacto mundial 7 e impacto no dia a dia 1.
Gravidade não é o mesmo que importância histórica.

## 3. Regras editoriais (não podem ser quebradas)

1. Nunca inventar fato, fonte, link ou citação.
2. Separar **data do fato**, **data da publicação** e **data da consulta**
   (referência: horário de Brasília, `America/Sao_Paulo`, calculado na hora,
   nunca fixo no código).
3. Notícia antiga republicada **não** é fato do dia.
4. Etiquetar cada informação: **fato confirmado**, **declaração oficial**,
   **alegação**, **não confirmado**, **análise**.
5. Marcar quando há **uma fonte só**.
6. Não escolher o destaque por popularidade nem favorecer região.
7. Não exagerar o impacto no Brasil. Se não há impacto, dizer isso.
8. Previsão nunca é apresentada como certeza.
9. Sem base, a resposta é "sem dado". Nada é inventado para preencher a tela.
10. Nada é sobrescrito em silêncio: o histórico guarda as versões.

## 4. Fontes

As mais confiáveis, gratuitas e públicas, de países e visões diferentes,
em português e inglês (a IA traduz título e resumo). A lista viva fica em
[`data/fontes.json`](../data/fontes.json), com país, visão editorial e idioma
de cada uma. Fontes estatais (ex.: TASS, CGTN, Xinhua) entram de propósito,
para mostrar a versão oficial daqueles governos, e são marcadas como estatais.

- Reuters e AP não têm RSS público: aparecem quando outras fontes as citam.
- Fontes com paywall (ex.: NYT): o Onda usa só título, resumo e link.
- **Direitos autorais:** o Onda guarda só a análise, trechos curtos e links,
  nunca a matéria inteira. A imagem é a do próprio feed, exibida com crédito
  e sem cópia para o nosso servidor. Sem imagem, entra uma ilustração por
  região ou tema.

## 5. Visual

- **Nome:** Onda. **Frase:** "do mundo até você".
- **Logo:** o globo nasce do mar; as ondas levam o fato até "você", o ponto
  dourado na crista. Arquivos em [`assets/logo/`](../assets/logo/).
- **Cores (tema):** céu azul-noite `#061A2E` → `#0D3B5C`; turquesa `#45D0C4`;
  azul `#1A8FA8`; dourado `#FFD166` só para "você" e para o que mais importa.
- **Modos noite e dia**, com botão para alternar.
- **Fontes:** títulos em Fraunces (serifada), texto em Inter (Google Fonts).
- **Cor com significado:** cada camada da cadeia e cada nível de confirmação
  tem sua cor. Nada de enfeite.
- **Organização:** 4 abas no rodapé — Hoje, Acompanhando, Biblioteca,
  Histórico. A tela Hoje mostra destaque → tema do dia → lista.
  No iPad, duas colunas (lista à esquerda, notícia aberta à direita).
- **App instalável (PWA):** ícone na tela inicial, abre em tela cheia,
  funciona sem internet com a última edição.

## 6. Arquitetura (custo zero)

```
 Feeds RSS ─┐
 GDELT ─────┤   GitHub Actions          repositório (data/*.json)
 Google ────┼─► (robô agendado) ──────► ──────────────┐
 Notícias   │   coleta, agrupa,                       │
 Wikipedia ─┘   classifica, IA grátis                 ▼
                                             GitHub Pages (site estático)
                                                      │
                                     celular / iPad ◄─┘
                                          │
                                          ▼
                              Firebase (login Google + Firestore):
                              notícias acompanhadas e cadeias,
                              sincronizadas entre os aparelhos
```

| Parte | Escolha | Por quê |
|---|---|---|
| Site | HTML, CSS e JavaScript puro, sem build | Nada para instalar; dá para ler e entender cada arquivo. |
| Hospedagem | GitHub Pages | Gratuita (exige repositório público). |
| Robô | GitHub Actions | Gratuito e ilimitado em repositório público; o navegador não lê RSS de outros sites (CORS). |
| Dados do usuário | Firebase Auth + Firestore | Gratuito, sincroniza celular e iPad, funciona offline. Só o dono lê e escreve. |
| IA | GitHub Models (principal), Gemini/Groq gratuitos (reserva) | Sem custo. Condições verificadas antes de usar. |

## 7. Etapas

Cada etapa termina com instruções de teste no celular antes de seguir.

1. **Coleta** — robô lê os feeds a cada 3 horas, agrupa matérias do mesmo
   fato, classifica por região e tema, grava `data/noticias/`.
2. **Tela do dia** — PWA com destaque, tema do dia e lista; abas; modos
   noite e dia; ícones do app.
3. **Login e acompanhar** — Google + Firestore; 3 a 5 notícias por dia.
4. **Cadeia de efeitos** — formulário, notas, etiquetas e "copiar prompt".
5. **Biblioteca** — 42 temas com base pronta, rodízio, ligação com notícias,
   sugestão de temas novos.
6. **Histórico** — busca por tema, região, país, data e importância.
7. **Pesquisa e IA automáticas** — GDELT e Google Notícias para achar mais
   matérias, leitura das abertas, Wikipedia para contexto, IA gratuita
   escolhe o destaque e escreve rascunhos (marcados "rascunho da IA"),
   cada afirmação ligada a um link.

## 8. Fica para depois

Previsões com data e taxa de acerto · carteira de investimentos simulada ·
painel de indicadores (dólar, petróleo) · mapa interativo · comparação
histórica · mais idiomas.

## 9. Limites conhecidos

- A IA gratuita é mais fraca e tem limite diário: a análise profunda vai para
  o destaque e o tema do dia; o botão "copiar prompt" é o plano B.
- Agrupar matérias em línguas diferentes só fica bom com a IA (etapa 7).
- Planos gratuitos podem mudar; tudo é trocável sem refazer o app.
