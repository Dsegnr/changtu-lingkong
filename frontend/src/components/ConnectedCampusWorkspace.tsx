import WorkspaceSourceMenu from'./WorkspaceSourceMenu'
import{setFluidSource,useTrafficSession,type ConnectedViewDomain}from'../state/TrafficSessionContext'
import{useNavigate,useLocation}from'react-router-dom'
import FluidJointWorkspace from'./FluidJointWorkspace'
import '../fluidJoint.css'
import DualCampusWorkspace from './DualCampusWorkspace'
import G4ClosedLoopWorkspace from './G4ClosedLoopWorkspace'
import {loadG4Product} from './g4ClosedLoopPlayback'
import type {G4Product} from './g4ClosedLoopTypes'
import ReceivingRecordingWorkspace from'./ReceivingRecordingWorkspace'
import{loadReceivingRecording}from'./receivingRecordingPlayback'
import type{ReceivingProduct}from'./receivingRecordingTypes'
import {useEffect,useRef,useState,useMemo} from 'react'
import {useWorkspace} from '../state/WorkspaceContext'
import {connectedCommon,connectedContext,connectedRun,connectedBasemap,networkFrameAt} from './connectedCampusPlayback'
import type {ConnectedCommon,ConnectedContext,ConnectedPolicy,ConnectedRun,ConnectedBasemap,BasemapMode} from './connectedCampusTypes'
import ConnectedCampusScene from './ConnectedCampusScene'
import{validBasemap}from'./connectedBasemapMath'
import{signalTime,controlTiming,controlContract}from'./connectedSignalTiming'
import{presentationTime,type PresentationClock}from'./connectedPresentation'
import '../connectedCampus.css'
import '../campusControl.css'
import CampusControlPanel from './CampusControlPanel'
import CampusControlEvidence from './CampusControlEvidence'
import CorridorOverview from './CorridorOverview'
import MicroRecordingWorkspace from './MicroRecordingWorkspace'
import{loadMicroRecording}from'./microRecordingPlayback'
import type{MicroProduct}from'./microRecordingTypes'
import '../microRecording.css'

const seconds=(n:number)=>`${Math.floor(n/60).toString().padStart(2,'0')}:${(n%60).toFixed(1).padStart(4,'0')}`
const stageName:Record<string,string>={green:'绿灯放行',yellow:'黄灯过渡',all_red:'全红清空',priority:'优先通行 / 让行'}
const reasons:Record<string,string>={hold:'保持当前放行',fixed_cycle:'按固定周期轮换',maximum_shared_lane_pressure:'按上下游排队压力选择',red_age_priority:'等待较久的有车进口优先',maximum_green:'达到本段最长绿灯',yellow_clearance:'黄灯保护中',all_red_clearance:'全红清空中',enter_green:'切入目标进口',enter_all_red:'进入全红清空',priority_yield:'按道路优先关系让行'}
const kindName:Record<string,string>={cross:'4进口模型',divided_cross:'分隔车行道模型',tee:'3进口模型',T:'3进口模型',t_junction:'3进口模型'}

