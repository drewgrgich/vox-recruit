#!/usr/bin/env python3
"""
Vox recruit cards: print-ready PDF + staff master list.

    pip install reportlab svglib
    python3 tools/make_cards.py --base https://USERNAME.github.io/vox-recruit/ --count 120

Writes (into ./print by default):
    recruit-cards-fronts.pdf   10-up business cards (3.5 x 2 in) on US Letter, Avery 8371/5371 layout,
                               with crop marks. Each card has its own serial + QR code.
    recruit-cards-back.pdf     One sheet of identical backs (print on the reverse if you want backs).
    recruit-master-list.csv    No., serial, recruit code, URL. STAFF ONLY — it contains every answer code.

Serials are stable for a given --batch and --count, so you can regenerate after changing the URL
without invalidating cards you've already printed.
"""
import argparse, csv, json, os, subprocess, sys
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import black, white, HexColor
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
from svglib.svglib import svg2rlg

HERE = os.path.dirname(os.path.abspath(__file__))
PLACEHOLDER = "YOUR-GITHUB-USERNAME"
CARD_W, CARD_H = 3.5 * inch, 2 * inch
COLS, ROWS = 2, 5
MARGIN_X, MARGIN_Y = 0.75 * inch, 0.5 * inch   # Avery 8371 / 5371
INK = black
GREY = HexColor("#666666")

pdfmetrics.registerFont(TTFont("Aurebesh", os.path.join(HERE, "assets", "Aurebesh.ttf")))


def load_serials(count, batch, base):
    out = subprocess.check_output(["node", os.path.join(HERE, "serials.js"),
                                   "--count", str(count), "--batch", batch, "--base", base])
    return json.loads(out)


def badge(size):
    d = svg2rlg(os.path.join(HERE, "assets", "slicer-badge.svg"))
    s = size / max(d.width, d.height)
    d.width, d.height = d.width * s, d.height * s
    d.scale(s, s)
    return d


def qr(url, size):
    w = QrCodeWidget(url, barLevel="M")
    x1, y1, x2, y2 = w.getBounds()
    d = Drawing(size, size, transform=[size / (x2 - x1), 0, 0, size / (y2 - y1), 0, 0])
    d.add(w)
    return d


def spaced(c, x, y, text, font, size, tracking, color=INK):
    c.setFillColor(color)
    t = c.beginText(x, y)
    t.setFont(font, size)
    t.setCharSpace(tracking)
    t.textLine(text)
    c.drawText(t)


def crop_marks(c):
    c.setStrokeColor(GREY)
    c.setLineWidth(0.4)
    L = 0.22 * inch
    xs = [MARGIN_X + i * CARD_W for i in range(COLS + 1)]
    ys = [MARGIN_Y + j * CARD_H for j in range(ROWS + 1)]
    W, H = letter
    for x in xs:
        c.line(x, MARGIN_Y - L - 2, x, MARGIN_Y - 2)
        c.line(x, H - MARGIN_Y + 2, x, H - MARGIN_Y + L + 2)
    for y in ys:
        c.line(MARGIN_X - L - 2, y, MARGIN_X - 2, y)
        c.line(W - MARGIN_X + 2, y, W - MARGIN_X + L + 2, y)


