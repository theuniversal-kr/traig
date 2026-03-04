/**
 * StrategyChart — Standalone vanilla JS time-series chart.
 * No React, no Tailwind, no bundler required.
 *
 * Usage:
 *   StrategyChart.render('containerId', 'data.json');
 *   StrategyChart.render('containerId', { data: [...], lines: [...] });
 *
 * @typedef {{ timestamp: string, values: Record<string, number> }} ChartDataPoint
 * @typedef {{ key: string, label: string, color: string, dotted?: boolean, axis: 'left'|'right', scale: 'ratio'|'krw'|'price' }} ChartLineConfig
 * @typedef {{ timestamp: string, label: string, color: string }} ChartMarker
 */
var StrategyChart = (function () {
  'use strict';

  var CHAR_WIDTH = 6;
  var MIN_PADDING = 40;
  var MOBILE_BREAKPOINT = 640;
  var MOBILE_PADDING_RATIO = 0.5;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var DEFAULT_PADDING = { top: 20, right: 50, bottom: 60, left: 60 };

  var THEME = {
    bg: '#1c1c1e',
    text: '#e5e5e7',
    muted: '#8e8e93',
    border: '#2c2c2e',
    gridLine: '#2c2c2e',
    tooltipBg: 'rgba(0,0,0,0.85)',
    selectedColor: '#f97316',
    diffPositive: '#22c55e',
    diffNegative: '#ef4444',
    panelBg: '#2c2c2e',
    hoverLine: '#9ca3af',
    font: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
  };

  // ── Format helpers ───────────────────────────────────────────────────
  function formatTime(iso) {
    var d = new Date(iso);
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    var hh = String(d.getHours()).padStart(2, '0');
    var mi = String(d.getMinutes()).padStart(2, '0');
    return mm + '/' + dd + ' ' + hh + ':' + mi;
  }
  function formatPercent(v) { return (v * 100).toFixed(1) + '%'; }
  function formatKrw(v) { return Math.round(v).toLocaleString(); }
  function formatPrice(v) { return Math.round(v).toLocaleString(); }
  function formatByScale(v, scale) {
    if (scale === 'ratio') return formatPercent(v);
    if (scale === 'krw') return '\u20A9' + formatKrw(v);
    return formatPrice(v);
  }
  function formatTickLabel(v, scale) {
    if (scale === 'ratio') return (v * 100).toFixed(0) + '%';
    return Math.round(v).toLocaleString();
  }

  // ── DOM helpers ──────────────────────────────────────────────────────
  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    if (attrs) { for (var k in attrs) { if (attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]); } }
    return el;
  }
  function htmlEl(tag, styles, text) {
    var el = document.createElement(tag);
    if (styles) Object.assign(el.style, styles);
    if (text != null) el.textContent = text;
    return el;
  }
  function clearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  // ── computeScales ────────────────────────────────────────────────────
  function computeScales(data, lines, width, height) {
    var isMobile = width < MOBILE_BREAKPOINT;
    var sortedData = data.slice().sort(function (a, b) {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
    var minTime = 0, maxTime = 1;
    if (sortedData.length > 0) {
      minTime = new Date(sortedData[0].timestamp).getTime();
      maxTime = new Date(sortedData[sortedData.length - 1].timestamp).getTime();
    }
    var leftLines = lines.filter(function (l) { return l.axis === 'left'; });
    var rightLines = lines.filter(function (l) { return l.axis === 'right'; });
    var krwLines = lines.filter(function (l) { return l.scale === 'krw'; });
    var priceLines = lines.filter(function (l) { return l.scale === 'price'; });
    var minK = Infinity, maxK = -Infinity, minP = Infinity, maxP = -Infinity;
    var i, j, val;
    for (i = 0; i < sortedData.length; i++) {
      for (j = 0; j < krwLines.length; j++) {
        val = sortedData[i].values[krwLines[j].key];
        if (val != null) { if (val < minK) minK = val; if (val > maxK) maxK = val; }
      }
      for (j = 0; j < priceLines.length; j++) {
        val = sortedData[i].values[priceLines[j].key];
        if (val != null) { if (val < minP) minP = val; if (val > maxP) maxP = val; }
      }
    }
    if (minK === Infinity) { minK = 0; maxK = 1; }
    if (minP === Infinity) { minP = 0; maxP = 1; }
    var krwPad = (maxK - minK) * 0.1 || maxK * 0.1;
    var pricePad = (maxP - minP) * 0.1 || maxP * 0.1;
    var minKrw = Math.max(0, minK - krwPad), maxKrw = maxK + krwPad;
    var minPrice = Math.max(0, minP - pricePad), maxPrice = maxP + pricePad;

    var leftNRS = null, rightNRS = null;
    for (i = 0; i < leftLines.length; i++) { if (leftLines[i].scale !== 'ratio') { leftNRS = leftLines[i].scale; break; } }
    for (i = 0; i < rightLines.length; i++) { if (rightLines[i].scale !== 'ratio') { rightNRS = rightLines[i].scale; break; } }

    var leftMax = leftNRS === 'krw' ? maxKrw : leftNRS === 'price' ? maxPrice : 0;
    var rightMax = rightNRS === 'price' ? maxPrice : rightNRS === 'krw' ? maxKrw : 0;
    var leftLabel = leftNRS ? formatKrw(leftMax) : '100.0%';
    var rightLabel = rightNRS ? formatPrice(rightMax) : '100.0%';
    var ratio = isMobile ? MOBILE_PADDING_RATIO : 1;
    var minPad = isMobile ? 25 : MIN_PADDING;
    var pad = {
      top: DEFAULT_PADDING.top, bottom: DEFAULT_PADDING.bottom,
      left: leftLines.length > 0 ? Math.max(minPad, (leftLabel.length * CHAR_WIDTH + 15) * ratio) : DEFAULT_PADDING.left,
      right: rightLines.length > 0 ? Math.max(minPad, (rightLabel.length * CHAR_WIDTH + 15) * ratio) : DEFAULT_PADDING.right,
    };
    var cw = width - pad.left - pad.right;
    var ch = height - pad.top - pad.bottom;

    function timeToX(ts) {
      var t = new Date(ts).getTime(), range = maxTime - minTime;
      return range === 0 ? cw / 2 : ((t - minTime) / range) * cw;
    }
    function ratioToY(v) { return ch - v * ch; }
    function krwToY(v) { var r = maxKrw - minKrw; return r === 0 ? ch / 2 : ch - ((v - minKrw) / r) * ch; }
    function priceToY(v) { var r = maxPrice - minPrice; return r === 0 ? ch / 2 : ch - ((v - minPrice) / r) * ch; }
    function scaleToY(v, s) {
      if (s === 'ratio') return ratioToY(v);
      if (s === 'krw') return krwToY(v);
      return priceToY(v);
    }

    var paths = {};
    for (i = 0; i < lines.length; i++) {
      var line = lines[i], needsMove = true, segs = [];
      for (j = 0; j < sortedData.length; j++) {
        var v = sortedData[j].values[line.key];
        if (v == null) { needsMove = true; continue; }
        segs.push((needsMove ? 'M' : 'L') + ' ' + timeToX(sortedData[j].timestamp) + ' ' + scaleToY(v, line.scale));
        needsMove = false;
      }
      paths[line.key] = segs.join(' ');
    }

    function makeTicks(nrs) {
      if (!nrs) return { ticks: [0, 0.25, 0.5, 0.75, 1], tickScale: 'ratio' };
      var mn = nrs === 'krw' ? minKrw : minPrice, mx = nrs === 'krw' ? maxKrw : maxPrice;
      var ticks = [], step = (mx - mn) / 4;
      for (i = 0; i <= 4; i++) ticks.push(mn + step * i);
      return { ticks: ticks, tickScale: nrs };
    }
    var lt = makeTicks(leftNRS), rt = makeTicks(rightNRS);

    var xAxisTicks = [];
    if (sortedData.length > 0) {
      var tc = Math.min(6, sortedData.length), xs = Math.max(1, Math.floor(sortedData.length / tc));
      for (i = 0; i < sortedData.length; i += xs) {
        xAxisTicks.push({ time: sortedData[i].timestamp, x: timeToX(sortedData[i].timestamp) });
      }
    }

    return {
      sortedData: sortedData, chartWidth: cw, chartHeight: ch, dynamicPadding: pad,
      paths: paths, leftTicks: lt.ticks, rightTicks: rt.ticks,
      leftTickScale: lt.tickScale, rightTickScale: rt.tickScale,
      xAxisTicks: xAxisTicks, timeToX: timeToX, scaleToY: scaleToY,
      leftLines: leftLines, rightLines: rightLines,
    };
  }

  // ── InteractionState ─────────────────────────────────────────────────
  function InteractionState(sortedData, lines, timeToX, onChange) {
    this.sortedData = sortedData;
    this.lines = lines;
    this.timeToX = timeToX;
    this.onChange = onChange;
    this.hoveredPoint = null;
    this.selectedPoints = [];
  }
  InteractionState.prototype.findNearest = function (mx) {
    var best = 0, minD = Infinity;
    for (var i = 0; i < this.sortedData.length; i++) {
      var dist = Math.abs(mx - this.timeToX(this.sortedData[i].timestamp));
      if (dist < minD) { minD = dist; best = i; }
    }
    return best;
  };
  InteractionState.prototype.handleMouseMove = function (mx, my) {
    if (!this.sortedData.length) { this.hoveredPoint = null; this.onChange(); return; }
    var idx = this.findNearest(mx), d = this.sortedData[idx];
    this.hoveredPoint = { index: idx, x: this.timeToX(d.timestamp), y: my, data: d };
    this.onChange();
  };
  InteractionState.prototype.handleMouseLeave = function () { this.hoveredPoint = null; this.onChange(); };
  InteractionState.prototype.handleClick = function (mx) {
    if (!this.sortedData.length) return;
    var idx = this.findNearest(mx), d = this.sortedData[idx];
    var pt = { index: idx, x: this.timeToX(d.timestamp), y: 0, data: d };
    var ei = -1;
    for (var i = 0; i < this.selectedPoints.length; i++) { if (this.selectedPoints[i].index === idx) { ei = i; break; } }
    if (ei !== -1) this.selectedPoints.splice(ei, 1);
    else { this.selectedPoints.push(pt); if (this.selectedPoints.length > 2) this.selectedPoints = this.selectedPoints.slice(-2); }
    this.onChange();
  };
  InteractionState.prototype.getSortedSelected = function () {
    var self = this;
    return this.selectedPoints.slice().sort(function (a, b) {
      return new Date(a.data.timestamp).getTime() - new Date(b.data.timestamp).getTime();
    }).map(function (p) { return { index: p.index, x: self.timeToX(p.data.timestamp), y: 0, data: p.data }; });
  };
  InteractionState.prototype.getDifferences = function () {
    var sorted = this.getSortedSelected();
    if (sorted.length !== 2) return null;
    var older = sorted[0], newer = sorted[1];
    var ms = new Date(newer.data.timestamp).getTime() - new Date(older.data.timestamp).getTime();
    var days = ms / 86400000, hours = ms / 3600000, minutes = ms / 60000;
    var td;
    if (days >= 1) { var d2 = Math.floor(days), h = Math.floor(hours % 24); td = h > 0 ? d2 + 'd ' + h + 'h' : d2 + 'd'; }
    else if (hours >= 1) { var hh = Math.floor(hours), mm = Math.floor(minutes % 60); td = mm > 0 ? hh + 'h ' + mm + 'm' : hh + 'h'; }
    else td = Math.floor(minutes) + 'm';
    var vals = {}, perDay = {};
    for (var i = 0; i < this.lines.length; i++) {
      var k = this.lines[i].key, diff = (newer.data.values[k] || 0) - (older.data.values[k] || 0);
      vals[k] = diff; perDay[k] = days > 0 ? diff / days : 0;
    }
    return { timeDiff: td, values: vals, perDay: perDay };
  };
  InteractionState.prototype.clearSelection = function () { this.selectedPoints = []; this.onChange(); };
  InteractionState.prototype.selectOldestToNewest = function () {
    if (this.sortedData.length < 2) return;
    var o = this.sortedData[0], n = this.sortedData[this.sortedData.length - 1];
    this.selectedPoints = [
      { index: 0, x: this.timeToX(o.timestamp), y: 0, data: o },
      { index: this.sortedData.length - 1, x: this.timeToX(n.timestamp), y: 0, data: n },
    ];
    this.onChange();
  };
  InteractionState.prototype.selectByValue = function (lineKey, target) {
    if (this.sortedData.length < 2) return;
    var rounded = Math.round(target), matches = [];
    for (var i = 0; i < this.sortedData.length; i++) {
      if (Math.round(this.sortedData[i].values[lineKey] || -1) === rounded) matches.push(i);
    }
    if (matches.length < 2) return;
    var oi = matches[0], ni = matches[matches.length - 1];
    this.selectedPoints = [
      { index: oi, x: this.timeToX(this.sortedData[oi].timestamp), y: 0, data: this.sortedData[oi] },
      { index: ni, x: this.timeToX(this.sortedData[ni].timestamp), y: 0, data: this.sortedData[ni] },
    ];
    this.onChange();
  };

  // ── D/W Compensation ─────────────────────────────────────────────────
  function compensateData(data, depositWithdrawals) {
    if (!depositWithdrawals || depositWithdrawals.length === 0 || data.length === 0) return data;

    var times = data.map(function (d) { return new Date(d.timestamp).getTime(); });
    var chartStart = Math.min.apply(null, times);

    var sortedDW = depositWithdrawals.slice()
      .filter(function (dw) { return new Date(dw.timestamp).getTime() >= chartStart; })
      .sort(function (a, b) { return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(); });

    if (sortedDW.length === 0) return data;

    return data.map(function (point) {
      var pointTime = new Date(point.timestamp).getTime();
      var offset = 0;
      for (var i = 0; i < sortedDW.length; i++) {
        var dw = sortedDW[i];
        if (new Date(dw.timestamp).getTime() > pointTime) break;
        var krwAmount = dw.currency === 'KRW' ? dw.amount : (point.values.bid ? dw.amount * point.values.bid : 0);
        if (dw.type === 'DEPOSIT') offset -= krwAmount;
        else offset += krwAmount;
      }
      if (offset === 0) return point;
      var newValues = {};
      for (var k in point.values) { if (point.values.hasOwnProperty(k)) newValues[k] = point.values[k]; }
      newValues.totalKrw = point.values.totalKrw + offset;
      return { timestamp: point.timestamp, values: newValues };
    });
  }

  // ── Date helpers ────────────────────────────────────────────────────
  function toDateInputValue(iso) {
    var d = new Date(iso);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // ── ChartRenderer ────────────────────────────────────────────────────
  function ChartRenderer(container, config) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    this._allData = config.data || [];
    this.data = this._allData;
    this.lines = config.lines || [];
    this.presets = config.presets || {};
    this._allMarkers = config.markers || [];
    this.markers = this._allMarkers;
    this.depositWithdrawals = config.depositWithdrawals || [];
    this.monthlyReports = (config.monthlyReports || []).slice().sort(function (a, b) {
      return (a.year - b.year) || (a.month - b.month);
    });
    this.height = config.height || 400;
    this.width = 800;
    this.visibleLines = {};
    for (var i = 0; i < this.lines.length; i++) this.visibleLines[this.lines[i].key] = true;
    this.interaction = null;
    this._scales = null;
    this._overlayGroup = null;
    this._savedSelection = null;
    this._compensateDW = false;
    this._dateStart = '';
    this._dateEnd = '';
    this._activeRange = '30d';
    this._init();
  }

  ChartRenderer.prototype._init = function () {
    var self = this;
    clearChildren(this.container);

    this._root = htmlEl('div', {
      background: THEME.bg, borderRadius: '8px', border: '1px solid ' + THEME.border,
      padding: '16px', fontFamily: THEME.font, color: THEME.text, fontSize: '12px',
    });
    this.container.appendChild(this._root);

    // Toolbar: date filter + compensate D/W
    this._toolbarEl = htmlEl('div', {
      display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center',
    });
    this._root.appendChild(this._toolbarEl);
    this._renderToolbar();

    this._legendEl = htmlEl('div', { display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' });
    this._root.appendChild(this._legendEl);
    this._svgWrap = htmlEl('div');
    this._root.appendChild(this._svgWrap);
    this._detailEl = htmlEl('div');
    this._root.appendChild(this._detailEl);
    this._reportsEl = htmlEl('div');
    this._root.appendChild(this._reportsEl);
    this._dwListEl = htmlEl('div');
    this._root.appendChild(this._dwListEl);

    this._observer = new ResizeObserver(function (entries) {
      var w = entries[0].contentRect.width;
      if (w > 0 && Math.abs(w - self.width) > 1) { self.width = w; self._saveSelection(); self._render(); }
    });
    this._observer.observe(this._root);
    this.width = this._root.clientWidth || 800;
    // Apply default range
    this._applyRange(this._activeRange);
    this._render();
  };

  ChartRenderer.prototype._saveSelection = function () {
    if (this.interaction) this._savedSelection = this.interaction.selectedPoints.slice();
  };

  var RANGE_PRESETS = [
    { label: '7d', days: 7 },
    { label: '30d', days: 30 },
    { label: '90d', days: 90 },
    { label: '1y', days: 365 },
    { label: 'All', days: 0 },
  ];

  ChartRenderer.prototype._renderToolbar = function () {
    var self = this;
    clearChildren(this._toolbarEl);

    // Range preset buttons
    var rangeWrap = htmlEl('div', { display: 'flex', gap: '2px', marginRight: '8px', paddingRight: '8px', borderRight: '1px solid ' + THEME.border });
    RANGE_PRESETS.forEach(function (preset) {
      var isActive = self._activeRange === preset.label;
      var btn = htmlEl('button', {
        padding: '3px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer',
        fontSize: '12px', fontFamily: THEME.font,
        background: isActive ? '#3b82f6' : THEME.panelBg,
        color: isActive ? 'white' : THEME.muted,
      }, preset.label);
      btn.onmouseenter = function () { if (!isActive) btn.style.color = THEME.text; };
      btn.onmouseleave = function () { if (!isActive) btn.style.color = THEME.muted; };
      btn.onclick = function () { self._applyRange(preset.label); };
      rangeWrap.appendChild(btn);
    });
    this._toolbarEl.appendChild(rangeWrap);

    var inputStyle = {
      padding: '3px 6px', borderRadius: '4px', border: '1px solid ' + THEME.border,
      background: THEME.panelBg, color: THEME.text, fontSize: '12px', fontFamily: THEME.font,
      colorScheme: 'dark',
    };

    var startInput = htmlEl('input', inputStyle);
    startInput.type = 'date';
    startInput.value = this._dateStart;
    startInput.onchange = function () { self._activeRange = ''; self._dateStart = startInput.value; self._applyFilters(); self._renderToolbar(); };
    this._toolbarEl.appendChild(startInput);

    var tilde = htmlEl('span', { color: THEME.muted }, '~');
    this._toolbarEl.appendChild(tilde);

    var endInput = htmlEl('input', inputStyle);
    endInput.type = 'date';
    endInput.value = this._dateEnd;
    endInput.onchange = function () { self._activeRange = ''; self._dateEnd = endInput.value; self._applyFilters(); self._renderToolbar(); };
    this._toolbarEl.appendChild(endInput);

    // Compensate D/W (only show if depositWithdrawals exist)
    if (this.depositWithdrawals.length > 0) {
      var sep = htmlEl('span', { borderLeft: '1px solid ' + THEME.border, height: '16px', marginLeft: '4px', marginRight: '4px' });
      this._toolbarEl.appendChild(sep);

      var dwLabel = htmlEl('label', {
        display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
        color: this._compensateDW ? THEME.text : THEME.muted, fontSize: '12px', whiteSpace: 'nowrap',
      });
      var cb = htmlEl('input', { accentColor: '#f59e0b' });
      cb.type = 'checkbox';
      cb.checked = this._compensateDW;
      cb.onchange = function () {
        self._compensateDW = cb.checked;
        dwLabel.style.color = cb.checked ? THEME.text : THEME.muted;
        self._applyFilters();
      };
      dwLabel.appendChild(cb);
      dwLabel.appendChild(htmlEl('span', null, 'Compensate D/W'));
      this._toolbarEl.appendChild(dwLabel);
    }
  };

  ChartRenderer.prototype._applyRange = function (label) {
    this._activeRange = label;
    var preset = RANGE_PRESETS.find(function (p) { return p.label === label; });
    if (!preset || preset.days === 0) {
      this._dateStart = ''; this._dateEnd = '';
    } else {
      var now = new Date();
      var start = new Date(now.getTime() - preset.days * 86400000);
      this._dateStart = toDateInputValue(start.toISOString());
      this._dateEnd = '';
    }
    this._applyFilters();
    this._renderToolbar();
  };

  ChartRenderer.prototype._applyFilters = function () {
    var filtered = this._allData;

    // Date filter
    if (this._dateStart) {
      var startMs = new Date(this._dateStart + 'T00:00:00').getTime();
      filtered = filtered.filter(function (d) { return new Date(d.timestamp).getTime() >= startMs; });
    }
    if (this._dateEnd) {
      var endMs = new Date(this._dateEnd + 'T23:59:59').getTime();
      filtered = filtered.filter(function (d) { return new Date(d.timestamp).getTime() <= endMs; });
    }

    // D/W compensation
    if (this._compensateDW) {
      filtered = compensateData(filtered, this.depositWithdrawals);
    }

    // Filter markers to visible range
    if (filtered.length > 0) {
      var times = filtered.map(function (d) { return new Date(d.timestamp).getTime(); });
      var rangeStart = Math.min.apply(null, times);
      var rangeEnd = Math.max.apply(null, times);
      this.markers = this._allMarkers.filter(function (m) {
        var t = new Date(m.timestamp).getTime();
        return t >= rangeStart && t <= rangeEnd;
      });
    } else {
      this.markers = [];
    }

    this.data = filtered;
    this._savedSelection = null;
    this._render();
  };

  ChartRenderer.prototype._render = function () {
    this._renderLegend();
    this._renderSvg();
    this._renderDetail();
    this._renderMonthlyReports();
    this._renderDWList();
  };

  // ── Legend ────────────────────────────────────────────────────────────
  ChartRenderer.prototype._renderLegend = function () {
    var self = this;
    clearChildren(this._legendEl);
    var presetKeys = Object.keys(this.presets);
    if (presetKeys.length > 0) {
      var pw = htmlEl('div', { display: 'flex', gap: '4px', marginRight: '8px', paddingRight: '8px', borderRight: '1px solid ' + THEME.border });
      presetKeys.forEach(function (name) {
        var btn = htmlEl('button', {
          padding: '2px 8px', borderRadius: '4px', background: THEME.panelBg, color: THEME.muted,
          border: 'none', cursor: 'pointer', fontSize: '12px', fontFamily: THEME.font, textTransform: 'capitalize',
        }, name);
        btn.onmouseenter = function () { btn.style.color = THEME.text; };
        btn.onmouseleave = function () { btn.style.color = THEME.muted; };
        btn.onclick = function () {
          var keys = self.presets[name]; if (!keys) return;
          for (var k in self.visibleLines) self.visibleLines[k] = false;
          for (var ki = 0; ki < keys.length; ki++) self.visibleLines[keys[ki]] = true;
          self._saveSelection(); self._render();
        };
        pw.appendChild(btn);
      });
      this._legendEl.appendChild(pw);
    }
    this.lines.forEach(function (line) {
      var btn = htmlEl('button', {
        display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 4px', borderRadius: '4px',
        border: 'none', background: 'transparent', cursor: 'pointer',
        opacity: self.visibleLines[line.key] ? '1' : '0.4', transition: 'opacity 0.15s',
        fontFamily: THEME.font, fontSize: '12px', color: THEME.text,
      });
      btn.onmouseenter = function () { btn.style.background = THEME.panelBg; };
      btn.onmouseleave = function () { btn.style.background = 'transparent'; };
      var ls = svgEl('svg', { width: '24', height: '10' });
      var ll = svgEl('line', { x1: '0', y1: '5', x2: '24', y2: '5', stroke: line.color, 'stroke-width': '2' });
      if (line.dotted) ll.setAttribute('stroke-dasharray', '4,2');
      ls.appendChild(ll); btn.appendChild(ls);
      btn.appendChild(htmlEl('span', null, line.label));
      btn.onclick = function () { self.visibleLines[line.key] = !self.visibleLines[line.key]; self._saveSelection(); self._render(); };
      self._legendEl.appendChild(btn);
    });
  };

  // ── SVG ──────────────────────────────────────────────────────────────
  ChartRenderer.prototype._renderSvg = function () {
    var self = this;
    var s = computeScales(this.data, this.lines, this.width, this.height);
    this._scales = s;

    this.interaction = new InteractionState(s.sortedData, this.lines, s.timeToX, function () {
      self._renderOverlay();
      self._renderDetail();
    });
    if (this._savedSelection) {
      this.interaction.selectedPoints = this._savedSelection;
      this._savedSelection = null;
    } else if (s.sortedData.length >= 2) {
      var o = s.sortedData[0], n = s.sortedData[s.sortedData.length - 1];
      this.interaction.selectedPoints = [
        { index: 0, x: s.timeToX(o.timestamp), y: 0, data: o },
        { index: s.sortedData.length - 1, x: s.timeToX(n.timestamp), y: 0, data: n },
      ];
    }

    clearChildren(this._svgWrap);
    var svg = svgEl('svg', { width: String(this.width), height: String(this.height) });
    svg.style.overflow = 'visible';
    this._svgWrap.appendChild(svg);
    var g = svgEl('g', { transform: 'translate(' + s.dynamicPadding.left + ',' + s.dynamicPadding.top + ')' });
    svg.appendChild(g);

    var isMobile = this.width < MOBILE_BREAKPOINT;
    var leftToY = function (v) { return s.scaleToY(v, s.leftTickScale); };
    var rightToY = function (v) { return s.scaleToY(v, s.rightTickScale); };
    var i;

    // Grid
    for (i = 0; i < s.leftTicks.length; i++) {
      var gy = leftToY(s.leftTicks[i]);
      g.appendChild(svgEl('line', { x1: '0', y1: String(gy), x2: String(s.chartWidth), y2: String(gy), stroke: THEME.gridLine, 'stroke-dasharray': '2,2' }));
    }
    // Border
    g.appendChild(svgEl('rect', { x: '0', y: '0', width: String(s.chartWidth), height: String(s.chartHeight), fill: 'none', stroke: THEME.border }));

    // Data lines
    for (i = 0; i < this.lines.length; i++) {
      var line = this.lines[i];
      if (!this.visibleLines[line.key] || !s.paths[line.key]) continue;
      var pa = { d: s.paths[line.key], fill: 'none', stroke: line.color, 'stroke-width': line.dotted ? '1.5' : '2' };
      if (line.dotted) { pa['stroke-dasharray'] = '4,2'; pa['opacity'] = '0.7'; }
      g.appendChild(svgEl('path', pa));
    }

    // Markers
    for (i = 0; i < this.markers.length; i++) {
      var mk = this.markers[i], mx = s.timeToX(mk.timestamp);
      if (mx < 0 || mx > s.chartWidth) continue;
      var mg = svgEl('g'); mg.style.pointerEvents = 'none';
      mg.appendChild(svgEl('line', { x1: String(mx), y1: '0', x2: String(mx), y2: String(s.chartHeight), stroke: mk.color, 'stroke-width': '1.5', 'stroke-dasharray': '6,3', opacity: '0.7' }));
      var lw = Math.min(mk.label.length * 5.5 + 6, 80);
      mg.appendChild(svgEl('rect', { x: String(mx - 1), y: '2', width: String(lw), height: '14', rx: '2', fill: mk.color, opacity: '0.85' }));
      var mt = svgEl('text', { x: String(mx + 2), y: '12', fill: 'white' }); mt.style.fontSize = '8px'; mt.style.fontWeight = '500';
      mt.textContent = mk.label.length > 16 ? mk.label.slice(0, 16) + '\u2026' : mk.label;
      mg.appendChild(mt); g.appendChild(mg);
    }

    // Left Y-Axis
    if (s.leftLines.length > 0) {
      var la = svgEl('text', { x: '-40', y: '-8', 'text-anchor': 'middle', fill: s.leftLines[0].color }); la.style.fontSize = '10px';
      la.textContent = s.leftLines[0].label; g.appendChild(la);
      for (i = 0; i < s.leftTicks.length; i++) {
        var ly = leftToY(s.leftTicks[i]);
        var lg2 = svgEl('g', { transform: 'translate(0,' + ly + ')' });
        lg2.appendChild(svgEl('line', { x1: '-6', y1: '0', x2: '0', y2: '0', stroke: THEME.muted }));
        var lt2 = svgEl('text', { x: isMobile ? '-8' : '-10', y: '0', 'text-anchor': 'end', 'dominant-baseline': 'middle', fill: THEME.muted });
        lt2.style.fontSize = '10px'; if (isMobile) lt2.setAttribute('transform', 'rotate(-45)');
        lt2.textContent = formatTickLabel(s.leftTicks[i], s.leftTickScale);
        lg2.appendChild(lt2); g.appendChild(lg2);
      }
    }

    // Right Y-Axis
    if (s.rightLines.length > 0) {
      var rc = THEME.muted, rl = '';
      for (i = 0; i < s.rightLines.length; i++) { if (s.rightLines[i].scale !== 'ratio') { rc = s.rightLines[i].color; rl = s.rightLines[i].label; break; } }
      if (!rl) { rc = s.rightLines[0].color; rl = s.rightLines[0].label; }
      var ra = svgEl('text', { x: String(s.chartWidth - 5), y: '-8', 'text-anchor': 'end', fill: rc }); ra.style.fontSize = '10px';
      ra.textContent = rl; g.appendChild(ra);
      for (i = 0; i < s.rightTicks.length; i++) {
        var ry = rightToY(s.rightTicks[i]);
        var rg2 = svgEl('g', { transform: 'translate(' + s.chartWidth + ',' + ry + ')' });
        rg2.appendChild(svgEl('line', { x1: '0', y1: '0', x2: '6', y2: '0', stroke: THEME.muted }));
        var rt2 = svgEl('text', { x: isMobile ? '8' : '10', y: '0', 'text-anchor': 'start', 'dominant-baseline': 'middle', fill: THEME.muted });
        rt2.style.fontSize = '10px'; if (isMobile) rt2.setAttribute('transform', 'rotate(-45)');
        rt2.textContent = formatTickLabel(s.rightTicks[i], s.rightTickScale);
        rg2.appendChild(rt2); g.appendChild(rg2);
      }
    }

    // X-Axis
    for (i = 0; i < s.xAxisTicks.length; i++) {
      var xt = s.xAxisTicks[i];
      var xg = svgEl('g', { transform: 'translate(' + xt.x + ',' + s.chartHeight + ')' });
      xg.appendChild(svgEl('line', { x1: '0', y1: '0', x2: '0', y2: '6', stroke: THEME.muted }));
      var xtt = svgEl('text', { x: '0', y: '16', 'text-anchor': 'end', transform: 'rotate(-45)', fill: THEME.muted });
      xtt.style.fontSize = '10px'; xtt.textContent = formatTime(xt.time);
      xg.appendChild(xtt); g.appendChild(xg);
    }

    // Overlay group
    this._overlayGroup = svgEl('g');
    g.appendChild(this._overlayGroup);

    // Interaction rect
    var overlay = svgEl('rect', { x: '0', y: '0', width: String(s.chartWidth), height: String(s.chartHeight), fill: 'transparent' });
    overlay.style.cursor = 'crosshair';
    overlay.addEventListener('mousemove', function (e) {
      var r = overlay.getBoundingClientRect();
      self.interaction.handleMouseMove(e.clientX - r.left, e.clientY - r.top);
    });
    overlay.addEventListener('mouseleave', function () { self.interaction.handleMouseLeave(); });
    overlay.addEventListener('click', function (e) {
      var r = overlay.getBoundingClientRect();
      self.interaction.handleClick(e.clientX - r.left);
    });
    g.appendChild(overlay);

    this._renderOverlay();
  };

  // ── SVG overlay ──────────────────────────────────────────────────────
  ChartRenderer.prototype._renderOverlay = function () {
    var og = this._overlayGroup; if (!og) return;
    clearChildren(og);
    var s = this._scales, hp = this.interaction.hoveredPoint, sorted = this.interaction.getSortedSelected();

    // Selected
    for (var si = 0; si < sorted.length; si++) {
      var sp = sorted[si];
      og.appendChild(svgEl('line', { x1: String(sp.x), y1: '0', x2: String(sp.x), y2: String(s.chartHeight), stroke: THEME.selectedColor, 'stroke-width': '2' }));
      og.appendChild(svgEl('circle', { cx: String(sp.x), cy: '-8', r: '6', fill: THEME.selectedColor }));
      var st = svgEl('text', { x: String(sp.x), y: '-4', 'text-anchor': 'middle', fill: 'white' });
      st.style.fontSize = '10px'; st.style.fontWeight = 'bold'; st.textContent = String(si + 1);
      og.appendChild(st);
    }

    // Hover
    if (hp) {
      og.appendChild(svgEl('line', { x1: String(hp.x), y1: '0', x2: String(hp.x), y2: String(s.chartHeight), stroke: THEME.hoverLine, 'stroke-width': '1', 'stroke-dasharray': '4,4' }));
      var ttLines = [];
      for (var di = 0; di < this.lines.length; di++) {
        var dl = this.lines[di];
        if (!this.visibleLines[dl.key]) continue;
        var dv = hp.data.values[dl.key];
        if (dv == null) continue;
        og.appendChild(svgEl('circle', { cx: String(hp.x), cy: String(s.scaleToY(dv, dl.scale)), r: '4', fill: dl.color }));
        if (ttLines.length < 4) ttLines.push(dl);
      }
      var ttH = 14 + ttLines.length * 14;
      var ttX = hp.x > s.chartWidth - 120 ? hp.x - 115 : hp.x + 8;
      var ttY = Math.min(Math.max(hp.y - 30, 0), s.chartHeight - ttH - 6);
      var tg = svgEl('g', { transform: 'translate(' + ttX + ',' + ttY + ')' }); tg.style.pointerEvents = 'none';
      tg.appendChild(svgEl('rect', { x: '0', y: '0', width: '110', height: String(ttH), rx: '4', fill: THEME.tooltipBg }));
      var ttm = svgEl('text', { x: '6', y: '14', fill: '#d1d5db' }); ttm.style.fontSize = '10px';
      ttm.textContent = formatTime(hp.data.timestamp); tg.appendChild(ttm);
      for (var ti = 0; ti < ttLines.length; ti++) {
        var tl = ttLines[ti], tv = hp.data.values[tl.key];
        var tvt = svgEl('text', { x: '6', y: String(28 + ti * 14), fill: tl.color }); tvt.style.fontSize = '10px';
        tvt.textContent = tv != null ? formatByScale(tv, tl.scale) : '-'; tg.appendChild(tvt);
      }
      og.appendChild(tg);
    }
  };

  // ── Detail Panel ─────────────────────────────────────────────────────
  ChartRenderer.prototype._renderDetail = function () {
    var self = this;
    clearChildren(this._detailEl);
    var sorted = this.interaction ? this.interaction.getSortedSelected() : [];
    var diff = this.interaction ? this.interaction.getDifferences() : null;
    var hp = this.interaction ? this.interaction.hoveredPoint : null;
    var visLines = this.lines.filter(function (l) { return self.visibleLines[l.key]; });

    var panel = htmlEl('div', {
      marginTop: '8px', padding: '8px 12px', borderRadius: '8px', fontSize: '12px',
      background: THEME.panelBg, minHeight: '72px', overflowX: 'auto', fontFamily: THEME.font, color: THEME.text,
    });

    var findClickable = function () {
      for (var i = 0; i < visLines.length; i++) { if (visLines[i].scale === 'price' && !visLines[i].dotted) return visLines[i]; }
      return null;
    };

    if (sorted.length === 2 && diff) {
      var clickable = findClickable();
      var cr = htmlEl('div', { display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' });
      cr.appendChild(self._makeClearBtn());
      panel.appendChild(cr);
      panel.appendChild(self._buildTable(visLines, sorted, diff, clickable));
    } else if (sorted.length === 1) {
      var clickable1 = findClickable();
      var hr = htmlEl('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' });
      hr.appendChild(htmlEl('span', { color: THEME.muted }, 'Click another point to compare'));
      hr.appendChild(self._makeClearBtn());
      panel.appendChild(hr);
      panel.appendChild(self._buildSingleRow(visLines, sorted[0], clickable1));
    } else if (hp) {
      panel.appendChild(self._buildSingleRow(visLines, hp, null));
    } else {
      var ed = htmlEl('div', { color: THEME.muted, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 0', gap: '6px' });
      ed.appendChild(htmlEl('span', null, 'Click chart to select points'));
      var od = htmlEl('div', { display: 'flex', alignItems: 'center', gap: '4px' });
      od.appendChild(htmlEl('span', null, 'or select'));
      var ob = htmlEl('button', {
        padding: '2px 6px', borderRadius: '4px', border: '1px solid ' + THEME.border,
        background: 'transparent', color: THEME.text, cursor: 'pointer', fontSize: '12px', fontFamily: THEME.font,
      }, 'Oldest \u2194 Newest');
      ob.onmouseenter = function () { ob.style.borderColor = THEME.text; ob.style.background = THEME.panelBg; };
      ob.onmouseleave = function () { ob.style.borderColor = THEME.border; ob.style.background = 'transparent'; };
      ob.onclick = function () { self.interaction.selectOldestToNewest(); };
      od.appendChild(ob); ed.appendChild(od); panel.appendChild(ed);
    }
    this._detailEl.appendChild(panel);
  };

  ChartRenderer.prototype._makeClearBtn = function () {
    var self = this;
    var btn = htmlEl('button', {
      padding: '2px 8px', borderRadius: '4px', background: THEME.bg, border: 'none',
      color: THEME.muted, cursor: 'pointer', fontSize: '12px', fontFamily: THEME.font,
      display: 'flex', alignItems: 'center', gap: '4px',
    });
    btn.appendChild(htmlEl('span', null, 'Clear'));
    btn.appendChild(htmlEl('span', { fontSize: '14px', lineHeight: '1' }, '\u2715'));
    btn.onmouseenter = function () { btn.style.color = THEME.diffNegative; };
    btn.onmouseleave = function () { btn.style.color = THEME.muted; };
    btn.onclick = function () { self.interaction.clearSelection(); };
    return btn;
  };

  // ── Table builders ───────────────────────────────────────────────────
  ChartRenderer.prototype._buildTable = function (visLines, sorted, diff, clickable) {
    var self = this;
    var tbl = htmlEl('table', { width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums', tableLayout: 'fixed' });
    var thead = htmlEl('thead'), htr = htmlEl('tr');
    htr.appendChild(htmlEl('th', { textAlign: 'left', fontWeight: 'normal', paddingRight: '16px', width: '24px', color: THEME.muted }));
    htr.appendChild(htmlEl('th', { textAlign: 'left', fontWeight: 'normal', paddingRight: '16px', minWidth: '100px', color: THEME.muted }, 'Time'));
    visLines.forEach(function (l) { htr.appendChild(htmlEl('th', { textAlign: 'right', fontWeight: 'normal', padding: '0 8px', width: '120px', color: THEME.muted }, l.label)); });
    thead.appendChild(htr); tbl.appendChild(thead);

    var tbody = htmlEl('tbody');
    tbody.appendChild(this._buildDataRow('\u2460', sorted[0], visLines, clickable));

    // Diff row
    var dtr = htmlEl('tr', { borderTop: '1px solid ' + THEME.border + '80', borderBottom: '1px solid ' + THEME.border + '80' });
    dtr.appendChild(htmlEl('td', { color: THEME.muted, fontWeight: '500', padding: '4px 0' }, '\u0394'));
    dtr.appendChild(htmlEl('td', { paddingRight: '16px', padding: '4px 0' }, diff.timeDiff));
    visLines.forEach(function (l) {
      var d = diff.values[l.key] || 0, color = d >= 0 ? THEME.diffPositive : THEME.diffNegative, sign = d >= 0 ? '+' : '';
      var td = htmlEl('td', { textAlign: 'right', padding: '4px 8px', color: color });
      td.appendChild(htmlEl('span', null, sign + formatByScale(d, l.scale)));
      if (l.scale === 'krw' && diff.perDay[l.key] != null) {
        td.appendChild(document.createElement('br'));
        var pd = diff.perDay[l.key];
        td.appendChild(htmlEl('span', { color: THEME.muted, fontSize: '10px' }, (pd >= 0 ? '+' : '') + formatByScale(pd, l.scale) + '/d'));
      }
      dtr.appendChild(td);
    });
    tbody.appendChild(dtr);
    tbody.appendChild(this._buildDataRow('\u2461', sorted[1], visLines, clickable));
    tbl.appendChild(tbody);
    return tbl;
  };

  ChartRenderer.prototype._buildDataRow = function (marker, point, visLines, clickable) {
    var self = this;
    var tr = htmlEl('tr');
    tr.appendChild(htmlEl('td', { color: THEME.selectedColor, fontWeight: '500' }, marker));
    tr.appendChild(htmlEl('td', { fontWeight: '500', paddingRight: '16px' }, formatTime(point.data.timestamp)));
    visLines.forEach(function (l) {
      var v = point.data.values[l.key];
      var td = htmlEl('td', { textAlign: 'right', padding: '0 8px' });
      if (v == null) { td.textContent = '-'; }
      else if (clickable && l.key === clickable.key) {
        var btn = htmlEl('button', {
          padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(234,179,8,0.3)',
          background: 'transparent', color: l.color, cursor: 'pointer', fontSize: '12px', fontFamily: THEME.font,
        }, formatByScale(v, l.scale));
        btn.onmouseenter = function () { btn.style.borderColor = '#eab308'; btn.style.background = 'rgba(234,179,8,0.1)'; };
        btn.onmouseleave = function () { btn.style.borderColor = 'rgba(234,179,8,0.3)'; btn.style.background = 'transparent'; };
        btn.onclick = function () { self.interaction.selectByValue(l.key, v); };
        td.appendChild(btn);
      } else { td.style.color = l.color; td.textContent = formatByScale(v, l.scale); }
      tr.appendChild(td);
    });
    return tr;
  };

  ChartRenderer.prototype._buildSingleRow = function (visLines, point, clickable) {
    var tbl = htmlEl('table', { width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums', tableLayout: 'fixed' });
    var thead = htmlEl('thead'), htr = htmlEl('tr');
    htr.appendChild(htmlEl('th', { textAlign: 'left', fontWeight: 'normal', paddingRight: '16px', width: '24px', color: THEME.muted }));
    htr.appendChild(htmlEl('th', { textAlign: 'left', fontWeight: 'normal', paddingRight: '16px', minWidth: '100px', color: THEME.muted }, 'Time'));
    visLines.forEach(function (l) { htr.appendChild(htmlEl('th', { textAlign: 'right', fontWeight: 'normal', padding: '0 8px', width: '120px', color: THEME.muted }, l.label)); });
    thead.appendChild(htr); tbl.appendChild(thead);
    var tbody = htmlEl('tbody');
    tbody.appendChild(this._buildDataRow('\u2460', point, visLines, clickable));
    tbl.appendChild(tbody);
    return tbl;
  };

  // ── Monthly Reports ──────────────────────────────────────────────────
  ChartRenderer.prototype._renderMonthlyReports = function () {
    clearChildren(this._reportsEl);
    if (!this.monthlyReports || this.monthlyReports.length === 0) return;

    var panel = htmlEl('div', {
      marginTop: '12px', padding: '12px', borderRadius: '8px',
      background: THEME.panelBg, fontFamily: THEME.font, color: THEME.text, fontSize: '12px',
    });

    var title = htmlEl('div', {
      fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: THEME.text,
    }, 'Monthly Reports');
    panel.appendChild(title);

    var tbl = htmlEl('table', {
      width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums', fontSize: '11px',
    });

    // Header
    var thead = htmlEl('thead');
    var htr = htmlEl('tr', { borderBottom: '1px solid ' + THEME.border });
    var headers = ['Month', 'PnL', 'PnL %', 'Start', 'End', 'Price O→C', 'Price L~H', 'Avg Alloc', 'Points'];
    headers.forEach(function (h) {
      var th = htmlEl('th', {
        textAlign: h === 'Month' ? 'left' : 'right', fontWeight: 'normal',
        padding: '4px 6px', color: THEME.muted, whiteSpace: 'nowrap',
      }, h);
      htr.appendChild(th);
    });
    thead.appendChild(htr);
    tbl.appendChild(thead);

    // Body — newest first
    var tbody = htmlEl('tbody');
    var reports = this.monthlyReports.slice().reverse();
    var self = this;

    reports.forEach(function (r) {
      var s = r.snapshot;
      if (!s) return;
      var tr = htmlEl('tr', { borderBottom: '1px solid ' + THEME.border + '60' });
      tr.onmouseenter = function () { tr.style.background = THEME.bg; };
      tr.onmouseleave = function () { tr.style.background = 'transparent'; };

      // Make month clickable to set date filter
      var monthTd = htmlEl('td', { padding: '4px 6px', whiteSpace: 'nowrap' });
      var monthBtn = htmlEl('button', {
        padding: '1px 4px', borderRadius: '3px', border: '1px solid ' + THEME.border,
        background: 'transparent', color: THEME.text, cursor: 'pointer',
        fontSize: '11px', fontFamily: THEME.font,
      }, r.year + '-' + String(r.month).padStart(2, '0'));
      monthBtn.onmouseenter = function () { monthBtn.style.borderColor = '#3b82f6'; monthBtn.style.color = '#3b82f6'; };
      monthBtn.onmouseleave = function () { monthBtn.style.borderColor = THEME.border; monthBtn.style.color = THEME.text; };
      monthBtn.onclick = function () {
        var y = r.year, m = r.month;
        self._activeRange = '';
        self._dateStart = y + '-' + String(m).padStart(2, '0') + '-01';
        var lastDay = new Date(y, m, 0).getDate();
        self._dateEnd = y + '-' + String(m).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');
        self._applyFilters();
        self._renderToolbar();
      };
      monthTd.appendChild(monthBtn);
      tr.appendChild(monthTd);

      var hasAdj = s.adjustedPnlKrw != null;
      var pnlKrw = hasAdj ? s.adjustedPnlKrw : s.pnlKrw;
      var pnlPct = hasAdj ? s.adjustedPnlPercent : s.pnlPercent;
      var pnlColor = pnlKrw >= 0 ? THEME.diffPositive : THEME.diffNegative;
      var pnlSign = pnlKrw >= 0 ? '+' : '';

      // PnL KRW
      var pnlTd = htmlEl('td', { textAlign: 'right', padding: '4px 6px', color: pnlColor, whiteSpace: 'nowrap' },
        pnlSign + Math.round(pnlKrw).toLocaleString());
      if (hasAdj) { pnlTd.title = 'Adjusted (D/W offset: ' + Math.round(s.depositWithdrawalOffsetKrw).toLocaleString() + ')'; }
      tr.appendChild(pnlTd);

      // PnL %
      tr.appendChild(htmlEl('td', { textAlign: 'right', padding: '4px 6px', color: pnlColor, whiteSpace: 'nowrap' },
        pnlSign + pnlPct.toFixed(2) + '%'));

      // Start / End
      tr.appendChild(htmlEl('td', { textAlign: 'right', padding: '4px 6px', whiteSpace: 'nowrap' },
        '\u20A9' + Math.round(s.startTotalKrw).toLocaleString()));
      tr.appendChild(htmlEl('td', { textAlign: 'right', padding: '4px 6px', whiteSpace: 'nowrap' },
        '\u20A9' + Math.round(s.endTotalKrw).toLocaleString()));

      // Price O→C
      var priceDelta = s.endPrice - s.startPrice;
      var priceColor = priceDelta >= 0 ? THEME.diffPositive : THEME.diffNegative;
      var priceTd = htmlEl('td', { textAlign: 'right', padding: '4px 6px', whiteSpace: 'nowrap' });
      priceTd.appendChild(htmlEl('span', null, s.startPrice.toLocaleString() + '\u2192' + s.endPrice.toLocaleString()));
      priceTd.appendChild(htmlEl('span', { color: priceColor, marginLeft: '3px' },
        '(' + (priceDelta >= 0 ? '+' : '') + priceDelta + ')'));
      tr.appendChild(priceTd);

      // Price L~H
      tr.appendChild(htmlEl('td', { textAlign: 'right', padding: '4px 6px', color: THEME.muted, whiteSpace: 'nowrap' },
        s.minPrice.toLocaleString() + '~' + s.maxPrice.toLocaleString()));

      // Avg Alloc
      tr.appendChild(htmlEl('td', { textAlign: 'right', padding: '4px 6px', whiteSpace: 'nowrap' },
        s.avgShortRatio != null ? (s.avgShortRatio * 100).toFixed(1) + '%' : '-'));

      // Data points
      tr.appendChild(htmlEl('td', { textAlign: 'right', padding: '4px 6px', color: THEME.muted, whiteSpace: 'nowrap' },
        s.dataPointCount.toLocaleString()));

      tbody.appendChild(tr);
    });

    tbl.appendChild(tbody);

    // Totals row
    var totalPnl = 0, firstStart = null, lastEnd = null;
    this.monthlyReports.forEach(function (r) {
      if (!r.snapshot) return;
      var s = r.snapshot;
      totalPnl += (s.adjustedPnlKrw != null ? s.adjustedPnlKrw : s.pnlKrw);
      if (firstStart === null) firstStart = s.startTotalKrw;
      lastEnd = s.endTotalKrw;
    });
    var totalPct = firstStart ? (totalPnl / firstStart) * 100 : 0;
    var totColor = totalPnl >= 0 ? THEME.diffPositive : THEME.diffNegative;
    var totSign = totalPnl >= 0 ? '+' : '';

    var tfoot = htmlEl('tfoot');
    var ftr = htmlEl('tr', { borderTop: '2px solid ' + THEME.border });
    ftr.appendChild(htmlEl('td', { padding: '4px 6px', fontWeight: '600' }, 'Total'));
    ftr.appendChild(htmlEl('td', { textAlign: 'right', padding: '4px 6px', color: totColor, fontWeight: '600' },
      totSign + Math.round(totalPnl).toLocaleString()));
    ftr.appendChild(htmlEl('td'));
    // Empty cells for remaining columns
    for (var fi = 0; fi < 6; fi++) ftr.appendChild(htmlEl('td'));
    tfoot.appendChild(ftr);
    tbl.appendChild(tfoot);

    var scrollWrap = htmlEl('div', { overflowX: 'auto' });
    scrollWrap.appendChild(tbl);
    panel.appendChild(scrollWrap);
    this._reportsEl.appendChild(panel);
  };

  ChartRenderer.prototype._renderDWList = function () {
    clearChildren(this._dwListEl);
    if (!this.depositWithdrawals || this.depositWithdrawals.length === 0) return;

    var panel = htmlEl('div', {
      marginTop: '12px', padding: '12px', borderRadius: '8px',
      background: THEME.panelBg, fontFamily: THEME.font, color: THEME.text, fontSize: '12px',
    });

    var title = htmlEl('div', {
      fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: THEME.text,
    }, 'Deposits & Withdrawals');
    panel.appendChild(title);

    var tbl = htmlEl('table', {
      width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums', fontSize: '11px',
    });

    var thead = htmlEl('thead');
    var htr = htmlEl('tr', { borderBottom: '1px solid ' + THEME.border });
    ['Date', 'Type', 'Amount', 'Memo'].forEach(function (h) {
      var th = htmlEl('th', {
        textAlign: h === 'Date' || h === 'Type' || h === 'Memo' ? 'left' : 'right',
        fontWeight: 'normal', padding: '4px 6px', color: THEME.muted, whiteSpace: 'nowrap',
      }, h);
      htr.appendChild(th);
    });
    thead.appendChild(htr);
    tbl.appendChild(thead);

    var tbody = htmlEl('tbody');
    var sorted = this.depositWithdrawals.slice().sort(function (a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    sorted.forEach(function (dw) {
      var tr = htmlEl('tr', { borderBottom: '1px solid ' + THEME.border + '60' });
      tr.onmouseenter = function () { tr.style.background = THEME.bg; };
      tr.onmouseleave = function () { tr.style.background = 'transparent'; };

      var d = new Date(dw.timestamp);
      var dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      tr.appendChild(htmlEl('td', { padding: '4px 6px', whiteSpace: 'nowrap' }, dateStr));

      var isDeposit = dw.type === 'DEPOSIT';
      tr.appendChild(htmlEl('td', {
        padding: '4px 6px', whiteSpace: 'nowrap',
        color: isDeposit ? THEME.diffPositive : THEME.diffNegative,
      }, isDeposit ? 'Deposit' : 'Withdrawal'));

      var sign = isDeposit ? '+' : '-';
      var amtStr = sign + Number(dw.amount).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' ' + dw.currency;
      tr.appendChild(htmlEl('td', {
        textAlign: 'right', padding: '4px 6px', whiteSpace: 'nowrap',
        color: isDeposit ? THEME.diffPositive : THEME.diffNegative,
      }, amtStr));

      tr.appendChild(htmlEl('td', {
        padding: '4px 6px', color: THEME.muted, whiteSpace: 'nowrap',
      }, dw.memo || ''));

      tbody.appendChild(tr);
    });

    tbl.appendChild(tbody);
    var scrollWrap = htmlEl('div', { overflowX: 'auto' });
    scrollWrap.appendChild(tbl);
    panel.appendChild(scrollWrap);
    this._dwListEl.appendChild(panel);
  };

  ChartRenderer.prototype.destroy = function () {
    if (this._observer) this._observer.disconnect();
    if (this.container) clearChildren(this.container);
  };

  // ── Public API ───────────────────────────────────────────────────────
  return {
    render: function (containerId, dataOrUrl, options) {
      var opts = options || {};
      if (typeof dataOrUrl === 'string') {
        fetch(dataOrUrl).then(function (r) {
          if (!r.ok) throw new Error('Failed to load ' + dataOrUrl + ': ' + r.status);
          return r.json();
        }).then(function (config) {
          config.height = opts.height || config.height;
          return new ChartRenderer(containerId, config);
        }).catch(function (err) {
          var el = document.getElementById(containerId);
          if (el) { el.style.color = '#ef4444'; el.style.padding = '16px'; el.textContent = 'Error: ' + err.message; }
          console.error('[StrategyChart]', err);
        });
      } else {
        var config = Object.assign({}, dataOrUrl);
        config.height = opts.height || config.height;
        return new ChartRenderer(containerId, config);
      }
    },
  };
})();
