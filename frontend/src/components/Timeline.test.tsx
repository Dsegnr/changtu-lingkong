import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Timeline from './Timeline'

afterEach(() => { cleanup(); vi.useRealTimers() })
describe('simulation timeline', () => {
  it('distinguishes a genuine zero time from a missing frame', () => {
    const onPlaying = vi.fn(), onChange = vi.fn()
    const { rerender } = render(<Timeline value={0} max={2} time={0} label="仿真0秒" playing={false} onChange={onChange} onPlaying={onPlaying} />)
    expect(screen.getByTestId('time-readout').textContent).toContain('00:00')
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false)
    rerender(<Timeline value={0} max={2} time={null} label="缺帧" playing={false} onChange={onChange} onPlaying={onPlaying} />)
    expect(screen.getByTestId('time-readout').textContent).toContain('没有观测帧')
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true)
  })
  it('does not step beyond the final frame and stops playback', () => {
    vi.useFakeTimers()
    function Harness() { const [value, setValue] = useState(0), [playing, setPlaying] = useState(true); return <Timeline value={value} max={2} time={value} label={String(value)} playing={playing} onChange={setValue} onPlaying={setPlaying} /> }
    render(<Harness />)
    act(() => vi.advanceTimersByTime(150)); expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('1')
    act(() => vi.advanceTimersByTime(150)); expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('2')
    act(() => vi.advanceTimersByTime(450)); expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('2')
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('播放回放')
  })
  it('cleans its interval and stops playback when the page is removed', () => {
    vi.useFakeTimers(); const onPlaying = vi.fn(), onChange = vi.fn()
    const { unmount } = render(<Timeline value={0} max={5} time={0} label="仿真" playing onChange={onChange} onPlaying={onPlaying} />)
    unmount(); act(() => vi.advanceTimersByTime(900))
    expect(onChange).not.toHaveBeenCalled(); expect(onPlaying).toHaveBeenCalledWith(false)
  })
  it('restarts at the first frame after reaching the end', () => {
    const onPlaying = vi.fn(), onChange = vi.fn()
    render(<Timeline value={5} min={1} max={5} time={5} label="仿真" playing={false} onChange={onChange} onPlaying={onPlaying} />)
    fireEvent.click(screen.getByRole('button')); expect(onChange).toHaveBeenCalledWith(1); expect(onPlaying).toHaveBeenCalledWith(true)
  })
})
