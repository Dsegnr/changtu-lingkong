import type{ConnectedRun}from'./connectedCampusTypes'
export function signalRecordRows(run:ConnectedRun){
 const previous=new Map<string,string>(),rows:{time:number;node:string;stage:string;approach:string;reason:string;state:string;pending:string|null;queue:number}[]=[]
 for(const frame of run.frames)for(const[node,a]of Object.entries(frame.junctions)){
  const signature=JSON.stringify([a.state,a.stage,a.approach,a.pending,a.reason]);if(previous.get(node)===signature)continue;previous.set(node,signature)
  rows.push({time:frame.time,node,stage:a.stage,approach:a.approach,reason:a.reason,state:a.state,pending:a.pending??null,queue:a.observation.reduce((n,o)=>n+o.queue,0)})
 }
 return rows
}
