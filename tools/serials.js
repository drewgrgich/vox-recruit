#!/usr/bin/env node
/* Generates the recruit-card serial list (stable for a given batch name) plus each card's
   recruit code and QR URL. Used by make_cards.py; also handy on its own:

     node tools/serials.js --count 120 --batch HC3 --base https://USER.github.io/vox-recruit/

   Output: JSON array [{n, serial, code, url}] on stdout.
   Same batch name + count => same serials every time, so regenerating cards after a URL
   change keeps every already-printed serial valid. */
var path = require("path");
var V = require(path.join(__dirname, "..", "core.js"));
var args = process.argv.slice(2), opt = { count: 120, batch: "HC3", base: "https://YOUR-GITHUB-USERNAME.github.io/vox-recruit/" };
for (var i = 0; i < args.length; i += 2) opt[args[i].replace(/^--/, "")] = args[i + 1];
opt.count = +opt.count;
if (!/\/$/.test(opt.base)) opt.base += "/";

// deterministic, non-sequential bodies (so nobody can guess a neighbour's serial)
var seen = {}, out = [], k = 0;
while (out.length < opt.count) {
  var h = V.cyrb53("VBD-BATCH|" + opt.batch + "|" + (k++), 17), body = "";
  for (var j = 0; j < 4; j++) { body += V.ALPH[h % 31]; h = Math.floor(h / 31); }
  if (seen[body]) continue;
  seen[body] = 1;
  var serial = V.makeSerial(body);
  out.push({ n: out.length + 1, serial: serial, code: V.recruitCode(serial), url: opt.base + "#" + serial });
}
process.stdout.write(JSON.stringify(out, null, 1));
