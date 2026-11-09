/* Export-only watermark picker for the two collage templates. */
(() => {
  'use strict';
  const catalogURL = new URL('trial/watermark-catalog.js?v=trial-1', document.currentScript.src);
  let catalogLoad;

  function loadCatalog() {
    if (window.GuWatermarkCatalog?.length === 15) return Promise.resolve(window.GuWatermarkCatalog);
    if (!catalogLoad) {
      catalogLoad = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = catalogURL.href;
        script.onload = () => {
          const items = window.GuWatermarkCatalog;
          if (items?.length === 15) resolve(items);
          else reject(new Error('水印素材库不完整'));
        };
        script.onerror = () => reject(new Error('水印素材库载入失败'));
        document.head.append(script);
      }).catch(error => {
        catalogLoad = null;
        throw error;
      });
    }
    return catalogLoad;
  }

  function create(modal, render) {
    const picker = document.createElement('div');
    picker.className = 'export-watermark';
    picker.innerHTML = `
      <style>
      .export-watermark{margin:12px 0}.export-watermark [hidden]{display:none!important}
      .export-watermark fieldset{min-width:0;margin:8px 0 0;padding:12px;border:1px solid #cad7ce;border-radius:12px}
      .export-watermark canvas{display:block;max-width:100%;max-height:28vh;width:auto;height:auto;margin:0 auto 8px}
      .export-watermark .wm-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;max-height:23vh;overflow:auto;padding:3px}
      .export-watermark .wm-grid button{min-width:0;padding:4px;border:1px solid #cad7ce;border-radius:8px;background:#fff;color:#345345;font-size:11px}
      .export-watermark .wm-grid button[aria-pressed=true]{outline:2px solid #527b65}
      .export-watermark .wm-grid img{display:block;width:100%;height:42px;object-fit:cover;border-radius:4px}
      .export-watermark .wm-controls{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,130px),1fr));gap:8px;margin-top:10px}
      .export-watermark .wm-controls label{display:grid;gap:3px;font-size:12px;min-width:0}
      .export-watermark .wm-controls :is(input,select){width:100%;min-width:0}
      </style>
      <label><input type="checkbox" data-wm="enabled" aria-controls="export-watermark-panel" aria-expanded="false"> 添加水印</label>
      <fieldset id="export-watermark-panel" hidden>
        <legend>春雨楼雪 · 水印素材库</legend>
        <canvas aria-label="带水印的导出预览"></canvas>
        <p class="note" data-wm="status" role="status"></p>
        <div class="wm-grid" aria-label="选择水印"></div>
        <div class="wm-controls">
          <label>作用范围<select data-wm="scope"><option value="photo">每张图片</option><option value="canvas">整张返图</option></select></label>
          <label>混合方式<select data-wm="mode"><option value="soft-light">柔光</option><option value="multiply">正片叠底</option><option value="screen">滤色</option><option value="overlay">叠加</option><option value="source-over">正常</option></select></label>
          <label>纹理适配<select data-wm="fit"><option value="cover">填满区域</option><option value="contain">完整显示</option></select></label>
          <label>透明度<input data-wm="opacity" type="range" min="0" max="100" value="35"></label>
          <label>缩放<input data-wm="zoom" type="range" min="20" max="300" value="100"></label>
          <label>旋转<input data-wm="rotate" type="range" min="-180" max="180" value="0"></label>
          <label>左右<input data-wm="x" type="range" min="-100" max="100" value="0"></label>
          <label>上下<input data-wm="y" type="range" min="-100" max="100" value="0"></label>
        </div>
        <p class="note">素材来源：小红书 @春雨楼雪</p>
      </fieldset>`;
    modal.querySelector('#export-help').before(picker);
    const control = name => picker.querySelector('[data-wm="' + name + '"]');
    const enabled = control('enabled');
    const panel = picker.querySelector('fieldset');
    const preview = picker.querySelector('canvas');
    const grid = picker.querySelector('.wm-grid');
    const status = control('status');
    let selected = 0;
    let picture = null;
    let request = 0;
    let frame = 0;

    function snapshot() {
      if (!enabled.checked) return null;
      if (!picture) throw new Error(status.textContent || '请等待水印载入');
      const image = picture;
      const scope = control('scope').value;
      const mode = control('mode').value;
      const fit = control('fit').value;
      const opacity = Number(control('opacity').value) / 100;
      const zoom = Number(control('zoom').value) / 100;
      const angle = Number(control('rotate').value) * Math.PI / 180;
      const offsetX = Number(control('x').value) / 100;
      const offsetY = Number(control('y').value) / 100;
      function paint(ctx, x, y, w, h) {
        if (w <= 0 || h <= 0 || opacity === 0) return;
        const scale = (fit === 'contain' ? Math.min : Math.max)(w / image.naturalWidth, h / image.naturalHeight) * zoom;
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        ctx.globalAlpha = opacity;
        ctx.globalCompositeOperation = mode;
        ctx.translate(x + w * (.5 + offsetX), y + h * (.5 + offsetY));
        ctx.rotate(angle);
        ctx.drawImage(image, -width / 2, -height / 2, width, height);
        ctx.restore();
      }
      return {scope, paint};
    }

    function redraw() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!panel.hidden) render(preview, 480, picture ? snapshot() : null);
      });
    }

    async function select(index) {
      selected = index;
      picture = null;
      const token = ++request;
      status.textContent = '正在载入水印…';
      redraw();
      try {
        const items = await loadCatalog();
        if (token !== request) return;
        if (!grid.children.length) {
          items.forEach((item, i) => {
            const button = document.createElement('button');
            button.type = 'button';
            const thumb = new Image();
            thumb.src = item.thumb;
            thumb.alt = '';
            button.append(thumb, item.name);
            button.onclick = () => select(i);
            grid.append(button);
          });
        }
        Array.from(grid.children).forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
        const item = items[index];
        control('mode').value = item.mode;
        control('opacity').value = Math.round(item.opacity * 100);
        const image = new Image();
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = () => reject(new Error('水印图片载入失败，请重新选择'));
          image.src = item.full;
        });
        if (token !== request) return;
        picture = image;
        status.textContent = item.name;
        redraw();
      } catch (error) {
        if (token === request) status.textContent = error.message;
      }
    }

    const result = modal.querySelector('#result');
    const invalidateResult = () => { result.hidden = true; };
    enabled.onchange = () => {
      panel.hidden = !enabled.checked;
      enabled.setAttribute('aria-expanded', String(enabled.checked));
      invalidateResult();
      if (enabled.checked && !picture) select(selected);
      else redraw();
    };
    panel.addEventListener('input', () => { invalidateResult(); redraw(); });
    grid.addEventListener('click', invalidateResult);
    return {
      snapshot,
      refresh: redraw,
      setBusy(busy) {
        enabled.disabled = busy;
        panel.disabled = busy;
      }
    };
  }

  window.GuExportWatermark = {create};
})();
