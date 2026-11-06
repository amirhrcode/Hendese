// Utility to generate and download a 100% self-contained, zero-server portable `index.html`
// that works when opened directly via `file://` (double-clicking index.html) on Windows, Android, macOS, or Linux,
// and automatically uses `./pdfjs/pdf.min.mjs` if placed in the project folder.

export function downloadStandaloneIndexHtml(): void {
  const htmlContent = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
  <title>ترسیم هندسه — طراح و توسعه‌دهنده: امیرحسین رضایی</title>
  <style>
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
      height: 54px;
      background: #FFFFFF;
      border-bottom: 1px solid #E2E8F0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 14px;
      gap: 10px;
      flex-shrink: 0;
    }
    .brand { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 15px; }
    .brand-badge {
      width: 30px; height: 30px; border-radius: 8px; background: #0F172A; color: #38BDF8;
      display: flex; align-items: center; justify-content: center; font-weight: bold;
    }
    .tabs { display: flex; gap: 6px; }
    .btn {
      border: 1px solid #CBD5E1;
      background: #FFFFFF;
      color: #1E293B;
      padding: 6px 11px;
      border-radius: 8px;
      font-size: 12px;
      font-family: inherit;
      font-weight: 600;
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
    aside {
      width: 250px;
      background: #FFFFFF;
      border-left: 1px solid #E2E8F0;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow-y: auto;
      transition: width 0.2s ease, padding 0.2s ease;
    }
    aside.collapsed { width: 0; padding: 0; border-left: none; overflow: hidden; }
    .main-stage { flex: 1; display: flex; flex-direction: column; min-width: 0; position: relative; }
    .toolbar {
      background: #FFFFFF;
      border-bottom: 1px solid #E2E8F0;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      flex-shrink: 0;
    }
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
    canvas { display: block; width: 100%; height: 100%; cursor: crosshair; touch-action: none; }
    .swatch {
      width: 20px; height: 20px; border-radius: 50%; border: 2px solid transparent; cursor: pointer;
    }
    .swatch.active { border-color: #0F172A; transform: scale(1.15); }
    .status-bar {
      position: absolute; bottom: 10px; left: 12px;
      background: rgba(255,255,255,0.95); border: 1px solid #CBD5E1;
      padding: 5px 10px; border-radius: 8px; font-size: 11px; color: #334155;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-badge">ت</div>
      <span>ترسیم هندسه — طراح و توسعه‌دهنده: امیرحسین رضایی</span>
      <button class="btn" id="toggleSidebarBtn">☰ پنل ابزار</button>
    </div>
    <div class="tabs">
      <button class="btn active" id="tabBoardBtn">تخته سفید و ترسیم هندسی</button>
      <button class="btn" id="tabPdfBtn">باز کردن فایل PDF</button>
      <button class="btn dark" id="fullscreenBtn">⛶ تمام‌صفحه</button>
    </div>
  </header>
  <div class="workspace">
    <aside id="sidebar">
      <div style="font-size:12px;font-weight:700;color:#0F172A;">ابزارهای سریع ترسیم</div>
      <button class="btn" data-tool="select">↖ انتخاب و جابه‌جایی</button>
      <button class="btn active" data-tool="pen">✎ قلم آزاد (تخته سفید)</button>
      <button class="btn" data-tool="segment">╱ پاره‌خط با اندازه</button>
      <button class="btn" data-tool="line">↔ خط دوطرفه</button>
      <button class="btn" data-tool="circle">◯ دایره و پرگار</button>
      <button class="btn" data-tool="rect">▭ مستطیل / مربع</button>
      <button class="btn" data-tool="triangle">△ مثلث</button>
      <button class="btn" data-tool="bisector">┼ عمودمنصف پاره‌خط</button>
      <button class="btn" data-tool="eraser">⌫ پاک‌کن</button>
      <hr style="border:none;border-top:1px solid #E2E8F0;margin:4px 0;" />
      <div style="font-size:12px;font-weight:700;color:#0F172A;">عملیات روی اشکال</div>
      <button class="btn" id="copyBtn">⧉ کپی شکل انتخاب‌شده</button>
      <button class="btn" id="undoBtn">↶ بازگشت (Undo)</button>
      <button class="btn danger" id="deleteBtn">🗑 حذف انتخاب‌شده</button>
      <button class="btn danger" id="clearBtn">پاک کردن کل تخته</button>
      <hr style="border:none;border-top:1px solid #E2E8F0;margin:4px 0;" />
      <div style="font-size:12px;font-weight:700;color:#0F172A;">نوع صفحه</div>
      <div style="display:flex;gap:4px;">
        <button class="btn" id="bgWhiteBtn">سفید</button>
        <button class="btn active" id="bgGridBtn">شطرنجی</button>
        <button class="btn" id="bgDotsBtn">نقطه‌ای</button>
      </div>
    </aside>
    <div class="main-stage" id="boardStage">
      <div class="toolbar">
        <span style="font-size:12px;font-weight:600;color:#475569;">رنگ:</span>
        <button class="swatch active" data-color="#0284C7" style="background:#0284C7"></button>
        <button class="swatch" data-color="#0F172A" style="background:#0F172A"></button>
        <button class="swatch" data-color="#D97706" style="background:#D97706"></button>
        <button class="swatch" data-color="#059669" style="background:#059669"></button>
        <button class="swatch" data-color="#DC2626" style="background:#DC2626"></button>
        <span style="font-size:12px;font-weight:600;color:#475569;margin-right:8px;">ضخامت:</span>
        <input type="range" id="strokeWidth" min="1" max="10" value="3" style="width:80px;" />
        <button class="btn" id="exportPngBtn">دانلود تصویر PNG</button>
      </div>
      <div class="canvas-wrap grid" id="canvasWrap">
        <canvas id="boardCanvas"></canvas>
        <div class="status-bar" id="statusBar">ابزار فعال: قلم آزاد — روی صفحه بکشید</div>
      </div>
    </div>
    <div class="main-stage" id="pdfStage" style="display:none;">
      <div class="toolbar">
        <input type="file" id="pdfInput" accept="application/pdf,.pdf" />
        <span style="font-size:12px;color:#475569;">هر فایل PDF را انتخاب کنید تا بلافاصله به صورت محلی نمایش داده شود.</span>
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
    let currentTool = 'pen';
    let currentColor = '#0284C7';
    let strokeW = 3;
    let isDown = false;
    let startPt = null;
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

    function drawShape(s, isSelected) {
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = s.width || 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (isSelected) {
        ctx.shadowColor = '#0284C7';
        ctx.shadowBlur = 8;
      }
      if (s.type === 'pen' && s.pts.length > 1) {
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
        [p1, p2].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2); ctx.fill(); });
        const cm = (dist(p1, p2) / 38).toFixed(1) + ' cm';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(cm, (p1.x + p2.x)/2 + 6, (p1.y + p2.y)/2 - 6);
      } else if (s.type === 'circle') {
        const [c, rPt] = s.pts;
        const r = dist(c, rPt);
        ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(c.x, c.y, 4, 0, Math.PI*2); ctx.fill();
        ctx.font = 'bold 12px monospace';
        ctx.fillText('r=' + (r/38).toFixed(1) + 'cm', c.x + 8, c.y - 8);
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
      startPt = pt;
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
      if (currentTool === 'pen') {
        activeStroke = { type: 'pen', color: currentColor, width: strokeW, pts: [pt] };
      } else {
        activeStroke = { type: currentTool, color: currentColor, width: strokeW, pts: [pt, pt] };
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
      if (currentTool === 'pen') activeStroke.pts.push(pt);
      else activeStroke.pts[1] = pt;
      draw();
    });

    window.addEventListener('pointerup', () => {
      isDown = false;
      if (activeStroke) {
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
      });
    });

    document.getElementById('strokeWidth').addEventListener('input', e => strokeW = +e.target.value);
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
    document.getElementById('toggleSidebarBtn').onclick = () => {
      document.getElementById('sidebar').classList.toggle('collapsed');
      setTimeout(resize, 220);
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
      a.download = 'hendese-whiteboard.png';
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
