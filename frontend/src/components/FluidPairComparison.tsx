import{metricText}from'./LHBaselineComparison'
import type{FluidCommon,FluidMetrics}from'./fluidJointTypes'
const rows:{key:keyof FluidMetrics;label:string;unit:string}[]=[{key:'S_sum_s',label:'全程总耗时',unit:'车秒'},{key:'source_schedule_entry_wait_s',label:'入网前等待',unit:'秒'},{key:'in_network_duration_s',label:'入网后行程',unit:'车秒'},{key:'p95_scheduled_cost_s',label:'95%车辆全程耗时',unit:'秒'},{key:'max_observed_continuous_stop_s',label:'最长连续停车',unit:'秒'}]
export default function FluidPairComparison({common,onVehicle}:{common:FluidCommon;onVehicle:(id:string)=>void}){
 const c=common.pair_comparison,harmed=common.vehicles.filter(v=>v.runs.joint.delta>.01).sort((a,b)=>b.runs.joint.delta-a.runs.joint.delta)
 return <section className="baseline-comparison fluid-pair-comparison" aria-label="联合候选同需求原生对照" data-cohort={common.cohort_id}>
  <header className="baseline-title"><h3>同需求原生执行对照</h3><span>23辆 / 同路网 / 同一日期时序</span></header>
  <div className="baseline-harmed-scroll"><table className="baseline-metrics"><thead><tr><th>指标</th><th>压力参考</th><th>联合候选</th><th>候选－参考</th></tr></thead><tbody>{rows.map(row=>{const q=common.runs.q.metrics[row.key],joint=common.runs.joint.metrics[row.key];return <tr key={row.key}><th scope="row">{row.label}<small>{row.unit}</small></th><td data-fluid-metric={'q/'+row.key}>{metricText(q)}</td><td data-fluid-metric={'joint/'+row.key}>{metricText(joint)}</td><td data-fluid-metric={'delta/'+row.key}>{metricText(joint-q)}</td></tr>})}<tr><th>完成车辆<small>辆</small></th><td>23</td><td>23</td><td>相同</td></tr></tbody></table></div>
  <div className="baseline-risk"><span>{c.benefited}辆受益</span><span>{c.unchanged}辆不变</span><strong>{c.harmed}辆受损</strong><span>最差增加 {metricText(Math.max(0,c.worst_S_delta_s))}秒</span></div>
  <p className="fluid-validation-note">{Object.values(c.gates).every(Boolean)?'本开发案例通过既定耗时、最长停车和个体风险比例检查；':'本开发案例未通过全部既定检查；'}尚未取得全量或生产准入。条件模型的逐车准入不保证实际无人受损。</p>
  <details open={harmed.length>0}><summary>受损车辆明细（{harmed.length}辆）</summary>{harmed.length?<ul className="fluid-harm-list">{harmed.map(v=><li key={v.id}><header><h4>{v.id}</h4><button onClick={()=>onVehicle(v.id)}>定位车辆</button></header><dl><div><dt>参考全程</dt><dd>{metricText(v.runs.q.cost)}秒</dd></div><div><dt>候选全程</dt><dd>{metricText(v.runs.joint.cost)}秒</dd></div><div><dt>增加耗时</dt><dd className="harm" data-fluid-harm={v.id}>+{metricText(v.runs.joint.delta)}秒</dd></div></dl></li>)}</ul>:<p>本案例没有全程耗时增加超过0.01秒的车辆，不代表其他日期或负荷无风险。</p>}</details>
  <details className="fluid-accounting"><summary>指标定义与对照边界</summary><p>全程耗时＝原计划出发到原生到达，包含入网前等待。最长连续停车沿用原验收定义，为连续停止样本首末时刻跨度；不是停止样本数乘步长。两臂23个身份逐一配对，各日期属于不同开发场景，逐车观测不能当作独立实验次数。</p><p>这里比较两次完整原生执行；右侧规划面板比较同一时点、同一状态下的条件模型，两种参考不能互换。源时序来自FLUID，本地路线含迁移假设，未保留真实校园OD；相关日期已在研究与开发中查阅，不是未见日期留出。</p></details>
 </section>
}
