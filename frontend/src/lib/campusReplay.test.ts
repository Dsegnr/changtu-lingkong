import { expect, it } from 'vitest'
import { campusFrameAt, type CampusReplay } from './campusReplay'
it('never extrapolates a vehicle outside its recorded campus frame', () => {
  const data = { duration: 1, frames: [{ time: 0, vehicles: [[0, 113, 34, 2, 0]] }, { time: 1, vehicles: [] }] } as CampusReplay
  expect(campusFrameAt(data, .9).vehicles).toHaveLength(1)
  expect(campusFrameAt(data, 1).vehicles).toHaveLength(0)
  expect(campusFrameAt(data, 2).vehicles).toHaveLength(0)
  expect(campusFrameAt(data, -1).vehicles).toHaveLength(0)
})
