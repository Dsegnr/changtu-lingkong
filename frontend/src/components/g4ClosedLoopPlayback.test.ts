import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe,it,expect,vi} from 'vitest'
import {decisionAt,g4Color,g4FrameAt,g4Timing,loadG4Product,validateG4Product,validateG4Run} from './g4ClosedLoopPlayback'
import {sceneLight,sceneVehicles} from './microRecordingPlayback'
const root=resolve(process.cwd(),'../../outputs/react_g4_integration_20261026_01')
const product=JSON.parse(readFileSync(resolve(root,'product.json'),'utf8'))
const raw=()=>JSON.parse(readFileSync(resolve(root,'runs/H60_G4.json'),'utf8'))
const c=product.cases[1],hash=product.network_sha256
describe('independent closed-loop render contract',()=>{
 it('validates all six sealed executions and 8100 frames',()=>{validateG4Product(product,hash);let count=0;for(const c of product.cases)for(const p of ['P','G3','G4']as const){const r=validateG4Run(JSON.parse(readFileSync(resolve(root,c.runs[p].file),'utf8')),c,p,hash);count+=r.frames.length}expect(count).toBe(8100)})
 it('rejects counterfeit roadside traffic',()=>{const x=structuredClone(product);x.real_campus_traffic=true;expect(()=>validateG4Product(x,hash)).toThrow()})
 it('rejects changed aggregate outcomes',()=>{const x=structuredClone(product);x.cases[0].runs.G4.metrics.normalized_speed_loss_vehicle_s--;expect(()=>validateG4Product(x,hash)).toThrow()})
 it('rejects mixed policy identity',()=>expect(()=>validateG4Run(raw(),c,'P',hash)).toThrow())
 it('rejects shifted observation clock',()=>{const x=raw();x.frames[1].time=.2;expect(()=>validateG4Run(x,c,'G4',hash)).toThrow()})
 it('rejects foreign vehicles',()=>{const x=raw();x.frames[0].vehicles[0].id='ego';expect(()=>validateG4Run(x,c,'G4',hash)).toThrow()})
 it('rejects painted rather than executed lights',()=>{const x=raw();x.frames[0].recordedLights.C='rrrrrrr';expect(()=>validateG4Run(x,c,'G4',hash)).toThrow()})
 it('does not show a sample before the first observation',()=>{const r=validateG4Run(raw(),c,'G4',hash);expect(g4FrameAt(r,0)).toBeUndefined();expect(g4FrameAt(r,.39)!.time).toBe(.2);expect(g4FrameAt(r,.4)!.time).toBe(.4)})
 it('interpolates the correct interval after the .2 first sample',()=>{const r=validateG4Run(raw(),c,'G4',hash),a=r.frames[10],b=r.frames[11];const id=a.vehicles.find(v=>b.vehicles.some(w=>w.id===v.id))!.id;const v=sceneVehicles(r,a.time+.1).find(v=>v.id===id)!;const av=a.vehicles.find(v=>v.id===id)!,bv=b.vehicles.find(v=>v.id===id)!;expect(v.center[0]).toBeCloseTo((av.center[0]+bv.center[0])/2,7)})
 it('keeps actual lamps and null final countdown; no fixed program',()=>{const r=validateG4Run(raw(),c,'G4',hash);expect(sceneLight(r,r.frames[0],'B',0)).toBe(r.frames[0].recordedLights.B[0]);expect(g4Timing(r,'D',0,.2)).toBeNull();expect(g4Timing(r,'B',0,r.duration)!.remaining).toBeNull();expect('programs'in r).toBe(false)})
 it('decision receipt is not visible before post-step observation',()=>{expect(decisionAt(c,10)).toBeUndefined();expect(decisionAt(c,10.2)?.time).toBe(10)})
 it('stable identity colors survive policy/time changes',()=>{expect(g4Color('target1_4')).toBe(g4Color('target1_0'));expect(g4Color('blocker')).not.toBe(g4Color('target1_0'))})
 it('API failure returns error instead of fabricating a scene',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:503}));try{await expect(loadG4Product(hash)).rejects.toThrow('503')}finally{vi.unstubAllGlobals()}})
})
