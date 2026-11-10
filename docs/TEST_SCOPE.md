# 公开副本测试范围

以下测试需原始或派生回放文件，源码保留但默认不运行，不把跳过当通过：

- `src/components/fluidJointData.test.ts`
- `src/components/FluidMapDesk.test.tsx`
- `src/components/FluidWorkspaceClock.test.tsx`
- `src/components/g4ClosedLoopPlayback.test.ts`
- `src/components/g4TotalTime.test.ts`
- `src/components/G4TotalTimePanel.test.tsx`
- `src/components/MapDeskView.test.tsx`
- `src/components/microRecordingPlayback.test.ts`
- `src/components/nativeJobSource.test.tsx`
- `src/components/receivingRecordingPlayback.test.ts`
- `src/pages/EvaluationPage.test.tsx`

其余前端测试照常运行。Python两个测试文件仅生成临时合成文件，不运行仿真或读取正式任务库。公开副本只调整构建输出目录、代理端口、资源测试范围和测试临时目录创建；原工程与冻结输出均不修改。
