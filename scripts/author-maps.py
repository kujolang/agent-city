# One-time original map authoring source. No reference image pixels are used.
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def obj(i,name,x,y,**props):return dict(id=i,name=name,type='semantic',x=x,y=y,width=16,height=16,properties=[dict(name=k,type='string',value=v) for k,v in props.items()])
landmarks=[('dispatch','DISPATCH HQ',8,16),('workshop','WORKSHOP',80,16),('library','LIBRARY / RAG',168,16),('meeting','MEETING',8,136),('dojo','DOJO / EVAL',88,136),('mcp','MCP TERMINAL',168,136)]
for scene in ['city','workshop','library','mcp','dojo','dispatch','meeting']:
 data=[1]*208
 if scene=='city':
  data=[2 if y in [6,7] or x in [0,15] else 1 for y in range(13) for x in range(16)]
  objects=[obj(i+1,k,x,y,label=l,kind='building',live='unbound') for i,(k,l,x,y) in enumerate(landmarks)]
  objects += [obj(20,'workshop-door',96,112,target='workshop:exit',kind='portal'),obj(21,'library-door',192,112,target='library:exit',kind='portal'),obj(22,'mcp-door',208,112,target='mcp:exit',kind='portal'),obj(23,'dojo-door',128,112,target='dojo:exit',kind='portal'),obj(24,'dispatch-door',32,112,target='dispatch:exit',kind='portal'),obj(25,'meeting-door',48,112,target='meeting:exit',kind='portal')]
 else:
  data=[3 if y>=11 else 0 for y in range(13) for x in range(16)]
  names={'workshop':['task-bench','terminal','evidence-shelf','workcell-unavailable'],'library':['kujo-docs','repo-source','project-rag','previous-runs','external-research','unknown'],'mcp':['servers','abilities','approval-pending','tool-active','result','failure'],'dojo':['schema','content','policy','skipped'],'dispatch':['intake','assignment','workflow','retry','blocked','completion'],'meeting':['context-transfer','relationships','message-evidence']}[scene]
  objects=[obj(i+1,n,48+i*40 if scene=='library' and i<5 else 32+i*40 if scene=='workshop' else 128 if n=='unknown' else 24+i*40,160,kind='station',slots='-6,0,6',live='unbound') for i,n in enumerate(names)]
  objects += [obj(20,'exit',16,160,target='city:'+scene+'-door',kind='portal')]
 m=dict(type='map',version='1.10',tiledversion='1.11.2',orientation='orthogonal',renderorder='right-down',infinite=False,width=16,height=13,tilewidth=16,tileheight=16,tilesets=[dict(firstgid=1,source='city.tsj')],layers=[dict(type='tilelayer',id=1,name='ground',width=16,height=13,data=data),dict(type='objectgroup',id=2,name='semantics',objects=objects)])
 (root/'assets/source'/f'{scene}.tmj').write_text(json.dumps(m,indent=2)+'\n')
(root/'assets/source/city.tsj').write_text(json.dumps(dict(type='tileset',name='original-city',tilewidth=16,tileheight=16,tilecount=3,columns=3,image='tiles.svg',imagewidth=48,imageheight=16),indent=2)+'\n')
(root/'assets/source/tiles.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="16"><path fill="#193b39" d="M0 0h16v16H0z"/><path fill="#343e4e" d="M16 0h16v16H16z"/><path fill="#657976" d="M32 0h16v16H32z"/></svg>')