function RegionalConnectedWorkspace({view='research'}:{view?:'research'|'control'}){
 const {state,dispatch}=useWorkspace(),[common,setCommon]=useState<ConnectedCommon|null>(null),[context,setContext]=useState<ConnectedContext|null>(null),[loadedRun,setRun]=useState<ConnectedRun|null>(null),[error,setError]=useState(''),[speed,setSpeed]=useState(2),[follow,setFollow]=useState(false)
 const[comparisonRuns,setComparisonRuns]=useState<Partial<Record<ConnectedPolicy,ConnectedRun>>>({}),[comparisonError,setComparisonError]=useState('')
 const policy=state.connectedPolicy,focus=state.connectedJunction,chosen=state.connectedVehicle
 const run=loadedRun?.policy===policy?loadedRun:null
 const[basemap,setBasemap]=useState<ConnectedBasemap|null>(null),[basemapMode,setBasemapMode]=useState<BasemapMode>('amap'),[basemapError,setBasemapError]=useState(''),[laneDetail,setLaneDetail]=useState(false),[viewRevision,setViewRevision]=useState(0)
 useEffect(()=>{let active=true;connectedBasemap().then(value=>{if(!validBasemap(value))throw new Error('底图版本或坐标验证不通过');if(active)setBasemap(value)}).catch(()=>{if(active){setBasemapError('地理底图不可用，已保留离线环境');setBasemapMode('offline')}});return()=>{active=false}},[])
 const stateRef=useRef(state);stateRef.current=state
 const clock=useRef<PresentationClock>({time:state.connectedTime,stamp:performance.now(),speed,playing:false})
 useEffect(()=>{if(!state.playing)clock.current={time:state.connectedTime,stamp:performance.now(),speed,playing:false}},[state.connectedTime,state.playing,speed])
 useEffect(()=>{
  if(view!=='control')return
  if(!stateRef.current.connectedJunction)dispatch({type:'connectedJunction',junction:'B'})
  let active=true;Promise.all([connectedRun('fixed'),connectedRun('pressure')]).then(([fixed,pressure])=>{if(fixed.policy!=='fixed'||pressure.policy!=='pressure'||fixed.schema!=='connected_campus_run_v1'||pressure.schema!=='connected_campus_run_v1'||!fixed.frames.length||!pressure.frames.length)throw Error('对照记录版本或策略不匹配');if(active)setComparisonRuns({fixed,pressure})}).catch(()=>{if(active)setComparisonError('另一方案记录不可用，同刻对照暂不可用；当前地图回放保留。')});return()=>{active=false}
 },[view,dispatch])
 useEffect(()=>{if(state.campus!=='SS')dispatch({type:'campus',campus:'SS'})},[dispatch,state.campus])
 useEffect(()=>{let active=true;Promise.all([connectedCommon(),connectedContext()]).then(([c,x])=>{if(c.schema!=='connected_campus_common_v1'||c.campus!=='SS'||x.schema!=='connected_campus_context_v1'||x.network_sha256!==c.source_hashes.network)throw new Error('连通路网或环境数据域不匹配');if(active){setCommon(c);setContext(x)}}).catch(e=>{if(active)setError(String(e))});return()=>{active=false}},[])
 useEffect(()=>{let active=true;setRun(null);setError('');connectedRun(policy).then(r=>{if(r.schema!=='connected_campus_run_v1'||r.policy!==policy||!r.frames.length)throw new Error('回放策略或帧无效');if(active)setRun(r)}).catch(e=>{if(active)setError(String(e))});return()=>{active=false}},[policy])
 useEffect(()=>{if(!run||!common)return;if(run.run_id!==common.runs[policy].run_id){setError('运行记录与公共路网不匹配');return}if(stateRef.current.connectedTime>run.duration)dispatch({type:'connectedTime',time:run.duration})},[run,common,policy,dispatch])
 useEffect(()=>{
  clock.current={time:stateRef.current.connectedTime,stamp:performance.now(),speed,playing:state.playing&&!!run}
  if(!state.playing||!run)return
  const timer=window.setInterval(()=>{const time=presentationTime(clock.current,performance.now(),run.duration),next=Math.max(.2,Math.floor((time+1e-7)/run.step)*run.step);if(next!==stateRef.current.connectedTime)dispatch({type:'connectedTime',time:next});if(time>=run.duration)dispatch({type:'play',playing:false})},40)
  return()=>{clearInterval(timer);clock.current.playing=false}
 },[state.playing,run,speed,dispatch])
 const controlExample=useMemo(()=>{
  if(!run||policy!=='pressure')return null
  for(const f of run.frames)for(const[id,a]of Object.entries(f.junctions))if(a.stage==='yellow'&&a.reason==='maximum_shared_lane_pressure'&&a.observation.some(o=>o.queue>0))return{time:f.time,junction:id}
  return null
 },[run,policy])
 if(error)return <section className="error" role="alert">{error}</section>
 if(!common||!context||!run)return <section className="loading">正在加载校园连通路网与逐车运行记录…</section>
 const frame=networkFrameAt(run.frames,Math.min(state.connectedTime,run.duration))
 const compatibleBasemap=basemap?.network_sha256===common.source_hashes.network?basemap:null
 if(!frame||run.run_id!==common.runs[policy].run_id)return <p className="loading">正在对齐回放时刻…</p>
 const junction=focus?common.geometry.junctions[focus]:null,action=junction?frame.junctions[junction.id]:null
 const phaseTime=junction&&action?signalTime(run,junction.id,junction.approaches.find(a=>a.id===action.approach)?.indices[0]??0,frame.time,common.source_hashes.contract):null
 const approachName=(id:string|null)=>junction?.approaches.find(a=>a.id===id)?.label??'—'
 const vehicle=common.vehicles.find(v=>v.id===chosen),trip=vehicle?.runs[policy],current=frame.vehicles.find(v=>v.id===chosen)
 const summary=common.runs[policy],fixed=common.runs.fixed,pressure=common.runs.pressure,paired=pressure.paired!
 const queue=Object.values(frame.junctions).reduce((n,a)=>n+a.observation.reduce((s,o)=>s+o.queue,0),0)
 const choose=(id:string)=>{dispatch({type:'connectedVehicle',vehicle:id});setFollow(false)}
 const seek=(time:number)=>{dispatch({type:'play',playing:false});dispatch({type:'connectedTime',time:Math.max(.2,Math.min(run.duration,time))})}
 const focusJunction=(id:string|null)=>{setFollow(false);setViewRevision(v=>v+1);dispatch({type:'connectedJunction',junction:id})}
 const example=()=>{const v=common.vehicles.find(v=>v.expected_visits.length===4)!;choose(v.id);seek(v.runs[policy].depart+1)}
 const download=()=>{const blob=new Blob([JSON.stringify({run:run.run_id,time:frame.time,action_time:frame.action_time,junctions:frame.junctions,vehicle:vehicle??null,assumptions:common.assumptions},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='畅途灵控_连通路网决策快照.json';a.click();URL.revokeObjectURL(url)}
 return <section className={"connected-workspace "+(view==='control'?'campus-control-workspace':'')} data-testid="connected-workspace" data-view={view} data-policy={policy} data-time={frame.time} data-vehicle={chosen??''}>
  <header className="connected-heading"><div><h2>{view==='control'?'AI交警 · 走廊交通控制':'校园连通交通'}</h2><p>{view==='control'?'嵩山路校区周边 · 多节点状态、路段车流与控制记录':'河南工业大学嵩山路校区周边 · 伊河路—工人路走廊'}</p></div><span className="connected-badge">{view==='control'?'压力规则基线 / 冻结仿真':'真实道路几何 / 研究情景'}</span><button onClick={download}>导出当前决策</button></header>
  <div className="connected-toolbar"><label>控制方案<select aria-label="连通控制方案" value={policy} onChange={e=>dispatch({type:'connectedPolicy',policy:e.target.value as ConnectedPolicy})}><option value="pressure">网络压力控制</option><option value="fixed">固定配时对照</option></select></label><label>观察范围<select aria-label="连通观察范围" value={focus??''} onChange={e=>focusJunction(e.target.value||null)}><option value="">四路口全网</option>{Object.values(common.geometry.junctions).map(j=><option key={j.id} value={j.id}>{j.id} · {j.name}</option>)}</select></label><div className="connected-now"><b>{frame.vehicles.length}</b> 在途车辆 <span/><b>{queue}</b> 进口排队</div><button onClick={()=>focusJunction(null)}>全网概览</button></div>
  <div className="connected-background-controls"><div role="group" aria-label="地图背景"><button aria-pressed={basemapMode==='amap'} disabled={!compatibleBasemap} onClick={()=>setBasemapMode('amap')}>高德地理底图</button><button aria-pressed={basemapMode==='offline'} onClick={()=>setBasemapMode('offline')}>离线环境</button></div><button className="connected-detail-toggle" aria-pressed={laneDetail} disabled={!focus} onClick={()=>setLaneDetail(!laneDetail)}>{laneDetail?'返回街区':'车道细节'}</button><span>{basemapError||compatibleBasemap?basemapError||`${compatibleBasemap!.images.length}幅局部底图 · ${compatibleBasemap!.capture_date}归档`:'地理底图载入中'}</span><small>道路、灯组与车辆为研究情景</small></div>
  <div className="connected-main"><div className="connected-map-column"><div className="connected-map-topline"><b>{follow?'车辆跟随':junction?`${junction.id} · ${junction.name}`:'A—D—B—C 连通走廊'}</b><span>{junction?'滚轮缩放 · 拖动查看相邻道路':'点击路口放大 · 同一车辆连续通行'}</span></div><ConnectedCampusScene common={common} context={context} basemap={compatibleBasemap} basemapMode={basemapMode} laneDetail={laneDetail} viewRevision={viewRevision} run={run} clock={clock} frame={frame} focus={focus} chosen={chosen} follow={follow} onJunction={focusJunction} onVehicle={choose} onFollowEnd={()=>setFollow(false)}/>
   <div className="connected-timeline"><button aria-label={state.playing?'暂停连通回放':'播放连通回放'} onClick={()=>{if(frame.time>=run.duration)seek(.2);dispatch({type:'play',playing:!state.playing})}}>{state.playing?'暂停':'播放'}</button><strong data-testid="connected-clock">{seconds(frame.time)}</strong><input aria-label="连通回放时间" type="range" min={.2} max={run.duration} step={.2} value={frame.time} onChange={e=>seek(Number(e.target.value))}/><span>{seconds(run.duration)}</span><select aria-label="连通回放速度" value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[1,2,4,8].map(s=><option key={s} value={s}>{s}倍速</option>)}</select></div>
   <div className="connected-frame-note">仿真时刻 {frame.time.toFixed(1)} s · 灯态取自 {frame.action_time.toFixed(1)} s 步前决策，在途车辆取自步后观测 · 268辆同源发车时序 · 车辆展示采用采样间插值，统计取原始记录</div>
  </div><aside className="connected-inspector">
   {view==='control'?<CampusControlPanel common={common} run={run} frame={frame} focus={focus} onJunction={focusJunction} onExample={controlExample?()=>{focusJunction(controlExample.junction);seek(controlExample.time)}:undefined}/>:<section><h3>{junction?`${junction.id} · ${junction.name}`:'走廊路口'}</h3>{!junction?<><p className="connected-muted">3处信号研究节点，1处优先通行节点；使用同一连通仿真。</p><div className="connected-junction-list">{Object.values(common.geometry.junctions).map(j=><button key={j.id} onClick={()=>focusJunction(j.id)}><b>{j.id}</b><span>{j.name}<small>{kindName[j.kind]??(j.approaches.length===3?'3进口子网':'4进口子网')} · {j.control==='signal_scenario'?'信号控制情景':'让行情景'}</small></span><em>{frame.junctions[j.id].observation.reduce((n,o)=>n+o.queue,0)} 辆</em></button>)}</div></>:<><p className="connected-muted">{kindName[junction.kind]??(junction.approaches.length===3?'3进口子网':'4进口子网')} · {junction.approaches.length}进口 · {junction.control==='signal_scenario'?'信号控制情景':'优先通行研究情景'}</p><div className={'connected-phase '+action!.stage}><i/>{stageName[action!.stage]??action!.stage}</div><p className="connected-decision-reason">{reasons[action!.reason]??action!.reason}</p>{phaseTime&&<div className="connected-phase-time" data-testid="connected-phase-time"><strong>{phaseTime.label}</strong><span>{phaseTime.kind==='remaining'?'已确认阶段剩余时间':'当前灯色已持续时间'}</span></div>}{junction.control==='signal_scenario'&&<><p className="connected-timing-note">{policy==='pressure'?'绿灯时长动态决定；红灯显示已等待时间。':'固定绿灯显示阶段剩余时间；红灯显示已等待时间。'}{common.source_hashes.contract===controlContract&&` 最短绿灯${controlTiming.minGreen}s / 最长${controlTiming.maxGreen}s，黄灯${controlTiming.yellow}s / 全红${controlTiming.allRed}s。`}</p>{controlExample&&<button className="connected-control-example" onClick={()=>{focusJunction(controlExample.junction);seek(controlExample.time)}}>排队调控示例</button>}<details className="connected-control-basis"><summary>当前调控依据</summary><dl><dt>当前控制进口</dt><dd>{approachName(action!.approach)}</dd><dt>原始压力候选</dt><dd>{approachName(action!.raw_candidate)}</dd><dt>已锁定下一进口</dt><dd>{action!.pending?approachName(action!.pending):'尚未锁定'}</dd><dt>约束</dt><dd>{action!.metadata_availability?.veto===false||action!.veto===null?'未记录':action!.veto.length?action!.veto.map(v=>({minimum_green:'最短绿灯保护',decision_interval:'等待下一评估时点',transition_locked:'黄灯/全红过渡锁定',fixed_green_duration:'固定绿灯时长'}[v]??v)).join('、'):'本步无否决'}</dd></dl></details></>}<table className="connected-queues"><thead><tr><th>进口</th><th>排队</th><th>压力</th></tr></thead><tbody>{junction.approaches.map((a,i)=><tr key={a.id} className={action!.approach===a.id&&action!.stage==='green'?'passing':''}><td>{a.label.replace('·',' / ')}</td><td>{action!.observation[i].queue}</td><td>{action!.observation[i].pressure.toFixed(1)}</td></tr>)}</tbody></table>{junction.control==='signal_scenario'?<div className="connected-heads" aria-label="当前信号灯组">{junction.approaches.map(a=><span key={a.id}><small>{a.label}</small>{junction.heads.filter(h=>h.indices.some(i=>a.indices.includes(i))).map(h=><i key={h.id} title={h.type} data-signal={action!.state[h.indices[0]]}>{h.type==='circle'?'●':h.type==='arrow_left'?'←':h.type==='arrow_right'?'→':'↑'}</i>)}<em className="connected-head-time">{signalTime(run,junction.id,a.indices[0],frame.time,common.source_hashes.contract)?.label}</em></span>)}</div>:<p className="connected-muted">此节点不设置模拟信号灯，车辆按优先关系让行。</p>}</>}
   </section>}
   <section className="connected-vehicle-panel"><h3>车辆跨路口追踪</h3><label>车辆<select aria-label="连通追踪车辆" value={chosen??''} onChange={e=>e.target.value?choose(e.target.value):dispatch({type:'connectedVehicle',vehicle:null})}><option value="">点击地图中的车辆，或选择</option>{common.vehicles.map(v=><option key={v.id} value={v.id}>{v.id} · {v.expected_visits.join(' → ')}</option>)}</select></label><div className="connected-row-actions"><button onClick={example}>四路口示例</button><button disabled={!vehicle} aria-pressed={follow} onClick={()=>{if(!vehicle)return;if(!current)seek(trip!.depart+1);setFollow(!follow)}}>{follow?'取消跟随':'跟随车辆'}</button></div>{vehicle&&trip&&<><p data-testid="connected-vehicle-status"><b>{vehicle.id}</b> · {current?`${(current.speed*3.6).toFixed(1)} km/h`:frame.time<trip.depart?'尚未入网':'已驶离路网'}</p><div className="connected-visit-list">{trip.visits.map(v=><button key={v.junction} className={frame.time>=v.time?'visited':''} onClick={()=>{focusJunction(v.junction);seek(v.time)}}><b>{v.junction}</b><span>{seconds(v.time)}</span></button>)}</div><p className="connected-muted">全程 {trip.cost.toFixed(1)} s；较固定配时 <b className={trip.delta>0?'bad':'good'}>{trip.delta>0?'+':''}{trip.delta.toFixed(1)} s</b>。橙色虚线表示计划路线。</p></>}</section>
  </aside></div>
  <CorridorOverview common={common} run={run} frame={frame} focus={focus} onJunction={focusJunction}/>
  {view==='control'&&<CampusControlEvidence common={common} run={run} other={comparisonRuns[policy==='pressure'?'fixed':'pressure']??null} time={state.connectedTime} focus={focus} error={comparisonError} onEvent={(id,time)=>{focusJunction(id);seek(time)}} onHarmed={id=>{const v=common.vehicles.find(v=>v.id===id)!;dispatch({type:'connectedPolicy',policy:'pressure'});choose(id);focusJunction(null);seek(v.runs.pressure.depart+.2)}}/>}
  <section className="connected-comparison"><div><h3>同需求完整运行对照</h3><p>两方案各268辆全部到达；同一seed、同一道路和计划路线。</p></div><div><span>固定配时 / 平均总耗时</span><strong>{fixed.metrics.mean_scheduled_cost_s.toFixed(1)}<small> s</small></strong></div><div><span>网络压力 / 平均总耗时</span><strong>{pressure.metrics.mean_scheduled_cost_s.toFixed(1)}<small> s</small></strong></div><div><span>当前方案 / P95总耗时</span><strong>{summary.metrics.p95_scheduled_cost_s.toFixed(1)}<small> s</small></strong></div><div className="connected-paired"><span>逐车成本差 / 压力 − 固定</span><p><b className="good">{paired.benefited} 受益</b> · {paired.unchanged} 不变 · <b className="bad">{paired.harmed} 受损</b></p><small>最大增加 {paired.worst_harm.toFixed(1)} s</small></div></section>
  <details className="connected-evidence"><summary>数据来源与建模边界</summary><p>道路中心线取自大赛新增郑州路网包，并与已有OSM节点核对。A为两条分隔车行道节点的复合路口；B选取4进口，C、D选取3进口；不代表已核验全部现场出入口。车辆首次出现时序来自公开SinD数据，268辆汽车的多路口起终点和路线为本地研究情景。</p><p>静态环境来自本地OSM 2026-10-16快照与大赛配套教学数据：{context.counts.building}个建筑轮廓、{context.counts.green}处绿地或运动场、{context.counts.education}处教育用地，以及水体和设施。浅色道路与建筑为位置参照；深色道路参与本轮仿真。底图完整度受源资料限制，未填造建筑、楼高或校园边界。</p>{compatibleBasemap&&<p>高德地理底图获取于{compatibleBasemap.capture_date}，共{compatibleBasemap.images.length}幅局部图幅，提供建筑与地名参照。36个坐标控制点中，每路口5点拟合、4点独立检验；最大转换残差{compatibleBasemap.max_holdout_error_m.toFixed(3)}米。这不是底图或现场测量精度；路口新增出入口、现状车道与信号仍需核验。</p>}<p>车道数、转向许可、限速、信号与灯组位置均为研究设置，尚无本地现场核验；D采用让行设置，不表示已确认现实中无灯。当前压力控制是受最短绿灯、最长绿灯、黄灯、全红约束的规则算法，尚非训练得到的AI模型，也未接入真实交通灯。未模拟行人和非机动车。</p><p>平均总耗时含发车延迟，P95为最近秩；仅本次种子与需求条件。四个路口共用车辆ID、坐标、时间和实际执行灯态。</p><code>{run.run_id}</code></details>
 </section>
}

export default function ConnectedCampusWorkspace({view='research',scenarioFocus,onDomainChange}:{view?:'research'|'control';scenarioFocus?:{node:string;serial:number}|null;onDomainChange?:(domain:string)=>void}){
 const session=useTrafficSession(),navigate=useNavigate(),location=useLocation()
 const{dispatch}=useWorkspace(),[domain,setDomain]=useState<'dual'|'fluid_joint'|'regional'|'micro'|'receiving'|'g4'>(view==='control'?(session.current.connectedDomain??session.current.controlDomain??'dual'):'dual'),[loading,setLoading]=useState(false),[error,setError]=useState(''),[data,setData]=useState<{product:MicroProduct;common:ConnectedCommon}|null>(null),[receiving,setReceiving]=useState<{product:ReceivingProduct;common:ConnectedCommon}|null>(null),alive=useRef(true),[g4,setG4]=useState<{product:G4Product;common:ConnectedCommon}|null>(null)
 useEffect(()=>{onDomainChange?.(domain)},[domain,onDomainChange])
 const requestId=useRef(0)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;requestId.current++;dispatch({type:'play',playing:false})}},[dispatch])
 const change=async(next:string)=>{
  const wasJob=session.current.fluidSource?.kind==='native_job';session.current.connectedDomain=next as ConnectedViewDomain
  if(wasJob){setFluidSource(session);navigate(location.pathname,{replace:true})}
  const request=++requestId.current
  dispatch({type:'play',playing:false});setError('')
  if(next==='fluid_joint'){session.current.controlDomain='fluid_joint';setDomain('fluid_joint');return}
  session.current.controlDomain='dual'
  if(next==='dual'){setDomain('dual');return}
  dispatch({type:'campus',campus:'SS'})
  if(next==='regional'){dispatch({type:'connectedTime',time:.2});setDomain('regional');return}
  setLoading(true)
  try{const common=await connectedCommon();if(next==='g4'){const product=g4?.product??await loadG4Product(common.source_hashes.network);if(alive.current&&request===requestId.current){setG4({product,common});setDomain('g4')}return}if(next==='receiving'){const product=receiving?.product??await loadReceivingRecording(common.source_hashes.network);if(alive.current&&request===requestId.current){setReceiving({product,common});setDomain('receiving')}return}const product=data?.product??await loadMicroRecording(common.source_hashes.network);if(alive.current&&request===requestId.current){setData({product,common});setDomain('micro')}}catch(e){if(alive.current&&request===requestId.current){setError(String(e));setDomain('regional')}}finally{if(alive.current&&request===requestId.current)setLoading(false)}
 }

 useEffect(()=>{if(scenarioFocus){requestId.current++;setLoading(false);setError('');dispatch({type:'play',playing:false});setDomain('regional');dispatch({type:'connectedJunction',junction:scenarioFocus.node})}},[scenarioFocus,dispatch])
 const sourceControls=<WorkspaceSourceMenu domain={domain} onChange={next=>void change(next)} loading={loading} research={<div className="recording-domain-bar"><label>记录模式<select aria-label="交通记录模式" disabled={loading} value={domain} onChange={e=>void change(e.target.value)}><option value="dual">双校区连通交通 · 原生记录</option><option value="fluid_joint">跨日期联合候选 · 23车开发验证</option><option value="g4">多路口联合控制 · 闭环执行</option><option value="regional">区域联动记录</option><option value="micro">换道跟驰 · 机制核验记录</option><option value="receiving">接收与恢复 · 机制核验记录</option></select></label><p>{loading?'正在校验封存记录…':domain==='fluid_joint'?(session.current.fluidSource?.kind==='native_job'?'当前原生任务 · job/run/cohort与模型、回执独立绑定':'FLUID两日期、各23车独立执行；模型建议与原生对照分开'):domain==='dual'?'双校区分别绑定真实来源需求与本地仿真；不同场景不比较收益':domain==='g4'?'独立14车 · 联合控制实际回执 · 全程逐车对照':domain==='receiving'?'独立七车片段 · 接收空间三态 · 未执行新调控':domain==='micro'?'独立三车片段 · 固定信号 · 不计全网收益':'四路口连通场景 · 固定配时／网络压力规则对照'}</p><a href="/police?mode=legacy">科隆历史基准</a><a href="/experiment">双时刻实验回放</a></div>}/>
 return <>{(loading||!['dual','fluid_joint'].includes(domain))&&<div className="consolidated-research-context">{sourceControls}</div>}{error&&<p role="alert" className="recording-domain-error">{error}；已保留区域联动记录。</p>}{loading?<p className="loading" role="status">正在校验并切换记录…</p>:domain==='fluid_joint'?<FluidJointWorkspace sourceControls={sourceControls} key={session.current.fluidSource?.key??'archive'} onBaseline={region=>{session.current.region=region;session.current.arm='pressure';void change('dual')}}/>:domain==='dual'?<DualCampusWorkspace sourceControls={sourceControls}/>:domain==='g4'&&g4?<G4ClosedLoopWorkspace product={g4.product} common={g4.common}/>:domain==='receiving'&&receiving?<ReceivingRecordingWorkspace product={receiving.product} common={receiving.common} view={view}/>:domain==='micro'&&data?<MicroRecordingWorkspace product={data.product} common={data.common} view={view}/>:<RegionalConnectedWorkspace view={view}/>}</>
}
