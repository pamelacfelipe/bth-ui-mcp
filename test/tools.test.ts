import { cpSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { ListRootsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it } from 'vitest';
import { createServer } from '../src/server.js';
import { createProject } from './helpers.js';

/** Conecta um cliente MCP ao servidor, com o projeto informado como root do workspace. */
async function connectClient(projectRoot: string) {
  const client = new Client({ name: 'test', version: '0' }, { capabilities: { roots: {} } });
  client.setRequestHandler(ListRootsRequestSchema, () => ({ roots: [{ uri: pathToFileURL(projectRoot).href }] }));

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createServer().mcp.connect(serverTransport);
  await client.connect(clientTransport);

  return client;
}

async function connect(projectRoot: string) {
  const client = await connectClient(projectRoot);

  return async (name: string, args: Record<string, unknown> = {}) => {
    const result = await client.callTool({ name, arguments: args });
    const content = result.content as { type: string; text: string }[];
    return { text: content.map(item => item.text).join('\n'), isError: result.isError === true };
  };
}

const readyProject = (dependencies: Record<string, string> = { '@angular/core': '^18.2.0' }) =>
  createProject({ dependencies, bthUi: '0.0.2', docs: '0.0.2' });

const ready = (dependencies?: Record<string, string>) => connect(readyProject(dependencies));

describe('list_components', () => {
  it('lista os componentes instalados e fecha com o freio contra invenção', async () => {
    const { text, isError } = await (await ready())('list_components');

    expect(isError).toBe(false);
    expect(text).toContain('bth-ui@0.0.2');
    expect(text).toContain('Stencil 4.45.2');
    for (const tag of ['bth-alert', 'bth-alert-title', 'bth-alert-description', 'bth-badge', 'bth-button', 'bth-icon']) {
      expect(text).toContain(`\`${tag}\``);
    }
    expect(text).toContain('Total: 6 componente(s).');
    expect(text.trimEnd()).toMatch(/Componentes que não aparecem aqui não existem na versão instalada do bth-ui\.$/);
  });

  it('filtra por categoria, sem depender de acento', async () => {
    const { text } = await (await ready())('list_components', { category: 'formulario' });

    expect(text).toContain('`bth-button`');
    expect(text).not.toContain('`bth-badge`');
    expect(text).toContain('Total: 1 componente(s) de 6');
  });

  it('filtro sem resultado devolve erro com os valores existentes', async () => {
    const { text, isError } = await (await ready())('list_components', { status: 'stable' });

    expect(isError).toBe(true);
    expect(text).toContain('`beta`');
  });
});

describe('search_components', () => {
  const top = (text: string) => /^1\. `([\w-]+)`/m.exec(text)?.[1];

  it.each([
    ["Qual componente uso para mostrar o status 'Ativo' de um item?", 'bth-badge'],
    ['Preciso avisar que salvou com sucesso.', 'bth-alert'],
    ['Adicione um botão destrutivo.', 'bth-button'],
    ['etiqueta', 'bth-badge'],
    ['icone', 'bth-icon'],
  ])('"%s" encontra %s', async (query, expected) => {
    const { text } = await (await ready())('search_components', { query });

    expect(top(text)).toBe(expected);
    expect(text).toContain('Motivo:');
  });

  it('respeita o limite', async () => {
    const { text } = await (await ready())('search_components', { query: 'alerta', limit: 1 });
    expect(text).not.toMatch(/^2\. /m);
  });

  it('sem resultado, diz que o componente não existe e lista as tags', async () => {
    const { text, isError } = await (await ready())('search_components', { query: 'carrossel de imagens' });

    expect(isError).toBe(false);
    expect(text).toContain('Nenhum componente do bth-ui instalado atende');
    expect(text).toContain('Todos os componentes instalados: `bth-alert`');
  });

  it('nunca devolve uma tag que não existe para "dialog"', async () => {
    const { text } = await (await ready())('search_components', { query: 'dialog' });

    expect(text).not.toContain('bth-dialog');
    // O único resultado é o botão, e a frase mostra que ele abre um diálogo, não que é um
    expect(text).toContain('Quando usar: Para disparar uma ação na página atual, como salvar, confirmar ou abrir um diálogo.');
    expect(text).toContain('o componente não existe no bth-ui instalado');
  });
});

describe('get_component', () => {
  it('devolve a ficha completa do bth-alert', async () => {
    const { text, isError } = await (await ready())('get_component', { tag: 'bth-alert' });

    expect(isError).toBe(false);
    expect(text).toContain('# bth-alert');
    expect(text).toContain('bth-ui@0.0.2');
    for (const section of ['Quando usar', 'Quando evitar', 'Props', 'Eventos', 'Slots', 'CSS parts', 'Exemplos']) {
      expect(text).toContain(`## ${section}`);
    }
    expect(text).toContain('`bthDismiss`');
    expect(text).toContain('`success`');
    expect(text).toContain('<bth-alert variant="info" dismissible>');
  });

  it('aceita o nome sem prefixo e mostra os valores permitidos das props', async () => {
    const { text } = await (await ready())('get_component', { tag: 'button' });
    const row = (prop: string) => text.split('\n').find(line => line.startsWith(`| \`${prop}\``)) ?? '';

    expect(text).toContain('# bth-button');
    expect(row('color')).toContain('`danger`');
    expect(row('variant')).not.toContain('primary');
  });

  it('mostra só as dicas do framework detectado', async () => {
    const angular = await (await ready())('get_component', { tag: 'bth-alert' });
    expect(angular.text).toContain('(bthDismiss)=');
    expect(angular.text).not.toContain('ng-on-');

    const angularjs = await (await ready({ angular: '1.4.14' }))('get_component', { tag: 'bth-alert' });
    expect(angularjs.text).toContain('ng-on-bth_dismiss');
    expect(angularjs.text).toContain("addEventListener('bthDismiss'");
    expect(angularjs.text).not.toContain('CUSTOM_ELEMENTS_SCHEMA');
  });

  it('tag inexistente e sem parecidos: erro dizendo que não existe', async () => {
    const { text, isError } = await (await ready())('get_component', { tag: 'bth-dialog' });

    expect(isError).toBe(true);
    expect(text).toContain('"bth-dialog" não existe no bth-ui@0.0.2');
    expect(text).not.toContain('Você quis dizer');
    expect(text).toContain('list_components');
  });

  it.each([
    ['bth-buton', 'bth-button'],
    ['botao', 'bth-button'],
    ['bth-etiqueta', 'bth-badge'],
  ])('"%s" sugere %s', async (tag, expected) => {
    const { text, isError } = await (await ready())('get_component', { tag });

    expect(isError).toBe(true);
    expect(text).toContain(`Você quis dizer \`${expected}\``);
  });
});

describe('estado do projeto', () => {
  const tools: [string, Record<string, unknown>][] = [
    ['list_components', {}],
    ['search_components', { query: 'status' }],
    ['get_component', { tag: 'bth-badge' }],
  ];

  it.each(tools)('%s sem o bth-ui instalado pede para perguntar ao usuário', async (name, args) => {
    const { text } = await (await connect(createProject()))(name, args);

    expect(text).toContain('bth-ui não instalado');
    expect(text).toContain('pergunte ao usuário se pode instalar');
    expect(text).not.toContain('bth-badge`');
  });

  it.each(tools)('%s com o bth-ui 0.0.1 pede a atualização', async (name, args) => {
    const { text } = await (await connect(createProject({ bthUi: '0.0.1' })))(name, args);

    expect(text).toContain('`0.0.1`');
    expect(text).toContain('npm install bth-ui@latest');
  });

  it('a resposta acompanha a instalação da lib, sem reiniciar o servidor', async () => {
    const root = createProject();
    const call = await connect(root);
    expect((await call('list_components')).text).toContain('bth-ui não instalado');

    cpSync(join(createProject({ bthUi: '0.0.2', docs: '0.0.2' }), 'node_modules'), join(root, 'node_modules'), {
      recursive: true,
    });

    expect((await call('list_components')).text).toContain('Total: 6 componente(s).');
  });
});

describe('get_installation_guide', () => {
  it('detecta o framework e, sem a lib, termina pedindo para perguntar ao usuário', async () => {
    const call = await connect(createProject({ dependencies: { '@angular/core': '^18.2.0' } }));
    const { text, isError } = await call('get_installation_guide');

    expect(isError).toBe(false);
    expect(text).toContain('o bth-ui não está instalado');
    expect(text).toContain('Framework detectado pelo `package.json`: Angular');
    expect(text).toContain('# Instalação do bth-ui em Angular');
    expect(text).toContain('npm install bth-ui');
    expect(text).toContain("import { defineCustomElements } from 'bth-ui/loader';");
    expect(text).toContain('CUSTOM_ELEMENTS_SCHEMA');
    expect(text).toContain('Material+Symbols+Outlined');
    expect(text.split('\n').at(-1)).toContain('pergunte se pode instalar e configurar agora');
  });

  it('com a lib instalada, informa a versão e não pede para instalar', async () => {
    const { text } = await (await ready({ angular: '1.4.14' }))('get_installation_guide');

    expect(text).toContain('o bth-ui@0.0.2 já está instalado');
    expect(text).toContain('# Instalação do bth-ui em AngularJS');
    expect(text).toContain('bth-ui.esm.js');
    expect(text).not.toContain('Antes de alterar qualquer coisa');
  });

  it('o framework pedido vale mais que o detectado', async () => {
    const { text } = await (await ready())('get_installation_guide', { framework: 'angularjs' });
    expect(text).toContain('# Instalação do bth-ui em AngularJS');
  });

  it('sem framework detectável, pede que o usuário informe', async () => {
    const { text, isError } = await (await connect(createProject({ dependencies: null })))('get_installation_guide');

    expect(isError).toBe(false);
    expect(text).toContain('projeto não identificado');
    expect(text).toContain('Pergunte ao usuário se o projeto é Angular ou AngularJS');
  });

  it('framework inválido devolve os valores aceitos', async () => {
    const { text, isError } = await (await ready())('get_installation_guide', { framework: 'react' });

    expect(isError).toBe(true);
    expect(text).toContain('`angular` ou `angularjs`');
  });
});

describe('get_setup_guide', () => {
  it('devolve o guia completo do framework detectado', async () => {
    const { text } = await (await ready())('get_setup_guide');

    for (const section of ['Registro dos componentes', 'Estilos', 'Fontes', 'Tokens', 'Props e eventos', 'Formulários']) {
      expect(text).toContain(`## ${section}`);
    }
    expect(text).toContain('(bthDismiss)="aoFechar($event)"');
  });

  it.each(['angular', 'angularjs'])('todos os tópicos existem no guia de %s', async framework => {
    const call = await ready();

    for (const topic of ['registro', 'estilos', 'fonte', 'tokens', 'eventos', 'formularios']) {
      const { text, isError } = await call('get_setup_guide', { framework, topic });
      expect(isError, topic).toBe(false);
      expect(text.match(/^## /gm), topic).toHaveLength(1);
    }
  });

  it('o tópico de eventos do AngularJS cobre versões com e sem ng-on', async () => {
    const { text } = await (await ready({ angular: '1.4.14' }))('get_setup_guide', { topic: 'eventos' });

    expect(text).toContain('ng-on-bth_dismiss');
    expect(text).toContain("addEventListener('bthDismiss'");
    expect(text).not.toContain('## Tokens');
  });

  it('tópico inválido devolve os tópicos aceitos', async () => {
    const { text, isError } = await (await ready())('get_setup_guide', { topic: 'temas' });

    expect(isError).toBe(true);
    expect(text).toContain('`registro`, `estilos`, `fonte`, `tokens`, `eventos`');
  });
});

describe('resources', () => {
  const read = async (client: Client, uri: string) => {
    const { contents } = await client.readResource({ uri });
    return contents[0] as { uri: string; mimeType: string; text: string };
  };

  it('lista os guias e os componentes instalados', async () => {
    const client = await connectClient(readyProject());
    const uris = (await client.listResources()).resources.map(resource => resource.uri);

    expect(uris).toEqual(
      expect.arrayContaining([
        'docs://install/angular',
        'docs://install/angularjs',
        'docs://setup/angular',
        'docs://setup/angularjs',
        'docs://components/bth-alert',
        'docs://components/bth-icon',
        'docs://tokens',
      ]),
    );

    const templates = (await client.listResourceTemplates()).resourceTemplates.map(template => template.uriTemplate);
    expect(templates).toEqual(expect.arrayContaining(['docs://setup/{framework}', 'docs://components/{tag}']));
  });

  it('os guias funcionam sem o bth-ui instalado', async () => {
    const client = await connectClient(createProject());

    expect(await read(client, 'docs://install/angular')).toMatchObject({
      mimeType: 'text/markdown',
      text: expect.stringContaining('# Instalação do bth-ui em Angular'),
    });
    expect((await read(client, 'docs://setup/angularjs')).text).toContain('# Configuração do bth-ui em AngularJS');
    expect((await client.listResources()).resources.map(resource => resource.uri)).not.toContain(
      'docs://components/bth-alert',
    );
  });

  it('docs://components/{tag} devolve a mesma ficha de get_component', async () => {
    const root = readyProject();
    const client = await connectClient(root);
    const fromTool = await (await connect(root))('get_component', { tag: 'bth-badge' });

    expect((await read(client, 'docs://components/bth-badge')).text).toBe(fromTool.text);
    expect((await read(client, 'docs://components/bth-dialog')).text).toContain('"bth-dialog" não existe');
  });

  it('docs://tokens devolve os tokens do bth-ui instalado em JSON', async () => {
    const resource = await read(await connectClient(readyProject()), 'docs://tokens');
    const body = JSON.parse(resource.text);

    expect(resource.mimeType).toBe('application/json');
    expect(body.bthUi).toBe('bth-ui@0.0.2');
    expect(body.tokens).toHaveLength(59);
    expect(body.tokens).toContainEqual(expect.objectContaining({ name: '$radius-md', cssVariable: '--bth-radius-md' }));
  });

  it('docs://tokens e docs://components informam o estado quando a lib não está pronta', async () => {
    const client = await connectClient(createProject({ bthUi: '0.0.1' }));

    expect(JSON.parse((await read(client, 'docs://tokens')).text)).toMatchObject({ status: 'no-docs' });
    expect((await read(client, 'docs://components/bth-alert')).text).toContain('npm install bth-ui@latest');
  });

  it('completa os valores dos templates', async () => {
    const client = await connectClient(readyProject());
    const complete = async (uri: string, name: string, value: string) =>
      (await client.complete({ ref: { type: 'ref/resource', uri }, argument: { name, value } })).completion.values;

    expect(await complete('docs://setup/{framework}', 'framework', 'angularj')).toEqual(['angularjs']);
    expect(await complete('docs://components/{tag}', 'tag', 'bth-a')).toEqual([
      'bth-alert',
      'bth-alert-description',
      'bth-alert-title',
    ]);
    expect(await complete('docs://components/{tag}', 'tag', 'bu')).toEqual(['bth-button']);
  });
});

describe('prompts', () => {
  const text = async (name: string, args: Record<string, string> = {}) => {
    const client = await connectClient(createProject());
    const { messages } = await client.getPrompt({ name, arguments: args });
    return (messages[0]?.content as { text: string }).text;
  };

  it('expõe os três prompts', async () => {
    const client = await connectClient(createProject());
    expect((await client.listPrompts()).prompts.map(prompt => prompt.name).sort()).toEqual([
      'instalar-lib',
      'migrar-para-lib',
      'revisar-uso',
    ]);
  });

  it('instalar-lib pede para perguntar antes de alterar', async () => {
    const prompt = await text('instalar-lib', { framework: 'angular' });

    expect(prompt).toContain('get_installation_guide` com `framework: "angular"`');
    expect(prompt).toContain('**pergunte-me**');
    expect(prompt).toContain('bth-button');
  });

  it('migrar-para-lib pede o plano antes de editar e proíbe inventar', async () => {
    const prompt = await text('migrar-para-lib', { alvo: 'src/app/usuarios', origem: 'Bootstrap 3' });

    expect(prompt).toContain('`src/app/usuarios`');
    expect(prompt).toContain('a partir de Bootstrap 3');
    expect(prompt).toContain('Apresente o plano antes de editar');
    expect(prompt).toContain('Não invente componentes');
  });

  it('revisar-uso pede relatório com arquivo e linha, sem editar', async () => {
    const prompt = await text('revisar-uso', { alvo: 'src/app/home.component.html' });

    expect(prompt).toContain('`src/app/home.component.html`');
    expect(prompt).toContain('arquivo e linha');
    expect(prompt).toContain('Não edite nenhum arquivo');
  });
});
