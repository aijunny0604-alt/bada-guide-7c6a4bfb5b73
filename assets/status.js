/* 서버 상태 알림(15.2) — 서버 PC 의 status-pusher.py 가 비밀 Gist 에 올린 status.json 을 60초마다 읽는다.
   내용은 open·online·dist·updated_at 뿐(IP·계정 없음). 6분 넘게 안 바뀐 자료는 "서버 닫힘(확인 안 됨)".
   주소 원본: tools/guide-status.json (raw_url) — 바꾸면 여기도 같이. */
(function () {
  'use strict';
  var URL = 'https://gist.githubusercontent.com/aijunny0604-alt/4d05ebee5f7f4115bd968c81f44b3612/raw/status.json';
  var POLL = 60000, STALE = 360000;
  var last = null;   // { s: 'open'|'closed'|'stale'|'unknown', n, dist, at }

  function el(tag, cls, html) { var e = document.createElement(tag); e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function ago(ms) { var m = Math.round(ms / 60000); return m < 1 ? '방금' : m < 60 ? m + '분 전' : Math.round(m / 60) + '시간 전'; }

  function view() {
    var st = last || { s: 'unknown' };
    var label = st.s === 'open' ? '서버 열림' : st.s === 'closed' ? '서버 닫힘' : st.s === 'stale' ? '서버 닫힘(확인 안 됨)' : '서버 상태 확인 중';
    return { cls: 'srv-' + st.s, label: label, count: st.s === 'open' ? '접속 ' + st.n + '명' : '', st: st };
  }

  function paintPill() {
    var top = document.querySelector('header.top');
    if (!top) return;
    var p = document.getElementById('srvPill');
    if (!p) {
      p = el('a', 'srv-pill'); p.id = 'srvPill'; p.href = '#/'; p.setAttribute('aria-live', 'polite');
      var ver = document.getElementById('ver');
      top.insertBefore(p, ver || top.lastElementChild);
    }
    var v = view();
    p.className = 'srv-pill ' + v.cls;
    p.innerHTML = '<i class="srv-dot" aria-hidden="true"></i><span class="srv-t">' + v.label + '</span>' + (v.count ? '<span class="srv-n"><span class="srv-sep"> · </span>' + v.count + '</span>' : '');
    p.title = v.label + (v.count ? ' · ' + v.count : '') + (v.st.at ? ' (' + ago(Date.now() - v.st.at) + ' 확인)' : '');
  }

  function isHome() { var h = location.hash.replace(/^#\/?/, '').split(/[/?]/)[0]; return h === '' || h === 'home'; }

  function paintCard() {
    var app = document.getElementById('app');
    if (!app || !isHome()) return;
    var c = document.getElementById('srvCard');
    if (!c) {
      var banner = app.querySelector('.home-hero, .banner');
      if (!banner) return;
      c = el('section', 'srv-card'); c.id = 'srvCard'; c.setAttribute('aria-live', 'polite');
      banner.parentNode.insertBefore(c, banner.nextSibling);
    }
    var v = view(), st = v.st;
    var sub = st.s === 'open' ? '지금 바로 접속할 수 있어요.' + (st.dist ? ' 배포판 v' + st.dist : '')
      : st.s === 'closed' ? '서버가 쉬는 중이에요. 열리면 여기 초록불이 켜져요.'
        : st.s === 'stale' ? '한동안 서버 소식이 없어요. 꺼져 있을 가능성이 높아요.' : '서버 상태를 불러오는 중…';
    c.className = 'srv-card ' + v.cls;
    c.innerHTML = '<div class="srv-stone"><i class="srv-dot" aria-hidden="true"></i></div><div class="srv-body"><div class="srv-head">' + v.label +
      (v.count ? ' <b>· ' + v.count + '</b>' : '') + '</div><div class="srv-sub">' + sub + (st.at ? ' <span class="srv-when">(' + ago(Date.now() - st.at) + ' 확인)</span>' : '') + '</div></div>';
  }

  function paint() { try { paintPill(); paintCard(); } catch (e) { } }

  function poll() {
    var x = new XMLHttpRequest();
    x.open('GET', URL + '?t=' + Date.now(), true);
    x.timeout = 15000;
    x.onload = function () {
      try {
        if (x.status !== 200) throw 0;
        var d = JSON.parse(x.responseText), at = Date.parse(d.updated_at);
        if (isNaN(at)) throw 0;
        var fresh = Date.now() - at <= STALE;
        last = { s: !fresh ? 'stale' : d.open ? 'open' : 'closed', n: Math.max(0, d.online | 0), dist: d.dist, at: at };
      } catch (e) { last = { s: last && last.at && Date.now() - last.at <= STALE ? last.s : 'stale', n: last ? last.n : 0, dist: last && last.dist, at: last && last.at }; }
      paint();
    };
    x.onerror = x.ontimeout = function () { if (!last || !last.at || Date.now() - last.at > STALE) last = { s: 'stale', n: 0, at: last && last.at }; paint(); };
    try { x.send(); } catch (e) { }
  }

  // 홈은 app.js 가 #app 을 새로 그릴 때마다 지워지므로 다시 붙인다
  var app = document.getElementById('app');
  if (app && window.MutationObserver) new MutationObserver(function () { if (isHome() && !document.getElementById('srvCard')) paintCard(); }).observe(app, { childList: true });
  window.addEventListener('hashchange', paint);
  paint(); poll();
  setInterval(function () { if (!document.hidden) poll(); }, POLL);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) poll(); });
})();
