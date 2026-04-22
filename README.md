# Aegir·Intel — Market Intelligence Platform

Plataforma de inteligência de mercado para gestora de ativos brasileira focada em Real Estate e Crédito Privado.

## Estrutura

```
index.html          → HTML shell (carrega CSS + JS)
css/styles.css      → Estilos (dark editorial terminal)
js/core.js          → Taxonomia, DB, Gemini, helpers, render engine
js/intelligence.js  → Global Intelligence (hub, grids, search, report, modals)
js/securities.js    → Securities (Finnhub, brapi, análise de ativos)
js/macro.js         → Macro Intelligence (BCB, ciclos, bancos centrais, setorial)
js/assetmgmt.js     → Asset Management (fundos, pilares, morning brief, pressure)
```

## Como rodar localmente

```bash
cd aegir-intel
python3 -m http.server 8000
# Abrir http://localhost:8000
```

## Deploy

Conectado ao Netlify via GitHub. Push para `main` = deploy automático.

## Dados

Armazenados no LocalStorage do browser. Faça backup regular via:
Data / Reports → Exportar base (.json)

## APIs utilizadas

- **Gemini** (Google): extração de research PDFs (requer API key em Settings)
- **BCB SGS**: indicadores macroeconômicos brasileiros (gratuito, via proxy CORS)
- **brapi.dev**: cotações de ativos brasileiros (gratuito para tickers populares)
- **Finnhub**: dados de mercado US/global (requer API key gratuita)
