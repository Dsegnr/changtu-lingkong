export interface CampusFrame { time: number; vehicles: number[][] }
export interface CampusReplay { schema: string; campus: string; coordinates: string; planned: number; ids: string[]; duration: number; frames: CampusFrame[]; source_note: string; metrics: { duration: number; waitingTime: number }; source_fcd_sha256: string }
export function campusFrameAt(data: CampusReplay, time: number): CampusFrame {
  if (time < 0 || time > data.duration) return { time, vehicles: [] }
  const frame = data.frames[Math.floor(time)]
  return frame?.time === Math.floor(time) ? frame : { time, vehicles: [] }
}
