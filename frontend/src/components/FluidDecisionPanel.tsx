import{recordedPhaseRemaining}from'./connectedSignalTiming'
import type{NetworkFrame}from'./connectedCampusTypes'
import{metricText}from'./LHBaselineComparison'
import type{FluidAnalysis,FluidCommon,FluidArm,FluidRun}from'./fluidJointTypes'
export default function FluidDecisionPanel({analysis,common,run,frame,arm,time,onSeek,onJoint}:{analysis:FluidAnalysis;common:FluidCommon;run:FluidRun;frame:NetworkFrame;arm:FluidArm;time:number;onSeek:(t:number,node?:string)=>void;onJoint:()=>void}){
 const plans=analysis.plans.joint,plan=plans.filter(p=>p.time_s<=time+1e-7).at(-1),changed=plan?.nodes.filter((_,i)=>plan.selected[i]!==plan.same_state_q_suggestion[i])??[]
 const nonReference=plans.filter(p=>p.selected.some((a,i)=>a!==p.same_state_q_suggestion[i]))
 const name=(node:string,index:number)=>common.geometry.junctions[node].approaches[index]?.label??'未记录'
 return <section className="fluid-decision-panel" aria-label="联合规划与执行记录" data-model-plan={arm==='joint'?plan?.id:undefined}>
  <header><h3>协同决策记录</h3><span>开发验证</span></header><div className="fluid-node-now" aria-label="当前多路口灯态">{Object.values(common.geometry.junctions).filter(j=>frame.junctions[j.id].stage!=='priority').map(j=>{const a=frame.junctions[j.id],left=recordedPhaseRemaining(run,j.id,time);return <button key={j.id} data-live-node={j.id} data-live-stage={a.stage} data-live-time={time} onClick={()=>onSeek(time,j.id)}><b>{j.id}</b><span><i style={{background:a.stage==='green'?'#23846d':a.stage==='yellow'?'#b97b16':'#be4b4b'}}/>{a.stage==='green'?'绿灯':a.stage==='yellow'?'黄灯':'全红'}</span><small>{left===null?'—':Math.ceil(left-1e-7)+'秒'}记录余量</small></button>})}</div>
  {arm==='q'?<><p>当前为压力参考的实际执行。联合规划来自另一条执行路径，应切到候选后检查。</p><button onClick={onJoint}>查看联合候选</button></>:<>
   {plan?<><h4>控制请求 / {plan.time_s.toFixed(1)}秒</h4><p className="fluid-request-label">{changed.length?changed.map(node=>node+' '+name(node,plan.selected[plan.nodes.indexOf(node)])).join('；'):'保持同状态压力建议'}</p>
   {analysis.actual_coordination_windows.filter(w=>Math.abs(w.request_time_s-plan.time_s)<1e-6).map(w=><div className="fluid-actual-window" key={w.node+w.request_time_s}><span>{w.node} 请求 {w.request_time_s.toFixed(1)}秒</span><button onClick={()=>onSeek(w.first_actual_target_green_s,w.node)}>查看{w.first_actual_target_green_s.toFixed(1)}秒实际绿灯</button></div>)}
   <details className="fluid-model-details"><summary>条件模型与约束 / {plan.candidate_count}组候选</summary><table className="fluid-model-table"><caption>条件模型：未来{plan.model_horizon_s}秒的等待估计</caption><thead><tr><th>路径假设</th><th>同状态参考</th><th>本次候选</th></tr></thead><tbody>{plan.selected_wait_s.map((value,i)=><tr key={i}><th>{i+1}</th><td data-model-value={'reference/'+i}>{metricText(plan.same_state_reference_wait_s[i])}秒</td><td data-model-value={'selected/'+i}>{metricText(value)}秒</td></tr>)}</tbody></table><p className="fluid-model-caveat">模型数值是条件估计，使用假设路径和有限接收近似；未来入流与换道仍有缺口。它不是完整全程耗时预测，也不等于下方原生对照结果。</p></details></>:<p>尚未到首个联合规划时点。可定位下方已录制的决策。</p>}
   <details><summary>联合请求记录（{nonReference.length}次）</summary><div className="fluid-plan-links">{nonReference.map(p=><button key={p.id} onClick={()=>onSeek(p.time_s,p.nodes.find((_,i)=>p.selected[i]!==p.same_state_q_suggestion[i]))}>{p.time_s.toFixed(1)}秒 / {p.nodes.filter((_,i)=>p.selected[i]!==p.same_state_q_suggestion[i]).join('、')}</button>)}</div></details>
  </>}
 </section>
}
