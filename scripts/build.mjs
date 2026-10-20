import {mkdir, cp, readFile} from 'node:fs/promises';
const data = JSON.parse(await readFile(new URL('../data/results.json', import.meta.url)));
if (!data.schools.length || data.totals.length !== 3) throw new Error('Base incompleta');
await mkdir('dist', {recursive:true});
for (const f of ['index.html','styles.css','app.js','analytics.js','data'])
  await cp(f, `dist/${f}`, {recursive:true});
console.log(`Build concluído: ${data.schools.length} escolas; sem dependências externas.`);
