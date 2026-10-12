// tipos e schemas Zod
//
// Os schemas descrevem só o que o MCP usa do `docs/docs.json` e do
// `docs/tokens.json` publicados pelo bth-ui. Campos desconhecidos são
// ignorados, para tolerar mudanças de formato entre versões do Stencil.
import { z } from 'zod';

const docsTagSchema = z.object({
  name: z.string(),
  text: z.string().optional(),
});

const propSchema = z.object({
  name: z.string(),
  type: z.string(),
  attr: z.string().optional(),
  docs: z.string().default(''),
  default: z.string().optional(),
  required: z.boolean().default(false),
  values: z.array(z.object({ type: z.string(), value: z.string().optional() })).default([]),
});

const eventSchema = z.object({
  event: z.string(),
  detail: z.string().default('void'),
  docs: z.string().default(''),
  bubbles: z.boolean().default(true),
  cancelable: z.boolean().default(true),
});

const namedDocSchema = z.object({
  name: z.string(),
  docs: z.string().default(''),
});

const componentSchema = z.object({
  tag: z.string(),
  docs: z.string(),
  docsTags: z.array(docsTagSchema),
  props: z.array(propSchema),
  events: z.array(eventSchema),
  slots: z.array(namedDocSchema),
  parts: z.array(namedDocSchema).default([]),
});

export const docsJsonSchema = z.object({
  compiler: z.object({ name: z.string(), version: z.string() }).optional(),
  components: z.array(componentSchema),
});

export const tokensJsonSchema = z.object({
  version: z.string().optional(),
  tokens: z.array(
    z.object({
      name: z.string(),
      value: z.string(),
      file: z.string(),
      cssVariable: z.string().optional(),
    }),
  ),
});

export type DocsJson = z.infer<typeof docsJsonSchema>;
export type DocsJsonComponent = z.infer<typeof componentSchema>;
export type Token = z.infer<typeof tokensJsonSchema>['tokens'][number];

// Modelo interno, já normalizado (ver knowledge/normalize.ts)

export interface ComponentProp {
  name: string;
  /** Nome do atributo HTML; ausente quando a prop só pode ser passada por JavaScript. */
  attr?: string;
  type: string;
  /** Valores literais aceitos, quando o tipo é uma união de literais. */
  values: string[];
  default?: string;
  required: boolean;
  description: string;
}

export interface ComponentEvent {
  name: string;
  detail: string;
  description: string;
  bubbles: boolean;
  cancelable: boolean;
}

export interface NamedDoc {
  /** Vazio para o slot padrão. */
  name: string;
  description: string;
}

export interface Component {
  tag: string;
  summary: string;
  description: string;
  category?: string;
  status?: string;
  usageWhen: string[];
  usageAvoid: string[];
  related: string[];
  examples: string[];
  props: ComponentProp[];
  events: ComponentEvent[];
  slots: NamedDoc[];
  parts: NamedDoc[];
}

export type Framework = 'angular' | 'angularjs';
export const frameworks: readonly Framework[] = ['angular', 'angularjs'];
