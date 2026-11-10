import{useMemo}from'react'
import type{ConnectedPolicy}from'./connectedCampusTypes'
export type BaselineMetrics={S_sum_s:number;mean_scheduled_cost_s:number;p95_scheduled_cost_s:number;source_schedule_entry_wait_s:number;max_observed_continuous_stop_s:number;in_network_duration_s:number}
type Trip={cost:number;delta:number;arrival:number;depart:number;entry_wait:number;duration:number;max_continuous_stop:number}
type Ledger={id:string;runs:Record<ConnectedPolicy,Trip>}
type FullBaseline={vehicles:Ledger[];runs:Record<ConnectedPolicy,{label:string;run_id:string;metrics:BaselineMetrics;arrived:number}>;baseline_comparison:{structural_pair_passed:boolean;paired:number;benefited:number;harmed:number;unchanged:number;worst_harm_s:number};joint_candidate_admitted:false}
export function baselineEvidence(value:unknown):FullBaseline|null{
 const data=value as FullBaseline;if(!data?.baseline_comparison)return null
 const c=data.baseline_comparison
 if(!c.structural_pair_passed||data.joint_candidate_admitted!==false||!Array.isArray(data.vehicles)||c.paired!==data.vehicles.length)throw Error('同需求对照身份不完整')
 for(const arm of ['fixed','pressure']as const){const run=data.runs?.[arm];if(!run||run.arrived!==c.paired||!['S_sum_s','mean_scheduled_cost_s','p95_scheduled_cost_s','source_schedule_entry_wait_s','max_observed_continuous_stop_s','in_network_duration_s'].every(k=>Number.isFinite(run.metrics[k as keyof BaselineMetrics])))throw Error('对照指标未完整核验')}
 const ds=data.vehicles.map(v=>v.runs.pressure.cost-v.runs.fixed.cost)
 if(ds.some(d=>!Number.isFinite(d))||ds.filter(d=>d>.01).length!==c.harmed||ds.filter(d=>d<-.01).length!==c.benefited||ds.filter(d=>Math.abs(d)<=.01).length!==c.unchanged||Math.abs(Math.max(...ds)-c.worst_harm_s)>1e-7)throw Error('逐车损益与汇总不一致')
 return data
}
export const metricText=(v:number,d=1)=>v.toLocaleString('zh-CN',{minimumFractionDigits:d,maximumFractionDigits:d})
export default function LHBaselineComparison({common,onVehicle}:{common:unknown;onVehicle:(id:string)=>void}){
 const e=useMemo(()=>baselineEvidence(common),[common]);if(!e)return null
 const c=e.baseline_comparison,rows:[string,keyof BaselineMetrics,string][]=[['全程总耗时','S_sum_s','车秒'],['入网前等待','source_schedule_entry_wait_s','秒'],['入网后行程','in_network_duration_s','车秒'],['95%车辆全程耗时','p95_scheduled_cost_s','秒'],['最长连续停车','max_observed_continuous_stop_s','秒']]
 const harmed=e.vehicles.filter(v=>v.runs.pressure.cost-v.runs.fixed.cost>.01).sort((a,b)=>(b.runs.pressure.cost-b.runs.fixed.cost)-(a.runs.pressure.cost-a.runs.fixed.cost))
 return <section className="baseline-comparison" aria-label="校区同需求基线对照"><div className="baseline-title"><h3>同需求方案对照</h3><span>{c.paired}辆 · 同一需求与路网</span></div><table className="baseline-metrics"><thead><tr><th>指标</th><th>固定配时</th><th>压力基线</th><th>压力－固定</th></tr></thead><tbody>{rows.map(([label,key,unit])=>{const f=e.runs.fixed.metrics[key],p=e.runs.pressure.metrics[key],d=p-f;return <tr key={key}><th>{label}<small>{unit}</small></th><td data-metric={'fixed/'+key}>{metricText(f)}</td><td data-metric={'pressure/'+key}>{metricText(p)}</td><td className={d<-.01?'benefit':d>.01?'harm':''} data-metric={'delta/'+key}>{d>.01?'+':''}{metricText(d)}</td></tr>})}<tr><th>完成车辆<small>辆</small></th><td data-metric="fixed/arrived">{e.runs.fixed.arrived}</td><td data-metric="pressure/arrived">{e.runs.pressure.arrived}</td><td>相同</td></tr></tbody></table>
 <div className="baseline-risk"><span><b>{c.benefited}</b>辆受益</span><span><b>{c.unchanged}</b>辆不变</span><strong><b>{c.harmed}</b>辆受损（{metricText(c.harmed/c.paired*100)}%）</strong><span>最差增加 <b>{metricText(c.worst_harm_s)}</b>秒</span></div><p className="dual-help">比较两种规则基线，总耗时下降仍有个体受损；尚未证明联合AI或实际事件处置收益。</p>
 <details className="baseline-harmed"><summary>受损车辆明细（{harmed.length}辆）</summary><div className="baseline-harmed-scroll"><table><thead><tr><th>车辆</th><th>固定／压力耗时</th><th>增加</th><th>回放</th></tr></thead><tbody>{harmed.map(v=><tr key={v.id}><th>{v.id}</th><td>{metricText(v.runs.fixed.cost)} / {metricText(v.runs.pressure.cost)}</td><td className="harm">+{metricText(v.runs.pressure.cost-v.runs.fixed.cost)}秒</td><td><button onClick={()=>onVehicle(v.id)} aria-label={'定位受损车辆 '+v.id}>定位</button></td></tr>)}</tbody></table></div></details></section>
}
