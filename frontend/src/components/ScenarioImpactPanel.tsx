import {useEffect,useState} from 'react'
import './scenarioImpact.css'
export const scenarioNetwork='ab728b65d9d7238df7d5318181af3343d64e7a8ba5c411be396de17d5af2eca3'
type Edge={sumo_edge_id:string;source_road_name:string;source_osm_id:string;sumo_from_node:string;sumo_to_node:string}
export type SpatialScenario={scenario_id:string;network_sha256:string;region_id:'SS';status:'spatial_ready';event:{node_id:string;radius_m:number;hypothetical:true};affected_edges:Edge[];controlled_related_nodes:string[];traffic_event_applied:false;evaluation_status:'not_run'}
export function parseScenarios(raw:unknown):SpatialScenario[]{
 if(!raw||typeof raw!=='object'||!('scenarios'in raw)||!Array.isArray(raw.scenarios))throw Error('事件任务格式不完整')
 return raw.scenarios.map((s:SpatialScenario)=>{
  if(!s||s.region_id!=='SS'||s.network_sha256!==scenarioNetwork||s.status!=='spatial_ready'||!s.event||s.event.hypothetical!==true||s.traffic_event_applied!==false||s.evaluation_status!=='not_run')throw Error('事件来源或评估状态不匹配')
  if(typeof s.scenario_id!=='string'||!/^[a-f0-9]{32}$/.test(s.scenario_id)||!['A','B','C'].includes(s.event.node_id)||![50,100,150,200].includes(s.event.radius_m)||!Array.isArray(s.affected_edges)||!Array.isArray(s.controlled_related_nodes))throw Error('事件范围或道路信息不完整')
  if(s.affected_edges.some(e=>!e||typeof e.sumo_edge_id!=='string'||typeof e.source_road_name!=='string'||typeof e.source_osm_id!=='string'||typeof e.sumo_from_node!=='string'||typeof e.sumo_to_node!=='string')||new Set(s.affected_edges.map(e=>e.sumo_edge_id)).size!==s.affected_edges.length||s.controlled_related_nodes.some(n=>!['A','B','C'].includes(n)))throw Error('事件道路或路口身份不匹配')
  return s
 })
}
const names:Record<string,string>={A:'嵩山路—伊河路',B:'工人路—伊河路',C:'工人路—颖河路'}
export default function ScenarioImpactPanel({onLocate}:{onLocate:(node:string)=>void}){
 const[data,setData]=useState<SpatialScenario[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[index,setIndex]=useState(0)
 useEffect(()=>{const abort=new AbortController();fetch('/api/scenarios',{signal:abort.signal}).then(async r=>{if(!r.ok)throw Error('事件任务服务暂不可用');return parseScenarios(await r.json())}).then(v=>{if(!abort.signal.aborted)setData(v)}).catch(e=>{if(!abort.signal.aborted)setError(e instanceof Error?e.message:'无法读取事件任务')}).finally(()=>{if(!abort.signal.aborted)setLoading(false)});return()=>abort.abort()},[])
 const task=data[index]
 return <details className="scenario-impact"><summary><strong>事件影响分析</strong><span>{loading?'读取任务…':error?'暂不可用':task?`${names[task.event.node_id]} / ${task.event.radius_m}米 / ${task.affected_edges.length}条道路`:'暂无任务'}</span><em>SuperMap空间分析</em></summary><div className="scenario-impact-body">
 {error?<p role="alert">{error}。已保留原交通回放，不填入替代结果。</p>:loading?<p role="status">正在核验事件来源与路网版本。</p>:!task?<p>暂无已完成的空间任务。</p>:<>
 <div className="scenario-impact-heading"><label>分析任务<select aria-label="事件影响任务" value={index} onChange={e=>setIndex(Number(e.target.value))}>{data.map((s,i)=><option key={s.scenario_id} value={i}>{names[s.event.node_id]} · {s.event.radius_m}米</option>)}</select></label><div><b>空间分析完成</b><span>交通评估未运行</span></div></div>
 <p className="scenario-impact-note">嵩山路校区研究区的假设事件。范围内道路由 SuperMap 实际相交查询得到；下方交通回放不含本事件，当前没有事件优化效果。</p>
 <div className="scenario-impact-locate"><span>关联信号路口</span>{task.controlled_related_nodes.map(node=><button key={node} onClick={()=>onLocate(node)}>定位 {names[node]}</button>)}</div>
 <div className="scenario-impact-table"><table><caption>受影响道路 / 按当前路网方向区分</caption><thead><tr><th>道路</th><th>连接方向</th></tr></thead><tbody>{task.affected_edges.map(e=><tr key={e.sumo_edge_id}><td>{e.source_road_name}</td><td>{names[e.sumo_from_node]??'研究区边界'} → {names[e.sumo_to_node]??'研究区边界'}</td></tr>)}</tbody></table></div>
 <details className="scenario-impact-source"><summary>道路来源凭证</summary>{task.affected_edges.map(e=><p key={e.sumo_edge_id}>{e.source_road_name} / 源编号 {e.source_osm_id} / 路段 {e.sumo_edge_id}</p>)}</details><p className="scenario-impact-source">任务 {task.scenario_id.slice(0,12)} · 地图版本 {task.network_sha256.slice(0,12)} · 定位仅切换地图视角，不执行信号方案。</p>
 </>}</div></details>
}
