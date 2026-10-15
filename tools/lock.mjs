#!/usr/bin/env node
// lock.mjs — lock one page of this site behind a password. Adapted from the wiki lens's encrypt_lens.mjs.
//
// Asked for by Prateek on 15 October 2026: this copy of prtk.xyz stays online but behind a password.
// Each page is wrapped in a page that holds only ciphertext: AES-256-GCM, with the key derived from the
// password by PBKDF2-SHA-256 (600,000 rounds). Without the password the text is unreadable. The images,
// video and fonts in media/ and fonts/ are not locked. It is only as strong as the password.
//
// Once the password opens one page, the key is kept for the browser tab, so moving between pages, or
// between the wide and phone versions, does not ask again. "Remember on this device" keeps it for good.
//
// The password is read from the LENS_PASSWORD environment variable, never from the command line,
// so it does not land in shell history. It is never written to the repository.
//
// Usage: LENS_PASSWORD='…' node tools/lock.mjs <page.html> <out.html> [../]

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { webcrypto as crypto } from "node:crypto";

const src = process.argv[2];
const out = process.argv[3];
const root = process.argv[4] || "";  // "../" for a page one folder down, so the favicon is found
const password = process.env.LENS_PASSWORD;
if (!password || password.length < 12) {
  console.error("Set LENS_PASSWORD (12 characters or more) in the environment.");
  process.exit(2);
}

const ROUNDS = 600000;
const html = readFileSync(src, "utf8");
// The salt is fixed for this site, so the key a device remembers keeps opening the page after it is
// rebuilt with the same password. A random salt per build broke "Remember on this device" on every
// update (reported 12 October 2026). The IV stays random per build, which is what AES-GCM needs.
// Change LENS_SALT_LABEL (or the password) to make every remembered device ask again.
const saltLabel = "prtk.xyz/" + (process.env.LENS_SALT_LABEL || "v1");
const salt = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(saltLabel))).slice(0, 16);
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ROUNDS }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(html)));
const b64 = (u) => Buffer.from(u).toString("base64");

const title = (/<title>([^<]*)<\/title>/.exec(html) || [, "prateek shankar"])[1];
const built = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

const page = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>${title}</title>
<meta name="description" content="Password required.">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta name="twitter:title" content="${title}">
<meta property="og:description" content="Password required.">
<meta name="twitter:card" content="summary">
<link rel="icon" href="${root}favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400&family=Inter:wght@400;500&family=DM+Mono:wght@500&display=swap" rel="stylesheet">
<style>
:root{--paper:#f4f1e9;--raised:#fffffc;--struct:#d7d2c8;--ink:#20201e;--muted:#4f4d49;--weak:#686661;--acc:#17706a;--warn:#a8503a;
  --serif:'Crimson Pro',Georgia,serif;--sans:'Inter','Helvetica Neue',Arial,sans-serif;--mono:'DM Mono',ui-monospace,Menlo,monospace}
@media (prefers-color-scheme:dark){:root{--paper:#1d1d1b;--raised:#262624;--struct:#46443f;--ink:#f1eee6;--muted:#c9c5bb;--weak:#a8a49b;--acc:#6cc7be;--warn:#e48a73;color-scheme:dark}}
*{box-sizing:border-box}
html,body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 var(--sans)}
main{min-height:100vh;display:grid;place-items:center;padding:24px 16px}
.box{width:min(420px,100%);border-top:1.5px solid var(--ink);padding-top:18px}
.kind{font:500 12px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--weak)}
h1{font:400 44px/1.05 var(--serif);margin:10px 0 8px}
p{margin:0 0 18px;color:var(--muted)}
label{display:block;font:500 11.5px/1.3 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--weak);margin-bottom:6px}
input[type=password]{width:100%;font:16px/1.3 var(--sans);padding:12px 14px;border:1px solid var(--struct);border-radius:8px;background:var(--raised);color:var(--ink)}
input:focus-visible,button:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:14px;flex-wrap:wrap}
.keep{display:flex;gap:8px;align-items:center;font:400 14px/1.4 var(--sans);letter-spacing:0;text-transform:none;color:var(--muted);cursor:pointer;margin:0}
button{font:500 15px/1 var(--sans);background:var(--ink);color:var(--paper);border:0;border-radius:8px;padding:12px 22px;min-height:44px;cursor:pointer}
button[disabled]{opacity:.6;cursor:progress}
.msg{min-height:1.6em;margin-top:12px;font-size:14px;color:var(--warn)}
.foot{margin-top:28px;font:400 12px/1.5 var(--mono);color:var(--weak)}
</style>
</head>
<body>
<main id="main">
  <form class="box" id="f" autocomplete="on" onsubmit="return false">
    <span class="kind">prtk.xyz · private</span>
    <h1>${title.split(" — ")[0].replace(/ v[\d.]+$/, "")}</h1>
    <p>Prateek Shankar's portfolio of work. Enter the password to open it.</p>
    <input type="text" name="username" value="prtk-xyz" autocomplete="username" hidden>
    <label for="pw">Password</label>
    <input id="pw" name="password" type="password" autocomplete="current-password" required autofocus>
    <div class="row">
      <label class="keep" for="keep"><input id="keep" type="checkbox"> Remember on this device</label>
      <button id="go" type="submit" disabled>Loading…</button>
    </div>
    <div class="msg" id="msg" role="alert" aria-live="assertive"></div>
    <div class="foot">Locked ${built}. Nothing is readable without the password.</div>
  </form>
