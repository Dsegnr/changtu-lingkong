import { useEffect, useMemo, useState } from 'react'
import MapCanvas from './MapCanvas'
import { campusFrameAt, type CampusReplay } from '../lib/campusReplay'
import { clock, type CampusID, type CampusPackage } from '../types'
import '../campusReplay.css'

export default function CampusReplayLayer({ data, campus }: { data: CampusPackage; campus: CampusID }) {
  const [replay, setReplay] = useState<CampusReplay | null>(null), [error, setError] = useState('')
  const [time, setTime] = useState(0), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1)
  const [chosen, setChosen] = useState<number | null>(null)
  useEffect(() => {
    const controller = new AbortController(); setReplay(null); setTime(0); setPlaying(false); setChosen(null); setError('')
    fetch(`/api/campus-replay/${campus}`, { signal: controller.signal }).then(r => { if (!r.ok) throw new Error(`数据服务 ${r.status}`); return r.json() }).then(d => {
      if (controller.signal.aborted) return
      if (d.schema !== 'campus_empirical_replay_1' || d.campus !== campus || d.coordinates !== 'EPSG:4326') throw new Error('校区或坐标域不匹配')
      setReplay(d)
    }).catch(e => { if (!controller.signal.aborted) setError(e.message) })
    return () => controller.abort()
  }, [campus])
  useEffect(() => {
    if (!playing || !replay) return
    const id = setInterval(() => setTime(t => { const next = Math.min(replay.duration, t + speed); if (next >= replay.duration) setPlaying(false); return next }), 1000)
    const hide = () => { if (document.hidden) setPlaying(false) }; document.addEventListener('visibilitychange', hide)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', hide) }
  }, [playing, speed, replay])
  const frame = useMemo(() => replay ? campusFrameAt(replay, time) : { time: 0, vehicles: [] }, [replay, time])
  if (error) return <div className="error" role="alert">{error}。切换校区可重新载入。</div>
  if (!replay || replay.campus !== campus) return <div className="loading">正在载入{campus === 'LH' ? '莲花街' : '嵩山路'}校园仿真轨迹…</div>
  const selected = frame.vehicles.find(v => v[0] === chosen), stopped = frame.vehicles.filter(v => v[3] < .1).length
  return <div className="campus-live"><div className="campus-live-banner"><b>公开真实数据驱动的校园仿真</b><span>268辆小汽车 · 无事件基线 · 尚无信号控制</span></div><div className="map-workspace">
    <section className="map-panel"><MapCanvas model={{ kind: 'campus', data, campus, replay: { frame, ids: replay.ids, chosen } }} />
    <div className="campus-transport"><button className="campus-play" aria-label={playing ? '暂停校园回放' : '播放校园回放'} onClick={() => { if (time >= replay.duration) setTime(0); setPlaying(v => !v) }}>{playing ? '暂停' : '播放'}</button><output>{clock(time)} / {clock(replay.duration)}</output><input aria-label="校园动态时间轴" type="range" min="0" max={replay.duration} value={time} onChange={e => { setPlaying(false); setTime(Number(e.target.value)) }} /><select aria-label="校园播放倍速" value={speed} onChange={e => setSpeed(Number(e.target.value))}>{[1,2,4,8].map(v => <option key={v} value={v}>{v}×</option>)}</select></div></section>
    <aside className="inspector"><section><span className="tag">校园路网动态基线</span><h3 className="event-title">{campus === 'LH' ? '莲花街' : '嵩山路'}校区周边</h3><p className="small-note">源观测到达时刻驱动，新生成校园路线与运动。</p><div className="stat-pair"><div><span>当前在途</span><b data-testid="campus-active">{frame.vehicles.length}辆</b></div><div><span>停车 &lt; 0.1 m/s</span><b>{stopped}辆</b></div></div><p className="campus-car-legend"><i />行驶 <i className="stopped" />停车 <i className="selected" />选中</p></section>
    <section><h3>观测对象</h3><select aria-label="校园动态车辆" value={chosen ?? ''} onChange={e => setChosen(e.target.value === '' ? null : Number(e.target.value))}><option value="">选择车辆以高亮</option>{replay.ids.map((id,i) => <option key={id} value={i}>{id}</option>)}</select><p><b>{chosen === null ? '尚未选择' : replay.ids[chosen]}</b></p><p>{selected ? `速度 ${(selected[3]*3.6).toFixed(1)} km/h` : '当前时刻无该车观测'}<br />{selected ? `${selected[1].toFixed(6)}, ${selected[2].toFixed(6)}` : '拖动时间轴可查看不同阶段'}</p></section>
    <section><h3>完整运行核验</h3><p>计划268 / 插入268 / 到达268<br />碰撞0 / 传送0 / 未完成0</p><div className="stat-pair"><div><span>平均行程</span><b>{replay.metrics.duration.toFixed(1)}秒</b></div><div><span>累计等待均值</span><b>{replay.metrics.waitingTime.toFixed(1)}秒</b></div></div><p className="small-note">完整行程统计，不随时间轴变化；不是控制策略收益。</p></section>
    <section><h3>数据与范围</h3><p className="small-note">{replay.source_note}。公交与货车8个身份因路网权限不适用单独保留。不是郑州实测或实时数据。</p><p className="small-note">教学资料背景 / 冻结OSM派生道路。SUMO偏移与投影经原节点核验；路口优先关系和部分车道参数为情景假设。</p><details><summary>源轨迹校验值</summary><code style={{ overflowWrap: 'anywhere', fontSize: 9 }}>{replay.source_fcd_sha256}</code></details></section></aside>
  </div><p className="small-note">车辆按1秒仿真观测显示，不插值。底图中心线与仿真车道存在横向偏移；图上符号为显示尺寸，不是精确车身占地。</p></div>
}
