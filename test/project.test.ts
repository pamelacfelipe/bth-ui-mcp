import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectFramework } from '../src/project/detect-framework.js';
import { describeBlockedState, getProjectState, getProjectStateFrom } from '../src/project/state.js';
import { createProject } from './helpers.js';

describe('detectFramework', () => {
  it('reconhece Angular por @angular/core', () => {
    const root = createProject({ dependencies: { '@angular/core': '^18.2.0' } });
    expect(detectFramework(root)).toEqual({ framework: 'angular', version: '^18.2.0' });
  });

  it('reconhece AngularJS por angular', () => {
    const root = createProject({ dependencies: { angular: '1.4.14' } });
    expect(detectFramework(root)).toEqual({ framework: 'angularjs', version: '1.4.14' });
  });

  it('devolve null quando não há framework conhecido nem package.json', () => {
    expect(detectFramework(createProject({ dependencies: { react: '^19.0.0' } }))).toBeNull();
    expect(detectFramework(createProject({ dependencies: null }))).toBeNull();
  });
});

describe('getProjectState', () => {
  it('pronto: bth-ui com docs/docs.json', () => {
    const root = createProject({ dependencies: { '@angular/core': '^18.2.0' }, bthUi: '0.0.2', docs: '0.0.2' });
    const state = getProjectState(root);

    expect(state).toMatchObject({
      status: 'ready',
      projectRoot: root,
      framework: { framework: 'angular' },
      bthUi: { dir: join(root, 'node_modules', 'bth-ui'), version: '0.0.2' },
    });
  });

  it('sem documentação: bth-ui anterior à 0.0.2', () => {
    const state = getProjectState(createProject({ bthUi: '0.0.1' }));

    expect(state.status).toBe('no-docs');
    if (state.status !== 'no-docs') return;
    expect(describeBlockedState(state)).toContain('0.0.1');
    expect(describeBlockedState(state)).toContain('atualizar');
  });

  it('não instalado: projeto sem bth-ui', () => {
    const state = getProjectState(createProject({ dependencies: { angular: '1.4.14' } }));

    expect(state).toMatchObject({ status: 'not-installed', framework: { framework: 'angularjs' } });
    if (state.status !== 'not-installed') return;
    expect(describeBlockedState(state)).toContain('pergunte ao usuário se pode instalar');
  });

  it('projeto não identificado: sem package.json', () => {
    const state = getProjectState(createProject({ dependencies: null }));
    expect(state).toMatchObject({ status: 'unknown-project', projectRoot: null, framework: null });
  });

  it('encontra o bth-ui elevado para a raiz de um workspace', () => {
    const root = createProject({ bthUi: '0.0.2', docs: '0.0.2' });
    const app = join(root, 'apps', 'web', 'src');
    mkdirSync(app, { recursive: true });

    expect(getProjectState(app)).toMatchObject({
      status: 'ready',
      bthUi: { dir: join(root, 'node_modules', 'bth-ui') },
    });
  });

  it('entre várias roots, prefere a que tem o bth-ui', () => {
    const without = createProject();
    const withLib = createProject({ bthUi: '0.0.2', docs: '0.0.2' });

    expect(getProjectStateFrom([without, withLib])).toMatchObject({ status: 'ready', projectRoot: withLib });
    expect(getProjectStateFrom([without])).toMatchObject({ status: 'not-installed', projectRoot: without });
  });
});
