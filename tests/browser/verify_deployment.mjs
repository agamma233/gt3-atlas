#!/usr/bin/env node
/** Read-only smoke verification of the deployed Pages site, with real Chrome. */
import fs from 'node:fs';
import path from 'node:path';
import { launchChrome, wait, waitFor, ROOT } from './showroom_navigation.mjs';
import { photoSwipeInspector } from './photoswipe_driver.mjs';

const base = process.env.GT3_SITE_BASE || 'https://agamma233.github.io/gt3-atlas/';
const output = path.join(ROOT, base.startsWith('https://agamma233.github.io/') ? 'tests/browser/.artifacts/production-v1.3' : 'tests/browser/.artifacts/smoke-local-v1.3');
fs.mkdirSync(output, {recursive:true});
const inventory = JSON.parse(fs.readFileSync(path.join(ROOT,'data/photos.json'),'utf8'));
const chrome = await launchChrome(), cdp = chrome.cdp;
const inspector = photoSwipeInspector(cdp, new URL('assets/vendor/photoswipe/photoswipe.esm.js',base).href);
const checks = [], errors = [];
async function evaluate(expression) {
  const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});
  if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
  return result.result.value;
}
function check(name,ok,detail) { checks.push({name,ok:Boolean(ok),detail}); console.log(`${ok?'PASS':'FAIL'} | ${name} ${detail?JSON.stringify(detail):''}`); if(!ok)throw Error(name); }
async function screenshot(name) {const result=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true});fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(result.data,'base64'));}
async function click(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);
  let previous,rect;
  await waitFor(async()=>{rect=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return{x,y,hit:e.contains(document.elementFromPoint(x,y))}})()`);const stable=previous&&Math.abs(rect.x-previous.x)<.5&&Math.abs(rect.y-previous.y)<.5;previous=rect;return rect.hit&&stable;});
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:rect.x,y:rect.y,button:'left',buttons:1,clickCount:1});
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:rect.x,y:rect.y,button:'left',buttons:0,clickCount:1});
}
try {
  await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Network.enable');
  cdp.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails));
  cdp.on('Network.responseReceived',e=>{if(e.response.url.startsWith(base)&&e.response.status>=400)errors.push({url:e.response.url,status:e.response.status});});
  for(const [width,height] of [[1440,1000],[390,844]]) {
    await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
    for(const route of ['', 'cars/ferrari26/','cars/bmw/','cars/porsche26/','photography/']) {
      await cdp.send('Page.navigate',{url:base+route});
      await waitFor(async()=>await evaluate(`document.readyState==='complete'&&location.pathname===${JSON.stringify(new URL(route,base).pathname)}`),30000);
      await waitFor(async()=>await evaluate(`(()=>{const image=document.querySelector('#srHeroImage,#heroImage,.sr-archive-cover img');return image?.complete&&image.naturalWidth>0})()`),30000);
      const state=await evaluate(`({url:location.href,overflow:document.documentElement.scrollWidth>innerWidth,version:document.body.textContent.includes('V1.3'),photos:document.querySelectorAll('.sr-gallery-thumb').length,broken:[...document.images].filter(i=>i.complete&&i.currentSrc&&!i.naturalWidth).length})`);
      const car=route.split('/')[1];const expected=route==='photography/'?inventory.images.length:inventory.images.filter(p=>p.car_id===car).length;
      check(`${width} ${route||'home'} live V1.3 layout and photos`,state.version&&!state.overflow&&!state.broken&&(!route||state.photos===expected),state);
      await screenshot(`${route?car||'archive':'home'}-${width}`);
      if(route.startsWith('cars/')) {
        await click('.sr-gallery-thumb[data-index="3"]');
        await waitFor(async()=>await evaluate(`document.querySelector('#srGalleryImage').complete&&document.querySelector('#srGalleryImage').naturalWidth>0&&document.querySelector('#srGalleryImage').src.includes('/assets/photos/')`),30000);
        check(`${width} ${car} newly licensed gallery loads`,await evaluate(`document.querySelector('#srGalleryCredit a[rel*="license"]').href.startsWith('https://creativecommons.org/')`));
        if(width<1100) {
          const layout=await evaluate(`(()=>{const list=document.querySelector('#srGalleryThumbs'),rects=[...list.querySelectorAll('.sr-gallery-thumb')].map(t=>t.getBoundingClientRect());return{width:list.clientWidth,minWidth:Math.min(...rects.map(r=>r.width)),minHeight:Math.min(...rects.map(r=>r.height)),overlap:rects.some((r,i)=>i&&r.top<rects[i-1].bottom-1)}})()`);
          check(`${width} ${car} expanded thumbnails remain readable`,layout.minWidth>=layout.width-2&&layout.minHeight>=96&&!layout.overlap,layout);
        }
        await screenshot(`${car}-new-gallery-${width}`);
      }
    }
  }
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await click('.sr-gallery-thumb[data-car="bmw"][data-type="detail"]');
  let initial;await waitFor(async()=>{initial=await inspector.snapshot();return inspector.ready(initial)},30000);
  check('live licensed lightbox has author and license',await evaluate(`document.querySelector('.pswp__archive-caption').textContent.includes('Strubbl')&&document.querySelector('.pswp__archive-caption a[rel*="license"]').href.includes('creativecommons.org/licenses/by-sa/4.0')`));
  await click('.pswp__button--zoom');let zoomed;
  await waitFor(async()=>{zoomed=await inspector.snapshot();return inspector.atZoom(zoomed,initial.secondary)},30000);
  check('live lightbox zooms real image',zoomed.zoom>initial.zoom,zoomed);
  const x=720,y=450;
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,button:'none'});
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1});
  for(let i=1;i<=6;i++){await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:x+i*22,y:y+i*8,button:'left',buttons:1});await wait(20);}
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:x+132,y:y+48,button:'left',buttons:0});
  let panned;await waitFor(async()=>{panned=await inspector.snapshot();return inspector.ready(panned)&&Math.abs(panned.pan.x-zoomed.pan.x)>2});
  check('live zoomed image pans',Math.abs(panned.pan.x-zoomed.pan.x)>2,panned);
  await screenshot('licensed-viewer-1440');
  await click('.pswp__button--zoom');await waitFor(async()=>inspector.atZoom(await inspector.snapshot(),initial.initial));
  await click('.pswp__button--close');await waitFor(async()=>await evaluate(`!document.querySelector('.pswp')`));
  check('live viewer closes and restores focus',await evaluate(`document.activeElement.matches('.sr-gallery-thumb')&&!document.querySelector('main').inert`));
  check('live resources and runtime are clean',errors.length===0,errors);
} catch(error) {
  checks.push({name:'deployment smoke completes',ok:false,error:error.stack,viewer:await inspector.snapshot().catch(()=>null)});
  await screenshot('failure').catch(()=>{});console.error(error);
} finally {
  fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({base,checks,errors},null,2));
  cdp.close();chrome.process.kill('SIGTERM');await wait(300);chrome.process.kill('SIGKILL');fs.rmSync(chrome.userDataDir,{recursive:true,force:true});
}
process.exit(checks.some(c=>!c.ok)?1:0);
