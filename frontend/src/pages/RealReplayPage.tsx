import { useEffect, useMemo, useRef, useState } from 'react'
import RealReplayCanvas from '../components/RealReplayCanvas'
import '../realReplay.css'
import { activeTracks, agentStyles, assertReplay, atReplayEnd, clock, lightsAt, type SinDReplay } from '../lib/sindReplay'

export default function RealReplayPage() {
  const [data, setData] = useState<SinDReplay | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0)
  const [time, setTime] = useState(0), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1)
  const [selected, setSelected] = useState<string | null>(null), [visible, setVisible] = useState(new Set(Object.keys(agentStyles)))
  const [context, setContext] = useState(true), [trails, setTrails] = useState(true)
  const timeRef = useRef(time)
  useEffect(() => { timeRef.current = time }, [time])
  useEffect(() => {
    const abort = new AbortController()
    setError('')
    fetch('/api/replay', { signal: abort.signal }).then(response => {
      if (!response.ok) throw new Error(`数据服务返回 ${response.status}`)
      return response.json()
    }).then(value => { if (!abort.signal.aborted) setData(assertReplay(value)) }).catch(reason => { if (!abort.signal.aborted) setError(String(reason.message || reason)) })
    return () => abort.abort()
  }, [retry])
  useEffect(() => {
    if (!playing || !data) return
    let request = 0, previous = 0, rendered = 0, accumulated = timeRef.current
    const animate = (now: number) => {
      if (previous) accumulated = Math.min(data.duration_ms, accumulated + Math.min(now - previous, 200) * speed)
      previous = now
      if (now - rendered >= 40 || accumulated >= data.duration_ms) { setTime(accumulated); rendered = now }
      if (accumulated >= data.duration_ms) { setPlaying(false); return }
      request = requestAnimationFrame(animate)
    }
    request = requestAnimationFrame(animate)
    const visibility = () => { if (document.hidden) setPlaying(false) }
    document.addEventListener('visibilitychange', visibility)
    return () => { cancelAnimationFrame(request); document.removeEventListener('visibilitychange', visibility) }
  }, [playing, speed, data])
  const active = useMemo(() => data ? activeTracks(data, time, visible) : [], [data, time, visible])
  const density = useMemo(() => {
    if (!data) return []
    return Array.from({ length: 121 }, (_, i) => ({ time: i * 10000, count: data.tracks.filter(t => t.samples[0][1] <= i * 10000 && t.samples[t.samples.length - 1][1] >= i * 10000).length }))
  }, [data])
  if (error) return <div className="error" role="alert"><h2>真实轨迹未载入</h2><p>{error}。请确认本地数据服务已启动。</p><button onClick={() => setRetry(v => v + 1)}>重新载入</button></div>
  if (!data) return <div className="real-loading" role="status"><div className="real-loading-symbol">⌁</div><h2>正在载入真实轨迹</h2><p>天津 SinD 公开片段 · 677 个交通参与者</p><small>首次载入约 7.2 MB 压缩数据，保留全部观测帧。</small></div>
  const current = lightsAt(data.light_events, time), next = data.light_events.find(e => e.timestamp_ms > time)
  const track = data.tracks.find(t => t.id === selected), observation = active.find(a => a.track.id === selected)
  const counts = Object.fromEntries(Object.keys(agentStyles).map(key => [key, active.filter(a => a.track.agent_type === key).length]))
  const meanSpeed = active.length ? active.reduce((sum, a) => sum + Math.hypot(a.sample[4], a.sample[5]) * 3.6, 0) / active.length : null
  const ended = atReplayEnd(time, data.duration_ms, data.median_interval_ms)
  function seek(ms: number) { setPlaying(false); setTime(Math.max(0, Math.min(data!.duration_ms, ms))) }
  return <div className="workspace-page real-page">
    <header className="page-header"><div><h2>真实轨迹回放</h2><p>SinD 天津公开片段　/　车辆、非机动车与行人同步观测</p></div><span className="real-source-badge"><i />历史采集数据</span></header>
    <div className="real-layout"><section className="real-viewer" aria-label="真实轨迹工作台">
      <div className="real-toolbar"><div className="real-recording"><strong>8_2_1</strong><span>20 分 01.6 秒<span className="real-toolbar-sep">|</span>约 9.99 Hz</span></div><div className="real-layer-switch"><label><input type="checkbox" checked={context} onChange={e => setContext(e.target.checked)} />轨迹覆盖</label><label><input type="checkbox" checked={trails} onChange={e => setTrails(e.target.checked)} />运动尾迹</label></div></div>
      <RealReplayCanvas data={data} time={time} visible={visible} selected={selected} onSelect={setSelected} context={context} trails={trails} />
      <div className="real-legend" aria-label="交通参与者图层">{Object.entries(agentStyles).map(([key, style]) => <button key={key} aria-pressed={visible.has(key)} onClick={() => setVisible(old => { const result = new Set(old); if (result.has(key)) result.delete(key); else result.add(key); return result })}><i style={{ background: style.color }} />{style.label}<b>{counts[key]}</b></button>)}</div>
      <div className="real-transport"><button className="real-play" onClick={() => { if (ended) setTime(0); setPlaying(v => !v) }} aria-label={playing ? '暂停回放' : '播放回放'}>{playing ? 'Ⅱ 暂停' : ended ? '▶ 重播' : '▶ 播放'}</button><button aria-label="回到片段起点" onClick={() => seek(0)}>↶</button><output aria-label="当前回放时间">{clock(time)} <small>/ {clock(data.duration_ms)}</small></output><label>播放速度<select aria-label="播放速度" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option></select></label><span>{playing ? '回放中' : ended ? '片段结束' : '已暂停'}</span></div>
      <div className="real-scrubber"><svg viewBox="0 0 1200 50" preserveAspectRatio="none" aria-label="每10秒采样的在场对象数量"><path d={`M0 50 ${density.map((v, i) => `L${i * 10} ${48 - v.count / Math.max(...density.map(d => d.count), 1) * 43}`).join(' ')} L1200 50 Z`} fill="#d9e8f1" /><line x1={time / data.duration_ms * 1200} x2={time / data.duration_ms * 1200} y1="0" y2="50" stroke="#176ba7" strokeWidth="2" /></svg><input type="range" aria-label="回放时间轴" min={0} max={data.duration_ms} step={data.median_interval_ms} value={time} onChange={e => seek(Number(e.target.value))} /><div><span>00:00</span><span>05:00</span><span>10:00</span><span>15:00</span><span>20:01</span></div><p>片段在场数量概览；非断面车流量</p></div>
    </section><aside className="real-inspector">
      <section className="real-summary"><h3>当前观测</h3><div className="real-metrics"><div><b>{active.length}</b><span>可见对象</span></div><div><b>{meanSpeed === null ? '—' : meanSpeed.toFixed(1)}<small> km/h</small></b><span>可见对象平均速度</span></div></div><p>全片段 611 辆车 / 非机动车，66 名行人</p></section>
      <section><div className="real-section-title"><h3>信号灯状态</h3><span>源编号 1–8</span></div><div className="real-signal-grid">{Array.from({ length: 8 }, (_, i) => { const value = current?.states[i], name = value === 0 ? '红' : value === 1 ? '绿' : value === 3 ? '黄' : '未知'; return <div key={i} className={`real-light state-${value}`}><span>{String(i + 1).padStart(2, '0')}</span><i /><b>{name}</b></div> })}</div><p className="real-signal-time">下次状态记录 <b>{next ? `${Math.max(0, (next.timestamp_ms - time) / 1000).toFixed(1)} s` : '—'}</b></p><small className="real-muted">按原始事件保持灯色；编号与道路转向尚未配准。</small></section>
      <section><div className="real-section-title"><h3>对象追踪</h3>{selected && <button className="text-button" onClick={() => setSelected(null)}>清除</button>}</div><label className="real-object-select">观测对象<select aria-label="选择观测对象" value={selected ?? ''} onChange={e => setSelected(e.target.value || null)}><option value="">点击画布或选择对象</option>{data.tracks.map(t => <option key={t.id} value={t.id}>{t.id} / {agentStyles[t.agent_type]?.label || t.agent_type}</option>)}</select></label>
      {track ? <div className="real-object-detail"><strong><i style={{ background: agentStyles[track.agent_type]?.color }} />{track.id}<span>{agentStyles[track.agent_type]?.label}</span></strong><dl><dt>可见时段</dt><dd>{clock(track.samples[0][1])} – {clock(track.samples[track.samples.length - 1][1])}</dd><dt>观测帧数</dt><dd>{track.samples.length}</dd><dt>当前速度</dt><dd>{observation ? `${(Math.hypot(observation.sample[4], observation.sample[5]) * 3.6).toFixed(1)} km/h` : '当前无观测'}</dd><dt>局部坐标</dt><dd>{observation ? `${observation.sample[2].toFixed(2)}, ${observation.sample[3].toFixed(2)} m` : '—'}</dd><dt>转向标签</dt><dd>{({ StraightCross: '直行', LeftTurn: '左转', RightTurn: '右转', Others: '其他' } as Record<string, string>)[track.cross_type || ''] || '未提供'}</dd></dl>{track.quality_flags.length > 0 && <p className="real-quality">元数据帧数与实际记录不一致，保留原始轨迹。</p>}<button onClick={() => { seek(track.samples[0][1]); setVisible(old => new Set([...old, track.agent_type])) }}>定位到首次观测</button></div> : <p className="real-muted">选择对象查看逐帧速度、坐标和观测时段。选中轨迹显示最近 20 秒。</p>}</section>
      <section className="real-provenance"><h3>来源与核验</h3><dl><dt>来源</dt><dd><a href="https://github.com/SOTIF-AVLab/SinD" target="_blank" rel="noreferrer">SinD 官方公开样例 ↗</a></dd><dt>记录数</dt><dd>166,065 条观测 / 677 个身份</dd><dt>字段一致性</dt><dd>逐行核验通过</dd><dt>质量标记</dt><dd>1 个身份（359）</dd></dl><details><summary>数据边界与版本</summary><p>真实采集后的平滑轨迹，非校园实测、非实时信号接入。回放不改变灯色或重新生成车辆运动。</p><p>坐标为局部米制；没有已验证的地理配准。录制绝对日期未知。原许可包含非商业限制，公开展示与再分发须核对条款。</p><code>commit {data.source_commit.slice(0, 12)}<br />replay SHA256 {data.source_replay_sha256}</code></details></section>
    </aside></div>
    <footer className="real-footer"><span>历史轨迹回放</span><p>对象按原始观测帧显示，不插值、不补帧。非机动车采用可辨识符号，符号有最小显示尺寸。</p><span>本页未执行控制策略</span></footer>
  </div>
}
