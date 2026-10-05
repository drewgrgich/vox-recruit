/* =====================================================================
   VOX BINARY DATAWORX · RECRUITMENT CHANNEL · shared core
   Used by index.html (the recruit app), staff.html (the verifier) and
   tools/serials.js (card + master-list generator). Change it in ONE place.

   EVERYTHING per-card comes from the card serial:
     serial  ->  seeded puzzle variations  ->  recruit code
   A code only verifies against the serial it was earned on, and the
   physical card carries the serial, so a copied code is useless without
   the card.
   ===================================================================== */
(function (root) {
  "use strict";

  // ---- secret (lightly obscured; anyone who reads JS can find it — see README) ----
  var _S = [97,117,115,107,118,98,101,120,101,118,58,121,48,120,101,123,118,121,115,120,107,127,118,123,116,110,120,121,58,37,32,34,107,124,110,117,114,101,103,98,121,124,100,49,112,118,110,118,107,101,120,120,99,124,114,110];
  var SECRET = _S.map(function (c) { return String.fromCharCode(c ^ 23); }).join("");

  // Staff PIN (for staff.html "issue code" and the in-app staff skip). Stored hashed.
  // Default PIN is 7720. To change: node -e "console.log(require('./core.js').pinHash('NEWPIN'))"
  // and paste the number below.
  var STAFF_PIN_HASH = 246405614533837;

  var ALPH = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // 31 chars, no 0/O/1/I/L
  var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  function cyrb53(str, seed) {
    seed = seed || 0;
    var h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }
  function pinHash(pin) { return cyrb53("VBD-PIN|" + String(pin).trim() + "|" + SECRET, 11); }
  function checkPin(pin) { return pinHash(pin) === STAFF_PIN_HASH; }

  // ---- serials -----------------------------------------------------------
  function checkChar(body) { return ALPH[cyrb53("VBD-CHK|" + body + "|" + SECRET, 3) % 31]; }
  function makeSerial(body) { return "VBD-" + body + "-" + checkChar(body); }
  /** Accepts "vbd-7k2m-q", "7K2MQ", "VBD 7K2M Q" ... returns canonical serial or null. */
  function normSerial(input) {
    if (!input) return null;
    var s = String(input).toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (s.indexOf("VBD") === 0) s = s.slice(3);
    if (s.length !== 5) return null;
    for (var i = 0; i < 5; i++) if (ALPH.indexOf(s[i]) < 0) return null;
    var body = s.slice(0, 4);
    if (checkChar(body) !== s[4]) return null;
    return makeSerial(body);
  }

  // ---- recruit code ------------------------------------------------------
  function recruitCode(serial) {
    var n = cyrb53("VBD-CODE|" + serial + "|" + SECRET, 7), out = "";
    for (var i = 0; i < 6; i++) { out += ALPH[n % 31]; n = Math.floor(n / 31); }
    return out.slice(0, 3) + "-" + out.slice(3);
  }
  function normCode(c) { return String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
  function verify(serialInput, codeInput) {
    var serial = normSerial(serialInput);
    if (!serial) return { ok: false, reason: "serial" };
    var ok = normCode(recruitCode(serial)) === normCode(codeInput);
    return { ok: ok, serial: serial, reason: ok ? "" : "code" };
  }

  // ---- seeded RNG --------------------------------------------------------
  function rng(seedStr) {
    var a = cyrb53(seedStr + "|" + SECRET, 5) >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function ri(r, lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function shuffle(r, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function letters(s) { return String(s || "").toUpperCase().replace(/[^A-Z]/g, ""); }
  function shiftChar(ch, k) {
    var i = LETTERS.indexOf(ch);
    if (i < 0) return ch;
    return LETTERS[((i + k) % 26 + 26) % 26];
  }
  function caesar(text, k) { return text.split("").map(function (c) { return shiftChar(c, k); }).join(""); }
  function vigenere(text, key, dir) {
    var j = 0;
    return text.split("").map(function (c) {
      if (LETTERS.indexOf(c) < 0) return c;
      var k = LETTERS.indexOf(key[j % key.length]); j++;
      return shiftChar(c, dir * k);
    }).join("");
  }
  function hhmm(m) { var h = Math.floor(m / 60), mm = m % 60; return (h < 10 ? "0" : "") + h + ":" + (mm < 10 ? "0" : "") + mm; }

  // ---- content pools (in-universe: Halcyon voyage 275 + galaxy-common knowledge) ----
  var AUREBESH = ["AUREK","BESH","CRESH","DORN","ESK","FORN","GREK","HERF","ISK","JENTH","KRILL","LETH","MERN","NERN","OSK","PETH","QEK","RESH","SENTH","TRILL","USK","VEV","WESK","XESH","YIRT","ZEREK"];
  var ITINERARY = ["CHANDRILA", "CORUSCANT", "BESPIN", "BATUU"];
  var OFF_ROUTE = ["KESSEL", "JAKKU", "MUSTAFAR", "TATOOINE", "DATHOMIR", "ORD MANTELL", "NAR SHADDAA", "SAVAREEN", "CORELLIA"];
  var CARGO = ["JOGAN FRUIT", "BLUE MILK", "BACTA PATCHES", "TIBANNA GAS", "BESKAR INGOTS", "KYBER SHARDS", "COAXIUM CELLS", "SABACC CHIPS", "PORG FEED", "RATION BARS", "DROID PARTS", "POWER CELLS", "HOLOTAPES", "SPICE"];
  var AUTH = ["VANGUARD", "SENTINEL", "IRONCLAD", "OBSIDIAN", "BLACKOUT", "FINALIZER", "SUPREMACY", "ECHELON", "CRIMSON", "NIGHTFALL", "STORMWALL", "LONGBOW"];
  var ORDERS = ["SEARCH THE CARGO HOLD FOR STOWAWAYS", "DETAIN ANY CREW WITHOUT PAPERS", "WATCH THE SINGER AND HER MANAGER", "LOG EVERY ATRIUM CONSOLE ACCESS", "SEIZE THE CAPTAINS ROUTE DATA", "FIND THE NEW MECHANIC AND HOLD THEM"];
  var CREW = [
    { id: "KEEVAN", name: "CAPT. RIYOLA KEEVAN", duty: "BRIDGE", role: "Bridge watch" },
    { id: "LENKA",  name: "LENKA MOK",           duty: "ATRIUM", role: "Evening reception" },
    { id: "SAMMIE", name: "SAMMIE",              duty: "ENGINEERING", role: "Engine maintenance" },
    { id: "CROY",   name: "LT. HARMAN CROY",     duty: "DOCKING BAY", role: "Shuttle inspection" },
    { id: "GAYA",   name: "GAYA",                duty: "CROWN OF CORELLIA", role: "Dinner concert" },
    { id: "RAITHE", name: "RAITHE KOLE",         duty: "SUBLIGHT LOUNGE", role: "Private meeting" }
  ];
  var DOORS = ["BRIDGE", "ATRIUM", "ENGINEERING", "DOCKING BAY", "CROWN OF CORELLIA", "SUBLIGHT LOUNGE", "CARGO HOLD", "BRIG", "CLIMATE SIMULATOR"];

  // ---- per-card puzzle generation ------------------------------------------
  function gen(serial) {
    var P = { serial: serial };

    // 1 · READ THE MANIFEST — five crates, one bound off the Halcyon's route
    var r1 = rng(serial + "|manifest");
    var off = pick(r1, OFF_ROUTE);
    var dests = shuffle(r1, ITINERARY.concat([off]));
    var cargo = shuffle(r1, CARGO).slice(0, 5);
    var ids = shuffle(r1, [11,12,14,17,19,21,23,26,28,31,33,35,38,42,44,47,51,53,56,58,62,64,67,69,72,75,77,81,84,88]).slice(0, 5).sort(function (a, b) { return a - b; });
    var crates = dests.map(function (d, i) { return { id: "C-" + ids[i], dest: d, cargo: cargo[i] }; });
    var hot = crates.filter(function (c) { return c.dest === off; })[0];
    P.manifest = { crates: crates, offRoute: off, crate: hot.id, answer: hot.cargo };

    // 2 · DRIFT — Caesar shift, unknown setting, known header
    var r2 = rng(serial + "|drift");
    var s = ri(r2, 3, 22); if (s === 13) s = 14;
    var word = pick(r2, AUTH);
    var plain = "FIRST ORDER PRIORITY / LT CROY TO ALL PATROLS / " + pick(r2, ORDERS) + " / AUTH " + word;
    P.drift = { shift: s, plain: plain, cipher: caesar(plain, s), answer: word };

    // 3 · THE FORGED LOG — duty board vs. door log; exactly one impossible entry
    var r3 = rng(serial + "|log");
    var board = CREW.map(function (c) {
      var start = 19 * 60 + 5 * ri(r3, 0, 16);
      var len = 60 + 5 * ri(r3, 0, 6);
      return { id: c.id, name: c.name, duty: c.duty, role: c.role, start: start, end: start + len };
    });
    var forger = pick(r3, board);
    var used = {};
    function uniqT(t) { while (used[t]) t++; used[t] = 1; return t; }
    var entries = [];
    board.forEach(function (b) { // arrivals at their own duty post, near shift start
      entries.push({ t: uniqT(b.start + ri(r3, -8, 8)), door: b.duty, who: b.id });
    });
    shuffle(r3, board.filter(function (b) { return b !== forger; })).slice(0, 3).forEach(function (b) { // off-duty decoys
      var before = r3() < 0.5;
      var t = before ? b.start - ri(r3, 10, 35) : b.end + ri(r3, 10, 35);
      var door = pick(r3, DOORS.filter(function (d) { return d !== b.duty; }));
      entries.push({ t: uniqT(t), door: door, who: b.id });
    });
    var ft = uniqT(ri(r3, forger.start + 18, forger.end - 18));
    var fdoor = pick(r3, DOORS.filter(function (d) { return d !== forger.duty; }));
    entries.push({ t: ft, door: fdoor, who: forger.id, forged: true });
    entries.sort(function (a, b) { return a.t - b.t; });
    entries.forEach(function (e, i) { e.n = i; });
    var forgedIdx = entries.filter(function (e) { return e.forged; })[0].n;
    entries.forEach(function (e) { delete e.forged; });
    P.log = { board: board, entries: entries, forged: forgedIdx, answer: forger.id, window: [ft - 20, ft + 20] };

    // 4 · KEYED LOCK — Vigenère keyed by the cloned credential's name
    var r4 = rng(serial + "|keyed");
    var glyphs = shuffle(r4, LETTERS.split("")).slice(0, 6); // lock glyph set; glyphs[0] goes first
    var first = glyphs[0];
    var kplain = AUREBESH[LETTERS.indexOf(first)] + " GOES FIRST";
    P.keyed = { key: forger.id, plain: kplain, cipher: vigenere(kplain, forger.id, +1), answer: letters(kplain) };

    // 5 · LOCKBREAKER — Mastermind, slot 1 known from Keyed Lock
    P.lock = { set: shuffle(r4, glyphs), first: first };
    P.code = recruitCode(serial);
    return P;
  }
  /** Lock combination for a given trace round (reshuffles slots 2–4 after every trace). */
  function lockCombo(P, round) {
    var r = rng(P.serial + "|lock|" + round);
    var others = shuffle(r, P.lock.set.filter(function (g) { return g !== P.lock.first; }));
    return [P.lock.first].concat(others.slice(0, 3));
  }
  function scoreGuess(combo, guess) {
    var locked = 0, loose = 0;
    for (var i = 0; i < 4; i++) {
      if (guess[i] === combo[i]) locked++;
      else if (combo.indexOf(guess[i]) >= 0) loose++;
    }
    return { locked: locked, loose: loose };
  }
  /** Rule check used by tests: an entry is impossible if it falls inside its owner's duty window at a different door. */
  function isImpossible(P, e) {
    var b = P.log.board.filter(function (x) { return x.id === e.who; })[0];
    return e.t >= b.start && e.t <= b.end && e.door !== b.duty;
  }

  var api = {
    ALPH: ALPH, LETTERS: LETTERS, AUREBESH: AUREBESH, ITINERARY: ITINERARY, CREW: CREW,
    cyrb53: cyrb53, pinHash: pinHash, checkPin: checkPin,
    makeSerial: makeSerial, normSerial: normSerial, recruitCode: recruitCode, normCode: normCode, verify: verify,
    gen: gen, lockCombo: lockCombo, scoreGuess: scoreGuess, isImpossible: isImpossible,
    letters: letters, shiftChar: shiftChar, caesar: caesar, vigenere: vigenere, hhmm: hhmm
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.VOX = api;
})(this);
