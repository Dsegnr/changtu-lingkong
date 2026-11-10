import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import JunctionScene from './JunctionScene'
import type { Geometry, JunctionFrame } from './junctionTypes'
afterEach(cleanup)
const geometry:Geometry={center:[180,180],lanes:[],links:Array.from({length:12},(_,index)=>({index,approach:'NESW'[Math.floor(index/3)],turn:'straight',shape:[[180,180],[190,190]]})),heads:'NESW'.split('').flatMap((a,i)=>[{id:a+'_circle',approach:a,type:'circle',indices:[i*3+1,i*3+2],position:[170+i,170],angle:0},{id:a+'_arrow',approach:a,type:'arrow_left',indices:[i*3],position:[170+i,173],angle:0}]),stop_lines:[],arrows:[],junction_shape:[]}
const frame:JunctionFrame={time:20.2,action_time:20,state:'GGGrrrrrrrrr',vehicles:[{id:'J_SinD_5',center:[175,195],angle:180,length:4.5,width:1.8,speed:0,lane:'Ni_0',next_link:1,turn:'straight'}],decision:{approach:'N',stage:'green',pending:null,raw_pressure_candidate:'N',requested:'N',reason:'hold',veto:[],observation:[]}}
it('renders eight physical heads and twelve actual turn connections',()=>{
 const {container}=render(<JunctionScene geometry={geometry} frame={frame} wide={false} chosen={null} onChoose={()=>{}}/>)
 expect(container.querySelectorAll('[data-head]').length).toBe(8)
 expect(container.querySelectorAll('[data-link]').length).toBe(12)
 expect(container.querySelector('[data-head="N_circle"]')?.getAttribute('data-signal')).toBe('G')
 expect(container.querySelector('[data-head="E_circle"]')?.getAttribute('data-signal')).toBe('r')
})
it('vehicle selection works by keyboard with the recorded identity',()=>{
 const choose=vi.fn()
 render(<JunctionScene geometry={geometry} frame={frame} wide={false} chosen={null} onChoose={choose}/>)
 fireEvent.keyDown(screen.getByRole('button',{name:'选择车辆 J_SinD_5'}),{key:'Enter'})
 expect(choose).toHaveBeenCalledWith('J_SinD_5')
})
it('yellow and all red affect both physical groups without fake green',()=>{
 const {container,rerender}=render(<JunctionScene geometry={geometry} frame={{...frame,state:'yyyrrrrrrrrr'}} wide={false} chosen={null} onChoose={()=>{}}/>)
 expect(container.querySelector('[data-head="N_arrow"]')?.getAttribute('data-signal')).toBe('y')
 expect(container.querySelector('[data-head="N_circle"]')?.getAttribute('data-signal')).toBe('y')
 rerender(<JunctionScene geometry={geometry} frame={{...frame,state:'rrrrrrrrrrrr'}} wide={false} chosen={null} onChoose={()=>{}}/>)
 expect(container.querySelectorAll('[data-signal="r"]').length).toBe(8)
})

