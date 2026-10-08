"""Original six-second chip ident; no samples or melodies from existing games."""
import math, random, struct, wave
from pathlib import Path
RATE=48000; DURATION=6; rng=random.Random(20261008)
score=[74,69,77,69,72,67,76,67,70,65,74,65,69,64,73,64,74,69,77,81,86,81,77,74]
bass=[38,38,36,36,34,34,33,33,38,38,38,38]
def frequency(m):return 440*2**((m-69)/12)
def square(f,t):
 return sum(math.sin(2*math.pi*f*k*t)/k for k in [1,3,5,7] if f*k<9000)*.75
frames=[]
for i in range(RATE*DURATION):
 t=i/RATE; step=min(23,int(t/.25)); phase=t-step*.25
 env=min(1,phase/.008)*max(0,1-phase/.25)**.7
 lead=square(frequency(score[step]),t)*env*.19
 bstep=min(11,int(t/.5)); bp=t-bstep*.5
 sub=(2/math.pi)*math.asin(math.sin(2*math.pi*frequency(bass[bstep])*t))*min(1,bp/.008)*max(0,1-bp/.5)*.22
 hat=rng.uniform(-1,1)*math.exp(-phase*85)*.032
 beat=int(t/.5); rel=t-beat*.5
 snare=rng.uniform(-1,1)*math.exp(-rel*24)*.07 if beat%2 else math.sin(2*math.pi*(52+85*math.exp(-rel*45))*rel)*math.exp(-rel*16)*.11
 master=min(1,t/.012)*min(1,(DURATION-t)/.3)
 left=(lead*.96+sub+hat+snare)*master
 right=(lead+sub+hat*.82+snare)*master
 frames.append(struct.pack('<hh',int(max(-.98,min(.98,left))*32767),int(max(-.98,min(.98,right))*32767)))
with wave.open(str(Path(__file__).parent/'assets/music.wav'),'wb') as w:
 w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE);w.writeframes(b''.join(frames))
