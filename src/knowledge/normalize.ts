// docs.json -> modelo interno
import type { Component, DocsJsonComponent } from '../schema.js';

/** Primeira frase de um texto, sem cortar em pontos que não são seguidos de espaço (como em `docs.json`). */
export function firstSentence(text: string): string {
  const paragraph = text.trim().split(/\n\s*\n/)[0] ?? '';
  const flat = paragraph.replace(/\s+/g, ' ');
  return /^.*?[.!?](?=\s|$)/.exec(flat)?.[0] ?? flat;
}

export function normalizeComponent(component: DocsJsonComponent): Component {
  const tagTexts = (name: string) =>
    component.docsTags
      .filter(tag => tag.name === name)
      .map(tag => (tag.text ?? '').trim())
      .filter(Boolean);

  const category = tagTexts('category')[0];
  const status = tagTexts('status')[0];

  return {
    tag: component.tag,
    summary: firstSentence(component.docs),
    description: component.docs.trim(),
    ...(category && { category }),
    ...(status && { status }),
    usageWhen: tagTexts('usage-when'),
    usageAvoid: tagTexts('usage-avoid'),
    related: tagTexts('related')
      .flatMap(text => text.split(','))
      .map(tag => tag.trim())
      .filter(Boolean),
    examples: tagTexts('example'),
    props: component.props.map(prop => ({
      name: prop.name,
      ...(prop.attr && { attr: prop.attr }),
      type: prop.type,
      values: prop.values.flatMap(value => (value.value === undefined ? [] : [value.value])),
      ...(prop.default !== undefined && { default: prop.default }),
      required: prop.required,
      description: prop.docs.trim(),
    })),
    events: component.events.map(event => ({
      name: event.event,
      detail: event.detail,
      description: event.docs.trim(),
      bubbles: event.bubbles,
      cancelable: event.cancelable,
    })),
    slots: component.slots.map(slot => ({ name: slot.name, description: slot.docs.trim() })),
    parts: component.parts.map(part => ({ name: part.name, description: part.docs.trim() })),
  };
}
