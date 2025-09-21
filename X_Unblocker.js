// Auto-unblocker with safe throttling & robust DOM handling
(() => {
  'use strict';

  // ---------- CONFIG (tune these) ----------
  const CFG = {
    // Rate limiting window. Keep this conservative.
    maxPerWindow: 20,              // up to 20 unblocks...
    windowMs: 10 * 60 * 1000,      // ...per 10 minutes (~2 per min)
    // Human-like pacing between actions (random)
    minDelayMs: 8000,              // 8s
    maxDelayMs: 14000,             // 14s
    // If UI shows rate-limit-ish messaging, take a long nap:
    cooldownOnErrorMs: 15 * 60 * 1000, // 15 minutes
    // Optional hard stop after N successes (Infinity = no cap)
    sessionCap: Infinity,

    // Waits
    confirmWaitMs: 4000,           // wait for confirm dialog
    stateChangeWaitMs: 5000,       // wait for "Blocked" to clear

    // Scrolling
    scrollStepPx: Math.round(window.innerHeight * 0.9),

    // Selector strategy (generic + some common hints)
    selectors: {
      blockedCandidates: [
        'button[aria-label="Blocked"]',
        '[role="button"][aria-label="Blocked"]'
      ],
      dialogContainers: [
        'div[role="dialog"]',
        'div[role="alertdialog"]',
        '[data-testid="sheetDialog"]',
      ],
      alerts: [
        '[role="alert"]',
        '[data-testid*="toast"]',
        '.Toast', '.toast', '.Snackbar', '.snackbar'
      ],
      rowHints: [
        '[data-testid="UserCell"]',
        '[data-testid="cellInnerDiv"]',
        'li[role="listitem"]',
        'article'
      ]
    }
  };

  // ---------- UTILITIES ----------
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const jitter = (min, max) => min + Math.random() * (max - min);
  const visible = (el) =>
    !!el && el.isConnected && el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden';
  const rAF = () => new Promise(r => requestAnimationFrame(r));

  const isBlockedButton = (el) => {
    if (!el || !el.isConnected) return false;
    if (/blocked/i.test(el.getAttribute('aria-label') || '')) return true;
    const t1 = (el.innerText || '').trim();
    const t2 = (el.textContent || '').trim();
    return /^blocked$/i.test(t1) || /^blocked$/i.test(t2);
  };

  const findRow = (el) => {
    if (!el) return null;
    let n = el;
    for (let i = 0; i < 6 && n; i++) {
      if (CFG.selectors.rowHints.some(sel => n.matches?.(sel))) return n;
      n = n.parentElement;
    }
    return el.closest?.('li, article, div') || el;
  };

  const waitFor = async (fnOrSelector, timeoutMs, pollMs = 100) => {
    const t0 = performance.now();
    while (performance.now() - t0 < timeoutMs) {
      await rAF();
      let found = null;
      if (typeof fnOrSelector === 'function') found = fnOrSelector();
      else found = document.querySelector(fnOrSelector);
      if (found) return found;
      await sleep(pollMs);
    }
    return null;
  };

  const detectRateLimit = () => {
    const nodes = CFG.selectors.alerts.flatMap(sel => Array.from(document.querySelectorAll(sel)));
    const node = nodes.find(n => /rate|too many|try again later|slow down|temporarily limited|limit exceeded/i.test(n.innerText || ''));
    return !!node;
  };

  const getBlockedButtons = () => {
    let els = CFG.selectors.blockedCandidates.flatMap(sel => Array.from(document.querySelectorAll(sel)));
    if (!els.length) {
      els = Array.from(document.querySelectorAll('button,[role="button"]')).filter(isBlockedButton);
    }
    return els.filter(visible);
  };

  const findConfirmButton = () => {
    for (const dc of CFG.selectors.dialogContainers) {
      const dialog = document.querySelector(dc);
      if (!dialog) continue;
      const btns = Array.from(dialog.querySelectorAll('button,[role="button"]'));
      const hit = btns.find(b =>
        /unblock/i.test(b.innerText || '') ||
        /confirm/i.test(b.innerText || '') ||
        /confirmationSheetConfirm/i.test(b.getAttribute('data-testid') || '')
      );
      if (hit) return hit;
    }
    // Last resort: any visible button that says "Unblock"
    return Array.from(document.querySelectorAll('button,[role="button"]'))
      .find(b => /unblock/i.test(b.innerText || '')) || null;
  };

  const smoothScrollIntoView = async (el) => {
    try { el.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch {}
    await rAF();
  };

  const autoScrollForMore = async () => {
    const before = document.documentElement.scrollHeight;
    window.scrollBy(0, CFG.scrollStepPx);
    await sleep(600);
    const after = document.documentElement.scrollHeight;
    if (after <= before) {
      window.scrollBy(0, CFG.scrollStepPx);
      await sleep(1200);
    }
  };

  // ---------- MAIN ----------
  let stopFlag = false;
  let sessionUnblocked = 0;
  let windowStart = Date.now();
  let windowCount = 0;
  const processed = new WeakSet();

  async function throttleWindow() {
    const now = Date.now();
    const elapsed = now - windowStart;
    if (elapsed >= CFG.windowMs) {
      windowStart = now;
      windowCount = 0;
      return;
    }
    if (windowCount >= CFG.maxPerWindow) {
      const waitMs = CFG.windowMs - elapsed;
      console.log(`[AutoUnblock] Window quota reached (${CFG.maxPerWindow}/${CFG.windowMs/60000}m). Cooling for ${Math.ceil(waitMs/1000)}s…`);
      await sleep(waitMs);
      windowStart = Date.now();
      windowCount = 0;
    }
  }

  async function humanPace() {
    const ms = Math.round(jitter(CFG.minDelayMs, CFG.maxDelayMs));
    await sleep(ms);
  }

  async function unblockOne(btn) {
    const row = findRow(btn);
    await smoothScrollIntoView(row || btn);
    await sleep(150 + Math.random() * 250);

    // Click the "Blocked" button to open confirm
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    btn.click?.();

    // Wait for confirm button then click it
    const confirm = await waitFor(findConfirmButton, CFG.confirmWaitMs, 100);
    if (confirm) {
      confirm.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      confirm.click?.();
    }

    // Wait for the row/button to no longer be "Blocked"
    const ok = await waitFor(() => {
      if (!row?.isConnected) return true; // row re-rendered away
      const stillBlocked = !!Array.from((row || document).querySelectorAll('button,[role="button"]')).find(isBlockedButton);
      return !stillBlocked;
    }, CFG.stateChangeWaitMs, 120);

    return !!ok;
  }

  async function start() {
    console.log('[AutoUnblock] Starting… Type stopUnblock() to stop.');
    while (!stopFlag) {
      await throttleWindow();

      let candidates = getBlockedButtons().filter(b => !processed.has(b));
      if (!candidates.length) {
        await autoScrollForMore();
        candidates = getBlockedButtons().filter(b => !processed.has(b));
        if (!candidates.length) {
          console.log('[AutoUnblock] No more "Blocked" buttons found. Stopping.');
          break;
        }
      }

      // Pick the nearest to viewport top
      candidates.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      const btn = candidates[0];
      processed.add(btn);

      await humanPace();

      const success = await unblockOne(btn);

      if (success) {
        sessionUnblocked += 1;
        windowCount += 1;
        console.log(`[AutoUnblock] ✅ Unblocked ${sessionUnblocked} so far.`);
      } else {
        console.warn('[AutoUnblock] ⚠️ Could not verify unblock; slowing down.');
        if (detectRateLimit()) {
          console.warn(`[AutoUnblock] Possible rate limit. Cooling for ${Math.ceil(CFG.cooldownOnErrorMs/60000)} minutes…`);
          await sleep(CFG.cooldownOnErrorMs);
          windowStart = Date.now();
          windowCount = 0;
        } else {
          await sleep(Math.round(CFG.minDelayMs * 2));
        }
      }

      if (sessionUnblocked >= CFG.sessionCap) {
        console.log(`[AutoUnblock] Session cap (${CFG.sessionCap}) reached. Stopping.`);
        break;
      }
    }
    console.log('[AutoUnblock] Done.');
  }

  // Expose a stop handle
  window.stopUnblock = () => { stopFlag = true; console.log('[AutoUnblock] Stop requested.'); };

  // Kick off
  start();
})();
