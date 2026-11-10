import type{BasemapImage,ConnectedBasemap}from'./connectedCampusTypes'

export function validBasemap(value:ConnectedBasemap){
 return value.schema==='connected_basemap_reference_v1'&&value.campus==='SS'&&Number.isFinite(value.max_holdout_error_m)&&value.max_holdout_error_m>=0&&value.max_holdout_error_m<=1&&Array.isArray(value.images)&&value.images.length>0&&value.images.length<=4&&new Set(value.images.map(i=>i.junction)).size===value.images.length&&value.images.every(i=>/^\/api\/connected-basemap\/image\/[ABCD]$/.test(i.url)&&i.url.endsWith('/'+i.junction)&&i.image_to_local?.length===2&&i.image_to_local.every(r=>r.length===3&&r.every(Number.isFinite))&&Math.abs(i.image_to_local[0][0]*i.image_to_local[1][1]-i.image_to_local[0][1]*i.image_to_local[1][0])>1e-8)
}

// Source pixels (u right, v down) -> local meters -> canvas pixels (y down).
export function canvasTransform(matrix:number[][],extent:number[],size:number[]){
 const sx=size[0]/(extent[2]-extent[0]),sy=size[1]/(extent[3]-extent[1]),[x,y]=matrix
 return [x[0]*sx,-y[0]*sy,x[1]*sx,-y[1]*sy,(x[2]-extent[0])*sx,(extent[3]-y[2])*sy] as [number,number,number,number,number,number]
}
export function imageContains(image:BasemapImage,point:number[]){
 const [x,y]=image.image_to_local,dx=point[0]-x[2],dy=point[1]-y[2],det=x[0]*y[1]-x[1]*y[0]
 const u=(dx*y[1]-x[1]*dy)/det,v=(x[0]*dy-dx*y[0])/det
 return u>=0&&u<=1024&&v>=0&&v<=1024
}

// Compose source-pixel -> local -> current frame's screen -> device pixels.
// Unlike a viewport-sized ImageCanvas cache this remains valid while dragging.
export function screenImageTransform(matrix:number[][],screen:number[],ratio:number){
 const[x,y]=matrix,[a,b,c,d,e,f]=screen
 return [(a*x[0]+c*y[0])*ratio,(b*x[0]+d*y[0])*ratio,(a*x[1]+c*y[1])*ratio,(b*x[1]+d*y[1])*ratio,(a*x[2]+c*y[2]+e)*ratio,(b*x[2]+d*y[2]+f)*ratio] as [number,number,number,number,number,number]
}
