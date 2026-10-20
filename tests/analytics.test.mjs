import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {value,mean,delta,classify,defaults,schoolRow,paired,csv,validateBackup} from '../analytics.js';
const data=JSON.parse(await readFile(new URL('../data/results.json',import.meta.url)));
test('66 escolas distintas, três edições, sem totais duplicados',()=>{
  assert.equal(data.schools.length,66);assert.equal(new Set(data.schools.map(s=>s.id)).size,66);
  for(const s of data.schools)assert.deepEqual(s.terms.map(t=>t.term),[1,2,3]);
  assert.equal(data.totals.length,3);
});
test('valores oficiais da Diretoria permanecem fiéis à origem',()=>{
  assert.equal(value(data.totals[0]),49.041130876190275);
  assert.ok(Math.abs(value(data.totals[2])-55.11383333089205)<1e-12);
  assert.ok(Math.abs(delta(value(data.totals[0]),value(data.totals[2]))-6.07270245470178)<1e-10);
  assert.equal(data.totals[2].students,34626);
});
test('zero, ausente e política de componente são distintos',()=>{
  assert.equal(value({score:0}),0);
  assert.equal(value({subjects:{MAT:0}},'MAT'),null);
  assert.equal(value({subjects:{MAT:0}},'MAT','include'),0);
  assert.equal(value({subjects:{MAT:null}},'MAT','include'),null);
  assert.equal(mean([null,0,50]),25);
  assert.equal(mean([]),null);assert.equal(delta(null,50),null);
});
test('prioridades respeitam limites e ordem das regras',()=>{
  assert.equal(classify(44.99,10,99),'Intensiva');
  assert.equal(classify(45,10,99),'Acompanhamento');
  assert.equal(classify(60,0,90),'Manutenção');
  assert.equal(classify(70,-3,99),'Acompanhamento');
  assert.equal(classify(70,-2.9,89.9),'Acompanhamento');
  assert.equal(classify(null,0,99),'Sem dado');
  assert.equal(classify(70,-2.9,90),'Manutenção');
});
test('diferenças não confundem ordem da origem; meta limitada a 100%',()=>{
  const s={id:'1',terms:[{term:3,score:.98,participation:.95},{term:1,score:.4},{term:2,score:.6}]};
  const r=schoolRow(s,'score',defaults);
  assert.deepEqual(r.scores,[40,60,98]);assert.equal(r.change,58);assert.equal(r.recent,38);assert.equal(r.goal,100);
});
test('comparação usa pares disponíveis, não diferença de bases desiguais',()=>{
  const p=paired([{scores:[10,20,30]},{scores:[null,40,90]}]);
  assert.equal(p.n,1);assert.equal(p.change,20);
});
test('backup valida IDs, metas e conteúdo; CSV escapa fórmulas',()=>{
  assert.throws(()=>validateBackup({version:1,plans:{wrong:{}}},['1']));
  const p={goal:60,status:'Não iniciado',owner:'Gestor',date:'2026-11-01',action:'Diagnóstico',evidence:''};
  assert.deepEqual(validateBackup({version:1,plans:{'1':p}},['1']),{'1':p});
  assert.throws(()=>validateBackup({version:1,plans:{'1':{...p,goal:101}}},['1']));
  assert.ok(csv([['=1+1','a"b']]).includes(`"'=1+1";"a""b"`));
});
test('zeros de origem e escopo reconciliados',()=>{
  const zeros=data.schools.flatMap(s=>s.terms).flatMap(t=>Object.values(t.subjects)).filter(v=>v===0);
  assert.equal(zeros.length,114);
  assert.equal(paired(data.schools.map(s=>schoolRow(s,'score',defaults))).n,66);
});
