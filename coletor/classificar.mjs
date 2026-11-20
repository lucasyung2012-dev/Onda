// =============================================================
// classificar.mjs — Descobre a REGIÃO e o TEMA de cada notícia.
//
// Como funciona: procuramos palavras-chave (em português e inglês)
// no título e no resumo. Cada palavra encontrada soma um ponto para
// a região ou o tema dela. A notícia recebe todas as regiões e temas
// que pontuaram, do mais forte para o mais fraco.
//
// É um método simples e transparente: se uma notícia cair no lugar
// errado, basta acrescentar ou tirar palavras das listas abaixo.
// Na etapa 7, a IA vai melhorar essa classificação.
//
// Regra das palavras: escreva sem acento e em minúsculas. A busca
// é pelo COMEÇO da palavra: "ucrani" acha "Ucrânia", "ucraniano"
// e "Ukraine" não (por isso "ukrain" também está na lista).
// =============================================================

/** Nomes bonitos para mostrar na tela. */
export const NOMES_REGIOES = {
  'brasil': 'Brasil',
  'america-latina': 'América Latina',
  'america-norte': 'América do Norte',
  'europa': 'Europa e Rússia',
  'oriente-medio': 'Oriente Médio',
  'africa': 'África',
  'asia-pacifico': 'Ásia e Pacífico',
  'global': 'Organismos globais',
  'mundo': 'Mundo',
};

export const NOMES_TEMAS = {
  'conflitos': 'Conflitos e segurança',
  'diplomacia': 'Diplomacia',
  'economia': 'Economia e comércio',
  'energia': 'Energia',
  'politica': 'Política e eleições',
  'tecnologia': 'Tecnologia',
  'clima': 'Clima e meio ambiente',
  'direitos': 'Direitos humanos e migração',
  'saude': 'Saúde',
  'outros': 'Outros',
};

const REGIOES = {
  'brasil': ['brasil', 'brazil', 'lula', 'itamaraty', 'planalto', 'sao paulo', 'rio de janeiro', 'brasilia', 'bolsonaro', 'petrobras'],
  'america-latina': ['argentin', 'venezuel', 'maduro', 'milei', 'mexic', 'colombi', 'chile', 'peru', 'bolivi', 'equador', 'ecuador', 'uruguai', 'uruguay', 'paraguai', 'paraguay', 'cuba', 'haiti', 'nicaragu', 'panama', 'guatemal', 'honduras', 'latin america', 'america latina', 'mercosul', 'mercosur', 'caribe', 'caribbean'],
  'america-norte': ['eua', 'estados unidos', 'united states', 'u s ', 'washington', 'trump', 'casa branca', 'white house', 'pentagon', 'canad'],
  'europa': ['europ', 'uniao europeia', 'bruxelas', 'brussels', 'alemanh', 'german', 'berlin', 'franca', 'france', 'french', 'frances', 'paris', 'macron', 'reino unido', 'britain', 'british', 'britanic', 'londres', 'london', 'italia', 'italy', 'italian', 'espanh', 'spain', 'spanish', 'polon', 'poland', 'polish', 'ucrani', 'ukrain', 'kyiv', 'kiev', 'zelensk', 'otan', 'nato', 'russia', 'russian', 'russo', 'moscou', 'moscow', 'kremlin', 'putin', 'turqu', 'turkey', 'turkiye', 'erdogan', 'hungr', 'orban', 'grecia', 'greece', 'serbi', 'kosovo', 'armeni', 'azerbaij', 'balcan', 'balkan', 'sweden', 'suec', 'finland', 'noruega', 'norway', 'dinamarc', 'denmark', 'groenland', 'greenland', 'belarus', 'bielorrussia'],
  'oriente-medio': ['israel', 'gaza', 'palestin', 'hamas', 'hezbollah', 'hezbola', 'cisjordania', 'west bank', 'libano', 'lebanon', 'siria', 'syria', 'iran', 'teera', 'tehran', 'khamenei', 'iraque', 'iraq', 'iemen', 'yemen', 'houthi', 'arabia saudita', 'saudi', 'riad', 'riyadh', 'emirados', 'emirates', 'dubai', 'catar', 'qatar', 'jordan', 'egit', 'egypt', 'oriente medio', 'middle east', 'golfo persico', 'persian gulf', 'netanyahu', 'kurd', 'curd'],
  'africa': ['africa', 'sudan', 'sudao', 'etiopi', 'ethiopia', 'nigeri', 'quenia', 'kenya', 'congo', 'sahel', 'mali', 'niger', 'burkina', 'somali', 'libia', 'libya', 'tunisi', 'argeli', 'algeri', 'marrocos', 'morocco', 'angola', 'mocambique', 'mozambique', 'ruanda', 'rwanda', 'uganda', 'tanzania', 'gana', 'ghana', 'senegal', 'camaroes', 'cameroon', 'zimbabue', 'zimbabwe'],
  'asia-pacifico': ['china', 'chines', 'chinese', 'pequim', 'beijing', 'xi jinping', 'taiwan', 'hong kong', 'japao', 'japan', 'toquio', 'tokyo', 'coreia', 'korea', 'pyongyang', 'seul', 'seoul', 'india', 'modi', 'nova delhi', 'new delhi', 'paquistao', 'pakistan', 'afeganist', 'afghanistan', 'taliban', 'bangladesh', 'sri lanka', 'myanmar', 'birmania', 'tailandi', 'thailand', 'vietn', 'filipin', 'philippin', 'indonesi', 'malasi', 'malaysia', 'singapur', 'singapore', 'australi', 'nova zelandia', 'new zealand', 'asean', 'camboj', 'cambodia', 'kazaquist', 'kazakhstan', 'mongoli'],
  'global': ['onu', 'nacoes unidas', 'united nations', 'g20', 'g7', 'brics', 'fmi', 'imf', 'banco mundial', 'world bank', 'omc', 'wto', 'cop2', 'cop3'],
};

