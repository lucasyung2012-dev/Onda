#!/usr/bin/env bash
# =============================================================
# dados.sh — Guarda as notícias fora do histórico do repositório.
#
# Por quê: a coleta roda a cada 3 horas e reescreve arquivos grandes
# (as notícias do dia, o hoje.json do app, os indicadores). Se cada
# coleta virasse um commit na main, o repositório cresceria ~2,8 GB
# por ano, porque o Git guarda todas as versões antigas.
#
# Solução: esses arquivos moram num ramo separado, "dados", que tem
# sempre UM commit só. A cada coleta ele é substituído (push --force),
# então as versões antigas não se acumulam.
#
# Uso (nos robôs do GitHub Actions):
#   bash .github/dados.sh baixar    # traz os arquivos do ramo "dados"
#   bash .github/dados.sh guardar   # envia os arquivos atuais para lá
# =============================================================
set -euo pipefail

# Os arquivos que mudam a cada coleta (estão no .gitignore da main).
ARQUIVOS=(data/noticias/*.json data/app/hoje.json data/app/indicadores.json data/relatorio-coleta.json)

case "${1:-}" in
  baixar)
    # Sem o ramo ainda (primeira vez)? Tudo bem: a coleta começa do zero.
    if git fetch --depth=1 origin dados 2>/dev/null; then
      # "archive | tar" copia os arquivos sem mexer no índice do Git da main.
      git archive FETCH_HEAD | tar -x
      echo "Dados do ramo 'dados' baixados."
    else
      echo "Ramo 'dados' ainda não existe; começando do zero."
    fi
    ;;

  guardar)
    # Monta um commit novo, sem pai (sem histórico), só com os arquivos
    # da coleta, usando um índice temporário para não tocar na main.
    export GIT_INDEX_FILE="$(mktemp -u)"
    for f in "${ARQUIVOS[@]}"; do
      # data/noticias/hoje.json é só de uso na hora; não precisa guardar.
      [ -f "$f" ] && [ "$f" != "data/noticias/hoje.json" ] && git add -f "$f"
    done
    arvore="$(git write-tree)"
    commit="$(git commit-tree "$arvore" -m "Dados da coleta: $(TZ=America/Sao_Paulo date '+%d/%m/%Y %H:%M') (Brasília)")"
    git push --force origin "$commit:refs/heads/dados"
    rm -f "$GIT_INDEX_FILE"
    echo "Dados guardados no ramo 'dados'."
    ;;

  *)
    echo "Uso: bash .github/dados.sh baixar|guardar" >&2
    exit 1
    ;;
esac
