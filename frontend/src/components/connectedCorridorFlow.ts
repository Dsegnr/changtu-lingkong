import type{ConnectedCommon,ConnectedRun,NetworkFrame}from'./connectedCampusTypes'

export interface LinkSample{time:number;entered:number;exited:number;count:number;stopped:number;speed:number|null}
export interface CorridorLink{id:string;from:string;to:string;name:string;samples:LinkSample[]}
export interface LinkWindow{id:string;from:string;to:string;name:string;time:number;start:number;entered:number;exited:number;count:number;stopped:number;speed:number|null;delta:number;queueDelta:number;balanced:boolean}

// External road sections only. Vehicle identity survives lane changes and internal connectors.
export function corridorLinks(common:ConnectedCommon,run:ConnectedRun):CorridorLink[]{
 const nodes=new Set(Object.keys(common.geometry.junctions))
 const edges=common.geometry.edges.filter(e=>nodes.has(e.from)&&nodes.has(e.to))
 const laneEdge=new Map(edges.flatMap(e=>e.lanes.map(l=>[l,e.id]as const)))
 const links=edges.map(e=>({id:e.id,from:e.from,to:e.to,name:e.name,samples:[] as LinkSample[]}))
 let previous=new Map<string,string>(),last=0
 const totals=new Map(links.map(e=>[e.id,{entered:0,exited:0}]))
 for(const frame of run.frames){
  if(frame.time<=last||Math.abs(frame.time-last-run.step)>1e-5)throw Error('路段观测时间缺失或乱序')
  const current=new Map<string,string>(),counts=new Map<string,{n:number;q:number;speed:number}>(),seen=new Set<string>()
  for(const v of frame.vehicles){
   if(seen.has(v.id)||!Number.isFinite(v.speed)||v.speed<0)throw Error('路段车辆记录无效')
   seen.add(v.id);const edge=laneEdge.get(v.lane);if(!edge)continue
   current.set(v.id,edge);const a=counts.get(edge)??{n:0,q:0,speed:0}
   a.n++;a.q+=Number(v.speed<.1);a.speed+=v.speed;counts.set(edge,a)
  }
  for(const[id,edge]of previous)if(current.get(id)!==edge)totals.get(edge)!.exited++
  for(const[id,edge]of current)if(previous.get(id)!==edge)totals.get(edge)!.entered++
  for(const link of links){
   const a=counts.get(link.id)??{n:0,q:0,speed:0},total=totals.get(link.id)!
   if(total.entered-total.exited!==a.n)throw Error('路段车辆收支不平')
   link.samples.push({time:frame.time,...total,count:a.n,stopped:a.q,speed:a.n?a.speed/a.n:null})
  }
  previous=current;last=frame.time
 }
 return links
}

function sampleAt(samples:LinkSample[],time:number):LinkSample{
 if(!samples.length||time<samples[0].time-1e-7)return{time:0,entered:0,exited:0,count:0,stopped:0,speed:null}
 let a=0,b=samples.length-1
 while(a<b){const m=Math.ceil((a+b)/2);if(samples[m].time<=time+1e-7)a=m;else b=m-1}
 return samples[a]
}

export function linkWindow(link:CorridorLink,time:number,window=30):LinkWindow{
 if(window<=0||!Number.isFinite(time))throw Error('无效路段统计窗口')
 const end=sampleAt(link.samples,time),start=Math.max(0,end.time-window),before=sampleAt(link.samples,start)
 const entered=end.entered-before.entered,exited=end.exited-before.exited,delta=end.count-before.count
 return{id:link.id,from:link.from,to:link.to,name:link.name,time:end.time,start,entered,exited,count:end.count,
        stopped:end.stopped,speed:end.speed,delta,queueDelta:end.stopped-before.stopped,balanced:delta===entered-exited}
}

export function activeApproachIndex(common:ConnectedCommon,frame:NetworkFrame,junction:string){
 const j=common.geometry.junctions[junction],a=frame.junctions[junction]
 return j?.approaches.find(p=>p.id===a?.approach)?.indices[0]??0
}
