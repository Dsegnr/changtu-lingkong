import type {ConnectedRun, NetworkFrame, NetworkJunction} from './connectedCampusTypes'

export type PhaseSegment = {start:number;end:number;stage:string;state:string;approach:string}
export type PhaseTrack = {id:string;segments:PhaseSegment[]}

/** Presentation of observed post-step records only. Never extends past the last sample. */
export function buildPhaseTracks(run:ConnectedRun<string>, ids:string[]):PhaseTrack[] {
  if (!(run.step>0) || !Number.isFinite(run.step)) throw Error('相位记录采样步长无效')
  const tracks=ids.map(id=>({id,segments:[] as PhaseSegment[]}))
  let previous=-Infinity
  for(const frame of run.frames){
    if(!Number.isFinite(frame.time)||frame.time<=previous)throw Error('相位记录时间必须递增')
    for(const track of tracks){
      const a=frame.junctions[track.id],last=track.segments.at(-1)
      if(!a){if(last)last.end=previous;continue}
      const gap=frame.time-previous>run.step*1.01
      if(!last||gap||last.end<previous-1e-7||last.stage!==a.stage||last.state!==a.state||last.approach!==a.approach){
        if(last&&last.end>=previous-1e-7)last.end=gap?previous:frame.time
        track.segments.push({start:frame.time,end:frame.time,stage:a.stage,state:a.state,approach:a.approach})
      }else last.end=frame.time
    }
    previous=frame.time
  }
  return tracks
}

export function phaseWindow(time:number, first:number, last:number, span=90){
  if(![time,first,last,span].every(Number.isFinite)||last<first||span<=0)throw Error('回放窗口无效')
  const start=Math.max(first,Math.min(Math.floor((time-30)/10)*10,Math.max(first,last-span)))
  return {start,end:Math.min(last,start+span)}
}

export function currentQueue(frame:NetworkFrame,junctions:NetworkJunction[]){
  const incoming=new Set(junctions.flatMap(j=>j.approaches.flatMap(a=>a.lanes)))
  return frame.vehicles.filter(v=>incoming.has(v.lane)&&v.speed<.1).length
}

export function seekInWindow(x:number,width:number,start:number,end:number){
  if(![x,width,start,end].every(Number.isFinite)||width<=0||end<start)return null
  return Math.round(Math.max(start,Math.min(end,start+(end-start)*Math.max(0,Math.min(1,x/width))))*5)/5
}
