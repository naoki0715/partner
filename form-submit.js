/*
 * CAREECON+ パートナーLP：フォーム送信 → Googleフォーム連携
 *
 * ページ内のすべてのフォーム（ヒーロー／下部CTA／個別相談モーダル）の送信を
 * Googleフォームの回答として送ります。デザインシステム側は改造していません。
 *
 * 【設定方法】下の CONFIG の2か所を、作成したGoogleフォームの値に書き換えてください。
 *   formUrl : Googleフォームの送信先URL（…/forms/d/e/＜フォームID＞/formResponse）
 *   entries : 各質問の entry.数字（「事前入力したURLを取得」で確認できます）
 *
 * 【注意】Googleフォームへの直接POSTは非公式の使い方のため、ブラウザ側では
 * 送信の成否を判定できません（通信エラー時のみエラー表示）。
 * 受信確認は、Googleフォームの「回答」タブ／スプレッドシートで行ってください。
 */
(function () {
  'use strict';

  var CONFIG = {
    formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSd5Np8OUyEJRBLLlTWOmR9ZG0h5IVFRtvoJkmFfnIPUYbZI5Q/formResponse',
    entries: {
      company: 'entry.609139208',  // 会社名
      name: 'entry.920544992',     // お名前
      email: 'entry.1830845583',   // メールアドレス
      phone: 'entry.985139572',    // 電話番号
      type: 'entry.475408195'      // 種別（「資料請求」または「個別相談」）
    }
  };

  var PRIVACY_URL = 'https://careecon-plus.com/privacy';

  var MESSAGES = {
    notReady: '現在フォームの準備中です。恐れ入りますが、しばらくしてからお試しください。',
    required: function (label) { return label + 'を入力してください。'; },
    email: 'メールアドレスの形式をご確認ください。',
    phone: '電話番号の形式をご確認ください。',
    consent: 'プライバシーポリシーへの同意が必要です。チェックを入れてください。',
    network: '送信に失敗しました。通信環境をご確認のうえ、もう一度お試しください。',
    doneTitle: '送信が完了しました',
    doneBody: '担当より1営業日以内に、ご登録のメールアドレス宛にご連絡いたします。'
  };

  // フィールド名 → 送信項目（_m / 2 などの接尾辞はフォームごとの重複回避用）
  function fieldKey(name) {
    var n = String(name || '').replace(/(_m|2)$/, '');
    if (n === 'company') return 'company';
    if (n === 'last_name' || n === 'name') return 'name';
    if (n === 'email') return 'email';
    if (n === 'phone') return 'phone';
    return null;
  }

  var LABELS = { company: '会社名', name: 'お名前', email: 'メールアドレス', phone: '電話番号' };

  function isConfigured() {
    if (!/^https:\/\/docs\.google\.com\/forms\/d\/e\/[^/]+\/formResponse/.test(CONFIG.formUrl)) return false;
    return Object.keys(CONFIG.entries).every(function (k) { return /^entry\.\d+$/.test(CONFIG.entries[k]); });
  }

  // パネル見出しから種別を判定（モーダルは「個別相談を予約する」）
  function detectType(form) {
    var head = form.previousElementSibling;
    var text = head ? head.textContent : '';
    return /個別相談/.test(text) ? '個別相談' : '資料請求';
  }

  function collect(form) {
    var values = {};
    var inputs = form.querySelectorAll('input[name]');
    for (var i = 0; i < inputs.length; i++) {
      var key = fieldKey(inputs[i].name);
      if (key) values[key] = String(inputs[i].value || '').trim();
    }
    return values;
  }

  function validate(values) {
    var order = ['company', 'name', 'email', 'phone'];
    for (var i = 0; i < order.length; i++) {
      if (!values[order[i]]) return MESSAGES.required(LABELS[order[i]]);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return MESSAGES.email;
    var digits = values.phone.replace(/[^0-9０-９]/g, '');
    if (digits.length < 9 || digits.length > 15) return MESSAGES.phone;
    return null;
  }

  // 「プライバシーポリシーに同意のうえ送信」チェックボックスを、送信ボタンの直前に差し込む。
  // フォーム部品（デザインシステム）は改造せず、表示されたフォームごとに後から追加する。
  function ensureConsent() {
    var forms = document.querySelectorAll('form');
    for (var i = 0; i < forms.length; i++) {
      var form = forms[i];
      if (form.querySelector('[data-consent]')) continue;
      var btn = form.querySelector('button[type="submit"]');
      if (!btn || !form.querySelector('input[name]')) continue;

      var label = document.createElement('label');
      label.setAttribute('data-consent', '');
      label.style.cssText = 'display:flex; align-items:flex-start; gap:8px; margin:4px 0 2px; color:#fff; font-family:var(--font-body); font-size:13px; line-height:1.6; cursor:pointer;';

      var box = document.createElement('input');
      box.type = 'checkbox';
      box.name = 'privacy_consent';
      box.style.cssText = 'width:16px; height:16px; margin:3px 0 0; flex-shrink:0; cursor:pointer; accent-color:var(--color-yellow-500);';
      box.addEventListener('change', function () { clearError(this.form); });

      var text = document.createElement('span');
      var link = document.createElement('a');
      link.href = PRIVACY_URL;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'プライバシーポリシー';
      link.style.cssText = 'color:#fff; text-decoration:underline;';
      var tail = document.createTextNode('に同意のうえ送信 ');
      var req = document.createElement('span');
      req.textContent = '必須';
      req.style.cssText = 'font-size:10px; font-weight:700; color:#fff; background:var(--color-red-600); padding:2px 6px; border-radius:3px; margin-left:4px; white-space:nowrap;';
      text.appendChild(link);
      text.appendChild(tail);
      text.appendChild(req);

      label.appendChild(box);
      label.appendChild(text);
      form.insertBefore(label, btn);
    }
  }

  function messageEl(form) {
    var el = form.querySelector('[data-form-msg]');
    if (!el) {
      el = document.createElement('p');
      el.setAttribute('data-form-msg', '');
      el.setAttribute('role', 'alert');
      el.style.cssText = 'margin:2px 0 0; padding:8px 12px; border-radius:6px; background:#fff; color:#c0262d; font-size:13px; font-weight:700; line-height:1.6;';
      form.appendChild(el);
    }
    return el;
  }

  function showError(form, text) {
    var el = messageEl(form);
    el.textContent = text;
    el.style.display = '';
  }

  function clearError(form) {
    var el = form.querySelector('[data-form-msg]');
    if (el) el.style.display = 'none';
  }

  function showDone(form) {
    // フレームワーク管理のDOMは消さず、フォームを隠して完了メッセージを横に置く
    var done = document.createElement('div');
    done.setAttribute('role', 'status');
    done.style.cssText = 'padding:24px 8px; text-align:center; color:#fff; font-family:var(--font-body);';
    var title = document.createElement('p');
    title.textContent = MESSAGES.doneTitle;
    title.style.cssText = 'margin:0 0 10px; font-size:20px; font-weight:900;';
    var body = document.createElement('p');
    body.textContent = MESSAGES.doneBody;
    body.style.cssText = 'margin:0; font-size:14px; line-height:1.8;';
    done.appendChild(title);
    done.appendChild(body);
    form.style.display = 'none';
    form.parentNode.insertBefore(done, form.nextSibling);

    // 見出し側に「1営業日以内に連絡」の案内がある場合（個別相談モーダル）は、
    // 完了メッセージと重複するので見出し側を隠す
    var head = form.previousElementSibling;
    if (head) {
      var lines = head.querySelectorAll('p');
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].textContent.indexOf('1営業日以内') !== -1) lines[i].style.display = 'none';
      }
    }
  }

  function setBusy(form, busy) {
    var btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.disabled = busy;
    btn.style.opacity = busy ? '.6' : '';
    btn.style.cursor = busy ? 'wait' : 'pointer';
  }

  function send(values, type) {
    var body = new URLSearchParams();
    body.append(CONFIG.entries.company, values.company);
    body.append(CONFIG.entries.name, values.name);
    body.append(CONFIG.entries.email, values.email);
    body.append(CONFIG.entries.phone, values.phone);
    body.append(CONFIG.entries.type, type);
    // no-cors: 応答は読めない（opaque）。通信自体が成功すれば resolve される
    return fetch(CONFIG.formUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });
  }

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    // 常にページ遷移を止める（入力内容がURLに載るのを防ぐ）
    e.preventDefault();

    if (form.getAttribute('data-sending') === '1') return;

    if (!isConfigured()) {
      if (window.console) console.warn('[form-submit] CONFIG が未設定です。form-submit.js を編集してください。');
      showError(form, MESSAGES.notReady);
      return;
    }

    var values = collect(form);
    var problem = validate(values);
    if (problem) {
      showError(form, problem);
      return;
    }
    ensureConsent();
    var consent = form.querySelector('[data-consent] input');
    if (!consent || !consent.checked) {
      showError(form, MESSAGES.consent);
      return;
    }
    clearError(form);

    form.setAttribute('data-sending', '1');
    setBusy(form, true);
    send(values, detectType(form)).then(function () {
      showDone(form);
    }).catch(function () {
      showError(form, MESSAGES.network);
    }).then(function () {
      form.removeAttribute('data-sending');
      setBusy(form, false);
    });
  }, true);

  // 初回表示と、モーダルなど後から現れるフォームの両方にチェックボックスを付ける
  ensureConsent();
  if (window.MutationObserver) {
    new MutationObserver(ensureConsent).observe(document.documentElement, { childList: true, subtree: true });
  }
  document.addEventListener('DOMContentLoaded', ensureConsent);
})();
