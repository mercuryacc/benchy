import {validateTemplate} from '../model.mjs';
// Entirely synthetic software fixtures, not training recommendations or imported plans.
const exercise=(id,label,sets,targets={reps:6})=>({id,label,name:`Test movement ${id}`,sets,targets});
const block=(label,type,exercises)=>({id:`block-${label}`,label,type,restExercise:15,restRound:45,exercises});
export const browserTemplates=[
 validateTemplate({id:'fixture-uneven',version:1,name:'Synthetic Uneven',blocks:[
  block('A','single',[exercise('a','A',2)]),
  block('B','single',[exercise('b','B',2,{duration:12})]),
  block('C','single',[exercise('c','C',1)]),
  block('D','superset',[exercise('d1','D1',3),exercise('d2','D2',2)]),
  block('E','single',[exercise('e','E',1,{distance:120,distanceUnit:'m'})])]}),
 validateTemplate({id:'fixture-distance',version:1,name:'Synthetic Distance',blocks:[block('A','single',[exercise('distance','A',2,{distance:175,distanceUnit:'m'})])]}),
 validateTemplate({id:'fixture-circuit',version:1,name:'Synthetic Circuit',blocks:[block('C','circuit',[exercise('c1','C1',2),exercise('c2','C2',2),exercise('c3','C3',2)])]})
];
