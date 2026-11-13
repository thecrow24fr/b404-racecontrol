// Prototype autonome : ne modifie ni la carte, ni la source, ni le 3001.
const LIMIT_MPS = 90, STALE_MS = 2500, HORIZON_MS = 1000;
function update(state, sample, length) {
  if (!sample || typeof sample !== 'object' || typeof sample.running !== 'boolean' || (sample.sourceAt != null && !Number.isFinite(sample.sourceAt)) || !Number.isFinite(sample.distance) || !Number.isFinite(sample.at) || !Number.isFinite(length) || length<=0 || sample.distance<0 || sample.distance>=length || !Number.isInteger(sample.lap) || sample.lap<0)
    return state ? {...state, v:0} : null;
  if (!state) return { x:sample.distance, last:sample, target:sample.distance, v:0, clock:sample.at, length };
  // Un changement de circuit exige une réinitialisation explicite par l'appelant.
  if (length !== state.length) return {...state,v:0};
  // Un tour qui régresse pendant un arrêt signale un nouveau repère.
  if (sample.running === false && sample.at > state.last.at && sample.lap < state.last.lap)
    return {x:sample.distance,last:sample,target:sample.distance,v:0,clock:sample.at,length};
  // Un arrêt récent prime sur la déduplication ; ne jamais garder une projection dépassée.
  if (sample.running === false && sample.at > state.last.at && sample.lap === state.last.lap) {
    const target=state.target+sample.distance-state.last.distance;
    return {...state,last:sample,target,x:Math.min(state.x,target),v:0,correction:null,clock:sample.at};
  }
  if (sample.sourceId != null && sample.sourceId === state.last.sourceId) return state;
  if (sample.at<=state.last.at)
    return {...state, v:0};
  const prev=state.last;
  const hasSourceTime=Number.isFinite(sample.sourceAt) && Number.isFinite(prev.sourceAt);
  if (hasSourceTime && sample.sourceAt<=prev.sourceAt) return {...state,v:0};
  const dt=hasSourceTime ? (sample.sourceAt-prev.sourceAt)/1000 : (sample.at-prev.at)/1000;
  const lapDelta=sample.lap-prev.lap;
  let delta=sample.distance-prev.distance;
  if(lapDelta===1 && delta<0) delta+=length;
  const valid=sample.running && prev.running && dt>0 && dt<=5 && lapDelta>=0 && lapDelta<=1 && (lapDelta===0 || sample.distance<prev.distance) && delta>=0 && delta<=LIMIT_MPS*dt;
  const source=state.target+delta;
  // Reprise : accepter un premier point plausible sans estimer de vitesse.
  if (sample.running && !prev.running && dt>0 && dt<=5 && lapDelta===0 && delta>=-30 && delta<=LIMIT_MPS*dt)
    return {...state,last:sample,target:source,v:0,correction:state.x>source ? source : null,clock:sample.at};
  if (sample.running && prev.running && lapDelta===0 && delta<0 && delta>=-30) {
    return {...state,last:sample,target:source,v:0,correction:state.x>source ? source : null,clock:sample.at};
  }
  if (!valid) return {...state,v:0,correction:state.x>state.target ? state.target : null};
  const v=delta/dt;
  const smooth=state.v>0 && v>=state.v*0.8 && v<=state.v*1.2;
  return {...state,last:sample,target:source,v,smooth,correction:state.x>source ? source : null,clock:sample.at};
}
function step(state, time) {
  if (!state || !Number.isFinite(time) || time<state.clock) return state;
  const dt=Math.max(0,Math.min(100,time-state.clock))/1000;
  const age=time-state.last.at;
  if(age>=STALE_MS || !state.last.running) return {...state,clock:time};
  if(Number.isFinite(state.correction)) {
    const x=Math.max(state.correction,state.x-20*dt);
    return {...state,x,correction:x<=state.correction?null:state.correction,clock:time};
  }
  if(state.v<=0) return {...state,x:Math.min(state.target,state.x+20*dt),clock:time};
  const target=state.target+state.v*Math.min(Math.max(0,age),HORIZON_MS)/1000;
  // Conserver une marge de retard pour étaler le rattrapage entre les relevés.
  // Les mêmes plafonds de projection et de franchissement restent en vigueur.
  const speed=Math.max(0,Math.min(LIMIT_MPS,state.v+(target-state.x-(state.smooth ? state.v*1.2 : 0))*0.55));
  const lineLimit=(Math.floor(state.target/state.length)+1)*state.length-0.01;
  const upperLimit=Math.min(lineLimit, state.target+30, target);
  return {...state,x:Math.max(state.x, Math.min(upperLimit, state.x+speed*dt)),clock:time};
}
export {update, step};
