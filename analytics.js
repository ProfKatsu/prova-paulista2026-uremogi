export const defaults = {target:60,critical:45,participation:90,drop:3,gain:5,zeroPolicy:'exclude'};
export const names = {score:'Acertos gerais',MAT:'Matemática',PORT:'Língua Portuguesa',ING:'Língua Inglesa',HIST:'História',GEO:'Geografia',CIE:'Ciências',FILO:'Filosofia',SOC:'Sociologia',BIO:'Biologia','FÍS':'Física',QUI:'Química',FIN:'Educação Financeira',TEC:'Tecnologia'};
export const valid = v => typeof v==='number' && Number.isFinite(v);
export function value(term,metric='score',zeroPolicy='exclude'){
  const v=metric==='score'?term?.score:term?.subjects?.[metric];
  return valid(v) && !(metric!=='score' && v===0 && zeroPolicy==='exclude')?v*100:null;
}
export const mean = xs => {const a=xs.filter(valid);return a.length?a.reduce((s,v)=>s+v,0)/a.length:null;};
export const delta = (a,b) => valid(a)&&valid(b)?b-a:null;
export function classify(current,change,participation,cfg=defaults){
  if(!valid(current)) return 'Sem dado';
  if(current<cfg.critical) return 'Intensiva';
  if((valid(change)&&change<=-cfg.drop)||current<cfg.target||(valid(participation)&&participation<cfg.participation)) return 'Acompanhamento';
  return 'Manutenção';
}
export function schoolRow(s,metric,cfg=defaults){
  const terms=[1,2,3].map(i=>s.terms.find(t=>t.term===i));
  const scores=terms.map(t=>value(t,metric,cfg.zeroPolicy));
  const change=delta(scores[0],scores[2]), recent=delta(scores[1],scores[2]);
  const participation=valid(terms[2]?.participation)?terms[2].participation*100:null;
  const reasons=[];
  if(valid(scores[2])&&scores[2]<cfg.critical) reasons.push('Resultado abaixo do limite intensivo');
  else if(valid(scores[2])&&scores[2]<cfg.target) reasons.push('Resultado abaixo da referência');
  if(valid(recent)&&recent<=-cfg.drop) reasons.push('Queda recente');
  if(valid(participation)&&participation<cfg.participation) reasons.push('Participação abaixo da referência');
  if(!valid(scores[2])) reasons.push('Sem resultado utilizável no 3º bimestre');
  return {...s,scores,change,recent,participation,students:terms[2]?.students,
    priority:classify(scores[2],recent,participation,cfg),reasons,
    goal:valid(scores[2])?Math.min(100,scores[2]+cfg.gain):null};
}
export function paired(rows,a=0,b=2){
  const common=rows.filter(r=>valid(r.scores[a])&&valid(r.scores[b]));
  return {n:common.length,change:mean(common.map(r=>r.scores[b]-r.scores[a]))};
}
export function csv(rows){
  return '\ufeff'+rows.map(r=>r.map(v=>{
    let s=v==null?'':String(v);
    if(/^[=+\-@\t\r]/.test(s)) s="'"+s;
    return '"'+s.replaceAll('"','""')+'"';
  }).join(';')).join('\r\n');
}
export function validateBackup(x,ids){
  if(x?.version!==1||!x.plans||typeof x.plans!=='object'||Array.isArray(x.plans)) throw new Error('Arquivo de planos inválido.');
  const plans={};
  for(const [id,p] of Object.entries(x.plans)){
    if(!ids.includes(id)||!p||typeof p!=='object')throw new Error('Escola ou plano inválido.');
    if(!valid(p.goal)||p.goal<0||p.goal>100)throw new Error('Meta deve estar entre 0 e 100.');
    if(!['Não iniciado','Em andamento','Concluído'].includes(p.status))throw new Error('Status inválido.');
    for(const f of ['owner','date','action','evidence']) if(typeof p[f]!=='string'||p[f].length>10000)throw new Error('Campo inválido.');
    if(p.date&&!/^\d{4}-\d{2}-\d{2}$/.test(p.date))throw new Error('Prazo inválido.');
    plans[id]={goal:p.goal,status:p.status,owner:p.owner,date:p.date,action:p.action,evidence:p.evidence};
  }
  return plans;
}
