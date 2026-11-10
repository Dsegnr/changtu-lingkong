import type{ConnectedRun}from'./connectedCampusTypes'

// Verified against frozen connected_campus_network_four_20261023_02/contract.json.
export const controlContract='fe2919498df9def6f49770f5bd419e05c91194fbcf922c2345add6f9a7abdf25'
export const controlTiming={minGreen:10,maxGreen:30,yellow:3,allRed:2,decisionPeriod:10,redPriority:90}
export interface SignalTime{light:string;elapsed:number;remaining:number|null;label:string;kind:'elapsed'|'remaining'}
export function recordedPhaseRemaining(run:Pick<ConnectedRun,'changes'|'recorded_signal_timeline'>,junction:string,time:number):number|null{
 if(!run.recorded_signal_timeline)return null
 const changes=run.changes[junction];if(!changes?.length||time<changes[0].time-1e-7)return null
 const next=changes.find(c=>c.time>time+1e-7)
 return next?Math.max(0,next.time-time):null
}
export function signalTime(run:ConnectedRun<string>,junction:string,index:number,time:number,contract:string):SignalTime|null{
 const changes=run.changes[junction];if(!changes?.length||time<changes[0].time-1e-7)return null
 let lo=0,hi=changes.length-1;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(changes[m].time<=time+1e-7)lo=m;else hi=m-1}
 const current=changes[lo];if(current.stage==='priority')return null
 const light=current.state[index];if(!light)return null
 let since=changes[0].time;for(let i=lo;i>0;i--)if(changes[i-1].state[index]!==light){since=changes[i].time;break}
 const elapsed=Math.max(0,time-since),stageElapsed=Math.max(0,time-current.time),verified=contract===controlContract
 if(run.recorded_signal_timeline){const next=changes.slice(lo+1).find(c=>c.state[index]!==light);if(next){const remaining=Math.max(0,next.time-time);return{light,elapsed,remaining,kind:'remaining',label:'回放余'+Math.ceil(remaining-1e-7)+'s'}}}
 const duration=current.stage==='yellow'&&light==='y'?controlTiming.yellow:current.stage==='all_red'?controlTiming.allRed:run.policy==='fixed'&&light==='G'?controlTiming.maxGreen:null
 const remaining=verified&&duration!==null?Math.max(0,duration-stageElapsed):null
 if(remaining!==null){const prefix=current.stage==='all_red'?'清空余':'余';return{light,elapsed,remaining,kind:'remaining',label:prefix+Math.ceil(remaining-1e-7)+'s'}}
 return{light,elapsed,remaining:null,kind:'elapsed',label:(light==='G'?'已绿':light==='y'?'已黄':'已红')+Math.floor(elapsed+1e-7)+'s'}
}
