import { readFileSync, rmSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { firstSentence } from '../src/knowledge/normalize.js';
import { KnowledgeError, readKnowledge } from '../src/knowledge/reader.js';
import { createProject, fixturesDir, writeJson } from './helpers.js';

function install(version = '0.0.2') {
  const root = createProject({ bthUi: version, docs: '0.0.2' });
  const dir = join(root, 'node_modules', 'bth-ui');
  return { dir, version };
}

/** Reescreve um arquivo do pacote com mtime novo, como aconteceria ao trocar a versão instalada. */
function rewrite(path: string, value: unknown) {
  writeJson(path, value);
  const future = new Date(Date.now() + 5000);
  utimesSync(path, future, future);
}

describe('firstSentence', () => {
  it('corta na primeira frase, sem quebrar em nomes de arquivo', () => {
    expect(firstSentence('Lê o docs.json do pacote. Depois valida.')).toBe('Lê o docs.json do pacote.');
    expect(firstSentence('Título de um `bth-alert`.')).toBe('Título de um `bth-alert`.');
    expect(firstSentence('Sem ponto final')).toBe('Sem ponto final');
  });
});

describe('readKnowledge', () => {
  it('normaliza os componentes do bth-ui 0.0.2', () => {
    const knowledge = readKnowledge(install());

    expect(knowledge.stencilVersion).toBe('4.45.2');
    expect(knowledge.components.map(component => component.tag)).toEqual([
      'bth-alert',
      'bth-alert-description',
      'bth-alert-title',
      'bth-badge',
      'bth-button',
      'bth-icon',
    ]);

    const alert = knowledge.components.find(component => component.tag === 'bth-alert')!;
    expect(alert).toMatchObject({
      summary: 'Alerta para destacar uma mensagem importante dentro do conteúdo da página.',
      category: 'feedback',
      status: 'beta',
      related: ['bth-alert-title', 'bth-alert-description', 'bth-icon'],
    });
    expect(alert.usageWhen).toHaveLength(2);
    expect(alert.usageAvoid).toHaveLength(2);
    expect(alert.examples[0]).toContain('<bth-alert variant="info" dismissible>');
    expect(alert.events).toEqual([expect.objectContaining({ name: 'bthDismiss', detail: 'void' })]);
    expect(alert.slots.map(slot => slot.name)).toEqual(['', 'icon']);
    expect(alert.parts.map(part => part.name)).toEqual(['alert', 'dismiss']);
  });

  it('expõe os valores permitidos e o padrão das props', () => {
    const button = readKnowledge(install()).components.find(component => component.tag === 'bth-button')!;
    const color = button.props.find(prop => prop.name === 'color')!;

    expect(color.values).toContain('danger');
    expect(color.default).toBe("'default'");
    expect(button.props.find(prop => prop.name === 'variant')!.values).not.toContain('primary');
    expect(button.props.find(prop => prop.name === 'disabled')!.values).toEqual([]);
  });

  it('lê os tokens, com a custom property quando existe', () => {
    const { tokens } = readKnowledge(install());

    expect(tokens).toContainEqual({ name: '$primary-color', value: '#0861ff', file: 'src/tokens/_colors.scss' });
    expect(tokens).toContainEqual({
      name: '$radius-xs',
      value: 'var(--bth-radius-xs, 6px)',
      cssVariable: '--bth-radius-xs',
      file: 'src/tokens/_radius.scss',
    });
  });

  it('devolve tokens nulos quando o pacote não tem tokens.json', () => {
    const bthUi = install();
    rmSync(join(bthUi.dir, 'docs', 'tokens.json'));

    expect(readKnowledge(bthUi).tokens).toBeNull();
  });

  it('relê o docs.json quando o arquivo muda', () => {
    const bthUi = install();
    const docsPath = join(bthUi.dir, 'docs', 'docs.json');
    expect(readKnowledge(bthUi).components).toHaveLength(6);

    const docs = JSON.parse(readFileSync(join(fixturesDir, 'bth-ui-0.0.2', 'docs.json'), 'utf8'));
    docs.components = docs.components.filter((component: { tag: string }) => component.tag !== 'bth-icon');
    rewrite(docsPath, docs);

    expect(readKnowledge(bthUi).components).toHaveLength(5);
  });

  it('ignora campos desconhecidos e aceita componente sem @usage-when e @example', () => {
    const bthUi = install();
    rewrite(join(bthUi.dir, 'docs', 'docs.json'), {
      futureField: true,
      components: [{ tag: 'bth-novo', docs: 'Novo.', docsTags: [], props: [], events: [], slots: [], extra: 1 }],
    });

    const knowledge = readKnowledge(bthUi);
    expect(knowledge.stencilVersion).toBeNull();
    expect(knowledge.components[0]).toMatchObject({ tag: 'bth-novo', usageWhen: [], examples: [], parts: [] });
    expect(knowledge.components[0]).not.toHaveProperty('category');
  });

  it('formato inesperado gera erro citando as versões do bth-ui e do Stencil', () => {
    const bthUi = install('9.0.0');
    rewrite(join(bthUi.dir, 'docs', 'docs.json'), {
      compiler: { name: '@stencil/core', version: '5.0.0' },
      components: [{ tag: 'bth-alert' }],
    });

    expect(() => readKnowledge(bthUi)).toThrow(KnowledgeError);
    expect(() => readKnowledge(bthUi)).toThrow(/bth-ui@9\.0\.0 \(Stencil 5\.0\.0\).*components\.0\.docs/s);
  });
});
