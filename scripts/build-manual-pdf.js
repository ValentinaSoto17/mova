// Genera docs/Manual_de_Usuario_MOVA.pdf a partir del mismo contenido del manual de la app
const path = require('path');
const { chromium } = require('playwright');
const { buildManualHtml } = require('../mobile/src/manual/manualContent');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent(buildManualHtml());
  await p.pdf({ path: path.join(__dirname, '..', 'docs', 'Manual_de_Usuario_MOVA.pdf'), format: 'A4', printBackground: true });
  await b.close();
})();
