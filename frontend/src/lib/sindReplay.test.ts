import { describe, expect, it } from 'vitest'
import { assertReplay, atReplayEnd, clock, lightsAt, sampleIndexAt, type Sample, type SinDReplay } from './sindReplay'
const s = (frame: number, time: number): Sample => [frame, time, 0, 0, 1, 0, null, null, null]
describe('real recording temporal and spatial boundaries', () => {
  it('holds red zero and negative context, including exact event boundaries', () => {
    const events = [{ raw_frame_id: -1, timestamp_ms: -30, states: [0] }, { raw_frame_id: 3, timestamp_ms: 100, states: [1] }]
    expect(lightsAt(events, 0)?.states).toEqual([0])
    expect(lightsAt(events, 99)?.states).toEqual([0])
    expect(lightsAt(events, 100)?.states).toEqual([1])
    expect(lightsAt(events, -31)).toBeNull()
  })
  it('does not interpolate, extrapolate or bridge missing frames', () => {
    const samples = [s(0, 0), s(1, 100.1), s(5, 500.5)]
    expect(sampleIndexAt(samples, -1)).toBe(-1)
    expect(sampleIndexAt(samples, 100)).toBe(0)
    expect(sampleIndexAt(samples, 100.1)).toBe(1)
    expect(sampleIndexAt(samples, 400)).toBe(-1)
    expect(sampleIndexAt(samples, 500.5)).toBe(2)
    expect(sampleIndexAt(samples, 501)).toBe(-1)
  })
  it('rejects a campus geographic domain', () => {
    expect(() => assertReplay({ schema_version: 'sind_render_1', spatial_reference: 'EPSG:4326' } as SinDReplay)).toThrow()
  })
  it('formats historical relative time without inventing a wall clock', () => {
    expect(clock(0)).toBe('00:00.0')
    expect(clock(1201601.6016)).toBe('20:01.6')
  })
  it('recognizes a quantized final range step as the end', () => {
    expect(atReplayEnd(1201601.601601584, 1201601.6016016016, 100.1001001)).toBe(true)
    expect(atReplayEnd(1201501.5015, 1201601.6016016016, 100.1001001)).toBe(false)
  })
})
