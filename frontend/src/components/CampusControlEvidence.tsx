import{useMemo,useState}from'react'
import type{ConnectedCommon,ConnectedRun,NetworkFrame}from'./connectedCampusTypes'
import{controlEvents,controlSnapshot,queueHistory,eventWindow,controlReasons,controlStages}from'./connectedControlEvidence'

const clock=(t:number)=>`${Math.floor(t/60).toString().padStart(2,'0')}:${(t%60).toFixed(1).padStart(4,'0')}`
export default function CampusControlEvidence({common,run,other,time,focus,error,onEvent,onHarmed}:{common:ConnectedCommon;run:ConnectedRun;other:ConnectedRun|null;time:number;focus:string|null;error:string;onEvent:(id:string,time:number)=>void;onHarmed:(id:string)=>void}){
 const[type,setType]=useState('all'),events=useMemo(()=>controlEvents(run),[run]),filtered=useMemo(()=>events.filter(e=>(!focus||e.junction===focus)&&(type==='all'||e.kind===type)),[events,focus,type]),visible=eventWindow(filtered,time)
 const pair=other&&other.run_id===common.runs[other.policy].run_id?{[run.policy]:run,[other.policy]:other}:null
 const fixed=pair?.fixed,pressure=pair?.pressure,fs=fixed?controlSnapshot(fixed,common,time,focus):null,ps=pressure?controlSnapshot(pressure,common,time,focus):null
 const a=fixed?queueHistory(fixed,focus,time):[],b=pressure?queueHistory(pressure,focus,time):[],max=Math.max(1,...a.map(p=>p.queue),...b.map(p=>p.queue)),start=Math.max(.2,time-60),span=Math.max(1,time-start)
 const path=(points:{time:number;queue:number}[])=>points.map((p,i)=>`${i?'L':'M'}${40+(p.time-start)/span*860},${152-p.queue/max*115}`).join(' ')
 const worst=common.vehicles.filter(v=>v.runs.pressure.delta>0).sort((a,b)=>b.runs.pressure.delta-a.runs.pressure.delta)[0]
 const latest=filtered.filter(e=>e.time<=time+1e-7).at(-1)
 const rows:(['fixed'|'pressure',typeof fs])[]=[['fixed',fs],['pressure',ps]]
 const executed=(f:NetworkFrame|null|undefined)=>focus&&f?controlStages[f.junctions[focus].stage]:'走廊总计'
 return <div className="campus-control-evidence" data-testid="campus-control-evidence">
  <section className="campus-event-panel"><header><div><h3>控制事件时间线</h3><p>当前方案完整运行索引 · 点击事件定位同一地图与时钟</p></div><label>事件类型<select aria-label="校园控制事件类型" value={type} onChange={e=>setType(e.target.value)}><option value="all">全部事件</option><option value="evaluation">压力评估</option><option value="switch">准备换向</option><option value="phase">阶段执行</option></select></label></header>
   <div className="campus-events" aria-label="校园控制事件">{visible.map(e=><button key={e.id} data-event-id={e.id} data-event-time={e.time} data-junction={e.junction} aria-current={e.id===latest?.id?'step':undefined} className={e.time>time?'future':''} onClick={()=>onEvent(e.junction,e.time)}><time>{clock(e.time)}</time><span><b>{e.junction} · {e.kind==='evaluation'?'保持放行评估':controlStages[e.stage]}</b><small>{controlReasons[e.reason]??e.reason} · 排队{e.queue}辆</small></span></button>)}</div>{!visible.length&&<p>当前筛选无信号事件；优先通行节点不生成配时事件。</p>}<p className="campus-control-caption">共{filtered.length}条，显示当前时刻附近{visible.length}条。浅色为尚未播放到的记录，可定位回放，不是未来预测。</p>
  </section>
  <section className="campus-paired-panel" data-testid="campus-same-time-comparison"><header><div><h3>同一时刻 · 两方案对照</h3><p>{focus?common.geometry.junctions[focus].name:'四路口走廊'} · 目标时刻 {clock(time)}</p></div><span>压力控制 − 固定配时</span></header>
   {!pair||!fs||!ps?<p role={error?'alert':'status'}>{error||(other?'对照运行与当前记录不匹配，已停止对照。':'正在加载另一方案记录…')}</p>:<><div className="campus-paired-scroll" tabIndex={0} role="region" aria-label="同刻策略对照表，窄屏可横向滚动"><table><thead><tr><th>方案</th><th>{focus?'路口排队':'全网排队'}</th><th>执行阶段</th><th>全网在途 / 到达</th><th>观测时刻</th></tr></thead><tbody>{rows.map(([policy,s])=><tr key={policy} data-comparison-policy={policy} data-sample-time={s!.time} data-queue={s!.queue}><th>{policy==='fixed'?'固定配时':'压力控制'}{s!.ended&&<small> · 运行已结束</small>}</th><td>{s!.queue}辆</td><td>{executed(s!.frame)}</td><td>{s!.inflight} / {s!.arrived}</td><td>{s!.time.toFixed(1)}s <small>决策{s!.actionTime.toFixed(1)}s</small></td></tr>)}</tbody></table></div><p className="campus-table-hint">可左右滑动查看完整表格</p><p className="campus-paired-delta">当前排队差 <strong className={ps.queue-fs.queue>0?'bad':'good'}>{ps.queue-fs.queue>0?'+':''}{ps.queue-fs.queue}辆</strong><span>两方案各取不晚于目标时刻的最近记录；车辆位置及灯态分别来自各自运行。</span></p>
   <figure className="campus-queue-history"><figcaption>最近60秒排队轨迹 <span><i/>压力控制 <i/>固定配时</span></figcaption><svg viewBox="0 0 940 190" role="img" aria-label="同刻两策略排队历史曲线"><line x1="40" x2="900" y1="152" y2="152" stroke="#c9dbe3"/><text x="8" y="40">{max}辆</text><text x="8" y="155">0</text><path d={path(a)} stroke="#c58e2c" strokeWidth="2" strokeDasharray="6 5" fill="none"/><path d={path(b)} stroke="#16859e" strokeWidth="2.5" fill="none"/><text x="40" y="180">{clock(start)}</text><text x="900" y="180" textAnchor="end">{clock(time)}</text></svg></figure></>}
   <footer><p>队列变化是回放观测，单次下降不能证明调控收益；完整运行仍有 <b className="bad">{common.runs.pressure.paired!.harmed}辆受损</b>。</p>{worst&&<button onClick={()=>onHarmed(worst.id)}>核验受损车辆示例</button>}</footer>
  </section>
 </div>
}
