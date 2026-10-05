# Vox Binary Dataworx · Recruitment Channel

A mobile web challenge for Halcy-Con 3 Slicer recruits. Zorin, An'tho, Tayla and I'an hand out numbered **recruit cards** in-world. A recruit scans the card's QR code and works through five challenges built from Halcyon voyage-275 data, which takes most people 30–60 minutes. At the end they get a **recruit code** tied to that card. Staff check the code against the card at Vox Binary Dataworx HQ (Universal F3) and hand over the swag.

## How the anti-copying works

Every card's serial (e.g. `VBD-34BD-8`) works as a seed. Everything below changes from card to card:

| Test | Host | What it is | What changes per card |
|---|---|---|---|
| 1 · Read the Manifest | Tayla | Read an Aurebesh cargo manifest and find the crate bound off the Halcyon's route (Chandrila, Coruscant, Bespin, Batuu) | Destinations, which crate is off-route, its contents |
| 2 · Drift | I'an | A Caesar shift on Lt. Croy's patrol traffic, cracked with the known header FIRST ORDER | Shift amount, the patrol order, the auth word |
| 3 · The Forged Log | An'tho | Compare a duty board with a door log and flag the cloned credential (a wrong flag starts a growing lockout) | Duty times, the decoy entries, whose credential was cloned |
| 4 · Keyed Lock | Zorin | A Vigenère cipher keyed with the name found in test 3 | The key (from test 3) and the message, which names the lock's first glyph |
| 5 · Lockbreaker | All four | Mastermind with four Aurebesh glyphs. After 8 misses a trace starts a 45-second lockout and slots 2–4 reshuffle | The glyph set and the combination |

Friends can teach each other the *method*, but the answers don't carry over between cards. The final code is a hash of the serial, so a copied code fails on any other card, and **the physical card is the proof of ownership.**

**Honest limit:** this is a static site, so the logic is in the page's JavaScript. Someone determined who reads `core.js` could work out codes. For a convention swag giveaway that's an acceptable risk. A rare cheater would need to read code *and* have someone else's physical card.

## Files

```
index.html     the recruit app (Aurebesh font embedded; loads core.js)
staff.html     staff code checker (not linked from the app: bookmark it on cast phones)
core.js        ALL shared logic: serials, codes, per-card puzzle generation, staff PIN
sw.js          offline fallback if convention wifi drops (network-first)
tools/serials.js       serial list + codes (stable per batch name)
tools/make_cards.py    print-ready card PDF + staff master list CSV
tools/assets/          Aurebesh.ttf (OFL) + Slicer badge SVG for the cards
print/         GENERATED, STAFF ONLY. Never commit this (it holds every code). See .gitignore
```

## Publish on GitHub Pages

1. Create a repo (e.g. `vox-recruit`). Copy everything here **except `print/`** into it and push.
2. In the repo, go to Settings → Pages → Deploy from branch → `main` / root.
3. Your URL will be `https://YOUR-USERNAME.github.io/vox-recruit/`.
4. Regenerate the cards with the real URL:
   ```
   pip install reportlab svglib
   python3 tools/make_cards.py --base https://YOUR-USERNAME.github.io/vox-recruit/ --count 120
   ```
   The red DRAFT banner disappears once `--base` is set. Serials stay the same, so the master list doesn't change.
5. Open one card's QR on your own phone and play it through before printing the full run.

## Printing

`print/recruit-cards-fronts.pdf` lays out 10 cards per letter sheet at 3.5 × 2 in. It matches the Avery 8371/5371 business-card layout, or you can trim along the crop marks. `recruit-cards-back.pdf` is an optional generic back: print it on the reverse, or skip it. Print at **100% / Actual size**.

## Staff: redeeming a code

1. Open `staff.html` (e.g. `https://YOUR-USERNAME.github.io/vox-recruit/staff.html`).
2. Type the serial **from the physical card**, then the code from the recruit's phone, and tap CHECK.
3. **VALID**: hand over the swag, then punch, sign or keep the card. That's what stops a second redemption. The phone also remembers what it marked, but only on that one phone.
4. The master list CSV is a backup if phones fail. Find the serial and compare the code.

**Stuck or glitched recruit:**
- In the app, press and hold the serial chip (top-right) for 2 seconds, then enter the PIN. That skips the current test.
- On `staff.html`, the "look up code" button shows a card's code after you enter the PIN.
- The PIN is **7720**. To change it, run `node -e "console.log(require('./core.js').pinHash('NEWPIN'))"` and paste the number into `STAFF_PIN_HASH` in `core.js`.

## Testing

Any valid serial works, for example `index.html#VBD-34BD-8`. Progress saves in the browser per card. To start a card over, clear the site's data or use a private window. Run locally with `python3 -m http.server` in this folder.

## Canon guardrails used in the copy

The copy uses only in-universe public knowledge: the Halcyon's voyage 275 (Keevan, Lenka Mok, Sammie, Lt. Croy, Gaya, Raithe Kole) and galaxy-common events through Episode VIII. It never mentions the Client, the Aurora mission plot or the Vox family's Hosnian Prime grief, per the cast packet.

Aurebesh font: "Aurebesh" by SilvinoR, SIL Open Font License 1.1.
