(() => {
  'use strict';
  const catalogURL = new URL('trial/watermark-catalog.js?v=trial-1', document.currentScript.src);
  let catalogRequest;

  function loadCatalog() {
    if (window.GuWatermarkCatalog?.length === 15) return Promise.resolve(window.GuWatermarkCatalog);
    if (!catalogRequest) {
      catalogRequest = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = catalogURL.href;
        script.onload = () => {
          const items = window.GuWatermarkCatalog;
          if (items?.length === 15) resolve(items);
          else reject(new Error('水印素材库不完整'));
        };
        script.onerror = () => { script.remove(); reject(new Error('无法载入水印素材库')); };
        document.head.append(script);
      }).catch(error => {
        catalogRequest = null;
        throw error;
      });
    }
    return catalogRequest;
  }

  function cover(ctx, image, width, height) {
    const scale = Math.max(width / image.width, height / image.height);
    const w = image.width * scale, h = image.height * scale;
    ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
  }

  function boxPass(source, target, width, height, radius, vertical) {
    const length = vertical ? height : width;
    const lines = vertical ? width : height;
    const step = vertical ? width * 4 : 4;
    const lineStep = vertical ? 4 : width * 4;
    const diameter = radius * 2 + 1;
    const bound = i => Math.min(length - 1, Math.max(0, i));
    for (let line = 0; line < lines; line++) {
      const offset = line * lineStep;
      for (let channel = 0; channel < 4; channel++) {
        const start = offset + channel;
        let sum = 0;
        for (let i = -radius; i <= radius; i++) sum += source[start + bound(i) * step];
        for (let i = 0; i < length; i++) {
          target[start + i * step] = sum / diameter;
          sum += source[start + bound(i + radius + 1) * step] - source[start + bound(i - radius) * step];
        }
      }
    }
  }

  function blurBackground(image, width, height, blur) {
    // Three box passes approximate a Gaussian, including on browsers without Canvas filters.
    const scale = Math.min(1, 512 / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    cover(ctx, image, w, h);
    const radius = Math.max(1, Math.round(blur * Math.max(w, h) / 512));
    const pixels = ctx.getImageData(0, 0, w, h);
    const data = pixels.data;
    const working = new Float32Array(data.length);
    const scratch = new Float32Array(data.length);
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3] / 255;
      working[i] = data[i] * alpha;
      working[i + 1] = data[i + 1] * alpha;
      working[i + 2] = data[i + 2] * alpha;
      working[i + 3] = data[i + 3];
    }
    for (let pass = 0; pass < 3; pass++) {
      boxPass(working, scratch, w, h, radius, false);
      boxPass(scratch, working, w, h, radius, true);
    }
    for (let i = 0; i < data.length; i += 4) {
      const alpha = working[i + 3] / 255;
      for (let channel = 0; channel < 3; channel++) data[i + channel] = alpha ? working[i + channel] / alpha : 0;
      data[i + 3] = working[i + 3];
    }
    ctx.putImageData(pixels, 0, 0);
    return canvas;
  }

  function createRenderer() {
    const cache = new Map();
    const blurred = new Map();
    let lastImage, lastMask, lastBlur, lastOpacity;
    return function drawBackground(ctx, image, width, height, blur, mask, opacity) {
      if (!image) return;
      if (!blur && (!mask || !opacity)) {
        cover(ctx, image, width, height);
        return;
      }
      if (lastImage !== image || lastBlur !== blur) blurred.clear();
      if (lastImage !== image || lastMask !== mask || lastBlur !== blur || lastOpacity !== opacity) {
        cache.clear();
        lastImage = image; lastMask = mask; lastBlur = blur; lastOpacity = opacity;
      }
      const key = width + 'x' + height;
      let layer = cache.get(key);
      if (!layer) {
        const scale = Math.min(1, 1600 / Math.max(width, height));
        layer = document.createElement('canvas');
        layer.width = Math.max(1, Math.round(width * scale));
        layer.height = Math.max(1, Math.round(height * scale));
        const w = layer.width, h = layer.height;
        const c = layer.getContext('2d');
        if (blur) {
          if (!blurred.has(key)) {
            if (blurred.size >= 2) blurred.delete(blurred.keys().next().value);
            blurred.set(key, blurBackground(image, w, h, blur));
          }
          c.drawImage(blurred.get(key), 0, 0, w, h);
        } else {
          cover(c, image, w, h);
        }
        if (mask && opacity) {
          c.globalAlpha = opacity;
          c.globalCompositeOperation = mask.mode;
          cover(c, mask.image, w, h);
        }
        if (cache.size >= 2) cache.delete(cache.keys().next().value);
        cache.set(key, layer);
      }
      ctx.drawImage(layer, 0, 0, width, height);
    };
  }

  window.PetalBackground = {createRenderer, loadCatalog};
})();
