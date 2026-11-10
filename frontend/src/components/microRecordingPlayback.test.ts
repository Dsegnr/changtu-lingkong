import{readFileSync}from'node:fs'
import{resolve}from'node:path'
import{describe,it,expect,vi}from'vitest'
import{validateMicroProduct,microFrameAt,microSceneRun,sceneVehicles,sceneLight,sceneTiming,microNetGaps,microStageLabel,loadMicroRecording,fixedMicroPhase}from'./microRecordingPlayback'
import type{MicroProduct}from'./microRecordingTypes'
const original=JSON.parse(readFileSync(resolve(process.cwd(),'../../outputs/react_micro_integration_20261025_01/micro_recording_product.json'),'utf8'))as MicroProduct
const clone=()=>JSON.parse(JSON.stringify(original))as MicroProduct
const hash=original.network_sha256
describe('sealed micro recording domain',()=>{
 it('verifies both full fixed-program recordings',()=>expect(validateMicroProduct(original,hash).fixed_signal_program.verified_frames).toBe(2400))
 it('rejects mismatched geography',()=>expect(()=>validateMicroProduct(original,'other')).toThrow())
 it('rejects fabricated live-traffic labels',()=>{const p=clone();(p as any).real_campus_traffic=true;expect(()=>validateMicroProduct(p,hash)).toThrow()})
 it('rejects mixed duplicate IDs',()=>{const p=clone();p.cases[0].frames[0].vehicles.push(p.cases[0].frames[0].vehicles[0]);expect(()=>validateMicroProduct(p,hash)).toThrow()})
 it('rejects cross-domain timestamp shifts',()=>{const p=clone();p.cases[0].frames[0].time=120;expect(()=>validateMicroProduct(p,hash)).toThrow()})
 it('rejects a wrong recorded signal',()=>{const p=clone();p.cases[0].frames[0].tls='rrrr';expect(()=>validateMicroProduct(p,hash)).toThrow()})
 it('rejects falsely completed primary crossing',()=>{const p=clone(),v=p.cases.find(c=>c.mode==='requested')!.frames[31].vehicles.find(v=>v.id==='ego')!;v.stage='completed';v.active_maneuver=null;expect(()=>validateMicroProduct(p,hash)).toThrow()})
 it('rejects nonfinite motion',()=>{const p=clone();p.cases[0].frames[0].vehicles[0].speed=NaN;expect(()=>validateMicroProduct(p,hash)).toThrow()})
 it('rejects unpaired started event relabeled completed',()=>{const p=clone(),v=p.cases.find(c=>c.mode==='natural')!.frames[70].vehicles.find(v=>v.id==='ego')!;v.stage='completed';expect(()=>validateMicroProduct(p,hash)).toThrow()})
 it('returns a failed API response without inventing a recording',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:503}));await expect(loadMicroRecording(hash)).rejects.toThrow('503');vi.unstubAllGlobals()})
})
describe('recorded time and spatial evidence',()=>{
 const c=original.cases.find(c=>c.mode==='requested')!,run=microSceneRun(c,original.fixed_signal_program)
 it('starts at zero with only this three-car fleet',()=>{expect(run.frames[0].time).toBe(0);expect(run.frames[0].vehicles.map(v=>v.id).sort()).toEqual(['ego','lead','rear']);expect(run.frames[0].junctions).toEqual({})})
 it('uses observed state at the prior sample',()=>expect(microFrameAt(c.frames,3.15)?.time).toBe(3.1))
 it('does not treat center crossing as completion',()=>{expect(microStageLabel(microFrameAt(c.frames,3.1)!.vehicles.find(v=>v.id==='ego'))).toBe('换道进行中');expect(microStageLabel(microFrameAt(c.frames,4.3)!.vehicles.find(v=>v.id==='ego'))).toBe('换道已完成')})
 it('keeps unpaired started status explicit',()=>{const c=original.cases.find(c=>c.mode==='natural')!;expect(microStageLabel(microFrameAt(c.frames,7)!.vehicles.find(v=>v.id==='ego'))).toContain('未配对')})
 it('interpolates position without changing the discrete observation',()=>{const a=run.frames[31].vehicles.find(v=>v.id==='ego')!,b=run.frames[32].vehicles.find(v=>v.id==='ego')!,v=sceneVehicles(run,3.15).find(v=>v.id==='ego')!;expect(v.center[0]).toBeCloseTo((a.center[0]+b.center[0])/2,8);expect(v.center[1]).toBeCloseTo((a.center[1]+b.center[1])/2,8);expect(run.frames[31].vehicles.find(v=>v.id==='ego')!.center).toEqual(a.center)})
 it('has no fake A or B signals or countdown',()=>{expect(sceneLight(run,run.frames[0],'A',0)).toBeUndefined();expect(sceneLight(run,run.frames[0],'B',0)).toBeUndefined();expect(sceneTiming(run,'B',0,0,'')).toBeNull();expect(sceneLight(run,run.frames[0],'C',2)).toBe(c.frames[0].tls[2])})
 it('countdown describes a phase rather than red-to-green prediction',()=>{const t=sceneTiming(run,'C',2,0,'')!;expect(t.label).toContain('阶段余');expect(t.remaining).toBeGreaterThan(0)})
 it('every fixed phase matches every recorded frame',()=>{for(const c of original.cases)for(const f of c.frames)expect(fixedMicroPhase(original.fixed_signal_program,f.time).state).toBe(f.tls)})
 it('projects initial net gaps and invalidates gaps off the study edge',()=>{expect(microNetGaps(c.frames[0],c.frames[0].vehicles.find(v=>v.id==='ego'))).toEqual({front:45,rear:35});const f=c.frames[1100];expect(microNetGaps(f,f.vehicles.find(v=>v.id==='ego'))).toBeNull()})
 it('retains destination censoring after local service',()=>{expect(c.audit.services.find(s=>s.id==='ego')!.entered_junction_s).toBe(105.8);expect(c.audit.censored_vehicles).toContain('ego');expect(c.frames.at(-1)!.time).toBe(119.9)})
 it('does not mix local natural and requested clocks',()=>{const nat=original.cases.find(c=>c.mode==='natural')!;expect(microFrameAt(nat.frames,0)!.time).toBe(0);expect(nat.frames[70].vehicles.find(v=>v.id==='ego')!.stage).toBe('unresolved');expect(c.frames[70].vehicles.find(v=>v.id==='ego')!.stage).toBe('completed')})
})
