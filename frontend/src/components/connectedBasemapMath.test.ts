import{describe,it,expect}from'vitest'
import{canvasTransform,screenImageTransform,imageContains,validBasemap}from'./connectedBasemapMath'
import type{BasemapImage,ConnectedBasemap}from'./connectedCampusTypes'
describe('geographic background coordinate rendering',()=>{
 it('composes the current camera including drag, rotation and device scale',()=>{
  const matrix=[[.5,.01,120],[.02,-.5,780]]
  for(const screen of [[2,0,0,-2,-350,2000],[0,2,2,0,450,-25]]){
   const[a,b,c,d,e,f]=screenImageTransform(matrix,screen,2)
   for(const[u,v]of [[0,0],[512,512],[1024,1024]]){
    const x=matrix[0][0]*u+matrix[0][1]*v+matrix[0][2],y=matrix[1][0]*u+matrix[1][1]*v+matrix[1][2]
    expect(a*u+c*v+e).toBeCloseTo((screen[0]*x+screen[2]*y+screen[4])*2)
    expect(b*u+d*v+f).toBeCloseTo((screen[1]*x+screen[3]*y+screen[5])*2)
   }
  }
 })
 it('rejects bad transforms, oversized residuals and nonlocal image sources',()=>{
  const good={schema:'connected_basemap_reference_v1',campus:'SS',max_holdout_error_m:.04,images:[{junction:'C',url:'/api/connected-basemap/image/C',image_to_local:[[.5,0,0],[0,-.5,0]]}]}as ConnectedBasemap
  expect(validBasemap(good)).toBe(true)
  expect(validBasemap({...good,max_holdout_error_m:NaN})).toBe(false)
  expect(validBasemap({...good,max_holdout_error_m:1.1})).toBe(false)
  expect(validBasemap({...good,images:[{...good.images[0],url:'https://example.com/private'}]})).toBe(false)
  expect(validBasemap({...good,images:[{...good.images[0],image_to_local:[[0,0,0],[0,0,0]]}]})).toBe(false)
 })
 it('preserves rotated and sheared source pixels through the canvas y flip',()=>{
  const matrix=[[.5,.01,120],[.02,-.5,780]],extent=[0,0,1000,1000],size=[2000,1000]
  const[a,b,c,d,e,f]=canvasTransform(matrix,extent,size)
  for(const[u,v]of[[0,0],[1024,0],[512,512],[0,1024]]){
   const x=matrix[0][0]*u+matrix[0][1]*v+matrix[0][2],y=matrix[1][0]*u+matrix[1][1]*v+matrix[1][2]
   expect(a*u+c*v+e).toBeCloseTo(x*2,8);expect(b*u+d*v+f).toBeCloseTo(1000-y,8)
  }
 })
 it('tests actual rotated image coverage rather than a bounding rectangle',()=>{
  const image={image_to_local:[[1,1,0],[1,-1,0]]}as BasemapImage
  expect(imageContains(image,[1024,0])).toBe(true)
  expect(imageContains(image,[1,1023])).toBe(false)
  expect(imageContains(image,[2500,0])).toBe(false)
 })
})
