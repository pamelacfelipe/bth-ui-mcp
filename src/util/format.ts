// Markdown das respostas e resultados das tools
import type { CallToolResult, GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import type { Knowledge } from '../knowledge/reader.js';
import type { Component, Framework } from '../schema.js';

export function textResult(text: string): CallToolResult {
  return { content: [{ type: 'text', text }] };
}

/** Erro devolvido ao agente. A mensagem deve sempre dizer qual é o próximo passo. */
export function errorResult(text: string): CallToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}

/** Um prompt é uma única mensagem do usuário com o fluxo que o agente deve seguir. */
export function userPrompt(description: string, lines: string[]): GetPromptResult {
  return { description, messages: [{ role: 'user', content: { type: 'text', text: lines.join('\n') } }] };
}

/** Cabeçalho com a versão e o caminho do bth-ui lido, presente em toda resposta sobre componentes. */
export function versionHeader(knowledge: Knowledge): string {
  const stencil = knowledge.stencilVersion ? ` · Stencil ${knowledge.stencilVersion}` : '';
  return `> bth-ui@${knowledge.bthUi.version} · \`${knowledge.bthUi.dir}\`${stencil}`;
}

const cell = (value: string) => value.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ') || '—';

export function table(headers: string[], rows: string[][]): string {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(row => `| ${row.map(cell).join(' | ')} |`),
  ].join('\n');
}

export const code = (value: string) => `\`${value}\``;

export const tagList = (components: Component[]) => components.map(component => code(component.tag)).join(', ');

const bullets = (items: string[]) => items.map(item => `- ${item}`).join('\n');

/** `bthDismiss` -> `bth_dismiss`: o AngularJS marca letras maiúsculas com `_` em `ng-on-*` e `ng-prop-*`. */
const angularJsName = (name: string) => name.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

function frameworkTips(component: Component, framework: Framework): string {
  const prop = component.props.find(candidate => candidate.values.length > 0) ?? component.props[0];
  const event = component.events[0];
  const lines: string[] = [];

  if (framework === 'angular') {
    lines.push(
      `- O componente que usa ${code(`<${component.tag}>`)} precisa de ${code('schemas: [CUSTOM_ELEMENTS_SCHEMA]')}.`,
    );
    if (prop) {
      lines.push(
        `- Props: valor fixo como atributo (${code(`${prop.attr ?? prop.name}="..."`)}) ou dinâmico com ${code(`[${prop.name}]="valor"`)}.`,
      );
    }
    if (event) {
      lines.push(`- Eventos: ${code(`(${event.name})="aoOcorrer($event)"`)}.`);
    }
  } else {
    if (prop) {
      lines.push(
        `- Props: valor fixo como atributo (${code(`${prop.attr ?? prop.name}="..."`)}) ou dinâmico com ${code(`${prop.attr ?? prop.name}="{{ vm.valor }}"`)}. ` +
          `Para props booleanas, use ${code('ng-attr-<atributo>="{{ condicao || undefined }}"')}, porque a simples presença do atributo já vale como verdadeiro.`,
      );
    }
    if (event) {
      lines.push(
        `- Eventos: no AngularJS 1.7.3 ou superior, ${code(`ng-on-${angularJsName(event.name)}="vm.aoOcorrer($event)"`)}. ` +
          `Em versões anteriores não existe ${code('ng-on-*')}: registre o evento com ${code(`element[0].addEventListener('${event.name}', ...)`)} ` +
          `em uma diretiva e chame ${code('scope.$apply()')} dentro do listener.`,
      );
    }
  }

  return lines.join('\n');
}

/** Ficha completa de um componente, usada pela tool `get_component` e pelo resource `docs://components/{tag}`. */
export function componentMarkdown(component: Component, knowledge: Knowledge, framework: Framework | null): string {
  const sections: string[] = [`# ${component.tag}`, versionHeader(knowledge), component.description];

  const meta = [
    component.category && `- **Categoria:** ${component.category}`,
    component.status && `- **Status:** ${component.status}`,
    component.related.length > 0 && `- **Relacionados:** ${component.related.map(code).join(', ')}`,
  ].filter(Boolean);
  if (meta.length > 0) sections.push(meta.join('\n'));

  if (component.usageWhen.length > 0) sections.push(`## Quando usar\n\n${bullets(component.usageWhen)}`);
  if (component.usageAvoid.length > 0) sections.push(`## Quando evitar\n\n${bullets(component.usageAvoid)}`);

  sections.push(
    component.props.length > 0
      ? `## Props\n\n${table(
          ['Prop', 'Atributo', 'Tipo', 'Valores permitidos', 'Padrão', 'Descrição'],
          component.props.map(prop => [
            code(prop.name) + (prop.required ? ' (obrigatória)' : ''),
            prop.attr ? code(prop.attr) : '',
            code(prop.type),
            prop.values.map(code).join(', '),
            prop.default === undefined ? '' : code(prop.default),
            prop.description,
          ]),
        )}\n\nUse apenas os valores listados; qualquer outro é inválido.`
      : `## Props\n\nEste componente não tem props.`,
  );

  sections.push(
    component.events.length > 0
      ? `## Eventos\n\n${table(
          ['Evento', 'Detalhe', 'Descrição'],
          component.events.map(event => [code(event.name), code(event.detail), event.description]),
        )}`
      : `## Eventos\n\nEste componente não emite eventos próprios. Eventos nativos, como ${code('click')}, funcionam normalmente.`,
  );

  if (component.slots.length > 0) {
    sections.push(
      `## Slots\n\n${table(
        ['Slot', 'Descrição'],
        component.slots.map(slot => [slot.name ? code(slot.name) : '(padrão)', slot.description]),
      )}`,
    );
  }

  if (component.parts.length > 0) {
    sections.push(
      `## CSS parts\n\n${table(
        ['Part', 'Descrição'],
        component.parts.map(part => [code(part.name), part.description]),
      )}`,
    );
  }

  if (component.examples.length > 0) sections.push(`## Exemplos\n\n${component.examples.join('\n\n')}`);

  const tips = (framework ? [framework] : (['angular', 'angularjs'] as const))
    .map(name => ({ title: name === 'angular' ? 'Angular' : 'AngularJS', body: frameworkTips(component, name) }))
    .filter(tip => tip.body);
  if (tips.length > 0) {
    sections.push(`## Dicas por framework\n\n${tips.map(tip => `**${tip.title}**\n\n${tip.body}`).join('\n\n')}`);
  }

  return sections.join('\n\n');
}
