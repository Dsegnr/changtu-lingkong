import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {render,screen,fireEvent,cleanup} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import G4TotalTimePanel from './G4TotalTimePanel'
const product=JSON.parse(readFileSync(resolve(process.cwd(),'../../outputs/g4_total_time_product_20261026_01/total_time.json'),'utf8'))
afterEach(cleanup)
it('shows countervailing total-time result and distinct whole-trip components',()=>{render(<G4TotalTimePanel recording={product.cases[1]} policy="G4" baseline="G3" onBaseline={()=>{}} chosen="blocker" onChoose={()=>{}}/>);expect(screen.getByTestId('whole-trip-comparison').textContent).toContain('+4.4');expect(screen.getByTestId('whole-trip-tradeoff').textContent).toContain('全程耗时增加');expect(screen.getByRole('table',{name:'三策略完整耗时'}).textContent).toContain('1218.2');expect(screen.getByRole('table',{name:'三策略完整耗时'}).textContent).toContain('1222.6')})
it('selecting baseline and vehicle propagates user actions',()=>{const baseline=vi.fn(),choose=vi.fn();render(<G4TotalTimePanel recording={product.cases[0]} policy="G4" baseline="G3" onBaseline={baseline} chosen="blocker" onChoose={choose}/>);fireEvent.change(screen.getByLabelText('全程对照策略'),{target:{value:'P'}});expect(baseline).toHaveBeenCalledWith('P');fireEvent.click(screen.getByText('逐车计划发车、入网与到达明细'));fireEvent.click(screen.getByRole('button',{name:'target1_7'}));expect(choose).toHaveBeenCalledWith('target1_7')})
