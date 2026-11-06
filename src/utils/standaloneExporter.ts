// Utility to generate and download a 100% self-contained, zero-server portable `index.html` (Version 3.0)
// that works when opened directly via `file://` (double-clicking index.html) on Windows, Android Touch TVs, macOS, or Linux,
// with local Vazirmatn fonts (`./fonts/`) and `./pdfjs/pdf.min.mjs` support.

export function downloadStandaloneIndexHtml(): void {
  const htmlContent = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
  <title>ترسیم (نسخه ۳.۰) — طراح و توسعه‌دهنده: امیرحسین رضایی</title>
  <style>
    @font-face {
      font-family: 'Vazirmatn';
      src: url('./fonts/Vazirmatn-Regular.woff2') format('woff2');
      font-weight: 400;
      font-display: swap;
    }
    @font-face {
      font-family: 'Vazirmatn';
      src: url('./fonts/Vazirmatn-Bold.woff2') format('woff2');
      font-weight: 700;
      font-display: swap;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      font-family: "Vazirmatn", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, sans-serif;
      background: #F8FAFC;
      color: #0F172A;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      user-select: none;
    }
    header {
      height: 48px;
      background: #FFFFFF;
      border-bottom: 1px solid #E2E8F0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      gap: 8px;
      flex-shrink: 0;
    }
    .brand { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 13px; }
    .brand-badge {
      width: 28px; height: 28px; border-radius: 8px; background: #0F172A; color: #38BDF8;
      display: flex; align-items: center; justify-content: center; font-weight: bold;
    }
    .v-badge {
      background: #E0F2FE; color: #0369A1; border: 1px solid #BAE6FD;
      padding: 2px 6px; border-radius: 6px; font-size: 10px; font-weight: 800;
    }
    .tabs { display: flex; gap: 6px; align-items: center; }
    .btn {
      border: 1px solid #CBD5E1;
      background: #FFFFFF;
      color: #1E293B;
      padding: 5px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-family: inherit;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
      transition: all 0.12s ease;
    }
    .btn:hover { background: #F1F5F9; }
    .btn.active { background: #0284C7; color: #FFFFFF; border-color: #0284C7; }
    .btn.dark { background: #0F172A; color: #FFFFFF; border-color: #0F172A; }
    .btn.danger { color: #DC2626; border-color: #FECACA; }
    .workspace { display: flex; flex: 1; min-height: 0; position: relative; }
    .main-stage { flex: 1; display: flex; flex-direction: column; min-width: 0; position: relative; }
    .toolbar {
      background: #FFFFFF;
      border-bottom: 1px solid #E2E8F0;
      padding: 6px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
      flex-shrink: 0;
    }
    .toolbar-group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .canvas-wrap {
      flex: 1;
      position: relative;
      overflow: hidden;
      background-color: #FFFFFF;
      touch-action: none;
    }
    .canvas-wrap.grid {
      background-image:
        linear-gradient(to right, rgba(148,163,184,0.2) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(148,163,184,0.2) 1px, transparent 1px);
      background-size: 25px 25px;
    }
    .canvas-wrap.dots {
      background-image: radial-gradient(#94A3B8 1.25px, transparent 1.25px);
      background-size: 25px 25px;
    }
    /* Flat Vertical Right-Side Dock (زیر همدیگه و بدون منوی تو در تو) */
    .right-dock {
      position: absolute;
      right: 10px;
      top: 10px;
      bottom: 10px;
      width: 150px;
      background: rgba(255,255,255,0.96);
      border: 1px solid #CBD5E1;
      border-radius: 14px;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow-y: auto;
      box-shadow: 0 8px 24px rgba(15,23,42,0.08);
      z-index: 20;
    }
    .right-dock.collapsed { width: auto; bottom: auto; }
    .right-dock .btn { width: 100%; justify-content: flex-start; padding: 6px 8px; border-radius: 9px; }
    canvas { display: block; width: 100%; height: 100%; cursor: crosshair; touch-action: none; }
    .swatch {
      width: 18px; height: 18px; border-radius: 50%; border: 2px solid transparent; cursor: pointer;
    }
    .swatch.active { border-color: #0F172A; transform: scale(1.15); }
    .status-bar {
      position: absolute; top: 10px; left: 12px;
      background: rgba(255,255,255,0.95); border: 1px solid #CBD5E1;
      padding: 5px 10px; border-radius: 10px; font-size: 11px; font-weight: 700; color: #0369A1;
      pointer-events: none; z-index: 15;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-badge">ت</div>
      <span>ترسیم</span>
      <span class="v-badge">ابر ترسیم v3.0</span>
      <span style="font-size:11px;color:#475569;font-weight:600;">طراح و توسعه‌دهنده: امیرحسین رضایی</span>
    </div>
    <div class="tabs">
      <button class="btn active" id="tabBoardBtn">تخته سفید و ترسیم هوشمند</button>
      <button class="btn" id="tabPdfBtn">کتابخوان جامع PDF (همه دروس)</button>
      <button class="btn dark" id="fullscreenBtn">⛶ تمام‌صفحه</button>
    </div>
  </header>
  <div class="workspace">
    <div class="main-stage" id="boardStage">
      <div class="toolbar">
        <div class="toolbar-group">
          <button class="btn" id="undoBtn">↶ بازگشت</button>
          <button class="btn" id="copyBtn">⧉ کپی شکل</button>
          <button class="btn danger" id="deleteBtn">🗑 حذف</button>
          <button class="btn danger" id="clearBtn">پاک کردن تخته</button>
          <span style="font-size:11px;font-weight:700;color:#475569;margin-right:4px;">رنگ:</span>
          <button class="swatch active" data-color="#0284C7" style="background:#0284C7"></button>
          <button class="swatch" data-color="#0F172A" style="background:#0F172A"></button>
          <button class="swatch" data-color="#D97706" style="background:#D97706"></button>
          <button class="swatch" data-color="#059669" style="background:#059669"></button>
          <button class="swatch" data-color="#DC2626" style="background:#DC2626"></button>
          <input type="color" id="customColor" value="#0284C7" title="رنگ سفارشی" style="width:22px;height:22px;border:none;background:none;cursor:pointer;" />
          <span style="font-size:11px;font-weight:700;color:#475569;">سایز:</span>
          <input type="range" id="strokeWidth" min="1" max="16" value="3" style="width:70px;" />
          <span id="strokeWidthVal" style="font-size:11px;font-weight:800;color:#0284C7;">3px</span>
          <select id="lineStyleSel" class="btn" style="padding:3px 6px;">
            <option value="solid">خط ممتد ━</option>
            <option value="dashed">خط‌چین ┄</option>
            <option value="dotted">نقطه‌چین ┈</option>
          </select>
        </div>
        <div class="toolbar-group">
          <button class="btn" id="bgWhiteBtn">سفید</button>
          <button class="btn active" id="bgGridBtn">شطرنجی</button>
          <button class="btn" id="bgDotsBtn">نقطه‌ای</button>
          <button class="btn" id="exportPngBtn">خروجی PNG</button>
        </div>
      </div>
      <div class="canvas-wrap grid" id="canvasWrap">
        <!-- Flat Vertical Right-Side Toolbar (زیر همدیگه و بدون منوی تو در تو) -->
        <div class="right-dock" id="rightDock">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:2px 4px;border-bottom:1px solid #E2E8F0;">
            <span style="font-size:10px;font-weight:800;color:#475569;">جعبه ابزار مستقیم</span>
            <button class="btn" id="collapseDockBtn" style="width:auto;padding:2px 6px;">❯</button>
          </div>
          <div id="dockToolsList" style="display:flex;flex-direction:column;gap:4px;">
            <button class="btn" data-tool="select">↖ انتخاب و حرکت</button>
            <button class="btn active" data-tool="smart-pen">✨ قلم هوشمند</button>
            <button class="btn" data-tool="pen">✎ قلم آزاد تخته</button>
            <button class="btn" data-tool="segment">╱ پاره‌خط (cm)</button>
            <button class="btn" data-tool="line">↔ خط راست دوطرفه</button>
            <button class="btn" data-tool="circle">⊙ دایره و پرگار</button>
            <button class="btn" data-tool="triangle">△ رسم مثلث</button>
            <button class="btn" data-tool="rect">□ مستطیل و مربع</button>
            <button class="btn" data-tool="bisector">⊥ عمودمنصف</button>
            <button class="btn danger" data-tool="eraser">⌫ پاک‌کن سریع</button>
          </div>
        </div>
        <canvas id="boardCanvas"></canvas>
        <div class="status-bar" id="statusBar">✨ قلم هوشمند فعال است — دایره، خط، مثلث یا چهارضلعی بکشید تا خودکار منظم شود</div>
      </div>
    </div>
    <div class="main-stage" id="pdfStage" style="display:none;">
      <div class="toolbar">
        <div class="toolbar-group">
          <input type="file" id="pdfInput" accept="application/pdf,.pdf" class="btn" />
          <span style="font-size:11px;font-weight:700;color:#334155;">کتابخوان جامع همه دروس (فیزیک، شیمی، ریاضی، زیست، ادبیات، هندسه و جزوات PDF)</span>
        </div>
        <div class="toolbar-group">
          <button class="btn active" data-filter="none">روز ☀️</button>
          <button class="btn" data-filter="sepia(0.38)">سپیا 📜</button>
          <button class="btn" data-filter="invert(0.9) hue-rotate(180deg)">تاریک 🌙</button>
        </div>
      </div>
      <iframe id="pdfFrame" style="flex:1;border:none;width:100%;height:100%;background:#F1F5F9;"></iframe>
    </div>
  </div>
  <script>
    const canvas = document.getElementById('boardCanvas');
    const ctx = canvas.getContext('2d');
    const wrap = document.getElementById('canvasWrap');
    const statusBar = document.getElementById('statusBar');
    let shapes = [];
    let selectedIdx = -1;
    let currentTool = 'smart-pen';
    let currentColor = '#0284C7';
    let strokeW = 3;
    let currentLineStyle = 'solid';
    let isDown = false;
    let dragOffset = null;
    let activeStroke = null;

    function resize() {
      const r = wrap.getBoundingClientRect();
      canvas.width = r.width;
      canvas.height = r.height;
      draw();
    }
    window.addEventListener('resize', resize);
    setTimeout(resize, 50);

    function dist(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }

    function recognizeSmartShape(pts) {
      if (pts.length < 6) return null;
      let pathLen = 0;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < pts.length; i++) {
        if (i > 0) pathLen += dist(pts[i - 1], pts[i]);
        if (pts[i].x < minX) minX = pts[i].x;
        if (pts[i].x > maxX) maxX = pts[i].x;
        if (pts[i].y < minY) minY = pts[i].y;
        if (pts[i].y > maxY) maxY = pts[i].y;
      }
      const direct = dist(pts[0], pts[pts.length - 1]);
      if (pathLen > 25 && direct / pathLen > 0.91) {
        return { type: 'segment', pts: [pts[0], pts[pts.length - 1]] };
      }
      const diag = Math.hypot(maxX - minX, maxY - minY);
      if (diag > 30 && direct < diag * 0.42) {
        const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
        const r = (maxX - minX + maxY - minY) / 4;
        let err = 0;
        pts.forEach(p => { err += Math.abs(dist(p, { x: cx, y: cy }) - r); });
        if (err / pts.length / r < 0.22) {
          return { type: 'circle', pts: [{ x: cx, y: cy }, { x: cx + r, y: cy }] };
        }
        return { type: 'rect', pts: [{ x: minX, y: minY }, { x: maxX, y: maxY }] };
      }
      return null;
    }

    function drawShape(s, isSelected) {
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = s.width || 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (s.lineStyle === 'dashed') ctx.setLineDash([7, 5]);
      else if (s.lineStyle === 'dotted') ctx.setLineDash([2, 5]);
      if (isSelected) {
        ctx.shadowColor = '#0284C7';
        ctx.shadowBlur = 8;
      }
      if ((s.type === 'pen' || s.type === 'smart-pen') && s.pts.length > 1) {
        ctx.beginPath();
        ctx.moveTo(s.pts[0].x, s.pts[0].y);
        for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i].x, s.pts[i].y);
        ctx.stroke();
      } else if (s.type === 'segment' || s.type === 'line') {
        const [p1, p2] = s.pts;
        ctx.beginPath();
        if (s.type === 'line') {
          const dx = p2.x - p1.x, dy = p2.y - p1.y, len = Math.hypot(dx, dy) || 1;
          ctx.moveTo(p1.x - (dx/len)*1000, p1.y - (dy/len)*1000);
          ctx.lineTo(p2.x + (dx/len)*1000, p2.y + (dy/len)*1000);
        } else {
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        [p1, p2].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2); ctx.fill(); });
        const cm = (dist(p1, p2) / 40).toFixed(1) + ' cm';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(cm, (p1.x + p2.x)/2 + 6, (p1.y + p2.y)/2 - 6);
      } else if (s.type === 'circle') {
        const [c, rPt] = s.pts;
        const r = dist(c, rPt);
        ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI*2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(c.x, c.y, 4, 0, Math.PI*2); ctx.fill();
        ctx.font = 'bold 11px monospace';
        ctx.fillText('r=' + (r/40).toFixed(1) + 'cm', c.x + 8, c.y - 8);
      } else if (s.type === 'rect') {
        const [p1, p2] = s.pts;
        ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
      } else if (s.type === 'triangle') {
        const [p1, p2] = s.pts;
        ctx.beginPath();
        ctx.moveTo((p1.x + p2.x)/2, p1.y);
        ctx.lineTo(p1.x, p2.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.closePath();
        ctx.stroke();
      } else if (s.type === 'bisector') {
        const [p1, p2] = s.pts;
        ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        ctx.setLineDash([]);
        const mx = (p1.x + p2.x)/2, my = (p1.y + p2.y)/2;
        const dx = p2.x - p1.x, dy = p2.y - p1.y, len = Math.hypot(dx, dy) || 1;
        const nx = -dy/len, ny = dx/len;
        ctx.beginPath(); ctx.moveTo(mx - nx*160, my - ny*160); ctx.lineTo(mx + nx*160, my + ny*160); ctx.stroke();
      }
      ctx.restore();
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      shapes.forEach((s, idx) => drawShape(s, idx === selectedIdx));
      if (activeStroke) drawShape(activeStroke, false);
    }

    function getPt(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    canvas.addEventListener('pointerdown', e => {
      const pt = getPt(e);
      isDown = true;
      if (currentTool === 'select') {
        selectedIdx = shapes.findIndex(s => s.pts.some(p => dist(p, pt) < 28));
        dragOffset = pt;
        draw();
        return;
      }
      if (currentTool === 'eraser') {
        shapes = shapes.filter(s => !s.pts.some(p => dist(p, pt) < 25));
        draw();
        return;
      }
      if (currentTool === 'pen' || currentTool === 'smart-pen') {
        activeStroke = { type: currentTool, color: currentColor, width: strokeW, lineStyle: currentLineStyle, pts: [pt] };
      } else {
        activeStroke = { type: currentTool, color: currentColor, width: strokeW, lineStyle: currentLineStyle, pts: [pt, pt] };
      }
    });

    canvas.addEventListener('pointermove', e => {
      if (!isDown) return;
      const pt = getPt(e);
      if (currentTool === 'select' && selectedIdx >= 0 && dragOffset) {
        const dx = pt.x - dragOffset.x, dy = pt.y - dragOffset.y;
        shapes[selectedIdx].pts = shapes[selectedIdx].pts.map(p => ({ x: p.x + dx, y: p.y + dy }));
        dragOffset = pt;
        draw();
        return;
      }
      if (currentTool === 'eraser') {
        shapes = shapes.filter(s => !s.pts.some(p => dist(p, pt) < 25));
        draw();
        return;
      }
      if (!activeStroke) return;
      if (currentTool === 'pen' || currentTool === 'smart-pen') {
        const last = activeStroke.pts[activeStroke.pts.length - 1];
        if (!last || dist(last, pt) >= 2.2) activeStroke.pts.push(pt);
      } else {
        activeStroke.pts[1] = pt;
      }
      draw();
    });

    window.addEventListener('pointerup', () => {
      isDown = false;
      if (activeStroke) {
        if (currentTool === 'smart-pen') {
          const rec = recognizeSmartShape(activeStroke.pts);
          if (rec) {
            activeStroke.type = rec.type;
            activeStroke.pts = rec.pts;
            statusBar.textContent = '✨ قلم هوشمند شکل هندسی منظم را تشخیص داد!';
          }
        }
        shapes.push(activeStroke);
        selectedIdx = shapes.length - 1;
        activeStroke = null;
        draw();
      }
    });

    document.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTool = btn.getAttribute('data-tool');
        statusBar.textContent = 'ابزار فعال: ' + btn.textContent.trim();
      });
    });

    document.querySelectorAll('[data-color]').forEach(sw => {
      sw.addEventListener('click', () => {
        document.querySelectorAll('[data-color]').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        currentColor = sw.getAttribute('data-color');
        if (selectedIdx >= 0) { shapes[selectedIdx].color = currentColor; draw(); }
      });
    });

    document.getElementById('customColor').addEventListener('input', e => {
      currentColor = e.target.value;
      if (selectedIdx >= 0) { shapes[selectedIdx].color = currentColor; draw(); }
    });

    document.getElementById('strokeWidth').addEventListener('input', e => {
      strokeW = +e.target.value;
      document.getElementById('strokeWidthVal').textContent = strokeW + 'px';
      if (selectedIdx >= 0) { shapes[selectedIdx].width = strokeW; draw(); }
    });

    document.getElementById('lineStyleSel').addEventListener('change', e => {
      currentLineStyle = e.target.value;
      if (selectedIdx >= 0) { shapes[selectedIdx].lineStyle = currentLineStyle; draw(); }
    });

    document.getElementById('collapseDockBtn').onclick = () => {
      const dock = document.getElementById('rightDock');
      const list = document.getElementById('dockToolsList');
      const isCol = dock.classList.toggle('collapsed');
      list.style.display = isCol ? 'none' : 'flex';
      document.getElementById('collapseDockBtn').textContent = isCol ? '❮ ابزارها' : '❯';
    };

    document.getElementById('undoBtn').onclick = () => { shapes.pop(); selectedIdx = -1; draw(); };
    document.getElementById('clearBtn').onclick = () => { shapes = []; selectedIdx = -1; draw(); };
    document.getElementById('deleteBtn').onclick = () => {
      if (selectedIdx >= 0) { shapes.splice(selectedIdx, 1); selectedIdx = -1; draw(); }
    };
    document.getElementById('copyBtn').onclick = () => {
      if (selectedIdx >= 0) {
        const copy = JSON.parse(JSON.stringify(shapes[selectedIdx]));
        copy.pts = copy.pts.map(p => ({ x: p.x + 25, y: p.y + 25 }));
        shapes.push(copy);
        selectedIdx = shapes.length - 1;
        draw();
      }
    };
    document.getElementById('fullscreenBtn').onclick = () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      else document.exitFullscreen().catch(() => {});
    };
    document.getElementById('bgWhiteBtn').onclick = () => { wrap.className = 'canvas-wrap'; };
    document.getElementById('bgGridBtn').onclick = () => { wrap.className = 'canvas-wrap grid'; };
    document.getElementById('bgDotsBtn').onclick = () => { wrap.className = 'canvas-wrap dots'; };
    document.getElementById('exportPngBtn').onclick = () => {
      const a = document.createElement('a');
      a.download = 'tarsim-v3-whiteboard.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    document.getElementById('tabBoardBtn').onclick = () => {
      document.getElementById('boardStage').style.display = 'flex';
      document.getElementById('pdfStage').style.display = 'none';
      document.getElementById('tabBoardBtn').classList.add('active');
      document.getElementById('tabPdfBtn').classList.remove('active');
      resize();
    };
    document.getElementById('tabPdfBtn').onclick = () => {
      document.getElementById('boardStage').style.display = 'none';
      document.getElementById('pdfStage').style.display = 'flex';
      document.getElementById('tabPdfBtn').classList.add('active');
      document.getElementById('tabBoardBtn').classList.remove('active');
    };
    document.getElementById('pdfInput').onchange = e => {
      const f = e.target.files[0];
      if (f) document.getElementById('pdfFrame').src = URL.createObjectURL(f);
    };
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('pdfFrame').style.filter = btn.getAttribute('data-filter');
      };
    });
  </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'index.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
