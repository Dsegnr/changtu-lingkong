import{useEffect,useMemo,useRef,useState}from'react'
import type{ConnectedCommon,ConnectedContext,ConnectedBasemap,BasemapMode}from'./connectedCampusTypes'
import type{ReceivingCase,ReceivingProduct}from'./receivingRecordingTypes'
import{connectedBasemap,connectedContext}from'./connectedCampusPlayback'
import{caseNames,receivingFrameAt,receivingSceneRun}from'./receivingRecordingPlayback'
import{presentationTime,type PresentationClock}from'./connectedPresentation'
import{validBasemap}from'./connectedBasemapMath'
import ConnectedCampusScene from'./ConnectedCampusScene'
import ReceivingRecordingEvidence from'./ReceivingRecordingEvidence'
import '../receivingRecording.css'

export default function ReceivingRecordingWorkspace({product,common,view}:{product:ReceivingProduct;common:ConnectedCommon;view:'research'|'control'}){
 const[context,setContext]=useState<ConnectedContext|null>(null),[basemap,setBasemap]=useState<ConnectedBasemap|null>(null),[error,setError]=useState(''),[baseError,setBaseError]=useState('')
 const[caseId,setCaseId]=useState<ReceivingCase['id']>('T2'),[time,setTime]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[chosen,setChosen]=useState('blocker'),[focus,setFocus]=useState<string|null>('B'),[camera,setCamera]=useState('corridor'),[revision,setRevision]=useState(0),[follow,setFollow]=useState(false),[basemapMode,setBasemapMode]=useState<BasemapMode>('amap')
 const recording=product.cases.find(c=>c.id===caseId)!,run=useMemo(()=>receivingSceneRun(recording,product),[recording,product]),timeRef=useRef(time);timeRef.current=time
 const clock=useRef<PresentationClock>({time:0,stamp:performance.now(),speed:1,playing:false})
 useEffect(()=>{let active=true;connectedContext().then(c=>{if(c.network_sha256!==product.network_sha256)throw Error('地物与接收记录签名不一致');if(active)setContext(c)}).catch(e=>{if(active)setError(String(e))});connectedBasemap().then(b=>{if(!validBasemap(b)||b.network_sha256!==product.network_sha256)throw Error('底图签名不一致');if(active)setBasemap(b)}).catch(()=>{if(active){setBaseError('底图不可用，保留离线地物');setBasemapMode('offline')}});return()=>{active=false}},[product])
 useEffect(()=>{clock.current={time:timeRef.current,stamp:performance.now(),speed,playing};if(!playing)return;const timer=window.setInterval(()=>{const now=presentationTime(clock.current,performance.now(),run.duration);setTime(Math.min(run.duration,Math.floor((now+1e-7)*5)/5));if(now>=run.duration)setPlaying(false)},100);return()=>{clearInterval(timer);clock.current.playing=false}},[playing,speed,run])
 useEffect(()=>{if(!playing)clock.current={time,stamp:performance.now(),speed,playing:false}},[time,playing,speed])
 const frame=receivingFrameAt(recording.frames,time)!,sceneFrame=run.frames[Math.round(frame.time*5)]
 const viewExtent=useMemo(()=>camera==='corridor'?[145,180,260,505]:undefined,[camera])
 const seek=(value:number)=>{const t=Math.min(run.duration,Math.max(0,Math.round(value*5)/5));clock.current={time:t,stamp:performance.now(),speed,playing:false};setPlaying(false);setTime(t);setFollow(false)}
 const changeCase=(id:ReceivingCase['id'])=>{seek(0);setCaseId(id);setChosen('blocker');setFocus('B');setCamera('corridor');setRevision(n=>n+1)}
 const junction=(id:string|null)=>{setFocus(id);setCamera(id?'junction':'network');setFollow(false);setRevision(n=>n+1)}
 const choose=(id:string)=>{setChosen(id);setFollow(false)}
 if(error)return <p role="alert" className="error">{error}。请切回区域联动记录。</p>
 if(!context)return <p className="loading">正在核对接收记录与同源地物…</p>
 return <section className="connected-workspace receiving-workspace" data-testid="receiving-workspace" data-case={caseId} data-time={frame.time} data-playing={playing} data-view={view}>
 <header className="connected-heading"><div><h2>{view==='control'?'AI交警 · 接收与恢复':'路口研究 · 接收与恢复'}</h2><p>工人路—伊河路至颖河路 · 下游入口空间与上游转向关联</p></div><span className="connected-badge">已记录仿真 / 固定信号</span></header>
 <div className="connected-toolbar"><label>场景记录<select aria-label="接收场景" value={caseId} onChange={e=>changeCase(e.target.value as ReceivingCase['id'])}>{(['T0','T1','T2']as const).map(id=><option key={id} value={id}>{id} · {caseNames[id]}</option>)}</select></label><label>观察区域<select aria-label="接收观察区域" value={camera==='junction'?focus??'':camera} onChange={e=>{const v=e.target.value;if(v==='corridor'){setCamera(v);setFollow(false);setRevision(n=>n+1)}else if(v==='network')junction(null);else junction(v)}}><option value="corridor">B→C全走廊</option><option value="network">四路口位置参照</option>{Object.values(common.geometry.junctions).map(j=><option key={j.id} value={j.id}>{j.id} · {j.name}</option>)}</select></label><div className="connected-now"><b data-testid="receiving-count">{frame.vehicles.length}</b> 本帧在途 / 7个身份</div><button onClick={()=>{junction('B');setRevision(n=>n+1)}}>放大接收入口</button></div>
 <div className="receiving-status-strip"><span><i/>仅观测 · 未执行新调控</span><p>三态证据按当前0.2秒样本更新，车辆位置连续呈现。</p></div>
 <div className="connected-background-controls"><div role="group" aria-label="接收地图背景"><button aria-pressed={basemapMode==='amap'} disabled={!basemap} onClick={()=>setBasemapMode('amap')}>高德地理底图</button><button aria-pressed={basemapMode==='offline'} onClick={()=>setBasemapMode('offline')}>离线环境</button></div><button aria-pressed={follow} disabled={!frame.vehicles.some(v=>v.id===chosen)} onClick={()=>{setCamera('junction');setFollow(!follow)}}>{follow?'取消跟随':'跟随所选车'}</button><span>{baseError||'A / B / C 已记录固定信号 · D无信号记录'}</span></div>
 <div className="connected-main"><div className="connected-map-column"><div className="connected-map-topline"><b>{camera==='corridor'?'B→C · 两条接收车道':focus?`${focus} · ${common.geometry.junctions[focus].name}`:'四路口位置参照'}</b><span>橙：入口车辆　紫：北进口车队　蓝：东进口车队</span></div><ConnectedCampusScene common={common} context={context} basemap={basemap} basemapMode={basemapMode} laneDetail={camera==='junction'} viewExtent={viewExtent} viewRevision={revision} run={run} clock={clock} frame={sceneFrame} focus={focus} chosen={chosen} follow={follow} onJunction={junction} onVehicle={choose} onFollowEnd={()=>setFollow(false)}/>
 <div className="connected-timeline"><button aria-label={playing?'暂停接收回放':'播放接收回放'} onClick={()=>{if(time>=run.duration)seek(0);setPlaying(!playing)}}>{playing?'暂停':'播放'}</button><button className="receiving-reset" onClick={()=>changeCase(caseId)}>复位</button><strong data-testid="receiving-clock">{frame.time.toFixed(1)} s</strong><input aria-label="接收回放时间" type="range" min={0} max={179.8} step={.2} value={frame.time} onChange={e=>seek(+e.target.value)}/><span>179.8 s</span><select aria-label="接收回放速度" value={speed} onChange={e=>setSpeed(+e.target.value)}>{[.5,1,2,4].map(n=><option key={n} value={n}>{n}倍速</option>)}</select></div>
 <div className="receiving-map-keys"><span className="receiving-key blocked">入口受阻</span><span className="receiving-key space_available">当前有空间</span><span className="receiving-key unknown">证据不足</span><small>空间标签不代表灯色或放行许可</small></div>
 <p className="connected-frame-note">独立七车记录 · {frame.time.toFixed(1)}秒原始样本 · 空间观测范围B0/B3 · 未叠加区域车队</p></div><ReceivingRecordingEvidence frame={frame} recording={recording} product={product} chosen={chosen} onChoose={choose} onSeek={seek}/></div>
 <div className="receiving-sequence" aria-label="恢复过程复盘"><div><b>恢复过程</b><span>完整片段复盘索引</span></div>{recording.events.map((e,i)=><button key={i} disabled={e.time===null} data-reached={e.time!==null&&e.time<=frame.time} onClick={()=>e.time!==null&&seek(e.time)}><strong>{e.time===null?'—':e.time.toFixed(1)}<small>{e.time!==null?' s':''}</small></strong><span>{e.label}</span></button>)}</div>
 <details className="connected-evidence"><summary>数据来源与核验边界</summary><ul>{product.source_limits.map(s=><li key={s}>{s}</li>)}</ul><p>同一冻结校园周边路网与地物，实际车辆位置按前保险杠绘制，车身向后延伸4.6米。信号倒计时是当前阶段余量，红灯阶段结束不保证马上转绿。当前方向使用仿真给出的nextTLS，尚未接入路侧感知。</p><p>静止入口连续证据至少1秒才确认；路口内部占用、移动间隙不足、采样断档或范围外保留未知。判定不读取停车结束时刻和后续通行事件。事件按钮仅用于完整记录复盘。</p><code>{product.source_packet_sha256}</code></details>
 </section>
}
