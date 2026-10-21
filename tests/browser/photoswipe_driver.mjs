/** Read the real PhotoSwipe instance via CDP, without altering product code or
 * replacing user input. Public slide zoom/pan values are checked against the
 * rendered image; the CSS zoom icon class is diagnostic only.
 */
export function photoSwipeInspector(cdp, moduleUrl) {
  const snapshot = async () => {
    const dom = await cdp.send('Runtime.evaluate', {
      expression: `({present:!!document.querySelector('.pswp'),url:location.href})`, returnByValue:true
    });
    if (!dom.result.value.present) return dom.result.value;
    const group = 'photoswipe-inspection';
    try {
      const prototype = await cdp.send('Runtime.evaluate', {
        expression: `import(${JSON.stringify(moduleUrl)}).then(module=>module.default.prototype)`,
        awaitPromise:true, objectGroup:group
      });
      if (prototype.exceptionDetails) throw Error(prototype.exceptionDetails.exception?.description||prototype.exceptionDetails.text);
      if (!prototype.result?.objectId) throw Error('PhotoSwipe prototype unavailable');
      const instances = await cdp.send('Runtime.queryObjects', {
        prototypeObjectId:prototype.result.objectId, objectGroup:group
      });
      const result = await cdp.send('Runtime.callFunctionOn', {
        objectId:instances.objects.objectId, returnByValue:true,
        functionDeclaration:`function() {
          const viewer=this.find(v=>v.element?.isConnected);
          if (!viewer) return {present:false};
          const slide=viewer.currSlide;
          const image=slide?.content?.element;
          const rect=image?.getBoundingClientRect();
          const running=element=>element?.getAnimations().some(a=>a.playState==='running')||false;
          return {
            present:true, url:location.href, index:viewer.currIndex,
            zoom:slide?.currZoomLevel, initial:slide?.zoomLevels.initial,
            secondary:slide?.zoomLevels.secondary, pan:slide?{...slide.pan}:null,
            zoomable:slide?.isZoomable(), loading:slide?.content?.isLoading(),
            opener:{open:viewer.opener?.isOpen,opening:viewer.opener?.isOpening},
            classes:viewer.element.className,
            animating:running(viewer.element)||running(slide?.container)||running(slide?.holderElement?.parentElement),
            opacity:Number(getComputedStyle(viewer.element).opacity),
            image:{src:image?.currentSrc,complete:image?.complete,naturalWidth:image?.naturalWidth,
              attached:!!image?.isConnected,width:rect?.width,height:rect?.height,
              x:rect?.x,y:rect?.y},
            renderedZoom:rect&&slide.width?rect.width/slide.width:null,
            transform:slide?.container?.style.transform,
            viewport:{width:innerWidth,height:innerHeight}
          };
        }`
      });
      if (result.exceptionDetails) throw Error(result.exceptionDetails.text);
      return result.result.value;
    } finally {
      await cdp.send('Runtime.releaseObjectGroup',{objectGroup:group});
    }
  };
  // Attached/decoded image and actual completed transitions, not an early root class.
  const ready = s => s.present && s.zoomable && !s.loading && s.image?.attached
    && s.image.complete && s.image.naturalWidth>0 && s.opacity===1 && !s.animating;
  const atZoom = (s, zoom) => ready(s) && Math.abs(s.zoom-zoom)<0.01
    && Math.abs(s.renderedZoom-zoom)<0.03;
  return {snapshot,ready,atZoom};
}
