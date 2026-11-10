import {policyLabels} from './g4ClosedLoopPlayback'
import type {G4Policy} from './g4ClosedLoopTypes'
import {signedTime,tripDifference,type TotalTimeCase} from './g4TotalTime'
import '../g4TotalTime.css'
const policies:G4Policy[]=['P','G3','G4']
const tone=(n:number)=>n>.2?'g4-harm':n<-.2?'g4-gain':''
export default function G4TotalTimePanel({recording,policy,baseline,onBaseline,chosen,onChoose}:{recording:TotalTimeCase;policy:G4Policy;baseline:G4Policy;onBaseline:(p:G4Policy)=>void;chosen:string;onChoose:(id:string)=>void}){
 const delta=tripDifference(recording,policy,baseline),run=recording.runs[policy],other=recording.runs[baseline]
 const rows=[...run.vehicles].sort((a,b)=>(b.whole_trip_s-other.vehicles.find(v=>v.id===b.id)!.whole_trip_s)-(a.whole_trip_s-other.vehicles.find(v=>v.id===a.id)!.whole_trip_s))
 const g4vsG3=tripDifference(recording,'G4','G3'),labels=policyLabels
 const harmed=rows.filter(v=>v.whole_trip_s-other.vehicles.find(w=>w.id===v.id)!.whole_trip_s>.2+1e-6).length
 return <section className="g4-whole-trip" aria-label="全程耗时与入网等待核查">
  <header><div><h3>全程耗时核查</h3><p>整段仿真、各14车全部到达；以下统计独立于回放时刻。</p></div><label>对照策略<select aria-label="全程对照策略" value={baseline} onChange={e=>onBaseline(e.target.value as G4Policy)}><option value="G3">接收约束规则（G3）</option><option value="P">网络压力规则（P）</option></select></label></header>
  <div className="g4-whole-summary" data-testid="whole-trip-comparison"><div><span>{labels[policy]} − {labels[baseline]}</span><strong className={tone(delta.whole)}>{signedTime(delta.whole)}<small> 车秒</small></strong><p>计划出发到到达 · {harmed}辆耗时增加</p></div><dl><dt>入网前等待差</dt><dd className={tone(delta.preEntry)}>{signedTime(delta.preEntry)}秒</dd><dt>入网后行程差</dt><dd className={tone(delta.inNetwork)}>{signedTime(delta.inNetwork)}秒</dd><dt>行驶速度损失差</dt><dd className={tone(delta.speedLoss)}>{signedTime(delta.speedLoss,2)}车秒</dd></dl></div>
  <p className={'g4-objective-note '+(g4vsG3.whole>.2?'has-tradeoff':'')} data-testid="whole-trip-tradeoff">{g4vsG3.whole>.2&&g4vsG3.speedLoss<-.2?<>联合控制相对G3：速度损失降低 {(-g4vsG3.speedLoss).toFixed(2)} 车秒，全程耗时增加 <b>{g4vsG3.whole.toFixed(1)} 车秒</b>，入网前等待增加 {g4vsG3.preEntry.toFixed(1)} 秒。这组记录不能说明联合控制全面更优。</>:<>联合控制相对G3：全程耗时变化 {signedTime(g4vsG3.whole)} 车秒，入网前等待变化 {signedTime(g4vsG3.preEntry)} 秒；仍须逐车核查和其他需求验证。</>}</p>
  <div className="g4-whole-table-wrap"><table className="g4-whole-table" aria-label="三策略完整耗时"><thead><tr><th>执行策略</th><th>计划出发至到达</th><th>入网前等待</th><th>入网后行程</th><th>行驶速度损失</th></tr></thead><tbody>{policies.map(p=>{const r=recording.runs[p];return <tr key={p} data-policy={p} data-selected={p===policy}><th>{labels[p]}</th><td>{r.total_whole_trip_s.toFixed(1)}<small>车秒</small></td><td>{r.total_pre_entry_wait_s.toFixed(1)}<small>秒</small></td><td>{r.total_in_network_duration_s.toFixed(1)}<small>车秒</small></td><td>{r.total_speed_loss_s.toFixed(2)}<small>车秒</small></td></tr>})}</tbody></table></div>
  <p className="g4-whole-definition">全程耗时 = 入网前等待 + 入网后行程。速度损失按相对道路自由速度另行累计，不能当作全程耗时，也不与行程时长相加。</p>
  <details className="g4-trip-ledger"><summary>逐车计划发车、入网与到达明细</summary><p>按当前策略相对{labels[baseline]}的全程耗时差降序排列。点车辆可定位回放中的首次出现。</p><div className="g4-whole-table-wrap"><table aria-label="逐车全程耗时"><thead><tr><th>车辆</th><th>计划发车</th><th>实际入网</th><th>到达</th><th>全程耗时</th><th>入网前等待</th><th>对照耗时差</th></tr></thead><tbody>{rows.map(v=>{const d=v.whole_trip_s-other.vehicles.find(w=>w.id===v.id)!.whole_trip_s;return <tr key={v.id} data-vehicle={v.id} data-chosen={chosen===v.id}><th><button onClick={()=>onChoose(v.id)}>{v.id}</button></th><td>{v.planned_departure_s.toFixed(1)}s</td><td>{v.actual_departure_s.toFixed(1)}s</td><td>{v.arrival_s.toFixed(1)}s</td><td>{v.whole_trip_s.toFixed(1)}s</td><td>{v.pre_entry_wait_s.toFixed(1)}s</td><td className={tone(d)}>{signedTime(d)}s</td></tr>})}</tbody></table></div></details>
 </section>
}
