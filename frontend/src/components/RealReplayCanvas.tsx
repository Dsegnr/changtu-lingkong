import { useEffect, useMemo, useRef, useState } from 'react'
import { activeTracks, agentStyles, type SinDReplay } from '../lib/sindReplay'

interface Props { data: SinDReplay; time: number; visible: Set<string>; selected: string | null; onSelect: (id: string | null) => void; context: boolean; trails: boolean }
export default function RealReplayCanvas({ data, time, visible, selected, onSelect, context, trails }: Props) {
  const host = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: 800, h: 600 }), [view, setView] = useState({ zoom: 1, x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null)
  const active = useMemo(() => activeTracks(data, time, visible), [data, time, visible])
  const [minX, minY, maxX, maxY] = data.bounds_m
  const baseScale = Math.min((size.w - (size.w < 500 ? 40 : 90)) / (maxX - minX), (size.h - 100) / (maxY - minY))
  const scale = baseScale * view.zoom, cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
  const scaleMetres = scale > 20 ? 2 : scale > 10 ? 5 : 10
  const px = (x: number) => size.w / 2 + view.x + (x - cx) * scale
  const py = (y: number) => size.h / 2 + view.y - (y - cy) * scale
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width && height) setSize({ w: width, h: height })
    })
    if (host.current) observer.observe(host.current)
    return () => observer.disconnect()
  }, [])
  // Static context is made only from recorded trajectories, never inferred roads.
  const backdrop = useMemo(() => {
    const off = document.createElement('canvas'), dpr = window.devicePixelRatio || 1
    off.width = Math.round(size.w * dpr); off.height = Math.round(size.h * dpr)
    const ctx = off.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.fillStyle = '#f5f8fa'; ctx.fillRect(0, 0, size.w, size.h)
    ctx.strokeStyle = '#e1e9ee'; ctx.lineWidth = 1
    ctx.font = '10px Microsoft YaHei'; ctx.fillStyle = '#8094a2'
    const spacing = view.zoom > 2 ? 5 : 10
    for (let x = Math.floor((cx - size.w / scale) / spacing) * spacing; x < cx + size.w / scale; x += spacing) {
      const u = px(x); ctx.beginPath(); ctx.moveTo(u, 0); ctx.lineTo(u, size.h); ctx.stroke()
      if (u > 40 && u < size.w - 20 && (size.w > 500 || x % 20 === 0)) ctx.fillText(`${x} m`, u + 4, size.h - 32)
    }
    for (let y = Math.floor((cy - size.h / scale) / spacing) * spacing; y < cy + size.h / scale; y += spacing) {
      const v = py(y); ctx.beginPath(); ctx.moveTo(0, v); ctx.lineTo(size.w, v); ctx.stroke()
      if (v > 75 && v < size.h - 65) ctx.fillText(`${y} m`, 9, v - 4)
    }
    if (context) {
      ctx.strokeStyle = '#47768a'; ctx.lineWidth = .65; ctx.globalAlpha = .06
      for (const track of data.tracks) {
        ctx.beginPath()
        track.samples.forEach((row, i) => { if (!i) ctx.moveTo(px(row[2]), py(row[3])); else ctx.lineTo(px(row[2]), py(row[3])) })
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
    return off
    // Projection helpers depend entirely on these size/view/bounds values.
  }, [data, size, view, context])
  useEffect(() => {
    const node = canvas.current
    if (!node) return
    const dpr = window.devicePixelRatio || 1
    node.width = Math.round(size.w * dpr); node.height = Math.round(size.h * dpr)
    const ctx = node.getContext('2d')!
    ctx.drawImage(backdrop, 0, 0)
    ctx.scale(dpr, dpr)
    for (const { track, index, sample: s } of active) {
      const color = agentStyles[track.agent_type]?.color || '#526d82'
      const chosen = selected === track.id
      if (trails || chosen) {
        ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = chosen ? 2.6 : 1.3; ctx.globalAlpha = chosen ? .85 : .28
        const start = Math.max(0, index - (chosen ? 200 : 50))
        for (let i = start; i <= index; i++) {
          const row = track.samples[i]
          if (i === start || row[1] - track.samples[i - 1][1] > data.median_interval_ms * 1.5) ctx.moveTo(px(row[2]), py(row[3]))
          else ctx.lineTo(px(row[2]), py(row[3]))
        }
        ctx.stroke(); ctx.globalAlpha = 1
      }
      const x = px(s[2]), y = py(s[3])
      if (chosen) { ctx.beginPath(); ctx.arc(x, y, 15, 0, 2 * Math.PI); ctx.fillStyle = '#ffffffbd'; ctx.fill(); ctx.strokeStyle = '#164f78'; ctx.lineWidth = 2; ctx.stroke() }
      ctx.save(); ctx.translate(x, y)
      // Body orientation is recorded yaw, not the velocity heading.
      ctx.rotate(-(s[6] ?? 0)); ctx.fillStyle = color; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1
      if (track.agent_type === 'pedestrian') {
        ctx.beginPath(); ctx.arc(0, 0, 3.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      } else {
        const length = Math.max(s[7]! * scale, 7), width = Math.max(s[8]! * scale, 4)
        ctx.beginPath(); ctx.roundRect(-length / 2, -width / 2, length, width, Math.min(2, width / 3)); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#ffffffb8'; ctx.fillRect(length / 2 - Math.min(3, length * .23), -width * .3, Math.min(1.5, length * .12), width * .6)
      }
      ctx.restore()
      if (chosen) {
        const text = `${track.id}  ${(Math.hypot(s[4], s[5]) * 3.6).toFixed(1)} km/h`
        ctx.font = '12px Microsoft YaHei'; const width = ctx.measureText(text).width + 16
        let labelX = Math.max(6, Math.min(size.w - width - 6, x + width + 21 > size.w ? x - width - 15 : x + 15))
        const labelY = Math.max(70, Math.min(size.h - 70, y - 30))
        if (labelY < 140) labelX = Math.max(6, Math.min(labelX, size.w - width - 62))
        ctx.fillStyle = '#173e59'; ctx.fillRect(labelX, labelY, width, 25)
        ctx.fillStyle = 'white'; ctx.fillText(text, labelX + 8, labelY + 17)
      }
    }
  }, [active, backdrop, selected, size, trails, view, data])
  function choose(clientX: number, clientY: number) {
    const rect = canvas.current!.getBoundingClientRect(), x = clientX - rect.left, y = clientY - rect.top
    const hit = active.map(a => ({ id: a.track.id, distance: Math.hypot(px(a.sample[2]) - x, py(a.sample[3]) - y) })).sort((a, b) => a.distance - b.distance)[0]
    onSelect(hit && hit.distance < 18 ? hit.id : null)
  }
  return <div className="real-stage" ref={host}>
    <canvas ref={canvas} aria-label="天津SinD真实交通参与者轨迹；可拖动、缩放并点击对象" role="img"
      onPointerDown={e => { drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false }; e.currentTarget.setPointerCapture(e.pointerId) }}
      onPointerMove={e => { const d = drag.current; if (d) { const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.hypot(dx, dy) > 4) d.moved = true; if (d.moved) setView(v => ({ ...v, x: d.vx + dx, y: d.vy + dy })) } }}
      onPointerUp={e => { if (drag.current && !drag.current.moved) choose(e.clientX, e.clientY); drag.current = null }}
      onPointerCancel={() => { drag.current = null }}
      onWheel={e => setView(v => ({ ...v, zoom: Math.max(.6, Math.min(6, v.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15))) }))} />
    <div className="real-scene-caption"><b>天津 · 信号交叉口</b><span>局部坐标 / 米制</span></div>
    <div className="real-map-controls"><button aria-label="放大轨迹视图" onClick={() => setView(v => ({ ...v, zoom: Math.min(6, v.zoom * 1.3) }))}>＋</button><button aria-label="缩小轨迹视图" onClick={() => setView(v => ({ ...v, zoom: Math.max(.6, v.zoom / 1.3) }))}>−</button><button onClick={() => setView({ zoom: 1, x: 0, y: 0 })}>全景</button></div>
    <div className="real-scale"><span style={{ width: scaleMetres * scale }} />{scaleMetres} m</div>
    <span className="real-axis">+Y ↑　+X →</span>
    <span className="real-stage-note">淡线为全片段轨迹覆盖；非道路底图</span>
  </div>
}
