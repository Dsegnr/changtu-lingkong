import{useMemo}from'react'
import type{ConnectedCommon,ConnectedRun,NetworkFrame}from'./connectedCampusTypes'
import{signalTime}from'./connectedSignalTiming'
import{activeApproachIndex,corridorLinks,linkWindow}from'./connectedCorridorFlow'
import{controlStages,controlReasons,controlEvents}from'./connectedControlEvidence'

export default function CorridorOverview({common,run,frame,focus,onJunction}:{common:ConnectedCommon;run:ConnectedRun;frame:NetworkFrame;focus:string|null;onJunction:(id:string)=>void}){
 const links=useMemo(()=>corridorLinks(common,run),[common,run]),events=useMemo(()=>controlEvents(run),[run])
 const nodes=['A','D','B','C'].map(id=>common.geometry.junctions[id]).filter(Boolean)
 const rows=links.map(link=>linkWindow(link,frame.time))
 return <section className="corridor-overview" aria-label="走廊多节点与路段状态" data-testid="corridor-overview" data-time={frame.time}>
  <header><div><h3>走廊运行</h3><p>伊河路 A—D—B / 工人路 B—C</p></div><span>同一仿真时刻 {frame.time.toFixed(1)}s</span></header>
  <div className="corridor-nodes">{nodes.map(j=>{
   const a=frame.junctions[j.id],timing=signalTime(run,j.id,activeApproachIndex(common,frame,j.id),frame.time,common.source_hashes.contract)
   const event=events.filter(e=>e.junction===j.id&&e.time<=frame.time+1e-7).at(-1),queue=a.observation.reduce((n,o)=>n+o.queue,0)
   return <button key={j.id} onClick={()=>onJunction(j.id)} aria-pressed={focus===j.id} data-node={j.id} data-stage={a.stage}>
    <span className="corridor-node-title"><b>{j.id}</b><span>{j.name}</span></span>
    <span className={'corridor-stage '+a.stage}><i/>{controlStages[a.stage]}<strong>{timing?.label??'按优先关系让行'}</strong></span>
    <span className="corridor-node-detail">进口排队 <b>{queue}</b> 辆{event&&<small>最近动作 {event.actionTime.toFixed(1)}s · {controlReasons[event.reason]??event.reason}</small>}</span>
   </button>
  })}</div>
  <div className="corridor-flow-heading"><h4>双向路段收支</h4><span>最近{Math.min(30,frame.time).toFixed(1)}秒 · 进入 − 离开 = 在段增减</span></div>
  <div className="corridor-flow-scroll" tabIndex={0} role="region" aria-label="双向路段车流统计，窄屏可左右滑动"><table><thead><tr><th>方向 / 道路</th><th>进入</th><th>离开</th><th>在段</th><th>增减</th><th>停车 / 变化</th><th>均速</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} data-link={r.id} data-balanced={String(r.balanced)} data-count={r.count} data-entered={r.entered} data-exited={r.exited} data-delta={r.delta}>
   <th>{r.from} → {r.to}<small>{r.name}</small></th><td>{r.entered}</td><td>{r.exited}</td><td>{r.count}</td><td className={r.delta>0?'corridor-accumulating':''}>{r.delta>0?'+':''}{r.delta}</td><td>{r.stopped}<small> / {r.queueDelta>0?'+':''}{r.queueDelta}</small></td><td>{r.speed===null?'—':(r.speed*3.6).toFixed(1)}<small>{r.speed===null?'无车':' km/h'}</small></td>
  </tr>)}</tbody></table></div>
  <details><summary>统计与控制范围</summary><p>统计取原始0.2秒车辆快照；同路段换道不重复计数。进入/离开指外部路段边界，内部转弯连接不计在段。停车为速度低于0.1m/s；均速为当前在段车辆瞬时均值，非实测道路速度。当前为多节点压力基线回放，尚未接入到达预测或走廊协调控制。</p></details>
 </section>
}
