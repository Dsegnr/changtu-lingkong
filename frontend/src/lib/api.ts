import type { CampusPackage, PolicePackage } from '../types'

const cache = new Map<string, Promise<unknown>>()
async function read(url: string): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`数据请求失败（${response.status}）：${url}`)
  return response.json()
}
function shared<T>(key: string, validate: (value: unknown) => T): Promise<T> {
  if (!cache.has(key)) cache.set(key, read(key).then(validate).catch(error => { cache.delete(key); throw error }))
  return cache.get(key)! as Promise<T>
}
export function campusData() {
  return shared('/api/campus', value => {
    const data = value as CampusPackage
    if (data?.schema !== 1 || !data.bundle?.campuses?.LH || !data.bundle?.campuses?.SS || !data.context || !data.protocol) throw new Error('校园数据包不完整')
    for (const campus of Object.values(data.bundle.campuses)) for (const entry of Object.values(campus.cases)) for (const run of Object.values(entry.policies)) {
      if (run.vehicles.length !== 120 || new Set(run.vehicles.map(v => v.id)).size !== 120 || Math.abs(run.vehicles.reduce((s, v) => s + v.cost, 0) - run.metrics.total) > 1e-6) throw new Error('校园逐车账本校验失败')
    }
    return data
  })
}
export function policeData() {
  return shared('/api/police', value => {
    const data = value as PolicePackage
    if (data?.schema !== 1 || !data.case?.programs || !data.runs?.fixed || !data.runs?.adaptive) throw new Error('控制数据包不完整')
    if (!Object.values(data.runs).every(run => run.frames.length > 0 && run.summary.ledger.planned === 120)) throw new Error('控制帧或计划分母缺失')
    return data
  })
}
