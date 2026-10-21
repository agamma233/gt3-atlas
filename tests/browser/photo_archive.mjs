#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launchChrome, wait, waitFor, ROOT, DIST, PREFIX } from './showroom_navigation.mjs';

const output = path.join(ROOT, 'tests/browser/.artifacts/v1.2');
fs.rmSync(output, { recursive:true, force:true });
fs.mkdirSync(output, { recursive:true });
const {server, port} = await startServer();
const chrome = await launchChrome();
const cdp = chrome.cdp;
const base = `http://127.0.0.1:${port}${PREFIX}/`;
// Isolated synthetic second-livery markup; removed before any build can publish.
const fixturePath = path.join(DIST, 'cars/ferrari26/__review-fixture.html');
const fixture = fs.readFileSync(path.join(DIST, 'cars/ferrari26/index.html'), 'utf8')
  .replace('id="collection-ferrari26-perspectives" data-livery-id="ferrari26-livery"', 'id="collection-ferrari26-perspectives" data-livery-id="fixture-livery"')
  .replace('<div class="sr-liveries">', '<div class="sr-liveries"><article class="sr-livery"><span>2027 / TEST FIXTURE</span><a href="#collection-ferrari26-perspectives" data-livery-id="fixture-livery">VIEW COLLECTIONS</a></article>');
