import { expect, it } from 'vitest'
import { frameAt, fitTime } from './junctionPlayback'
import type { JunctionFrame } from './junctionTypes'
const frames = [{ time: .2, state: 'G' }, { time: .4, state: 'y' }, { time: .6, state: 'r' }] as JunctionFrame[]
it('chooses the last recorded state without leaking a future lamp', () => {
  expect(frameAt(frames, .39)?.state).toBe('G')
  expect(frameAt(frames, .4)?.state).toBe('y')
  expect(frameAt(frames, .59)?.state).toBe('y')
  expect(frameAt(frames, 20)?.state).toBe('r')
})
it('does not fabricate a pre-recording state', () => { expect(frameAt(frames, 0)).toBeUndefined(); expect(frameAt([], 20)).toBeUndefined() })
it('clamps strategy switches and aligns to the recorded step', () => { expect(fitTime(1300, 1261)).toBe(1261); expect(fitTime(20.21, 1300)).toBe(20.2); expect(fitTime(-1, 1300)).toBe(.2) })
