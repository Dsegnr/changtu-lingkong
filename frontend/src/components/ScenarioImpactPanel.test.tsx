import {afterEach,describe,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import ScenarioImpactPanel,{parseScenarios,scenarioNetwork} from './ScenarioImpactPanel'
const task={scenario_id:'a'.repeat(32),region_id:'SS',network_sha256:scenarioNetwork,status:'spatial_ready',event:{node_id:'C',radius_m:150,hypothetical:true},affected_edges:[{sumo_edge_id:'edge',source_road_name:'工人路',source_osm_id:'727616081',sumo_from_node:'B',sumo_to_node:'C'}],controlled_related_nodes:['B','C'],traffic_event_applied:false,evaluation_status:'not_run'}
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
describe('scenario task integrity',()=>{
 it('accepts bound spatial-only task',()=>expect(parseScenarios({scenarios:[task]})).toHaveLength(1))
 it('rejects wrong region or network',()=>{for(const patch of [{region_id:'LH'},{network_sha256:'b'.repeat(64)}])expect(()=>parseScenarios({scenarios:[{...task,...patch}]})).toThrow()})
 it('rejects a fabricated traffic evaluation',()=>{for(const patch of [{traffic_event_applied:true},{evaluation_status:'improved'}])expect(()=>parseScenarios({scenarios:[{...task,...patch}]})).toThrow()})
 it('rejects duplicate roads',()=>expect(()=>parseScenarios({scenarios:[{...task,affected_edges:[...task.affected_edges,...task.affected_edges]}]})).toThrow())
 it('locates a real related node without executing strategy',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({scenarios:[task]})}))
  const locate=vi.fn();render(<ScenarioImpactPanel onLocate={locate}/>);await screen.findByText('空间分析完成')
  fireEvent.click(screen.getByText('事件影响分析'));fireEvent.click(screen.getByRole('button',{name:'定位 工人路—颖河路'}))
  expect(locate).toHaveBeenCalledWith('C');expect(screen.getByText('交通评估未运行')).toBeTruthy()
 })
 it('shows service error instead of fake zero roads',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false}));render(<ScenarioImpactPanel onLocate={()=>{}}/>);
  expect(await screen.findByRole('alert')).toBeTruthy();expect(screen.queryByText('空间分析完成')).toBeNull()
 })
})
