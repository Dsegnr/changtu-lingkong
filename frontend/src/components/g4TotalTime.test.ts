import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe,it,expect,vi} from 'vitest'
import {loadTotalTime,tripDifference,validateTotalTime} from './g4TotalTime'
const root=resolve(process.cwd(),'../../outputs')
const base=JSON.parse(readFileSync(resolve(root,'react_g4_integration_20261026_01/product.json'),'utf8'))
const sidecar=JSON.parse(readFileSync(resolve(root,'g4_total_time_product_20261026_01/total_time.json'),'utf8'))
describe('whole-trip independent supplement',()=>{
 it('validates all six complete runs and 84 identities',()=>expect(validateTotalTime(sidecar,base).cases.flatMap(c=>Object.values(c.runs).flatMap(r=>r.vehicles))).toHaveLength(84))
 it('preserves H60 speed-loss improvement but whole-trip regression vs G3',()=>{const c=validateTotalTime(sidecar,base).cases[1],d=tripDifference(c,'G4','G3');expect(d.whole).toBeCloseTo(4.4,7);expect(d.speedLoss).toBeLessThan(0);expect(d.preEntry).toBeCloseTo(14.4,7)})
 it('rejects altered base product',()=>{const p=structuredClone(sidecar);p.base_product_sha256='a'.repeat(64);expect(()=>validateTotalTime(p,base)).toThrow()})
 it('rejects wrong run binding',()=>{const p=structuredClone(sidecar);p.cases[0].runs.G4.run_sha256=p.cases[0].runs.P.run_sha256;expect(()=>validateTotalTime(p,base)).toThrow()})
 it('rejects missing or duplicate vehicle',()=>{const p=structuredClone(sidecar);p.cases[0].runs.G4.vehicles[0]=p.cases[0].runs.G4.vehicles[1];expect(()=>validateTotalTime(p,base)).toThrow()})
 it('rejects shifted clock',()=>{const p=structuredClone(sidecar);p.cases[0].runs.G4.vehicles[0].actual_departure_s++;expect(()=>validateTotalTime(p,base)).toThrow()})
 it('rejects arrival before depart',()=>{const p=structuredClone(sidecar);p.cases[0].runs.G4.vehicles[0].arrival_s=-1;expect(()=>validateTotalTime(p,base)).toThrow()})
 it('rejects fake aggregate',()=>{const p=structuredClone(sidecar);p.cases[0].runs.G4.total_whole_trip_s++;expect(()=>validateTotalTime(p,base)).toThrow()})
 it('rejects conflated speed loss and trip time',()=>{const p=structuredClone(sidecar);p.cases[0].runs.G4.vehicles[0].speed_loss_s=p.cases[0].runs.G4.vehicles[0].whole_trip_s;expect(()=>validateTotalTime(p,base)).toThrow()})
 it('rejects online input claim',()=>{const p=structuredClone(sidecar);p.online_controller_input=true;expect(()=>validateTotalTime(p,base)).toThrow()})
 it('rejects missing API rather than showing zeros',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:503}));try{await expect(loadTotalTime(base)).rejects.toThrow('503')}finally{vi.unstubAllGlobals()}})
})
