import data from './methodology.json'
export interface StepGuide {data:string;result:string;check:string}
export const labMethodology: Record<number, {sequence:{previous:string;next:string};lecture:{title:string;application:string;links:{title:string;url:string;slideId:string}[]};example:{title:string;source:string;method:string[];result:string;boundary:string};steps:StepGuide[]}> = data
