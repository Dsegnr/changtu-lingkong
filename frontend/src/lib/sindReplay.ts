export type Sample = [number, number, number, number, number, number, number | null, number | null, number | null]
export interface RealTrack { id: string; kind: string; agent_type: string; quality_flags: string[]; cross_type: string | null; samples: Sample[] }
export interface LightEvent { raw_frame_id: number; timestamp_ms: number; states: number[] }
export interface SinDReplay { schema_version: string; recording: string; source_city: string; source_commit: string; source_replay_sha256: string; spatial_reference: string; time_reference: string; median_interval_ms: number; duration_ms: number; bounds_m: number[]; tracks: RealTrack[]; light_events: LightEvent[] }
export const agentStyles: Record<string, { label: string; color: string }> = {
  car: { label: '小汽车', color: '#2076ab' }, bus: { label: '公交车', color: '#9c5b16' },
  truck: { label: '货车', color: '#6653a8' }, motorcycle: { label: '摩托车', color: '#008575' },
  bicycle: { label: '自行车', color: '#b16a18' }, tricycle: { label: '三轮车', color: '#8f658d' },
  pedestrian: { label: '行人', color: '#bb4e66' },
}
export function sampleIndexAt(samples: Sample[], time: number, interval = 100.1001001): number {
  if (!samples.length || time < samples[0][1] || time > samples[samples.length - 1][1]) return -1
  let lo = 0, hi = samples.length
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (samples[mid][1] <= time) lo = mid + 1; else hi = mid }
  const index = lo - 1
  return time - samples[index][1] <= interval * 1.5 ? index : -1
}
export function lightsAt(events: LightEvent[], time: number): LightEvent | null {
  let lo = 0, hi = events.length
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (events[mid].timestamp_ms <= time) lo = mid + 1; else hi = mid }
  return lo ? events[lo - 1] : null
}
export function clock(ms: number): string {
  const deciseconds = Math.max(0, Math.floor(ms / 100 + 1e-7))
  return `${Math.floor(deciseconds / 600).toString().padStart(2, '0')}:${(Math.floor(deciseconds / 10) % 60).toString().padStart(2, '0')}.${deciseconds % 10}`
}
export function atReplayEnd(time: number, duration: number, interval: number): boolean {
  // Range inputs quantize to steps; the final step can be a few ulps below max.
  return duration - time <= interval / 2
}
export function activeTracks(data: SinDReplay, time: number, visible: Set<string>) {
  return data.tracks.flatMap(track => {
    if (!visible.has(track.agent_type)) return []
    const index = sampleIndexAt(track.samples, time, data.median_interval_ms)
    return index < 0 ? [] : [{ track, index, sample: track.samples[index] }]
  })
}
export function assertReplay(data: SinDReplay) {
  if (data.schema_version !== 'sind_render_1' || data.spatial_reference !== 'LOCAL_METRES' || !data.tracks?.length || !(data.duration_ms > 0)) throw new Error('回放包格式或坐标域不匹配')
  return data
}
