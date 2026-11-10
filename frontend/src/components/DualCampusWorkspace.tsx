import{useTrafficSession,runKey,checkedBookmark}from'../state/TrafficSessionContext'
import MapDeskView from './MapDeskView'
import{validateSpatialEvent,eventVehicleSummary,type FrozenSpatialEvent}from'./dualCampusEvents'
import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react'
import ConnectedCampusScene,{type SceneCommon} from './ConnectedCampusScene'
import type {ConnectedRun,ConnectedContext,ConnectedPolicy} from './connectedCampusTypes'
import {networkFrameAt} from './connectedCampusPlayback'
import {presentationTime,type PresentationClock} from './connectedPresentation'
import{recordedPhaseRemaining}from'./connectedSignalTiming'
import LHBaselineComparison,{baselineEvidence,metricText,type BaselineMetrics}from'./LHBaselineComparison'
import '../dualCampus.css'
import {useWorkspace} from '../state/WorkspaceContext'
import{loadTrafficBundle,type Region,type Data,type Meta}from'./dualCampusData'
export{validateRegion}from'./dualCampusData'
export function loadErrorMessage(error:unknown){return error instanceof Error?(/Failed to fetch|NetworkError|AbortError/.test(error.message)?'交通记录未能加载，请检查本地服务后重试。':error.message):'交通记录未能加载，请重新加载。'}
const stageNames:Record<string,string>={green:'绿灯放行',yellow:'黄灯过渡',all_red:'全红清空'}
export default function DualCampusWorkspace({view='control',sourceControls}:{view?:'overview'|'junction'|'control';sourceControls?:ReactNode}){
 const{dispatch}=useWorkspace(),session=useTrafficSession()
 const[arm,setArm]=useState<ConnectedPolicy>(session.current.arm),[reload,setReload]=useState(0),[vehicleExtent,setVehicleExtent]=useState<number[]|undefined>()
 const[region,setRegion]=useState<Region>(session.current.region),[data,setData]=useState<Data|null>(null),[meta,setMeta]=useState<Meta|null>(null),[error,setError]=useState(''),[time,setTime]=useState(.2),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(2),[focus,setFocus]=useState<string|null>(null),[chosen,setChosen]=useState<string|null>(null),[revision,setRevision]=useState(0),[detail,setDetail]=useState(view==='junction')
 useEffect(()=>{dispatch({type:'campus',campus:region})},[region,dispatch])
 const[event,setEvent]=useState<FrozenSpatialEvent|null>(null),[eventError,setEventError]=useState(''),[eventOn,setEventOn]=useState(false),[selectedRoad,setSelectedRoad]=useState<string|null>(null)
 const clock=useRef<PresentationClock>({time:.2,stamp:performance.now(),speed:2,playing:false}),timeRef=useRef(time);timeRef.current=time
 useEffect(()=>{if(data?.selectionKey===region+':'+arm){session.current.region=region;session.current.arm=arm;session.current.bookmarks[runKey(region,arm)]={time,focus,chosen,run_id:data.run.run_id}}},[time,focus,chosen,data,region,arm,session])
 const peak=useMemo(()=>data?.run.frames.reduce((best,f)=>f.vehicles.length>best.vehicles.length?f:best,data.run.frames[0]),[data])
 const evidence=useMemo(()=>data?baselineEvidence(data.common):null,[data])
 useEffect(()=>{let active=true;const controller=new AbortController();setPlaying(false);setData(null);setError('');setFocus(null);setChosen(null);setTime(.2);setEvent(null);setEventError('');setEventOn(false);setSelectedRoad(null);setVehicleExtent(undefined)
  ;(async()=>{const {meta:m,data:value,arm:effectiveArm}=await loadTrafficBundle(session.current.repository,region,arm);if(!active)return;if(effectiveArm!==arm){setArm(effectiveArm);return}
   const {common,run}=value;const saved=checkedBookmark(session.current.bookmarks[runKey(region,arm)],run.duration,Object.keys(common.geometry.junctions),common.vehicles.map(v=>v.id),run.run_id);setTime(saved.time);setFocus(saved.focus??(view==='junction'?Object.keys(common.geometry.junctions)[0]:null));setChosen(saved.chosen);const restoredVehicle=saved.chosen?networkFrameAt(run.frames,saved.time)?.vehicles.find(v=>v.id===saved.chosen):null;if(restoredVehicle)setVehicleExtent([restoredVehicle.center[0]-100,restoredVehicle.center[1]-100,restoredVehicle.center[0]+100,restoredVehicle.center[1]+100]);clock.current={time:saved.time,stamp:performance.now(),speed,playing:false};setMeta(m);setData({...value,selectionKey:region+':'+arm})
  })().catch(e=>{if(active)setError(loadErrorMessage(e))})
  return()=>{active=false;controller.abort();clock.current.playing=false}
 },[region,arm,reload])
 useEffect(()=>{if(!data||data.selectionKey!==region+':'+arm)return;let active=true;const controller=new AbortController()
  if(region==='SS'&&arm==='fixed'){setEventError('本固定配时记录未绑定事件空间证据');return}
  const eventPath=region==='LH'&&data.run.schema==='connected_campus_run_v2'?'LH/events/'+arm:'events/'+region
  session.current.repository.get(eventPath).then(v=>{const e=validateSpatialEvent(v,region,data.common.source_hashes.network,data.run.run_id,data.common.geometry.edges.map(e=>e.id));if(active)setEvent(e)}).catch(e=>{if(active)setEventError(e instanceof Error&&/Failed to fetch|NetworkError/.test(e.message)?'事件空间证据暂不可用':loadErrorMessage(e))})
  return()=>{active=false;controller.abort()}
 },[data,region,arm])
 useEffect(()=>{
  clock.current={time:timeRef.current,stamp:performance.now(),speed,playing:playing&&!!data}
  if(!playing||!data)return
  const timer=window.setInterval(()=>{const t=presentationTime(clock.current,performance.now(),data.run.duration);setTime(Math.max(.2,Math.floor((t+1e-7)*5)/5));if(t>=data.run.duration)setPlaying(false)},40)
  return()=>{clearInterval(timer);clock.current.playing=false}
 },[playing,data,speed])
 const seek=(n:number)=>{setPlaying(false);setTime(n);clock.current={time:n,stamp:performance.now(),speed,playing:false}}
 const clear=()=>{clock.current.playing=false;setPlaying(false);setData(null);setEvent(null);setFocus(null);setChosen(null);setVehicleExtent(undefined)}
 const change=(r:Region)=>{if(r!==region){clear();setArm('pressure');setRegion(r)}}
 const switchArm=(p:ConnectedPolicy)=>{if(p!==arm){clear();setArm(p)}}
 const armButtons=(region==='LH'||!!meta?.available_runs)?<div className="dual-arm-switch" role="group" aria-label="校区基线策略">{(['fixed','pressure']as ConnectedPolicy[]).map(p=><button key={p} aria-pressed={arm===p} onClick={()=>switchArm(p)}>{p==='fixed'?'固定配时':'压力基线'}</button>)}</div>:null
 if(error)return <section role="alert" className="error">{error}<button onClick={()=>{session.current.repository.clearSettled();setReload(n=>n+1)}}>重新加载</button><button onClick={()=>setRegion(region==='LH'?'SS':'LH')}>切换另一校区</button></section>
 if(!data||!meta||data.selectionKey!==region+':'+arm)return <section className="dual-workspace"><div className="dual-regions">{(['LH','SS'] as Region[]).map(r=><button key={r} onClick={()=>change(r)}>{r==='LH'?'莲花街校区':'嵩山路校区'}</button>)}</div>{armButtons}<p role="status">正在载入完整交通记录并核对校区、策略与路网…</p></section>
 const frame=networkFrameAt(data.run.frames,time)!,queue=Object.values(frame.junctions).reduce((n,a)=>n+a.observation.reduce((s,o)=>s+o.queue,0),0)
 const junctions=Object.values(data.common.geometry.junctions),selected=chosen?data.common.vehicles.find(v=>v.id===chosen):null,current=frame.vehicles.find(v=>v.id===chosen)
 const activeEvent=eventOn&&event?.region===region&&event.run_id===data.run.run_id?event:undefined,exposure=activeEvent?eventVehicleSummary(frame,data.common.geometry.lanes,activeEvent):null
 const locate=(id:string|null)=>{setVehicleExtent(undefined);setFocus(id);setRevision(v=>v+1)}
 const trip=chosen?evidence?.vehicles.find(v=>v.id===chosen)?.runs[arm]:null
 const showVehicle=(id:string)=>{const f=frame.vehicles.some(v=>v.id===id)?frame:data.run.frames.find(f=>f.vehicles.some(v=>v.id===id));const v=f?.vehicles.find(v=>v.id===id);setChosen(id);if(f&&v){seek(f.time);setFocus(null);setVehicleExtent([v.center[0]-100,v.center[1]-100,v.center[0]+100,v.center[1]+100]);setRevision(n=>n+1)}}
 return <MapDeskView sourceControls={sourceControls} view={view} region={region} arm={arm} data={data} meta={meta} frame={frame} clock={clock} focus={focus} chosen={chosen} vehicleExtent={vehicleExtent} revision={revision} detail={detail} playing={playing} time={time} speed={speed} peakTime={peak?.time} event={event} eventError={eventError} eventOn={eventOn} selectedRoad={selectedRoad} onRegion={change} onArm={switchArm} onSeek={seek} onPlay={()=>setPlaying(v=>!v)} onSpeed={setSpeed} onDetail={setDetail} onFocus={locate} onChoose={setChosen} onVehicle={showVehicle} onEvent={setEventOn} onRoad={setSelectedRoad}/>

}
