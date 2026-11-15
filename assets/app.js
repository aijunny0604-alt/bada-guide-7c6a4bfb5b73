/* 뿌이의 스톤에이지(바다 가이드) — tools/make-guide-site.py 가 data/*.js 와 함께 복사한다. 손으로 고친 뒤에는 도구의 tools/guide-site/app.js 를 고친다. */
(function () {
  'use strict';
  var SA = window.SA || {};
  var M = SA.meta || {}, A = SA.atlas || { sheets: {}, k: {} }, GD = SA.guide || {}, H = SA.hunts || { hunts: [] },
    Q = SA.quests || { quests: [], exchanges: [], systems: [] }, P = SA.pets || [], R = SA.rides || [],
    IT = (SA.items || {}).items || [], SETS = (SA.items || {}).sets || [], LOG = SA.changelog || [], SC = SA.scenes || {};
  var BODY = M.body_rows || [];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var app = $('#app');
  var petById = {}, itemById = {}, huntById = {}, setBySuit = {}, rideById = {}, itemRep = {};
  P.forEach(function (p) { petById[p.id] = p; (p.alt || []).forEach(function (a) { if (!petById[a]) petById[a] = p; }); });
  IT.forEach(function (i) { itemById[i.id] = i; itemRep[i.id] = i; (i.same || []).forEach(function (s) { if (!itemRep[s]) itemRep[s] = i; }); });
  H.hunts.forEach(function (h) { huntById[h.id] = h; });
  SETS.forEach(function (s) { setBySuit[s.suit] = s; });
  R.forEach(function (r) { rideById[r.id] = r; });

  // ---------------------------------------------------------------- 공용
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { if (n == null) return '-'; n = +n; if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'; if (n >= 1e4) return Math.round(n / 1e3) + 'k'; return n.toLocaleString('ko-KR'); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem('sa-' + k)); localStorage.setItem('sa-' + k, JSON.stringify(v)); } catch (e) { return null; } }
  function spr(prefix, key, box, scale) {
    var c = A.k[prefix + ':' + key];
    if (!c) return '<span class="noimg" style="width:' + (box || 48) + 'px;height:' + Math.round((box || 48) * 0.8) + 'px">그림 없음</span>';
    var file = (A.sheets[prefix] || [])[c[0]], w = c[3], h = c[4], s = scale || 1;
    if (box) s = Math.min(s, box / w, box / h);
    return '<span class="spr" style="width:' + Math.round(w * s) + 'px;height:' + Math.round(h * s) + 'px"><i style="width:' + w + 'px;height:' + h +
      'px;background:url(img/' + file + ') -' + c[1] + 'px -' + c[2] + 'px;transform:scale(' + s + ')"></i></span>';
  }
  function petImg(img, box, sc) { return spr('cr', 'a' + img, box, sc); }
  function itemImg(img, box, sc) { return spr('ic', 'i' + img, box, sc); }
  function copyBtn(text, label) { return '<button class="copy" data-copy="' + esc(text) + '" title="복사">' + esc(label || text) + '</button>'; }
  function warp(f, x, y) { return copyBtn('[gm warp ' + f + ' ' + x + ' ' + y + ']'); }
  function toast(t) { var el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 1400); }
  function doCopy(text) {
    function fallback() { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { } ta.remove(); }
    if (navigator.clipboard && window.isSecureContext !== false) navigator.clipboard.writeText(text).catch(fallback); else fallback();
    toast('복사함: ' + text);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]');
    if (b) { e.preventDefault(); e.stopPropagation(); doCopy(b.getAttribute('data-copy')); return; }
    var go = e.target.closest('[data-go]');
    if (go && !e.target.closest('a,button,input,select')) { location.hash = go.getAttribute('data-go'); }
  });
  var TAGC = { '탑승': 'ride', '전설': 'legend', '기계': 'mech', '거대': 'giant', '신규': 'new', '8.0': 'v80', '보스': 'boss', '원작': '' };
  function tags(list) { return (list || []).map(function (t) { return '<span class="tag ' + (TAGC[t] || '') + '">' + esc(t) + '</span>'; }).join(''); }
  function rows12(r) { var s = '<span class="rows12" title="탑승 가능한 몸(왼쪽 6 남 · 오른쪽 6 여)">'; for (var i = 0; i < 12; i++) s += '<span class="' + (r.indexOf(i) >= 0 ? 'y' : '') + '"></span>'; return s + '</span>'; }
  function elemHtml(el) { return (el || '').split(' ').filter(Boolean).map(function (e) { return '<span class="elem-' + e[0] + '">' + esc(e) + '</span>'; }).join(' '); }
  function itemLink(id, name) { var it = itemRep[id]; return '<a href="#/item/' + (it ? it.id : id) + '">' + esc(name || (it ? it.n : '아이템 ' + id)) + '</a>'; }
  function petLink(id, name) { var p = petById[id]; return p ? '<a href="#/pet/' + p.id + '">' + esc(name || p.n) + '</a>' : esc(name || ('펫 ' + id)); }
  function npcPos(n) {
    if (n.x == null) return esc(n.name) + ' <span class="muted">· ' + esc(n.fname) + ' (' + n.floor + ') 위치 정보 없음</span>';
    return esc(n.name) + ' <span class="muted">· ' + esc(n.fname) + ' (' + n.floor + ' / ' + n.x + ',' + n.y + ')</span> ' + warp(n.floor, n.x, n.y);
  }
  function cw() { return Math.max(320, Math.min(app.clientWidth || 1200, 1600) - 8); }
  function perRow(per) { per = per || 2; var w = cw(); return w >= 1700 ? per + 1 : w >= 1400 && per >= 2 ? per + 0.5 : per; }   // 넓은 화면은 한 줄에 더 놓는다(빈 칸 줄이기)
  function bigScale(per) { return Math.max(0.42, Math.min(1.35, (cw() / perRow(per) - 16) / 640)); }
  function halfW(per) { return Math.max(260, cw() / Math.ceil(perRow(per)) - 28); }
  function petAnim(p, box, big) {
    if (p && p.gif) {
      var w = p.gif[1], h = p.gif[2], sc = Math.min(big ? 3 : 1.5, box / w, box / h);
      if (!big) sc = Math.min(sc, 1);
      return '<img class="gif" loading="lazy" src="' + p.gif[0] + '" width="' + Math.round(w * sc) + '" height="' + Math.round(h * sc) + '" alt="' + esc(p.n || '') + '">';
    }
    return p ? petImg(p.img, box, big ? 2 : 1) : '';
  }

  // ---------------------------------------------------------------- 상단 히어로(상세 페이지 머리)
  var RBS = M.ride_bases || ['', ''];
  function RB(id) { return RBS[(+String(id).replace(/^r/, '')) % 2] || ''; }
  var EL_KO = { '지': 'earth', '수': 'water', '화': 'fire', '풍': 'wind' };
  function domEl(el) { var best = '', bv = -1; (el || '').split(' ').forEach(function (e) { var v = +e.slice(1) || 0; if (v > bv) { bv = v; best = e[0]; } }); return best; }
  function elemBars(el) {
    var m = {}; (el || '').split(' ').filter(Boolean).forEach(function (e) { m[e[0]] = +e.slice(1) || 0; });
    return '<div class="ebars">' + ['지', '수', '화', '풍'].map(function (k) { var v = m[k] || 0; return '<div class="ebar e-' + EL_KO[k] + '"><span>' + k + '</span><i><b style="width:' + v * 10 + '%"></b></i><em>' + v + '</em></div>'; }).join('') + '</div>';
  }
  function sceneBg(id) {
    var c = SC.s && SC.s[id];
    if (!c) return '';
    return '<div class="hero-bg" aria-hidden="true"><div style="width:' + SC.W + 'px;height:' + SC.H + 'px;background:url(img/' + SC.sheets[c[0]] + ') -' + c[1] + 'px -' + c[2] + 'px"></div></div>';
  }
  function hero(o) {
    return '<section class="hero el-' + (o.el || 'none') + '">' + (o.bg || '') + '<div class="hero-pic">' + (o.pic || '') + (o.picCap ? '<div class="small muted">' + o.picCap + '</div>' : '') + '</div><div class="hero-main"><h1>' + o.title + '</h1>' +
      (o.tags ? '<div class="hero-tags">' + o.tags + '</div>' : '') + (o.sub ? '<div class="hero-sub">' + o.sub + '</div>' : '') +
      (o.facts && o.facts.length ? '<dl class="hero-facts">' + o.facts.filter(function (f) { return f && f[1]; }).map(function (f) { return '<dt>' + f[0] + '</dt><dd>' + f[1] + '</dd>'; }).join('') + '</dl>' : '') +
      (o.cmds ? '<div class="hero-cmds">' + o.cmds + '</div>' : '') + '</div>' + (o.side ? '<div class="hero-side">' + o.side + '</div>' : '') + '</section>';
  }
  function bigBadge(txt, col, score, lab, extra) {
    return '<div class="hs-top"><div class="big-tier" style="background:' + col + '">' + esc(txt) + '</div>' + (score != null || extra ? '<div class="hero-score">' + (score != null ? '<b>' + score + '</b><span>' + lab + '</span>' : '') + (extra || '') + '</div>' : '') + '</div>';
  }
  function sBars(p) {
    var S = (p.roll || {}).s, mx = M.l100max || [600, 600, 600, 600], lab = ['체력', '공격', '방어', '순발'];
    if (!S) return '';
    return '<div class="sbars"><div class="hs-cap">S급 Lv100 능력</div>' + S.l100.map(function (v, k) { return '<div class="sbar"><span>' + lab[k] + '</span><i><b style="width:' + Math.min(100, v / mx[k] * 100) + '%"></b></i><em>' + v + '</em></div>'; }).join('') + '</div>';
  }

  // ---------------------------------------------------------------- NPC 그림(움직임·크게 보기)
  var NPCS = [];
  var NROLE = { npcgen_shop: '상점', npcgen_limitshop: '상점', airplane: '비행선', transman: '순간이동사', itemchange: '교환', npc_transmigration: '환생', npcgen_savepoint: '기록', npcgen_healer: '간호사', npcgen_petskillshop: '펫 기술', npcgen_poolitemshop: '창고' };
  function npcGif(g) { return (A.npcgif || {})[g]; }
  function npcPic(n, box, role) {
    if (!n || !n.g) return '';
    var gf = npcGif(n.g), k = NPCS.push({ n: n, role: role || '' }) - 1, inner;
    if (gf) { var sc = Math.min(3, (box || 96) / gf[1], (box || 96) / gf[2]); sc = sc >= 1 ? Math.max(1, Math.floor(sc * 2) / 2) : sc; inner = '<img class="gif" loading="lazy" src="' + gf[0] + '" width="' + Math.round(gf[1] * sc) + '" height="' + Math.round(gf[2] * sc) + '" alt="' + esc(n.name || '') + '">'; }
    else inner = n.g >= 100000 ? spr('cr', 'a' + n.g, box, 2) : (A.k['ic:i' + n.g] ? spr('ic', 'i' + n.g, box, 2) : '');
    if (!inner) return '';
    return '<button class="npc-pic" data-npc="' + k + '" title="' + esc(n.name || '') + ' — 크게 보기" style="min-width:' + Math.round((box || 96) * 0.8) + 'px;min-height:' + Math.round((box || 96) * 0.8) + 'px">' + inner + '</button>';
  }
  function openNpc(k) {
    var o = NPCS[k]; if (!o) return;
    var n = o.n, gf = npcGif(n.g), n0 = FIGS.length;
    var pic = gf ? '<img class="gif" src="' + gf[0] + '" width="' + Math.round(gf[1] * Math.min(4, 280 / gf[1], 280 / gf[2])) + '" alt="">' : npcPic(n, 220);
    var t = (GD.towns || []).filter(function (x) { return x.floor === n.floor; })[0], ti = (GD.towns || []).indexOf(t);
    var html = '<div class="npc-box"><div class="npc-big">' + pic + '</div><div><h2>' + esc(n.name) + '</h2><dl class="hero-facts">' + (o.role ? '<dt>하는 일</dt><dd>' + esc(o.role) + '</dd>' : '') +
      '<dt>장소</dt><dd>' + esc(n.fname || '') + ' <span class="muted">(' + n.floor + (n.x != null ? ' / ' + n.x + ',' + n.y : '') + ')</span></dd>' + (n.x != null ? '<dt>GM 이동</dt><dd>' + warp(n.floor, n.x, n.y + 1) + '</dd>' : '') +
      '<dt>그림 번호</dt><dd>' + n.g + '</dd>' + (t ? '<dt>가는 길</dt><dd><a href="#/town/' + ti + '">' + esc(t.name) + ' 가는 길</a></dd>' : '') + '</dl></div></div>' +
      (n.x != null ? '<div class="figs">' + (SC.mm && SC.mm[n.floor] ? mmHtml(n.floor, [{ x: n.x, y: n.y, k: 'npc', t: n.name }], null, n.name + ' 위치', Math.min(innerWidth - 70, 740)) : '') + '</div>' : '');
    FIGS.length = n0;
    $('#modalBody').className = 'modal npc-modal';
    $('#modalBody').innerHTML = '<button class="icon-btn x npc-x" id="mx" title="닫기">✕</button>' + html;
    LB.k = -1; $('#modal').hidden = false;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-npc]');
    if (b) { e.preventDefault(); e.stopPropagation(); openNpc(+b.getAttribute('data-npc')); }
  }, true);

  // ---------------------------------------------------------------- 장면(게임 화면 같은 그림)·미니맵
  var KCOL = { npc: '#ff3b30', boss: '#ff3b30', arrive: '#2ecc71', heal: '#ff6fb5', portal: '#a970ff', warp: '#35d0ff' };
  function svgLabel(x, y, n, t, col, W, H, small) {
    var fs = small ? 11 : 15, tw = Math.round(t.length * fs * 0.95) + 14 + (n ? fs + 6 : 0), th = fs + 10;
    var lx = Math.max(2, Math.min(W - tw - 2, x - tw / 2)), ly = y - th - (small ? 8 : 40);
    if (ly < 2) ly = y + (small ? 8 : 12);
    var s = '<rect x="' + lx + '" y="' + ly + '" width="' + tw + '" height="' + th + '" rx="' + th / 2 + '" fill="rgba(0,0,0,.72)" stroke="' + col + '" stroke-width="1.5"/>';
    var tx = lx + 7;
    if (n) {
      s += '<circle cx="' + (tx + fs / 2) + '" cy="' + (ly + th / 2) + '" r="' + (fs / 2 + 2) + '" fill="' + col + '"/><text x="' + (tx + fs / 2) + '" y="' + (ly + th / 2 + fs * 0.36) +
        '" fill="#fff" text-anchor="middle" style="font-size:' + (fs - 2) + 'px">' + n + '</text>';
      tx += fs + 6;
    }
    return s + '<text x="' + tx + '" y="' + (ly + th / 2 + fs * 0.36) + '" fill="#fff" style="font-size:' + fs + 'px">' + esc(t) + '</text>';
  }
  function arrow(x1, y1, x2, y2, col, w) {
    var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / L, uy = dy / L, hl = (w || 4) * 3.5, hx = x2 - ux * hl, hy = y2 - uy * hl;
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + hx + '" y2="' + hy + '" stroke="' + col + '" stroke-width="' + (w || 4) + '" stroke-dasharray="' + (w || 4) * 2.5 + ' ' + (w || 4) * 1.5 + '" stroke-linecap="round"/>' +
      '<polygon points="' + x2 + ',' + y2 + ' ' + (hx - uy * hl * 0.6) + ',' + (hy + ux * hl * 0.6) + ' ' + (hx + uy * hl * 0.6) + ',' + (hy - ux * hl * 0.6) + '" fill="' + col + '"/>';
  }
  function sceneSvg(c, marks) {
    var W = SC.W, Hh = SC.H, out = '', pts = [];
    (marks || []).forEach(function (m) {
      var x = c[3] + 32 * (m.x - m.y), y = c[4] + 16 * (m.x + m.y);
      if (x < -20 || x > W + 20 || y < -20 || y > Hh + 60) return;
      pts.push([m, x, y]);
    });
    var arr = pts.filter(function (p) { return p[0].k === 'arrive'; })[0], tgt = pts.filter(function (p) { return p[0].k !== 'arrive'; })[0];
    if (arr && tgt && Math.abs(arr[1] - tgt[1]) + Math.abs(arr[2] - tgt[2]) > 60) out += arrow(arr[1], arr[2] - 10, tgt[1], tgt[2] - 30, '#ffd400');
    pts.forEach(function (p) {
      var m = p[0], col = KCOL[m.k] || '#ff3b30', big = m.k === 'npc' || m.k === 'boss';
      out += m.k === 'arrive' ? '<ellipse cx="' + p[1] + '" cy="' + p[2] + '" rx="26" ry="13" fill="none" stroke="' + col + '" stroke-width="4"/>' :
        '<ellipse cx="' + p[1] + '" cy="' + (p[2] - 30) + '" rx="' + (big ? 34 : 26) + '" ry="' + (big ? 44 : 34) + '" fill="none" stroke="' + col + '" stroke-width="' + (big ? 5 : 3) + '"/>';
    });
    pts.forEach(function (p) { var m = p[0]; out += svgLabel(p[1], p[2] - (m.k === 'arrive' ? 0 : 30), m.n, m.t || '', KCOL[m.k] || '#ff3b30', W, Hh); });
    return out;
  }
  var FIGS = [];
  function sceneHtml(id, marks, cap, scale) {
    var c = SC.s && SC.s[id];
    if (!c) return '';
    var sc = scale || 0.5, W = SC.W, Hh = SC.H, k = FIGS.push({ t: 's', id: id, marks: marks, cap: cap }) - 1;
    return '<div class="fig"><div class="scene" data-fig="' + k + '" style="width:' + Math.round(W * sc) + 'px;height:' + Math.round(Hh * sc) + 'px" title="클릭하면 크게"><div class="bg" style="width:' + W + 'px;height:' + Hh + 'px;background:url(img/' + SC.sheets[c[0]] + ') -' + c[1] + 'px -' + c[2] +
      'px;transform:scale(' + sc + ')"></div><svg viewBox="0 0 ' + W + ' ' + Hh + '">' + sceneSvg(c, marks) + '</svg></div>' + (cap ? '<span class="cap">' + esc(cap) + '</span>' : '') + '</div>';
  }
  // 미니맵 위 지명·워프·NPC 이름표. lab = 화면 px / SVG 단위. occ = 이미 쓴 자리[[x,y,w,h]](SVG 단위). box = 보이는 범위.
  var LCOL = { warp: '#5fdcff', heal: '#ff8fc8', shop: '#ffd27a', portal: '#c9a6ff', npc: '#ffffff', boss: '#ff7a6e', hunt: '#9dff8a' };
  function textW(t, fs) { var w = 0; for (var i = 0; i < t.length; i++) w += t.charCodeAt(i) > 0x2e80 ? fs * 1.0 : fs * 0.58; return w; }
  function hit(r, occ) { for (var i = 0; i < occ.length; i++) { var o = occ[i]; if (r[0] < o[0] + o[2] && o[0] < r[0] + r[2] && r[1] < o[1] + o[3] && o[1] < r[1] + r[3]) return true; } return false; }
  function placeLabels(c, fl, lab, box, occ, skip) {
    var L = (SC.lab || {})[fl];
    if (!L || !L.length) return '';
    var q = c[5], hm = c[6], fs = (lab < 1 ? 10.5 : 11.5) / lab, out = '', dots = '', drawn = 0;
    var P = function (x, y) { return [q * (x - y + hm), q * (x + y + 1) / 2]; };
    var list = L.slice().sort(function (a, b) { return a[4] - b[4]; });
    list.forEach(function (l) {
      if (skip && skip[l[0] + ',' + l[1]]) return;
      var a = P(l[0], l[1]);
      if (a[0] < box[0] || a[1] < box[1] || a[0] > box[0] + box[2] || a[1] > box[1] + box[3]) return;
      var t = l[2], w = textW(t, fs) + 4 / lab, h = fs * 1.25, g = 4 / lab;
      var cand = [[a[0] + g, a[1] - h / 2], [a[0] - g - w, a[1] - h / 2], [a[0] - w / 2, a[1] - g - h], [a[0] - w / 2, a[1] + g]];
      for (var i = 0; i < cand.length; i++) {
        var r = [cand[i][0], cand[i][1], w, h];
        if (r[0] < box[0] || r[1] < box[1] || r[0] + w > box[0] + box[2] || r[1] + h > box[1] + box[3] || hit(r, occ)) continue;
        occ.push(r);
        var col = LCOL[l[3]] || '#fff';
        dots += '<circle cx="' + a[0].toFixed(1) + '" cy="' + a[1].toFixed(1) + '" r="' + (2.6 / lab).toFixed(2) + '" fill="' + col + '" stroke="#000" stroke-width="' + (0.8 / lab).toFixed(2) + '"/>';
        out += '<text class="ml" x="' + (r[0] + 2 / lab).toFixed(1) + '" y="' + (r[1] + h * 0.8).toFixed(1) + '" fill="' + col + '" stroke-width="' + (3 / lab).toFixed(2) + '" style="font-size:' + fs.toFixed(2) + 'px">' + esc(t) + '</text>';
        drawn++;
        return;
      }
    });
    return dots + out;
  }
  function pillRect(x, y, n, t, W, H, small) {
    var fs = small ? 11 : 15, tw = Math.round(t.length * fs * 0.95) + 14 + (n ? fs + 6 : 0), th = fs + 10;
    var lx = Math.max(2, Math.min(W - tw - 2, x - tw / 2)), ly = y - th - (small ? 8 : 40);
    if (ly < 2) ly = y + (small ? 8 : 12);
    return [lx, ly, tw, th];
  }
  function fname(f) { return (SC.fn && SC.fn[f]) || nmFloor(f); }
  function mmTitle(f, w) { return '<div class="mm-title" style="max-width:' + Math.max(160, Math.round(w)) + 'px"><b>' + esc(fname(f)) + '</b> <span>· ' + f + '</span></div>'; }
  function mmSvg(c, fl, marks, arrive, lab) {
    var q = c[5], hm = c[6], w = c[3], hh = c[4], out = '';
    var P = function (x, y) { return [q * (x - y + hm), q * (x + y + 1) / 2]; };
    ((SC.warps || {})[fl] || []).forEach(function (p) { var a = P(p[0], p[1]); out += '<circle cx="' + a[0] + '" cy="' + a[1] + '" r="' + 2.4 / lab + '" fill="#35d0ff" opacity=".85"/>'; });
    var tg = (marks || []).filter(function (m) { return m.k !== 'arrive'; })[0];
    if (arrive && tg) {
      var a = P(arrive[0], arrive[1]), b = P(tg.x, tg.y);
      if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) > 12 / lab) out += arrow(a[0], a[1], b[0], b[1], '#ffd400', 2.5 / lab);
      out += '<circle cx="' + a[0] + '" cy="' + a[1] + '" r="' + 5 / lab + '" fill="#2ecc71" stroke="#000" stroke-width="' + 1 / lab + '"/>';
    }
    (marks || []).forEach(function (m) {
      var a = P(m.x, m.y), col = KCOL[m.k] || '#ff3b30';
      out += '<circle cx="' + a[0] + '" cy="' + a[1] + '" r="' + 6 / lab + '" fill="' + col + '" stroke="#fff" stroke-width="' + 1.5 / lab + '"/>';
    });
    var occ = [], skip = {};
    (marks || []).forEach(function (m) { var a = P(m.x, m.y); skip[m.x + ',' + m.y] = 1; occ.push([a[0] - 7 / lab, a[1] - 7 / lab, 14 / lab, 14 / lab]); if (lab >= 0.6) occ.push(pillRect(a[0], a[1], m.n, m.t || '', w, hh, true)); });
    var ml = placeLabels(c, fl, lab, [0, 0, w, hh], occ, skip);
    if (lab >= 0.6) (marks || []).forEach(function (m) { var a = P(m.x, m.y); out += svgLabel(a[0], a[1], m.n, m.t || '', KCOL[m.k] || '#ff3b30', w, hh, true); });
    return ml + out;
  }
  function mmHtml(fl, marks, arrive, cap, maxw) {
    var c = SC.mm && SC.mm[fl];
    if (!c) return '';
    var w = c[3], hh = c[4], sc = Math.min(2.5, (maxw || 300) / w), k = FIGS.push({ t: 'm', fl: fl, marks: marks, arrive: arrive, cap: cap }) - 1;
    return '<div class="fig">' + mmTitle(fl, w * sc) + '<div class="mm" data-fig="' + k + '" style="width:' + Math.round(w * sc) + 'px;height:' + Math.round(hh * sc) + 'px" title="클릭하면 크게"><div class="bg" style="width:' + w + 'px;height:' + hh + 'px;background:url(img/' + SC.msheets[c[0]] + ') -' + c[1] + 'px -' + c[2] +
      'px;transform:scale(' + sc + ')"></div><svg viewBox="0 0 ' + w + ' ' + hh + '">' + mmSvg(c, fl, marks, arrive, sc) + '</svg></div><span class="cap">' + esc(cap || '층 전체 미니맵') + ' <span class="muted">· 하늘색 = 워프(→ 가는 곳)</span></span></div>';
  }
  var LB = { k: -1, z: 1 };
  function openFig(k) {
    var f = FIGS[k];
    if (!f) return;
    LB.k = k;
    var n0 = FIGS.length, W = innerWidth - 40, Hh = innerHeight - 120, z = LB.z;
    var html;
    if (f.t === 's') html = sceneHtml(f.id, f.marks, f.cap, Math.min(W / SC.W, Hh / SC.H) * z);
    else if (f.t === 'r') html = routeHtml([f.seg], Math.min(W, Hh * 1.6) * z, '', 20);
    else html = mmHtml(f.fl, f.marks, f.arrive, f.cap, Math.min(W, Hh * 2) * z);
    FIGS.length = n0;
    $('#modalBody').className = 'lightbox';
    $('#modalBody').innerHTML = '<div class="lb-bar"><button class="icon-btn" data-lb="prev">◀</button><span>' + (k + 1) + ' / ' + FIGS.length + '</span><button class="icon-btn" data-lb="next">▶</button>' +
      '<button class="icon-btn" data-lb="out">−</button><span>' + Math.round(z * 100) + '%</span><button class="icon-btn" data-lb="in">+</button><span class="muted small">←/→ 넘기기 · +/− 또는 휠 확대 · Esc 닫기</span><button class="icon-btn x" id="mx">✕</button></div><div class="lb-body">' + html + '</div>';
    $('#modal').hidden = false;
  }
  function lbStep(d) { if (LB.k < 0) return; var k = LB.k + d; if (k >= 0 && k < FIGS.length) openFig(k); }
  function lbZoom(f) { LB.z = Math.max(0.5, Math.min(4, LB.z * f)); openFig(LB.k); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-lb]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var a = b.getAttribute('data-lb');
    if (a === 'prev') lbStep(-1); else if (a === 'next') lbStep(1); else if (a === 'in') lbZoom(1.25); else lbZoom(0.8);
  }, true);
  document.addEventListener('keydown', function (e) {
    if ($('#modal').hidden || LB.k < 0) return;
    if (e.key === 'ArrowRight') lbStep(1); else if (e.key === 'ArrowLeft') lbStep(-1); else if (e.key === '+' || e.key === '=') lbZoom(1.25); else if (e.key === '-') lbZoom(0.8);
  });
  $('#modal').addEventListener('wheel', function (e) { if (LB.k < 0 || !e.ctrlKey && !e.altKey && !e.shiftKey && Math.abs(e.deltaY) < 1) return; if (e.ctrlKey || e.altKey) { e.preventDefault(); lbZoom(e.deltaY < 0 ? 1.15 : 0.87); } }, { passive: false });
  document.addEventListener('click', function (e) {
    if (e.target.id === 'mx' || e.target.id === 'modal') { $('#modal').hidden = true; LB.k = -1; LB.z = 1; return; }
    var f = e.target.closest('[data-fig]');
    if (f && !e.target.closest('#modal')) { e.preventDefault(); e.stopPropagation(); openFig(+f.getAttribute('data-fig')); }
  }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('#modal').hidden = true; });
  function icoItem(id, name, n) { var it = itemRep[id]; return '<a class="ico" href="#/item/' + (it ? it.id : id) + '">' + (it ? itemImg(it.img, 28) : '') + esc(name || (it ? it.n : id)) + (n > 1 ? ' x' + n : '') + '</a>'; }
  function icoPet(id, name) { var p = petById[id]; return p ? '<a class="ico" href="#/pet/' + p.id + '">' + petImg(p.img, 34) + esc(name || p.n) + '</a>' : '<span class="ico">' + esc(name || id) + '</span>'; }
  function thingIcons(list) {
    return '<span class="icons">' + (list || []).map(function (r) {
      if (r.k === 'item' && r.id) return icoItem(r.id, r.name, r.n);
      if (r.k === 'pet' && r.id) return icoPet(r.id, r.name);
      if (r.k === 'rand') return '<span class="ico">무작위 1개</span>' + (r.ids || []).slice(0, 8).map(function (i) { var it = itemRep[i]; return it ? '<a href="#/item/' + it.id + '" title="' + esc(it.n) + '">' + itemImg(it.img, 26) + '</a>' : ''; }).join('');
      if (typeof r === 'string') return '<span class="ico">' + esc(r) + '</span>';
      return '<span class="ico">' + esc(r.name) + '</span>';
    }).join('') + '</span>';
  }

  // ---------------------------------------------------------------- 마크다운(문서 절)
  function inline(s) {
    s = esc(s);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
    return s;
  }
  function md(src) {
    var L = String(src || '').split('\n'), out = [], i = 0, m;
    while (i < L.length) {
      var l = L[i];
      if (/^\s*$/.test(l)) { i++; continue; }
      if ((m = l.match(/^(#{1,6})\s+(.*)/))) { var lv = Math.min(5, m[1].length + 1); out.push('<h' + lv + '>' + inline(m[2]) + '</h' + lv + '>'); i++; continue; }
      if (/^\s*\|/.test(l)) {
        var rows = [];
        while (i < L.length && /^\s*\|/.test(L[i])) { rows.push(L[i]); i++; }
        var cells = function (r) { return r.trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); }); };
        var t = '<div class="tbl-wrap"><table>';
        rows.forEach(function (r, k) {
          if (k === 1 && /^[\s|:\-]+$/.test(r)) return;
          t += '<tr>' + cells(r).map(function (c) { return k === 0 ? '<th>' + inline(c) + '</th>' : '<td>' + inline(c) + '</td>'; }).join('') + '</tr>';
        });
        out.push(t + '</table></div>'); continue;
      }
      if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
        var ol = /^\s*\d+\./.test(l), items = [];
        while (i < L.length && (/^\s*([-*]|\d+\.)\s+/.test(L[i]) || (/^\s{2,}\S/.test(L[i]) && items.length))) {
          if (/^\s*([-*]|\d+\.)\s+/.test(L[i])) items.push(L[i].replace(/^\s*([-*]|\d+\.)\s+/, '')); else items[items.length - 1] += ' ' + L[i].trim();
          i++;
        }
        out.push((ol ? '<ol>' : '<ul>') + items.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + (ol ? '</ol>' : '</ul>')); continue;
      }
      if (/^```/.test(l)) { var code = []; i++; while (i < L.length && !/^```/.test(L[i])) { code.push(L[i]); i++; } i++; out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>'); continue; }
      var para = [];
      while (i < L.length && !/^\s*$/.test(L[i]) && !/^(#|\s*\||\s*([-*]|\d+\.)\s|```)/.test(L[i])) { para.push(L[i]); i++; }
      out.push('<p>' + inline(para.join(' ')) + '</p>');
    }
    return '<div class="md">' + out.join('') + '</div>';
  }
  function docBlock(title, open) {
    var t = (GD.docs || {})[title];
    if (!t) return '';
    return '<details class="panel"' + (open ? ' open' : '') + '><summary>' + esc(title) + ' <span class="muted small">(docs/사용법.md)</span></summary>' + md(t.replace(/^#+[^\n]*\n/, '')) + '</details>';
  }

  // ---------------------------------------------------------------- 홈
  function liveLabel() { var v = M.version || {}; return (v.live_label || v.live || '?') + '차'; }
  function verText() {
    var v = M.version || {};
    if (v.basis) return '공략 자료: ' + v.basis + ' · 라이브 ' + liveLabel();
    return '서버 자료: 저장소 ' + (v.branch || '') + ' ' + (v.head || '') + (v.dirty ? ' (작업 중 변경 포함)' : '') +
      (v.pending && v.pending.length ? ' · ' + v.pending.join('·') + '차 준비분 포함(라이브 미적용)' : '') + ' · 라이브 ' + liveLabel();
  }
  function pageHome() {
    var c = M.counts || {};
    var lv = store('lv') || '';
    var cards = [['#/start', '시작하기', '접속·명령어·포탈', (GD.cmds || []).length + '개 명령'], ['#/hunts', '사냥터·던전', '레벨대·경험치·몹·보스', c.hunts],
      ['#/quests', '퀘스트·NPC', '원작 이벤트·교환·8.0 NPC', c.quests], ['#/pets', '펫 도감', 'petmake 번호·속성·출현', c.pets],
      ['#/items', '아이템 도감', 'additem 번호·세트·얻는 곳', c.items], ['#/rides', '탑승', '몸 12종 탑승 그림', c.rides], ['#/updates', '업데이트 기록', 'CHANGELOG', c.changelog]];
    var h = '<div class="banner"><h1>뿌이의 스톤에이지 <span class="muted small">공략 가이드</span></h1><div class="muted">' + esc(verText()) + '<br>그림: ' + esc((M.runtime || '').split('/').slice(-2).join('/')) +
      ' · 이 페이지는 <code>python -I tools/make-guide-site.py</code>로 다시 만듭니다(서버 자료·문서에서 자동 생성).</div></div>';
    h += '<div class="grid home-cards">' + cards.map(function (x) { return '<div class="card home-card" data-go="' + x[0] + '"><div>' + x[1] + '</div><b>' + esc(x[3] == null ? '' : x[3]) + '</b><div class="muted small">' + x[2] + '</div></div>'; }).join('') + '</div>';
    h += '<h2>내 레벨에 맞는 사냥터</h2><div class="toolbar"><label>캐릭터 Lv <input type="number" id="myLv" min="1" max="300" value="' + esc(lv) + '"></label><span class="muted small">몹 레벨이 내 레벨 −15 ~ +5 인 곳 중 레벨업이 빠른 순</span></div><div id="recHunts"></div>';
    h += '<h2>자주 쓰는 명령</h2><div class="chips">' + ['[오토]', '[자동사냥 1]', '[일괄 1]', '[따라와]', '[귀환]', '[메뉴]', '[가방 2]', '[펫창 2]', '[gm warp 1000 50 115]', '[gm 펫탑승 1]', '[gm help all]']
      .map(function (t) { return copyBtn(t); }).join(' ') + '</div>';
    h += '<div class="home-sec"><h2>처음이라면 여기부터</h2>' + stageHtml(0, true) + '</div>';
    h += '<div class="home-sec"><h2>퀘스트 분류별 바로 가기</h2><div class="grid home-cards">' + QCATS.map(function (c) {
      var n = allQuests().filter(function (q) { return q.cat === c; }).length;
      return '<div class="card home-card" data-go="#/quests?cat=' + encodeURIComponent(c) + '"><div>' + esc(c) + '</div><b>' + n + '</b><div class="muted small">' + ({ '필수': '성장에 꼭 필요', '주요 이벤트': '희귀 펫·장비 보상', '서브': '그 밖의 부탁·수집', '커스텀': '바다 서버 전용', '8.0 NPC': '봉인해제 NPC' })[c] + '</div></div>';
    }).join('') + '<div class="card home-card" data-go="#/course"><div>코스 공략</div><b>' + STAGES.length + '단계</b><div class="muted small">Lv.1 → 300 성장 루트</div></div></div></div>';
    h += '<div class="home-sec"><h2>최근 업데이트</h2><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">' + LOG.slice(0, 3).map(function (e) {
      return '<div class="card" data-go="#/updates"><div class="muted small">' + esc(e.date) + '</div><b>' + esc(e.title) + '</b><div class="small muted">' + esc(e.body.replace(/[`*#|]/g, '').slice(0, 140)) + '…</div></div>';
    }).join('') + '</div></div>';
    app.innerHTML = h;
    var inp = $('#myLv');
    function rec() {
      var v = +inp.value; store('lv', inp.value);
      if (!v) { $('#recHunts').innerHTML = '<p class="muted">레벨을 넣으면 추천이 나옵니다.</p>'; return; }
      var list = H.hunts.filter(function (x) { var mid = (x.lo + x.hi) / 2; return mid >= v - 15 && mid <= v + 5 && x.battles; })
        .sort(function (a, b) { return a.battles - b.battles; }).slice(0, 8);
      $('#recHunts').innerHTML = list.length ? huntTable(list) : '<p class="muted">맞는 사냥터가 없습니다.</p>';
    }
    inp.addEventListener('input', rec); rec();
  }

  // ---------------------------------------------------------------- 시작하기
  function pageStart() {
    var cn = GD.connect || {};
    var h = '<h1>시작하기 · 게임 구조</h1><p class="muted">' + esc(verText()) + '</p>';
    h += '<div class="panel"><h3>1. 접속</h3><ol><li><code>work/ko-ui-preview/fresh-server/' + esc(cn.cmd) + '</code> 를 실행합니다(→ <code>' + esc(cn.exe) + '</code>).</li>' +
      '<li>서버가 꺼져 있으면 실행기에서 <b>서버 켜기</b> → ‘서버 시작 완료’를 기다립니다(바다 서버 열기.cmd).</li><li>로그인 <code>' + esc(cn.login) + '</code>, 서버 <code>' + esc(cn.addr) +
      '</code>, GM 명령 비밀번호 gm. 끝낼 때는 게임 메뉴에서 정상 종료한 뒤 서버를 끕니다.</li></ol></div>';
    // 구조
    var byCat = {};
    H.hunts.forEach(function (x) { (byCat[x.catname] = byCat[x.catname] || []).push(x); });
    h += '<div class="panel"><h3>2. 세계 구조</h3><p>거점은 <b>샴기르 마을(1000)</b>입니다. 마을 안의 포탈과 신대륙 안내원이 모든 사냥터·신대륙·봉인해제 지역으로 바로 보내 주고, 목적지마다 ‘샴기르 귀환 포탈’이 있습니다. [귀환]·ESC ‘마을로 귀환’은 마지막 기록 지점으로 돌아갑니다.</p><div class="tbl-wrap"><table><tr><th>분류</th><th>사냥터 수</th><th>몹 레벨</th></tr>' +
      Object.keys(byCat).map(function (k) { var l = byCat[k]; return '<tr><td><a href="#/hunts?cat=' + l[0].cat + '">' + esc(k) + '</a></td><td class="num">' + l.length + '</td><td>' + Math.min.apply(null, l.map(function (x) { return x.lo; })) + '~' + Math.max.apply(null, l.map(function (x) { return x.hi; })) + '</td></tr>'; }).join('') + '</table></div></div>';
    // 포탈
    var gn = GD.guide_npc || {};
    h += '<div class="panel"><h3>3. 샴기르 포탈 · 신대륙 안내원</h3><p>포탈은 밟지 않고 <b>말을 걸면</b> 창이 열립니다. 신대륙 안내원 <b>(' + gn.x + ',' + gn.y + ')</b>은 환영 아치 옆 빨간 머리 사람 모습이며, 신대륙 마을·사냥터·엔드 던전·탐험·거인의 회랑·봉인해제 지역 전부를 한 창에서 고릅니다.</p>';
    var sv = GD.shamgir_view || {};
    if ((sv.scenes || []).length) h += '<div class="figs">' + sv.scenes.slice(0, 1).map(function (s) { return sceneHtml(s.id, s.marks, s.title, Math.min(innerWidth > 1400 ? 0.8 : 0.6, (cw() - 60) / (SC.W || 640))); }).join('') + (sv.mm ? mmHtml(sv.mm.f, sv.mm.marks, null, '샴기르 전체', Math.min(innerWidth > 1400 ? 520 : 380, cw() - 60)) : '') + '</div>';
    h += '<div class="tbl-wrap"><table><tr><th>이름</th><th>샴기르 좌표</th><th>메뉴 묶음</th></tr>' + (GD.portals || []).map(function (p) {
      return '<tr><td><b>' + esc(p.title) + '</b></td><td>' + (p.pos ? p.pos.join(',') + ' ' + warp(1000, p.pos[0], p.pos[1] + 2) : '') + '</td><td class="small">' + p.groups.map(function (g) { return esc(g.name) + (g.rows.length ? ' (' + g.rows.length + ')' : ''); }).join(' · ') + '</td></tr>';
    }).join('') + '</table></div></div>';
    h += '<div class="panel"><h3>4. 마을 · 가는 법</h3><p class="muted small">샴기르 귀환 지점에서 보통 방법(고대 신전 포탈·워프·비행선·순간이동사·걷기)으로 가는 길. 카드를 누르면 층마다 미니맵 경로(노란 선)가 나옵니다.</p><div class="grid town-cards">' + (GD.towns || []).map(townCard).join('') + '</div>' +
      ((GD.town_bad || []).length ? '<p class="small"><span class="tag boss">보통 방법으로 못 감</span> ' + GD.town_bad.map(esc).join(', ') + ' — GM 이동만 가능</p>' : '') + '</div>';
    // 명령
    h += '<div class="panel"><h3>5. 채팅 명령 (대괄호까지 그대로 입력)</h3><div class="tbl-wrap"><table><tr><th>명령</th><th>예</th><th>하는 일</th></tr>' + (GD.cmds || []).map(function (c) {
      return '<tr><td><code>' + esc(c.cmd) + '</code>' + (c.ok ? '' : ' <span class="inferred">소스에서 못 찾음</span>') + '</td><td>' + copyBtn(c.ex) + '</td><td>' + esc(c.desc) + (c.usage ? '<div class="muted small">게임 안내: ' + esc(c.usage) + '</div>' : '') + '</td></tr>';
    }).join('') + '</table></div><p class="muted small">명령 문자열은 char/char_talk.c · char_page.c · bada_autohunt.c · bada_menu.c 에서 확인했습니다. [오토]·[일괄]·[배틀]·[따라와]는 혼자 사냥 모드(soloHuntBalance=1)에서 동작합니다.</p></div>';
    h += '<div class="panel"><h3>6. GM 명령 <span class="muted small">([gm 명령 인자] · 한글 이름도 됨)</span></h3><div class="toolbar"><input type="search" id="gmQ" placeholder="명령 검색 (warp, 펫, item…)"><span class="count" id="gmC"></span></div><div id="gmT"></div></div>';
    ['바다 초보자 안내', '처음 할 일', '채팅 명령', '펫 창 순서와 출전', '기본 오토 사냥', '가방·펫창 페이지', 'GM 메뉴'].forEach(function (t) { h += docBlock(t); });
    app.innerHTML = h;
    var top = ['petmake', 'additem', 'warp', 'level', 'gold', 'help', 'hp', 'mp', 'ridepet', 'petlevelup'];
    function gmRender() {
      var q = ($('#gmQ').value || '').toLowerCase();
      var l = (GD.gm || []).filter(function (c) { return !q || (c.cmd + ' ' + c.ko + ' ' + c.usage).toLowerCase().indexOf(q) >= 0; })
        .sort(function (a, b) { var x = top.indexOf(a.cmd), y = top.indexOf(b.cmd); x = x < 0 ? 99 : x; y = y < 0 ? 99 : y; return x - y || (a.cmd < b.cmd ? -1 : 1); });
      $('#gmC').textContent = l.length + '개';
      $('#gmT').innerHTML = '<div class="tbl-wrap"><table><tr><th>명령</th><th>한글</th><th>인자</th><th>권한</th></tr>' + l.map(function (c) {
        return '<tr><td>' + copyBtn('[gm ' + c.cmd + ']', c.cmd) + '</td><td>' + esc(c.ko) + '</td><td class="small">' + esc(c.usage) + '</td><td class="num">' + esc(c.lv) + '</td></tr>';
      }).join('') + '</table></div>';
    }
    $('#gmQ').addEventListener('input', gmRender); gmRender();
  }

  // ---------------------------------------------------------------- 사냥터
  function huntTable(list, hl) {
    return '<div class="tbl-wrap"><table><tr><th>분류</th><th>사냥터</th><th class="num">몹 Lv</th><th class="num">전투/레벨업</th><th class="num">EXP/전투</th><th>희귀 드롭</th><th>바로 가기</th></tr>' + list.map(function (x) {
      return '<tr class="click' + (hl && hl(x) ? ' hl' : '') + '" data-go="#/hunt/' + x.id + '"><td class="small">' + esc(x.catname) + '</td><td><b>' + esc(x.label) + '</b>' + (x.label !== x.area ? '<div class="muted small">' + esc(x.area) + '</div>' : '') +
        (x.bosses.length ? ' <span class="tag boss">보스</span>' : '') + '</td><td class="num">' + x.lo + (x.hi !== x.lo ? '~' + x.hi : '') + '</td><td class="num">' + (x.battles == null ? '-' : x.battles) + '</td><td class="num">' + fmt(x.exp) +
        '</td><td>' + (x.tier != null ? 'T' + (x.tier + 1) : '<span class="muted">-</span>') + '</td><td>' + (x.entry ? warp(x.entry[0], x.entry[1], x.entry[2]) : '<span class="muted small">입구 행 없음</span>') + '</td></tr>';
    }).join('') + '</table></div>';
  }
  function huntCard(x) {
    var m = x.mobs[0];
    return '<div class="card qcard" data-go="#/hunt/' + x.id + '"><div class="qpic">' + (m ? petImg(m.img, 84) : '') + '</div><div class="qbody"><b class="ellip">' + esc(x.label) + '</b>' +
      '<div class="muted small ellip">' + esc(x.catname) + ' · 몹 Lv.' + x.lo + (x.hi !== x.lo ? '~' + x.hi : '') + '</div>' +
      '<div class="small">레벨업 <b>' + (x.battles == null ? '-' : x.battles) + '</b>전투 · EXP ' + fmt(x.exp) + '</div>' +
      '<div>' + (x.tier != null ? '<span class="tag legend">희귀 T' + (x.tier + 1) + '</span>' : '') + (x.bosses.length ? '<span class="tag boss">보스</span>' : '') + (x.collectors.length ? '<span class="tag">수집가</span>' : '') +
      ((x.scenes || []).length ? '<span class="tag v80">위치 그림</span>' : '') + '</div>' +
      '<div class="icons">' + x.mobs.slice(1, 5).map(function (mm) { return '<span title="' + esc(mm.name) + '">' + petImg(mm.img, 30) + '</span>'; }).join('') + '</div></div></div>';
  }
  var huntState = { cat: '', q: '', lv: '', view: 'card' };
  function pageHunts(params) {
    if (params.cat != null) huntState.cat = params.cat;
    var cats = []; H.hunts.forEach(function (x) { if (cats.indexOf(x.cat) < 0) cats.push(x.cat); });
    var h = '<h1>사냥터 · 던전</h1><p class="muted">경험치는 혼자·펫 5마리 출전·모두 살아 이긴 전투 기준(tools/calc-hunt-exp.py, 받는 쪽 레벨 = 몹 대표 레벨). 캐릭터와 출전 펫이 <b>각자</b> 같은 값을 받습니다.</p>';
    h += '<div class="chips" id="hc">' + [['', '전체']].concat(cats.map(function (c) { return [c, (M.cat_ko || {})[c] || c]; })).map(function (c) { return '<button class="chip' + (huntState.cat === c[0] ? ' on' : '') + '" data-c="' + c[0] + '">' + esc(c[1]) + '</button>'; }).join('') + '</div>';
    h += '<div class="toolbar"><input type="search" id="hq" placeholder="사냥터·몹 이름" value="' + esc(huntState.q) + '"><label>내 Lv <input type="number" id="hlv" value="' + esc(huntState.lv || store('lv') || '') + '"></label><select id="hv"><option value="card">카드로 보기</option><option value="table">표로 보기</option></select><span class="count" id="hn"></span></div><div id="ht"></div>';
    h += '<h2>드롭 규칙</h2><div class="panel"><h3>희귀 장비 T1~T6</h3><div class="tbl-wrap"><table><tr><th>등급</th><th>전투당</th><th>장비</th><th>아이템</th><th>사냥터</th></tr>' + (H.loot || []).map(function (t) {
      return '<tr><td><b>' + t.label + '</b></td><td class="num">' + t.pct + '%</td><td>' + esc(t.gear) + '</td><td><a href="#/items?tier=' + t.tier + '">' + t.n + '개 보기</a></td><td class="small">' + esc((t.grounds || []).join(', ')) + '</td></tr>';
    }).join('') + '</table></div><p class="muted small">드롭 10%는 한 등급 위. T6 사냥터 0.2% 화염의 기사 세트. 적 1마리 늘 때마다 +10%(최대 +50%).</p></div>';
    h += '<div class="panel"><h3>회복약·아군 전체 회복·공격 마석 (모든 사냥 전투)</h3>' + consTable() + '</div>';
    ['희귀 장비 드롭과 스톤 변동', '던전 아이템 수집가', '던전 보스', '황금 몹', '혼자 사냥 전투 밸런스'].forEach(function (t) { h += docBlock(t); });
    app.innerHTML = h;
    function render() {
      var q = huntState.q.toLowerCase(), lv = +huntState.lv;
      var l = H.hunts.filter(function (x) {
        if (huntState.cat && x.cat !== huntState.cat) return false;
        if (q && (x.label + ' ' + x.area + ' ' + x.mobs.map(function (m) { return m.name; }).join(' ') + ' ' + x.floors.map(function (f) { return f.n; }).join(' ')).toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      $('#hn').textContent = l.length + '곳';
      var hl = lv ? function (x) { var mid = (x.lo + x.hi) / 2; return mid >= lv - 15 && mid <= lv + 5; } : null;
      if (huntState.view === 'table') $('#ht').innerHTML = huntTable(l, hl);
      else {
        var rec = hl ? l.filter(hl) : [];
        $('#ht').innerHTML = (rec.length ? '<h3>내 레벨(' + lv + ') 추천</h3><div class="grid qcards">' + rec.sort(function (a, b) { return (a.battles || 99) - (b.battles || 99); }).slice(0, 6).map(huntCard).join('') + '</div><h3>전체</h3>' : '') +
          '<div class="grid qcards">' + l.map(huntCard).join('') + '</div>';
      }
    }
    $('#hc').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; huntState.cat = b.getAttribute('data-c'); [].forEach.call($('#hc').children, function (c) { c.classList.toggle('on', c === b); }); render(); });
    $('#hq').addEventListener('input', function () { huntState.q = this.value; render(); });
    $('#hlv').addEventListener('input', function () { huntState.lv = this.value; store('lv', this.value); render(); });
    $('#hv').value = huntState.view;
    $('#hv').addEventListener('change', function () { huntState.view = this.value; render(); });
    huntState.lv = $('#hlv').value; render();
  }
  function consTable(only) {
    return '<div class="tbl-wrap"><table><tr><th>밴드(적 최고 Lv)</th><th>내구력</th><th>기력</th><th>아군 전체</th><th>공격 마석</th></tr>' + (H.cons || []).filter(function (b) { return only == null || b.band === only; }).map(function (b) {
      var f = function (l) { return (l || []).map(function (x) { return itemLink(x.id, x.name); }).join(', '); };
      return '<tr><td><b>' + b.label + '</b></td><td>' + f(b.Hp) + '</td><td>' + f(b.Mp) + '</td><td class="small">' + f(b.Party) + '</td><td class="small">' + f(b.Atk) + '</td></tr>';
    }).join('') + '</table></div>';
  }
  function pageHunt(id) {
    var x = huntById[id];
    if (!x) { app.innerHTML = '<p>사냥터를 찾지 못했습니다.</p>'; return; }
    var m0 = x.mobs[0], b0 = x.bosses[0];
    var h = '<p><a href="#/hunts">← 사냥터 목록</a></p>' + hero({
      el: 'hunt', bg: (x.scenes || [])[0] ? sceneBg(x.scenes[0].id) : '', pic: m0 ? petImg(m0.img, 150, 2) : (b0 ? petImg(b0.img, 150, 2) : ''), picCap: m0 ? esc(m0.name) : '',
      title: esc(x.label), tags: '<span class="tag">' + esc(x.catname) + '</span>' + (x.tier != null ? '<span class="tag legend">희귀 T' + (x.tier + 1) + '</span>' : '') + (x.bosses.length ? '<span class="tag boss">보스 ' + x.bosses.length + '</span>' : ''),
      facts: [['몹 레벨', 'Lv.' + x.lo + (x.hi !== x.lo ? '~' + x.hi : '')], ['층', x.nfloors + '개'], ['EXP/전투', '<b>' + fmt(x.exp) + '</b> · 레벨업까지 ' + (x.battles == null ? '-' : x.battles) + '전투'],
        ['포획 펫', x.mobs.filter(function (m) { return m.catch && m.pet; }).slice(0, 6).map(function (m) { return petLink(m.pet, m.name); }).join(', ')], ['입구', x.entry ? warp(x.entry[0], x.entry[1], x.entry[2]) : '']],
      side: bigBadge('Lv' + x.lo, '#2457c5', null, '') + '<div class="hero-mini small">권장 시작 레벨</div>'
    });
    h += '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));margin-top:12px">';
    h += '<div class="panel"><h3>가는 길</h3>' + (x.routes.length ? '<ol>' + x.routes.map(function (r) { return '<li>' + esc(r.path) + ' ' + warp(r.to[0], r.to[1], r.to[2]) + '</li>'; }).join('') + '</ol>' :
      '<p class="muted">샴기르 포탈 메뉴에 직접 줄이 없습니다. 이웃 층(8.0 워프·안내인)으로 들어갑니다.</p>') + (x.entry ? '<p>입구 GM 이동: ' + warp(x.entry[0], x.entry[1], x.entry[2]) + '</p>' : '') + '</div>';
    h += '<div class="panel"><h3>경험치</h3><div class="kv"><div>EXP/전투</div><div><b>' + fmt(x.exp) + '</b> (캐릭터·펫 각자)</div><div>레벨업 필요</div><div>' + fmt(x.need) + '</div><div>전투/레벨업</div><div><b>' + (x.battles == null ? '-' : x.battles) +
      '</b></div><div>배율</div><div>' + x.mult + '배' + (x.extra ? ' (사냥터 보너스 +' + x.extra + '%)' : '') + '</div>' + (x.stones ? '<div>추가 스톤</div><div>' + x.stones + ' / 전투</div>' : '') + '</div></div>';
    h += '<div class="panel"><h3>드롭</h3>' + (x.tier != null ? '<p>희귀 장비 <a href="#/items?tier=' + x.tier + '"><b>T' + (x.tier + 1) + '</b> 목록</a>' + (x.tier >= 4 ? ' · 보스·T6에서 화염의 기사 세트' : '') + '</p>' : '<p class="muted">사냥터 보너스 구역이 아니라 희귀 장비 드롭 없음</p>') +
      '<p class="small">회복약·마석 밴드: <b>' + ((H.cons || [])[x.band] || {}).label + '</b> (아래 표)</p></div></div>' + consTable(x.band);
    if ((x.scenes || []).length || x.mm) {
      var allm = x.mm ? x.mm.marks.map(function (m, k) { return { x: m.x, y: m.y, k: m.k, t: m.t, n: k + 1 }; }) : [];
      h += '<h2>위치 그림</h2><p class="muted small">서버 지도와 클라이언트 그림으로 그린 게임 화면(쿼터뷰). 초록 = 도착 칸, 분홍 = 간호사, 보라 = 귀환 포탈, 빨강 = 수집가·보스. 클릭하면 크게.</p><div class="figs">' +
        (x.scenes || []).map(function (s) { return sceneHtml(s.id, s.marks.map(function (m, k) { return { x: m.x, y: m.y, k: m.k, t: m.t, n: k + 1 }; }), s.title, bigScale(Math.min(3, (x.scenes || []).length + (x.mm ? 1 : 0)))); }).join('') +
        (x.mm ? mmHtml(x.mm.f, allm, x.entry ? [x.entry[1], x.entry[2]] : null, '입구 층 전체 (하늘색 = 워프)', halfW(Math.min(3, (x.scenes || []).length + 1))) : '') + '</div>';
    }
    h += '<h2>가는 길 (지도 경로)</h2><p class="muted small">샴기르 귀환 지점에서 포탈·워프를 거쳐 입구까지, 층마다 미니맵에 걷는 길(노란 선·주황 화살표). S = 출발, G = 도착.</p>' + routeHtml(x.route, halfW(2));
    if ((x.routes2 || []).length) h += '<div class="route-grid">' + x.routes2.map(function (r) { return '<div><div class="sub-h"><b>입구 → ' + esc(r.t) + '</b></div>' + routeHtml(r.route, halfW(3)) + '</div>'; }).join('') + '</div>';
    var cp = x.mobs.filter(function (m) { return m.catch && m.pet; }).map(function (m) { return m.pet; }).filter(function (v, k, a) { return a.indexOf(v) === k; });
    h += '<h2>이 사냥터에서 얻는 것</h2><div class="panel">' + (cp.length ? '<div class="small">포획 가능한 펫: ' + thingIcons(cp.map(function (id) { return { k: 'pet', id: id }; })) + '</div>' : '') +
      ((x.loot || []).length ? '<div class="small">몹 드롭: ' + thingIcons(x.loot.map(function (id) { return { k: 'item', id: id }; })) + '</div>' : '') +
      (x.tier != null ? '<div class="small">희귀 장비: <a href="#/items?tier=' + x.tier + '">T' + (x.tier + 1) + ' 목록</a></div>' : '') + '</div>';
    h += '<div class="grid hunt-bottom"><div class="panel"><h3>층</h3><div class="chips">' + x.floors.map(function (f) { return '<span class="tag">' + f.f + ' ' + esc(f.n) + '</span>'; }).join('') + (x.nfloors > x.floors.length ? ' …' : '') + '</div></div>';
    h += '<div class="panel"><h3>주요 몹</h3><div class="mobs">' + x.mobs.map(function (m) {
      return '<div class="mob"><div class="pic">' + petImg(m.img, 80) + '</div><div><b>' + esc(m.name) + '</b></div><div class="muted">Lv.' + m.lo + (m.hi !== m.lo ? '~' + m.hi : '') + ' · ' + m.share + '%</div>' +
        (m.catch ? '<div>' + petLink(m.pet, '포획 가능 · #' + m.pet) + '</div>' : '<div class="muted small">포획 불가' + (m.pet ? ' · ' + petLink(m.pet, '도감 #' + m.pet) : '') + '</div>') + '</div>';
    }).join('') + '</div></div>';
    if (x.bosses.length) h += '<div class="panel"><h3>보스</h3><div class="mobs">' + x.bosses.map(function (b) {
      return '<div class="mob"><div class="pic">' + petImg(b.img, 80) + '</div><b>' + esc(b.name) + '</b><div class="muted">Lv.' + b.lv + ' · 졸개 ' + b.minions + '</div><div class="small">' + esc(b.fname) + ' (' + b.x + ',' + b.y + ')</div><div>' + warp(b.floor, b.x, b.y + 1) +
        '</div><div class="small">스톤 ' + b.stones + ' · 희귀 T' + (b.tier + 1) + ' 확정' + (b.fk ? ' · 화염 ' + b.fk + '%' : '') + '</div></div>';
    }).join('') + '</div><p class="muted small">보스 앞에서 말을 걸고 “예” → 보스전. 보상 후 10분 재도전 대기.</p></div>';
    var heals = (x.mm ? x.mm.marks : []).filter(function (m) { return m.k === 'heal'; });
    if (heals.length) h += '<div class="panel"><h3>간호사</h3><ul>' + heals.map(function (c) { return '<li>' + esc(c.t) + ' (' + x.mm.f + ' / ' + c.x + ',' + c.y + ') ' + warp(x.mm.f, c.x, c.y + 1) + ' — 말 걸면 무료 회복</li>'; }).join('') + '</ul></div>';
    if (x.collectors.length) h += '<div class="panel"><h3>수집가</h3><ul>' + x.collectors.map(function (c) { return '<li>' + esc(c.name) + ' (' + c.floor + ' / ' + c.x + ',' + c.y + ') ' + warp(c.floor, c.x, c.y + 1) + ' — 이 사냥터 장비 정가 60%, 다른 장비 40%로 매입</li>'; }).join('') + '</ul></div>';
    h += '</div>';
    app.innerHTML = h;
  }

  // ---------------------------------------------------------------- 퀘스트
  var qState = { tab: 'list', q: '', region: '', band: '', rw: '', st: '', sort: 'no', kind: '', rep: '' };
  function qDone() { return store('qdone') || {}; }
  function setPieces(s) { return s ? s.ids.map(function (i) { var it = itemById[i]; return '<span title="' + esc(it ? it.n : i) + '">' + (it ? itemImg(it.img, 36) : '') + ' ' + itemLink(i) + '</span>'; }).join(' · ') : ''; }
  function huntsOf(cat) { return H.hunts.filter(function (x) { return x.cat === cat; }); }
  function portalOf(key) { return (GD.portals || []).filter(function (p) { return p.key === key; })[0]; }
  function sysOf(key) { return (Q.systems || []).filter(function (s) { return s.key === key; })[0]; }
  function questPic(q, box) {
    var r = (q.rewards || []).filter(function (x) { return x.k === 'pet' && petById[x.id]; })[0];
    if (r) return petImg(petById[r.id].img, box);
    var st = (q.start || [])[0] || (q.finish || [])[0];
    var np = st ? npcPic(st.npc, box) : '';
    if (np) return np;
    var it = (q.rewards || []).filter(function (x) { return x.k === 'item' && itemRep[x.id]; })[0];
    return it ? itemImg(itemRep[it.id].img, box) : '';
  }
  function miniIcons(list, n) {
    return '<span class="icons">' + (list || []).slice(0, n || 5).map(function (r) {
      if (r.k === 'item' && itemRep[r.id]) return '<span title="' + esc(r.name) + '">' + itemImg(itemRep[r.id].img, 26) + '</span>';
      if (r.k === 'pet' && petById[r.id]) return '<span title="' + esc(r.name) + '">' + petImg(petById[r.id].img, 30) + '</span>';
      if (r.k === 'rand') return '<span class="tag">무작위</span>';
      return '<span class="tag">' + esc(r.name) + '</span>';
    }).join('') + '</span>';
  }

  // ---- 바다 콘텐츠 가이드(서버 자료로 채운 고정 글)
  function gPortal() {
    var sv = GD.shamgir_view || {}, gn = GD.guide_npc || {};
    var h = '<p>거점은 샴기르 마을(1000). 포탈은 밟지 않고 <b>말을 걸면</b> 창이 열립니다. 신대륙 안내원 (' + gn.x + ',' + gn.y + ')은 신대륙 마을·사냥터·엔드 던전·탐험·거인의 회랑·봉인해제 지역을 한 창에서 고릅니다. 목적지마다 ‘샴기르 귀환 포탈’이 있습니다.</p>';
    if ((sv.scenes || []).length) h += '<div class="figs">' + sv.scenes.map(function (s) { return sceneHtml(s.id, s.marks.map(function (m, k) { return { x: m.x, y: m.y, k: m.k, t: m.t, n: k + 1 }; }), s.title, 0.5); }).join('') +
      (sv.mm ? mmHtml(sv.mm.f, sv.mm.marks, null, '샴기르(1000) 전체', 320) : '') + '</div>';
    h += '<div class="tbl-wrap"><table><tr><th>포탈</th><th>좌표</th><th>메뉴</th></tr>' + (GD.portals || []).map(function (p) {
      return '<tr><td><b>' + esc(p.title) + '</b></td><td>' + (p.pos ? p.pos.join(',') + ' ' + warp(1000, p.pos[0], p.pos[1] + 2) : '') + '</td><td class="small">' + p.groups.map(function (g) { return esc(g.name); }).join(' · ') + '</td></tr>';
    }).join('') + '</table></div>';
    return h;
  }
  function gAdult() { return md((GD.docs || {})['성인식 동선'] || '').replace(/<h\d>[^<]*<\/h\d>/, '') + '<p><a href="#/quests/4">이벤트 #4 단계별 그림 보기 →</a></p>'; }
  function gTrans() {
    var tr = sysOf('npc_transmigration'), h = '';
    if (tr) h += '<p>' + tr.rows.map(npcPos).join('<br>') + '</p><div class="figs">' + tr.rows.map(function (r) {
      return (r.scene != null ? sceneHtml(r.scene, [{ x: r.x, y: r.y, k: 'npc', n: 1, t: r.name + '에게 말 걸기(북쪽을 보고)' }], r.fname, bigScale(2)) : '') + mmHtml(r.floor, [{ x: r.x, y: r.y, k: 'npc', n: 1, t: r.name }], null, '', halfW(2));
    }).join('') + '</div>';
    return h + md(((GD.docs || {})['환생'] || '').replace(/^#+[^\n]*\n/, ''));
  }
  function gBoss() { return '<p>사냥터마다 가장 깊은 곳에 “주인 ○○” 보스, 도착 지점 옆에 “○○ 수집가”가 있습니다. 보스 ' + (M.counts || {}).bosses + '마리 — 각 사냥터 상세 페이지에 위치 그림·보상이 있습니다. <a href="#/hunts">사냥터 목록</a></p>' + docBlock('던전 보스', true) + docBlock('던전 아이템 수집가') + docBlock('황금 몹'); }
  function gFire() {
    var fk = setBySuit[2511];
    return fk ? '<p>' + setPieces(fk) + '</p><p>세트 효과(3부위 이상): ' + esc(fk.bonus) + '</p><p class="small">얻는 곳: T6 사냥터 전투 0.2%, T5·T6 보스 5%, 최종 보스(초월의 심층) 15%, GM 메뉴 7번(한번에 5종). ' + copyBtn('[gm additem 25011 1]') + '</p>' : '';
  }
  function gMech() {
    var mh = huntsOf('mech'), mp = portalOf('mech'), mech = setBySuit[2521];
    return '<ol><li>샴기르 <b>기계 마을 포탈</b>' + (mp && mp.pos ? ' (' + mp.pos.join(',') + ')' : '') + '에 말 걸기 → 기계 마을 ' + warp(63000, 23, 26) + '</li><li>기계 광산 안내 NPC → 광산 1·2층 → 기계 요새 → 기계 왕좌(레이드 보스)</li></ol>' +
      '<div class="grid cards">' + mh.map(huntCard).join('') + '</div>' +
      (mech ? '<p>기계 세트: ' + setPieces(mech) + '<br>세트 효과: ' + esc(mech.bonus) + '. 기계 세트 + 기계 펫 = 기계 공명.</p>' : '') +
      '<p>기계 펫: ' + P.filter(function (p) { return p.c.indexOf('기계') >= 0; }).map(function (p) { return icoPet(p.id); }).join(' ') + '</p>' + (mp && mp.pos ? mmHtml(1000, [{ x: mp.pos[0], y: mp.pos[1], k: 'portal', n: 1, t: '기계 마을 포탈' }], null, '샴기르에서 포탈 위치', 300) : '');
  }
  function gGiant() {
    var gh = huntsOf('giant'), gp = portalOf('giant');
    return '<p>샴기르 <b>거인의 회랑 포탈</b>' + (gp && gp.pos ? ' (' + gp.pos.join(',') + ')' : '') + '. ' + (gp ? gp.groups.map(function (g) { return g.rows.map(function (r) { return esc(r.name) + ' ' + warp(r.floor, r.x, r.y); }).join(' · '); }).join('') : '') + '</p>' +
      '<div class="grid cards">' + gh.map(huntCard).join('') + '</div><p>거대 펫: ' + P.filter(function (p) { return p.c.indexOf('거대') >= 0; }).map(function (p) { return icoPet(p.id); }).join(' ') + '</p>';
  }
  function gNew() {
    var gn = GD.guide_npc || {}, wp = portalOf('world'), up = portalOf('unlock80');
    return '<p>신대륙 안내원 (' + gn.x + ',' + gn.y + ') ' + warp(1000, gn.x, (gn.y || 0) + 2) + ' 또는 신대륙 포탈' + (wp && wp.pos ? ' (' + wp.pos.join(',') + ')' : '') + ', 8.0 봉인해제 포탈' + (up && up.pos ? ' (' + up.pos.join(',') + ')' : '') + '.</p>' +
      '<p>' + ['sa80', 'extra', 'explore', 'unlock2'].map(function (c) { return '<a href="#/hunts?cat=' + c + '">' + esc((M.cat_ko || {})[c]) + ' ' + huntsOf(c).length + '곳</a>'; }).join(' · ') + '</p>' +
      '<p>8.0 NPC(비행선·순간이동사·기록 지점·펫 기술 상인·가공 기술자·보관소)는 <a href="#/quests?tab=npc">편의·8.0 NPC 탭</a>.</p>' + gPortal();
  }
  var QCATS = ['필수', '주요 이벤트', '서브', '커스텀', '8.0 NPC'];
  var GUIDES = [
    { no: 'g-portal', cat: '필수', title: '샴기르 포탈·신대륙 안내원', region: '샴기르 마을', lv: 1, tags: ['안내', '커스텀'], pic: function (b) { return spr('cr', 'a' + ((GD.guide_npc || {}).graphic || 0), b); }, body: gPortal, nsteps: 1 },
    { no: 'g-adult', cat: '필수', title: '성인식', region: '해저 통로', lv: 30, tags: ['메인'], pic: function (b) { var it = itemRep[2418]; return it ? itemImg(it.img, b) : ''; }, body: gAdult, nsteps: 6 },
    { no: 'g-trans', cat: '필수', title: '캐릭터 환생', region: '칠흑의 동굴 지하 20층', lv: 80, tags: ['환생'], pic: function (b) { var t = sysOf('npc_transmigration'); return t && t.rows[0] ? npcPic(t.rows[0], b) : ''; }, body: gTrans, nsteps: 1 },
    { no: 'g-boss', cat: '커스텀', title: '던전 보스 · 수집가 · 황금 몹', region: '모든 사냥터', lv: 1, tags: ['커스텀'], pic: function (b) { var x = H.hunts.filter(function (h) { return h.bosses.length; })[0]; return x ? petImg(x.bosses[0].img, b) : ''; }, body: gBoss, nsteps: 3 },
    { no: 'g-fire', cat: '커스텀', title: '화염의 기사 세트', region: 'T5·T6 사냥터', lv: 101, tags: ['커스텀', '세트'], pic: function (b) { var it = itemRep[25012]; return it ? itemImg(it.img, b) : ''; }, body: gFire, nsteps: 1 },
    { no: 'g-mech', cat: '커스텀', title: '기계 지역 · 기계 세트', region: '기계 마을(63000)', lv: 87, tags: ['커스텀', '세트'], pic: function (b) { var p = P.filter(function (p) { return p.c.indexOf('기계') >= 0; })[0]; return p ? petImg(p.img, b) : ''; }, body: gMech, nsteps: 4 },
    { no: 'g-giant', cat: '커스텀', title: '거인의 회랑', region: '87~91층', lv: 200, tags: ['커스텀'], pic: function (b) { var p = P.filter(function (p) { return p.c.indexOf('거대') >= 0; })[0]; return p ? petImg(p.img, b) : ''; }, body: gGiant, nsteps: 5 },
    { no: 'g-new', cat: '8.0 NPC', title: '신대륙(8.0) · 봉인해제 지역', region: '에덴 대륙', lv: 60, tags: ['8.0'], pic: function (b) { return spr('cr', 'a' + ((GD.guide_npc || {}).graphic || 0), b); }, body: gNew, nsteps: 2 }
  ];
  (Q.systems || []).forEach(function (sy) {
    var rows = sy.rows.filter(function (r) { return r.sa80; });
    if (!rows.length) return;
    GUIDES.push({ no: 'n-' + sy.key, cat: '8.0 NPC', title: sy.title, region: uniq(rows.map(function (r) { return r.fname; })).slice(0, 2).join(' · '), lv: 1, tags: ['8.0'], nsteps: rows.length,
      pic: function (b) { return npcPic(rows[0], b) || npcPic(sy.rows[0], b); }, body: function () {
        return '<p>' + esc(sy.desc) + '</p><div class="tbl-wrap"><table><tr><th>NPC</th><th>장소</th><th>그림</th></tr>' + rows.map(function (r) {
          return '<tr><td>' + npcPos(r) + '</td><td>' + esc(r.fname) + '</td><td>' + (r.scene != null ? sceneHtml(r.scene, [{ x: r.x, y: r.y, k: 'npc', n: 1, t: r.name }], '', 0.45) : (r.x == null ? '<span class="muted">위치 정보 없음</span>' : '')) + '</td></tr>';
        }).join('') + '</table></div>' + (sy.recipes && sy.recipes.length ? '<h3>만들 수 있는 물건</h3><div class="tbl-wrap"><table><tr><th>결과</th><th>재료</th><th>수수료</th></tr>' + sy.recipes.map(function (r) {
          return '<tr><td>' + thingIcons(r.make.map(function (m) { return { k: 'item', id: m.id, name: m.name }; })) + '</td><td class="small">' + thingIcons(r.need.map(function (n) { return { k: 'item', id: n.id, name: n.name, n: n.n }; })) + '</td><td class="num">' + esc(r.gold) + '</td></tr>';
        }).join('') + '</table></div>' : '');
      } });
  });
  var guideById = {}; GUIDES.forEach(function (g) { g.guide = true; guideById[g.no] = g; });
  var questById = {}; Q.quests.forEach(function (q) { questById[q.no] = q; });
  function allQuests() { return GUIDES.concat(Q.quests); }

  function questCard(q) {
    var done = qDone()[q.no];
    var pic = q.guide ? q.pic(84) : questPic(q, 84);
    return '<div class="card qcard' + (done ? ' done' : '') + '" data-go="#/quests/' + q.no + '"><div class="qpic">' + (pic || '<span class="muted small">그림 없음</span>') + '</div><div class="qbody">' +
      '<div class="idrow"><b class="ellip">' + esc(q.title) + '</b>' + (done ? '<span class="tag ride">완료</span>' : '') + '</div>' +
      '<div class="muted small ellip">' + esc(q.region) + (q.lv ? ' · Lv.' + q.lv + '+' : '') + (q.guide ? '' : ' · #' + q.no) + ' · ' + (q.nsteps || 0) + '단계</div>' +
      (q.rewards && q.rewards.length ? '<div class="small">보상 ' + miniIcons(q.rewards, 5) + '</div>' : '') +
      '<div><span class="tag cat-' + QCATS.indexOf(q.cat) + '">' + esc(q.cat || '') + '</span>' + tags((q.tags || []).filter(function (t) { return t !== q.cat && !(q.cat === '8.0 NPC' && t === '8.0'); })) + (q.rep ? '<span class="tag">반복</span>' : '') + (q.guide ? '' : '<span class="inferred">추론</span>') + '</div></div></div>';
  }
  function lvBand(lv) { return !lv ? 'none' : lv <= 30 ? 'a' : lv <= 60 ? 'b' : lv <= 100 ? 'c' : 'd'; }
  function pageQuests(params) {
    if (params.tab) qState.tab = params.tab;
    if (params.cat != null) { qState.kind = params.cat; qState.tab = 'list'; }
    var tabs = [['list', '퀘스트 ' + allQuests().length], ['exchange', '교환·이동 NPC ' + Q.exchanges.length], ['npc', '편의·8.0 NPC']];
    var h = '<h1>퀘스트 · NPC</h1><div class="tabs">' + tabs.map(function (t) { return '<a href="#/quests?tab=' + t[0] + '" class="' + (qState.tab === t[0] ? 'on' : '') + '">' + t[1] + '</a>'; }).join('') + '</div>';
    if (qState.tab === 'npc') { app.innerHTML = h + npcTab(); return; }
    if (qState.tab === 'exchange') { app.innerHTML = h + '<div class="toolbar"><input type="search" id="qq" placeholder="NPC·아이템·지역" value="' + esc(qState.q) + '"><span class="count" id="qn"></span></div><div id="ql"></div>'; exchangeRender(); return; }
    var regions = []; allQuests().forEach(function (q) { if (regions.indexOf(q.region) < 0) regions.push(q.region); }); regions.sort();
    h += '<div class="chips" id="qk">' + [['', '전체']].concat(QCATS.map(function (c) { return [c, c + ' ' + allQuests().filter(function (q) { return q.cat === c; }).length]; })).map(function (c) { return '<button class="chip' + (qState.kind === c[0] ? ' on' : '') + '" data-c="' + c[0] + '">' + c[1] + '</button>'; }).join('') + ' <a class="chip" href="#/course">코스 공략 →</a></div>';
    h += '<div class="toolbar"><input type="search" id="qq" placeholder="퀘스트·NPC·아이템 검색" value="' + esc(qState.q) + '">' +
      '<select id="qr"><option value="">지역 전체</option>' + regions.map(function (r) { return '<option>' + esc(r) + '</option>'; }).join('') + '</select>' +
      '<select id="qb"><option value="">레벨 전체</option><option value="none">조건 없음</option><option value="a">~30</option><option value="b">31~60</option><option value="c">61~100</option><option value="d">101+</option></select>' +
      '<select id="qw"><option value="">보상 전체</option><option value="pet">펫</option><option value="gear">장비</option><option value="item">아이템</option><option value="stone">스톤</option><option value="rand">무작위</option></select>' +
      '<select id="qp"><option value="">반복 여부</option><option value="1">반복 가능</option><option value="0">1회</option></select>' +
      '<select id="qs"><option value="">진행 전체</option><option value="todo">미완료</option><option value="done">완료</option></select>' +
      '<select id="qo"><option value="no">기본순</option><option value="lv">레벨순</option><option value="region">지역순</option></select><span class="count" id="qn"></span></div>' +
      '<p class="muted small">원작 이벤트는 2.5 이벤트 NPC(changeevent) 인자의 조건 식으로 만든 공략입니다(대사 원문이 중국어라 순서·의도는 <span class="inferred">추론</span>). 카드를 누르면 단계별 그림 공략.</p><div class="grid qcards" id="ql"></div>';
    app.innerHTML = h;
    ['qr', 'qb', 'qw', 'qs', 'qo'].forEach(function (id, k) { $('#' + id).value = qState[['region', 'band', 'rw', 'st', 'sort'][k]]; });
    function render() {
      var q = qState.q.toLowerCase(), dn = qDone();
      var l = allQuests().filter(function (x) {
        if (qState.kind && x.cat !== qState.kind) return false;
        if (qState.rep && String(x.rep ? 1 : 0) !== qState.rep) return false;
        if (qState.region && x.region !== qState.region) return false;
        if (qState.band && lvBand(x.lv) !== qState.band) return false;
        if (qState.rw && !(x.rewards || []).some(function (r) { return qState.rw === 'gear' ? (r.k === 'item' && r.lv > 0) : r.k === qState.rw; })) return false;
        if (qState.st === 'done' && !dn[x.no]) return false;
        if (qState.st === 'todo' && dn[x.no]) return false;
        if (q && JSON.stringify([x.title, x.region, x.no, x.tags, x.start, x.finish]).toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      if (qState.sort === 'lv') l.sort(function (a, b) { return (a.lv || 0) - (b.lv || 0); });
      else if (qState.sort === 'region') l.sort(function (a, b) { return a.region.localeCompare(b.region, 'ko') || (a.lv || 0) - (b.lv || 0); });
      $('#qn').textContent = l.length + '개';
      $('#ql').innerHTML = l.map(questCard).join('') || '<p class="muted">없음</p>';
    }
    $('#qk').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; qState.kind = b.getAttribute('data-c'); [].forEach.call($('#qk').children, function (c) { c.classList.toggle('on', c === b); }); render(); });
    $('#qq').addEventListener('input', function () { qState.q = this.value; render(); });
    [['qr', 'region'], ['qb', 'band'], ['qw', 'rw'], ['qs', 'st'], ['qo', 'sort'], ['qp', 'rep']].forEach(function (p) { $('#' + p[0]).addEventListener('change', function () { qState[p[1]] = this.value; render(); }); });
    render();
  }
  function exchangeRender() {
    function render() {
      var q = qState.q.toLowerCase();
      var e = Q.exchanges.filter(function (x) { return !q || JSON.stringify(x).toLowerCase().indexOf(q) >= 0; });
      $('#qn').textContent = e.length + '개';
      $('#ql').innerHTML = '<div class="tbl-wrap"><table><tr><th>NPC</th><th>조건</th><th>건네는 것</th><th>받는 것 / 이동</th></tr>' + e.slice(0, 400).map(function (x) {
        return '<tr><td><div class="npc-cell">' + npcPic(x.npc, 96, '교환·이동') + '<div>' + npcPos(x.npc) + '</div></div></td><td class="small">' + x.cond.map(esc).join(' · ') + '</td><td class="small">' + thingIcons(x.take) + '</td><td class="small">' + thingIcons(x.reward) +
          (x.warp ? (x.reward.length ? '<br>' : '') + '이동: ' + x.warp.map(function (w) { return esc(w.fname) + ' ' + warp(w.floor, w.x, w.y); }).join(' / ') : '') + '</td></tr>';
      }).join('') + '</table></div>';
    }
    $('#qq').addEventListener('input', function () { qState.q = this.value; render(); }); render();
  }
  function npcTab() {
    return (Q.systems || []).map(function (s) {
      var t = '<details class="panel"' + (['airplane', 'transman', 'itemchange', 'npc_transmigration'].indexOf(s.key) >= 0 ? ' open' : '') + '><summary>' + esc(s.title) + ' <span class="muted small">' + s.rows.length + '명</span></summary><p class="muted">' + esc(s.desc) + '</p>';
      t += '<div class="tbl-wrap"><table><tr><th>NPC</th><th>장소</th><th>좌표</th><th></th></tr>' + s.rows.map(function (r) { return '<tr><td><div class="npc-cell">' + npcPic(r, 96, s.title) + '<div>' + esc(r.name) + (r.sa80 ? ' <span class="tag v80">8.0</span>' : '') + '</div></div></td><td>' + esc(r.fname) + '</td><td>' + r.floor + ' (' + r.x + ',' + r.y + ')</td><td>' + (r.x == null ? '<span class="muted">위치 정보 없음</span>' : warp(r.floor, r.x, r.y + 1) + (r.scene != null ? ' ' + sceneHtml(r.scene, [{ x: r.x, y: r.y, k: 'npc', t: r.name }], '', 0.3) : '')) + '</td></tr>'; }).join('') + '</table></div>';
      if (s.recipes && s.recipes.length) t += '<h3>만들 수 있는 물건 ' + s.recipes.length + '</h3><div class="tbl-wrap"><table><tr><th>결과</th><th>재료</th><th>수수료</th><th>NPC</th></tr>' + s.recipes.map(function (r) {
        return '<tr><td>' + thingIcons(r.make.map(function (m) { return { k: 'item', id: m.id, name: m.name }; })) + '</td><td class="small">' + thingIcons(r.need.map(function (n) { return { k: 'item', id: n.id, name: n.name, n: n.n }; })) + '</td><td class="num">' + esc(r.gold) + '</td><td class="small">' + esc(r.npc) + ' · ' + esc(r.fname) + '</td></tr>';
      }).join('') + '</table></div>';
      return t + '</details>';
    }).join('');
  }
  function branchHtml(b, k, total) {
    var s = '<div class="branch">' + (total > 1 ? '<b class="small">갈래 ' + (k + 1) + '</b> ' : '');
    if (b.cond.length) s += '<span class="small">조건: ' + b.cond.map(esc).join(' · ') + (b.more ? ' <span class="muted">(+다른 조건 ' + b.more + ')</span>' : '') + '</span>';
    var need = (b.need || []).filter(function (x) { return x.k === 'pet' || !(b.take || []).some(function (t) { return t.id === x.id; }); });
    if (need.length) s += '<div class="small">준비물: ' + thingIcons(need) + '</div>';
    if (b.take.length) s += '<div class="small">건네는 것: ' + thingIcons(b.take) + '</div>';
    if (b.reward.length) s += '<div class="small">받는 것: ' + thingIcons(b.reward) + '</div>';
    if (b.msg) s += '<div class="muted small">“' + esc(b.msg.slice(0, 160)) + '”</div>';
    return s + '</div>';
  }
  function stepHtml(st, kind, n) {
    var verb = kind === 'start' ? '부탁 받기' : '완료·건네기', br = st.branches || [];
    var s = '<li><div class="step-grid"><div class="st-text"><div class="step-npc">' + npcPic(st.npc, 120, verb) + '<div><b>' + verb + '</b> — ' + npcPos(st.npc) + '</div></div>' + (br.length > 1 ? ' <span class="tag">조건 분기 ' + br.length + '</span>' : '');
    s += br.slice(0, 10).map(function (b, k) { return branchHtml(b, k, br.length); }).join('') + (br.length > 10 ? '<p class="muted small">갈래 ' + (br.length - 10) + '개 더(선택지·답안 등)</p>' : '');
    var lab = st.npc.name + (kind === 'start' ? '에게 부탁 받기' : '에게 건네기');
    s += '</div><div class="figs">' + (st.scene != null ? sceneHtml(st.scene, [{ x: st.npc.x, y: st.npc.y, k: 'npc', n: n, t: lab }], n + '. ' + st.npc.fname + ' (' + st.npc.x + ',' + st.npc.y + ')', bigScale(2)) : (st.npc.x == null ? '<span class="muted small">위치 정보 없음 — 그림 생략</span>' : '')) +
      (!st.route && st.mm ? mmHtml(st.mm, [{ x: st.npc.x, y: st.npc.y, k: 'npc', n: n, t: st.npc.name }], st.arrive, '층 지도: 초록 = 들어오는 곳 → 빨강 = ' + st.npc.name, halfW(2)) : '') + '</div>' +
      '<div class="st-route"><div class="sub-h"><b>가는 길</b> ' + (n === 1 ? '(샴기르에서)' : '(앞 단계 NPC에서)') + '</div>' + routeHtml(st.route, halfW(2)) + '</div></div>';
    return s + '</li>';
  }
  function pageQuest(id) {
    var q = guideById[id] || questById[+id];
    if (!q) { app.innerHTML = '<p>퀘스트를 찾지 못했습니다. <a href="#/quests">목록</a></p>'; return; }
    var done = qDone()[q.no];
    var st0 = q.guide ? null : (q.start[0] || q.finish[0]);
    var h = '<p><a href="#/quests">← 퀘스트 목록</a></p>' + hero({
      el: 'quest', bg: st0 && st0.scene != null ? sceneBg(st0.scene) : '', pic: q.guide ? q.pic(150) : questPic(q, 150),
      title: esc(q.title), tags: tags(q.tags) + (q.guide ? '' : '<span class="inferred">자료에서 추론</span>'),
      facts: [['지역', esc(q.region)], ['권장', q.lv ? 'Lv.' + q.lv + ' 이상' : ''], ['시작 NPC', st0 ? esc(st0.npc.name) + ' <span class="muted small">' + esc(st0.npc.fname) + '</span>' : ''],
        ['단계', q.guide ? '' : q.nsteps + '단계'], ['보상', !q.guide && q.rewards.length ? thingIcons(q.rewards.slice(0, 6)) : '']],
      cmds: '<button class="chip' + (done ? ' on' : '') + '" id="qdone">' + (done ? '✓ 완료함' : '완료 표시') + '</button>',
      side: q.guide ? '' : bigBadge('#' + q.no, '#475467', null, '') + '<div class="hero-mini small">이벤트 번호</div>'
    });
    if (q.guide) { h += '<div class="panel">' + q.body() + '</div>'; }
    else {
      var first = (q.start[0] || q.finish[0] || {}).branches || [];
      h += '<div class="panel"><h3>개요</h3><div class="kv"><div>시작 조건</div><div>' + (first.length && first[0].cond.length ? first[0].cond.map(esc).join(' · ') : '조건 없음') + '</div>' +
        '<div>선행 퀘스트</div><div>' + (q.prev.length ? q.prev.map(function (p) { var x = questById[p]; return '<a href="#/quests/' + p + '">#' + p + (x ? ' ' + esc(x.title) : '') + '</a>'; }).join(', ') : '없음') + '</div>' +
        '<div>보상</div><div>' + (q.rewards.length ? thingIcons(q.rewards) : '-') + '</div><div>단계</div><div>' + q.nsteps + '단계 (부탁 ' + q.start.length + ' · 완료 ' + q.finish.length + ')</div></div></div>';
      var no = 0;
      h += '<h2>단계별 공략</h2><ol class="steps">' + q.start.map(function (s) { return stepHtml(s, 'start', ++no); }).join('') + q.finish.slice(0, 12).map(function (s) { return stepHtml(s, 'finish', ++no); }).join('') + '</ol>';
      if (q.finish.length > 12) h += '<p class="muted small">완료 NPC ' + (q.finish.length - 12) + '곳 더</p>';
      var nxt = (q.next || []).map(function (n) { return questById[n]; }).filter(Boolean);
      if (nxt.length) h += '<h2>다음 퀘스트</h2><div class="grid qcards">' + nxt.map(questCard).join('') + '</div>';
      var same = Q.quests.filter(function (x) { return x.region === q.region && x.no !== q.no && nxt.indexOf(x) < 0; });
      if (same.length) h += '<h2>같은 지역 다른 퀘스트</h2><div class="grid qcards">' + same.slice(0, 8).map(questCard).join('') + '</div>';
    }
    app.innerHTML = h;
    $('#qdone').addEventListener('click', function () { var d = qDone(); if (d[q.no]) delete d[q.no]; else d[q.no] = 1; store('qdone', d); pageQuest(id); });
  }

  // ---------------------------------------------------------------- 경로 그림(미니맵 위 걷는 길)
  var RK = { start: ['#2ecc71', '출발'], arrive: ['#2ecc71', '도착'], npc: ['#ff3b30', 'NPC'], boss: ['#ff3b30', '보스'], heal: ['#ff6fb5', '간호사'], warp: ['#35d0ff', '워프'], portal: ['#a970ff', '포탈'] };
  function routeSvg(c, seg, lab, bx, by, bw, bh) {
    var q = c[5], hm = c[6], w = c[3], hh = c[4];
    var P = function (x, y) { return [q * (x - y + hm), q * (x + y + 1) / 2]; };
    var pts = seg.pts.map(function (p) { return P(p[0], p[1]); });
    var out = '';
    if (pts.length > 1) {
      out += '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="' + 5 / lab + '" stroke-linejoin="round"/>';
      out += '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" fill="none" stroke="#ffd400" stroke-width="' + 2.6 / lab + '" stroke-linejoin="round"/>';
      var L = 0, segs = [];
      for (var i = 1; i < pts.length; i++) { var d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(d); L += d; }
      var every = Math.max(24 / lab, L / 7), acc = every / 2, k = 1, run = 0;
      for (i = 1; i < pts.length; i++) {
        var d2 = segs[i - 1];
        while (acc <= run + d2 && d2 > 0) {
          var t = (acc - run) / d2, x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, y = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t;
          var ux = (pts[i][0] - pts[i - 1][0]) / d2, uy = (pts[i][1] - pts[i - 1][1]) / d2, s = 6 / lab;
          out += '<polygon points="' + (x + ux * s) + ',' + (y + uy * s) + ' ' + (x - ux * s - uy * s * 0.7) + ',' + (y - uy * s + ux * s * 0.7) + ' ' + (x - ux * s + uy * s * 0.7) + ',' + (y - uy * s - ux * s * 0.7) + '" fill="#ff8c00" stroke="#000" stroke-width="' + 0.6 / lab + '"/>';
          acc += every;
        }
        run += d2;
      }
    }
    var occ = [], skip = {};
    [seg.a, seg.b].forEach(function (m) {
      var a = P(m.x, m.y), r = pillRect((a[0] - bx) * lab, (a[1] - by) * lab, 'S', (m.t || '').slice(0, 24), bw * lab, bh * lab, true);
      skip[m.x + ',' + m.y] = 1;
      occ.push([a[0] - 8 / lab, a[1] - 8 / lab, 16 / lab, 16 / lab]);
      if (lab >= 0.55) occ.push([bx + r[0] / lab, by + r[1] / lab, r[2] / lab, r[3] / lab]);
    });
    out += placeLabels(c, seg.f, lab, [bx, by, bw, bh], occ, skip);
    var aPill = null;
    [['a', seg.a], ['b', seg.b]].forEach(function (pp) {
      var m = pp[1], a = P(m.x, m.y), col = (RK[m.k] || RK.npc)[0];
      out += '<circle cx="' + a[0] + '" cy="' + a[1] + '" r="' + 6.5 / lab + '" fill="' + col + '" stroke="#fff" stroke-width="' + 1.5 / lab + '"/>';
      var gx = (a[0] - bx) * lab, gy = (a[1] - by) * lab, tt = (m.t || '').slice(0, 24);
      if (pp[0] === 'a') aPill = pillRect(gx, gy, 'S', tt, bw * lab, bh * lab, true);
      else if (aPill) { var r2 = pillRect(gx, gy, 'G', tt, bw * lab, bh * lab, true); if (hit(r2, [aPill])) gy += 37; }   // S·G 이름표가 겹치면 G 를 아래로
      if (lab >= 0.55) out += '<g transform="translate(' + bx + ',' + by + ') scale(' + (1 / lab) + ')">' + svgLabel(gx, gy, pp[0] === 'a' ? 'S' : 'G', tt, col, bw * lab, bh * lab, true) + '</g>';
    });
    return out;
  }
  function routeHtml(segs, maxw, title, zcap) {
    if (segs && segs.length === 1 && segs[0].pts.length <= 2 && segs[0].a.x === segs[0].b.x && segs[0].a.y === segs[0].b.y) return '<div class="small muted">같은 자리 — 이동 없음</div>';
    if (!segs) return '<div class="small"><span class="inferred">경로 계산 불가</span> <span class="muted">(지도 통행 정보로 길을 찾지 못함 — 워프 NPC·이벤트 이동이 필요한 곳)</span></div>';
    var circ = '①②③④⑤⑥⑦⑧⑨';
    return '<div class="figs">' + segs.map(function (sg, i) {
      var c = SC.mm && SC.mm[sg.f];
      if (!c) return '<div class="fig"><span class="cap">' + circ[i] + ' ' + esc(fname(sg.f)) + ' · ' + sg.f + ' (미니맵 없음)</span></div>';
      var W0 = c[3], H0 = c[4], q = c[5], hm = c[6], xs = [], ys = [];
      sg.pts.concat([[sg.a.x, sg.a.y], [sg.b.x, sg.b.y]]).forEach(function (p) { xs.push(q * (p[0] - p[1] + hm)); ys.push(q * (p[0] + p[1] + 1) / 2); });
      var pad = Math.max(14, 0.12 * Math.max(Math.max.apply(null, xs) - Math.min.apply(null, xs), 2 * (Math.max.apply(null, ys) - Math.min.apply(null, ys))));
      var bx = Math.max(0, Math.min.apply(null, xs) - pad), by = Math.max(0, Math.min.apply(null, ys) - pad / 2);
      var bw = Math.min(W0 - bx, Math.max.apply(null, xs) + pad - bx), bh = Math.min(H0 - by, Math.max.apply(null, ys) + pad / 2 - by);
      var zc = zcap || 4, need = (maxw || 260) / zc;
      if (bw < need) { var cxa = bx + bw / 2; bw = Math.min(W0, need); bx = Math.max(0, Math.min(W0 - bw, cxa - bw / 2)); }
      if (bw < bh * 1.3) { var cx0 = bx + bw / 2; bw = Math.min(W0, bh * 1.3); bx = Math.max(0, Math.min(W0 - bw, cx0 - bw / 2)); }
      if (bh < bw / 1.6) { var cy0 = by + bh / 2; bh = Math.min(H0, bw / 1.6); by = Math.max(0, Math.min(H0 - bh, cy0 - bh / 2)); }
      var sc = Math.min(zcap || 4, (maxw || 260) / bw), w = bw, hh = bh, k = FIGS.push({ t: 'r', seg: sg, cap: '' }) - 1;
      var cap = circ[i] + ' ' + esc(sg.a.t) + ' → ' + esc(sg.b.t) + ' (' + Math.max(0, sg.pts.length - 1) + '꺾임)';
      FIGS[k].cap = cap;
      return '<div class="fig">' + mmTitle(sg.f, w * sc).replace('<b>', '<b>' + circ[i] + ' ') + '<div class="mm" data-fig="' + k + '" style="width:' + Math.round(w * sc) + 'px;height:' + Math.round(hh * sc) + 'px" title="클릭하면 크게"><div class="bg" style="width:' + W0 + 'px;height:' + H0 + 'px;background:url(img/' + SC.msheets[c[0]] + ') -' + c[1] + 'px -' + c[2] +
        'px;transform:scale(' + sc + ') translate(-' + bx.toFixed(1) + 'px,-' + by.toFixed(1) + 'px);image-rendering:' + (sc > 2 ? 'pixelated' : 'auto') + '"></div><svg viewBox="' + bx.toFixed(1) + ' ' + by.toFixed(1) + ' ' + w.toFixed(1) + ' ' + hh.toFixed(1) + '">' + routeSvg(c, sg, sc, bx, by, w, hh) + '</svg></div><span class="cap">' + cap + '</span></div>' + (i < segs.length - 1 ? '<div class="route-arrow">➜</div>' : '');
    }).join('') + '</div>';
  }
  var FLN = {};
  function nmFloor(f) {
    if (!Object.keys(FLN).length) {
      H.hunts.forEach(function (h) { h.floors.forEach(function (x) { FLN[x.f] = x.n; }); });
      Q.quests.forEach(function (q) { q.start.concat(q.finish).forEach(function (s) { FLN[s.npc.floor] = s.npc.fname; }); });
      FLN[1000] = '샴기르 마을';
    }
    return (SC.fn && SC.fn[f]) || FLN[f] || ('맵 ' + f);
  }

  // ---------------------------------------------------------------- 얻는 방법(펫·아이템 공용)
  function huntLink(id) { var x = huntById[id]; return x ? '<a href="#/hunt/' + id + '">' + esc(x.label) + '</a>' : ''; }
  function srcHtml(s) {
    var t = s.t;
    if (t === 'tier') {
      var hl = ((H.tierHunts || {})[s.tier] || []).map(function (id) { return huntById[id]; }).filter(Boolean).sort(function (a, b) { return a.lo - b.lo; });
      return '<b>사냥터 희귀 드롭 T' + (s.tier + 1) + '</b> <span class="muted">(전투당 ' + s.p + '%, 등급 장비 중 하나)</span><div class="small">' + hl.slice(0, 6).map(function (x) { return huntLink(x.id) + ' <span class="muted">Lv.' + x.lo + '</span>'; }).join(' · ') + (hl.length > 6 ? ' 외 ' + (hl.length - 6) + '곳' : '') + '</div>';
    }
    if (t === 'boss') {
      var bl = ((H.tierBosses || {})[s.tier] || []).slice().sort(function (a, b) { return a.lv - b.lv; });
      return '<b>T' + (s.tier + 1) + ' 던전 보스 확정 보상</b> <span class="muted">(보스마다 이 등급 장비 1개, 20% 한 등급 위)</span><div class="small">' + bl.slice(0, 5).map(function (b) { return (b.hid ? '<a href="#/hunt/' + b.hid + '">' + esc(b.name) + '</a>' : esc(b.name)) + ' <span class="muted">Lv.' + b.lv + '</span>'; }).join(' · ') + (bl.length > 5 ? ' 외 ' + (bl.length - 5) : '') + '</div>';
    }
    if (t === 'fk') return '<b>화염의 기사 세트</b> <span class="muted">T6 사냥터 전투 0.2% · T5/T6 보스 5% · 최종 보스 15%</span>';
    if (t === 'cons') return '<b>사냥 전투 소모품 드롭</b> <span class="muted">' + s.bands.map(function (b) { return ((H.cons || [])[b] || {}).label; }).join(', ') + ' (모든 사냥 층)</span>';
    if (t === 'stone') return '<b>마석 드롭(14.2 준비·미배포)</b> <span class="muted">' + esc(s.tier) + ' · 사냥 전투 승리마다, 그 전투 적 최고 레벨</span><div class="small">' + s.bands.map(esc).join(' · ') + '</div>';
    if (t === 'stoneboss') return '<b>보스 처치 마석 보상(14.2 준비·미배포)</b> <span class="muted">' + esc(s.tier) + '</span><div class="small">' + s.bands.map(esc).join(' · ') + '</div>';
    if (t === 'stonesyn') return '<b>마석 합성(14.2 준비·미배포)</b> <span class="muted">' + esc(s.tier) + ' 마석 3개 → 이 등급 1개 · [마석] 창 또는 [마석 합성 칸 칸 칸]</span>';
    if (t === 'setdrop') return '<b>세트 드롭</b> ' + (s.hid ? huntLink(s.hid) : esc(s.fname)) + ' <span class="muted">' + s.pm / 10 + '%</span>';
    if (t === 'mob') return '<b>몹 드롭</b> ' + esc(s.mob) + ' <span class="muted">Lv.' + s.lv + ' · 값 ' + s.p + '</span> @ ' + (s.hid ? huntLink(s.hid) : esc(s.fname) + ' (' + s.floor + ')');
    if (t === 'shop' || t === 'shop80') return '<b>' + (t === 'shop80' ? '8.0 상인' : '상점') + '</b> ' + esc(s.npc) + ' <span class="muted">· ' + esc(s.fname) + ' (' + s.x + ',' + s.y + ')</span> ' + warp(s.floor, s.x, s.y + 1);
    if (t === 'quest') { var q = questById[s.no]; return '<b>퀘스트 보상</b> <a href="#/quests/' + s.no + '">#' + s.no + ' ' + esc(q ? q.title : '') + '</a>' + (s.rand ? ' <span class="muted">(무작위 중 하나)</span>' : '') + (q && q.prev.length ? ' <span class="muted small">선행 ' + q.prev.map(function (p) { return '#' + p; }).join('→') + '</span>' : ''); }
    if (t === 'exchange') return '<b>교환 NPC</b> ' + esc(s.npc) + ' <span class="muted">· ' + esc(s.fname) + ' (' + s.x + ',' + s.y + ')</span> ' + warp(s.floor, s.x, s.y + 1) + (s.rand ? ' <span class="muted">(무작위)</span>' : '');
    if (t === 'craft') return '<b>가공·제작</b> ' + esc(s.npc) + ' <span class="muted">· ' + esc(s.fname) + '</span> ' + warp(s.floor, s.x, s.y + 1) + '<div class="small">재료 ' + thingIcons(s.need.map(function (n) { return { k: 'item', id: n[0], name: n[1], n: n[2] }; })) + (s.gold ? ' + ' + esc(s.gold) + ' 스톤' : '') + '</div>';
    return esc(JSON.stringify(s));
  }
  function srcShort(s) {
    return { tier: '희귀 드롭 T' + (s.tier + 1), boss: 'T' + (s.tier + 1) + ' 보스 보상', fk: '화염의 기사(T6·보스)', cons: '사냥 소모품 드롭', setdrop: '세트 드롭 ' + (s.fname || ''), mob: '몹 드롭: ' + (s.mob || ''),
      shop: '상점: ' + (s.npc || ''), shop80: '8.0 상인: ' + (s.npc || ''), quest: '퀘스트 #' + s.no, exchange: '교환: ' + (s.npc || ''), craft: '제작: ' + (s.npc || ''), stone: '마석 드롭(준비)', stoneboss: '보스 마석(준비)', stonesyn: '마석 합성(준비)' }[s.t] || s.t;
  }
  function getSection(list, more, gm) {
    if (!list.length) return '<div class="panel"><h3>얻는 방법</h3><p>GM 전용 — 서버 자료에서 드롭·상점·퀘스트·교환 경로를 찾지 못했습니다. ' + gm + '</p></div>';
    return '<div class="panel"><h3>얻는 방법</h3><div class="rec"><span class="tag ride">추천 루트</span> ' + srcHtml(list[0]) + '</div><ol class="srcs">' + list.slice(1).map(function (s) { return '<li>' + srcHtml(s) + '</li>'; }).join('') + '</ol>' +
      (more ? '<p class="muted small">… 외 ' + more + '곳</p>' : '') + '<p class="muted small">추천 = 요구 레벨이 낮고 확률이 높은 순. GM: ' + gm + '</p></div>';
  }

  // ---------------------------------------------------------------- 펫
  var pState = { cat: '', tier: '', fam: '', el: '', get: '', org: '', band: '', q: '', sort: 'id', shown: 120 };
  var PCATS = ['탑승', '전설', '기계', '거대', '신규', '8.0', '원작', '보스'];
  var TIERC = { 'S+': '#c2255c', S: '#d9480f', A: '#b26b00', B: '#2457c5', C: '#2b8a3e', D: '#667085' };
  function nameNote(x, small) {
    var s = '';
    if (x.gn) s += ' <span class="tag nm15" title="게임 안에서는 아직 「' + esc(x.gn) + '」 — 15차에 공식 이름으로 바뀔 예정">15차 이름 예정</span>' + (small ? '' : '<div class="small muted">게임 안 이름(14차): ' + esc(x.gn) + '</div>');
    else if (x.an && !small) s += '<div class="small muted">공식 이름 후보(검토 중): ' + esc(x.an) + '</div>';
    return s;
  }
  function tierBadge(t) { return '<span class="tier" style="background:' + (TIERC[t] || '#667085') + '">' + t + '</span>'; }
  function petCard(p) {
    return '<div class="card pet-card" data-go="#/pet/' + p.id + '"><div class="pic">' + petAnim(p, 100) + '</div><div class="idrow"><span>' + tierBadge(p.tier) + ' <span class="id">' + p.id + '</span></span>' + copyBtn('[gm petmake ' + p.id + ' 1]', 'petmake') + '</div>' +
      '<div class="nm" title="' + esc(p.n) + '">' + esc(p.n) + nameNote(p, true) + '</div>' + (p.gn ? '<div class="small muted">게임: ' + esc(p.gn) + '</div>' : '') + '<div>' + tags(p.c) + '<span class="tag">' + esc(p.fam) + '</span></div><div class="idrow small"><span>' + elemHtml(p.el) + '</span>' + (p.r.length ? rows12(p.r) : '') + '</div>' +
      '<div class="muted small ellip">' + esc(p.get.join('·')) + (p.mlv ? ' · Lv.' + p.mlv + '~' : '') + ' · S급 Lv100 ' + p.sc + '</div></div>';
  }
  function opts(list, cur, all) { return '<option value="">' + all + '</option>' + list.map(function (x) { var v = Array.isArray(x) ? x[0] : x, l = Array.isArray(x) ? x[1] : x; return '<option value="' + esc(v) + '"' + (String(cur) === String(v) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join(''); }
  function uniq(arr) { var o = []; arr.forEach(function (x) { if (x != null && o.indexOf(x) < 0) o.push(x); }); return o; }
  function pagePets(params) {
    if (params.cat != null) pState.cat = params.cat;
    if (params.q != null) pState.q = params.q;
    var fams = uniq(P.map(function (p) { return p.fam; })).sort(), orgs = uniq(P.map(function (p) { return p.org; })).sort();
    var h = '<h1>펫 도감 <span class="muted small">' + P.length + '종</span></h1><p class="muted">빨간 숫자 = <code>[gm petmake 번호 레벨]</code>. 등급 S+~D = 서버 식(gmsv)으로 계산한 <b>S급(최고) 개체 Lv100</b> 능력 합의 순위(<a href="#/pets?tiers=1">기준</a>, guide-overrides.json으로 보정). 막대 12칸 = 탑승 가능한 몸.</p>';
    h += '<div class="chips" id="pc">' + [''].concat(PCATS).map(function (c) { var n = c ? P.filter(function (p) { return p.c.indexOf(c) >= 0; }).length : P.length; return '<button class="chip' + (pState.cat === c ? ' on' : '') + '" data-c="' + c + '">' + (c ? (c === '탑승' ? '탑승 가능' : c) : '전체') + ' ' + n + '</button>'; }).join('') + '</div>';
    h += '<div class="chips" id="pt">' + ['', 'S+', 'S', 'A', 'B', 'C', 'D'].map(function (t) { var n = t ? P.filter(function (p) { return p.tier === t; }).length : ''; return '<button class="chip' + (pState.tier === t ? ' on' : '') + '" data-c="' + t + '">' + (t ? t + '급 ' + n : '등급 전체') + '</button>'; }).join('') + ' <a class="chip" href="#/pets?tiers=1">등급 기준 보기</a></div>';
    if (params.tiers) h += tierCriteria();
    h += '<div class="toolbar"><input type="search" id="pq" placeholder="이름·번호·기술" value="' + esc(pState.q) + '">' +
      '<select id="pf">' + opts(fams, pState.fam, '계열 전체') + '</select><select id="pe">' + opts([['지', '지'], ['수', '수'], ['화', '화'], ['풍', '풍']], pState.el, '속성 전체') + '</select>' +
      '<select id="pg2">' + opts(['야생', '보스', '퀘스트', 'GM 전용'], pState.get, '얻는 방법 전체') + '</select><select id="po">' + opts(orgs, pState.org, '출신 전체') + '</select>' +
      '<select id="pb">' + opts([['a', '출현 Lv~30'], ['b', '31~80'], ['c', '81~150'], ['d', '151+'], ['n', '야생 없음']], pState.band, '출현 레벨 전체') + '</select>' +
      '<select id="ps">' + opts([['id', '번호순'], ['name', '이름순'], ['sc', '등급 점수(S급 Lv100 합)'], ['gt', 'S급 레벨당 성장 합'], ['gr', '포획 성장률(LVUPPOINT)'], ['sum', '기본치 합'], ['g0', 'S급 체력 성장'], ['g1', 'S급 공격 성장'], ['g2', 'S급 방어 성장'], ['g3', 'S급 순발 성장'], ['hp', '체력 기본치'], ['atk', '공격 기본치'], ['def', '방어 기본치'], ['spd', '순발 기본치'], ['mlv', '출현 레벨']], pState.sort, '정렬') + '</select><span class="count" id="pn"></span></div>' +
      '<div class="grid cards" id="pg"></div><button class="more" id="pm">더 보기</button>';
    app.innerHTML = h;
    function band(p) { var l = p.mlv; return l == null ? 'n' : l <= 30 ? 'a' : l <= 80 ? 'b' : l <= 150 ? 'c' : 'd'; }
    function list() {
      var q = pState.q.toLowerCase().trim();
      var l = P.filter(function (p) {
        if (pState.cat && p.c.indexOf(pState.cat) < 0) return false;
        if (pState.tier && p.tier !== pState.tier) return false;
        if (pState.fam && p.fam !== pState.fam) return false;
        if (pState.el && (p.el || '').indexOf(pState.el) < 0) return false;
        if (pState.get && p.get.indexOf(pState.get) < 0) return false;
        if (pState.org && p.org !== pState.org) return false;
        if (pState.band && band(p) !== pState.band) return false;
        if (q && ((p.n + ' ' + (p.gn || '') + ' ' + (p.an || '') + ' ' + p.sk.join(' ')).toLowerCase().indexOf(q) < 0 && String(p.id) !== q && (p.alt || []).indexOf(+q) < 0)) return false;
        return true;
      });
      var k = { hp: 0, atk: 1, def: 2, spd: 3 }[pState.sort], sum = function (p) { return p.st[0] + p.st[1] + p.st[2] + p.st[3]; };
      if (pState.sort === 'name') l.sort(function (a, b) { return a.n.localeCompare(b.n, 'ko'); });
      else if (k != null) l.sort(function (a, b) { return b.st[k] - a.st[k] || a.id - b.id; });
      else if (pState.sort === 'sum') l.sort(function (a, b) { return sum(b) - sum(a) || a.id - b.id; });
      else if (pState.sort === 'sc') l.sort(function (a, b) { return b.sc - a.sc || a.id - b.id; });
      else if (pState.sort === 'gr') l.sort(function (a, b) { return b.gr - a.gr || a.id - b.id; });
      else if (pState.sort === 'gt') { var gs = function (p) { return p.grw[0] + p.grw[1] + p.grw[2] + p.grw[3]; }; l.sort(function (a, b) { return gs(b) - gs(a) || a.id - b.id; }); }
      else if (/^g\d$/.test(pState.sort)) { var gk = +pState.sort[1]; l.sort(function (a, b) { return b.grw[gk] - a.grw[gk] || a.id - b.id; }); }
      else if (pState.sort === 'mlv') l.sort(function (a, b) { return (a.mlv == null ? 999 : a.mlv) - (b.mlv == null ? 999 : b.mlv) || a.id - b.id; });
      return l;
    }
    function render() { var l = list(); $('#pn').textContent = l.length + '종'; $('#pg').innerHTML = l.slice(0, pState.shown).map(petCard).join(''); $('#pm').hidden = l.length <= pState.shown; }
    function chipBind(sel, key) { $(sel).addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; pState[key] = b.getAttribute('data-c'); pState.shown = 120; [].forEach.call($(sel).children, function (c) { c.classList.toggle('on', c === b); }); render(); }); }
    chipBind('#pc', 'cat'); chipBind('#pt', 'tier');
    $('#pq').addEventListener('input', function () { pState.q = this.value; pState.shown = 120; render(); });
    [['#pf', 'fam'], ['#pe', 'el'], ['#pg2', 'get'], ['#po', 'org'], ['#pb', 'band'], ['#ps', 'sort']].forEach(function (x) { $(x[0]).addEventListener('change', function () { pState[x[1]] = this.value; pState.shown = 120; render(); }); });
    $('#pm').addEventListener('click', function () { pState.shown += 240; render(); });
    autoMore('#pm'); render();
  }
  function autoMore(sel) {
    if (!('IntersectionObserver' in window)) return;
    var b = $(sel); if (!b) return;
    new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && !b.hidden) b.click(); }); }, { rootMargin: '600px' }).observe(b);
  }
  function rideGrid(r) {
    var s = '<div class="ride-grid">';
    for (var i = 0; i < 12; i++) {
      var a = r.a[String(i)], ok = r.r.indexOf(i) >= 0;
      s += '<div class="ride-cell' + (ok ? '' : ' no') + '">' + (ok && a ? spr('rd', 'a' + a, 84) : (ok ? '<span class="small">가능</span>' : '<span class="small">불가</span>')) + '<span>' + esc(BODY[i] || i) + '</span></div>';
    }
    return s + '</div>';
  }
  var GMSV_REF = '<p class="small muted">근거(gmsv): char/enemy.c:295 atoi로 읽기 · 767 ENEMY_getRank · 1497-1516 ENEMY_createPetFromEnemyIndex · char/char_data.c:1281-1336 CHAR_PetLevelUp · char/char.c:2973-3023 화면 값 · setup.cf:177 soloHuntBalance=1 · include/util.h:79 RAND(양 끝 포함)</p>';
  var RANK_RAND = [[450, 500], [470, 520], [490, 540], [510, 560], [530, 580], [550, 600]];
  function tierCriteria() {
    var c = M.tier_cut || {};
    return '<div class="panel"><h3>펫 등급(S+~D) 기준 — S급 개체 Lv100</h3><p>등급 점수 = <b>S급(최고) 개체를 Lv1에 잡아 Lv100까지 키웠을 때 네 능력(체력·공격·방어·순발)의 합</b>(기댓값, ÷100 표시)을 보스를 뺀 전체 펫과 비교한 순위입니다.</p>' +
      '<ol class="small"><li><b>잡을 때(개체 차이)</b>: 기본치 B 마다 <b>−2~+2</b> 무작위(고르게 5가지). S급 = 네 능력 모두 +2, 평균 = ±0, 최저 = 모두 −2. 이 값(B±2)이 평생 성장 기준으로 저장됩니다.</li>' +
      '<li>그다음 <b>추가 10점</b>을 네 능력에 무작위로 나눔(합은 늘 10, 한 능력 평균 2.5).</li>' +
      '<li><b>Lv1 능력</b> = INITNUM × (B±2 + 추가점). Lv L(&gt;1)에서 잡으면 ((L−1)×LVUPPOINT + INITNUM) × (B±2 + 추가점) — LVUPPOINT는 이때만 쓰입니다(서버가 atoi로 읽어 4.5 → 4).</li>' +
      '<li><b>레벨업 1번</b> = 능력마다 int((B±2 + 그 레벨 무작위 10점 중 몫) × f), f = RAND(종 등급표) × 0.02. 종 등급은 기본치 합(ΣB)으로: 100↑ 9.0~10.0 · 95↑ 9.4~10.4 · 90↑ 9.8~10.8 · 85↑ 10.2~11.2 · 80↑ 10.6~11.6 · 그 아래 11.0~12.0. 기본치 합이 낮은 종일수록 f가 커서 성장이 보정됩니다.</li>' +
      '<li>표의 “레벨당 성장”·Lv100/200/300 은 레벨마다의 무작위(f, 10점)를 기댓값으로 계산(float 계산 뒤 int 자름까지 서버와 같게). 실제 개체는 레벨마다 조금씩 오르내립니다.</li>' +
      '<li>게임 화면 값: 내구력 = 4×체력+공격+방어+순발, 공격력 = 공격+0.1×(방어+체력)+0.05×순발, 방어력 = 방어+0.1×(공격+체력)+0.05×순발, 순발력 = 순발 (모두 ÷100 단위).</li></ol>' + GMSV_REF +
      '<div class="tbl-wrap"><table><tr><th>등급</th><th>순위(상위)</th><th>S급 Lv100 합(이상)</th></tr>' +
      [['S+', '2%'], ['S', '8%'], ['A', '22%'], ['B', '47%'], ['C', '75%'], ['D', '나머지']].map(function (t) { return '<tr><td>' + tierBadge(t[0]) + '</td><td>' + t[1] + '</td><td class="num">' + (c[t[0]] != null ? c[t[0]] : '-') + '</td></tr>'; }).join('') +
      '</table></div><p class="muted small">전설·거대·기계는 등급과 별도로 배지로 표시. 수동 보정: localization/ko-KR/guide-overrides.json pets.{번호}.tier</p></div>';
  }
  function gameVals(v) {
    return [Math.floor(4 * v[0] + v[1] + v[2] + v[3]), Math.floor(v[1] + 0.1 * v[2] + 0.1 * v[0] + 0.05 * v[3]), Math.floor(v[2] + 0.1 * v[1] + 0.1 * v[0] + 0.05 * v[3]), Math.floor(v[3])];
  }
  function r2(x) { return Math.round(x * 100) / 100; }
  function statTable(p) {
    var lab = ['체력', '공격', '방어', '순발'], R = p.roll || {}, S = R.s;
    if (!S) return '';
    function row(name, arr, cls) {
      var sum = arr.reduce(function (a, b) { return a + b; }, 0);
      return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + name + '</td>' + arr.map(function (v) { return '<td class="num">' + v + '</td>'; }).join('') + '<td class="num"><b>' + r2(sum) + '</b></td></tr>';
    }
    function head(t) { return '<tr><th>' + t + '</th>' + lab.map(function (l) { return '<th class="num">' + l + '</th>'; }).join('') + '<th class="num">합</th></tr>'; }
    return '<div class="tbl-wrap"><table class="stat-t">' + head('S급(최고) 개체') +
      row('종 기본치 B', p.base, 'dim') + row('S급 기본치 (B+2)', S.a) + row('S급 Lv1 능력', S.l1) + row('S급 레벨당 성장', S.g) + row('<b>S급 Lv100</b>', S.l100, 'hl') + row('S급 Lv200', S.l200) + row('S급 Lv300', S.l300) +
      '<tr class="dim"><td>게임 화면 Lv100<br><span class="small">내구·공격·방어·순발</span></td>' + gameVals(S.l100).map(function (v) { return '<td class="num">' + v + '</td>'; }).join('') + '<td></td></tr></table></div>' +
      '<details class="roll-more"><summary>평균 개체 · 최저 개체 보기</summary><div class="tbl-wrap"><table class="stat-t">' + head('개체') +
      [['a', '평균(±0)'], ['m', '최저(−2)']].map(function (k) { var X = R[k[0]]; return row(k[1] + ' 기본치', X.a, 'dim') + row(k[1] + ' Lv1', X.l1) + row(k[1] + ' 레벨당', X.g) + row(k[1] + ' Lv100', X.l100, 'hl') + row(k[1] + ' Lv300', X.l300); }).join('') + '</table></div></details>' +
      '<p class="muted small">INITNUM ' + p.init + ' · LVUPPOINT ' + p.gr + '(포획 Lv&gt;1일 때만) · 종 등급 ' + p.rk + '(기본치 합 ' + p.base.reduce(function (a, b) { return a + b; }, 0) + ') → 레벨업 f ' + (RANK_RAND[p.rk][0] * 0.02).toFixed(1) + '~' + (RANK_RAND[p.rk][1] * 0.02).toFixed(1) +
      '<br>Lv1 = INITNUM × (B±2 + 추가 10점 몫) · 레벨당 = int((B±2 + 10점 몫) × f)의 기댓값 · <a href="#/pets?tiers=1">식 자세히</a></p>';
  }
  function spotsHtml(p) {
    if (!(p.spots || []).length) return '';
    return '<div class="panel"><h3>야생 출현 자리 (낮은 레벨 순)</h3><div class="tbl-wrap"><table><tr><th>층</th><th>출현 구역(x1,y1~x2,y2)</th><th class="num">레벨</th><th class="num">출현 비율</th><th>포획</th><th>가기</th></tr>' +
      p.spots.map(function (w) {
        var cx = Math.round((w.rect[0] + w.rect[2]) / 2), cy = Math.round((w.rect[1] + w.rect[3]) / 2), hx = w.hid && huntById[w.hid];
        return '<tr' + (w.lo <= 1 ? ' class="hl"' : '') + '><td>' + esc(w.fn) + ' <span class="muted small">(' + w.f + ')</span>' + (hx ? '<div class="small">' + huntLink(w.hid) + '</div>' : '') + '</td><td class="small">' + w.rect.join(',').replace(/^(\d+),(\d+),/, '$1,$2~') + '</td><td class="num">' + w.lo + (w.hi !== w.lo ? '~' + w.hi : '') +
          '</td><td class="num">' + w.rate + '%</td><td>' + (w.c ? '<span class="tag ride">가능</span>' : '<span class="tag">불가</span>') + '</td><td>' + warp(w.f, cx, cy) + (hx && hx.route ? ' <a href="#/hunt/' + w.hid + '">경로</a>' : '') + '</td></tr>';
      }).join('') + '</table></div><p class="muted small">출현 비율 = 그 조우 구역에서 이 몹이 뽑힐 비율(그룹 가중치 × 그룹 안 비율). Lv1 출현은 강조 표시. ' + (p.nspots > p.spots.length ? '외 ' + (p.nspots - p.spots.length) + '곳' : '') + '</p></div>';
  }
  function statBars(p) {
    var lab = ['체력', '공격', '방어', '순발'], S = (p.roll || {}).s, mx = M.l100max || [600, 600, 600, 600];
    if (!S) return '';
    return '<div class="bars"><div class="small muted">S급 Lv100 능력</div>' + S.l100.map(function (v, k) { return '<div class="bar"><span>' + lab[k] + '</span><i style="width:' + Math.min(100, v / mx[k] * 100) + '%"></i><b>' + v + '</b></div>'; }).join('') + '</div>';
  }

  // ---------------------------------------------------------------- 움직임 보기(동작·8방향 캔버스)
  // 방향 번호: 0 아래(앞) · 1 왼쪽 아래 · 2 왼쪽 · 3 왼쪽 위 · 4 위(뒤) · 5 오른쪽 위 · 6 오른쪽 · 7 오른쪽 아래
  var DIR_ARROW = ['↓', '↙', '←', '↖', '↑', '↗', '→', '↘'], DIR_KO = ['앞', '왼쪽 앞', '왼쪽', '왼쪽 뒤', '뒤', '오른쪽 뒤', '오른쪽', '오른쪽 앞'];
  var PAD = [3, 4, 5, 2, -1, 6, 1, 0, 7];
  var ACT_ORDER = [3, 4, 0, 1, 10, 2, 9, 5, 6, 7, 8, 11, 12];
  function actName(a) { return ((A.act_ko || {})[a]) || ('동작 ' + a); }
  function loadAnim(id, cb) {
    SA.anim = SA.anim || {};
    if (SA.anim[id]) { cb(SA.anim[id]); return; }
    var sc = document.createElement('script');
    sc.src = String(id).charAt(0) === 'r' ? RB(id) + 'media/ranim/' + String(id).slice(1) + '.js' : 'media/anim/' + id + '.js';
    sc.onload = function () { cb(SA.anim[id] || null); };
    sc.onerror = function () { cb(null); };
    document.head.appendChild(sc);
  }
  var AV = null;
  function avStop() { if (AV && AV.timer) clearTimeout(AV.timer); if (AV) AV.dead = true; AV = null; }
  function avHtml(p, rr) {
    var rideRows = rr && rr.av ? Object.keys(rr.av) : [];
    return '<div class="panel av" id="av"><div class="av-head"><h3>움직임 보기</h3>' +
      (rideRows.length ? '<div class="seg" id="avMode"><button class="on" data-m="pet">펫</button><button data-m="ride">탑승</button></div><select id="avBody" hidden>' + rideRows.map(function (k) { return '<option value="' + k + '">' + esc(BODY[k] || ('몸 ' + k)) + '</option>'; }).join('') + '</select>' : '') +
      '</div><div class="av-main"><div class="av-stage"><canvas id="avCv" width="10" height="10"></canvas><div class="av-info small muted" id="avInfo">불러오는 중…</div><div class="small muted" id="avNote"></div></div>' +
      '<div class="av-ctl"><div class="av-acts" id="avActs"></div><div class="av-row"><div class="av-pad" id="avPad">' + PAD.map(function (d) { return d < 0 ? '<button data-rot="1" title="돌리기">⟳</button>' : '<button data-d="' + d + '" title="' + DIR_KO[d] + '">' + DIR_ARROW[d] + '</button>'; }).join('') + '</div>' +
      '<div class="av-btns"><div><button data-r="-1" title="왼쪽으로 돌리기">◀ 돌리기</button><button data-r="1" title="오른쪽으로 돌리기">돌리기 ▶</button></div>' +
      '<div><button id="avPlay" title="재생/멈춤 (스페이스)">⏸ 멈춤</button><button data-st="-1" title="이전 프레임 (,)">⏮</button><button data-st="1" title="다음 프레임 (.)">⏭</button></div>' +
      '<div><label class="small">속도 <select id="avSpd"><option value="0.25">0.25x</option><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option></select></label> ' +
      '<label class="small">크기 <select id="avZ"><option value="1">1x</option><option value="2" selected>2x</option><option value="3">3x</option></select></label></div></div></div>' +
      '<div class="muted small">키보드: ←/→ 방향 돌리기 · ↑/↓ 동작 바꾸기 · 스페이스 재생/멈춤 · , . 한 프레임씩</div></div></div></div>';
  }
  function avInit(p, rr) {
    avStop();
    var st = { id: p.img, act: 3, dir: 1, fi: 0, play: true, spd: 1, z: innerWidth < 600 ? 2 : 2, data: null, img: null, timer: 0 };
    AV = st;
    var cv = $('#avCv'), ctx = cv.getContext('2d');
    function acts() { return st.data ? ACT_ORDER.filter(function (a) { return st.data.a[a]; }).concat(Object.keys(st.data.a).map(Number).filter(function (a) { return ACT_ORDER.indexOf(a) < 0; })) : []; }
    function seq() { var a = st.data && st.data.a[st.act]; if (!a) return null; return a[st.dir] || a[Object.keys(a)[0]]; }
    function drawActs() {
      $('#avActs').innerHTML = acts().map(function (a) { return '<button data-a="' + a + '" class="' + (a === st.act ? 'on' : '') + '">' + esc(actName(a)) + '</button>'; }).join('');
      var dirs = st.data && st.data.a[st.act] ? st.data.a[st.act] : {};
      [].forEach.call($('#avPad').querySelectorAll('[data-d]'), function (b) { var d = +b.getAttribute('data-d'); b.className = (d === st.dir ? 'on' : '') ; b.disabled = !dirs[d]; });
    }
    function draw() {
      if (!st.data || !st.img) return;
      var d = st.data, b = d.b, z = st.z, pad = 6, W = (b[2] - b[0] + pad * 2), Hh = (b[3] - b[1] + pad * 2);
      if (cv.width !== W * z || cv.height !== Hh * z) { cv.width = W * z; cv.height = Hh * z; cv.style.width = W * z + 'px'; cv.style.height = Hh * z + 'px'; }
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, cv.width, cv.height);
      var sq = seq();
      if (!sq) return;
      var f = d.f[sq[1][st.fi % sq[1].length]];
      ctx.drawImage(st.img, f[0], f[1], f[2], f[3], (f[4] - b[0] + pad) * z, (f[5] - b[1] + pad) * z, f[2] * z, f[3] * z);
      $('#avInfo').textContent = actName(st.act) + ' · ' + DIR_KO[st.dir] + '(' + st.dir + ') · 프레임 ' + (st.fi % sq[1].length + 1) + '/' + sq[1].length + ' · ' + sq[0] + 'ms';
    }
    function tick() {
      if (st.dead || AV !== st) return;
      if (!document.body.contains(cv)) { avStop(); return; }
      var sq = seq();
      if (st.play && sq) { st.fi = (st.fi + 1) % sq[1].length; draw(); }
      st.timer = setTimeout(tick, Math.max(30, (sq ? sq[0] : 100) / st.spd));
    }
    function load(id) {
      st.id = id; st.data = null; st.img = null; $('#avInfo').textContent = '불러오는 중…';
      loadAnim(id, function (d) {
        if (st.dead || st.id !== id) return;
        if (!d) { $('#avInfo').textContent = '움직임 그림이 없습니다.'; return; }
        var im = new Image();
        im.onload = function () {
          if (st.dead || st.id !== id) return;
          st.data = d; st.img = im;
          if (!d.a[st.act]) st.act = acts()[0];
          if (!d.a[st.act][st.dir]) st.dir = +Object.keys(d.a[st.act])[0];
          st.fi = 0; drawActs(); draw();
          $('#avNote').textContent = d.lv === 'lite' ? '용량 때문에 서기·걷기만 8방향, 다른 동작은 대각선 4방향' : d.lv === 'field' ? '용량 때문에 서기·걷기만 8방향, 다른 동작은 앞쪽 1방향' : '';
        };
        im.src = (String(id).charAt(0) === 'r' ? RB(id) : '') + d.s;
      });
    }
    function setDir(d) { st.dir = (d + 8) % 8; st.fi = 0; drawActs(); draw(); }
    function rot(k) { var dirs = st.data && st.data.a[st.act] || {}; var d = st.dir; for (var i = 0; i < 8; i++) { d = (d + k + 8) % 8; if (dirs[d]) break; } setDir(d); }
    function step(k) { var sq = seq(); if (!sq) return; st.play = false; $('#avPlay').textContent = '▶ 재생'; st.fi = (st.fi + k + sq[1].length) % sq[1].length; draw(); }
    function setAct(a) { st.act = a; st.fi = 0; if (!st.data.a[a][st.dir]) st.dir = +Object.keys(st.data.a[a])[0]; drawActs(); draw(); }
    $('#av').addEventListener('click', function (e) {
      var t = e.target.closest('button'); if (!t) return;
      if (t.hasAttribute('data-a')) setAct(+t.getAttribute('data-a'));
      else if (t.hasAttribute('data-d')) setDir(+t.getAttribute('data-d'));
      else if (t.hasAttribute('data-rot')) rot(1);
      else if (t.hasAttribute('data-r')) rot(+t.getAttribute('data-r'));
      else if (t.hasAttribute('data-st')) step(+t.getAttribute('data-st'));
      else if (t.id === 'avPlay') { st.play = !st.play; t.textContent = st.play ? '⏸ 멈춤' : '▶ 재생'; }
      else if (t.hasAttribute('data-m')) {
        [].forEach.call($('#avMode').children, function (x) { x.className = x === t ? 'on' : ''; });
        var ride = t.getAttribute('data-m') === 'ride';
        $('#avBody').hidden = !ride;
        load(ride ? 'r' + rr.a[$('#avBody').value] : p.img);
      }
    });
    if ($('#avBody')) $('#avBody').addEventListener('change', function () { load('r' + rr.a[this.value]); });
    st.load = load;
    $('#avSpd').addEventListener('change', function () { st.spd = +this.value; });
    $('#avZ').addEventListener('change', function () { st.z = +this.value; draw(); });
    load(p.img);
    tick();
  }
  document.addEventListener('keydown', function (e) {
    if (!AV || !AV.data || /INPUT|SELECT|TEXTAREA/.test((e.target || {}).tagName || '') || !$('#modal').hidden) return;
    var k = e.key, b = function (sel) { var x = $('#av').querySelector(sel); if (x) x.click(); };
    if (k === 'ArrowLeft') { b('[data-r="-1"]'); e.preventDefault(); }
    else if (k === 'ArrowRight') { b('[data-r="1"]'); e.preventDefault(); }
    else if (k === ' ') { b('#avPlay'); e.preventDefault(); }
    else if (k === ',') b('[data-st="-1"]');
    else if (k === '.') b('[data-st="1"]');
    else if (k === 'ArrowUp' || k === 'ArrowDown') {
      var l = [].map.call($('#avActs').querySelectorAll('[data-a]'), function (x) { return +x.getAttribute('data-a'); }), i = l.indexOf(AV.act);
      if (l.length) { var x = $('#avActs').querySelector('[data-a="' + l[(i + (k === 'ArrowDown' ? 1 : -1) + l.length) % l.length] + '"]'); if (x) x.click(); e.preventDefault(); }
    }
  });
  function pagePet(id) {
    var p = petById[id];
    if (!p) { app.innerHTML = '<p>펫을 찾지 못했습니다.</p>'; return; }
    var rr = rideById[p.id];
    var wl = p.wild.filter(function (w) { return w.c; }).concat(p.wild.filter(function (w) { return !w.c; }));
    var hx0 = wl.map(function (w) { return w.hid && huntById[w.hid]; }).filter(Boolean)[0];
    var S = (p.roll || {}).s;
    var h = '<p><a href="#/pets">← 펫 도감</a></p>' + hero({
      el: EL_KO[domEl(p.el)], bg: hx0 && (hx0.scenes || [])[0] ? sceneBg(hx0.scenes[0].id) : '',
      pic: petAnim(p, 240, true), title: esc(p.n) + ' <span class="id">' + p.id + '</span>', sub: nameNote(p),
      tags: tags(p.c) + '<span class="tag">' + esc(p.fam) + '</span><span class="tag">' + esc(p.org) + '</span>',
      facts: [['속성', elemHtml(p.el) || '무'], ['얻는 방법', esc(p.get.join(' · ')) + (p.mlv ? ' <span class="muted">· 야생 Lv.' + p.mlv + '~</span>' : '')],
        ['출현', wl.slice(0, 3).map(function (w) { return (w.hid ? huntLink(w.hid) : esc(w.fn)) + ' <span class="muted small">Lv.' + w.lo + (w.hi !== w.lo ? '~' + w.hi : '') + (w.c ? '' : ' 포획 불가') + '</span>'; }).join('<br>')],
        ['탑승', rr ? '<a class="hero-ride" href="#/ride/' + rr.id + '">' + (rr.gif ? '<img class="gif" loading="lazy" src="' + rr.gif[0] + '" height="' + Math.min(72, rr.gif[2]) + '" alt="">' : '') + ' 탈 수 있음 · 몸 ' + rr.r.length + '/12 ›</a>' : '<span class="muted">탈 수 없음</span>'],
        ['기술', p.sk.length ? esc(p.sk.join(', ')) : '']],
      cmds: copyBtn('[gm petmake ' + p.id + ' 1]') + ' ' + copyBtn('[gm petmake ' + p.id + ' 100]') + ' ' + copyBtn('[gm petmake ' + p.id + ' 300]'),
      side: bigBadge(p.tier, TIERC[p.tier] || '#667085', p.sc, 'S급 Lv100 합', (S ? '<div class="hero-mini">Lv1 ' + r2(S.l1.reduce(function (a, b) { return a + b; }, 0)) + ' · 레벨당 +' + r2(S.g.reduce(function (a, b) { return a + b; }, 0)) + '</div>' : '') + '<a class="small" href="#/pets?tiers=1">등급 기준 ›</a>') +
        '<div class="hs-bars">' + sBars(p) + '<div><div class="hs-cap">속성</div>' + elemBars(p.el) + '</div></div>'
    });
    h += '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(340px,1fr))"><div class="panel"><h3>능력치</h3>' + statBars(p) + statTable(p) + '<div class="kv"><div>등급 점수</div><div>S급 Lv100 합 ' + p.sc + ' (' + p.tier + '급) <a href="#/pets?tiers=1">기준</a></div><div>속성</div><div>' + (elemHtml(p.el) || '무') + '</div><div>기술</div><div>' + (p.sk.length ? p.sk.map(esc).join(', ') : '-') + '</div>' +
      '<div>종·그림</div><div>' + p.t + ' / ' + p.img + '</div>' + (p.nalt ? '<div>같은 펫 번호</div><div class="small">' + p.alt.join(', ') + (p.nalt > p.alt.length ? ' 외 ' + (p.nalt - p.alt.length) : '') + '</div>' : '') + '</div></div>';
    // 얻는 방법
    var ways = [];
    p.wild.forEach(function (w) { ways.push({ lv: w.c ? w.lo : 999, html: '<b>' + (w.c ? '야생 포획' : '야생 출현(포획 불가)') + '</b> ' + (w.hid ? huntLink(w.hid) : esc(w.fn) + ' <span class="muted">(' + w.f + ')</span>') + ' <span class="muted">Lv.' + w.lo + (w.hi !== w.lo ? '~' + w.hi : '') + '</span>' + (w.hid && huntById[w.hid] && huntById[w.hid].entry ? ' ' + warp(huntById[w.hid].entry[0], huntById[w.hid].entry[1], huntById[w.hid].entry[2]) : '') }); });
    (p.q || []).forEach(function (s) { ways.push({ lv: (questById[s.no] || {}).lv || 0, html: srcHtml(s) }); });
    if (p.c.indexOf('보스') >= 0) ways.push({ lv: 500, html: '<b>던전 보스</b> — 포획 불가, GM으로만 만들 수 있습니다.' });
    ways.sort(function (a, b) { return a.lv - b.lv; });
    h += '<div class="col-stack"><div class="panel"><h3>얻는 방법</h3>' + (ways.length ? '<div class="rec"><span class="tag ride">추천 루트</span> ' + ways[0].html + '</div><ol class="srcs">' + ways.slice(1).map(function (w) { return '<li>' + w.html + '</li>'; }).join('') + '</ol>' : '<p>GM 전용(야생·퀘스트 경로 없음)</p>') +
      '<p class="muted small">GM: ' + copyBtn('[gm petmake ' + p.id + ' 1]') + '</p></div>' + (p.av ? avHtml(p, rr) : '') + '</div></div>';
    h += spotsHtml(p);
    var w0 = p.wild.filter(function (w) { return w.c && w.hid; })[0];
    if (w0) { var x = huntById[w0.hid]; if (x && x.mm) h += '<h2>잡으러 가는 곳: ' + esc(x.label) + '</h2>' + (x.route ? routeHtml(x.route, halfW(2)) : '') + '<div class="figs">' + (x.scenes || []).slice(0, 1).map(function (s) { return sceneHtml(s.id, s.marks.map(function (m, k) { return { x: m.x, y: m.y, k: m.k, t: m.t, n: k + 1 }; }), s.title, bigScale(2)); }).join('') + '</div>'; }
    if (p.r.length) { var r = rideById[p.id]; h += '<h2>탑승 (' + p.r.length + '/12 몸)</h2><p class="muted small">펫 칸에 넣고 <code>[gm 펫탑승 칸번호]</code>. ' + (r ? '<a href="#/ride/' + r.id + '">몸마다 움직임 보기 ›</a>' : '') + '</p>' + (r ? rideGrid(r) : rows12(p.r)); }
    if (p.sib.length) h += '<h2>같은 계열(색·변종)</h2><div class="grid cards">' + p.sib.map(function (i) { return petById[i]; }).filter(Boolean).map(petCard).join('') + '</div>';
    app.innerHTML = h;
    if (p.av) avInit(p, rr);
  }

  // ---------------------------------------------------------------- 아이템
  var GROUPS = [['', '전체'], ['w', '무기', [0, 1, 2, 3, 4, 17, 18, 19]], ['a', '방어구', [5, 6, 7]], ['x', '장신구', [8, 9, 10, 11, 12, 13, 14, 15]], ['c', '소모품', null, ['회복약', '전체 회복', '공격 마석', '경험치', '요리']],
    ['p', '펫 아이템', null, ['펫 아이템']], ['m', '재료', null, ['재료']], ['q', '퀘스트', null, ['퀘스트']], ['o', '기타', [16, 21, 22, 23]]];
  var iState = { g: '', sub: '', tier: '', src: '', v80: false, set: false, q: '', band: '', sort: 'id', shown: 120, tab: 'items' };
  function itemCard(i) {
    return '<div class="card icard" data-go="#/item/' + i.id + '"><div class="ic">' + itemImg(i.img, 80, 3) + '</div><div class="qbody"><div class="idrow"><span class="id">' + i.id + '</span>' + copyBtn('[gm additem ' + i.id + ' 1]', 'additem') + '</div>' +
      '<b class="ellip" title="' + esc(i.n) + '">' + esc(i.n) + '</b>' + nameNote(i, true) + (i.gn ? '<div class="small muted ellip">게임: ' + esc(i.gn) + '</div>' : '') + '<div class="small ellip">' + esc(i.sub) + (i.lv ? ' · Lv' + i.lv : '') + (i.st ? ' · ' + esc(i.st) : '') + '</div>' +
      '<div>' + (i.v80 ? '<span class="tag v80">8.0</span>' : '') + (i.s ? '<span class="tag legend">세트</span>' : '') + (i.t != null ? '<span class="tag">' + (i.t < 6 ? 'T' + (i.t + 1) : '화염') + '</span>' : '') + '</div>' +
      '<div class="muted small ellip">' + esc(i.src.length ? srcShort(i.src[0]) + (i.src.length > 1 ? ' 외 ' + (i.src.length - 1 + (i.more || 0)) : '') : 'GM 전용') + '</div></div></div>';
  }
  function pageItems(params) {
    if (params.tier != null) { iState.tier = params.tier; iState.g = ''; }
    if (params.tab) iState.tab = params.tab;
    var h = '<h1>아이템 도감 <span class="muted small">' + IT.length + '개</span></h1><div class="tabs"><a href="#/items?tab=items" class="' + (iState.tab === 'items' ? 'on' : '') + '">아이템</a><a href="#/items?tab=sets" class="' + (iState.tab === 'sets' ? 'on' : '') + '">세트 묶음 ' + SETS.length + '</a></div>';
    if (iState.tab === 'sets') {
      h += '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(360px,1fr))">' + SETS.slice().sort(function (a, b) { return a.lv - b.lv; }).map(function (s) {
        return '<div class="panel"><h3>' + esc(s.name) + ' <span class="muted small">Lv.' + s.lv + ' · ' + s.ids.length + '부위</span></h3><div class="icons">' + s.ids.map(function (i) { var it = itemById[i]; return it ? '<a class="ico big" href="#/item/' + i + '">' + itemImg(it.img, 56, 2) + esc(it.n) + '</a>' : ''; }).join('') + '</div><p class="small">3부위 이상: ' + esc(s.bonus || '부위별 능력') + '</p>' +
          (s.drops.length ? '<p class="small muted">드롭: ' + s.drops.map(function (d) { return (d.hid ? huntLink(d.hid) : esc(d.fname)) + ' ' + d.pm / 10 + '%'; }).join(', ') + '</p>' : '') + '</div>';
      }).join('') + '</div>';
      app.innerHTML = h; return;
    }
    var grp = GROUPS.filter(function (g) { return g[0] === iState.g; })[0];
    var subs = uniq(IT.filter(function (i) { return !grp || !grp[0] || (grp[2] ? grp[2].indexOf(i.ty) >= 0 : grp[3].indexOf(i.sub) >= 0); }).map(function (i) { return i.sub; })).sort();
    h += '<div class="chips" id="ig">' + GROUPS.map(function (g) { return '<button class="chip' + (iState.g === g[0] ? ' on' : '') + '" data-c="' + g[0] + '">' + g[1] + '</button>'; }).join('') + '</div>';
    h += '<div class="toolbar"><input type="search" id="iq" placeholder="이름·번호·능력" value="' + esc(iState.q) + '"><select id="isub">' + opts(subs, iState.sub, '세부 종류 전체') + '</select>' +
      '<select id="it">' + opts([[0, '희귀 T1'], [1, 'T2'], [2, 'T3'], [3, 'T4'], [4, 'T5'], [5, 'T6'], [6, '화염의 기사']], iState.tier, '등급 전체') + '</select>' +
      '<select id="is">' + opts(['사냥터 드롭', '보스', '상점', '8.0 상인', '퀘스트', '교환·제작', 'GM 전용'], iState.src, '얻는 곳 전체') + '</select>' +
      '<select id="ib">' + opts([['a', '착용 Lv0~20'], ['b', '21~50'], ['c', '51~80'], ['d', '81~100'], ['e', '101+']], iState.band, '레벨 전체') + '</select>' +
      '<select id="io">' + opts([['id', '번호순'], ['lv', '착용 레벨'], ['0', '공격 높은 순'], ['1', '방어 높은 순'], ['2', '순발 높은 순'], ['3', '체력 높은 순'], ['4', '기력 높은 순']], iState.sort, '정렬') + '</select>' +
      '<label><input type="checkbox" id="i8"> 8.0</label><label><input type="checkbox" id="iset"> 세트</label><span class="count" id="in"></span></div>';
    h += '<div class="grid icards" id="il"></div><button class="more" id="im">더 보기</button>';
    app.innerHTML = h;
    $('#i8').checked = iState.v80; $('#iset').checked = iState.set;
    function band(l) { return l <= 20 ? 'a' : l <= 50 ? 'b' : l <= 80 ? 'c' : l <= 100 ? 'd' : 'e'; }
    function list() {
      var q = iState.q.toLowerCase().trim();
      var l = IT.filter(function (i) {
        if (grp && grp[0] && (grp[2] ? grp[2].indexOf(i.ty) < 0 : grp[3].indexOf(i.sub) < 0)) return false;
        if (iState.sub && i.sub !== iState.sub) return false;
        if (iState.tier !== '' && String(i.t) !== String(iState.tier)) return false;
        if (iState.src && i.k.indexOf(iState.src) < 0) return false;
        if (iState.v80 && !i.v80) return false;
        if (iState.set && !i.s) return false;
        if (iState.band && band(i.lv) !== iState.band) return false;
        if (q && (i.n + ' ' + (i.gn || '') + ' ' + (i.an || '') + ' ' + i.st + ' ' + i.ef + ' ' + i.sub).toLowerCase().indexOf(q) < 0 && String(i.id) !== q && (i.same || []).indexOf(+q) < 0) return false;
        return true;
      });
      if (iState.sort === 'lv') l.sort(function (a, b) { return a.lv - b.lv || a.id - b.id; });
      else if (iState.sort !== 'id') { var k = +iState.sort; l.sort(function (a, b) { return b.sv[k] - a.sv[k] || a.id - b.id; }); }
      return l;
    }
    function render() { var l = list(); $('#in').textContent = l.length + '개'; $('#il').innerHTML = l.slice(0, iState.shown).map(itemCard).join('') || '<p class="pad muted">없음</p>'; $('#im').hidden = l.length <= iState.shown; }
    $('#ig').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; iState.g = b.getAttribute('data-c'); iState.sub = ''; iState.shown = 120; pageItems({}); });
    $('#iq').addEventListener('input', function () { iState.q = this.value; iState.shown = 120; render(); });
    [['#isub', 'sub'], ['#it', 'tier'], ['#is', 'src'], ['#ib', 'band'], ['#io', 'sort']].forEach(function (x) { $(x[0]).addEventListener('change', function () { iState[x[1]] = this.value; iState.shown = 120; render(); }); });
    $('#i8').addEventListener('change', function () { iState.v80 = this.checked; render(); });
    $('#iset').addEventListener('change', function () { iState.set = this.checked; render(); });
    $('#im').addEventListener('click', function () { iState.shown += 240; render(); });
    autoMore('#im'); render();
  }
  function pageItem(id) {
    var i = itemRep[id];
    if (!i) { app.innerHTML = '<p>아이템을 찾지 못했습니다.</p>'; return; }
    var s = i.s ? setBySuit[i.s] : null;
    var hsrc = i.src.filter(function (x) { return x.hid; })[0] || (i.src[0] && i.src[0].t === 'tier' ? { hid: ((H.tierHunts || {})[i.src[0].tier] || [])[0] } : null);
    var hx1 = hsrc && huntById[hsrc.hid];
    var tl = i.t != null ? (i.t < 6 ? 'T' + (i.t + 1) : '화염') : (i.v80 ? '8.0' : (i.lv ? 'Lv' + i.lv : ''));
    var h = '<p><a href="#/items">← 아이템 도감</a></p>' + hero({
      el: i.t != null ? 'rare' + Math.min(5, i.t) : (i.s ? 'set' : 'item'), bg: hx1 && (hx1.scenes || [])[0] ? sceneBg(hx1.scenes[0].id) : '',
      pic: '<div class="item-pic">' + itemImg(i.img, 170, 4) + '</div>', title: esc(i.n) + ' <span class="id">' + i.id + '</span>', sub: nameNote(i), tags: tags(i.k) + (i.v80 ? '<span class="tag v80">8.0 봉인해제</span>' : ''),
      facts: [['종류', esc(i.tn) + ' · ' + esc(i.sub)], ['착용 Lv', i.lv ? String(i.lv) : ''], ['능력', esc(i.st || '')], ['세트', s ? esc(s.name) + ' <span class="muted small">(' + s.ids.length + '부위)</span>' : ''],
        ['얻는 곳', i.src.length ? esc(srcShort(i.src[0])) + (i.src.length > 1 ? ' <span class="muted small">외 ' + (i.src.length - 1 + (i.more || 0)) + '</span>' : '') : 'GM 전용'], ['사냥터', hx1 ? huntLink(hsrc.hid) : '']],
      cmds: copyBtn('[gm additem ' + i.id + ' 1]') + ' ' + copyBtn('[gm additem ' + i.id + ' 5]'),
      side: tl ? bigBadge(tl, i.t != null ? (['#667085', '#2b8a3e', '#1971c2', '#7048e8', '#e8590c', '#c92a2a', '#c92a2a'][i.t] || '#667085') : '#475467', null, '') + '<div class="hero-mini small">' + (i.t != null ? '희귀 장비 등급' : i.v80 ? '8.0 아이템' : '착용 레벨') + '</div>' : ''
    });
    h += '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))"><div class="panel"><h3>정보</h3><div class="kv"><div>종류</div><div>' + esc(i.tn) + ' · ' + esc(i.sub) + (i.v80 ? ' <span class="tag v80">8.0 봉인해제</span>' : '') + '</div><div>착용 Lv</div><div>' + (i.lv || '-') + '</div><div>능력</div><div>' + esc(i.st || '-') + '</div><div>설명·효과</div><div>' + esc(i.ef || '-') + '</div>' +
      (i.same && i.same.length ? '<div>같은 아이템 번호</div><div class="small">' + i.same.join(', ') + '</div>' : '') + '</div></div>' +
      getSection(i.src, i.more, copyBtn('[gm additem ' + i.id + ' 1]')) + '</div>';
    if (s) h += '<div class="panel"><h3>세트: ' + esc(s.name) + '</h3><div class="icons">' + s.ids.map(function (x) { var it = itemById[x]; return it ? '<a class="ico big' + (x === i.id ? ' cur' : '') + '" href="#/item/' + x + '">' + itemImg(it.img, 56, 2) + esc(it.n) + '</a>' : ''; }).join('') + '</div><p class="small">3부위 이상: ' + esc(s.bonus) + '</p></div>';
    var hunt = i.src.filter(function (x) { return x.hid; })[0] || (i.src[0] && i.src[0].t === 'tier' ? { hid: ((H.tierHunts || {})[i.src[0].tier] || [])[0] } : null);
    if (hunt && huntById[hunt.hid]) { var x = huntById[hunt.hid]; h += '<h2>가까운 사냥터: ' + esc(x.label) + '</h2>' + (x.route ? routeHtml(x.route, 260) : '<p class="muted">입구: ' + (x.entry ? warp(x.entry[0], x.entry[1], x.entry[2]) : '-') + '</p>'); }
    app.innerHTML = h;
  }

  // ---------------------------------------------------------------- 코스 공략(레벨 구간별 성장 루트)
  var STAGES = [[1, 30, '첫걸음'], [30, 60, '성인식 이후'], [60, 100, '상급 사냥터·환생 준비'], [100, 150, '초월·신대륙'], [150, 200, '엔드 던전'], [200, 300, '거인의 회랑·만렙']];
  function stageData(k) {
    var a = STAGES[k][0], b = STAGES[k][1];
    var hs = H.hunts.filter(function (x) { var mid = (x.lo + x.hi) / 2; return mid >= a && mid < b + (k === STAGES.length - 1 ? 1 : 0) && x.battles; })
      .sort(function (p, q) { return (q.entry ? 1 : 0) - (p.entry ? 1 : 0) || p.battles - q.battles; });
    var qs = allQuests().filter(function (q) { var lv = q.lv || 1; return lv >= a && lv < b && (q.cat === '필수' || q.cat === '주요 이벤트' || q.cat === '커스텀'); });
    var tiers = {}; hs.forEach(function (x) { if (x.tier != null) tiers[x.tier] = (tiers[x.tier] || 0) + 1; });
    var sets = SETS.filter(function (s) { return s.lv >= a && s.lv < b; });
    var pets = [], seen = {};
    hs.slice(0, 8).forEach(function (x) { x.mobs.forEach(function (m) { if (m.catch && m.pet && !seen[m.pet] && petById[m.pet]) { seen[m.pet] = 1; pets.push(petById[m.pet]); } }); });
    pets.sort(function (p, q) { return q.sc - p.sc; });
    return { a: a, b: b, hunts: hs, quests: qs, tiers: Object.keys(tiers).map(Number).sort(), sets: sets, pets: pets };
  }
  function stageHtml(k, brief) {
    var d = stageData(k), st = STAGES[k];
    var h = '<div class="panel stage"><div class="idrow"><h2 style="margin:0">' + (k + 1) + '단계 · Lv.' + d.a + '~' + d.b + ' <span class="muted small">' + st[2] + '</span></h2></div>';
    h += '<h3>사냥터 추천 (레벨업이 빠른 순)</h3><div class="grid qcards">' + d.hunts.slice(0, brief ? 3 : 6).map(huntCard).join('') + '</div>';
    if (d.quests.length) h += '<h3>이 구간 퀘스트</h3><div class="grid qcards">' + d.quests.slice(0, brief ? 3 : 8).map(questCard).join('') + '</div>';
    if (!brief) {
      h += '<h3>장비</h3><p>' + (d.tiers.length ? d.tiers.map(function (t) { return '<a href="#/items?tier=' + t + '">희귀 드롭 T' + (t + 1) + ' 장비</a>'; }).join(' · ') : '상점 장비') +
        (d.sets.length ? '<br>세트: ' + d.sets.slice(0, 6).map(function (s) { return '<a href="#/items?tab=sets">' + esc(s.name) + '</a>'; }).join(' · ') : '') + (d.b > 100 ? '<br><a href="#/quests/g-fire">화염의 기사 세트</a>(T6·보스)' : '') + '</p>';
      if (d.pets.length) h += '<h3>잡을 만한 펫 (등급 높은 순)</h3><div class="grid cards">' + d.pets.slice(0, 6).map(petCard).join('') + '</div>';
      if (d.a <= 80 && d.b > 80) h += '<p class="rec"><b>환생 타이밍</b>: Lv.80부터 정령왕(칠흑의 동굴 지하 20층)에게 환생할 수 있습니다(6회까지). 환생하면 Lv.1부터 다시지만 능력치 보너스가 붙습니다. <a href="#/quests/g-trans">환생 공략</a></p>';
      if (k === 0) h += '<p class="rec">먼저 <a href="#/start">채팅 명령</a>([오토]·[일괄]·[따라와])을 켜고, 샴기르 <a href="#/quests/g-portal">포탈</a>로 첫 사냥터에 갑니다. Lv.30에 <a href="#/quests/g-adult">성인식</a>.</p>';
    } else h += '<p><a href="#/course">코스 공략 전체 보기 →</a></p>';
    return h + '</div>';
  }
  function pageCourse() {
    app.innerHTML = '<h1>코스 공략 <span class="muted small">레벨 구간별 성장 루트</span></h1><p class="muted">경험치표(사냥터별 레벨업까지 전투 수)·드롭 등급·퀘스트 분류·펫 등급에서 자동으로 고른 추천입니다. 혼자·펫 5마리 기준.</p>' +
      '<div class="chips">' + STAGES.map(function (s, k) { return '<a class="chip" href="#/course?s=' + k + '">' + (k + 1) + '단계 Lv.' + s[0] + '~' + s[1] + '</a>'; }).join('') + '</div>' + STAGES.map(function (s, k) { return '<div id="st' + k + '">' + stageHtml(k) + '</div>'; }).join('');
  }

  // ---------------------------------------------------------------- 마을 가는 법
  var HOW_KO = { home: '시작 마을(샴기르 귀환 지점)', free: '보통 방법으로 갈 수 있음', cond: '조건 있는 워프로만', none: '보통 방법으로 못 감(GM 이동만)' };
  var VIA_KO = { portal: '포탈', warp: '워프', air: '비행선', trans: '순간이동사', wman: '워프 NPC', cond: '조건 워프' };
  function townHow(t) {
    if (t.how === 'home') return '시작·귀환하는 마을';
    if (t.how === 'none') return '<b class="bad">보통 방법으로 갈 수 없음</b> — GM 이동만';
    var st = (t.steps || []).filter(function (x) { return x.k !== 'warp'; });
    var nw = (t.steps || []).length - st.length;
    return (t.how === 'cond' ? '<b class="warn">조건 필요</b> · ' : '') + (st.length ? st.map(function (x) { return (x.at ? '<span class="muted">' + esc(x.at) + '</span> ' : '') + esc(x.t); }).join(' → ') : '걸어서') + (nw ? ' <span class="muted">(+ 워프 ' + nw + '번)</span>' : '');
  }
  function townCard(t, i) {
    var c = SC.s && SC.s[t.scene];
    return '<div class="card town-card" data-go="#/town/' + i + '">' + (c ? '<div class="town-pic">' + sceneHtml(t.scene, [], '', 0.3) + '</div>' : '') + '<div class="idrow"><b>' + esc(t.name) + '</b><span class="tag ' + (t.how === 'none' ? 'boss' : t.how === 'cond' ? 'legend' : 'ride') + '">' + (t.how === 'none' ? '못 감' : t.how === 'cond' ? '조건' : t.how === 'home' ? '시작' : '갈 수 있음') + '</span></div>' +
      '<div class="small">' + townHow(t) + '</div><div class="chips small">' + (t.npcs || []).slice(0, 6).map(function (n) { return '<span class="tag">' + esc(n.k) + '</span>'; }).filter(function (v, k, a) { return a.indexOf(v) === k; }).join('') + '</div>' +
      '<div class="muted small">' + t.floor + ' (' + t.x + ',' + t.y + ') ' + warp(t.floor, t.x, t.y) + '</div></div>';
  }
  function pageTown(i) {
    var t = (GD.towns || [])[i];
    if (!t) { app.innerHTML = '<p>마을을 찾지 못했습니다.</p>'; return; }
    var h = '<p><a href="#/start">← 시작하기</a></p>' + hero({ el: 'town', bg: t.scene != null ? sceneBg(t.scene) : '', pic: t.scene != null ? sceneHtml(t.scene, [{ x: t.x, y: t.y, k: 'arrive', t: t.name }], '', 0.34) : '', title: esc(t.name),
      tags: '<span class="tag">' + esc(HOW_KO[t.how] || '') + '</span>', facts: [['가는 법', townHow(t)], ['맵', t.floor + ' (' + t.x + ',' + t.y + ')'], ['주요 NPC', (t.npcs || []).map(function (n) { return esc(n.k) + ' ' + esc(n.n); }).join(' · ')]],
      cmds: warp(t.floor, t.x, t.y) });
    if (t.route) h += '<h2>가는 길 (지도 경로)</h2><p class="muted small">샴기르 귀환 지점에서 출발. 층마다 걷는 길(노란 선), 보라 = 포탈·비행선·순간이동사·워프 NPC, S = 출발, G = 도착.</p>' + routeHtml(t.route, halfW(2));
    else if (t.how === 'none') h += '<div class="panel"><p><b>보통 방법으로 갈 수 있는 길을 찾지 못했습니다.</b> 서버 자료(mapwarp·워프 NPC·고대 신전 포탈·비행선·순간이동사·워프맨)를 다 써도 이어지지 않습니다. GM 이동: ' + warp(t.floor, t.x, t.y) + '</p></div>';
    if ((t.npcs || []).length) h += '<h2>주요 NPC</h2><div class="tbl-wrap"><table><tr><th>종류</th><th>이름</th><th>좌표</th><th></th></tr>' + t.npcs.map(function (n) { return '<tr><td>' + esc(n.k) + '</td><td>' + esc(n.n) + '</td><td>' + n.x + ',' + n.y + '</td><td>' + warp(t.floor, n.x, n.y + 1) + '</td></tr>'; }).join('') + '</table></div>';
    app.innerHTML = h;
  }

  // ---------------------------------------------------------------- 탑승
  var rState = { q: '', shown: 48, body: '', org: '', tier: '', el: '', get: '', src: '', sort: 'id' };
  var SRC_KO = { orig: '원작', v80: '8.0 이식', near: '8.0 이식(가까운 몸)', custom: '합성(커스텀)', synth: '합성(원본 모션)', color: '재채색', allrow: '전체 몸' };
  var RIDE_ISSUE = { 100298: '탈 때 그림이 조금 흔들림(알려진 문제)', 100297: '탈 때 그림이 조금 흔들림(알려진 문제)' };
  function rideSrcs(r) { return uniq(Object.keys(r.src || {}).map(function (k) { return r.src[k][0]; })); }
  function rideCard(r) {
    var p = petById[r.id] || {};
    return '<div class="card ride-card" data-go="#/ride/' + r.id + '"><div class="pic">' + (r.gif ? '<img class="gif" loading="lazy" src="' + r.gif[0] + '" width="' + Math.round(r.gif[1] * Math.min(1.5, 120 / r.gif[1], 120 / r.gif[2])) + '" alt="">' : petAnim(p, 100)) + '<span class="ride-pet">' + petAnim(p, 44) + '</span></div>' +
      '<div class="idrow"><span>' + (p.tier ? tierBadge(p.tier) : '') + ' <span class="id">' + r.id + '</span></span><span class="small">' + rows12(r.r) + ' ' + r.r.length + '/12</span></div>' +
      '<div class="nm">' + esc(r.n) + '</div><div class="small">' + elemHtml(p.el) + '</div><div>' + rideSrcs(r).map(function (k) { return '<span class="tag ' + (k === 'orig' ? '' : k === 'synth' || k === 'custom' ? 'legend' : 'v80') + '">' + SRC_KO[k] + '</span>'; }).join('') + (r.mech ? '<span class="tag mech">기계</span>' : '') + '</div>' +
      '<div class="muted small ellip">' + esc((p.get || []).join('·')) + (p.org ? ' · ' + esc(p.org) : '') + '</div></div>';
  }
  function pageRides() {
    var orgs = uniq(R.map(function (r) { return (petById[r.id] || {}).org; })).sort();
    var h = '<h1>탑승 도감 <span class="muted small">' + R.length + '종</span></h1><p class="muted">카드를 누르면 몸(캐릭터)마다 탄 모습을 동작·8방향으로 볼 수 있습니다. <code>[gm 펫탑승 1~5]</code>로 그 칸 펫에 탑니다(0 = 내리기). 혼자 사냥 모드에서는 탑승 허가가 필요 없습니다.</p>';
    h += '<div class="toolbar"><input type="search" id="rq" placeholder="이름·번호" value="' + esc(rState.q) + '">' +
      '<select id="rb">' + opts(BODY.map(function (b, k) { return [String(k), b]; }), rState.body, '몸 전체') + '</select>' +
      '<select id="ro">' + opts(orgs, rState.org, '출신 전체') + '</select><select id="rt">' + opts(['S+', 'S', 'A', 'B', 'C', 'D'], rState.tier, '등급 전체') + '</select>' +
      '<select id="re">' + opts([['지', '지'], ['수', '수'], ['화', '화'], ['풍', '풍']], rState.el, '속성 전체') + '</select><select id="rg">' + opts(['야생', '보스', '퀘스트', 'GM 전용'], rState.get, '얻는 방법 전체') + '</select>' +
      '<select id="rs2">' + opts(Object.keys(SRC_KO).map(function (k) { return [k, SRC_KO[k]]; }), rState.src, '그림 출처 전체') + '</select>' +
      '<select id="rso">' + opts([['id', '번호순'], ['name', '이름순'], ['sc', '등급 점수'], ['n', '탈 수 있는 몸 수']], rState.sort, '정렬') + '</select><span class="count" id="rn"></span></div><div class="grid cards" id="rl"></div><button class="more" id="rm">더 보기</button>';
    app.innerHTML = h;
    function list() {
      var q = rState.q.toLowerCase().trim();
      var l = R.filter(function (r) {
        var p = petById[r.id] || {};
        if (q && r.n.toLowerCase().indexOf(q) < 0 && String(r.id) !== q) return false;
        if (rState.body !== '' && r.r.indexOf(+rState.body) < 0) return false;
        if (rState.org && p.org !== rState.org) return false;
        if (rState.tier && p.tier !== rState.tier) return false;
        if (rState.el && (p.el || '').indexOf(rState.el) < 0) return false;
        if (rState.get && (p.get || []).indexOf(rState.get) < 0) return false;
        if (rState.src && rideSrcs(r).indexOf(rState.src) < 0) return false;
        return true;
      });
      var sc = function (r) { return (petById[r.id] || {}).sc || 0; };
      if (rState.sort === 'name') l.sort(function (a, b) { return a.n.localeCompare(b.n, 'ko'); });
      else if (rState.sort === 'sc') l.sort(function (a, b) { return sc(b) - sc(a) || a.id - b.id; });
      else if (rState.sort === 'n') l.sort(function (a, b) { return b.r.length - a.r.length || a.id - b.id; });
      return l;
    }
    function render() { var l = list(); $('#rn').textContent = l.length + '종'; $('#rl').innerHTML = l.slice(0, rState.shown).map(rideCard).join(''); $('#rm').hidden = l.length <= rState.shown; }
    $('#rq').addEventListener('input', function () { rState.q = this.value; rState.shown = 48; render(); });
    [['#rb', 'body'], ['#ro', 'org'], ['#rt', 'tier'], ['#re', 'el'], ['#rg', 'get'], ['#rs2', 'src'], ['#rso', 'sort']].forEach(function (x) { $(x[0]).addEventListener('change', function () { rState[x[1]] = this.value; rState.shown = 48; render(); }); });
    $('#rm').addEventListener('click', function () { rState.shown += 48; render(); });
    autoMore('#rm'); render();
  }
  function pageRide(id) {
    var r = rideById[id];
    if (!r) { app.innerHTML = '<p>탑승을 찾지 못했습니다. <a href="#/rides">목록</a></p>'; return; }
    var p = petById[r.id] || {}, keys = Object.keys(r.a).sort(function (a, b) { return a - b; }), cur = r.rep != null && r.a[r.rep] ? String(r.rep) : keys[0];
    var wl = (p.wild || []).filter(function (w) { return w.c; }), hx0 = wl.map(function (w) { return w.hid && huntById[w.hid]; }).filter(Boolean)[0];
    var h = '<p><a href="#/rides">← 탑승 도감</a></p>' + hero({
      el: EL_KO[domEl(p.el)], bg: hx0 && (hx0.scenes || [])[0] ? sceneBg(hx0.scenes[0].id) : '',
      pic: r.gif ? '<img class="gif" src="' + r.gif[0] + '" width="' + Math.round(r.gif[1] * Math.min(2.5, 240 / r.gif[1], 240 / r.gif[2])) + '" alt="">' : petAnim(p, 200, true), title: esc(r.n) + ' <span class="id">' + r.id + '</span>',
      tags: rideSrcs(r).map(function (k) { return '<span class="tag">' + SRC_KO[k] + '</span>'; }).join('') + (r.mech ? '<span class="tag mech">기계</span>' : '') + (p.org ? '<span class="tag">' + esc(p.org) + '</span>' : ''),
      facts: [['펫', petLink(r.id) + (p.tier ? ' ' + tierBadge(p.tier) + ' <span class="muted small">S급 Lv100 ' + p.sc + '</span>' : '')], ['속성', elemHtml(p.el)], ['탈 수 있는 몸', rows12(r.r) + ' ' + r.r.length + '/12'],
        ['얻는 방법', esc((p.get || []).join(' · ')) + (wl[0] ? ' · ' + (wl[0].hid ? huntLink(wl[0].hid) : esc(wl[0].fn)) + ' <span class="muted small">Lv.' + wl[0].lo + '~</span>' : '')],
        ['알려진 문제', RIDE_ISSUE[r.img] ? esc(RIDE_ISSUE[r.img]) : '']],
      cmds: copyBtn('[gm petmake ' + r.id + ' 1]') + ' ' + copyBtn('[gm 펫탑승 1]'),
      side: p.tier ? bigBadge(p.tier, TIERC[p.tier] || '#667085', p.sc, 'S급 Lv100 합', '<a class="small" href="#/pet/' + r.id + '">펫 정보 ›</a>') + '<div class="hs-bars">' + sBars(p) + '<div><div class="hs-cap">속성</div>' + elemBars(p.el) + '</div></div>' : ''
    });
    h += '<div class="panel"><h3>몸(캐릭터) 고르기 <span class="muted small">눌러서 아래 움직임 보기를 바꿉니다</span></h3><div class="ride-grid pick" id="rbody">';
    for (var i = 0; i < 12; i++) {
      var a = r.a[String(i)], ok = r.r.indexOf(i) >= 0, sr = (r.src || {})[String(i)];
      h += '<button class="ride-cell' + (ok && a ? '' : ' no') + (String(i) === cur ? ' on' : '') + '" data-b="' + i + '"' + (ok && a ? '' : ' disabled') + '>' + (ok && a ? spr('rd', 'a' + a, 84) : '<span class="small">' + (ok ? '가능' : '불가') + '</span>') + '<span>' + esc(BODY[i] || i) + '</span>' + (sr && sr[0] !== 'orig' ? '<em class="small">' + esc(SRC_KO[sr[0]] || sr[0]) + '</em>' : '') + '</button>';
    }
    h += '</div><p class="muted small">몸 줄 = 서버 탑승표 순서(남 꼬마·사이야·땋은 머리·멋쟁이·곰가죽·덩치 / 여 꼬마·곰가죽·모자·머리핀·장갑·화끈). 8.0 새 몸·한국판 몸은 서버 탑승표에 줄이 없어 나오지 않습니다.</p></div>';
    h += '<div class="panel av" id="av"><div class="av-head"><h3>움직임 보기</h3><span class="small muted" id="rbName"></span></div><div class="av-main"><div class="av-stage"><canvas id="avCv" width="10" height="10"></canvas><div class="av-info small muted" id="avInfo">불러오는 중…</div><div class="small muted" id="avNote"></div></div>' +
      '<div class="av-ctl"><div class="av-acts" id="avActs"></div><div class="av-row"><div class="av-pad" id="avPad">' + PAD.map(function (d) { return d < 0 ? '<button data-rot="1" title="돌리기">⟳</button>' : '<button data-d="' + d + '" title="' + DIR_KO[d] + '">' + DIR_ARROW[d] + '</button>'; }).join('') + '</div>' +
      '<div class="av-btns"><div><button data-r="-1">◀ 돌리기</button><button data-r="1">돌리기 ▶</button></div><div><button id="avPlay">⏸ 멈춤</button><button data-st="-1">⏮</button><button data-st="1">⏭</button></div>' +
      '<div><label class="small">속도 <select id="avSpd"><option value="0.25">0.25x</option><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option></select></label> <label class="small">크기 <select id="avZ"><option value="1">1x</option><option value="2" selected>2x</option><option value="3">3x</option></select></label></div></div></div>' +
      '<div class="muted small">키보드: ←/→ 방향 · ↑/↓ 동작 · 스페이스 재생/멈춤 · , . 한 프레임씩</div></div></div></div>';
    var notes = keys.map(function (k) { var sr = (r.src || {})[k]; return sr && (sr[0] === 'synth' || sr[0] === 'color' || sr[0] === 'custom' || sr[0] === 'near') ? '<li>' + esc(BODY[k] || k) + ': ' + esc(SRC_KO[sr[0]]) + (sr[1] ? ' — 원본 모션 기증 ' + sr[1] : '') + ' <span class="muted small">(그림 ' + r.a[k] + ')</span></li>' : ''; }).join('');
    h += '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))"><div class="panel"><h3>탑승 그림 메모</h3>' + (notes ? '<ul class="small">' + notes + '</ul>' : '<p class="small">모든 몸 줄이 원작(또는 8.0 원본) 탑승 그림입니다.</p>') + (RIDE_ISSUE[r.img] ? '<p class="small warn">' + esc(RIDE_ISSUE[r.img]) + '</p>' : '') + '<p class="muted small">출처: gmsv char/char_base.c ridePetTable·RideNoList, include/bada_ride_ext.h, include/bada_ride_allrow.h</p></div>' +
      '<div class="panel"><h3>얻는 방법</h3>' + ((p.q || []).length ? '<ol class="srcs">' + p.q.map(function (s) { return '<li>' + srcHtml(s) + '</li>'; }).join('') + '</ol>' : '') + (wl.length ? '<p class="small">야생: ' + wl.slice(0, 4).map(function (w) { return (w.hid ? huntLink(w.hid) : esc(w.fn)) + ' Lv.' + w.lo; }).join(' · ') + '</p>' : '') +
      '<p class="small">GM: ' + copyBtn('[gm petmake ' + r.id + ' 1]') + ' 펫 칸에 넣고 ' + copyBtn('[gm 펫탑승 1]') + '</p><p class="small"><a href="#/pet/' + r.id + '">펫 정보(S급 능력치·출현) 보기 ›</a></p></div></div>';
    app.innerHTML = h;
    avInit({ img: 'r' + r.a[cur], n: r.n }, null);
    function setBody(k) {
      [].forEach.call($('#rbody').children, function (b) { b.classList.toggle('on', b.getAttribute('data-b') === k); });
      $('#rbName').textContent = (BODY[k] || k) + ' 몸 · 그림 ' + r.a[k] + ' · ' + ({ full: '모든 동작 8방향', lite: '서기·걷기 8방향 + 다른 동작 4방향', field: '서기·걷기 8방향 + 다른 동작 1방향' }[(r.av || {})[k]] || '');
      if (AV && AV.load) AV.load('r' + r.a[k]);
    }
    $('#rbody').addEventListener('click', function (e) { var b = e.target.closest('[data-b]'); if (b && !b.disabled) setBody(b.getAttribute('data-b')); });
    setBody(cur);
  }

  // ---------------------------------------------------------------- 업데이트
  var ST_KO = { live: ['라이브 적용', 'ride'], '14': ['14차 준비(미배포)', 'v80'], '15': ['15차 예정', 'legend'] };
  function stTag(st) { var x = ST_KO[st] || (/^\d/.test(st || '') ? [st + '차 준비(미배포)', 'v80'] : null); return x ? '<span class="tag ' + x[1] + '">' + x[0] + '</span>' : ''; }
  function pageUpdates() {
    var V = M.version || {}, NX = M.next_round || { items: [] }, CM = M.commits || [];
    var h = '<h1>업데이트 기록</h1><p class="muted">CHANGELOG.md 최신순 ' + LOG.length + '개' + ((M.counts || {}).changelog > LOG.length ? ' (전체 ' + M.counts.changelog + ')' : '') + ' · ' + (V.basis ? '공략 자료 ' + esc(V.basis) : '저장소 ' + esc(V.head || '')) + '</p>';
    h += '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">' +
      '<div class="panel"><h3>' + stTag('live') + ' 지금 라이브: ' + liveLabel() + (V.live_date ? ' <span class="muted small">(' + esc(V.live_date) + ' 배포)</span>' : '') + '</h3><p class="small">집 PC 바다 서버에 적용된 판. 아래 “라이브 적용” 표시 항목까지 들어 있습니다.</p></div>' +
      '<div class="panel"><h3>' + ((V.live || 0) >= 14 ? stTag('live') + ' 14차 라이브 — 2026-11-14 배포 (GMSV d5564836 · 클라 runtime-ko-11th)' : stTag('14') + ' 14차 준비 — 서버·클라 준비 끝, 배포 전') + '</h3><ul class="small">' +
      ['접속기: 창 모드 / 선명 전체화면 선택(설정 저장), 게임 창에서 Alt+Enter·F11 전환', '8.0 층 519개 서버 읽기 수정 · 가미 항공·GM 문구 한국어', '샴기르 고대 신전(64000) 워프 허브 · 흩어진 포탈 정리 · 가미 항공 한국어', '라온 펫 333종 · 라온 탑승 35줄', '한국판(원작) 캐릭터 · 엘크 원본 탑승', '탑승 정비(전체 몸 줄 allrow·재채색·phoenix)', '클라이언트 그림 용량 real64(4 GiB → 약 20 GiB)',
        '사냥터 간호사 · 던전 회복약·마석 드롭 · 경험치 곡선 · 펫 Lv300', '8.0 봉인해제 1·2단계(층 185 · 아이템 2,254 · 세트 25)', '페이지 거부 즉시 되돌림 · 지도 노란 칸(커서) 숨김', '결과창 펫 줄 · 오토 멈춤 · 일괄 기본 켬 · 다른 페이지 펫 회복'].map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="panel"><h3>' + stTag('15') + ' 다음 업데이트 예정(' + NX.no + '차)</h3><ul class="small">' + NX.items.map(function (x) { return '<li><b>' + esc(x[0]) + '</b> — ' + esc(x[1]) + '</li>'; }).join('') + '</ul></div></div>';
    if (CM.length) h += '<details class="panel"><summary>최근 저장소 커밋 ' + CM.length + '개</summary><ul class="small">' + CM.map(function (c) { return '<li>' + stTag(c.st) + ' <code>' + esc(c.h) + '</code> ' + esc(c.date) + ' · ' + esc(c.msg) + '</li>'; }).join('') + '</ul></details>';
    h += LOG.map(function (e, k) {
      return '<details class="panel"' + (k < 3 ? ' open' : '') + '><summary>' + stTag(e.st) + ' ' + esc(e.date) + ' · ' + esc(e.title) + '</summary>' + md(e.body) + '</details>';
    }).join('');
    app.innerHTML = h;
  }

  // ---------------------------------------------------------------- 검색
  var IDX = null;
  function buildIndex() {
    IDX = [];
    P.forEach(function (p) { IDX.push({ k: '펫', t: p.n, s: p.id + ' · ' + p.c.join(' '), h: '#/pet/' + p.id, id: p.id, alt: p.alt, img: ['cr', 'a' + p.img], x: (p.n + ' ' + (p.gn || '') + ' ' + (p.an || '') + ' ' + p.id).toLowerCase() }); });
    IT.forEach(function (i) { IDX.push({ k: '아이템', t: i.n, s: i.id + ' · ' + i.tn + (i.lv ? ' Lv' + i.lv : ''), h: '#/item/' + i.id, id: i.id, alt: i.same, img: ['ic', 'i' + i.img], x: (i.n + ' ' + (i.gn || '') + ' ' + (i.an || '') + ' ' + i.id).toLowerCase() }); });
    H.hunts.forEach(function (x) { IDX.push({ k: '사냥터', t: x.label, s: x.catname + ' · Lv.' + x.lo + '~' + x.hi, h: '#/hunt/' + x.id, x: (x.label + ' ' + x.area + ' ' + x.floors.map(function (f) { return f.n + ' ' + f.f; }).join(' ')).toLowerCase() }); });
    Q.quests.forEach(function (q) { IDX.push({ k: '퀘스트', t: q.title, s: '#' + q.no + ' · ' + q.region, h: '#/quests/' + q.no, x: (q.title + ' ' + q.region + ' ' + q.no).toLowerCase() }); });
    GUIDES.forEach(function (g) { IDX.push({ k: '가이드', t: g.title, s: g.region, h: '#/quests/' + g.no, x: (g.title + ' ' + g.region).toLowerCase() }); });
    (GD.cmds || []).forEach(function (c) { IDX.push({ k: '명령', t: c.cmd, s: c.desc, h: '#/start', x: (c.cmd + ' ' + c.desc).toLowerCase() }); });
    SETS.forEach(function (s) { IDX.push({ k: '세트', t: s.name, s: s.ids.length + '부위', h: '#/items?tab=sets', x: s.name.toLowerCase() }); });
  }
  // 위쪽 검색 칸(모달 없음): 입력하면 칸 바로 밑에 결과 목록이 붙어 나온다. 페이지는 가리지 않고 그대로 둔다.
  var sel = 0, res = [], gsIn = $('#searchIn'), gsRes = $('#searchRes'), gsTop = document.querySelector('.top');
  function dropOpen() { return !gsRes.hidden; }
  function openDrop() { gsRes.hidden = false; }
  function closeDrop() { gsRes.hidden = true; }
  function focusSearch() { gsTop.classList.add('searching'); gsIn.focus(); gsIn.select(); if (gsIn.value.trim()) { doSearch(); openDrop(); } }
  function endSearch(clear) { closeDrop(); if (clear) gsIn.value = ''; if (!gsIn.value) gsTop.classList.remove('searching'); gsIn.blur(); }
  function doSearch() {
    if (!IDX) buildIndex();
    var q = gsIn.value.toLowerCase().trim();
    if (!q) { gsRes.innerHTML = ''; res = []; closeDrop(); return; }
    var toks = q.split(/\s+/), n = +q;
    res = IDX.filter(function (e) { return toks.every(function (t) { return e.x.indexOf(t) >= 0; }) || (n && e.alt && e.alt.indexOf(n) >= 0); })
      .map(function (e) { var sc = e.id === n ? 0 : e.t.toLowerCase() === q ? 1 : e.t.toLowerCase().indexOf(q) === 0 ? 2 : 3; return [sc, e]; })
      .sort(function (a, b) { return a[0] - b[0] || a[1].t.length - b[1].t.length; }).slice(0, 80).map(function (x) { return x[1]; });
    sel = 0;
    gsRes.innerHTML = '<div class="gs-head small muted">' + (res.length ? res.length + (res.length >= 80 ? '+' : '') + '개 · ↑↓ 이동 · Enter 열기 · Esc 닫기' : '결과 없음') + '</div>' + res.map(function (e, k) {
      return '<div class="sr' + (k === 0 ? ' sel' : '') + '" data-k="' + k + '"><span class="k">' + e.k + '</span>' + (e.img ? spr(e.img[0], e.img[1], 36) : '') + '<span class="ellip"><b>' + esc(e.t) + '</b> <span class="muted small">' + esc(e.s) + '</span></span></div>';
    }).join('');
    openDrop();
  }
  function pick(k) { var e = res[k]; if (e) { closeDrop(); gsIn.blur(); location.hash = e.h; } }
  $('#searchBtn').addEventListener('click', function () { if (gsTop.classList.contains('searching') && !gsIn.value) endSearch(true); else focusSearch(); });
  gsIn.addEventListener('input', doSearch);
  gsIn.addEventListener('focus', function () { gsTop.classList.add('searching'); if (gsIn.value.trim()) { if (!res.length) doSearch(); openDrop(); } });
  gsRes.addEventListener('mousedown', function (e) { e.preventDefault(); });   // 누르는 순간 입력 칸 blur 로 닫히지 않게
  gsRes.addEventListener('click', function (e) { var r = e.target.closest('.sr'); if (r) pick(+r.getAttribute('data-k')); });
  document.addEventListener('mousedown', function (e) { if (!e.target.closest('#gs')) { closeDrop(); if (!gsIn.value) gsTop.classList.remove('searching'); } });
  gsIn.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (dropOpen() && gsIn.value) { gsIn.value = ''; doSearch(); } else endSearch(true); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); if (!dropOpen()) { doSearch(); return; }
      sel = Math.max(0, Math.min(res.length - 1, sel + (e.key === 'ArrowDown' ? 1 : -1)));
      [].forEach.call(gsRes.querySelectorAll('.sr'), function (el, k) { el.classList.toggle('sel', k === sel); if (k === sel) el.scrollIntoView({ block: 'nearest' }); });
    } else if (e.key === 'Enter') { e.preventDefault(); pick(sel); }
  });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); focusSearch(); return; }
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && $('#modal').hidden) { e.preventDefault(); focusSearch(); }
  });

  // ---------------------------------------------------------------- 테마·라우터
  $('#themeBtn').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var nx = cur === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', nx); try { localStorage.setItem('sa-theme', nx); } catch (e) { }
  });
  $('#menuBtn').addEventListener('click', function () { $('#side').classList.toggle('open'); });
  $('#side').addEventListener('click', function (e) { if (e.target.closest('a')) this.classList.remove('open'); });
  $('#ver').textContent = '라이브 ' + liveLabel() + ((M.version || {}).live_date ? ' · ' + M.version.live_date : '');
  $('#sideFoot').innerHTML = esc(verText()) + '<br>펫 ' + P.length + ' · 아이템 ' + IT.length;
  var scrolls = {};
  function route() {
    var hs = location.hash.replace(/^#\/?/, ''), qi = hs.indexOf('?'), path = qi >= 0 ? hs.slice(0, qi) : hs, params = {};
    if (qi >= 0) hs.slice(qi + 1).split('&').forEach(function (kv) { var p = kv.split('='); params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
    var parts = path.split('/'), r = parts[0] || 'home';
    FIGS.length = 0; NPCS.length = 0; $('#modal').hidden = true; avStop(); closeDrop();
    [].forEach.call(document.querySelectorAll('.side a'), function (a) { var d = a.getAttribute('data-r'); a.classList.toggle('on', d === r || (d + '') === ({ hunt: 'hunts', pet: 'pets', item: 'items', ride: 'rides', town: 'start' })[r]); });
    try {
      if (r === 'home') pageHome(); else if (r === 'start') pageStart(); else if (r === 'hunts') pageHunts(params); else if (r === 'hunt') pageHunt(parts[1]);
      else if (r === 'quests' && parts[1]) pageQuest(decodeURIComponent(parts[1])); else if (r === 'quests') pageQuests(params); else if (r === 'pets') pagePets(params); else if (r === 'pet') pagePet(+parts[1]);
      else if (r === 'items') pageItems(params); else if (r === 'item') pageItem(+parts[1]); else if (r === 'rides') pageRides(); else if (r === 'ride') pageRide(+parts[1]); else if (r === 'town') pageTown(+parts[1]); else if (r === 'course') { pageCourse(); if (params.s) { var se = document.getElementById('st' + params.s); if (se) setTimeout(function () { se.scrollIntoView(); }, 0); } } else if (r === 'updates') pageUpdates(); else pageHome();
    } catch (err) { app.innerHTML = '<p class="pad">화면을 그리다 오류: ' + esc(err && err.message) + '</p>'; if (window.console) console.error(err); }
    var key = location.hash;
    window.scrollTo(0, scrolls[key] || 0);
  }
  window.addEventListener('scroll', function () { scrolls[location.hash] = window.scrollY; }, { passive: true });
  window.addEventListener('hashchange', route);
  route();
})();