def front(c, x, y, card):
    # QR block (left)
    qs = 1.32 * inch
    qx, qy = x + 0.12 * inch, y + (CARD_H - qs) / 2 + 0.07 * inch
    renderPDF.draw(qr(card["url"], qs), c, qx, qy)
    spaced(c, qx + 0.08 * inch, y + 0.13 * inch, "SCAN TO BEGIN", "Helvetica-Bold", 5.6, 1.1, GREY)
    # divider
    rx = x + 1.56 * inch
    c.setStrokeColor(INK); c.setLineWidth(0.6)
    c.line(rx, y + 0.18 * inch, rx, y + CARD_H - 0.18 * inch)
    # right column
    cx = rx + 0.13 * inch
    top = y + CARD_H - 0.17 * inch
    renderPDF.draw(badge(0.36 * inch), c, cx, top - 0.36 * inch)
    spaced(c, cx + 0.43 * inch, top - 0.13 * inch, "VOX BINARY", "Helvetica-Bold", 8.2, 1.4)
    spaced(c, cx + 0.43 * inch, top - 0.27 * inch, "DATAWORX", "Helvetica-Bold", 8.2, 1.4)
    spaced(c, cx, top - 0.56 * inch, "VOX BINARY DATAWORX", "Aurebesh", 6.4, 0.6)
    spaced(c, cx, top - 0.84 * inch, "NOW HIRING", "Helvetica-Bold", 14.5, 0.8)
    spaced(c, cx, top - 0.99 * inch, "SLICERS · INTERNS · UNPAID", "Helvetica", 5.6, 0.9, GREY)
    # serial
    spaced(c, cx, y + 0.47 * inch, "RECRUIT CARD  No. %03d" % card["n"], "Helvetica-Bold", 5.4, 1.0, GREY)
    spaced(c, cx, y + 0.30 * inch, card["serial"], "Courier-Bold", 11.5, 0.5)
    spaced(c, cx, y + 0.15 * inch, "Keep this card. Your code only works with it.", "Helvetica-Oblique", 4.9, 0.1, GREY)


def back(c, x, y):
    b = 0.78 * inch
    renderPDF.draw(badge(b), c, x + (CARD_W - b) / 2, y + 0.66 * inch)
    msg = "WE ARE ALWAYS LISTENING"
    c.setFont("Aurebesh", 8.5)
    w = c.stringWidth(msg, "Aurebesh", 8.5) + 0.9 * (len(msg) - 1)
    spaced(c, x + (CARD_W - w) / 2, y + 0.42 * inch, msg, "Aurebesh", 8.5, 0.9)
    msg2 = "VOX BINARY DATAWORX · UNIVERSAL F3"
    w2 = c.stringWidth(msg2, "Helvetica-Bold", 6) + 1.2 * (len(msg2) - 1)
    spaced(c, x + (CARD_W - w2) / 2, y + 0.22 * inch, msg2, "Helvetica-Bold", 6, 1.2, GREY)


def draft_banner(c):
    c.setFillColor(HexColor("#d40000"))
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(letter[0] / 2, letter[1] - 0.22 * inch,
                        "DRAFT: QR codes point to a placeholder URL. Re-run make_cards.py with --base before printing.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="https://%s.github.io/vox-recruit/" % PLACEHOLDER)
    ap.add_argument("--count", type=int, default=120)
    ap.add_argument("--batch", default="HC3")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(HERE), "print"))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    cards = load_serials(a.count, a.batch, a.base)
    draft = PLACEHOLDER in a.base

    per = COLS * ROWS
    c = canvas.Canvas(os.path.join(a.out, "recruit-cards-fronts.pdf"), pagesize=letter)
    c.setTitle("Vox recruit cards (fronts)")
    for p in range(0, len(cards), per):
        crop_marks(c)
        if draft: draft_banner(c)
        for i, card in enumerate(cards[p:p + per]):
            col, row = i % COLS, i // COLS
            front(c, MARGIN_X + col * CARD_W, letter[1] - MARGIN_Y - (row + 1) * CARD_H, card)
        c.showPage()
    c.save()

    c = canvas.Canvas(os.path.join(a.out, "recruit-cards-back.pdf"), pagesize=letter)
    c.setTitle("Vox recruit cards (back)")
    crop_marks(c)
    for i in range(per):
        col, row = i % COLS, i // COLS
        back(c, MARGIN_X + col * CARD_W, letter[1] - MARGIN_Y - (row + 1) * CARD_H)
    c.showPage(); c.save()

    with open(os.path.join(a.out, "recruit-master-list.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["No.", "Serial", "Recruit code", "URL", "Redeemed"])
        for card in cards:
            w.writerow(["%03d" % card["n"], card["serial"], card["code"], card["url"], ""])
    print("%d cards -> %s%s" % (len(cards), a.out, "  (DRAFT: placeholder URL)" if draft else ""))


if __name__ == "__main__":
    main()
