# Configuração do bth-ui em Angular

## Registro dos componentes

Chame `defineCustomElements` uma vez no `src/main.ts`, antes do `bootstrapApplication`:

```ts
import { defineCustomElements } from 'bth-ui/loader';

defineCustomElements();
```

Todo componente Angular que usa tags `bth-*` precisa de `schemas: [CUSTOM_ELEMENTS_SCHEMA]` (importado de `@angular/core`). Em projetos com `NgModule`, o schema vai no módulo.

Importe sempre de `bth-ui/loader`. Caminhos internos, como `bth-ui/dist/components/...`, não são exportados pelo pacote.

## Estilos

Não há CSS global para importar: o pacote não publica nenhum arquivo `.css`, e cada componente já carrega o próprio estilo. Não acrescente nada do bth-ui em `styles` no `angular.json`.

A aparência é ajustada pelos tokens (seção "Tokens") e, em pontos específicos, pelas CSS parts de cada componente, listadas em `get_component`:

```css
bth-alert::part(dismiss) {
  opacity: 0.6;
}
```

Os componentes, com exceção do `bth-icon`, usam shadow DOM: seletores CSS da aplicação não alcançam o que está dentro deles, só o próprio elemento, as parts e o conteúdo dos slots.

## Fontes

O pacote não inclui fontes. São duas:

- **Material Symbols Outlined**: obrigatória para o `bth-icon`, que renderiza `<span class="material-symbols-outlined">` com o nome do ícone. A classe e a fonte precisam estar em um CSS global.
- **Geist**: fonte padrão dos componentes. É opcional: sem ela, vale a fonte sem serifa do sistema.

**Pelo Google Fonts**, no `<head>` do `src/index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900" rel="stylesheet">
```

**Por pacotes npm**, para servir as fontes junto da aplicação:

```bash
npm install material-symbols @fontsource-variable/geist
```

E no `angular.json`, em `projects.<app>.architect.build.options.styles`:

```json
"styles": [
  "node_modules/material-symbols/outlined.css",
  "node_modules/@fontsource-variable/geist/index.css",
  "src/styles.css"
]
```

O pacote `@fontsource-variable/geist` registra a família como `Geist Variable`. Aponte os componentes para ela no `src/styles.css`:

```css
:root {
  --bth-font-family: 'Geist Variable', sans-serif;
}
```

Para usar a fonte da própria aplicação nos componentes, defina `--bth-font-family` do mesmo jeito.

## Tokens

Os design tokens do bth-ui são custom properties CSS com o prefixo `--bth-`. Cada uma tem um valor padrão embutido nos componentes; para mudar, defina a propriedade em um CSS global, como o `src/styles.css`:

```css
:root {
  --bth-color-primary: #5b21b6;
  --bth-color-primary-contrast: #ffffff;
  --bth-radius-md: 4px;
}
```

- A lista completa, com os valores padrão, está no resource `docs://tokens`. O campo `cssVariable` de cada token é o nome da propriedade a sobrescrever.
- As cores da paleta seguem o padrão `--bth-color-<nome>` e `--bth-color-<nome>-contrast`, com os nomes `primary`, `success`, `danger`, `warning`, `info` e `accent`.
- Definida em um seletor mais específico, a propriedade vale só para aquele trecho da página.
- As variáveis SASS (`$nome`) existem só no código-fonte da lib e não são publicadas: use sempre as custom properties.

## Props e eventos

Com `CUSTOM_ELEMENTS_SCHEMA`, o Angular trata as tags `bth-*` como elementos comuns.

Valores fixos vão como atributos, e valores dinâmicos com a sintaxe de propriedade:

```html
<bth-button color="danger" variant="outline">Excluir</bth-button>
<bth-button [color]="cor" [disabled]="salvando">Salvar</bth-button>
```

Para props booleanas, a presença do atributo já vale como verdadeiro (`<bth-alert dismissible>`). Com valor dinâmico, use `[dismissible]="podeFechar"`; não use `dismissible="false"`.

Eventos customizados usam a sintaxe normal de eventos, com o nome exato do evento:

```html
<bth-alert variant="success" dismissible (bthDismiss)="aoFechar($event)">
  <bth-alert-title>Salvo</bth-alert-title>
</bth-alert>
```

`$event` é um `CustomEvent`; os dados, quando existem, ficam em `$event.detail`. Eventos nativos, como `(click)`, funcionam normalmente.

Use só as props, os valores e os eventos listados em `get_component`.

## Formulários

O `bth-button` com `type="submit"` envia o formulário mais próximo e, com `type="reset"`, limpa. O envio dispara o evento `submit` do formulário, então `(ngSubmit)` funciona:

```html
<form [formGroup]="form" (ngSubmit)="salvar()">
  <input formControlName="nome" />
  <bth-button type="submit" color="primary" [disabled]="form.invalid">Salvar</bth-button>
  <bth-button type="reset" variant="ghost">Limpar</bth-button>
</form>
```

O bth-ui ainda não tem componentes de campo (input, select, checkbox). Use os elementos nativos ou os da aplicação para os campos, com `ngModel` ou `formControlName` neles.
