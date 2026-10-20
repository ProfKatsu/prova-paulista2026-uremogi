import {defaults,names,valid,value,mean,delta,schoolRow,paired,csv,validateBackup} from './analytics.js';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=1)=>valid(n)?n.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const pct=n=>valid(n)?`${fmt(n)}%`:'—';
const pp=n=>valid(n)?`${n>0?'+':''}${fmt(n)} p.p.`:'—';
const slug=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const badge=p=>`<span class="badge ${slug(p)}">${esc(p)}</span>`;
const change=n=>`<span class="delta ${n>0?'up':n<0?'down':''}">${pp(n)}</span>`;
let data,plans={},cfg={...defaults},page='overview',metric='score',query='',priority='',sort='score',selected=new Set(),planId='',heatTerm=3;
let storageWarning='';
try{
  const stored=JSON.parse(localStorage.getItem('pp-settings-v1')||'null');
  if(stored&&['target','critical','participation','drop','gain'].every(k=>valid(stored[k])&&stored[k]>=0&&stored[k]<=100)&&stored.critical<=stored.target&&stored.drop>0&&['exclude','include'].includes(stored.zeroPolicy))cfg=stored;
}catch{storageWarning='Armazenamento local indisponível ou configuração inválida. Use a exportação de planos.';}
function notify(s){$('#toast').textContent=s;$('#toast').classList.add('visible');clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#toast').classList.remove('visible'),4500);}
function persist(){
  try{localStorage.setItem('pp-settings-v1',JSON.stringify(cfg));localStorage.setItem('pp-plans-v1',JSON.stringify({version:1,plans}));return true;}
  catch{notify('Não foi possível salvar no navegador. Exporte um backup dos planos.');return false;}
}
function allRows(){return data.schools.map(s=>schoolRow(s,metric,cfg));}
function filtered(){return allRows().filter(r=>(!query||slug(r.name+' '+r.id).includes(slug(query)))&&(!priority||r.priority===priority));}
function ordered(rows){return [...rows].sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'pt-BR'):sort==='change'?(a.change??Infinity)-(b.change??Infinity):sort==='participation'?(a.participation??Infinity)-(b.participation??Infinity):(a.scores[2]??Infinity)-(b.scores[2]??Infinity));}
function stat(label,num,sub,featured=false){return `<article class="metric ${featured?'featured':''}"><div class="label">${label}</div><span class="accent">↗</span><div class="number">${num}</div><p>${sub}</p></article>`;}
function lineChart(series,labels=['1º bimestre','2º bimestre','3º bimestre']){
  const colors=['#087e80','#8d76b7','#c2823e','#537a9f'];
  const x=[70,285,500],y=v=>210-v*1.7;
  return `<svg class="chart" viewBox="0 0 560 260" role="img" aria-label="${esc(series.map(s=>s.name+': '+s.values.map(pct).join(', ')).join('; '))}">
    ${[0,25,50,75,100].map(v=>`<line x1="48" x2="530" y1="${y(v)}" y2="${y(v)}" stroke="#e8eeee"/><text x="8" y="${y(v)+4}">${v}%</text>`).join('')}
    ${labels.map((l,i)=>`<text x="${x[i]}" y="242" text-anchor="middle">${l}</text>`).join('')}
    ${series.map((s,j)=>`${[0,1].map(i=>valid(s.values[i])&&valid(s.values[i+1])?`<line x1="${x[i]}" y1="${y(s.values[i])}" x2="${x[i+1]}" y2="${y(s.values[i+1])}" stroke="${colors[j]}" stroke-width="3" ${j?'stroke-dasharray="5 4"':''}/>`:'').join('')}${s.values.map((v,i)=>valid(v)?`<circle cx="${x[i]}" cy="${y(v)}" r="5" fill="${colors[j]}" stroke="white" stroke-width="2"><title>${esc(s.name)} · ${labels[i]}: ${pct(v)}</title></circle>${series.length===1?`<text class="point-label" x="${x[i]}" y="${y(v)-15}" text-anchor="middle">${pct(v)}</text>`:''}`:'').join('')}`).join('')}</svg>
    <div class="legend">${series.map((s,j)=>`<span><i style="background:${colors[j]}"></i>${esc(s.name)}</span>`).join('')}</div>`;
}
function scatter(rows){
  const usable=rows.filter(r=>valid(r.scores[2])&&valid(r.recent));
  const extent=Math.max(15,...usable.map(r=>Math.ceil(Math.abs(r.recent)/5)*5));
  const x=v=>60+v*4.5,y=v=>150-v/extent*105;
  return `<svg class="chart" viewBox="0 0 560 300" role="img" aria-label="Matriz: acertos do terceiro bimestre no eixo horizontal; variação do segundo para o terceiro no eixo vertical. Detalhes na tabela.">
    <rect x="60" y="45" width="${cfg.target*4.5}" height="105" fill="#fcf5e8"/><rect x="${x(cfg.target)}" y="45" width="${(100-cfg.target)*4.5}" height="105" fill="#edf6f2"/>
    <rect x="60" y="150" width="${cfg.target*4.5}" height="105" fill="#fcefed"/><rect x="${x(cfg.target)}" y="150" width="${(100-cfg.target)*4.5}" height="105" fill="#f4f5f7"/>
    <line x1="60" x2="510" y1="150" y2="150" stroke="#bccbcc" stroke-dasharray="4 4"/>
    <line x1="${x(cfg.target)}" x2="${x(cfg.target)}" y1="45" y2="255" stroke="#aebfc0" stroke-dasharray="4 4"/>
    ${[-extent,0,extent].map(v=>`<text x="5" y="${y(v)+4}">${v>0?'+':''}${v} p.p.</text>`).join('')}
    ${[0,25,50,75,100].map(v=>`<text x="${x(v)}" y="275" text-anchor="middle">${v}%</text>`).join('')}
    <text x="65" y="30">Evolução recente (2º → 3º)</text><text x="510" y="296" text-anchor="end">Acertos no 3º bimestre</text>
    ${usable.map(r=>`<a href="#escola-${r.id}" data-detail="${r.id}" aria-label="${esc(r.name)}: ${pct(r.scores[2])}, ${pp(r.recent)}"><circle cx="${x(r.scores[2])}" cy="${y(r.recent)}" r="5" fill="${r.priority==='Intensiva'?'#b4443c':r.priority==='Acompanhamento'?'#b08232':'#087e80'}" fill-opacity=".75" stroke="white" stroke-width="1"><title>${esc(r.name)}: ${pct(r.scores[2])} · ${pp(r.recent)}</title></circle></a>`).join('')}</svg>`;
}
function overview(rows){
  const full=!query&&!priority;
  const series=full?data.totals.map(t=>value(t,metric,cfg.zeroPolicy)):[0,1,2].map(i=>mean(rows.map(r=>r.scores[i])));
  const evolution=full?delta(series[0],series[2]):paired(rows).change;
  const low=rows.filter(r=>r.priority==='Intensiva').length;
  const recentDown=rows.filter(r=>valid(r.recent)&&r.recent<0).length;
  const lowPart=rows.filter(r=>valid(r.participation)&&r.participation<cfg.participation).length;
  const top=ordered(rows.filter(r=>valid(r.scores[2]))).sort((a,b)=>a.scores[2]-b.scores[2]).slice(0,5);
  return `<section class="metrics">
    ${stat(full?'Acertos da Diretoria · 3º bim.':'Média das escolas filtradas · 3º bim.',pct(series[2]),`${change(evolution)} desde o 1º bimestre`,true)}
    ${stat('Escolas no recorte',fmt(rows.length,0),`${paired(rows).n} com comparação 1º → 3º`)}
    ${stat('Prioridade intensiva',fmt(low,0),`Acertos abaixo de ${fmt(cfg.critical,0)}% no 3º bimestre`)}
    ${stat('Queda no último intervalo',fmt(recentDown,0),`Escolas com redução do 2º para o 3º`)}
    </section>
    <div class="grid"><section class="panel"><div class="panel-head"><div><h2>Trajetória das três edições</h2><p>${esc(names[metric])} · ${full?'total informado nas planilhas':'médias simples por edição'}</p></div><span class="tag">1º → 3º bimestre</span></div>
    ${lineChart([{name:full?'Diretoria de Ensino':'Escolas do recorte',values:series}])}
    <div class="callout">${valid(evolution)?`Variação de <strong>${pp(evolution)}</strong> entre o 1º e o 3º bimestre.`:'Sem pares suficientes para comparar.'} ${lowPart} escola(s) com participação inferior a ${cfg.participation}% no 3º bimestre.</div>
    <p class="note">${full?'A série usa a linha Total de cada arquivo, sem reconstrução por médias escolares.':'Cada ponto usa os dados disponíveis da edição; a variação usa somente escolas com dados nos dois extremos.'}</p></section>
    <section class="panel"><div class="panel-head"><div><h2>Onde concentrar a atenção</h2><p>Os cinco menores resultados do recorte · 3º bim.</p></div><span class="tag">Apoio pedagógico</span></div>
    <div class="priority-list">${top.map((r,i)=>`<div class="priority-card"><span class="rank">${i+1}</span><button class="school-link" data-detail="${r.id}">${esc(r.name)}<br><small>${r.reasons.join(' · ')||'Comparar contexto e práticas pedagógicas'}</small></button><div><strong>${pct(r.scores[2])}</strong><br>${change(r.recent)}</div></div>`).join('')||'<p>Sem escolas neste recorte.</p>'}</div>
    <p class="note">Variação exibida: 2º → 3º. Clique na escola para analisar o histórico e planejar o acompanhamento.</p></section></div>
    <div class="grid"><section class="panel"><div class="panel-head"><div><h2>Resultado × evolução recente</h2><p>Identifique escolas em recuperação ou em queda.</p></div></div>${scatter(rows)}
    <div class="legend"><span><i style="background:#b4443c"></i>Intensiva</span><span><i style="background:#b08232"></i>Acompanhamento</span><span><i style="background:#087e80"></i>Manutenção</span></div><p class="note">Linha vertical: referência de ${cfg.target}%. Cada ponto representa uma escola. Critérios propostos, editáveis em Dados e critérios.</p></section>
    <section class="panel"><div class="panel-head"><div><h2>Distribuição do apoio</h2><p>Classificação para organizar o acompanhamento.</p></div></div>${['Intensiva','Acompanhamento','Manutenção','Sem dado'].map(p=>{const n=rows.filter(r=>r.priority===p).length;return `<div class="bar-row"><span>${p}</span><div class="bar-track"><div class="bar-fill" style="width:${rows.length?n/rows.length*100:0}%"></div></div><b>${n} escola(s)</b></div>`;}).join('')}
    <div class="callout"><strong>Próximo passo</strong><br>Abra uma escola, valide as hipóteses com a equipe e registre uma meta, um responsável e evidências para a próxima reunião.</div><button class="button" data-go="plans">Abrir metas e ações →</button></section></div>`;
}
function schoolTable(rows){
  return `<div class="table-wrap"><table><thead><tr><th class="no-print">Comparar</th><th>Escola</th><th class="num">1º bim.</th><th class="num">2º bim.</th><th class="num">3º bim.</th><th class="num">Δ 1º → 3º</th><th class="num">Δ 2º → 3º</th><th class="num">Participação 3º</th><th>Prioridade</th></tr></thead><tbody>${ordered(rows).map(r=>`<tr><td class="no-print"><input class="checkbox" type="checkbox" data-compare="${r.id}" aria-label="Comparar ${esc(r.name)}" ${selected.has(r.id)?'checked':''}></td><td><button class="school-link" data-detail="${r.id}">${esc(r.name)}</button><small>Código ${r.id} · ${fmt(r.students,0)} alunos na fonte</small></td>${r.scores.map(v=>`<td class="num">${pct(v)}</td>`).join('')}<td class="num">${change(r.change)}</td><td class="num">${change(r.recent)}</td><td class="num">${pct(r.participation)}</td><td>${badge(r.priority)}</td></tr>`).join('')}</tbody></table></div>`;
}
function schools(rows){
  const choices=allRows().filter(r=>selected.has(r.id));
  return `<section class="panel"><div class="panel-head"><div><h2>Comparação das escolas</h2><p>${esc(names[metric])}. Ordene, compare e abra o diagnóstico de cada escola.</p></div><span class="tag">${rows.length} escolas</span></div>
    <div class="table-controls"><label>Ordenar por <select id="sort"><option value="score">Menor resultado no 3º</option><option value="change">Menor evolução 1º → 3º</option><option value="participation">Menor participação</option><option value="name">Nome da escola</option></select></label><span class="note">Selecione até 3 escolas para comparar.</span></div>
    ${rows.length?schoolTable(rows):'<div class="empty">Nenhuma escola encontrada. Revise os filtros.</div>'}
    ${choices.length?`<div class="comparison"><div class="panel-head"><h2>Comparação selecionada</h2><button class="button" id="clear-compare">Limpar seleção</button></div><p class="note">A seleção é mantida ao mudar os filtros.</p>${lineChart(choices.map(r=>({name:r.name,values:r.scores})))}
    <div class="grid">${choices.map(r=>`<div class="mini-card"><h3>${esc(r.name)}</h3>${badge(r.priority)}<p>3º bimestre: <b>${pct(r.scores[2])}</b><br>Evolução: ${pp(r.change)}<br>Participação: ${pct(r.participation)}</p><button class="button" data-detail="${r.id}">Ver diagnóstico</button></div>`).join('')}</div></div>`:''}</section>`;
}
function subjects(rows){
  const base=data.totals.find(t=>t.term===heatTerm);
  return `<section class="panel"><div class="panel-head"><div><h2>Mapa de componentes curriculares</h2><p>Acertos por escola · a cor indica o resultado, não a classificação oficial.</p></div><label>Edição<select id="heat-term">${[1,2,3].map(t=>`<option value="${t}" ${heatTerm===t?'selected':''}>${t}º bimestre</option>`).join('')}</select></label></div>
    <div class="legend"><span><i style="background:#b4443c"></i>Abaixo de ${cfg.critical}%</span><span><i style="background:#b08232"></i>De ${cfg.critical}% a menos de ${cfg.target}%</span><span><i style="background:#087e80"></i>A partir de ${cfg.target}%</span><span>— Sem dado utilizável</span></div>
    <div class="table-wrap"><table class="heat"><thead><tr><th>Escola / componente</th>${data.subjects.map(s=>`<th title="${names[s]}">${s}</th>`).join('')}</tr></thead><tbody>
    <tr><td><b>Diretoria · total da fonte</b><small>Referência fixa da rede, sem filtros</small></td>${data.subjects.map(s=>heatCell(value(base,s,cfg.zeroPolicy))).join('')}</tr>
    ${rows.map(r=>`<tr><td><button class="school-link" data-detail="${r.id}">${esc(r.name)}</button></td>${data.subjects.map(s=>heatCell(value(r.terms.find(t=>t.term===heatTerm),s,cfg.zeroPolicy),r.id,s)).join('')}</tr>`).join('')}</tbody></table></div>
    <p class="note">Os filtros de indicador e prioridade selecionam as escolas; as colunas exibem todos os componentes. Zeros originais: ${cfg.zeroPolicy==='exclude'?'excluídos até validação da oferta':'incluídos como resultados'}. Consulte Dados e critérios para alterar.</p></section>`;
}
function heatCell(v,id,s){return `<td class="${!valid(v)?'':v<cfg.critical?'heat-low':v<cfg.target?'heat-mid':'heat-high'}">${id?`<button data-detail="${id}" title="${esc(names[s])}: ${pct(v)}">${pct(v)}</button>`:pct(v)}</td>`;}
function suggested(s){
  const t=s.terms.find(t=>t.term===3);
  const weak=data.subjects.map(k=>({k,v:value(t,k,cfg.zeroPolicy)})).filter(x=>valid(x.v)).sort((a,b)=>a.v-b.v).slice(0,2);
  return `Validar, com os professores, os itens e habilidades de ${weak.map(x=>names[x.k]).join(' e ')||'cada componente'} que exigem apoio. Aplicar diagnóstico breve, organizar intervenções semanais e verificar os resultados em 30 dias.${t.participation*100<cfg.participation?' Investigar ausências e planejar a mobilização para a próxima aplicação.':''}`;
}
function plansPage(rows){
  const scope=rows;
  if(!scope.some(r=>r.id===planId))planId=scope[0]?.id||'';
  const s=data.schools.find(s=>s.id===planId);
  const r=s?schoolRow(s,'score',cfg):null;
  const p=plans[planId]||{goal:r?.goal??0,owner:'',date:'',status:'Não iniciado',action:s?suggested(s):'',evidence:''};
  return `<div class="strip">Planos são salvos neste navegador. Para levar a outro computador, exporte e importe um backup. Não há sincronização entre gestores.</div>
    <section class="panel"><div class="panel-head"><div><h2>Da análise ao acompanhamento</h2><p>Metas individuais usam acertos gerais do 3º bimestre, independentemente do indicador filtrado.</p></div><span class="tag">${Object.keys(plans).length} planos salvos no navegador</span></div>
    <div class="plan-head"><label>Escola<select id="plan-school">${scope.map(s=>`<option value="${s.id}" ${s.id===planId?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label><button class="button" id="backup">Exportar backup</button><button class="button" id="import">Importar backup</button><input id="backup-file" type="file" accept=".json,application/json" hidden></div>
    ${s?`<div class="callout"><strong>Resultado atual: ${pct(r.scores[2])}</strong> · Evolução 1º → 3º: ${pp(r.change)} · Participação: ${pct(r.participation)}<br>Meta inicial sugerida: acréscimo de ${cfg.gain} p.p., limitado a 100%. Ajuste após pactuação com a escola.</div>
    <form id="plan-form"><div class="form-grid">
    <label>Meta de acertos gerais para a próxima edição (%)<input name="goal" type="number" min="0" max="100" step="0.1" value="${fmt(p.goal).replace(',','.')}" required></label>
    <label>Responsável<input name="owner" maxlength="150" value="${esc(p.owner)}" placeholder="Nome ou função" required></label>
    <label>Prazo de acompanhamento<input name="date" type="date" value="${esc(p.date)}" required></label>
    <label>Status<select name="status">${['Não iniciado','Em andamento','Concluído'].map(st=>`<option ${st===p.status?'selected':''}>${st}</option>`).join('')}</select></label>
    <label class="wide">Ações pedagógicas propostas<textarea name="action" maxlength="10000" required>${esc(p.action)}</textarea></label>
    <label class="wide">Evidências e registro de acompanhamento<textarea name="evidence" maxlength="10000" placeholder="Diagnósticos, intervenções realizadas, devolutivas e próximos passos…">${esc(p.evidence)}</textarea></label>
    </div><button class="button primary" type="submit">Salvar plano desta escola</button> ${plans[planId]?'<button class="button" type="button" id="delete-plan">Excluir plano salvo</button>':''} <span class="note">${plans[planId]?'Plano já registrado; salve para atualizar.':'Sugestão inicial — ainda não salva.'}</span></form>`:'<div class="empty">Nenhuma escola no recorte. Limpe os filtros para criar um plano.</div>'}</section>
    <section class="panel" style="margin-top:20px"><div class="panel-head"><div><h2>Planos registrados no recorte</h2><p>O status é informado pela gestão; não equivale à comprovação de alcance da meta.</p></div></div><div class="table-wrap"><table><thead><tr><th>Escola</th><th>Meta</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr></thead><tbody>${scope.filter(s=>plans[s.id]).map(s=>{const p=plans[s.id];return `<tr><td><button class="school-link" data-plan="${s.id}">${esc(s.name)}</button></td><td>${pct(p.goal)}</td><td>${esc(p.owner)}</td><td>${p.date?esc(p.date.split('-').reverse().join('/')):'—'}</td><td>${esc(p.status)}</td></tr>`;}).join('')||'<tr><td colspan="5">Nenhum plano salvo neste recorte.</td></tr>'}</tbody></table></div></section>`;
}
function method(){
  return `<div class="method-grid"><section class="panel"><h2>Critérios para priorizar o apoio</h2><p>Parâmetros propostos para discussão. Não são metas oficiais nem o Farol SARESP. Alterações recalculam a classificação; planos já salvos mantêm as metas pactuadas.</p>
    <form id="settings"><div class="form-grid">
    <label>Referência de acertos (%)<input name="target" type="number" min="0" max="100" step="0.1" value="${cfg.target}" required></label>
    <label>Limite intensivo (%)<input name="critical" type="number" min="0" max="100" step="0.1" value="${cfg.critical}" required></label>
    <label>Participação mínima (%)<input name="participation" type="number" min="0" max="100" step="0.1" value="${cfg.participation}" required></label>
    <label>Alerta de queda recente (p.p.)<input name="drop" type="number" min="0.1" max="100" step="0.1" value="${cfg.drop}" required></label>
    <label>Acréscimo sugerido para metas (p.p.)<input name="gain" type="number" min="0" max="100" step="0.1" value="${cfg.gain}" required></label>
    <label>Zeros em componentes<select name="zeroPolicy"><option value="exclude" ${cfg.zeroPolicy==='exclude'?'selected':''}>Excluir até validar oferta</option><option value="include" ${cfg.zeroPolicy==='include'?'selected':''}>Incluir como zero real</option></select></label>
    </div><button class="button primary" type="submit">Aplicar critérios</button></form>
    <ul><li><b>Intensiva:</b> resultado do 3º bimestre abaixo do limite intensivo.</li><li><b>Acompanhamento:</b> sem condição intensiva e ao menos um sinal: resultado abaixo da referência, queda 2º → 3º igual ou maior que o limite, ou baixa participação.</li><li><b>Manutenção:</b> resultado disponível e nenhum dos sinais anteriores.</li><li><b>Sem dado:</b> sem resultado utilizável no indicador do 3º bimestre.</li></ul></section>
    <section class="panel"><h2>Como interpretar a comparação</h2><ul>
    <li><b>Base:</b> 66 escolas, 198 registros escola–bimestre e 13 componentes. Junção pelo código da escola, nunca pela ordem das linhas.</li>
    <li><b>Rede completa:</b> usa a linha Total original de cada edição. Os totais não são médias simples das escolas.</li>
    <li><b>Recortes filtrados:</b> médias simples das escolas com dados válidos em cada edição. A variação 1º → 3º usa somente pares válidos. Não se estima o resultado oficial de um subconjunto.</li>
    <li><b>Variação:</b> diferença em pontos percentuais, sem arredondar antes do cálculo. Verde indica aumento de acertos, não prova de aprendizagem.</li>
    <li><b>Comparabilidade:</b> as provas, estudantes participantes, séries e conteúdos podem variar. Estes arquivos não permitem atribuir causas, medir ganho de aprendizagem ou comparar escolas de oferta equivalente.</li>
    <li><b>Zeros:</b> há 114 células de componentes com zero no 1º bimestre. São preservadas na base. Por padrão, ficam fora das análises de componentes por possível ausência de oferta. A política não altera os acertos gerais.</li>
    <li><b>Alunos e participação:</b> são campos distintos da fonte. Não se deduz número de presentes multiplicando esses valores. Alunos não são somados entre edições.</li>
    <li><b>Farol SARESP:</b> os arquivos apresentam códigos e imagens em formatos diferentes, sem legenda metodológica. Não foi reinterpretado como classificação pedagógica.</li>
    <li><b>Ano:</b> não informado nas planilhas; os períodos são identificados apenas como 1º, 2º e 3º bimestres.</li></ul></section>
    <section class="panel full"><h2>Fontes e rastreabilidade</h2><p>Provas físicas · URE Mogi das Cruzes · código 10501. Os dados são incorporados ao código; não há consulta externa nem upload automático.</p>
    ${data.sources.map(s=>`<div class="source"><strong>${s.term}º bimestre</strong> · ${esc(s.file)}<br><span class="note">Aba ${esc(s.sheet)} · ${s.schools} escolas · linha Total 68 · código SHA-256: ${s.sha256}</span></div>`).join('')}
    <p>As ações sugeridas são hipóteses de trabalho. Os arquivos não contêm resultados por habilidade, turma ou estudante; o diagnóstico pedagógico deve complementar a análise.</p></section></div>`;
}
const titles={overview:['Cada escola. Uma trajetória.','Da leitura dos resultados à definição das próximas ações.','Visão da rede'],schools:['Compare resultados. Encontre prioridades.','Três edições lado a lado, com o contexto de cada escola.','Comparar escolas'],subjects:['Um olhar para cada componente.','Explore os resultados e localize os pontos que merecem investigação.','Componentes'],plans:['Resultados que orientam ações.','Pactue metas e acompanhe o trabalho com as equipes escolares.','Metas e ações'],method:['Clareza nos dados e nas decisões.','Entenda as fontes e ajuste os critérios de acompanhamento.','Dados e critérios']};
function render(){
  const rows=filtered(),t=titles[page];
  $('#page-title').textContent=t[0];$('#page-subtitle').textContent=t[1];$('#breadcrumb').textContent=t[2];
  document.querySelectorAll('[data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page===page);b.setAttribute('aria-current',b.dataset.page===page?'page':'false');});
  $('.filters').hidden=page==='method';
  $('#filter-context').innerHTML=page==='method'?'':`<span><b>${rows.length}</b> de ${data.schools.length} escolas · ${esc(names[metric])} · ${query||priority?'recorte filtrado':'rede completa'}</span><span>Provas físicas · ${cfg.zeroPolicy==='exclude'?'zeros em componentes sob validação':'zeros em componentes incluídos'}</span>`;
  $('#content').innerHTML=({overview,schools,subjects,plans:plansPage,method}[page])(rows);
  if($('#sort'))$('#sort').value=sort;
  bindContent();
}
function detail(id){
  const s=data.schools.find(s=>s.id===id),r=schoolRow(s,metric,cfg);
  $('#detail').innerHTML=`<div class="eyebrow">DIAGNÓSTICO DA ESCOLA · CÓDIGO ${s.id}</div><h2 id="detail-title">${esc(s.name)}</h2>${badge(r.priority)} <span class="note">Indicador: ${esc(names[metric])}</span>
    <div class="metrics">${stat('Acertos · 3º bimestre',pct(r.scores[2]),`${change(r.change)} desde o 1º`)}${stat('Participação · 3º bimestre',pct(r.participation),'Valor informado na planilha')}${stat('Total de alunos · 3º bimestre',fmt(r.students,0),'Não representa presentes estimados')}</div>
    <div class="grid"><section><h3>Evolução da escola e referência regional</h3>${lineChart([{name:'Escola',values:r.scores},{name:'Diretoria',values:data.totals.map(t=>value(t,metric,cfg.zeroPolicy))}])}<p class="note">${esc(r.reasons.join(' · ')||'Manter o acompanhamento e investigar boas práticas.')}.</p></section>
    <section><h3>Hipótese de intervenção</h3><p>${esc(suggested(s))}</p><div class="callout">Validar os itens e as habilidades antes de definir a intervenção. Os resultados agregados não identificam a causa das dificuldades.</div><button class="button primary" data-plan="${s.id}">Definir meta e plano de ação →</button></section></div>
    <h3>Histórico por componente curricular</h3><div class="table-wrap"><table><thead><tr><th>Componente</th><th>1º bim.</th><th>2º bim.</th><th>3º bim.</th><th>Δ 1º → 3º</th></tr></thead><tbody>${data.subjects.map(k=>{const vs=[1,2,3].map(i=>value(s.terms.find(t=>t.term===i),k,cfg.zeroPolicy));return `<tr><td>${esc(names[k])}</td>${vs.map(v=>`<td>${pct(v)}</td>`).join('')}<td>${change(delta(vs[0],vs[2]))}</td></tr>`;}).join('')}</tbody></table></div><p class="note">Fonte: aba Export; linhas ${s.terms.map(t=>`${t.row} (${t.term}º bim.)`).join(', ')}. Valores ausentes ou zeros sob validação aparecem como —.</p><button class="button" id="print-detail">Imprimir diagnóstico / PDF</button>`;
  $('#detail').querySelector('[data-plan]').onclick=()=>{planId=id;query='';priority='';$('#search').value='';$('#priority').value='';page='plans';$('#school-dialog').close();render();};
  $('#print-detail').onclick=()=>window.print();
  $('#school-dialog').showModal();
}
function download(name,text,type='text/plain'){
  const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function bindContent(){
  $('#content').querySelectorAll('[data-detail]').forEach(b=>b.onclick=e=>{e.preventDefault();detail(b.dataset.detail);});
  $('#content').querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{page=b.dataset.go;render();});
  $('#content').querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>{planId=b.dataset.plan;render();});
  $('#content').querySelectorAll('[data-compare]').forEach(b=>b.onchange=()=>{
    if(b.checked&&selected.size>=3){b.checked=false;notify('Selecione até três escolas por comparação.');return;}
    b.checked?selected.add(b.dataset.compare):selected.delete(b.dataset.compare);render();
  });
  if($('#sort'))$('#sort').onchange=e=>{sort=e.target.value;render();};
  if($('#clear-compare'))$('#clear-compare').onclick=()=>{selected.clear();render();};
  if($('#heat-term'))$('#heat-term').onchange=e=>{heatTerm=+e.target.value;render();};
  if($('#plan-school'))$('#plan-school').onchange=e=>{planId=e.target.value;render();};
  if($('#delete-plan'))$('#delete-plan').onclick=()=>{
    if(!window.confirm('Excluir o plano desta escola do navegador? Exporte um backup antes se precisar preservá-lo.'))return;
    delete plans[planId];if(persist())notify('Plano excluído.');render();
  };
  if($('#plan-form'))$('#plan-form').onsubmit=e=>{
    e.preventDefault();const f=new FormData(e.target);
    plans[planId]={goal:+f.get('goal'),owner:f.get('owner').trim(),date:f.get('date'),status:f.get('status'),action:f.get('action').trim(),evidence:f.get('evidence').trim()};
    if(persist())notify('Plano salvo neste navegador.');render();
  };
  if($('#backup')){
    $('#backup').onclick=()=>download('planos-prova-paulista.json',JSON.stringify({version:1,exportedAt:new Date().toISOString(),plans},null,2),'application/json');
    $('#import').onclick=()=>$('#backup-file').click();
    $('#backup-file').onchange=async e=>{
      try{
        const f=e.target.files[0];if(!f)return;if(f.size>2000000)throw Error('Arquivo excede 2 MB.');
        const incoming=validateBackup(JSON.parse(await f.text()),data.schools.map(s=>s.id));
        const duplicates=Object.keys(incoming).filter(id=>plans[id]).length;
        if(duplicates&&!window.confirm(`${duplicates} plano(s) existente(s) serão substituídos pelo backup. Continuar?`))return;
        plans={...plans,...incoming};if(persist())notify('Backup importado.');render();
      }catch(err){notify(err.message||'Não foi possível importar o backup.');}
    };
  }
  if($('#settings'))$('#settings').onsubmit=e=>{
    e.preventDefault();const f=new FormData(e.target),next={};
    for(const k of ['target','critical','participation','drop','gain'])next[k]=+f.get(k);
    if(next.critical>next.target){notify('O limite intensivo não pode superar a referência de acertos.');return;}
    cfg={...next,zeroPolicy:f.get('zeroPolicy')};persist();render();notify('Critérios atualizados. As metas já salvas foram mantidas.');
  };
}
async function init(){
  try{
    const res=await fetch('./data/results.json');if(!res.ok)throw Error('Falha na leitura dos dados.');data=await res.json();
    try{const raw=localStorage.getItem('pp-plans-v1');if(raw)plans=validateBackup(JSON.parse(raw),data.schools.map(s=>s.id));}catch{storageWarning='Não foi possível recuperar planos salvos. Importe um backup válido.';}
    $('#metric').insertAdjacentHTML('beforeend',data.subjects.map(s=>`<option value="${s}">${names[s]}</option>`).join(''));
    document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{page=b.dataset.page;render();window.scrollTo({top:0,behavior:'smooth'});});
    $('#metric').onchange=e=>{metric=e.target.value;render();};
    $('#search').oninput=e=>{query=e.target.value;render();};
    $('#priority').onchange=e=>{priority=e.target.value;render();};
    $('#reset').onclick=()=>{query='';priority='';metric='score';$('#search').value='';$('#priority').value='';$('#metric').value='score';render();};
    $('#close-dialog').onclick=()=>$('#school-dialog').close();
    $('#print').onclick=()=>window.print();
    $('#export').onclick=()=>{
      const rows=ordered(filtered());
      const header=['Código','Escola','Indicador','1º bim (%)','2º bim (%)','3º bim (%)','Variação 1º→3º (p.p.)','Variação 2º→3º (p.p.)','Participação 3º (%)','Alunos 3º','Prioridade','Motivos','Referência (%)','Limite intensivo (%)','Limite participação (%)','Alerta queda (p.p.)','Política zeros'];
      download('comparacao-prova-paulista.csv',csv([header,...rows.map(r=>[r.id,r.name,names[metric],...r.scores.map(v=>valid(v)?fmt(v,4):''),valid(r.change)?fmt(r.change,4):'',valid(r.recent)?fmt(r.recent,4):'',fmt(r.participation,4),r.students,r.priority,r.reasons.join('; '),cfg.target,cfg.critical,cfg.participation,cfg.drop,cfg.zeroPolicy])]),'text/csv;charset=utf-8');
      notify('Comparação exportada com os filtros atuais.');
    };
    render();if(storageWarning)notify(storageWarning);
  }catch(e){$('#content').innerHTML=`<div class="panel"><h2>Não foi possível carregar a base</h2><p>${esc(e.message)} Abra o projeto por um servidor local ou pela Vercel, não diretamente como arquivo.</p><button class="button" id="retry">Tentar novamente</button></div>`;$('#retry').onclick=()=>location.reload();}
}
init();
