import {useMemo} from 'react'
import type {ConnectedRun, NetworkJunction} from './connectedCampusTypes'
import {buildPhaseTracks,phaseWindow,seekInWindow} from './corridorPhaseRecords'

const stageLabel:Record<string,string>={green:'绿灯',yellow:'黄灯',all_red:'全红',priority:'让行'}
export default function CorridorPhaseTimeline({run,junctions,time,focus,onFocus,onSeek}:{run:ConnectedRun<string>;junctions:NetworkJunction[];time:number;focus:string|null;onFocus:(id:string)=>void;onSeek:(t:number)=>void}){
  const ids=junctions.map(j=>j.id).join('|')
  const tracks=useMemo(()=>run.frames.length?buildPhaseTracks(run,ids?ids.split('|'):[]):[],[run,ids])
  const first=run.frames[0]?.time,last=run.frames.at(-1)?.time
  if(first===undefined||last===undefined||last<=first)return null
  const {start,end}=phaseWindow(time,first,last)
  return <section className="desk-phase-records" aria-label="多路口相位记录" data-run={run.run_id} data-window-start={start} data-window-end={end}>
    <header><span>完整回放记录，非在线预测</span></header>
    {tracks.map(track=>{const j=junctions.find(j=>j.id===track.id)!
      return <div className="desk-phase-row" key={track.id} data-junction={j.id}>
        <button className="desk-phase-node" onClick={()=>onFocus(j.id)} aria-pressed={focus===j.id}>{j.id}<span>{j.name.split('—').at(-1)}</span></button>
        <button className="desk-phase-track" aria-label={'定位'+j.id+'相位记录时间'} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();const t=seekInWindow(e.clientX-r.left,r.width,start,end);if(t!==null)onSeek(t)}} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();onSeek(e.key==='Home'?start:e.key==='End'?end:Math.max(first,Math.min(last,Math.round((time+(e.key==='ArrowLeft'?-1:1))*5)/5)))}}}>
          {track.segments.filter(s=>s.end>start&&s.start<end).map(s=>{const a=j.approaches.find(a=>a.id===s.approach),left=Math.max(s.start,start),right=Math.min(s.end,end)
            return <span className={'desk-phase-segment stage-'+(['green','yellow','all_red','priority'].includes(s.stage)?s.stage:'unknown')} key={s.start} style={{left:(left-start)/(end-start)*100+'%',width:(right-left)/(end-start)*100+'%'}} data-start={s.start} data-end={s.end} data-stage={s.stage} data-state={s.state} data-approach={s.approach} title={`${s.start.toFixed(1)}–${s.end.toFixed(1)}秒 ${stageLabel[s.stage]??'未记录阶段'} / ${a?.label??'进口未记录'}`}>
              {right-left>=10&&<small>{s.stage==='green'?a?.label.split('·').at(-1):stageLabel[s.stage]??'未知'}</small>}
            </span>})}
          {time>=start&&time<=end&&<i className="desk-phase-cursor" style={{left:(time-start)/(end-start)*100+'%'}}/>}
        </button>
      </div>})}
    <div className="desk-phase-scale"><span>{start.toFixed(1)} s</span><span>点击色带定位 / 方向键逐秒</span><span>{end.toFixed(1)} s</span></div>
  </section>
}
