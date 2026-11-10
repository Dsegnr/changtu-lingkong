import{useNavigate}from'react-router-dom'
import{fluidPath}from'../state/TrafficSessionContext'
import{useFluidData}from'./useFluidData'
import{fluidDates,fluidLabel,type FluidDate}from'./fluidJointTypes'
import FluidPairComparison from'./FluidPairComparison'
import '../fluidJoint.css'
export default function FluidEvaluation({onBaseline}:{onBaseline:()=>void}){
 const{session,date,dates,selectDate,data,error,reload}=useFluidData('joint'),navigate=useNavigate()
 const locate=(id:string)=>{if(!data)return;const f=data.run.frames.find(f=>f.vehicles.some(v=>v.id===id));if(!f)throw Error('该车辆没有已记录的位置');session.current.controlDomain='fluid_joint';session.current.fluid!.arm='joint';session.current.fluid!.bookmarks[data.run.run_id]={run_id:data.run.run_id,time:f.time,chosen:id,focus:null};navigate(fluidPath(session,'/police'))}
 return <section className="product-evaluation fluid-evaluation" data-fluid-evaluation={date} data-source-job={data?.index.job_id??'archive'} data-cohort={data?.common.cohort_id}>
  <header><div><p>嵩山路 / 联合控制开发验证</p><h2>方案评估</h2></div><div className="fluid-evaluation-controls"><label>需求日期<select aria-label="评估需求日期" value={date} onChange={e=>selectDate(e.target.value as FluidDate)}>{dates.map(d=><option key={d} value={d}>{fluidLabel(d)}</option>)}</select></label><button onClick={onBaseline}>双校区268车基线</button></div></header>
  <p>压力参考 q 与联合候选 joint 使用同一23车需求，在相同本地路网分别完成原生执行。日期内逐车配对，日期分别属于开发案例；不与268车基线或事件片段混合计算收益。</p>
  {error?<div role="alert">{error}<button onClick={reload}>重新加载</button></div>:!data?<p role="status">正在核对联合执行对照…</p>:<><div className="evaluation-scope"><p>{fluidLabel(date)} / 23辆 / 2套完整执行 / 全量与生产准入尚未通过</p><details><summary>查看对照身份与来源</summary><code>{data.common.runs.q.run_id}</code><code>{data.common.runs.joint.run_id}</code><code>{data.common.network_sha256}</code></details></div><FluidPairComparison common={data.common} onVehicle={locate}/></>}
 </section>
}
