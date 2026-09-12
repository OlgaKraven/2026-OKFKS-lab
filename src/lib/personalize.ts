import type {SubjectArea} from '../types'
export function personalizeText(value:string,_labNumber:number,area:SubjectArea){
 return value.replaceAll('{system}',area.title).replaceAll('{systemCode}',area.systemCode)
  .replaceAll('{criticalFunction}',area.criticalFunction).replaceAll('{assets}',area.assets.join(', '))
}
