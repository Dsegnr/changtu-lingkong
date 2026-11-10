import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1', port: 8770, strictPort: true,
    proxy: {
      '/api/campus': { target: 'http://127.0.0.1:18769', changeOrigin: true },
      '/api/police': { target: 'http://127.0.0.1:18769', changeOrigin: true },
      '/api/replay': { target: 'http://127.0.0.1:18769', changeOrigin: true },
      '/vendor/': { target: 'http://127.0.0.1:18769', changeOrigin: true }
    }
  },
  test: { exclude: ['**/node_modules/**', '**/dist/**', 'src/components/fluidJointData.test.ts', 'src/components/FluidMapDesk.test.tsx', 'src/components/FluidWorkspaceClock.test.tsx', 'src/components/g4ClosedLoopPlayback.test.ts', 'src/components/g4TotalTime.test.ts', 'src/components/G4TotalTimePanel.test.tsx', 'src/components/MapDeskView.test.tsx', 'src/components/microRecordingPlayback.test.ts', 'src/components/nativeJobSource.test.tsx', 'src/components/receivingRecordingPlayback.test.ts', 'src/pages/EvaluationPage.test.tsx'], environment: 'jsdom', globals: true, clearMocks: true, restoreMocks: true },
  build: { outDir:'dist', emptyOutDir:true, sourcemap: false, target: 'es2022' }
})
