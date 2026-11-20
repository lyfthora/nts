import { LanguageDescription } from "@codemirror/language";

// Lista curada de lenguajes para bloques ``` en el editor.
// Cada entrada se carga bajo demanda (chunk separado) solo cuando una nota
// contiene un bloque de ese lenguaje. Sustituye a
// `@codemirror/language-data`, que arrastraba ~100 modos legacy a dist.
export const codeLanguages: LanguageDescription[] = [
  LanguageDescription.of({
    name: "javascript",
    alias: ["javascript", "js", "jsx"],
    load: async () => (await import("@codemirror/lang-javascript")).javascript(),
  }),
  LanguageDescription.of({
    name: "typescript",
    alias: ["typescript", "ts", "tsx"],
    load: async () =>
      (await import("@codemirror/lang-javascript")).javascript({ typescript: true }),
  }),
  LanguageDescription.of({
    name: "python",
    alias: ["python", "py"],
    load: async () => (await import("@codemirror/lang-python")).python(),
  }),
  LanguageDescription.of({
    name: "sql",
    alias: ["sql"],
    load: async () => (await import("@codemirror/lang-sql")).sql(),
  }),
  LanguageDescription.of({
    name: "json",
    alias: ["json"],
    load: async () => (await import("@codemirror/lang-json")).json(),
  }),
  LanguageDescription.of({
    name: "css",
    alias: ["css"],
    load: async () => (await import("@codemirror/lang-css")).css(),
  }),
  LanguageDescription.of({
    name: "html",
    alias: ["html", "xml"],
    load: async () => (await import("@codemirror/lang-html")).html(),
  }),
];
