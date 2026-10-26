/* Original procedural gesture instrument. No dependencies or external assets. */
(() => {
'use strict';
const canvas=document.querySelector('#canvas'), ctx=canvas.getContext('2d');
const stage=document.querySelector('#stage'), panel=document.querySelector('#panel');
const toggle=document.querySelector('#toggle'), voice=document.querySelector('#voice'), tuning=document.querySelector('#tuning');
const status=document.querySelector('#status');
let w=390,h=844,dpr=1,audio=null,master=null,ready=false,last=0;
const fingers=new Map(), voices=new Map(), trails=[];
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
function resize(){const r=stage.getBoundingClientRect();w=r.width;h=r.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
function startAudio(){
 if(!audio){const AC=window.AudioContext||window.webkitAudioContext;if(!AC){status.textContent='Audio unavailable in this browser. The light field still responds.';return false;}
 audio=new AC();master=audio.createGain();master.gain.value=.24;
 const compressor=audio.createDynamicsCompressor();master.connect(compressor);compressor.connect(audio.destination);
 }audio.resume().catch(()=>{status.textContent='Touch the field again to enable audio.';});return true;
}
function pitch(y){let note=45+(1-y)*36;if(tuning.value==='scale'){const scale=[0,3,5,7,10];let best=45,dist=100;for(let i=0;i<4;i++)for(const s of scale){const n=45+i*12+s;if(Math.abs(n-note)<dist){dist=Math.abs(n-note);best=n;}}note=best;}return 440*Math.pow(2,(note-69)/12);}
function updateVoice(id,p){const v=voices.get(id);if(!v)return;const t=audio.currentTime;v.osc.frequency.setTargetAtTime(pitch(p.y),t,.035);v.filter.frequency.setTargetAtTime(450+p.x*6500,t,.06);v.gain.gain.setTargetAtTime(.34,t,.035);}
function begin(e){e.preventDefault();if(fingers.size>=2)return;canvas.setPointerCapture(e.pointerId);const p=point(e);fingers.set(e.pointerId,p);if(startAudio()){const osc=audio.createOscillator(),gain=audio.createGain(),filter=audio.createBiquadFilter();osc.type=voice.value;filter.type='lowpass';gain.gain.value=0;osc.connect(filter);filter.connect(gain);gain.connect(master);osc.start();voices.set(e.pointerId,{osc,gain,filter});updateVoice(e.pointerId,p);}status.textContent='Playing · glide to bend the sound';}
function point(e){const r=canvas.getBoundingClientRect();return {x:clamp((e.clientX-r.left)/w,.02,.98),y:clamp((e.clientY-r.top)/h,.03,.97)};}
function end(e){fingers.delete(e.pointerId);const v=voices.get(e.pointerId);if(v){v.gain.gain.setTargetAtTime(0,audio.currentTime,.06);v.osc.stop(audio.currentTime+.5);v.osc.onended=()=>{v.osc.disconnect();v.filter.disconnect();v.gain.disconnect();};voices.delete(e.pointerId);}status.textContent='Hold and glide to play again.';}
canvas.addEventListener('pointerdown',begin);canvas.addEventListener('pointermove',e=>{if(!fingers.has(e.pointerId))return;const p=point(e);fingers.set(e.pointerId,p);updateVoice(e.pointerId,p);});
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,end);
function release(){for(const id of fingers.keys())end({pointerId:id});}
window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden){release();if(audio)audio.suspend();}});
voice.addEventListener('change',()=>{for(const v of voices.values())v.osc.type=voice.value;});
tuning.addEventListener('change',()=>{for(const [id,p] of fingers)updateVoice(id,p);});
toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));toggle.setAttribute('aria-label',panel.hidden?'Open instrument controls':'Close instrument controls');});
for(const el of [panel,toggle])for(const name of ['pointerdown','pointermove','pointerup','touchstart','touchmove','mousedown'])el.addEventListener(name,e=>e.stopPropagation());
function orb(x,y,color,t){const radius=Math.min(w,h)*.16;const g=ctx.createRadialGradient(x,y,0,x,y,radius);g.addColorStop(0,color+'77');g.addColorStop(.3,color+'22');g.addColorStop(1,color+'00');ctx.fillStyle=g;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);ctx.strokeStyle=color;ctx.lineWidth=1;for(let k=0;k<3;k++){ctx.beginPath();ctx.ellipse(x,y,10+k*7,10+k*7,.2,0,Math.PI*2);ctx.globalAlpha=.6-k*.17;ctx.stroke();}ctx.globalAlpha=1;ctx.fillStyle='#edfff5';ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();}
function draw(ms){const t=ms*.001;const dt=Math.min((ms-last)/1000,.05)||.016;last=ms;
 ctx.fillStyle='#060f19';ctx.fillRect(0,0,w,h);
 const points=fingers.size?[...fingers.values()]:[{x:.34+.12*Math.sin(t*.35),y:.40+.09*Math.sin(t*.42)},{x:.70+.07*Math.cos(t*.31),y:.65+.06*Math.sin(t*.5)}];
 const margin=w*.08,top=h*.12,bottom=h*.88;
 // Fine etched field, scaled to the available island rather than cropped.
 ctx.lineWidth=.6;ctx.strokeStyle='#24404b';
 for(let i=0;i<13;i++){const y=top+(bottom-top)*i/12;ctx.beginPath();ctx.moveTo(margin,y);ctx.lineTo(w-margin,y);ctx.stroke();}
 for(let i=0;i<7;i++){const x=margin+(w-2*margin)*i/6;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke();}
 // Copper and mint filaments react to the actual gesture coordinates.
 ctx.globalCompositeOperation='screen';
 for(let i=0;i<42;i++){const f=i/41;ctx.beginPath();for(let j=0;j<=70;j++){const x=margin+(w-2*margin)*j/70;let y=top+(bottom-top)*f;
 for(let k=0;k<points.length;k++){const p=points[k];const distance=(x-p.x*w)/(w*.24);const band=(f-p.y)/.23;const envelope=Math.exp(-distance*distance-band*band);y+=Math.sin(j*.15+t*(fingers.size?3:1)+i*.20+k)*envelope*w*.17;}
 if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
 ctx.strokeStyle=`hsla(${155-f*125},${65+f*15}%,${65-f*10}%,${.30+.35*Math.sin(f*Math.PI)})`;ctx.lineWidth=i%5===0?1.6:.85;ctx.stroke();}
 for(let k=0;k<points.length;k++){const p=points[k];trails.push({x:p.x*w,y:p.y*h,life:1,k});orb(p.x*w,p.y*h,k?'#ffc58b':'#80f4d4',t);}
 for(let i=trails.length-1;i>=0;i--){const p=trails[i];p.life-=dt*.65;if(p.life<=0){trails.splice(i,1);continue;}ctx.fillStyle=p.k?`rgba(255,196,132,${p.life*.4})`:`rgba(127,250,214,${p.life*.4})`;ctx.beginPath();ctx.arc(p.x+Math.sin(t+p.y)*((1-p.life)*12),p.y+(1-p.life)*26,1.4*p.life,0,Math.PI*2);ctx.fill();}
 ctx.globalCompositeOperation='source-over';
 // Small physical edge markings belong to the instrument surface.
 ctx.strokeStyle='#628a89';ctx.lineWidth=1;for(let i=0;i<25;i++){const y=top+(bottom-top)*i/24;ctx.beginPath();ctx.moveTo(margin-12,y);ctx.lineTo(margin-(i%4?9:5),y);ctx.stroke();}
 ctx.beginPath();ctx.moveTo(w*.35,h*.93);for(let i=0;i<=60;i++){const x=w*.35+w*.3*i/60,y=h*.93+Math.sin(i*.35+t*2)*Math.sin(i/60*Math.PI)*7;ctx.lineTo(x,y);}ctx.strokeStyle='#a7d2c4';ctx.stroke();
 if(!ready&&window.__gbSandbox&&window.__gbSandbox.ready){window.__gbSandbox.ready();ready=true;}requestAnimationFrame(draw);
}
resize();window.addEventListener('resize',resize);requestAnimationFrame(draw);
})();
