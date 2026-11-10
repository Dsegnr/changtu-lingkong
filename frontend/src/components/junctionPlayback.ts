import type { JunctionFrame } from './junctionTypes'
// Recorded step states: never choose a future frame or interpolate a lamp state.
export function frameAt(frames: JunctionFrame[], time: number): JunctionFrame | undefined {
  if (!frames.length || time + 1e-7 < frames[0].time) return undefined
  let lo = 0, hi = frames.length - 1
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (frames[mid].time <= time + 1e-7) lo = mid
    else hi = mid - 1
  }
  return frames[lo]
}
export function fitTime(time: number, duration: number) { return Math.max(.2, Math.min(duration, Math.round(time * 5) / 5)) }
