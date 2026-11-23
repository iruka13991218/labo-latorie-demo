/* らぼラトリエ — contact.js（Webフォーム：種類ごとに必須の項目を切り替える・静的サイトで動く） */
(function () {
  'use strict';
  var L = window.LABO;
  var form = document.getElementById('contact-form');
  if (!form || !L) return;

  var $ = function (id) { return document.getElementById(id); };
  var alertBox = $('form-alert');
  var MENU_LABEL = {};
  Array.prototype.forEach.call($('menu').options, function (o) { MENU_LABEL[o.value] = o.textContent; });
  var TYPE_LABEL = { reserve: '席の予約', takeout: 'テイクアウトの取り置き', question: '質問・相談', other: 'その他' };

  /* ---------- 日付入力の範囲（今日〜2か月先） ---------- */
  var today = L.todayJst();
  var max = new Date(today.getFullYear(), today.getMonth() + 3, 0);
  ['date', 'pickup'].forEach(function (id) { $(id).min = L.ymd(today); $(id).max = L.ymd(max); });

  function currentType() { return form.querySelector('input[name="type"]:checked').value; }

  function applyType() {
    var t = currentType();
    form.querySelectorAll('.conditional').forEach(function (box) { box.hidden = box.getAttribute('data-show') !== t; });
    var msgRequired = t === 'question' || t === 'other';
    var badge = $('message-badge');
    badge.textContent = msgRequired ? '必須' : '任意';
    badge.className = msgRequired ? 'req' : 'opt';
    $('message').placeholder = msgRequired ? '例）ベビーカーで入れますか？／ケーキのホール予約はできますか？' : 'アレルギー、ベビーカーでの来店、気になることなど、なんでもどうぞ';
    clearErrors();
  }

  /* ---------- 来店時間の選択肢を、選んだ日の営業時間に合わせる ---------- */
  function fillTimes(keep) {
    var sel = $('time'), d = L.parseYmd($('date').value), prev = keep || sel.value;
    var slots = d ? L.slotsOf(d) : [];
    sel.innerHTML = '<option value="undecided">未定・お店と相談したい</option>';
    if (!d) {
      sel.insertAdjacentHTML('beforeend', '<option value="morning">午前（9時〜11時）</option><option value="lunch">お昼（11時〜14時）</option><option value="afternoon">午後（14時〜17時）</option><option value="evening">夜（17時以降・金土）</option>');
    }
    slots.forEach(function (t) { sel.insertAdjacentHTML('beforeend', '<option value="' + t + '">' + t + '</option>'); });
    sel.value = Array.prototype.some.call(sel.options, function (o) { return o.value === prev; }) ? prev : 'undecided';
  }

  function checkDate(inputId, warnId, undecidedId) {
    var input = $(inputId), warn = $(warnId), d = L.parseYmd(input.value);
    warn.hidden = true;
    if ($(undecidedId).checked) { input.disabled = true; return true; }
    input.disabled = false;
    if (!d) return false;
    if (d < today || d > max) { warn.textContent = '選べるのは今日から' + L.formatJp(max) + 'までです。'; warn.hidden = false; return false; }
    var reason = L.closedReason(d);
    if (reason) {
      warn.textContent = L.formatJp(d) + 'は' + reason + 'です。ほかの日を選んでください。'; warn.hidden = false; return false;
    }
    if (inputId === 'date' && !L.slotsOf(d).length) { warn.textContent = '本日のご予約受付は終了しました。ほかの日を選んでください。'; warn.hidden = false; return false; }
    var h = L.hoursOf(d);
    warn.textContent = L.formatJp(d) + 'の営業時間：' + h.open.replace(/^0/, '') + '〜' + h.close + '（L.O. ' + h.lo + '）';
    warn.style.color = 'var(--ok)'; warn.hidden = false;
    return true;
  }

  /* ---------- URLパラメータから入力を埋める（メニュー・カレンダーから来た場合） ---------- */
  var params = new URLSearchParams(location.search);
  var pType = params.get('type');
  if (pType && TYPE_LABEL[pType]) form.querySelector('input[name="type"][value="' + pType + '"]').checked = true;
  var pMenu = params.get('menu');
  if (pMenu && MENU_LABEL[pMenu] !== undefined) $('menu').value = pMenu;
  var pDate = L.parseYmd(params.get('date'));
  if (pDate) { $('date').value = L.ymd(pDate); }
  var pPeople = params.get('people');
  if (pPeople && Array.prototype.some.call($('people').options, function (o) { return o.value === pPeople; })) $('people').value = pPeople;
  applyType();
  fillTimes(params.get('time') || 'undecided');
  if (pDate) checkDate('date', 'date-warning', 'date-undecided');
  if (pType || pMenu || pDate) {
    var note = [];
    if (pDate) note.push(L.formatJp(pDate) + (params.get('time') && params.get('time') !== 'undecided' ? ' ' + params.get('time') : ''));
    if (pMenu && MENU_LABEL[pMenu]) note.push(pMenu === 'takeout' ? 'テイクアウト' : MENU_LABEL[pMenu]);
    if (note.length) form.querySelector('.form-intro').insertAdjacentHTML('afterend', '<p class="form-intro" style="background:#eef7f1"><strong>選んだ内容を入力済みです：</strong>' + note.join('／').replace(/</g, '&lt;') + '</p>');
  }

  /* ---------- イベント ---------- */
  form.querySelectorAll('input[name="type"]').forEach(function (r) { r.addEventListener('change', applyType); });
  $('date').addEventListener('change', function () { $('date-warning').style.color = ''; fillTimes(); if (checkDate('date', 'date-warning', 'date-undecided')) setError('f-date', false); });
  $('date-undecided').addEventListener('change', function () { checkDate('date', 'date-warning', 'date-undecided'); fillTimes(); setError('f-date', false); });
  $('pickup').addEventListener('change', function () { $('pickup-warning').style.color = ''; if (checkDate('pickup', 'pickup-warning', 'pickup-undecided')) setError('f-pickup', false); });
  $('pickup-undecided').addEventListener('change', function () { checkDate('pickup', 'pickup-warning', 'pickup-undecided'); setError('f-pickup', false); });
  ['name', 'email', 'message', 'items'].forEach(function (id) {
    $(id).addEventListener('input', function () { if ($('f-' + id).classList.contains('has-error')) validateField(id); });
  });

  function setError(fieldId, on) {
    var f = $(fieldId);
    f.classList.toggle('has-error', on);
    var input = f.querySelector('input:not([type=checkbox]), select, textarea');
    if (input) input.setAttribute('aria-invalid', on ? 'true' : 'false');
  }
  function clearErrors() {
    form.querySelectorAll('.has-error').forEach(function (f) { f.classList.remove('has-error'); });
    alertBox.classList.remove('show');
  }
  function validateField(id) {
    var v = ($(id).value || '').trim(), ok = true, t = currentType();
    if (id === 'name') ok = v.length > 0;
    if (id === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    if (id === 'message') ok = (t === 'question' || t === 'other') ? v.length > 0 : true;
    if (id === 'items') ok = v.length > 0;
    setError('f-' + id, !ok);
    return ok;
  }

  function validate() {
    var t = currentType(), errors = [];
    if (t === 'reserve') {
      $('date-warning').style.color = '';
      var okDate = $('date-undecided').checked || checkDate('date', 'date-warning', 'date-undecided');
      setError('f-date', !okDate); if (!okDate) errors.push('f-date');
    }
    if (t === 'takeout') {
      $('pickup-warning').style.color = '';
      var okPick = $('pickup-undecided').checked || checkDate('pickup', 'pickup-warning', 'pickup-undecided');
      setError('f-pickup', !okPick); if (!okPick) errors.push('f-pickup');
      if (!validateField('items')) errors.push('f-items');
    }
    if (!validateField('name')) errors.push('f-name');
    if (!validateField('email')) errors.push('f-email');
    if (!validateField('message')) errors.push('f-message');
    return errors;
  }

  function summary() {
    var t = currentType(), rows = [['お問い合わせの種類', TYPE_LABEL[t]]];
    var timeSel = $('time');
    if (t === 'reserve') {
      var d = L.parseYmd($('date').value);
      rows.push(['来店希望日', $('date-undecided').checked || !d ? '未定（相談したい）' : L.formatJp(d)]);
      rows.push(['来店時間', timeSel.options[timeSel.selectedIndex].textContent]);
      rows.push(['人数', $('people').options[$('people').selectedIndex].textContent]);
      if ($('menu').value) rows.push(['気になるメニュー', MENU_LABEL[$('menu').value]]);
      var seats = Array.prototype.map.call(form.querySelectorAll('input[name="seat"]:checked'), function (c) { return c.value; });
      if (seats.length) rows.push(['席の希望', seats.join('、')]);
    }
    if (t === 'takeout') {
      var p = L.parseYmd($('pickup').value);
      rows.push(['受け取り希望日', $('pickup-undecided').checked || !p ? '未定（相談したい）' : L.formatJp(p)]);
      rows.push(['ほしい商品と個数', $('items').value.trim()]);
    }
    rows.push(['お名前', $('name').value.trim()]);
    rows.push(['メールアドレス', $('email').value.trim()]);
    if ($('message').value.trim()) rows.push(['お問い合わせ内容', $('message').value.trim()]);
    return rows;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var errors = validate();
    if (errors.length) {
      alertBox.textContent = '入力内容を確認してください（' + errors.length + '件）。赤く表示されている項目を直すと送信できます。';
      alertBox.classList.add('show');
      var first = $(errors[0]).querySelector('input:not([type=checkbox]):not([disabled]), select, textarea');
      $(errors[0]).scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 350);
      return;
    }
    alertBox.classList.remove('show');
    var rows = summary(), btn = $('submit-btn');
    btn.disabled = true; btn.textContent = '送信しています…';

    var finish = function () {
      try { sessionStorage.setItem('labo-inquiry', JSON.stringify(rows)); } catch (er) {}
      location.href = 'thanks.html';
    };
    var endpoint = form.getAttribute('data-endpoint');
    if (endpoint) {
      // 納品時：Formspree などの外部フォームサービスのURLを data-endpoint に設定するだけで実際に送信される
      var fd = new FormData(form);
      fd.append('summary', rows.map(function (r) { return r[0] + '：' + r[1]; }).join('\n'));
      fetch(endpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } })
        .then(function (res) { if (!res.ok) throw new Error(res.status); finish(); })
        .catch(function () {
          btn.disabled = false; btn.textContent = '入力内容を送信する';
          alertBox.textContent = '送信できませんでした。時間をおいてもう一度お試しいただくか、公式LINEからご連絡ください。';
          alertBox.classList.add('show'); alertBox.focus();
        });
    } else {
      setTimeout(finish, 400); // デモ動作
    }
  });
})();
