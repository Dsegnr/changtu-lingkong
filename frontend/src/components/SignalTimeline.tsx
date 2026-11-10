import { armNames, clock, lightColor, type Change } from './junctionTypes'
export default function SignalTimeline({ changes, time, duration }: { changes: Change[]; time: number; duration: number }) {
  const start=Math.max(.2,Math.min(time-40,duration-120)),end=Math.min(duration,start+120),span=end-start
  return <div className="junction-signal-strip"><div className="junction-section-head"><h3>信号执行时间带</h3><span>{clock(start)} — {clock(end)}</span></div><div className="junction-time-grid"><div className="junction-time-labels">{'NESW'.split('').map(a=><span key={a}>{armNames[a]}</span>)}</div><svg viewBox="0 0 600 64" preserveAspectRatio="none" role="img" aria-label="四进口左转及直右灯组实际执行时间带">
    {'NESW'.split('').map((a,link)=><g key={a}>{changes.map((f,i)=>{
      const a=Math.max(start,f.time),b=Math.min(end,changes[i+1]?.time??duration)
      return b>a?<rect key={i} x={(a-start)/span*600} y={link*16+2} width={(b-a)/span*600} height="9" fill={lightColor(f.state[link*3])}/>:null
    })}</g>)}
    <line x1={(time-start)/span*600} x2={(time-start)/span*600} y1="0" y2="64" stroke="#21465e" strokeWidth="2"/>
  </svg></div><small>本情景同一进口左转、直右同步放行；时间带来自实际信号读回。</small></div>
}

