import type{ConnectedCommon,ConnectedRun,NetworkFrame}from'./connectedCampusTypes'
import{controlStages,controlReasons,controlVetos}from'./connectedControlEvidence'
import{signalTime}from'./connectedSignalTiming'

export default function CampusControlPanel({common,run,frame,focus,onJunction,onExample}:{common:ConnectedCommon;run:ConnectedRun;frame:NetworkFrame;focus:string|null;onJunction:(id:string)=>void;onExample?:()=>void}){
 const j=focus?common.geometry.junctions[focus]:null,a=j?frame.junctions[j.id]:null
 if(!j||!a)return <section className="campus-current-control"><h3>走廊控制节点</h3><p>选择路口，核验当前观测与执行。</p>{Object.values(common.geometry.junctions).map(j=><button className="campus-node-choice" key={j.id} onClick={()=>onJunction(j.id)}>{j.id} · {j.name}</button>)}</section>
 const name=(id:string|null)=>j.approaches.find(p=>p.id===id)?.label??'尚未锁定',timing=signalTime(run,j.id,j.approaches.find(p=>p.id===a.approach)?.indices[0]??0,frame.time,common.source_hashes.contract)
 return <section className="campus-current-control" data-testid="campus-control-panel" data-stage={a.stage} data-action-time={frame.action_time}>
  <header><small>当前控制节点 · {j.id}</small><h3>{j.name}</h3><p>观测/决策 {frame.action_time.toFixed(1)}s · 车辆 {frame.time.toFixed(1)}s</p></header>
  <div className={'connected-phase '+a.stage}><i/>{controlStages[a.stage]}</div>{timing&&<div className="connected-phase-time"><strong>{timing.label}</strong><span>{timing.kind==='remaining'?'已确认阶段剩余':'当前灯色已持续'}</span></div>}
  {onExample&&<button className="connected-control-example" onClick={onExample}>排队调控示例</button>}<h4>进口观测与压力</h4><table className="campus-pressure-table"><thead><tr><th>进口</th><th>排队</th><th title="进口排队数减去净压力，等于控制器下游项的合计折算，非独立传感器观测">下游折算</th><th>净压力</th></tr></thead><tbody>{j.approaches.map((p,i)=>{const o=a.observation[i];return <tr key={p.id} className={a.stage==='green'&&a.approach===p.id?'passing':a.pending===p.id?'pending':''}><th>{p.label.replace('·',' / ')}</th><td>{o.queue}</td><td>{(o.queue-o.pressure).toFixed(1)}</td><td>{o.pressure.toFixed(1)}</td></tr>})}</tbody></table>
  {j.control==='signal_scenario'?<><h4>本步决策与执行</h4><dl className="campus-decision-facts"><dt>压力候选</dt><dd>{name(a.raw_candidate)}</dd><dt>生效约束</dt><dd>{a.metadata_availability?.veto===false||a.veto===null?'未记录':a.veto.length?a.veto.map(v=>controlVetos[v]??v).join('、'):'本步无否决'}</dd><dt>选择依据</dt><dd>{controlReasons[a.reason]??a.reason}</dd><dt>执行状态</dt><dd>{a.stage==='green'?'保持放行 · '+name(a.approach):a.stage==='yellow'?'原进口黄灯保护':'全红清空'}</dd><dt>锁定下一进口</dt><dd>{name(a.pending)}</dd></dl><p className="campus-control-caption">候选方向须通过约束；黄灯和全红期间不直接换成绿灯。已红/已绿是持续时间。</p></>:<p className="campus-control-caption">此节点按研究优先关系让行，不设置模拟信号灯或配时决策。</p>}
  <details className="campus-control-provenance"><summary>控制与数据口径</summary><p>可解释压力规则基线；每步读取观测，普通压力评估周期10秒，绿灯10–30秒，黄灯3秒、全红2秒。等待优先采用原控制器记时口径。当前为冻结仿真回放，未训练AI模型或接入路侧设备。</p><p>下游折算由原进口排队和压力相减得到。共享车道按物理车道去重；这不是新增现场车流观测。</p><code>{run.run_id}</code></details>
 </section>
}
