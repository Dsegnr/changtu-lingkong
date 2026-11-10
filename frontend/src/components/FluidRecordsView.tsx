import{useMemo}from'react'
import{Link,useNavigate}from'react-router-dom'
import{fluidPath}from'../state/TrafficSessionContext'
import{useFluidData}from'./useFluidData'
import{fluidDates,fluidLabel,type FluidDate}from'./fluidJointTypes'
import{fluidExecutionLabel}from'./fluidJointPresentation'
import '../fluidJoint.css'
const stageNames:Record<string,string>={green:'绿灯放行',yellow:'黄灯过渡',all_red:'全红清空',priority:'优先让行'}
export default function FluidRecordsView({onBaseline}:{onBaseline:()=>void}){
 const{session,date,dates,arm,selectDate,selectArm,data,error,reload}=useFluidData(),navigate=useNavigate()
 const events=useMemo(()=>data?data.run.frames.flatMap((frame,i)=>Object.entries(frame.junctions).filter(([node,a])=>{const p=data.run.frames[i-1]?.junctions[node];return !p||p.state!==a.state||p.stage!==a.stage||p.pending!==a.pending}).map(([node,a])=>({time:frame.time,node,a}))):[],[data])
 const locate=(time:number,node:string)=>{if(!data)return;session.current.controlDomain='fluid_joint';session.current.fluid!.bookmarks[data.run.run_id]={run_id:data.run.run_id,time,focus:node,chosen:null};navigate(fluidPath(session,'/police'))}
 return <section className="product-evaluation fluid-records" data-fluid-records={date} data-source-job={data?.index.job_id??'archive'} data-run={data?.run.run_id}><header><div><p>联合验证 / 实际信号回执</p><h2>执行记录</h2></div><div className="fluid-evaluation-controls"><label>需求日期<select aria-label="记录需求日期" value={date} onChange={e=>selectDate(e.target.value as FluidDate)}>{dates.map(d=><option key={d} value={d}>{fluidLabel(d)}</option>)}</select></label><label>实际策略<select aria-label="记录策略" value={arm} onChange={e=>selectArm(e.target.value as typeof arm)}><option value="q">压力参考 q</option><option value="joint">联合候选 joint</option></select></label><button onClick={onBaseline}>双校区基线记录</button></div></header>
  <p>以下为原生动作和灯态记录。模型规划、接受请求和目标绿灯分开，不将候选得分当实际效果。时间从0秒开始。</p>
  {error?<div role="alert">{error}<button onClick={reload}>重新加载</button></div>:!data?<p role="status">正在核对信号记录…</p>:<><details className="fluid-identity"><summary>记录身份</summary><code>{data.run.run_id}</code><code>{data.common.cohort_id}</code><code>{data.common.network_sha256}</code></details>
   {arm==='joint'&&<section className="fluid-request-records"><h3>偏离同状态压力建议的实际请求</h3><p>每行定位到本执行的节点和时刻。表内目标绿时刻是录制结果，不能作在线承诺。</p><div className="fluid-table-scroll"><table><thead><tr><th>请求时刻</th><th>节点</th><th>请求进口</th><th>实际目标绿</th><th>地图</th></tr></thead><tbody>{data.analysis.actual_coordination_windows.map(w=><tr key={w.request_time_s+w.node} data-request-node={w.node} data-request-time={w.request_time_s}><td>{w.request_time_s.toFixed(1)}秒</td><th>{w.node}</th><td>{data.common.geometry.junctions[w.node].approaches[w.candidate_requested_index].label}</td><td><button onClick={()=>locate(w.first_actual_target_green_s,w.node)}>{w.first_actual_target_green_s.toFixed(1)}秒</button></td><td><button onClick={()=>locate(w.request_time_s,w.node)}>查看请求</button></td></tr>)}</tbody></table></div></section>}
   <h3>实际相位与锁定目标变化（{events.length}条）</h3><div className="fluid-table-scroll"><table><thead><tr><th>时刻</th><th>路口</th><th>阶段</th><th>当前进口</th><th>下一目标</th><th>定位</th></tr></thead><tbody>{events.map(e=>{const j=data.common.geometry.junctions[e.node],name=(id:string|null)=>j.approaches.find(a=>a.id===id)?.label??(id||'未锁定');return <tr key={e.node+e.time} data-actual-time={e.time} data-actual-node={e.node} title={fluidExecutionLabel(e.a.reason,arm)}><td>{e.time.toFixed(1)}秒</td><th>{e.node} / {j.name}</th><td>{stageNames[e.a.stage]??e.a.stage}</td><td>{name(e.a.approach)}</td><td>{name(e.a.pending)}</td><td><button onClick={()=>locate(e.time,e.node)}>地图定位</button></td></tr>})}</tbody></table></div><Link to={fluidPath(session,'/evaluation')}>查看同需求完整对照</Link>
  </>}
 </section>
}
