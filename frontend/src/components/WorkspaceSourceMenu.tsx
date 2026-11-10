import{useRef,type ReactNode}from'react'
import{useLocation,useNavigate}from'react-router-dom'
import{useTrafficSession}from'../state/TrafficSessionContext'
import{fluidLabel}from'./fluidJointTypes'

/** A source picker, not a strategy selector. Dataset identities stay independent. */
export default function WorkspaceSourceMenu({domain,onChange,loading=false,research}:{domain:string;onChange:(next:string)=>void;loading?:boolean;research?:ReactNode}){
 const session=useTrafficSession(),navigate=useNavigate(),location=useLocation(),details=useRef<HTMLDetailsElement>(null)
 const native=domain==='fluid_joint'&&session.current.fluidSource?.kind==='native_job',last=session.current.lastNativeSource
 const label=native?'任务 '+session.current.fluidSource!.key.slice(-32,-24)+' / 23车':domain==='fluid_joint'?'FLUID开发验证 / 23车':domain==='dual'?'双校区基线 / 268车':'研究记录'
 const select=(value:string)=>{if(details.current)details.current.open=false;onChange(value)}
 return <details className="workspace-source-menu" ref={details}><summary aria-label="选择数据场景"><span>场景</span><b>{label}</b><span aria-hidden="true">⌄</span></summary><div className="workspace-source-popover"><div role="group" aria-label="信号控制数据场景"><p>切换数据场景</p><button disabled={loading} aria-pressed={domain==='dual'} onClick={()=>select('dual')}>双校区268车基线<small>异地需求迁移 · 两校区独立路网</small></button><button disabled={loading} aria-pressed={domain==='fluid_joint'&&!native} onClick={()=>select('fluid_joint')}>跨日期联合验证 · 23车<small>五月开发案例 · 压力参考与联合候选</small></button>{last&&<button disabled={loading} aria-pressed={native} onClick={()=>{if(details.current)details.current.open=false;const path=['/police','/campus','/junction'].includes(location.pathname)?location.pathname:'/police';navigate(path+'?task='+last.jobId)}}>任务车流 · {fluidLabel(last.dates[0])}<small>已完成原生任务 {last.jobId.slice(0,8)}</small></button>}</div>{research&&<details className="workspace-research-menu"><summary>研究与历史记录</summary>{research}</details>}<p className="workspace-source-note">不同需求分别核对，不跨场景拼接收益。</p></div></details>
}
