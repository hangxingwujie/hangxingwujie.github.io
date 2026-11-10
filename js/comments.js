/**
 * China Tech Survival Guide - Comments / Guestbook component
 *
 * Anonymous comments backed by Supabase (PostgREST). No login required.
 * One shared implementation used by both:
 *   - article pages  -> mode: 'page'  (only this article's comments)
 *   - guestbook.html -> mode: 'all'   (every comment, with page labels)
 *
 * The publishable key is designed to be public. Access is constrained
 * server-side by row-level security: SELECT approved only, INSERT approved
 * only, and no UPDATE/DELETE policy at all.
 */
(function (global) {
  'use strict';

  var SUPABASE_URL = 'https://gtlmqgskfwwfclufefru.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_ErpZSTHPinBjV2fVrmd-tg_pTmwvxmU';
  var TABLE = SUPABASE_URL + '/rest/v1/guestbook';
  var PAGE_SIZE = 20;
  var MAX_LEN = 200;
  var MAX_NAME = 40;
  var COOLDOWN_MS = 60000;
  var COOLDOWN_KEY = 'cts_gb_last_post';

  var PAGE_LABELS = {
    'home': 'Homepage',
    'guestbook': 'Guestbook'
  };

  function headers(extra) {
    var h = {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json'
    };
    if (extra) { for (var k in extra) { h[k] = extra[k]; } }
    return h;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function initials(name) {
    var n = (name || 'A').trim();
    return n.charAt(0).toUpperCase();
  }

  function timeAgo(iso) {
    var then = new Date(iso).getTime();
    var diff = Math.floor((Date.now() - then) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600) + ' h ago';
    var days = Math.floor(diff / 86400);
    if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
    var d = new Date(iso);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function pageLabel(slug) {
    if (!slug) return '';
    if (PAGE_LABELS[slug]) return PAGE_LABELS[slug];
    return slug.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function buildItem(row, opts) {
    var item = el('div', 'gb-item');
    var head = el('div', 'gb-item-head');

    head.appendChild(el('div', 'gb-avatar', initials(row.name)));
    head.appendChild(el('div', 'gb-name', row.name || 'Anonymous'));

    if (opts.showPage && row.page) {
      var link = el('a', 'gb-page-tag', pageLabel(row.page));
      link.href = (row.page === 'home' || row.page === 'guestbook')
        ? 'index.html'
        : 'articles/' + row.page + '.html';
      head.appendChild(link);
    }

    head.appendChild(el('div', 'gb-time', timeAgo(row.created_at)));

    item.appendChild(head);
    item.appendChild(el('div', 'gb-msg', row.message));
    return item;
  }

  function mount(container, opts) {
    opts = opts || {};
    var mode = opts.mode || 'page';
    var pageSlug = opts.page || '';
    var heading = opts.heading || (mode === 'all' ? 'All notes' : 'Comments');
    var emptyText = opts.emptyText || 'No comments yet. Be the first to leave one.';

    container.innerHTML = '';

    var wrap = el('section', 'gb-comments');

    // ---- heading
    wrap.appendChild(el('h2', 'gb-comments-title', heading));

    // ---- form
    var form = el('form', 'gb-form');
    form.setAttribute('novalidate', 'novalidate');

    var nameField = el('div', 'gb-field');
    var nameId = 'gb-name-' + Math.random().toString(36).slice(2, 7);
    var nameLabel = el('label', 'gb-label', 'Your name ');
    nameLabel.setAttribute('for', nameId);
    nameLabel.appendChild(el('span', 'gb-optional', '(optional)'));
    var nameInput = el('input', 'gb-input');
    nameInput.id = nameId;
    nameInput.type = 'text';
    nameInput.maxLength = MAX_NAME;
    nameInput.placeholder = 'Anonymous';
    nameInput.setAttribute('autocomplete', 'nickname');
    nameField.appendChild(nameLabel);
    nameField.appendChild(nameInput);

    var msgField = el('div', 'gb-field');
    var msgId = 'gb-message-' + Math.random().toString(36).slice(2, 7);
    var msgLabel = el('label', 'gb-label', 'Your comment');
    msgLabel.setAttribute('for', msgId);
    var msgInput = el('textarea', 'gb-textarea');
    msgInput.id = msgId;
    msgInput.maxLength = MAX_LEN;
    msgInput.placeholder = mode === 'page'
      ? 'Did this guide help? Anything out of date?'
      : 'Something you wish you had known before you landed...';
    var meta = el('div', 'gb-meta');
    meta.appendChild(el('span', null, 'This will be public.'));
    var counter = el('span', 'gb-counter', '0 / ' + MAX_LEN);
    meta.appendChild(counter);
    msgField.appendChild(msgLabel);
    msgField.appendChild(msgInput);
    msgField.appendChild(meta);

    var submit = el('button', 'gb-submit', 'Post comment');
    submit.type = 'submit';

    var status = el('div', 'gb-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    form.appendChild(nameField);
    form.appendChild(msgField);
    form.appendChild(submit);
    form.appendChild(status);
    wrap.appendChild(form);

    // ---- list
    var countEl = el('div', 'gb-count');
    var listEl = el('div', 'gb-list');
    var loadMore = el('button', 'gb-loadmore', 'Load older comments');
    loadMore.type = 'button';
    loadMore.style.display = 'none';

    wrap.appendChild(countEl);
    wrap.appendChild(listEl);
    wrap.appendChild(loadMore);
    container.appendChild(wrap);

    var offset = 0;
    var total = 0;
    var loading = false;
    var busy = false;

    function showStatus(kind, text) {
      status.className = 'gb-status show ' + kind;
      status.textContent = text;
    }
    function hideStatus() {
      status.className = 'gb-status';
      status.textContent = '';
    }
    function setCount(n) {
      if (n > 0) {
        countEl.textContent = n === 1 ? '1 comment' : n + ' comments';
      } else {
        countEl.textContent = '';
      }
    }
    function renderSkeletons() {
      listEl.innerHTML = '';
      for (var i = 0; i < 2; i++) { listEl.appendChild(el('div', 'gb-skel')); }
    }
    function renderEmpty() {
      listEl.innerHTML = '';
      listEl.appendChild(el('div', 'gb-empty', emptyText));
    }

    function updateCounter() {
      var len = msgInput.value.length;
      counter.textContent = len + ' / ' + MAX_LEN;
      counter.className = 'gb-counter'
        + (len > MAX_LEN ? ' over' : (len > MAX_LEN - 20 ? ' warn' : ''));
      submit.disabled = busy || len === 0 || len > MAX_LEN;
    }

    function cooldownLeft() {
      var last = parseInt(localStorage.getItem(COOLDOWN_KEY) || '0', 10);
      var left = COOLDOWN_MS - (Date.now() - last);
      return left > 0 ? Math.ceil(left / 1000) : 0;
    }

    function load(reset) {
      if (loading) return;
      loading = true;
      if (reset) {
        offset = 0;
        renderSkeletons();
      }

      var url = TABLE + '?select=id,name,message,page,created_at'
        + '&status=eq.approved'
        + '&order=created_at.desc'
        + '&limit=' + PAGE_SIZE
        + '&offset=' + offset;

      if (mode === 'page' && pageSlug) {
        url += '&page=eq.' + encodeURIComponent(pageSlug);
      }

      fetch(url, { headers: headers({ 'Prefer': 'count=exact' }) })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          var range = res.headers.get('content-range') || '';
          var parts = range.split('/');
          if (parts.length > 1 && parts[1] !== '*') {
            total = parseInt(parts[1], 10) || 0;
          }
          return res.json();
        })
        .then(function (rows) {
          if (reset) listEl.innerHTML = '';
          if (reset && rows.length === 0) {
            renderEmpty();
          } else {
            rows.forEach(function (row) {
              listEl.appendChild(buildItem(row, { showPage: mode === 'all' }));
            });
          }
          offset += rows.length;
          setCount(total);
          loadMore.style.display = (rows.length === PAGE_SIZE && offset < total) ? 'block' : 'none';
        })
        .catch(function (err) {
          if (reset) {
            listEl.innerHTML = '';
            listEl.appendChild(el('div', 'gb-empty', 'Could not load comments right now. Please refresh.'));
          }
          setCount(0);
          console.error('Comments load failed:', err);
        })
        .then(function () { loading = false; });
    }

    msgInput.addEventListener('input', function () {
      updateCounter();
      if (status.className.indexOf('err') !== -1) hideStatus();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) return;

      var message = msgInput.value.trim();
      var name = nameInput.value.trim();

      if (!message) {
        showStatus('err', 'Please write a comment before posting.');
        msgInput.focus();
        return;
      }
      if (message.length > MAX_LEN) {
        showStatus('err', 'Comments are limited to ' + MAX_LEN + ' characters.');
        return;
      }
      if (name.length > MAX_NAME) {
        showStatus('err', 'Names are limited to ' + MAX_NAME + ' characters.');
        return;
      }
      var wait = cooldownLeft();
      if (wait > 0) {
        showStatus('err', 'Please wait ' + wait + 's before posting again.');
        return;
      }

      busy = true;
      submit.disabled = true;
      submit.textContent = 'Posting...';
      showStatus('info', 'Sending...');

      fetch(TABLE, {
        method: 'POST',
        headers: headers({ 'Prefer': 'return=representation' }),
        body: JSON.stringify({
          name: name || 'Anonymous',
          message: message,
          page: mode === 'page' ? pageSlug : 'guestbook',
          status: 'approved'
        })
      })
        .then(function (res) {
          if (res.status === 401 || res.status === 403) throw new Error('rejected');
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (rows) {
          localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
          msgInput.value = '';
          updateCounter();
          showStatus('ok', 'Posted. Thanks for adding to the guide.');

          if (window.CtsTrack) {
            window.CtsTrack('comment_submit', {
              source_page: mode === 'page' ? pageSlug : 'guestbook',
              mode: mode,
              length: message.length
            });
          }

          if (rows && rows.length) {
            var emptyNode = listEl.querySelector('.gb-empty');
            if (emptyNode) listEl.innerHTML = '';
            listEl.insertBefore(buildItem(rows[0], { showPage: mode === 'all' }), listEl.firstChild);
            total += 1;
            setCount(total);
            offset += 1;
          } else {
            load(true);
          }
        })
        .catch(function (err) {
          if (err && err.message === 'rejected') {
            showStatus('err', 'That comment was rejected. Check the length (1-200 characters) and try again.');
          } else {
            showStatus('err', 'Could not post right now. Please try again in a moment.');
          }
          console.error('Comments post failed:', err);
        })
        .then(function () {
          busy = false;
          submit.textContent = 'Post comment';
          updateCounter();
        });
    });

    loadMore.addEventListener('click', function () { load(false); });

    updateCounter();
    load(true);
  }

  global.CtsComments = { mount: mount, MAX_LEN: MAX_LEN };

})(window);
