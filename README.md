# X Auto-Unblocker — Open-Source Documentation

A privacy-first tool that helps you **sequentially unblock** accounts on X.com (formerly Twitter) with **human-like pacing** and **conservative rate limiting**. This documentation explains how to use, configure, and contribute—**without including any source code**.

---

## What it does

* Finds visible **“Blocked”** buttons in your **Blocked accounts** list
* Clicks **one at a time**, waits for the **confirm** dialog, verifies success
* Applies **windowed rate limits** (e.g., \~2 actions/min) with random delays
* Detects likely **rate-limit toasts** and automatically cools down
* Auto-scrolls to load more entries and continues safely
* Lets you **stop anytime** with a single command

> ⚠️ **Important**: Automated UI actions may violate a site’s Terms of Service. Use at your own risk, keep limits conservative, and prefer manual controls when in doubt.

---

## Quick start (no code shown)

1. **Open** X.com in a desktop browser and go to **Settings → Privacy and safety → Mute and block → Blocked accounts**.
2. **Load** the tool in one of three ways:

   * **Browser console**: Paste the compiled script into DevTools Console and press Enter.
   * **Bookmarklet**: Create a bookmark whose URL is the minified one-liner; click it while on the Blocked page.
   * **Userscript**: Install via a userscript manager and enable on the Blocked page URL.
3. The tool announces that it started; it will unblock **sequentially** at safe intervals.
4. To **stop**, run the provided stop command (displayed in the start banner).
5. Keep the tab **foregrounded**; background tabs throttle timers.

---

## Configuration

These options are intended to be easy to tune via a single configuration block. Names and defaults are listed for reference:

### Rate & pacing

* **`maxPerWindow`**: Maximum unblocks allowed per window (default: 20).
* **`windowMs`**: Duration of the rate-limit window in milliseconds (default: 10 minutes).
* **`minDelayMs` / `maxDelayMs`**: Random delay range between actions (default: 8–14 seconds).
* **`cooldownOnErrorMs`**: Long cooldown when a rate-limit is suspected (default: 15 minutes).
* **`sessionCap`**: Optional hard stop after N successes (default: no cap).

### UI timing

* **`confirmWaitMs`**: Max time to wait for the confirm dialog/button (default: 4 seconds).
* **`stateChangeWaitMs`**: Max time to verify that “Blocked” disappeared for that row (default: 5 seconds).

### Scrolling

* **`scrollStepPx`**: Pixels to scroll when loading more items (default: \~90% of viewport height).

### Selectors (override only if X UI changes)

* **`blockedCandidates`**: Button selectors that represent the actionable “Blocked” control.
* **`dialogContainers`**: Elements that typically host confirmation dialogs.
* **`alerts`**: Elements where error/rate-limit toasts appear.
* **`rowHints`**: Ancestor nodes for a single user row (used to verify state changes).

---

## How it avoids skips & rate limits

* **Sequential flow**: It won’t click a new target until the previous unblock is confirmed or a timeout occurs.
* **Explicit waits**: Looks for the **confirm** button in a dialog, clicks it, and then waits for the **“Blocked”** state to disappear from that row.
* **Windowed rate limiting**: Caps actions per time window and pauses when the cap is reached.
* **Human-like jitter**: Random delays reduce machine-like action signatures.
* **Auto-cooldown**: If it detects “try again later / limit exceeded” style alerts, it backs off for a longer period.
* **Viewport awareness**: Scrolls the target into view before interaction and lazily loads more as needed.

---

## Recommended safe settings

* Start with **20 unblocks per 10 minutes** (about **2/min**).
* Keep delays **8–14 seconds** between actions or slower.
* If you ever see soft errors or UI feels laggy, **halve** the rate (e.g., 10 per 10 minutes) and widen delays.
* Avoid running similar automation in **other tabs** concurrently.

---

## Usage tips

* **Keep the tab focused**: Background tabs can throttle timers and cause false “skips.”
* **Don’t multitask** with heavy pages or video while it runs.
* **Stop & resume** rather than forcing it if you suspect a limit.
* **Don’t parallelize**: Multiple windows or tools acting on the same page increase risk.

---

## Troubleshooting

**It “skips” many accounts**

* Most “skips” are ignored clicks while a confirm modal is open. Sequential waits eliminate this. If it persists, reduce rate and increase `confirmWaitMs`/`stateChangeWaitMs`.

**No “Blocked” buttons found**

* Ensure you’re on the **Blocked** page. Scroll a bit to trigger lazy loading. If UI changed, update the **selectors** config.

**Dialogs not detected**

* Increase `confirmWaitMs`. If the site’s dialog markup changed, add a new selector under `dialogContainers`.

**Hit by rate limiting**

* You’ll see an alert/toast; the tool should auto-cooldown. Next run, reduce `maxPerWindow` and lengthen delays.

**Stops too early**

* Raise `sessionCap` or remove it. Confirm you didn’t trigger a cooldown window.

---

## Project structure (suggested)

* `src/` — Readable source and modules (DOM utils, rate limiter, runner, config)
* `dist/` — Minified build for console/bookmarklet/userscript
* `types/` — (Optional) Type definitions
* `tools/` — Build scripts (bundler/minifier), bookmarklet packer
* `README.md` — This documentation
* `LICENSE` — Open-source license file
* `.editorconfig`, `.eslintrc.*` — Formatting and lint rules

---

## Development guidelines

* **No scraping or data exfiltration**: Interact only with currently visible UI elements; avoid storing personal data.
* **Idempotent actions**: Always verify post-action state; don’t assume a click succeeded.
* **Progressive enhancement**: Prefer vanilla DOM APIs; keep dependencies minimal.
* **Fail safe**: On any uncertainty (timeouts, missing UI), **pause** and log rather than guessing.
* **Telemetry**: Console logging only; no remote calls.

---

## Contributing

1. **Open an issue** describing the change (bug, UI update, feature).
2. **Fork** and create a feature branch with a descriptive name.
3. Ensure builds pass lint checks and basic manual tests on the Blocked page.
4. Submit a **PR** with a clear summary, test notes, and screenshots/gifs if relevant.

We welcome updates to **selectors** when X UI changes, better **heuristics** for dialog detection, and improvements to **rate-limit detection**.

---

## Security & privacy

* The tool runs **only in your browser** on the X.com page you open.
* It does **not** send data to external servers.
* Avoid posting logs publicly, as they may include partial usernames from the UI.

---

## Ethics & compliance

* Review X.com’s **Terms of Service** and **Automation/Platform rules** before use.
* Keep automation **limited**, **transparent** to yourself, and **reversible** (stop at any time).
* Do not use the tool to harass or target people.

---

## FAQ

**Does unblocking others improve my account quality?**
Not directly. What generally hurts is **other people blocking or reporting you**. Cleaning your block list doesn’t change that. Focus on positive interactions going forward.

**Can I crank the rate way up?**
You can, but you **shouldn’t**. Aggressive behavior increases the chance of temporary feature limits or harder flags. Keep it slow and steady.

**Will this work if X changes its UI?**
Likely, but selector updates may be required. That’s why the selectors are configurable.

---

## License

**MIT License.** You are free to use, copy, modify, and distribute the software, subject to the terms in `LICENSE`.

---

## Changelog (template)

* **v1.0.0** — Initial public release: sequential unblocking, rate window, jitter, cooldowns, auto-scroll, stop handle.

---
