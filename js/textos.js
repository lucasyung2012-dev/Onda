// =============================================================
// textos.js — Os textos da interface em inglês.
//
// O app é escrito em português. Quando o idioma escolhido é inglês, a
// função t('texto em português') devolve a tradução daqui. Se faltar
// uma tradução, o texto aparece em português (nada quebra).
// =============================================================

import { ler } from './config.js';

const EN = {
  // Abas e topo
  'Hoje': 'Today', 'Temas': 'Topics', 'Explorar': 'Explore', 'Meu Onda': 'My Onda',
  'do mundo até você': 'from the world to you', 'Configurações': 'Settings',
  // Hoje
  'Radar de hoje': "Today's radar", 'Destaque do dia': 'Story of the day', 'Como chega em você': 'How it reaches you',
  'Ler a análise completa': 'Read the full analysis', 'Também importa hoje': 'Also matters today',
  'fatos para explorar por região, assunto ou fonte': 'stories to explore by region, topic or source',
  'Tema do dia': 'Topic of the day', 'Destaque de': 'Story of', 'Entender o mundo': 'Understand the world', 'Edições anteriores': 'Past editions',
  'Importância': 'Importance', 'No mundo': 'World', 'Em você': 'You',
  'A análise do dia ainda não chegou': "Today's analysis isn't here yet",
  'Fatos confirmados por várias fontes': 'Stories confirmed by several sources',
  // Análise
  'Em uma frase': 'In one sentence', 'O que aconteceu': 'What happened', 'Por que é o destaque do dia': 'Why it is the story of the day',
  'As notas': 'The scores', 'Fatos × versões': 'Facts × claims', 'O que ainda não sabemos': "What we still don't know",
  'O que acompanhar': 'What to watch', 'Também importou neste dia': 'Also mattered that day',
  'Importância geral': 'Overall importance', 'Impacto no mundo': 'Impact on the world', 'Impacto no seu dia a dia': 'Impact on your daily life',
  'Fato confirmado': 'Confirmed fact', 'Declaração oficial': 'Official statement', 'Alegação': 'Claim', 'Não confirmado': 'Unconfirmed', 'Análise': 'Analysis',
  'Impacto direto': 'Direct impact', 'Impacto indireto': 'Indirect impact', 'Risco potencial': 'Potential risk', 'Sem impacto imediato': 'No immediate impact',
  // Explorar
  'Todas as notícias': 'All the news', 'Regiões': 'Regions', 'Assuntos': 'Topics', 'Fontes': 'Sources',
  'Mostrar mais': 'Show more', 'Nada por aqui.': 'Nothing here.', 'Como cada fonte contou': 'How each source told it',
  'Uma fonte só': 'Single source', 'Estatal': 'State-run', 'Por que importa': 'Why it matters',
  // Temas
  'Temas anteriores': 'Past topics', 'Ler a explicação': 'Read the lesson', 'A resposta em uma frase': 'The answer in one sentence',
  'Nesta aula': 'In this lesson', 'Para começar do zero': 'Starting from scratch', 'Como chegamos aqui': 'How we got here',
  'Como funciona por dentro': 'How it works inside', 'O que cada lado quer': 'What each side wants', 'Onde há debate': 'Where there is debate',
  'E hoje?': 'And today?', 'Teste rápido': 'Quick quiz', 'Ligações com outros temas': 'Links to other topics',
  'Para ir além: as fontes': 'Going further: the sources', 'Para pensar': 'Something to think about',
  'Os temas vão se acumulando aqui, um por dia.': 'Topics pile up here, one a day.',
  // Meu Onda
  'O que você acompanha': 'What you follow', 'Dia a dia': 'Day by day', 'Acompanhar': 'Follow', 'Acompanhando': 'Following', 'Guardar': 'Save', 'Guardada': 'Saved',
  'Minha análise': 'My analysis', 'Meu palpite': 'My guess', 'Peça a análise a uma IA': 'Ask an AI for the analysis',
  'Copiar prompt': 'Copy prompt', 'Deixar de acompanhar': 'Unfollow', 'Conectar o Dropbox': 'Connect Dropbox',
  'Conecte o seu Dropbox': 'Connect your Dropbox', 'Dropbox conectado': 'Dropbox connected', 'Sincronizar': 'Sync',
  'Desconectar este aparelho': 'Disconnect this device', 'Você acompanhou': 'You followed',
  'edição do Onda': 'Onda edition', 'você acompanhou': 'you followed', 'Sem edição do Onda neste dia.': 'No Onda edition on this day.',
  'Histórico': 'History',
  // Configurações
  'Aparência': 'Appearance', 'Automático': 'Automatic', 'Noite': 'Night', 'Dia': 'Day', 'Idioma': 'Language',
  'Acessibilidade': 'Accessibility', 'Tamanho da letra': 'Text size', 'Mais contraste': 'Higher contrast',
  'Menos movimento': 'Reduce motion', 'Sobre o Onda': 'About Onda',
  // Indicadores
  'Indicadores': 'Indicators', 'Dólar': 'US dollar', 'Euro': 'Euro', 'Petróleo Brent': 'Brent oil',
  'Selic (juros do Brasil)': 'Selic (Brazil interest rate)', 'Inflação (IPCA, 12 meses)': 'Inflation (IPCA, 12 months)',
  'Petróleo WTI (EUA)': 'WTI oil (US)', 'Juros dos EUA (10 anos)': 'US interest rate (10 years)', 'Yuan da China (por dólar)': 'Chinese yuan (per dollar)',
  'Gasolina (São Paulo)': 'Gasoline (São Paulo)', 'Gasolina (Brasil)': 'Gasoline (Brazil)', 'Commodities (índice)': 'Commodities (index)', 'Economia mundial (crescimento)': 'World economy (growth)', 'Inflação no mundo': 'World inflation',
  // Camadas da cadeia de efeitos
  'Economia': 'Economy', 'Preços': 'Prices', 'Energia': 'Energy', 'Política': 'Politics', 'Segurança': 'Security',
  'Tecnologia': 'Technology', 'Mídia': 'Media', 'Sociedade': 'Society', 'Brasil': 'Brazil', 'Você': 'You',
};

// Nomes das regiões e dos assuntos (vêm dos dados em português)
export const REGIOES_EN = {
  'brasil': 'Brazil', 'america-latina': 'Latin America', 'america-norte': 'North America', 'europa': 'Europe and Russia',
  'oriente-medio': 'Middle East', 'africa': 'Africa', 'asia-pacifico': 'Asia-Pacific', 'global': 'Global bodies', 'mundo': 'World',
};
export const TEMAS_EN = {
  'conflitos': 'Conflict and security', 'diplomacia': 'Diplomacy', 'economia': 'Economy and trade', 'energia': 'Energy',
  'politica': 'Politics and elections', 'tecnologia': 'Technology', 'clima': 'Climate and environment',
  'direitos': 'Human rights, justice and migration', 'midia': 'Media and information', 'saude': 'Health', 'outros': 'Other',
};

export const emIngles = () => ler().idioma === 'en';

/** Traduz um texto da interface, se o idioma for inglês. */
export function t(texto) {
  return emIngles() ? (EN[texto] ?? texto) : texto;
}
