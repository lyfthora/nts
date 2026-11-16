// Única fuente de verdad para la URL de la API.
//
// - Main process y preload leen `process.env.NTS_API_URL` en runtime.
// - El renderer es un bundle de navegador sin `process`: scripts/build.js
//   define `process.env.NTS_API_URL` en tiempo de build con esbuild, así que
//   `pnpm run build` con la variable seteada deja la URL dentro del bundle.
const DEFAULT_API_URL = "https://nts-api-3e8i.onrender.com/api";

const rawApiUrl = process.env.NTS_API_URL;

const API_URL = (rawApiUrl && rawApiUrl.trim() ? rawApiUrl.trim() : DEFAULT_API_URL).replace(/\/+$/, "");

module.exports = { API_URL, DEFAULT_API_URL };
