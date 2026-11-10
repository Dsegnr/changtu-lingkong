import{describe,it,expect}from'vitest'
import{runKey,checkedBookmark}from'./TrafficSessionContext'
describe('regional record bookmarks',()=>{
 it('separates each regional policy including SS paired baselines',()=>{expect(runKey('LH','fixed')).not.toBe(runKey('LH','pressure'));expect(runKey('SS','fixed')).not.toBe(runKey('SS','pressure'));expect(runKey('LH','pressure')).not.toBe(runKey('SS','pressure'))})
 it('rejects stale foreign IDs and bounds time',()=>{expect(checkedBookmark({time:9999,focus:'B',chosen:'foreign'},1800,['LHB'],['a'])).toEqual({time:1800,focus:null,chosen:null})})
 it('preserves valid junction time for route return',()=>{expect(checkedBookmark({time:10.2,focus:'LHB',chosen:null},1800,['LHB'],[])).toEqual({time:10.2,focus:'LHB',chosen:null})})
 it('rejects a bookmark from another run even if IDs exist',()=>{expect(checkedBookmark({run_id:'old',time:100,focus:'LHB',chosen:null},1800,['LHB'],[],'new')).toEqual({time:.2,focus:null,chosen:null})})
 it('uses safe initial time for missing or nonfinite bookmark',()=>{expect(checkedBookmark(undefined,1800,[],[]).time).toBe(.2);expect(checkedBookmark({time:NaN,focus:null,chosen:null},1800,[],[]).time).toBe(.2)})
})
