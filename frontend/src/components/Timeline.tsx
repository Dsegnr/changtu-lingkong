import { useEffect, useRef } from 'react'
import { clock } from '../types'

interface Props { value: number; min?: number; max: number; time: number | null; label: string; playing: boolean; onChange: (value: number) => void; onPlaying: (playing: boolean) => void }
export default function Timeline({ value, min = 0, max, time, label, playing, onChange, onPlaying }: Props) {
  const latest = useRef({ value, onChange, onPlaying }); latest.current = { value, onChange, onPlaying }
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => { const current = latest.current; if (current.value >= max) { current.onPlaying(false); return } current.onChange(Math.min(max, current.value + 1)) }, 150)
    return () => clearInterval(id)
  }, [playing, max])
  useEffect(() => () => latest.current.onPlaying(false), [])
  const available = time !== null && Number.isFinite(time) && max >= min
  return <div className="timeline"><button disabled={!available} aria-label={playing ? '暂停回放' : '播放回放'} onClick={() => { if (value >= max) onChange(min); onPlaying(!playing) }}>{playing ? '暂停' : '播放'}</button><input aria-label="回放时刻" type="range" min={min} max={max} value={Math.min(max, Math.max(min, value))} onChange={event => onChange(Number(event.target.value))} disabled={!available} /><output data-testid="time-readout">{available ? `+${clock(time)} / ${label}` : '该时刻没有观测帧'}</output></div>
}
