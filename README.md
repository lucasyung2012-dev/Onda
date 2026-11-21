<p align="center">
  <img src="assets/logo/onda.svg" width="128" alt="Logo do Onda">
</p>

# Onda — do mundo até você

Radar geopolítico pessoal: reúne notícias do mundo inteiro, destaca a mais
importante do dia e ajuda a montar a **cadeia de efeitos** de cada fato até
o dia a dia no Brasil.

A visão completa do projeto está em [`docs/VISAO.md`](docs/VISAO.md).

## Como está organizado

| Pasta | O que tem |
|---|---|
| `coletor/` | O robô que busca as notícias (JavaScript, roda no GitHub Actions). |
| `data/fontes.json` | A lista de fontes: país, visão editorial e endereço do feed. |
| `data/noticias/` | As notícias coletadas: um arquivo por dia e o `hoje.json`. |
| `data/relatorio-coleta.json` | O que funcionou e o que falhou na última coleta. |
| `assets/logo/` | O logo do Onda. |
| `docs/` | Documentação do projeto. |

## Etapas

- [x] 1. Coleta de notícias
- [x] 2. Primeira tela (app instalável)
- [x] 3. Destaque analisado pela IA, nova organização e visual
- [x] 4. Edições anteriores, tema do dia e Explorar ilustrado
- [x] 5. Meu Onda com Dropbox e Minha análise
- [x] 6. Configurações, fila de temas, conteúdo em inglês e painel de indicadores
- [x] 7. Histórico e busca (calendário e busca em tudo)
