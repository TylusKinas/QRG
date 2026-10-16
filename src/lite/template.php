<?php
// QRG player. The only PHP on this page: show a link to the extras (e.html) when that file sits next to this one.
$extras = is_file(__DIR__ . '/e.html');
?><!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#000000">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-192.png">
<title>QRG – QR Game Engine</title>
<!-- GENERATED FILE – edit src/ and run: npm run build -->
<style>
/*@CSS@*/
</style></head><body>

<main id="intro" class="v on dither">
 <h1 class="logo">QRG</h1>
 <div class="sub">QR CODE GAME ENGINE</div>
 <div class="box"><p>A whole game fits inside one QR code. Scan a QRG code with your phone camera and the game starts right here: nothing to install, nothing to sign up for.</p></div>
 <p><small>Every game runs in a sandbox without network access. Your progress stays on this device.</small></p>
 <p id="bad" hidden>⚠ That link does not contain a playable game.</p>
 <div class="links">
<?php if ($extras): ?>
  <a id="more" class="b pri" href="e.html">Games · Editors · Reader</a>
<?php endif; ?>
  <button id="install" hidden>Install app</button>
 </div>
</main>

<main id="play" class="v">
 <iframe id="fm"></iframe>
 <div id="blocked"><div>This browser did not start the game inside a protected frame.</div><div class="inf">You can run it without protection. Only do this for games you trust: unprotected code can read this page's data.</div><button id="pu" class="dng">Run without protection</button></div>
</main>

<script>
/*@CORE@*/
</script>
<script>
/*@UI@*/
</script>
</body></html>
