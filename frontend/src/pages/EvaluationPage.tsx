import{setFluidSource}from'../state/TrafficSessionContext'
import FluidEvaluation from'../components/FluidEvaluation'
import {useEffect,useState} from 'react'
import {Link,useNavigate} from 'react-router-dom'
import {useTrafficSession,runKey} from '../state/TrafficSessionContext'
import {loadTrafficBundle,type Region,type Data,type Meta} from '../components/dualCampusData'
import LHBaselineComparison,{baselineEvidence} from '../components/LHBaselineComparison'
import {loadErrorMessage} from '../components/DualCampusWorkspace'
import '../productDesk.css'

function BaselineEvaluationPage(){
 const session=useTrafficSession(),navigate=useNavigate()
 const [region,setRegion]=useState<Region>(session.current.region),[loaded,setLoaded]=useState<{region:Region;data:Data;meta:Meta}|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0)
 useEffect(()=>{let active=true;setLoaded(null);setError('');loadTrafficBundle(session.current.repository,region,'pressure').then(value=>{if(active)setLoaded({region,data:value.data,meta:value.meta})}).catch(e=>{if(active)setError(loadErrorMessage(e))});return()=>{active=false}},[region,retry,session])
 const value=loaded?.region===region?loaded:null
 const evidence=value?baselineEvidence(value.data.common):null
 const locate=(id:string)=>{
  if(!value)return
  const frame=value.data.run.frames.find(f=>f.vehicles.some(v=>v.id===id))
  if(!frame)throw Error('该车辆没有可定位的执行帧')
  session.current.region=region;session.current.arm='pressure'
  session.current.bookmarks[runKey(region,'pressure')]={run_id:value.data.run.run_id,time:frame.time,chosen:id,focus:null}
  navigate('/police')
 }
 return <section className="product-evaluation" data-evaluation-region={region} data-run={value?.data.run.run_id}>
  <header><div><p>校园交通 / 同域对照</p><h2>方案评估</h2></div><div className="desk-region" role="group" aria-label="评估校区">{(['LH','SS']as const).map(r=><button key={r} aria-pressed={region===r} onClick={()=>{session.current.region=r;session.current.arm='pressure';setRegion(r)}}>{r==='LH'?'莲花街校区':'嵩山路校区'}</button>)}</div></header>
  <p>检查同一路网、同一车辆需求下的整体效果与逐车损益。规则基线的改善不表示联合AI候选已经通过。</p>
  {error?<div role="alert">{error}<button onClick={()=>{session.current.repository.clearSettled();setRetry(n=>n+1)}}>重新加载</button></div>:!value?<p role="status">正在核对校区和对照记录…</p>:<>
   <div className="evaluation-scope"><p>{value.meta.name} / {value.meta.planned}辆迁移需求 / {evidence?'固定配时与压力规则基线':'历史压力记录'}</p><details><summary>查看对照身份与来源</summary><code>{value.data.run.run_id}</code><code>{value.meta.network_sha256}</code></details></div>
   {evidence?<LHBaselineComparison common={value.data.common} onVehicle={locate}/>:<div className="empty-state"><h3>暂无同批全量固定对照</h3><p>嵩山路当前绑定历史压力记录。不会用莲花街结果替代，也不把不同需求的实验拼接为收益。</p><Link to="/police">查看交通工作台</Link></div>}
   <p>需求时序来源于异地数据，本地OD、车道和信号包含场景假设，不代表校园实测。车辆速度由仿真自然产生；本平台只研究信号控制。</p>
  </>}
 </section>
}

export default function EvaluationPage(){const session=useTrafficSession(),navigate=useNavigate(),[mode,setMode]=useState(session.current.controlDomain??'dual');return mode==='fluid_joint'?<FluidEvaluation onBaseline={()=>{setFluidSource(session);session.current.controlDomain='dual';session.current.connectedDomain='dual';setMode('dual');navigate('/evaluation',{replace:true})}}/>:<BaselineEvaluationPage/>}
