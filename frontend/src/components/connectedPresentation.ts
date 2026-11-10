import type{NetworkFrame,NetworkVehicle}from'./connectedCampusTypes'
import{networkFrameAt}from'./connectedCampusPlayback'
export interface PresentationClock{time:number;stamp:number;speed:number;playing:boolean}
export function presentationTime(clock:PresentationClock,now:number,duration:number){return Math.min(duration,clock.time+(clock.playing?Math.max(0,now-clock.stamp)/1000*clock.speed:0))}
/** Display interpolation only. Discrete observations, lamps and metrics are never rewritten. */
export function presentationVehicles(frames:NetworkFrame[],time:number):NetworkVehicle[]{
 const a=networkFrameAt(frames,time);if(!a)return[]
 // Frames are uniformly spaced; search by time rather than assuming a sample index.
 const b=networkFrameAt(frames,time+.2)
 if(!b||b.time<=a.time||b.time-a.time>.201)return a.vehicles
 const t=Math.max(0,Math.min(1,(time-a.time)/(b.time-a.time)));if(t===0)return a.vehicles
 const next=new Map(b.vehicles.map(v=>[v.id,v]))
 return a.vehicles.map(v=>{
  const w=next.get(v.id)
  // Never blend identities, births, exits or discontinuous recording jumps.
  if(!w||Math.hypot(w.center[0]-v.center[0],w.center[1]-v.center[1])>Math.max(5,Math.max(v.speed,w.speed)*(b.time-a.time)*2+1))return v
  const delta=((w.angle-v.angle+540)%360)-180
  return{...v,center:[v.center[0]+(w.center[0]-v.center[0])*t,v.center[1]+(w.center[1]-v.center[1])*t],angle:(v.angle+delta*t+360)%360}
 })
}
