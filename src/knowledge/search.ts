// MiniSearch e sinônimos
import MiniSearch from 'minisearch';
import aliasesJson from '../../content/aliases.json' with { type: 'json' };
import type { Component } from '../schema.js';

const aliases: Record<string, string[]> = aliasesJson;

/** Minúsculas e sem acentos, para comparar o que o usuário digitou com o conteúdo da lib. */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

// Palavras que aparecem em quase toda pergunta e em quase todo componente, e por isso não ajudam a ranquear
const stopwords = new Set(
  (
    'a o as os um uma uns umas de do da dos das em no na nos nas para pra por com sem que qual quais como e ou se ao aos ' +
    'eu meu minha preciso quero queria gostaria devo posso uso usar utilizar mostrar exibir colocar adicionar adicione ' +
    'componente componentes item itens pagina tela bth the an to for of in on and is with'
  ).split(' '),
);

const fields = ['tag', 'aliases', 'summary', 'usageWhen', 'category'] as const;
type Field = (typeof fields)[number];

const fieldLabels: Record<Field, string> = {
  tag: 'nome',
  aliases: 'sinônimo',
  summary: 'resumo',
  usageWhen: 'quando usar',
  category: 'categoria',
};

interface IndexedComponent extends Record<Field, string> {
  id: string;
}

export interface SearchHit {
  component: Component;
  /** Por que o componente apareceu, como `sinônimo ("etiqueta")`. */
  reasons: string[];
  /** Frases de "quando usar" em que a busca bateu, para dar o contexto do resultado. */
  usageWhen: string[];
}

// O reader devolve a mesma lista enquanto o docs.json não muda, então ela serve de chave do cache
const indexes = new WeakMap<Component[], MiniSearch<IndexedComponent>>();

function getIndex(components: Component[]): MiniSearch<IndexedComponent> {
  let index = indexes.get(components);

  if (!index) {
    index = new MiniSearch<IndexedComponent>({
      fields: [...fields],
      processTerm: term => {
        const folded = fold(term);
        return folded && !stopwords.has(folded) ? folded : null;
      },
    });
    index.addAll(
      components.map(component => ({
        id: component.tag,
        tag: component.tag,
        aliases: (aliases[component.tag] ?? []).join(' '),
        summary: component.summary,
        usageWhen: component.usageWhen.join(' '),
        category: component.category ?? '',
      })),
    );
    indexes.set(components, index);
  }

  return index;
}

/**
 * Busca lexical sobre nome, sinônimos, resumo, "quando usar" e categoria.
 * `loose` aceita mais erros de digitação e serve para mostrar os mais próximos
 * quando a busca normal não encontra nada.
 */
export function searchComponents(components: Component[], query: string, limit: number, loose = false): SearchHit[] {
  const byTag = new Map(components.map(component => [component.tag, component]));

  const results = getIndex(components).search(query, {
    boost: { tag: 3, aliases: 3, summary: 2 },
    prefix: term => term.length > 2,
    fuzzy: term => (term.length > 3 ? (loose ? 0.4 : 0.2) : false),
  });

  return results.slice(0, limit).flatMap(result => {
    const component = byTag.get(result.id);
    if (!component) return [];

    const termsByField = new Map<Field, string[]>();
    for (const [term, matchedFields] of Object.entries(result.match)) {
      for (const field of matchedFields as Field[]) {
        termsByField.set(field, [...(termsByField.get(field) ?? []), term]);
      }
    }

    const reasons = fields.flatMap(field => {
      const terms = termsByField.get(field);
      return terms ? [`${fieldLabels[field]} (${terms.map(term => `"${term}"`).join(', ')})`] : [];
    });

    const usageTerms = termsByField.get('usageWhen') ?? [];
    const usageWhen = component.usageWhen.filter(sentence => usageTerms.some(term => fold(sentence).includes(term)));

    return [{ component, reasons, usageWhen }];
  });
}

/** Encontra um componente pela tag, com ou sem o prefixo `bth-` e com ou sem `<>`. */
export function resolveTag(components: Component[], input: string): Component | null {
  const name = fold(input).replace(/^<|\/?>$/g, '');
  return components.find(component => component.tag === name || component.tag === `bth-${name}`) ?? null;
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, substitution);
    }
    previous = current;
  }

  return previous[b.length] ?? 0;
}

/**
 * Tags mais próximas de um nome que não existe, por sinônimo ou por distância
 * de edição. Devolve uma lista vazia quando nada chega perto: é melhor dizer
 * que o componente não existe do que sugerir um qualquer.
 */
export function suggestTags(components: Component[], input: string): string[] {
  const name = fold(input)
    .replace(/^<|\/?>$/g, '')
    .replace(/^bth-/, '');
  const maxDistance = Math.max(1, Math.floor(name.length * 0.34));

  return components
    .map(component => {
      const candidates = [component.tag.replace(/^bth-/, ''), ...(aliases[component.tag] ?? [])].map(fold);
      return { tag: component.tag, distance: Math.min(...candidates.map(candidate => editDistance(name, candidate))) };
    })
    .filter(candidate => candidate.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map(candidate => candidate.tag);
}
