/* =========================================================
   格物 MathLab — canvas function plotter
   ========================================================= */
(function (root) {
  "use strict";

  const TAU = Math.PI * 2;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function niceStep(rawStep) {
    if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
    const exponent = Math.floor(Math.log10(rawStep));
    const fraction = rawStep / Math.pow(10, exponent);
    let nice;
    if (fraction <= 1) nice = 1;
    else if (fraction <= 2) nice = 2;
    else if (fraction <= 5) nice = 5;
    else nice = 10;
    return nice * Math.pow(10, exponent);
  }

  function formatTick(value, step) {
    if (!Number.isFinite(value)) return "";
    if (Math.abs(value) < Math.max(1e-12, step * 1e-6)) return "0";
    const decimals = Math.max(0, Math.min(8, -Math.floor(Math.log10(step)) + (step < 1 ? 1 : 0)));
    if (Math.abs(value) >= 1e6 || Math.abs(value) < 1e-4) {
      return value.toExponential(1).replace("e", "e");
    }
    let text = value.toFixed(decimals);
    if (text.includes(".")) text = text.replace(/\.?0+$/, "");
    return text;
  }

  function formatValue(value, sig = 5) {
    if (value === null || value === undefined || !Number.isFinite(value)) return "—";
    if (Math.abs(value) < 1e-12) return "0";
    if (Math.abs(value) >= 1e7 || Math.abs(value) < 1e-4) return value.toExponential(3);
    return String(Number(value.toPrecision(sig)));
  }

  function safeColor(value, fallback) {
    return value && value.trim() ? value.trim() : fallback;
  }

  class FunctionPlotter {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.shell = canvas.parentElement;
      this.options = Object.assign({ interactive: true, showTooltip: true, padding: { left: 55, right: 22, top: 25, bottom: 38 } }, options);
      this.functions = [];
      this.xMin = -8;
      this.xMax = 8;
      this.yMin = -5;
      this.yMax = 5;
      this.autoY = true;
      this.home = { xMin: -8, xMax: 8, yMin: null, yMax: null, autoY: true };
      this.showGrid = true;
      this.showDerivative = false;
      this.showPoints = true;
      this.showLegend = options.showLegend !== false;
      this.area = null;
      this.regions = [];
      this.points = [];
      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.hover = null;
      this.traceX = null;
      this.drag = null;
      this.pointers = new Map();
      this.pinch = null;
      this.raf = null;
      this.onHover = typeof options.onHover === "function" ? options.onHover : null;
      this.onViewChange = typeof options.onViewChange === "function" ? options.onViewChange : null;
      this.disabled = false;

      if (this.options.showTooltip) this.createTooltip();
      this.bindEvents();
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.shell);
      this.resize();
    }

    createTooltip() {
      this.tooltip = document.createElement("div");
      this.tooltip.className = "plot-tooltip";
      this.tooltip.setAttribute("aria-hidden", "true");
      this.shell.appendChild(this.tooltip);
    }

    bindEvents() {
      if (!this.options.interactive) return;
      const canvas = this.canvas;

      canvas.addEventListener("pointerdown", (event) => this.onPointerDown(event));
      canvas.addEventListener("pointermove", (event) => this.onPointerMove(event));
      canvas.addEventListener("pointerup", (event) => this.onPointerUp(event));
      canvas.addEventListener("pointercancel", (event) => this.onPointerUp(event));
      canvas.addEventListener("pointerleave", (event) => this.onPointerLeave(event));
      canvas.addEventListener("wheel", (event) => this.onWheel(event), { passive: false });
      canvas.addEventListener("dblclick", () => this.fitY());
      canvas.addEventListener("keydown", (event) => this.onKeyDown(event));
      canvas.addEventListener("contextmenu", (event) => event.preventDefault());

      window.addEventListener("resize", () => this.scheduleDraw());
    }

    onPointerDown(event) {
      if (event.button !== undefined && event.button !== 0) return;
      this.canvas.focus({ preventScroll: true });
      this.pointers.set(event.pointerId, { x: event.offsetX, y: event.offsetY });
      try {
        this.canvas.setPointerCapture(event.pointerId);
      } catch (error) {
        /* ignore */
      }
      if (this.pointers.size === 1) {
        this.drag = {
          startX: event.offsetX,
          startY: event.offsetY,
          xMin: this.xMin,
          xMax: this.xMax,
          yMin: this.yMin,
          yMax: this.yMax,
          moved: false
        };
        this.canvas.style.cursor = "grabbing";
      } else if (this.pointers.size === 2) {
        const points = [...this.pointers.values()];
        this.pinch = {
          distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
          centerX: (points[0].x + points[1].x) / 2,
          centerY: (points[0].y + points[1].y) / 2,
          xMin: this.xMin,
          xMax: this.xMax,
          yMin: this.yMin,
          yMax: this.yMax
        };
        this.drag = null;
      }
      this.traceX = null;
    }

    onPointerMove(event) {
      if (this.drag && this.pointers.has(event.pointerId)) {
        this.pointers.set(event.pointerId, { x: event.offsetX, y: event.offsetY });
        const dx = event.offsetX - this.drag.startX;
        const dy = event.offsetY - this.drag.startY;
        if (Math.abs(dx) + Math.abs(dy) > 3) this.drag.moved = true;
        const plot = this.getPlotRect();
        const xSpan = this.drag.xMax - this.drag.xMin;
        const ySpan = this.drag.yMax - this.drag.yMin;
        this.xMin = this.drag.xMin - (dx / plot.width) * xSpan;
        this.xMax = this.drag.xMax - (dx / plot.width) * xSpan;
        if (!this.autoY) {
          this.yMin = this.drag.yMin + (dy / plot.height) * ySpan;
          this.yMax = this.drag.yMax + (dy / plot.height) * ySpan;
        } else {
          this.autoFitY();
        }
        this.hideTooltip();
        this.scheduleDraw();
        this.notifyViewChange();
        return;
      }

      if (this.pointers.has(event.pointerId)) {
        this.pointers.set(event.pointerId, { x: event.offsetX, y: event.offsetY });
      }

      if (this.pointers.size === 2 && this.pinch) {
        const points = [...this.pointers.values()];
        const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        if (distance > 0 && this.pinch.distance > 0) {
          const ratio = clamp(this.pinch.distance / distance, 0.6, 1.7);
          const plot = this.getPlotRect();
          const centerX = (points[0].x + points[1].x) / 2;
          const centerY = (points[0].y + points[1].y) / 2;
          const pivotX = this.pixelToX(this.pinch.centerX);
          const pivotY = this.pixelToY(this.pinch.centerY);
          const xSpan = this.pinch.xMax - this.pinch.xMin;
          const ySpan = this.pinch.yMax - this.pinch.yMin;
          const newXSpan = xSpan * ratio;
          const newYSpan = ySpan * ratio;
          const px = (centerX - plot.left) / plot.width;
          const py = (centerY - plot.top) / plot.height;
          this.xMin = pivotX - px * newXSpan;
          this.xMax = this.xMin + newXSpan;
          if (!this.autoY) {
            this.yMax = pivotY + py * newYSpan;
            this.yMin = this.yMax - newYSpan;
          } else {
            this.autoFitY();
          }
          this.hideTooltip();
          this.scheduleDraw();
          this.notifyViewChange();
        }
        return;
      }

      this.updateHover(event.offsetX, event.offsetY);
    }
    onPointerUp(event) {
      this.pointers.delete(event.pointerId);
      try {
        this.canvas.releasePointerCapture(event.pointerId);
      } catch (error) {
        /* ignore */
      }
      if (this.pointers.size < 2) this.pinch = null;
      if (this.pointers.size === 0) {
        this.drag = null;
        this.canvas.style.cursor = "grab";
        this.updateHover(event.offsetX, event.offsetY);
      }
    }

    onPointerLeave() {
      if (this.pointers.size) return;
      this.hover = null;
      this.traceX = null;
      this.hideTooltip();
      if (this.onHover) this.onHover(null);
      this.scheduleDraw();
    }

    onWheel(event) {
      event.preventDefault();
      const plot = this.getPlotRect();
      if (event.offsetX < plot.left || event.offsetX > plot.right || event.offsetY < plot.top || event.offsetY > plot.bottom) return;
      const delta = Math.exp(-event.deltaY * 0.0014);
      const factor = clamp(delta, 0.7, 1.42);
      this.zoomAt(factor, event.offsetX, event.offsetY);
    }

    onKeyDown(event) {
      const step = event.shiftKey ? 0.22 : 0.08;
      const xSpan = this.xMax - this.xMin;
      const ySpan = this.yMax - this.yMin;
      const plot = this.getPlotRect();
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        if (event.key === "ArrowLeft") { this.xMin -= xSpan * step; this.xMax -= xSpan * step; }
        if (event.key === "ArrowRight") { this.xMin += xSpan * step; this.xMax += xSpan * step; }
        if (!this.autoY) {
          if (event.key === "ArrowUp") { this.yMin += ySpan * step; this.yMax += ySpan * step; }
          if (event.key === "ArrowDown") { this.yMin -= ySpan * step; this.yMax -= ySpan * step; }
        } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          this.autoFitY();
        }
        this.scheduleDraw();
        this.notifyViewChange();
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        this.zoomAt(0.84, plotCenterX(plot), plotCenterY(plot));
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        this.zoomAt(1.18, plotCenterX(plot), plotCenterY(plot));
      } else if (event.key === "0") {
        event.preventDefault();
        this.resetView();
      } else if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        this.fitY();
      }
    }

    getPlotRect() {
      const pad = this.options.padding;
      const left = Math.min(pad.left, this.width * 0.18);
      const right = this.width - Math.min(pad.right, this.width * 0.06);
      const top = Math.min(pad.top, this.height * 0.08);
      const bottom = this.height - Math.min(pad.bottom, this.height * 0.11);
      return { left, right, top, bottom, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
    }

    pixelToX(pixelX) {
      const plot = this.getPlotRect();
      const ratio = (pixelX - plot.left) / plot.width;
      return this.xMin + ratio * (this.xMax - this.xMin);
    }

    pixelToY(pixelY) {
      const plot = this.getPlotRect();
      const ratio = (pixelY - plot.top) / plot.height;
      return this.yMax + ratio * (this.yMin - this.yMax);
    }

    xToPixel(x) {
      const plot = this.getPlotRect();
      return plot.left + ((x - this.xMin) / (this.xMax - this.xMin)) * plot.width;
    }

    yToPixel(y) {
      const plot = this.getPlotRect();
      return plot.top + ((this.yMax - y) / (this.yMax - this.yMin)) * plot.height;
    }

    zoomAt(factor, pixelX = this.width / 2, pixelY = this.height / 2) {
      const plot = this.getPlotRect();
      const pivotX = this.pixelToX(pixelX);
      const pivotY = this.pixelToY(pixelY);
      const px = clamp((pixelX - plot.left) / plot.width, 0, 1);
      const py = clamp((pixelY - plot.top) / plot.height, 0, 1);
      const xSpan = (this.xMax - this.xMin) * factor;
      const ySpan = (this.yMax - this.yMin) * factor;
      this.xMin = pivotX - px * xSpan;
      this.xMax = this.xMin + xSpan;
      if (!this.autoY) {
        this.yMax = pivotY + py * ySpan;
        this.yMin = this.yMax - ySpan;
      } else {
        this.autoFitY();
      }
      this.hideTooltip();
      this.scheduleDraw();
      this.notifyViewChange();
    }

    setFunctions(functions) {
      this.functions = functions.map((item) => {
        let evaluator = null;
        let derivative = null;
        let error = null;
        try {
          const norm = root.MathCore ? root.MathCore.normalizeExpression(item.expr) : item.expr;
          const node = root.math.parse(norm);
          evaluator = (x) => {
            try {
              const value = node.compile().evaluate({ x });
              if (typeof value === "number" && Number.isFinite(value)) return value;
              if (value && typeof value.re === "number" && Math.abs(value.im || 0) < 1e-9) return value.re;
              return null;
            } catch (err) {
              return null;
            }
          };
          try {
            const dNode = root.math.derivative(norm, "x");
            derivative = (x) => {
              try {
                const value = dNode.compile().evaluate({ x });
                if (typeof value === "number" && Number.isFinite(value)) return value;
                return null;
              } catch (err) {
                return null;
              }
            };
          } catch (err) {
            derivative = null;
          }
        } catch (err) {
          error = err.message;
        }
        return {
          ...item,
          norm: item.expr,
          evaluator,
          derivative,
          error
        };
      });
      this.autoFitY();
      this.scheduleDraw();
    }

    setPoints(points) {
      this.points = Array.isArray(points) ? points : [];
      this.scheduleDraw();
    }

    setArea(area) {
      this.area = area || null;
      this.scheduleDraw();
    }

    setRegions(regions) {
      this.regions = Array.isArray(regions)
        ? regions.filter((region) => region && region.top && region.bottom && Number.isFinite(region.x1) && Number.isFinite(region.x2))
        : [];
      this.scheduleDraw();
    }

    setOptions(options) {
      if (!options) return;
      if (typeof options.showGrid === "boolean") this.showGrid = options.showGrid;
      if (typeof options.showDerivative === "boolean") this.showDerivative = options.showDerivative;
      if (typeof options.showPoints === "boolean") this.showPoints = options.showPoints;
      this.scheduleDraw();
    }

    setView(view) {
      if (typeof view.xMin === "number" && Number.isFinite(view.xMin)) this.xMin = view.xMin;
      if (typeof view.xMax === "number" && Number.isFinite(view.xMax)) this.xMax = view.xMax;
      if (this.xMax <= this.xMin) this.xMax = this.xMin + 1;
      if (typeof view.yMin === "number" && Number.isFinite(view.yMin) && typeof view.yMax === "number" && Number.isFinite(view.yMax) && view.yMax > view.yMin) {
        this.yMin = view.yMin;
        this.yMax = view.yMax;
        this.autoY = false;
      } else {
        this.autoY = true;
        this.autoFitY();
      }
      this.home = {
        xMin: this.xMin,
        xMax: this.xMax,
        yMin: this.autoY ? null : this.yMin,
        yMax: this.autoY ? null : this.yMax,
        autoY: this.autoY
      };
      this.scheduleDraw();
    }

    setHomeFromCurrent() {
      this.home = {
        xMin: this.xMin,
        xMax: this.xMax,
        yMin: this.autoY ? null : this.yMin,
        yMax: this.autoY ? null : this.yMax,
        autoY: this.autoY
      };
    }

    resetView() {
      const home = this.home || { xMin: -8, xMax: 8, autoY: true };
      this.xMin = home.xMin;
      this.xMax = home.xMax;
      this.autoY = home.autoY;
      if (!home.autoY) {
        this.yMin = home.yMin;
        this.yMax = home.yMax;
      } else {
        this.autoFitY();
      }
      this.hideTooltip();
      this.scheduleDraw();
      this.notifyViewChange();
    }

    fitY() {
      this.autoY = true;
      this.autoFitY();
      this.scheduleDraw();
    }

    autoFitY() {
      if (!this.autoY && this.options.forceAutoFit !== true) return;
      const active = this.functions.filter((fn) => fn.visible !== false && fn.evaluator);
      const values = [];
      if (this.area && this.area.x1 !== undefined && this.area.x2 !== undefined) {
        // Include the area bounds in horizontal range, but keep the current x view.
      }
      for (const fn of active) {
        for (let i = 0; i <= 360; i += 1) {
          const x = this.xMin + (i / 360) * (this.xMax - this.xMin);
          const y = fn.evaluator(x);
          if (y === null || !Number.isFinite(y)) continue;
          if (Math.abs(y) > 1e7) continue;
          values.push(y);
        }
      }
      if (!values.length) {
        this.yMin = -5;
        this.yMax = 5;
        return;
      }
      values.sort((a, b) => a - b);
      const lo = values[Math.floor(values.length * 0.015)];
      const hi = values[Math.floor(values.length * 0.985)];
      let min = Math.min(0, lo);
      let max = Math.max(0, hi);
      if (!Number.isFinite(min) || !Number.isFinite(max) || max - min < 1e-9) {
        const center = Number.isFinite(min) ? min : 0;
        min = center - 2;
        max = center + 2;
      }
      const span = max - min;
      if (span > 1e5) {
        const center = (max + min) / 2;
        min = center - 5e4;
        max = center + 5e4;
      }
      const pad = Math.max(span * 0.13, 0.35);
      this.yMin = min - pad;
      this.yMax = max + pad;
      if (this.yMax - this.yMin < 0.8) {
        const center = (this.yMax + this.yMin) / 2;
        this.yMin = center - 0.4;
        this.yMax = center + 0.4;
      }
    }

    resize() {
      const rect = this.shell.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      this.width = Math.round(rect.width);
      this.height = Math.round(rect.height);
      this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.canvas.style.width = this.width + "px";
      this.canvas.style.height = this.height + "px";
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      if (this.autoY) this.autoFitY();
      this.scheduleDraw();
    }

    refreshTheme() {
      this.scheduleDraw();
    }

    scheduleDraw() {
      if (this.raf) return;
      this.raf = requestAnimationFrame(() => {
        this.raf = null;
        this.draw();
      });
    }

    notifyViewChange() {
      if (this.onViewChange) this.onViewChange();
    }

    getThemeColors() {
      const styles = getComputedStyle(document.documentElement);
      return {
        surface: safeColor(styles.getPropertyValue("--surface"), "#ffffff"),
        ink: safeColor(styles.getPropertyValue("--ink"), "#13231c"),
        muted: safeColor(styles.getPropertyValue("--canvas-label"), "#72877d"),
        grid: safeColor(styles.getPropertyValue("--canvas-grid"), "#e7eee9"),
        gridStrong: safeColor(styles.getPropertyValue("--canvas-grid-strong"), "#d4e0d8"),
        axis: safeColor(styles.getPropertyValue("--canvas-axis"), "#8fa49a"),
        accent: safeColor(styles.getPropertyValue("--accent"), "#0e7a5f"),
        coral: safeColor(styles.getPropertyValue("--coral"), "#d45f4d"),
        line: safeColor(styles.getPropertyValue("--line"), "#dfe8e1")
      };
    }

    draw() {
      if (!this.width || !this.height) return;
      const ctx = this.ctx;
      const plot = this.getPlotRect();
      const colors = this.getThemeColors();
      ctx.clearRect(0, 0, this.width, this.height);
      ctx.fillStyle = colors.surface;
      ctx.fillRect(0, 0, this.width, this.height);

      this.drawGrid(ctx, plot, colors);
      if (this.area) this.drawArea(ctx, plot, colors);
      if (this.regions.length) this.drawRegions(ctx, plot, colors);

      ctx.save();
      ctx.beginPath();
      ctx.rect(plot.left, plot.top, plot.width, plot.height);
      ctx.clip();
      for (const fn of this.functions) {
        if (fn.visible === false || !fn.evaluator) continue;
        this.drawFunction(ctx, fn, plot, colors, false);
        if (this.showDerivative && fn.derivative) {
          this.drawFunction(ctx, { ...fn, derivative: null, evaluator: fn.derivative }, plot, colors, true);
        }
      }
      if (this.showPoints && this.points.length) this.drawPoints(ctx, plot, colors);
      if (this.hover) this.drawCrosshair(ctx, plot, colors);
      ctx.restore();

      this.drawFrame(ctx, plot, colors);
      if (this.showLegend) this.drawLegend(ctx, plot, colors);
      if (this.traceX !== null && this.hover) this.drawTraceLabel(ctx, plot, colors);
    }

    drawGrid(ctx, plot, colors) {
      const xSpan = this.xMax - this.xMin;
      const ySpan = this.yMax - this.yMin;
      const xStep = niceStep(xSpan / 9);
      const yStep = niceStep(ySpan / 7);
      const xMinor = xStep / 5;
      const yMinor = yStep / 5;

      ctx.save();
      ctx.beginPath();
      ctx.rect(plot.left, plot.top, plot.width, plot.height);
      ctx.clip();
      ctx.lineWidth = 1;

      if (this.showGrid) {
        ctx.strokeStyle = colors.grid;
        ctx.globalAlpha = 0.62;
        ctx.beginPath();
        const xMinorStart = Math.ceil(this.xMin / xMinor) * xMinor;
        for (let x = xMinorStart; x <= this.xMax; x += xMinor) {
          const px = Math.round(this.xToPixel(x)) + 0.5;
          ctx.moveTo(px, plot.top);
          ctx.lineTo(px, plot.bottom);
        }
        const yMinorStart = Math.ceil(this.yMin / yMinor) * yMinor;
        for (let y = yMinorStart; y <= this.yMax; y += yMinor) {
          const py = Math.round(this.yToPixel(y)) + 0.5;
          ctx.moveTo(plot.left, py);
          ctx.lineTo(plot.right, py);
        }
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.strokeStyle = colors.gridStrong;
        ctx.beginPath();
        const xStart = Math.ceil(this.xMin / xStep) * xStep;
        for (let x = xStart; x <= this.xMax; x += xStep) {
          const px = Math.round(this.xToPixel(x)) + 0.5;
          ctx.moveTo(px, plot.top);
          ctx.lineTo(px, plot.bottom);
        }
        const yStart = Math.ceil(this.yMin / yStep) * yStep;
        for (let y = yStart; y <= this.yMax; y += yStep) {
          const py = Math.round(this.yToPixel(y)) + 0.5;
          ctx.moveTo(plot.left, py);
          ctx.lineTo(plot.right, py);
        }
        ctx.stroke();
      }

      // Axes.
      const zeroY = this.yToPixel(0);
      const zeroX = this.xToPixel(0);
      ctx.strokeStyle = colors.axis;
      ctx.globalAlpha = 0.78;
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      if (zeroY >= plot.top && zeroY <= plot.bottom) {
        ctx.moveTo(plot.left, Math.round(zeroY) + 0.5);
        ctx.lineTo(plot.right, Math.round(zeroY) + 0.5);
      }
      if (zeroX >= plot.left && zeroX <= plot.right) {
        ctx.moveTo(Math.round(zeroX) + 0.5, plot.top);
        ctx.lineTo(Math.round(zeroX) + 0.5, plot.bottom);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Origin arrow heads.
      if (zeroX >= plot.left && zeroX <= plot.right && zeroY >= plot.top && zeroY <= plot.bottom) {
        ctx.fillStyle = colors.axis;
        ctx.beginPath();
        ctx.moveTo(plot.right - 2, zeroY);
        ctx.lineTo(plot.right - 8, zeroY - 3.2);
        ctx.lineTo(plot.right - 8, zeroY + 3.2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(zeroX, plot.top + 2);
        ctx.lineTo(zeroX - 3.2, plot.top + 8);
        ctx.lineTo(zeroX + 3.2, plot.top + 8);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Labels are drawn outside the clipping region, but still inside the canvas.
      ctx.save();
      ctx.font = '10px "Cascadia Code", "SFMono-Regular", Consolas, monospace';
      ctx.fillStyle = colors.muted;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const labelY = clamp(zeroY + 5, plot.top + 4, plot.bottom - 15);
      const xStart = Math.ceil(this.xMin / xStep) * xStep;
      for (let x = xStart; x <= this.xMax; x += xStep) {
        if (Math.abs(x) < xStep * 1e-6) continue;
        const px = this.xToPixel(x);
        if (px < plot.left + 8 || px > plot.right - 8) continue;
        ctx.fillText(formatTick(x, xStep), px, labelY);
      }
      if (zeroX >= plot.left && zeroX <= plot.right) {
        ctx.fillText("0", zeroX, clamp(zeroY + 5, plot.top + 4, plot.bottom - 15));
      }

      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const labelX = clamp(zeroX - 7, plot.left + 4, plot.right - 6);
      const yStart = Math.ceil(this.yMin / yStep) * yStep;
      for (let y = yStart; y <= this.yMax; y += yStep) {
        if (Math.abs(y) < yStep * 1e-6) continue;
        const py = this.yToPixel(y);
        if (py < plot.top + 8 || py > plot.bottom - 8) continue;
        ctx.fillText(formatTick(y, yStep), labelX, py);
      }

      ctx.fillStyle = colors.muted;
      ctx.font = 'italic 11px "Iowan Old Style", "Palatino Linotype", Georgia, serif';
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("x", plot.right - 4, clamp(zeroY + 9, plot.top + 3, plot.bottom - 16));
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillText("y", clamp(zeroX - 9, plot.left + 8, plot.right - 4), plot.top + 2);
      ctx.restore();
    }

    drawFunction(ctx, fn, plot, colors, isDerivative) {
      const span = this.xMax - this.xMin;
      const samples = Math.max(180, Math.floor(plot.width * 1.7));
      const dashed = isDerivative || fn.dashed === true;
      const points = [];
      let previousY = null;
      let previousJump = 0;
      for (let i = 0; i <= samples; i += 1) {
        const x = this.xMin + (i / samples) * span;
        const y = fn.evaluator(x);
        if (y === null || !Number.isFinite(y)) {
          points.push({ x: this.xToPixel(x), y: null });
          previousY = null;
          previousJump = 0;
          continue;
        }
        const py = this.yToPixel(y);
        if (previousY !== null) {
          const jump = Math.abs(py - previousY);
          const threshold = plot.height * 1.1;
          const withinPlot = py > plot.top - plot.height * 0.5 && py < plot.bottom + plot.height * 0.5;
          if (jump > threshold && previousJump < threshold && withinPlot) {
            points.push({ x: this.xToPixel(x), y: null });
          }
        }
        points.push({ x: this.xToPixel(x), y: py, value: y });
        previousJump = Math.abs(py - (previousY === null ? py : previousY));
        previousY = py;
      }

      ctx.save();
      ctx.strokeStyle = fn.color || colors.accent;
      ctx.lineWidth = dashed ? 1.45 : 2.15;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.globalAlpha = dashed ? 0.55 : 1;
      if (dashed) ctx.setLineDash([4.5, 5.5]);
      ctx.beginPath();
      let drawing = false;
      for (const point of points) {
        if (point.y === null) {
          drawing = false;
          continue;
        }
        if (!drawing) {
          ctx.moveTo(point.x, point.y);
          drawing = true;
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    drawArea(ctx, plot, colors) {
      const { x1, x2, evaluator } = this.area;
      if (!evaluator || !Number.isFinite(x1) || !Number.isFinite(x2)) return;
      const start = clamp(Math.min(x1, x2), this.xMin, this.xMax);
      const end = clamp(Math.max(x1, x2), this.xMin, this.xMax);
      if (end <= start) return;
      const startPx = this.xToPixel(start);
      const endPx = this.xToPixel(end);
      const zeroPx = this.yToPixel(0);
      const step = 1;
      ctx.save();
      ctx.beginPath();
      ctx.rect(plot.left, plot.top, plot.width, plot.height);
      ctx.clip();
      for (let px = startPx; px < endPx; px += step) {
        const x = this.pixelToX(px + 0.5);
        const y = evaluator(x);
        if (y === null || !Number.isFinite(y)) continue;
        const curvePx = clamp(this.yToPixel(y), plot.top - 2, plot.bottom + 2);
        const top = Math.min(curvePx, zeroPx);
        const height = Math.max(1, Math.abs(curvePx - zeroPx));
        ctx.fillStyle = y >= 0 ? "rgba(14, 122, 95, 0.18)" : "rgba(212, 95, 77, 0.16)";
        ctx.fillRect(px, top, step + 0.4, height);
      }
      ctx.strokeStyle = colors.accent;
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(startPx, plot.top);
      ctx.lineTo(startPx, plot.bottom);
      ctx.moveTo(endPx, plot.top);
      ctx.lineTo(endPx, plot.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      const label = this.area.label || "";
      if (label && endPx - startPx > 54) {
        ctx.font = '9px "Cascadia Code", Consolas, monospace';
        ctx.fillStyle = colors.accent;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(label, (startPx + endPx) / 2, Math.max(plot.top + 10, Math.min(this.yToPixel(0), plot.bottom) - 7));
      }
      ctx.restore();
    }

    drawRegions(ctx, plot, colors) {
      for (const region of this.regions) {
        const x1 = clamp(Math.min(region.x1, region.x2), this.xMin, this.xMax);
        const x2 = clamp(Math.max(region.x1, region.x2), this.xMin, this.xMax);
        if (x2 <= x1) continue;
        const startPx = this.xToPixel(x1);
        const endPx = this.xToPixel(x2);
        const step = 1;
        ctx.save();
        ctx.beginPath();
        ctx.rect(plot.left, plot.top, plot.width, plot.height);
        ctx.clip();
        ctx.globalAlpha = region.alpha !== undefined ? region.alpha : 0.16;
        ctx.fillStyle = region.color || colors.accent;
        for (let px = startPx; px < endPx; px += step) {
          const x = this.pixelToX(px + 0.5);
          const topValue = region.top(x);
          const bottomValue = region.bottom(x);
          if (topValue === null || bottomValue === null) continue;
          if (!Number.isFinite(topValue) || !Number.isFinite(bottomValue)) continue;
          const topPx = clamp(this.yToPixel(topValue), plot.top - 2, plot.bottom + 2);
          const bottomPx = clamp(this.yToPixel(bottomValue), plot.top - 2, plot.bottom + 2);
          const y = Math.min(topPx, bottomPx);
          const height = Math.max(1, Math.abs(topPx - bottomPx));
          ctx.fillRect(px, y, step + 0.35, height);
        }
        if (region.showBounds !== false) {
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = region.color || colors.accent;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 4]);
          ctx.beginPath();
          ctx.moveTo(startPx, plot.top);
          ctx.lineTo(startPx, plot.bottom);
          ctx.moveTo(endPx, plot.top);
          ctx.lineTo(endPx, plot.bottom);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      }
    }

    drawPoints(ctx, plot, colors) {
      const visible = this.points
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
        .slice(0, 14);
      const labels = [];
      for (const point of visible) {
        const px = this.xToPixel(point.x);
        const py = this.yToPixel(point.y);
        if (px < plot.left - 5 || px > plot.right + 5 || py < plot.top - 5 || py > plot.bottom + 5) continue;
        const color = point.color || (point.type === "min" ? colors.coral : point.type === "max" ? colors.accent : colors.axis);
        ctx.save();
        ctx.fillStyle = colors.surface;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(px, py, 3.6, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        if (point.label && labels.length < 8) {
          const nearby = labels.some((label) => Math.abs(label.x - px) < 26 && Math.abs(label.y - py) < 18);
          if (!nearby) {
            ctx.save();
            ctx.font = '8.5px "Cascadia Code", Consolas, monospace';
            ctx.fillStyle = colors.muted;
            ctx.textAlign = "left";
            ctx.textBaseline = "bottom";
            ctx.fillText(point.label, px + 6, py - 5);
            ctx.restore();
            labels.push({ x: px, y: py });
          }
        }
      }
    }

    drawCrosshair(ctx, plot, colors) {
      const x = this.pixelToX(this.hover.x);
      const px = this.xToPixel(x);
      if (px < plot.left || px > plot.right) return;
      ctx.save();
      ctx.strokeStyle = colors.axis;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(px, plot.top);
      ctx.lineTo(px, plot.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      for (const fn of this.functions) {
        if (fn.visible === false || !fn.evaluator) continue;
        const y = fn.evaluator(x);
        if (y === null || !Number.isFinite(y)) continue;
        const py = this.yToPixel(y);
        if (py < plot.top || py > plot.bottom) continue;
        ctx.fillStyle = colors.surface;
        ctx.strokeStyle = fn.color || colors.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 3.6, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    drawTraceLabel(ctx, plot, colors) {
      const x = this.pixelToX(this.hover.x);
      const values = this.functions
        .filter((fn) => fn.visible !== false && fn.evaluator)
        .map((fn) => ({ fn, y: fn.evaluator(x) }))
        .filter((entry) => entry.y !== null && Number.isFinite(entry.y));
      if (!values.length) return;
      const px = this.xToPixel(x);
      for (const entry of values) {
        const py = this.yToPixel(entry.y);
        if (py < plot.top || py > plot.bottom) continue;
      }
    }

    drawFrame(ctx, plot, colors) {
      ctx.save();
      ctx.strokeStyle = colors.line;
      ctx.globalAlpha = 0.82;
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(plot.left) + 0.5, Math.round(plot.top) + 0.5, Math.round(plot.width), Math.round(plot.height));
      ctx.restore();
    }

    drawLegend(ctx, plot, colors) {
      const active = this.functions.filter((fn) => fn.visible !== false && fn.evaluator);
      if (!active.length) return;
      ctx.save();
      ctx.font = '8.5px "Cascadia Code", Consolas, monospace';
      let y = plot.top + 13;
      for (const fn of active.slice(0, 5)) {
        const label = fn.label || fn.expr;
        const text = label.length > 30 ? label.slice(0, 29) + "…" : label;
        ctx.fillStyle = fn.color || colors.accent;
        ctx.beginPath();
        ctx.arc(plot.left + 12, y - 2, 2.5, 0, TAU);
        ctx.fill();
        ctx.fillStyle = colors.muted;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(text, plot.left + 20, y);
        y += 15;
        if (y > plot.top + 75) break;
      }
      ctx.restore();
    }

    updateHover(pixelX, pixelY) {
      const plot = this.getPlotRect();
      if (pixelX < plot.left || pixelX > plot.right || pixelY < plot.top || pixelY > plot.bottom) {
        this.hover = null;
        this.traceX = null;
        this.hideTooltip();
        if (this.onHover) this.onHover(null);
        this.scheduleDraw();
        return;
      }
      this.hover = { x: pixelX, y: pixelY };
      const x = this.pixelToX(pixelX);
      const values = this.functions
        .filter((fn) => fn.visible !== false && fn.evaluator)
        .map((fn) => ({ label: fn.label || fn.expr, value: fn.evaluator(x), color: fn.color }))
        .filter((entry) => entry.value !== null && Number.isFinite(entry.value));
      this.traceX = x;
      this.updateTooltip(pixelX, pixelY, x, values);
      if (this.onHover) this.onHover({ x, values, pixelX, pixelY });
      this.scheduleDraw();
    }

    updateTooltip(pixelX, pixelY, x, values) {
      if (!this.tooltip) return;
      if (!values.length) {
        this.hideTooltip();
        return;
      }
      this.tooltip.textContent = "";
      const title = document.createElement("div");
      title.className = "plot-tooltip-title";
      title.textContent = "x = " + formatValue(x, 6);
      this.tooltip.appendChild(title);
      for (const entry of values.slice(0, 5)) {
        const row = document.createElement("div");
        row.className = "plot-tooltip-row";
        const dot = document.createElement("span");
        dot.className = "plot-tooltip-dot";
        dot.style.background = entry.color || "var(--accent)";
        const name = document.createElement("span");
        name.className = "plot-tooltip-name";
        name.textContent = (entry.label || "f(x)").replace(/\s+/g, " ");
        if (name.textContent.length > 22) name.textContent = name.textContent.slice(0, 21) + "…";
        const value = document.createElement("strong");
        value.textContent = formatValue(entry.value, 6);
        row.append(dot, name, value);
        this.tooltip.appendChild(row);
      }
      const shellRect = this.shell.getBoundingClientRect();
      const tooltipWidth = 174;
      const left = pixelX + 16 + tooltipWidth > shellRect.width ? pixelX - tooltipWidth - 14 : pixelX + 16;
      const top = clamp(pixelY - 16, 12, shellRect.height - 90);
      this.tooltip.style.transform = `translate(${left}px, ${top}px)`;
      this.tooltip.classList.add("is-visible");
    }

    hideTooltip() {
      if (this.tooltip) this.tooltip.classList.remove("is-visible");
    }

    clearTrace() {
      this.hover = null;
      this.traceX = null;
      this.hideTooltip();
      this.scheduleDraw();
    }

    exportPNG(filename = "mathlab-plot.png") {
      this.clearTrace();
      this.draw();
      this.canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1200);
      }, "image/png");
    }
  }

  function plotCenterX(plot) {
    return plot.left + plot.width / 2;
  }

  function plotCenterY(plot) {
    return plot.top + plot.height / 2;
  }

  root.FunctionPlotter = FunctionPlotter;
})(typeof globalThis !== "undefined" ? globalThis : this);
