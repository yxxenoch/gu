(()=>{'use strict';document.body.classList.add('gu-layout-polished');const style=document.createElement('style');style.textContent=`
.gu-layout-polished{--gu-panel-gap:18px}.gu-layout-polished button,.gu-layout-polished select,.gu-layout-polished input{font:inherit}.gu-layout-polished button:focus-visible,.gu-layout-polished summary:focus-visible{outline:2px solid #87a494;outline-offset:3px}.gu-layout-polished .topbar,.gu-layout-polished .top{gap:12px}.gu-layout-polished .brand{min-width:0}.gu-layout-polished .brand h1{white-space:nowrap}.gu-layout-polished .top-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}.gu-layout-polished .tabs{padding:6px 12px;gap:4px}.gu-layout-polished .tabs button{min-height:43px;border-radius:9px;white-space:nowrap}.gu-layout-polished .panel{padding:20px}.gu-layout-polished .panel>.section{padding:16px;margin:0 0 16px;border:1px solid var(--line,#dce1da);border-radius:15px;background:var(--white,#fffefa)}.gu-layout-polished .section-heading{gap:10px;margin-bottom:14px;align-items:baseline;flex-wrap:wrap}.gu-layout-polished .section-heading h3{margin:0;font-size:14px}.gu-layout-polished .section-heading small{font-size:10px;line-height:1.6}.gu-layout-polished .field{margin-bottom:15px}.gu-layout-polished .field>span{font-size:12px;line-height:1.6}.gu-layout-polished .row{gap:12px;flex-wrap:wrap}.gu-layout-polished .hint,.gu-layout-polished .note{line-height:1.75;font-size:11px;overflow-wrap:anywhere}.gu-layout-polished input:not([type=range]):not([type=checkbox]):not([type=color]):not([type=file]),.gu-layout-polished select{min-height:43px;border-radius:10px;max-width:100%}.gu-layout-polished .upload{padding:20px 12px;border-radius:14px;text-align:center}.gu-layout-polished .image-list{display:flex;overflow-x:auto;gap:9px;padding:5px 2px 12px;scroll-snap-type:x proximity}.gu-layout-polished .image-list>.photo-item{flex:0 0 76px;scroll-snap-align:start;min-width:0}.gu-layout-polished .preview-footer{flex-wrap:wrap;align-items:center}.gu-layout-polished .preview-tools{margin-left:auto;flex-wrap:wrap}.gu-layout-polished .preview-footer>p{flex-basis:100%;margin:0!important}.gu-layout-polished .dialog{border-radius:20px;padding:22px;max-height:90dvh;overflow-y:auto}.gu-layout-polished .dialog-head{gap:12px}.gu-layout-polished .dialog-head h2{font-size:18px}.gu-layout-polished .ux-project-menu>.ux-menu-body{box-shadow:0 12px 35px #152c2224}.gu-layout-polished .group{border-radius:14px}.gu-layout-polished.gu-preview-dark .section{background:#15181e;border-color:#353a42}.gu-layout-polished.gu-preview-dark .hint,.gu-layout-polished.gu-preview-dark .note{color:#aeb3bd}
@media(min-width:1050px){.gu-layout-polished .workbench{grid-template-columns:minmax(0,1fr) 400px;max-width:1600px}.gu-layout-polished .preview-column{padding:26px 30px}.gu-layout-polished .panel{padding:18px}.gu-layout-polished .preview-heading h2{font-size:22px}}
@media(max-width:700px){.gu-layout-polished .topbar,.gu-layout-polished .top{padding-left:14px!important;padding-right:14px!important}.gu-layout-polished .brand h1{font-size:18px!important;letter-spacing:2px}.gu-layout-polished .brand small,.gu-layout-polished .brand .eyebrow{font-size:8px!important;letter-spacing:1px}.gu-layout-polished .brand-mark{width:32px;height:32px;font-size:24px}.gu-layout-polished .top-actions .primary{padding:9px 12px;font-size:12px;min-height:40px}.gu-layout-polished .preview-column{padding:12px 14px!important}.gu-layout-polished .stage-wrap{padding:13px;border-radius:16px}.gu-layout-polished .tabs{padding:5px 10px;gap:3px}.gu-layout-polished .tabs button{font-size:12px;padding:8px 5px;min-height:42px}.gu-layout-polished .panel{padding:14px 12px 26px}.gu-layout-polished .panel>.section{padding:14px 12px;margin-bottom:12px;border-radius:13px}.gu-layout-polished .preview-footer{gap:9px;padding-top:10px}.gu-layout-polished #preview-hint{font-size:10px;flex:1;min-width:100px}.gu-layout-polished .preview-tools{gap:5px}.gu-layout-polished .preview-tools .button{min-height:36px;padding:5px 9px}.gu-layout-polished .dialog{padding:18px 14px;border-radius:19px}.gu-layout-polished .grid2{gap:10px}.gu-layout-polished .ux-global-group{margin:10px 12px}.gu-layout-polished .gu-auto-float{max-width:calc(100vw - 28px)}.gu-layout-polished .text-settings>summary{line-height:1.6;padding-top:12px;padding-bottom:12px}}

/* v1.11 · tactile mobile controls / compact preview */
.gu-layout-polished input[type=range]{accent-color:var(--green,#416651);touch-action:pan-y}
.gu-layout-polished input[type=range]::-webkit-slider-thumb{cursor:grab}
.gu-layout-polished .upload:focus-within{outline:2px solid #9eaf99;outline-offset:3px}
.gu-layout-polished .tabs .tab.active{font-weight:750}
.gu-layout-polished .panel>.section{box-shadow:0 3px 14px #26422d06}
.gu-layout-polished.gu-preview-dark .panel>.section{box-shadow:none}
@media(max-width:700px){
 .gu-layout-polished .topbar{height:56px!important;min-height:56px!important;padding-top:0!important;padding-bottom:0!important}
 .gu-layout-polished .top-actions{gap:5px}
 .gu-layout-polished .top-actions .button{min-height:40px;padding:7px 11px;font-size:12px}
 .gu-layout-polished .stage-wrap{padding:8px!important;border-radius:13px}
 body.mobile-workspace.gu-layout-polished .stage-wrap{height:clamp(245px,49dvh,465px)!important;min-height:0!important}
 body.mobile-workspace.gu-layout-polished .preview-column{padding:8px 12px!important}
 .gu-layout-polished .tabs{gap:2px;scrollbar-width:none;overflow-x:auto}
 .gu-layout-polished .tabs::-webkit-scrollbar{display:none}
 .gu-layout-polished .tabs .tab{min-height:44px;white-space:nowrap}
 .gu-layout-polished .panel{padding:10px 11px calc(42px + env(safe-area-inset-bottom))!important}
 .gu-layout-polished .panel>.section{padding:13px 12px;margin-bottom:11px}
 .gu-layout-polished .panel input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=color]):not([type=file]),.gu-layout-polished .panel textarea,.gu-layout-polished .panel select{font-size:16px;max-width:100%}
 .gu-layout-polished .preview-footer{padding-top:6px}
 .gu-layout-polished .preview-tools{gap:4px}
 .gu-layout-polished .preview-tools .button{min-height:38px;min-width:36px}
 .gu-layout-polished .image-list{overscroll-behavior-x:contain}
 .gu-layout-polished .row>*{min-width:0}
 .gu-layout-polished .hint,.gu-layout-polished .note{font-size:11px;line-height:1.65}
}
@media(prefers-reduced-motion:reduce){.gu-layout-polished *{scroll-behavior:auto!important;transition-duration:.01ms!important}}
`;document.head.append(style)})();
