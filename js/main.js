/* らぼラトリエ デモサイト — main.js（全ページ共通・依存なし） */
(function () {
  'use strict';

  /* ---------- 営業ルール（ここを書き換えれば全ページに反映） ---------- */
  var SHOP = {
    lineUrl: 'https://lin.ee/v6YUKbI',
    lineId: '478mhhpm', // LINE公式アカウントのベーシックID（@なし）
    // 曜日: 0=日 … 6=土。open/lo は "HH:MM"
    hours: {
      0: { open: '09:00', close: '17:00', lo: '16:30' },
      1: null,
      2: { open: '09:00', close: '18:30', lo: '18:00' },
      3: { open: '09:00', close: '18:30', lo: '18:00' },
      4: { open: '09:00', close: '18:30', lo: '18:00' },
      5: { open: '09:00', close: '21:00', lo: '20:30' },
      6: { open: '09:00', close: '21:00', lo: '20:30' }
    },
    // 月1回の日曜休み（デモ: 第3日曜）。実運用では extraClosed に日付を足すだけ
    monthlySundayOff: 3,
    extraClosed: [], // 例: ['2026-12-31', '2027-01-01']
    weekday: ['日', '月', '火', '水', '木', '金', '土']
  };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.getMonth() === +m[2] - 1 ? d : null;
  }
  function toMin(hhmm) { var p = hhmm.split(':'); return (+p[0]) * 60 + (+p[1]); }
  function fromMin(m) { return Math.floor(m / 60) + ':' + pad(m % 60); }

  // 日本時間の「今」
  function nowJst() {
    var now = new Date();
    var utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 9 * 3600000);
  }
  function todayJst() { var n = nowJst(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }

  function closedReason(d) {
    var key = ymd(d);
    if (SHOP.extraClosed.indexOf(key) !== -1) return '臨時休業';
    var dow = d.getDay();
    if (!SHOP.hours[dow]) return '定休日';
    if (dow === 0 && SHOP.monthlySundayOff && Math.ceil(d.getDate() / 7) === SHOP.monthlySundayOff) return '日曜休み';
    return '';
  }
  function hoursOf(d) { return closedReason(d) ? null : SHOP.hours[d.getDay()]; }
  function formatJp(d) { return (d.getMonth() + 1) + '月' + d.getDate() + '日（' + SHOP.weekday[d.getDay()] + '）'; }

  // 来店できる時間（30分刻み・L.O.の30分前まで。当日は現在時刻以降のみ）
  function slotsOf(d) {
    var h = hoursOf(d);
    if (!h) return [];
    var start = toMin(h.open), last = toMin(h.lo) - 30, list = [];
    var isToday = ymd(d) === ymd(todayJst());
    var n = nowJst(), nowMin = n.getHours() * 60 + n.getMinutes();
    for (var m = start; m <= last; m += 30) {
      if (isToday && m < nowMin + 30) continue;
      list.push(fromMin(m));
    }
    return list;
  }

  function lineMessageUrl(text) {
    return 'https://line.me/R/oaMessage/@' + SHOP.lineId + '/?' + encodeURIComponent(text);
  }

  window.LABO = { SHOP: SHOP, ymd: ymd, parseYmd: parseYmd, closedReason: closedReason, hoursOf: hoursOf, slotsOf: slotsOf, formatJp: formatJp, todayJst: todayJst, lineMessageUrl: lineMessageUrl };

  /* ---------- ナビゲーション ---------- */
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('global-nav');
  function setNav(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    nav.classList.toggle('open', open);
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () { setNav(toggle.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });
  }

  /* ---------- 営業中バッジ・今日の営業時間 ---------- */
  var status = document.getElementById('open-status');
  if (status) {
    var n = nowJst(), today = todayJst(), h = hoursOf(today), txt, state;
    var nowMin = n.getHours() * 60 + n.getMinutes();
    if (h && nowMin >= toMin(h.open) && nowMin < toMin(h.close)) {
      state = 'open'; txt = '本日営業中 ' + h.open.replace(/^0/, '') + '〜' + h.close;
    } else if (h && nowMin < toMin(h.open)) {
      state = 'open'; txt = '本日 ' + h.open.replace(/^0/, '') + '〜' + h.close + ' 営業';
    } else {
      // 次の営業日を探す
      var d = new Date(today);
      for (var i = 0; i < 14; i++) { d.setDate(d.getDate() + 1); if (hoursOf(d)) break; }
      state = 'closed'; txt = (h ? '本日の営業は終了' : '本日は' + closedReason(today)) + '・次回 ' + (d.getMonth() + 1) + '/' + d.getDate() + '（' + SHOP.weekday[d.getDay()] + '）';
    }
    status.setAttribute('data-state', state);
    status.querySelector('.txt').textContent = txt;
  }
  var hoursTable = document.getElementById('hours-table');
  if (hoursTable) {
    var dow = todayJst().getDay();
    hoursTable.querySelectorAll('tr').forEach(function (tr) {
      if (tr.getAttribute('data-days').split(',').indexOf(String(dow)) !== -1) {
        tr.classList.add('today');
        tr.querySelector('th').insertAdjacentHTML('beforeend', '<span class="badge" style="margin-left:6px;font-size:.7rem;padding:0 8px">今日</span>');
      }
    });
  }

  /* ---------- 比較表：スマホではカード型で読めるよう、各セルに見出しを付ける ---------- */
  document.querySelectorAll('table.compare').forEach(function (t) {
    var heads = Array.prototype.map.call(t.querySelectorAll('thead th'), function (th) { return th.textContent.trim(); });
    t.querySelectorAll('tbody tr').forEach(function (tr) {
      Array.prototype.forEach.call(tr.children, function (td, i) { if (heads[i]) td.setAttribute('data-label', heads[i]); });
    });
  });

  /* ---------- スクロール表示アニメーション ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- スマホ固定CTA（ファーストビューのCTAが見えなくなったら表示） ---------- */
  var sticky = document.getElementById('sticky-cta');
  var heroCta = document.querySelector('.hero .cta-pair, .page-hero');
  if (sticky) {
    if (heroCta && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        sticky.classList.toggle('show', !entries[0].isIntersecting && entries[0].boundingClientRect.top < 0);
      }).observe(heroCta);
    } else {
      sticky.classList.add('show');
    }
  }

  /* ---------- メニュー絞り込み ---------- */
  var tabs = document.querySelectorAll('.filter-tabs button');
  var cards = document.querySelectorAll('#menu-grid .menu-card');
  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.getAttribute('data-filter');
      tabs.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      cards.forEach(function (c) {
        var show = f === 'all' || c.getAttribute('data-cat').split(' ').indexOf(f) !== -1;
        c.hidden = !show;
        if (show) c.classList.add('is-visible');
      });
    });
  });

  /* ---------- 営業日カレンダー → 予約 ---------- */
  var calBody = document.getElementById('cal-body');
  if (calBody) {
    var base = todayJst();
    var view = new Date(base.getFullYear(), base.getMonth(), 1);
    var maxView = new Date(base.getFullYear(), base.getMonth() + 2, 1);
    var sel = { date: null, time: null, people: '2' };
    var titleEl = document.getElementById('cal-title');
    var prev = document.getElementById('cal-prev');
    var next = document.getElementById('cal-next');
    var panel = document.getElementById('slot-content');

    function renderCal() {
      titleEl.textContent = view.getFullYear() + '年' + (view.getMonth() + 1) + '月';
      prev.disabled = view <= new Date(base.getFullYear(), base.getMonth(), 1);
      next.disabled = view >= maxView;
      var first = new Date(view), html = '<tr>';
      var lastDay = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      for (var i = 0; i < first.getDay(); i++) html += '<td></td>';
      for (var day = 1; day <= lastDay; day++) {
        var d = new Date(view.getFullYear(), view.getMonth(), day);
        var key = ymd(d), reason = closedReason(d), past = d < base;
        var cls = 'cal-day', label = formatJp(d), note = '', disabled = '';
        if (past) { cls += ' past'; disabled = ' disabled'; label += ' 受付終了'; }
        else if (reason) { cls += ' closed'; disabled = ' disabled'; note = '休'; label += ' ' + reason; }
        else if (!slotsOf(d).length) { cls += ' closed'; disabled = ' disabled'; note = '済'; label += ' 本日の受付は終了'; }
        else { var h = hoursOf(d); if (h.close === '21:00') { cls += ' late'; note = '夜も'; } label += ' 営業 ' + h.open + '〜' + h.close; }
        var pressed = sel.date === key ? 'true' : 'false';
        html += '<td><button type="button" class="' + cls + '" data-date="' + key + '" aria-pressed="' + pressed + '" aria-label="' + label + '"' + disabled + '>' + day + (note ? '<small>' + note + '</small>' : '') + '</button></td>';
        if (d.getDay() === 6 && day !== lastDay) html += '</tr><tr>';
      }
      var tail = (7 - ((first.getDay() + lastDay) % 7)) % 7;
      for (var j = 0; j < tail; j++) html += '<td></td>';
      calBody.innerHTML = html + '</tr>';
    }

    function buildText() {
      var d = parseYmd(sel.date);
      return '【来店予約】\n日にち：' + formatJp(d) + '\n時間：' + (sel.time || '未定（相談したい）') + '\n人数：' + (sel.people === '未定' ? '未定' : sel.people + '名') + '\nお名前：';
    }

    function renderPanel() {
      if (!sel.date) { panel.innerHTML = '<p class="slot-empty">カレンダーから来店したい日を選んでください。</p>'; return; }
      var d = parseYmd(sel.date), h = hoursOf(d), slots = slotsOf(d);
      var html = '<div class="slot-date">' + formatJp(d) + '</div>' +
        '<p class="slot-hours">営業 ' + h.open.replace(/^0/, '') + '〜' + h.close + '（ラストオーダー ' + h.lo + '）</p>' +
        '<p style="font-weight:700;font-size:.92rem;margin-bottom:6px">来店時間</p><div class="slot-grid" role="group" aria-label="来店時間を選ぶ">';
      slots.forEach(function (t) { html += '<button type="button" data-time="' + t + '" aria-pressed="' + (sel.time === t) + '">' + t + '</button>'; });
      html += '</div><button type="button" class="slot-undecided" data-time="" aria-pressed="' + (sel.time === null) + '">時間はまだ決めていない（未定）</button>';
      html += '<label class="people-row"><span class="pr-label">人数</span><select id="slot-people" aria-label="人数">';
      ['1', '2', '3', '4', '5', '6', '未定'].forEach(function (p) { html += '<option value="' + p + '"' + (sel.people === p ? ' selected' : '') + '>' + (p === '未定' ? '未定' : p + '名') + '</option>'; });
      html += '</select><span class="demo-note">7名以上はご相談ください</span></label>';
      var q = 'contact.html?type=reserve&date=' + sel.date + (sel.time ? '&time=' + encodeURIComponent(sel.time) : '&time=undecided') + '&people=' + encodeURIComponent(sel.people);
      html += '<div class="slot-actions">' +
        '<a class="btn btn-line btn-block" id="slot-line" href="' + lineMessageUrl(buildText()) + '" target="_blank" rel="noopener" data-cta="line"><svg class="ico" aria-hidden="true"><use href="assets/icons.svg#i-line"/></svg>この内容でLINE予約</a>' +
        '<a class="btn btn-form btn-block" id="slot-form" href="' + q + '"><svg class="ico" aria-hidden="true"><use href="assets/icons.svg#i-mail"/></svg>この内容でWebフォームへ</a></div>' +
        '<div class="line-template"><span>LINEに送る文面（自動で入力されない場合はコピーして送ってください）</span><code id="line-text"></code><button type="button" class="copy-btn" id="copy-line">文面をコピー</button></div>';
      panel.innerHTML = html;
      document.getElementById('line-text').textContent = buildText();
    }

    calBody.addEventListener('click', function (e) {
      var b = e.target.closest('.cal-day');
      if (!b || b.disabled) return;
      sel.date = b.getAttribute('data-date');
      if (sel.time && slotsOf(parseYmd(sel.date)).indexOf(sel.time) === -1) sel.time = null;
      renderCal(); renderPanel();
      if (window.innerWidth < 860) document.getElementById('slot-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    panel.addEventListener('click', function (e) {
      var t = e.target.closest('[data-time]');
      if (t) { sel.time = t.getAttribute('data-time') || null; renderPanel(); return; }
      if (e.target.id === 'copy-line') {
        var text = buildText(), btn = e.target;
        var done = function () { btn.textContent = 'コピーしました'; setTimeout(function () { btn.textContent = '文面をコピー'; }, 2000); };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, done);
        else { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (er) {} ta.remove(); done(); }
      }
    });
    panel.addEventListener('change', function (e) { if (e.target.id === 'slot-people') { sel.people = e.target.value; renderPanel(); } });
    prev.addEventListener('click', function () { view.setMonth(view.getMonth() - 1); renderCal(); });
    next.addEventListener('click', function () { view.setMonth(view.getMonth() + 1); renderCal(); });
    renderCal();
  }
})();