const TEMAS = {
  'conflitos': ['guerra', 'war', 'ataque', 'attack', 'militar', 'military', 'exercito', 'army', 'tropas', 'troops', 'missil', 'misseis', 'missile', 'drone', 'bombard', 'bomb', 'invas', 'invad', 'cessar fogo', 'ceasefire', 'cease fire', 'ofensiva', 'offensive', 'conflito', 'conflict', 'combate', 'fighting', 'mortos', 'killed', 'terror', 'insurg', 'rebel', 'golpe', 'coup', 'armas', 'weapon', 'arms '],
  'diplomacia': ['acordo', 'agreement', 'deal', 'tratado', 'treaty', 'cupula', 'summit', 'diplomat', 'embaixad', 'embass', 'negocia', 'negotiat', 'talks', 'conversas', 'chanceler', 'foreign minister', 'sanc', 'sanction', 'alianca', 'alliance', 'aliados', 'allies', 'cooperacao', 'cooperation', 'state visit', 'visita oficial'],
  'economia': ['economi', 'econom', 'tarifa', 'tariff', 'comercio', 'trade', 'exporta', 'export', 'importa', 'import', 'inflacao', 'inflation', 'juros', 'interest rate', 'banco central', 'central bank', 'mercado', 'market', 'dolar', 'dollar', 'moeda', 'currency', 'pib', 'gdp', 'recessao', 'recession', 'divida', 'debt', 'investiment', 'investment', 'bolsa', 'stocks', 'preco', 'price'],
  'energia': ['petroleo', 'oil', 'gas', 'gasoduto', 'pipeline', 'opep', 'opec', 'energia', 'energy', 'combustiv', 'fuel', 'gasolina', 'gasoline', 'diesel', 'nuclear', 'eletricidade', 'electricity', 'renovav', 'renewable', 'carvao', 'coal', 'solar', 'eolica', 'lng', 'gnl', 'refinaria', 'refinery', 'barril', 'barrel'],
  'politica': ['eleic', 'elect', 'vot', 'presidente', 'president', 'primeiro ministro', 'prime minister', 'parlamento', 'parliament', 'congresso', 'congress', 'governo', 'government', 'oposicao', 'opposition', 'partido', 'protest', 'manifesta', 'impeachment', 'renuncia', 'resign', 'posse', 'inaugurat'],
  'tecnologia': ['tecnolog', 'technolog', 'inteligencia artificial', 'artificial intelligence', 'ai ', 'chip', 'semicondut', 'semiconductor', 'ciber', 'cyber', 'hacker', 'satelite', 'satellite', 'internet', 'big tech', 'redes sociais', 'social media', 'tiktok', 'nvidia', 'huawei', '5g'],
  'clima': ['clima', 'climate', 'aquecimento', 'warming', 'enchente', 'flood', 'inunda', 'seca', 'drought', 'incendio', 'wildfire', 'furacao', 'hurricane', 'tufao', 'typhoon', 'terremoto', 'earthquake', 'desmatament', 'deforestation', 'amazon', 'emisso', 'emission', 'carbono', 'carbon', 'cop2', 'cop3', 'meio ambiente', 'environment', 'desastre', 'disaster'],
  'direitos': ['direitos humanos', 'human rights', 'refugiad', 'refugee', 'migra', 'migrant', 'imigra', 'immigra', 'asilo', 'asylum', 'fome', 'hunger', 'famine', 'humanitar', 'genocid', 'crimes de guerra', 'war crimes', 'tribunal penal', 'presos', 'prisoner'],
  'saude': ['saude', 'health', 'epidemi', 'pandemi', 'virus', 'surto', 'outbreak', 'vacina', 'vaccin', 'oms', 'ebola', 'mpox', 'dengue', 'colera', 'cholera'],
};

/**
 * Prepara o texto para a busca: minúsculas, sem acento, só letras e
 * números, com espaço nas pontas (para achar o começo das palavras).
 */
export function normalizar(texto) {
  return ' ' + texto
    .toLowerCase()
    .replace(/irã/g, 'iran') // "Irã" sem acento viraria "ira" (de "irá"), por isso trocamos antes
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // tira os acentos
    .replace(/[^a-z0-9]+/g, ' ') + ' ';
}

/** Conta quantas palavras de cada grupo aparecem e devolve os grupos em ordem. */
function pontuar(texto, grupos) {
  const pontos = [];
  for (const [id, palavras] of Object.entries(grupos)) {
    const total = palavras.filter((p) => texto.includes(' ' + p)).length;
    if (total > 0) pontos.push({ id, total });
  }
  return pontos.sort((a, b) => b.total - a.total).map((p) => p.id);
}

/** Devolve { regioes: [...], temas: [...] } para uma notícia. */
export function classificar(titulo, resumo) {
  // O título conta em dobro: ele diz do que a notícia trata.
  const texto = normalizar(`${titulo} ${titulo} ${resumo}`);
  const regioes = pontuar(texto, REGIOES);
  const temas = pontuar(texto, TEMAS);
  return {
    regioes: regioes.length ? regioes : ['mundo'],
    temas: temas.length ? temas : ['outros'],
  };
}
