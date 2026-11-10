import { useId } from 'react'
import { lightColor, type Geometry, type JunctionFrame } from './junctionTypes'
export { lightColor } from './junctionTypes'
const points = (xy: number[][]) => xy.map(p => `${p[0]},${-p[1]}`).join(' ')
const turnColor: Record<string, string> = { left: '#a999e8', straight: '#69bde9', right: '#e5b95b' }
export default function JunctionScene({ geometry, frame, wide, chosen, onChoose }: { geometry: Geometry; frame: JunctionFrame; wide: boolean; chosen: string | null; onChoose: (id: string) => void }) {
  const grid = useId(), [cx, cy] = geometry.center, size = wide ? 390 : 88
  const selected = frame.vehicles.find(v => v.id === chosen)
  return <svg className="junction-scene" data-wide={wide} viewBox={`${cx-size/2} ${-cy-size/2} ${size} ${size}`} role="img" aria-label="四进口共享车道与实际信号车辆回放">
    <defs><pattern id={grid} width="5" height="5" patternUnits="userSpaceOnUse"><path d="M5 0 H0 V5" fill="none" stroke="#cad9e0" strokeWidth=".07"/></pattern></defs>
    <rect x={cx-250} y={-cy-250} width="500" height="500" fill="#eaf1f3"/><rect x={cx-250} y={-cy-250} width="500" height="500" fill={`url(#${grid})`}/>
    <polygon points={points(geometry.junction_shape)} fill="#3d505e"/>
    {geometry.lanes.filter(l=>!l.internal).map(l=><polyline key={l.id} points={points(l.shape)} fill="none" stroke="#3d505e" strokeWidth={l.width}/>)}
    {geometry.lanes.filter(l=>!l.internal).flatMap(l=>[-1,1].map(side=>{
      const first=l.shape[0],last=l.shape.at(-1)!,dx=last[0]-first[0],dy=last[1]-first[1],len=Math.hypot(dx,dy)
      const line=l.shape.map(p=>[p[0]-dy/len*l.width/2*side,p[1]+dx/len*l.width/2*side])
      const lane=Number(l.id.at(-1)), dashed=lane===0&&side===1||lane===1&&side===-1, median=lane===1&&side===1
      return <polyline key={`${l.id}-${side}`} points={points(line)} fill="none" stroke={median?'#dfbb69':'#ecf4f6'} strokeWidth={median?'.15':'.11'} strokeDasharray={dashed?'1.4 1.5':undefined}/>
    }))}
    {geometry.links.map(l=><polyline key={l.index} data-link={l.index} points={points(l.shape)} fill="none" stroke={lightColor(frame.state[l.index])} strokeWidth={frame.state[l.index]==='G'?'.28':'.09'} strokeDasharray=".6 .7" opacity={frame.state[l.index]==='r'?.19:.65}/>)}
    {geometry.stop_lines.map(l=><polyline key={l.approach} data-stop-line={l.approach} points={points(l.points)} fill="none" stroke="#fff" strokeWidth=".45"/>)}
    {geometry.arrows.map(a=><g key={a.lane} transform={`translate(${a.position[0]} ${-a.position[1]}) rotate(${a.angle})`} fill="none" stroke="#edf4f5" strokeWidth=".24" strokeLinejoin="round" strokeLinecap="round">
      <path d={a.kind==='left'?'M0 2 V-1 H-1.3 M-.6 -1.7 L-1.3 -1 L-.6 -.3':'M0 2 V-2 M-.6 -1.3 L0 -2 L.6 -1.3 M0 .4 H1.3 M.6 -.3 L1.3 .4 L.6 1.1'}/>
    </g>)}
    {!wide&&<g className="junction-arm-labels" textAnchor="middle"><text x={cx+12} y={-cy-29}>北进口</text><text x={cx+22.5} y={-cy-12}>东进口</text><text x={cx-12} y={-cy+32}>南进口</text><text x={cx-22.5} y={-cy+14}>西进口</text></g>}
    {geometry.heads.map(h=>{
      const x=h.position[0],y=-h.position[1],state=frame.state[h.indices[0]]
      return <g key={h.id} className="junction-head" data-head={h.id} data-signal={state} aria-label={`${h.approach} ${h.type==='circle'?'直右圆灯':'左转箭头'} ${state}`}>
        <rect x={x-1.35} y={y-1.35} width="2.7" height="2.7" rx=".4" fill="#172f41" stroke="#eff8fb" strokeWidth=".15"/>
        {h.type==='circle'?<circle cx={x} cy={y} r=".83" fill={lightColor(state)}/>:<path transform={`translate(${x} ${y}) rotate(${h.angle})`} d="M.8 0 H-.8 M-.1 -.7 L-.8 0 L-.1 .7" fill="none" stroke={lightColor(state)} strokeWidth=".38"/>}
      </g>
    })}
    {frame.vehicles.map(v=><g key={v.id} data-vehicle={v.id} data-lane={v.lane} className="junction-car" role="button" tabIndex={0} aria-label={`选择车辆 ${v.id}`} onClick={()=>onChoose(v.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onChoose(v.id)}}}>
      <title>{v.id} · {(v.speed*3.6).toFixed(1)} km/h · {v.lane}</title>
      {chosen===v.id&&<circle cx={v.center[0]} cy={-v.center[1]} r="3.5" fill="none" stroke="#d47d16" strokeWidth=".3"/>}
      <g className="junction-body" transform={`translate(${v.center[0]} ${-v.center[1]}) rotate(${v.angle})`}>
        <rect className="junction-car-hit" x={-v.width/2-.55} y={-v.length/2-.4} width={v.width+1.1} height={v.length+.8} fill="transparent"/>
        <rect x={-v.width/2} y={-v.length/2} width={v.width} height={v.length} rx=".32" fill={turnColor[v.turn]} stroke={chosen===v.id?'#fff2ba':'#d5e8f0'} strokeWidth=".16"/>
        <rect x={-v.width*.35} y={-v.length*.28} width={v.width*.7} height={v.length*.18} rx=".1" fill="#1d435b"/>
        {v.speed<.1&&<path d={`M${-v.width*.35} ${v.length*.36} H${v.width*.35}`} stroke="#ed736d" strokeWidth=".25"/>}
      </g>
    </g>)}
    {selected&&<g pointerEvents="none"><text className="junction-car-label" x={selected.center[0]+3.8} y={-selected.center[1]-.5}>{selected.id.replace('J_SinD_','#')}</text></g>}
  </svg>
}

