# One-time original map authoring source. No reference image pixels are used.
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def obj(i,name,x,y,**props):return dict(id=i,name=name,type='semantic',x=x,y=y,width=16,height=16,properties=[dict(name=k,type='string',value=v) for k,v in props.items()])
landmarks=[('dispatch','DISPATCH HQ',8,16),('workshop','WORKSHOP',80,16),('library','LIBRARY / RAG',168,16),('meeting','MEETING',8,128),('dojo','DOJO / EVAL',88,128),('mcp','MCP TERMINAL',168,128)]
for scene in ['city','workshop','library','mcp','dojo','dispatch','meeting']:
 data=[1]*208
 if scene=='city':
  data=[2 if y in [6,7,12] or x in [0,15] or (y==5 and x in [2,7,12]) else 1 for y in range(13) for x in range(16)]
  objects=[obj(i+1,k,x,y,label=l,kind='building',live='unbound') for i,(k,l,x,y) in enumerate(landmarks)]
  objects += [obj(20+i,k+'-door',((x+32)//16)*16,y+64,target=k+':exit',kind='portal') for i,(k,l,x,y) in enumerate(landmarks)]
 else:
  data=[3 if y>=11 else 0 for y in range(13) for x in range(16)]
  names={'workshop':['task-bench','terminal','evidence-shelf','workcell-bay'],'library':['kujo-docs','repo-source','project-rag','previous-runs','external-research','unknown'],'mcp':['servers','abilities','approval-pending','tool-active','result','failure'],'dojo':['schema','content','policy','skipped'],'dispatch':['intake','assignment','workflow','retry','blocked','completion'],'meeting':['context-transfer','relationships','message-evidence']}[scene]
  objects=[obj(i+1,n,48+i*40 if scene=='library' and i<5 else 32+i*40 if scene=='workshop' else 128 if n=='unknown' else 24+i*40,160,kind='station',slots='-4,0,4',live='unbound') for i,n in enumerate(names)]
  objects += [obj(20,'exit',16,160,target='city:'+scene+'-door',kind='portal')]
  if scene in ['library','workshop']:
   if scene=='library':
    for i,station in enumerate(objects[:5]): station['x']=32+i*40
   else:
    for i,station in enumerate(objects[:4]): station['x']=[64,144,72,160][i]
   for station in objects:
    if station['name'] in (['kujo-docs','repo-source','project-rag','previous-runs','external-research'] if scene=='library' else ['evidence-shelf','workcell-bay']): station['y']=96
   objects += [obj(30,'upper-walkway',16,96,kind='walkway',span='208'),obj(31,'access-ladder',224,96,kind='ladder',bottom='160')]

 m=dict(type='map',version='1.10',tiledversion='1.11.2',orientation='orthogonal',renderorder='right-down',infinite=False,width=16,height=13,tilewidth=16,tileheight=16,tilesets=[dict(firstgid=1,source='city.tsj')],layers=[dict(type='tilelayer',id=1,name='ground',width=16,height=13,data=data),dict(type='objectgroup',id=2,name='semantics',objects=objects)])
 (root/'assets/source'/f'{scene}.tmj').write_text(json.dumps(m,indent=2)+'\n')
(root/'assets/source/city.tsj').write_text(json.dumps(dict(type='tileset',name='original-city',tilewidth=16,tileheight=16,tilecount=3,columns=3,image='tiles.svg',imagewidth=48,imageheight=16),indent=2)+'\n')
(root/'assets/source/tiles.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="16"><path fill="#193b39" d="M0 0h16v16H0z"/><path fill="#343e4e" d="M16 0h16v16H16z"/><path fill="#657976" d="M32 0h16v16H32z"/></svg>')
