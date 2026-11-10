import{useEffect,useState,type ReactNode}from'react'
import{Link,useLocation}from'react-router-dom'
import{setFluidSource,useTrafficSession}from'../state/TrafficSessionContext'
import{fluidNetwork,type FluidIndex,type FluidSource}from'./fluidJointTypes'
export function registeredJobSource(job:string,index:FluidIndex):Extract<FluidSource,{kind:'native_job'}>{
 const dates=Object.keys(index.scenarios??{})
 if(!/^[a-f0-9]{32}$/.test(job)||index.schema!=='fluid_joint_index_v1'||index.job_id!==job||index.source_kind!=='native_job'||index.source_id!=='native-job:'+job||index.network_sha256!==fluidNetwork||index.production_admitted!==false||index.full_cohort_admitted!==false||index.date_is_unseen_holdout!==false||!dates.length||dates.some(d=>!/^\d{8}_video$/.test(d)||index.scenarios[d].scenario!==d||index.scenarios[d].planned!==23))throw Error('任务地图来源、校区或身份不匹配')
 return{kind:'native_job',key:'native-job:'+job,jobId:job,prefix:'/api/native-artifacts/'+job+'/',dates}
}
export default function EvidenceSourceGate({children}:{children:ReactNode}){
 const session=useTrafficSession(),location=useLocation(),params=new URLSearchParams(location.search),job=params.get('task'),key=job??'archive',[ready,setReady]=useState<string|null>(null),[error,setError]=useState('')
 const supported=['/police','/campus','/junction','/evaluation','/decisions'].includes(location.pathname)&&params.get('mode')!=='legacy'
 useEffect(()=>{let alive=true;const abort=new AbortController();setError('');setReady(null)
  if(!job){setFluidSource(session);setReady('archive');return()=>{alive=false;abort.abort()}}
  if(!supported||!/^[a-f0-9]{32}$/.test(job)){setError('该页面不能打开此任务来源，请返回任务记录。');return()=>{alive=false;abort.abort()}}
  fetch('/api/native-artifacts/'+job+'/index',{signal:abort.signal,cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('任务地图未登记或暂不可用（'+r.status+'），没有载入其他任务替代。');return registeredJobSource(job,await r.json())}).then(source=>{if(alive){setFluidSource(session,source);setReady(job)}}).catch(e=>{if(alive)setError(e instanceof Error?e.message:'任务地图来源核验失败')})
  return()=>{alive=false;abort.abort()}
 },[job,supported,session])
 if(error)return <section role="alert" className="error"><h3>任务地图未载入</h3><p>{error}</p><Link to="/tasks">返回任务与方案</Link></section>
 return ready===key?<>{children}</>:<p role="status" className="loading">核验任务来源、路网和执行身份…</p>
}
