import{TrafficSessionProvider}from'../state/TrafficSessionContext'
import{MemoryRouter}from'react-router-dom'
import {act,fireEvent,cleanup,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
vi.mock('./connectedCampusPlayback',()=>({connectedCommon:vi.fn(async()=>({source_hashes:{network:'n'}})),connectedContext:vi.fn(()=>new Promise(()=>{})),connectedRun:vi.fn(()=>new Promise(()=>{})),connectedBasemap:vi.fn(()=>new Promise(()=>{})),networkFrameAt:vi.fn()}))
vi.mock('./g4ClosedLoopPlayback',()=>({loadG4Product:vi.fn()}))
vi.mock('./DualCampusWorkspace',()=>({default:({sourceControls}:{sourceControls?:React.ReactNode})=> <div>{sourceControls}Dual campus view</div>}))
vi.mock('./G4ClosedLoopWorkspace',()=>({default:()=> <div>Late G4 payload</div>}))
import type {G4Product} from './g4ClosedLoopTypes'
import {loadG4Product} from './g4ClosedLoopPlayback'
import ConnectedCampusWorkspace from './ConnectedCampusWorkspace'
import {WorkspaceProvider} from '../state/WorkspaceContext'
afterEach(cleanup)
it('late explicitly selected G4 load cannot undo the user scenario location',async()=>{
 let resolve!:(v:G4Product)=>void
 vi.mocked(loadG4Product).mockImplementation(()=>new Promise(r=>{resolve=r}))
 const view=render(<MemoryRouter><WorkspaceProvider><TrafficSessionProvider><ConnectedCampusWorkspace view="control"/></TrafficSessionProvider></WorkspaceProvider></MemoryRouter>)
 fireEvent.change(screen.getByLabelText('交通记录模式'),{target:{value:'g4'}})
 await waitFor(()=>expect(loadG4Product).toHaveBeenCalled())
 view.rerender(<MemoryRouter><WorkspaceProvider><TrafficSessionProvider><ConnectedCampusWorkspace view="control" scenarioFocus={{node:'C',serial:1}}/></TrafficSessionProvider></WorkspaceProvider></MemoryRouter>)
 expect((screen.getByLabelText('交通记录模式') as HTMLSelectElement).value).toBe('regional')
 await act(async()=>{resolve({} as G4Product);await Promise.resolve()})
 expect((screen.getByLabelText('交通记录模式') as HTMLSelectElement).value).toBe('regional')
 expect(screen.queryByText('Late G4 payload')).toBeNull()
})