fs.writeFileSync(fixturePath, fixture);
const checks = [];
const errors = [];
const measurements = [];
function check(name, ok, detail='') {
  checks.push({name, ok:Boolean(ok)});
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${ok ? '' : ' | '+detail}`);
}
async function evaluate(expression) {
  const result = await cdp.send('Runtime.evaluate',{expression, returnByValue:true, awaitPromise:true, userGesture:true});
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result?.value;
}
async function navigate(route) {
  await cdp.send('Page.navigate',{url:base+route});
  await wait(150);
  await waitFor(async()=>await evaluate(`document.readyState === 'complete' && location.pathname === ${JSON.stringify(new URL(base+route).pathname)}`));
  await wait(250);
}
async function click(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);
  await wait(120);
  const r = await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...r,button:'left',clickCount:1});
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...r,button:'left',clickCount:1});
  await wait(250);
}
async function key(key) {
  await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:{Escape:27,ArrowRight:39,ArrowLeft:37,Tab:9,Enter:13}[key]});
  await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key});
  await wait(300);
}
async function screenshot(name) {
  const result = await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true});
  fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(result.data,'base64'));
}
async function touch(type, points) { await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points}); }
try {
  await cdp.send('Page.enable');await cdp.send('Runtime.enable');await cdp.send('Network.enable');
  cdp.on('Runtime.exceptionThrown', e=>errors.push(e.exceptionDetails.text));
  cdp.on('Runtime.consoleAPICalled', e=>{if(e.type==='error')errors.push(JSON.stringify(e.args));});
  // Layout shifts and paint timing are observations, not Lighthouse scores.
  await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.archiveCLS=0;new PerformanceObserver(list=>list.getEntries().forEach(e=>{if(!e.hadRecentInput)window.archiveCLS+=e.value})).observe({type:'layout-shift',buffered:true});`});
  for (const [width,height] of [[1440,900],[1024,768],[390,844],[375,812]]) {
    await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:width<600,maxTouchPoints:5});
    for (const route of ['', 'cars/ferrari26/','cars/bmw/','cars/porsche26/']) {
      await navigate(route);
      const state=await evaluate(`(()=>({overflow:document.documentElement.scrollWidth>innerWidth,hero:(document.querySelector('#srHeroImage')||document.querySelector('#heroImage')).naturalWidth, sections:document.querySelectorAll('.sr-tech-category').length, broken:[...document.images].filter(i=>i.currentSrc&&i.complete&&!i.naturalWidth).length, cls:window.archiveCLS, nav:performance.getEntriesByType('navigation')[0].toJSON(), paints:performance.getEntriesByType('paint').map(p=>({name:p.name,startTime:p.startTime})),bytes:performance.getEntriesByType('resource').reduce((n,r)=>n+r.transferSize,0)}))()`);
      check(`${width} ${route||'home'} no overflow and loaded cover`, !state.overflow && state.hero>0 && !state.broken,JSON.stringify(state));
      if(route)check(`${width} ${route} seven dossier groups`,state.sections===7);
      measurements.push({width,height,route,...state});
      if(width===1440 || width===390) await screenshot(`${route ? route.split('/')[1] : 'home'}-${width}`);
    }
  }
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});
  await navigate('cars/ferrari26/__review-fixture.html');
  // Enter on a real anchor must select only the associated livery's collections.
  await evaluate(`document.querySelector('.sr-livery a[data-livery-id="fixture-livery"]').focus()`);
  await key('Enter');
  check('livery VIEW COLLECTIONS supports keyboard selection and focus',await evaluate(`location.hash==='#collection-ferrari26-perspectives' && document.activeElement.id==='collection-ferrari26-perspectives' && document.querySelectorAll('.sr-gallery-thumb:not([hidden])').length===2`));
  check('livery selection hides unrelated collection controls',await evaluate(`[...document.querySelectorAll('.sr-collection[data-livery-id]:not([hidden])')].every(b=>b.dataset.liveryId==='fixture-livery')&&document.querySelectorAll('.sr-collection[data-livery-id]:not([hidden])').length===1`));
  await click('.sr-livery a[data-livery-id="ferrari26-livery"]');
  check('switching livery restores its own collection and photographs',await evaluate(`document.activeElement.id==='collection-ferrari26-complete'&&document.querySelectorAll('.sr-gallery-thumb:not([hidden])').length===3&&document.querySelector('#collection-ferrari26-perspectives').hidden`));
  await click('[data-collection="all"]');
  check('all photos restores every collection control',await evaluate(`document.querySelectorAll('.sr-collection[hidden]').length===0`));
  await navigate('cars/ferrari26/');
  // Every story is a real image link when JavaScript is unavailable.
  check('stories expose image fallback links',await evaluate(`[...document.querySelectorAll('.sr-story-image')].every(a=>a.getAttribute('href').startsWith('../../assets/images/'))`));
  await evaluate(`document.querySelector('#stories').scrollIntoView({behavior:'instant'})`);await wait(250);await screenshot('stories-1440');
  await click('.sr-gallery-thumb[data-index="0"]');
  check('thumbnail updates selected frame',await evaluate(`document.querySelector('#srGalleryCurrent').textContent==='01'`));
  await key('ArrowRight');
  check('thumbnail keyboard navigation',await evaluate(`document.querySelector('#srGalleryCurrent').textContent==='02'`));
  await evaluate(`document.querySelector('#photos').scrollIntoView({behavior:'instant'})`);await wait(250);await screenshot('gallery-1440');
  await click('[data-collection="1,2"]');
  check('two-photo collection filters gallery',await evaluate(`document.querySelectorAll('.sr-gallery-thumb:not([hidden])').length===2`));
  await click('.sr-gallery-expand');
  await waitFor(async()=>await evaluate(`!!document.querySelector('.pswp--open')`));
  check('collection lightbox counter is two',await evaluate(`document.querySelector('.pswp__counter').textContent.includes('/ 2')`));
  check('viewer source and original links are traceable',await evaluate(`[...document.querySelectorAll('.pswp__archive-caption a')].every(a=>a.href.startsWith('https://www.gt-world-challenge'))`));
  await click('.pswp__button--zoom');
  await waitFor(async()=>await evaluate(`document.querySelector('.pswp').classList.contains('pswp--zoomed-in')`));
  check('viewer zooms in',await evaluate(`document.querySelector('.pswp').classList.contains('pswp--zoomed-in')`));
  const panBefore=await evaluate(`document.querySelector('.pswp__item[aria-hidden="false"] .pswp__zoom-wrap')?.style.transform || document.querySelectorAll('.pswp__zoom-wrap')[1]?.style.transform`);
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:700,y:400,button:'left',buttons:1,clickCount:1});
  for(let i=0;i<6;i++){await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:700+i*22,y:400+i*8,button:'left',buttons:1});await wait(20);}
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:810,y:440,button:'left',buttons:0});
  await wait(300);
  const panAfter=await evaluate(`document.querySelector('.pswp__item[aria-hidden="false"] .pswp__zoom-wrap')?.style.transform || document.querySelectorAll('.pswp__zoom-wrap')[1]?.style.transform`);
  check('zoomed photograph can be dragged',panBefore!==panAfter,`${panBefore} / ${panAfter}`);
  await screenshot('viewer-zoom-1440');
  await click('.pswp__button--zoom');
  await waitFor(async()=>await evaluate(`!document.querySelector('.pswp').classList.contains('pswp--zoomed-in')`));
  check('viewer zooms out',await evaluate(`!document.querySelector('.pswp').classList.contains('pswp--zoomed-in')`));
  await key('ArrowRight');
  check('viewer keyboard switches within collection',await evaluate(`document.querySelector('.pswp__counter').textContent.startsWith('2')`));
  await key('Tab');
  check('viewer traps keyboard focus',await evaluate(`!!document.activeElement.closest('.pswp')`));
  await key('Escape');
  await waitFor(async()=>await evaluate(`!document.querySelector('.pswp')`));
  check('ESC restores opener focus and background access',await evaluate(`document.activeElement.classList.contains('sr-gallery-expand') && !document.querySelector('main').inert`));
  await click('[data-collection="all"]');
  await click('.sr-story-image');
  await waitFor(async()=>await evaluate(`!!document.querySelector('.pswp')`));
  check('all-frame viewer restores total three',await evaluate(`document.querySelector('.pswp__counter').textContent.includes('/ 3')`));
  await click('.pswp__button--close');
  check('close button restores story focus',await evaluate(`document.activeElement.classList.contains('sr-story-image')`));
  // Real mobile touch swipe and two-finger pinch through CDP.
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await navigate('cars/ferrari26/');await click('.sr-story-image');
  await waitFor(async()=>await evaluate(`!!document.querySelector('.pswp')`));
  await touch('touchStart',[{x:310,y:350,id:1}]);
  for(let i=0;i<9;i++){await touch('touchMove',[{x:310-i*28,y:350,id:1}]);await wait(20);}
  await touch('touchEnd',[]);await wait(700);
  check('mobile touch swipe changes frame',await evaluate(`document.querySelector('.pswp__counter').textContent.startsWith('2')`));
  await touch('touchStart',[{x:150,y:350,id:1},{x:240,y:350,id:2}]);
  for(let i=0;i<7;i++){await touch('touchMove',[{x:150-i*12,y:350,id:1},{x:240+i*12,y:350,id:2}]);await wait(25);}
  await touch('touchEnd',[]);await wait(500);
  check('mobile two-finger pinch zooms photograph',await evaluate(`document.querySelector('.pswp').classList.contains('pswp--zoomed-in')`));
  await screenshot('viewer-touch-390');await key('Escape');
  await navigate('?compare=bmw,ferrari26');
  await waitFor(async()=>await evaluate(`!document.querySelector('#compareDialog').hidden`));
  check('legacy compare URL opens correct cars',await evaluate(`document.querySelector('#compareA').value==='bmw'&&document.querySelector('#compareB').value==='ferrari26'`));
  await key('Escape');await wait(400);
  await evaluate(`document.querySelector('#q').value='BMW';document.querySelector('#q').dispatchEvent(new Event('input',{bubbles:true}))`);await wait(500);
  check('garage search retains BMW result',await evaluate(`document.querySelectorAll('.vehicle:not([hidden])').length===1&&!document.querySelector('#bmw').hidden`));
  await evaluate(`document.querySelector('#q').value='';document.querySelector('#q').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#year').value='2026';document.querySelector('#year').dispatchEvent(new Event('change',{bubbles:true}))`);await wait(500);
  check('year filter preserves matching cars',await evaluate(`[...document.querySelectorAll('.vehicle:not([hidden])')].every(c=>c.dataset.year==='2026')&&document.querySelectorAll('.vehicle:not([hidden])').length>0`));
  await evaluate(`document.querySelector('#year').value='all';document.querySelector('#year').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#brand').value='BMW';document.querySelector('#brand').dispatchEvent(new Event('change',{bubbles:true}))`);await wait(400);
  check('brand filter selects BMW',await evaluate(`document.querySelectorAll('.vehicle:not([hidden])').length===1&&!document.querySelector('#bmw').hidden`));
  await evaluate(`document.querySelector('#brand').value='all';document.querySelector('#brand').dispatchEvent(new Event('change',{bubbles:true}))`);await wait(400);
  await click('[data-series-filter="GTWC ASIA"]');
  check('race-series filter selects matching scope',await evaluate(`[...document.querySelectorAll('.vehicle:not([hidden])')].every(c=>c.dataset.series==='GTWC ASIA')&&document.querySelectorAll('.vehicle:not([hidden])').length===1`));
  await evaluate(`document.querySelector('#teleSelect').value='bmw';document.querySelector('#teleSelect').dispatchEvent(new Event('change',{bubbles:true}))`);
  check('technical telemetry changes chassis',await evaluate(`document.querySelector('#teleName').textContent.includes('M4')&&document.querySelector('#teleSpecs').children.length>0`));
  await navigate('gt3-atlas-offline.html');
  check('offline garage has embedded photos and no showroom routes',await evaluate(`document.querySelectorAll('.vehicle').length===16 && [...document.querySelectorAll('.angle-img')].every(i=>i.src.startsWith('data:')) && ![...document.querySelectorAll('a')].some(a=>(a.getAttribute('href')||'').startsWith('cars/'))`));
  // Progressive enhancement, reduced motion, and explicit image error state.
  await cdp.send('Emulation.setScriptExecutionDisabled',{value:true});
  await navigate('cars/ferrari26/');
  check('without JS, stories and technical data stay visible',await evaluate(`getComputedStyle(document.querySelector('.sr-story')).opacity==='1'&&document.querySelectorAll('.sr-tech-category').length===7`));
  await cdp.send('Emulation.setScriptExecutionDisabled',{value:false});
  await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await navigate('cars/bmw/');
  check('reduced motion disables scroll animation',await evaluate(`getComputedStyle(document.documentElement).scrollBehavior==='auto'`));
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:100000});
  await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  await navigate('cars/ferrari26/');await wait(1000);
  measurements.push(await evaluate(`({scenario:'150ms latency, 200kB/s download, 390x844 mobile, cold cache',cls:window.archiveCLS,paints:performance.getEntriesByType('paint').map(p=>({name:p.name,startTime:p.startTime})),duration:performance.getEntriesByType('navigation')[0].duration,bytes:performance.getEntriesByType('resource').reduce((n,r)=>n+r.transferSize,0)})`));
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  check('no uncaught exceptions or console errors',errors.length===0,JSON.stringify(errors));
  await navigate('cars/bmw/');
  // Controlled missing-file request is excluded from normal network hygiene.
  const bad=await evaluate(`document.querySelector('.sr-gallery-thumb[data-index="0"]').dataset.src`);
  await cdp.send('Network.setBlockedURLs',{urls:['*'+bad.split('/').at(-1)]});
  await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  await click('.sr-gallery-thumb[data-index="0"]');
  await click('.sr-gallery-thumb[data-index="1"]');
  await click('.sr-gallery-thumb[data-index="0"]');
  await wait(500);
  check('gallery failed image has explicit fallback and original link',await evaluate(`!document.querySelector('#srMediaError').hidden&&document.querySelector('#srGalleryOriginal').href.startsWith('https://')`));
  await click('.sr-gallery-expand');await wait(500);
  check('viewer failed image has explicit fallback',await evaluate(`!!document.querySelector('.pswp__error-msg')`));
  await key('Escape');
  await cdp.send('Network.setBlockedURLs',{urls:['*photoswipe.esm.js']});
  await navigate('cars/ferrari26/');
  await click('.sr-story-image');
  await waitFor(async()=>await evaluate(`!document.querySelector('#srViewerError').hidden`));
  check('blocked viewer module preserves showroom URL and usable background',await evaluate(`location.pathname.endsWith('/cars/ferrari26/') && !document.querySelector('main').inert && !document.body.classList.contains('is-lightbox-open') && !document.querySelector('.pswp')`));
  check('viewer module failure offers explicit original and local fallback links',await evaluate(`document.querySelector('#srViewerFallbackOriginal').href===document.querySelector('.sr-gallery-thumb').dataset.original && document.querySelector('#srViewerFallbackPreview').getAttribute('href')===document.querySelector('.sr-gallery-thumb').dataset.src && document.querySelector('#srViewerFallbackOriginal').target==='_blank'`));
  check('viewer error receives accessible keyboard focus',await evaluate(`document.activeElement.id==='srViewerError'&&document.activeElement.getAttribute('role')==='alert'`));
  await key('Tab');
  check('viewer error fallback is keyboard reachable',await evaluate(`document.activeElement.id==='srViewerFallbackOriginal'`));
  await screenshot('viewer-module-error-390');
  await click('#srViewerErrorDismiss');
  check('dismissing viewer error restores trigger focus',await evaluate(`document.querySelector('#srViewerError').hidden&&document.activeElement.classList.contains('sr-story-image')`));
  // Force an init exception after DOM creation and the afterInit callback; even
  // a failing library destroy() must not leave an overlay, inert page or lock.
  await cdp.send('Network.setBlockedURLs',{urls:[]});
  let interceptedModule = false;
  cdp.on('Fetch.requestPaused', event => {
    interceptedModule = true;
    const module = `export default class {
      constructor(){this.handlers={};this.element=document.createElement('div');this.element.className='pswp';}
      on(name,callback){this.handlers[name]=callback;}
      init(){document.body.append(this.element);this.handlers.afterInit();throw Error('fixture init failure');}
      destroy(){throw Error('fixture destroy failure');}
    }`;
    cdp.send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/javascript'}],body:Buffer.from(module).toString('base64')}).catch(error=>errors.push(error.message));
  });
  await cdp.send('Fetch.enable',{patterns:[{urlPattern:'*photoswipe.esm.js',requestStage:'Request'}]});
  await navigate('cars/ferrari26/');await click('.sr-story-image');
  await waitFor(async()=>await evaluate(`!document.querySelector('#srViewerError').hidden`));
  check('partial PhotoSwipe init failure cleans overlay, inert state and scroll lock',interceptedModule&&await evaluate(`!document.querySelector('.pswp')&&!document.querySelector('main').inert&&!document.body.classList.contains('is-lightbox-open')&&location.pathname.endsWith('/cars/ferrari26/')`));
  await cdp.send('Fetch.disable');


} catch(error) {
  check('browser execution completes',false,error.stack);
  await screenshot('failure').catch(()=>{});
} finally {
  fs.rmSync(fixturePath,{force:true});
  fs.writeFileSync(path.join(output,'measurements.json'),JSON.stringify(measurements,null,2));
  cdp.close();chrome.process.kill('SIGTERM');await wait(300);chrome.process.kill('SIGKILL');
  fs.rmSync(chrome.userDataDir,{recursive:true,force:true});
  server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));
}
fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(checks,null,2));
const failed=checks.filter(c=>!c.ok);
console.log(`${failed.length ? 'FAILED' : 'ALL BROWSER CHECKS PASSED'} | ${checks.length-failed.length}/${checks.length}`);
// All browser/server cleanup is complete; release native CDP WebSocket handles.
process.exit(failed.length ? 1 : 0);