</main>
<script>
(function(){
  var SALT = "${b64(salt)}", IV = "${b64(iv)}", CT = "${b64(ct)}", ROUNDS = ${ROUNDS};
  var KEY = "prtk-key-" + SALT;
  var form = document.getElementById("f"), msg = document.getElementById("msg"), go = document.getElementById("go"), pwEl = document.getElementById("pw");
  var busy = false, shown = false, watchdog = null;
  function say(t){ msg.textContent = t; }
  function ready(){ busy = false; go.disabled = false; go.textContent = "Open"; clearTimeout(watchdog); }
  function working(){ busy = true; go.disabled = true; go.textContent = "Opening…"; say("");
    // If nothing has happened after 12 seconds, say so instead of waiting for ever.
    clearTimeout(watchdog); watchdog = setTimeout(function(){ if (!shown){ ready(); say("Opening is taking too long in this browser. Press Open to try again, or reload the page."); } }, 12000); }
  function bytes(b){ var s = atob(b), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  function loaded(){ return document.readyState === "complete" ? Promise.resolve() : new Promise(function(r){ window.addEventListener("load", r, { once: true }); }); }
  // Show the unlocked page once this page has fully loaded: some browsers ignore a rewrite while loading.
  // Rewriting the document keeps the address bar for the lens. If the browser ignores it, a full-window
  // frame shows the page instead.
  async function show(html){
    if (shown) return; await loaded();
    var rewrote = false;
    try { document.open(); document.write(html); document.close(); rewrote = !document.getElementById("f"); } catch(e){}
    if (rewrote){ shown = true; return; }
    var f = document.createElement("iframe");
    f.setAttribute("title", "prtk.xyz");
    f.style.cssText = "position:fixed;inset:0;width:100%;height:100%;border:0;background:#f4f1e9";
    try { document.close(); } catch(e){}
    var root = document.documentElement || document.appendChild(document.createElement("html"));
    var body = document.body || root.appendChild(document.createElement("body"));
    body.innerHTML = ""; body.style.margin = "0"; f.srcdoc = html; body.appendChild(f);
    shown = true;
  }
  if (!(window.crypto && crypto.subtle && window.TextDecoder)){
    go.textContent = "Open";
    say("This browser can't unlock the page. Open the link in Safari, Chrome, Firefox or Edge, not inside another app.");
    return;
  }
  async function decrypt(key){
    var plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(IV) }, key, bytes(CT));
    return new TextDecoder().decode(plain);
  }
  async function derive(pw){
    var base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: bytes(SALT), iterations: ROUNDS }, base, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
  }
  async function unlockWithPassword(){
    if (busy || shown) return;
    var pw = pwEl.value.trim();
    if (!pw){ say("Enter the password, then press Open."); pwEl.focus(); return; }
    working();
    var key, raw, html;
    try {
      key = await derive(pw);
      raw = new Uint8Array(await crypto.subtle.exportKey("raw", key));
      html = await decrypt(key);
    } catch(err){
      ready();
      say(err && err.name === "OperationError" ? "That password did not open it. Check it and try again." : "The page could not be unlocked in this browser (" + (err && err.name || "error") + "). Try Safari, Chrome, Firefox or Edge.");
      pwEl.select();
      return;
    }
    try { sessionStorage.setItem(KEY, btoa(String.fromCharCode.apply(null, raw))); if (document.getElementById("keep").checked) localStorage.setItem(KEY, btoa(String.fromCharCode.apply(null, raw))); } catch(e){}
    try { await show(html); } catch(err){ ready(); say("The password is right, but the page could not be shown in this browser. Try Safari, Chrome, Firefox or Edge."); }
  }
  form.addEventListener("submit", function(e){ e.preventDefault(); unlockWithPassword(); });
  // A key remembered on this device opens the page without the password.
  var saved = null; try { saved = localStorage.getItem(KEY) || sessionStorage.getItem(KEY); } catch(e){}
  if (saved){
    working();
    crypto.subtle.importKey("raw", bytes(saved), "AES-GCM", false, ["decrypt"]).then(decrypt).then(show).catch(function(){
      try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch(e){}
      ready();
      say("This device's saved key no longer opens the page, because the password changed. Enter the password.");
    });
  } else {
    ready();
  }
})();
</script>
</body>
</html>
`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, page);
console.log(`locked ${src} -> ${out} (${Math.round(page.length / 1024)} KB)`);
