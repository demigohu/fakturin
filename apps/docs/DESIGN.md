---
name: Overflow Grid
source: https://overflow.sui.io/ (Sui Overflow 2026, extracted 2026-10-09 via playwright-cli)
adapted_for: Fakturin web (apps/web)
colors:
  # Foundation
  surface: "#f7f7f7" # --color--light, page background
  surface-warm: "#f2eee4" # --color--orange-200, alt section / card media well
  surface-muted: "#dfdfdf" # --color--gray-200, grid cells, skeletons
  ink: "#000f1d" # --color--blue-900, text + dark sections + primary button
  ink-raised: "#31404e" # --color--gray-800, hairlines on dark, raised dark surfaces
  # Text hierarchy
  on-surface: "#000f1d"
  on-surface-muted: "#61686d" # --color--gray-700
  on-surface-subtle: "#7c838a" # subtitle grey ("Applies to:", "These can be won...")
  on-ink: "#f7f7f7"
  outline: "#000f1d" # 2px structural borders on light
  outline-soft: "#bbbec0" # --color--gray-400, 1px grid lines on light
  # Accent (primary interactive)
  primary: "#4da2ff" # --color--blue-700, Sui blue: CTA icon block, active nav, grid paper
  primary-bright: "#00bfff" # --color--blue-500 (deepskyblue), mono <tag> code accents
  # Track / category palette (flat fills, used one per tile)
  cat-yellow: "#ffd731" # --color--yellow-900
  cat-orange: "#ff7a00" # --color--orange-700
  cat-green: "#55db9c" # --color--green-200
  cat-purple: "#5c4ade" # --color--purple-700
  cat-lilac: "#e9ccff" # --color--pink-400
  cat-cyan: "#6de6f8" # --color--blue-400
  # Highlighter accents (labels only, never surfaces)
  hl-lime: "#beff4d" # --color--green-300
  hl-yellow: "#fffc4d" # --color--yellow-700
  hl-peach: "#f79f4d" # --color--orange-400
  hl-pink: "#ff6ada" # --color--pink-700
  hl-mint: "#4df766" # --color--green-400
  hl-olive: "#3e512f" # --color--green-700, "#" glyph block
  hl-lavender: "#dbcdeb" # --color--pink-200, label grid background
typography:
  display-xl:
    fontFamily: TWK Everett
    fontSize: 140px # 9.72vw at 1440
    fontWeight: "500"
    lineHeight: "0.85"
    letterSpacing: -0.05em
  display-lg:
    fontFamily: TWK Everett
    fontSize: 120px
    fontWeight: "500"
    lineHeight: "0.85"
    letterSpacing: -0.05em
  headline:
    fontFamily: TWK Everett
    fontSize: 64px
    fontWeight: "500"
    lineHeight: "1"
    letterSpacing: -0.05em
  title-lg:
    fontFamily: TWK Everett
    fontSize: 34px
    fontWeight: "500"
    lineHeight: "1"
    letterSpacing: -0.05em
  title:
    fontFamily: TWK Everett
    fontSize: 24px
    fontWeight: "500"
    lineHeight: "1.2"
    letterSpacing: -0.02em
  body-lg:
    fontFamily: TWK Everett
    fontSize: 18px
    fontWeight: "500"
    lineHeight: "1.2"
    letterSpacing: -0.02em
  body:
    fontFamily: TWK Everett
    fontSize: 16px
    fontWeight: "400"
    lineHeight: "1.25"
    letterSpacing: -0.01em
  caption:
    fontFamily: TWK Everett
    fontSize: 12px
    fontWeight: "500"
    lineHeight: "1"
    letterSpacing: "0"
  mono-label:
    fontFamily: TWK Everett Mono
    fontSize: 12px
    fontWeight: "400"
    lineHeight: "1"
    letterSpacing: 0.04em
spacing:
  unit: 16px # fluid: 1em = container / 90 (1440 / 16)
  gap-xxs: 0.5em
  gap-xs: 0.75em
  gap-s: 0.875em
  gap-m: 1em
  gap-ml: 1.25em
  gap-l: 1.5em
  gap-xl: 2em
  gap-xxl: 3em
  page-padding: 1.25em
  nav-height: 4.75em
  title-spacer: 7.75em
  grid-cell-small: 0.875em
  grid-cell-large: 1.6875em
radius:
  default: 0px # everything structural is square
  exception-fab: 50% # only the floating cookie/utility button
motion:
  easing: cubic-bezier(0.525, 0, 0, 1) # GSAP CustomEase "sui-sine", global default
  duration: 0.525s # GSAP global default
  wiggle-ease: cubic-bezier(0.33, 0, 0.67, 1)
  stack:
    [
      gsap 3 + ScrollTrigger,
      SplitText,
      ScrambleText,
      Flip,
      CustomEase,
      Lenis smooth scroll,
    ]
---

# Design System: Overflow Grid (Sui Overflow 2026, adapted for Fakturin)

Captured from https://overflow.sui.io/ with `playwright-cli` at 1440x900 and 390x844 (computed styles, `:root` custom properties, 10 scroll screenshots). Values in the frontmatter are measured, not guessed. Section 7 is the motion system, section 8 maps it onto Fakturin.

## 1. Visual Theme & Atmosphere

A developer-hackathon poster turned into a website. The page reads like engineering graph paper that someone has covered in toy-like 3D keycaps: a cool off-white sheet (`#f7f7f7`), a deep navy-black ink (`#000f1d`) for type and full-bleed dark sections, and a bright Sui blue (`#4da2ff`) drawn as a 1px square grid behind the hero illustration. Everything structural is square, hard-edged and bordered. Softness comes only from the illustrations (glossy isometric keys, coins, gems, a walrus) and from flat, saturated category tiles.

The mood is confident and playful but disciplined: huge, tightly tracked grotesque display type, big blocks of flat color, generous vertical air between sections, and small monospace "code" ornaments (`<date>`, `#`, `{ }`) that wink at the developer audience. Density is low (VISUAL_DENSITY ~3), layout variance moderate-high (~7, staggered cards, offset grids), motion moderate (~6, text-reveal skeletons, nav state changes, eased on a single curve).

**Key characteristics**

- Square corners everywhere (radius 0). Borders do the work shadows usually do. No drop shadows.
- Graph-paper grid as a recurring motif: hero background, card header "rails", label backgrounds.
- Light theme is the base; full-bleed `ink` bands are used as deliberate chapter breaks (Why join, Timeline, footer band), not random inversions.
- One fluid type/space unit: `font-size = clamp(992px, 100vw, 2560px) / 90`, so the whole layout scales proportionally with the viewport.

## 2. Color Palette & Roles

### Primary Foundation

- **Paper Off-White** `#f7f7f7` (`surface`): page background, card bodies, nav cells.
- **Oat Paper** `#f2eee4` (`surface-warm`): alternate section background (Tracks), the media well inside prize/award cards, FAQ toggle cell.
- **Fog Grey** `#dfdfdf` (`surface-muted`): grid cells inside card rails, loading skeleton bars.
- **Navy Ink** `#000f1d` (`ink`): dark chapter sections, top-right date badge, primary button body.
- **Slate Raised** `#31404e` (`ink-raised`): 1px hairlines and raised blocks on ink backgrounds.

### Accent & Interactive

- **Sui Blue** `#4da2ff` (`primary`): the single interactive accent. Arrow block on every CTA, active "Overview" nav cell, hero graph-paper lines, inline highlighted sentence in intro copy.
- **Signal Sky** `#00bfff` (`primary-bright`): monospace code ornaments only (`<date>` / `</date>`). Never a fill for text-heavy areas.

### Category Palette (one flat fill per tile, never mixed inside one tile)

Yellow `#ffd731`, Orange `#ff7a00`, Mint `#55db9c`, Violet `#5c4ade`, Lilac `#e9ccff`, Cyan `#6de6f8`. Used for: track card media panels, numbered benefit chips (`01`..`05`), and the active state of each bottom-nav cell (Why join = yellow, Tracks = orange, Prizes = lilac). Footer band uses Lilac.

### Highlighter Accents (labels only)

Lime `#beff4d`, Lemon `#fffc4d`, Peach `#f79f4d`, Hot Pink `#ff6ada`, Neon Green `#4df766`, Olive `#3e512f`, Lavender grid `#dbcdeb`. These build the "`# 1st place }`" ribbon: olive `#` block, a highlighter-colored label, peach `}` cap, sitting on a lavender graph-paper strip.

### Typography & Text Hierarchy

- Primary text: `ink` `#000f1d` on light; `#f7f7f7` on ink.
- Secondary: `#61686d` (meta, small print).
- Subtitle grey: `#7c838a` (section sub-headlines like "These can be won alongside other prizes.").
- Structural outline: 2px `#000f1d` on light surfaces; 1px `#bbbec0` for grid lines; 1px `#31404e` on ink.

### Functional States (not present on source; derive for Fakturin)

The source has no form or status UI. Derive from the category palette so nothing new enters the system: success = Mint `#55db9c` (text on it: ink), warning = Yellow `#ffd731`, danger = Orange `#ff7a00` with ink text, info = Sui Blue. Never use red gradients or glows.

## 3. Typography Rules

### Families

- **TWK Everett** (400, 500): a neutral-but-characterful neo-grotesk with tight apertures; carries everything from 140px display to 12px captions.
- **TWK Everett Mono** (400): only for code ornaments, chip numbers (`01`), and small tag labels ("Core Track", "Specialized Track").
- Both are commercial (Weltkern). **For Fakturin use Geist (500/400) + Geist Mono**, already loaded in `app/layout.tsx`. Geist's metrics are close; keep the tight negative tracking to recover the Everett feel.

### Hierarchy & Weights (desktop 1440)

| Role       | Size  | Weight | Line-height | Tracking | Example                                          |
| ---------- | ----- | ------ | ----------- | -------- | ------------------------------------------------ |
| display-xl | 140px | 500    | 0.85        | -0.05em  | Hero "Sui Overflow 2026" (3 lines, left aligned) |
| display-lg | 120px | 500    | 0.85        | -0.05em  | "Why join Sui Overflow 2026?" (centered, on ink) |
| headline   | 64px  | 500    | 1.0         | -0.05em  | "Tracks", "Timeline", "FAQ"                      |
| title-lg   | 34px  | 500    | 1.0         | -0.05em  | Prize amounts "$30,000 USD"                      |
| title      | 24px  | 500    | 1.2         | -0.02em  | Sub-section titles "Prizes per core track"       |
| body-lg    | 18px  | 500    | 1.2         | -0.02em  | Intro paragraphs, timeline items                 |
| body       | 16px  | 400    | 1.25        | -0.01em  | Nav labels, buttons, list text                   |
| caption    | 12px  | 500    | 1.0         | 0        | "3rd place prize sponsor:"                       |
| mono-label | 12px  | 400    | 1.0         | +0.04em  | `<date>`, `01`, "Core Track"                     |

Only two weights exist (400, 500). Hierarchy comes from scale and tracking, never from bold 700+.

### Spacing Principles

- Display type is set extremely tight (line-height 0.85, tracking -5%); descenders overlap the next line's cap height on purpose.
- Body copy is tight too (1.2), short measure (~45ch), left aligned.
- Section headline sits ~`7.75em` below the previous section; title-to-subtitle gap is ~0.

## 4. Component Stylings

### Buttons (signature "split CTA")

- Two square cells fused: **label cell** in `ink` with `#f7f7f7` body text (16-18px, 500), padding ~`0.875em 1em`; **icon cell** square in Sui Blue with a dotted diagonal arrow glyph in ink.
- Outer 2px `ink` border, radius 0. Height ~64px desktop.
- Hover: icon cell arrow nudges up-right, label cell can swap to Sui Blue; transition `0.525s cubic-bezier(0.525, 0, 0, 1)`.
- Secondary/ghost variant: transparent label cell, 2px ink border, same blue icon cell.

### Cards & Containers

- **Rail card** (Tracks / benefits): a graph-paper rail (small `#dfdfdf` cells, 1px `#bbbec0` lines) framing a white title bar; left square holds a category-colored icon block; below, a full-bleed category-colored media panel with one illustration; then a white body. Mono tag ("Core Track") sits above the card's top-left corner as a 1px-bordered chip.
- **Prize grid**: N columns joined edge-to-edge by 2px `ink` borders (shared borders, no gaps). Top half `surface-warm` media well with illustration + ribbon label; bottom half white with value.
- No shadows, no radius, no hover lift. Hierarchy is borders + color blocks.

### Navigation

- **Top bar**: 75px (`4.75em`) tall, split: left cell (page title, 16px) spanning ~74%, right cell (date badge with `<date>` mono tags) in the inverse color. Starts at `translateY(-101%)` and slides in when the loader finishes.
- **Theme follows the section under it**: every section carries `data-theme-section="light|dark"`; when a dark section sits under the bar, left cell becomes ink with off-white text and slate `#31404e` borders, right cell flips to off-white.
- **Scroll direction**: the bar hides while scrolling down and returns on scroll up (after 50px).
- **Bottom sticky tab bar** (desktop): 7 equal square cells, 2px ink borders, 16px labels. Active cell fills with that section's category color (Overview blue, Why join yellow, Tracks orange, Prizes lilac, Sponsors mint). Rightmost cell is the split CTA. Slides out (`translateY(101%)`) when the footer enters.
- **Links**: hover underline is a 2px bar scaling in from the right (`scaleX 0 -> 1`, origin right, 0.4s sui-sine).
- **Mobile**: date badge moves to a thin top strip; title bar + square Sui-Blue menu button with a 3x3 dot grid. When open, the corner dots slide inward (`translate(+-300%)`) and the grid rotates 90deg to form an X; button turns ink.

### Inputs & Forms

None on source. For Fakturin: square inputs, 2px `ink` border, `#f7f7f7` fill, 16px body text, label above in 14px/500, focus = border switches to Sui Blue plus a 2px Sui Blue outline offset 2px. Error text below in ink on an Orange chip.

### Domain-Specific Components

- **Ribbon label** `# 1st place }`: olive `#` cell + highlighter label + peach `}` cap on a lavender grid strip, 16px text.
- **Numbered benefit chip**: 24px square in a category color with mono `01`, attached to the top-left of a rail card.
- **FAQ accordion**: full-width rows with 2px ink borders, question in 24px, right square toggle cell (`surface-warm`) with a dotted-plus glyph.
- **Ghost loader** (text reveal): every line of body/heading text is covered by a block (`#dfdfdf` on light, `#31404e` on dark, 103% x 110%, radius 4px). On enter it pulses to `#bbbec0` / `#5a6d7f` (0.4s yoyo), then fades out (0.4s). Delay grows with the line's page offset.
- **Loader**: full-viewport blue graph paper (`5em` cells). Centered ink window (45em x 35em) with a slate title bar holding the `<date>` tag and a square blue close cell (dotted X). Inside: a rail card (violet arrow block + white bar with mono uppercase status text and a percentage counting 0 to 100% over 2s) and a row of blue blocks filling left to right. Exit: blocks fade, bar collapses, card scales to 0, the window grows to 100vw x 100vh (1.25s) while the page underneath opens from `clip-path: inset(50vh 50vw)` to `inset(0)` (1.2s). Clicking close scrambles the tags to `<come-on>` and the text to a joke, then back.
- **Hero keycaps**: each illustration piece is its own image. Hover squashes the key (base `scaleY .85`, top shifts `x 4% y 12%`, 0.335s); click wiggles the hand. Floating pieces wiggle randomly (+-5px, 1.2 to 2s, repeat) while in view.
- **Sponsor grid**: ink section, 2 large + 3 small cells with 1px slate borders and mono `Name [arrow]` labels. A single colored block Flips into whichever cell is hovered (0.425s power3), picking a random color from blue / yellow / lilac / mint.
- **Interactive grid canvas**: full-bleed graph paper drawn on canvas (28 columns desktop, 7 mobile, lines `rgba(77,162,255,.35)` 2px). Hovering lights a cell in mint / sky / violet, fading out over 2s.
- **FAQ**: one open at a time; answer height tweens to auto, close 0.65s.
- **Footer band**: lilac, giant one-line headline, then a full-width split CTA bar.

## 5. Layout Principles

### Grid & Structure

- Fluid root: `font-size: calc(clamp(992px, 100vw, 2560px) / 90)`; all spacing in `em`. Below 992px the unit stops shrinking and the mobile layout takes over.
- Content column ~1164px at 1440 (~138px side margins); hero and full-bleed bands go edge to edge with `page-padding` 1.25em.
- Hero: asymmetric split, text left (~50%), illustration bleeding off the right edge on the graph-paper grid.
- Track cards: 2-column staggered (right column offset down ~165px). Benefits: 3 loose columns at different vertical offsets.

### Whitespace Strategy

- Base unit 16px; gaps 8 / 12 / 14 / 16 / 20 / 24 / 32 / 48.
- Big section rhythm (~124px title spacer, ~200px between chapters). Inside components spacing is tight.

### Alignment & Visual Balance

- Left aligned by default; centered only for manifesto moments on ink bands ("Why join...", "Two years of Sui's flagship hackathon").
- Illustration weight balances giant type: text-heavy left, image-heavy right.

### Responsive Behavior & Touch

- Mobile (390): single column, display drops to ~80px, illustration moves under the CTA, bottom tab bar replaced by the menu button, nav cells 56-60px (good touch targets).

## 6. Design System Notes for Generation

### Language to Use

"Engineering graph paper", "square, bordered, no shadows", "navy ink on off-white", "flat saturated category blocks", "split CTA with Sui-blue arrow cell", "huge tightly tracked grotesque", "monospace code ornaments".

### Color References

Paper Off-White `#f7f7f7`, Navy Ink `#000f1d`, Sui Blue `#4da2ff`, Oat Paper `#f2eee4`, Fog Grey `#dfdfdf`, category Yellow `#ffd731` / Orange `#ff7a00` / Mint `#55db9c` / Violet `#5c4ade` / Lilac `#e9ccff`.

### Component Prompts

- "A split CTA button: left cell navy `#000f1d` with off-white label, right square cell Sui blue `#4da2ff` with a dotted diagonal arrow, 2px navy border, square corners."
- "A card framed by a light-grey graph-paper rail, white title bar with a small square category-colored icon block at left, full-bleed yellow `#ffd731` media panel with one isometric illustration, mono chip 'Core Track' above the top-left corner."
- "A 4-up prize grid sharing 2px navy borders, oat `#f2eee4` media well on top with a '# 1st place }' ribbon label, white value row below."

### Incremental Iteration

Lock radius 0 and the two-weight type system first. Then add the grid motif, then category color blocks, then motion. Do not add shadows or gradients at any stage.

## 7. Motion System (from the source animation script)

Measured from overflow.sui.io's custom script, not guessed. GSAP defaults are set once: `ease: "sui-sine"` (`CustomEase 0.525,0,0,1`), `duration: 0.525`. Lenis drives scrolling and is synced to `gsap.ticker`, with `lagSmoothing(0)`.

| Pattern                             | Trigger                             | Values                                                                                      |
| ----------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------- |
| Word reveal (`data-split="words"`)  | `top 90%`, once                     | words `yPercent 25 -> 0`, `autoAlpha 0 -> 1`, stagger 0.05                                  |
| Ghost loader (`data-load-ghost`)    | `top bottom`                        | see section 4                                                                               |
| Card row reveal (prizes)            | `top 80%`, once                     | `yPercent 40 -> 0`, `autoAlpha`, stagger 0.05, 0.725s                                       |
| Staggered column parallax (tracks)  | scrub, `top bottom` to `bottom top` | 2nd column `yPercent 40 -> -20`, 3rd `80 -> -40`; tablet: even items `75 -> -50`            |
| Parallax (`data-parallax`)          | scrub                               | `yPercent 20 -> -20` by default                                                             |
| Wiggle (`data-wiggle`)              | while in view                       | random x/y within amplitude (default 5px), 1.2 to 2s, "sui-wiggle"                          |
| Magnetic (`data-magnetic-strength`) | pointer move, desktop only          | follow `(pointer - center) * strength/16 em`, power4.out 1.6s; release `elastic.out(1, .3)` |
| Loader                              | page load                           | see section 4                                                                               |

Rules: everything above is disabled under `prefers-reduced-motion` (loader becomes a plain fade). Only `transform`, `opacity`, `clip-path` and colors animate.

### Fakturin usage

- **Landing (`/`)**: the full system. Loader (once per session), Lenis, nav theme switching and hide-on-scroll, bottom tab bar, word reveals, ghost loader, staggered role cards, prize-style money cards with counting numbers, a pinned horizontal demo walkthrough (with a progress bar), interactive grid canvas, Flip contract grid, GSAP FAQ.
- **Hero story**: the hero art stays pinned while three chapters scroll on the left (Penjual, Pembeli, Pemberi dana). The active chapter is full opacity, the others 22%. Each chapter plays one stage on the art: the pen signs (Diajukan), the stamp presses and leaves an ink mark (Terkonfirmasi), the token slides onto the invoice with an "Rp80.000.000 cair" tag (Dibiayai). Stages reverse when scrolling back. Nothing in the art needs a click.
- **App pages**: CSS transitions only (hover, press, status changes). No loader, no smooth scroll; these are tools.

## 8. Fakturin Adaptation Rules (apps/web)

Fakturin is an invoice-financing dApp (seller / buyer / lender / partner flows), not a hackathon poster. Borrow the **system**, not the **brand**:

**Keep**

- Tokens: paper / ink / Sui Blue accent, radius 0, 2px ink borders, two weights, tight tracking, the single easing curve.
- Split CTA as the only primary button. One label per intent across the app.
- Graph-paper motif in at most one place per page (landing hero, or empty states).
- Category palette mapped to invoice status, one color per meaning, used app-wide (`STATUS_TONE` in `lib/invoice.ts`):
  `Diajukan` Lilac, `Terkonfirmasi` Sui Blue, `Disanggah` Yellow, `Tercetak` Cyan, `Dibiayai` Mint, `Lunas` paper with ink outline, `Gagal bayar` Orange.
- Role colors (nav active cell, page swatch, landing cards; `lib/roles.ts`): Penjual Lilac, Pembeli Sui Blue, Pasar Mint, Cek faktur Cyan, Mitra Yellow.
- Mono for money, hashes, addresses, invoice IDs, dates (`font-mono`, tabular nums).

**Drop / change**

- Do not copy Sui/Overflow logos, illustrations, walrus, keycaps or wording. Fakturin has its own isometric set in `public/illustrations/` (generated by `scripts/process-illustrations.mjs`): scenes `hero, penjual, pembeli, pemberi-dana, mitra, cek, empty` and transparent objects `faktur, stempel, token, pulpen, penjepit, bantalan, formulir`. The objects play the role of Overflow's keycaps.
- Scale display type down for app pages: page titles use `headline` (48-64px), never 120-140px. Reserve `display-xl` for the landing hero only, max 2 lines.
- The bottom sticky tab bar exists on the landing page only (section anchors). Role screens use the top nav (64-72px, one line).
- Light only, like the source. Depth comes from deliberate ink sections, not from a system dark mode (`color-scheme: light`, `theme-color #f7f7f7`). A system dark mode must not change the page.
- No strip above the nav. The demo disclaimer ("MockIDR bukan uang. Bukan produk keuangan.") lives in the footer and on simulated components (`Simulasi` tag).
- Wallet: Reown AppKit (wagmi adapter, viem) themed square with the Sui-blue accent; the nav's right cell opens it. Without `NEXT_PUBLIC_REOWN_PROJECT_ID` the same cell connects the browser wallet directly.

**Guardrails (from design-taste-frontend skill)**

- Zero em-dashes in visible copy.
- Max one eyebrow per three sections; mono tags are the eyebrow, so ration them.
- Every interactive component ships default / hover / focus-visible / active / disabled / loading (skeleton bars in `#dfdfdf`, matching the source reveal) / error.
- Text contrast: ink on Yellow, Mint, Lilac, Cyan, Sui Blue; off-white on Violet and ink. Never off-white on Yellow/Mint/Lilac.
- Honor `prefers-reduced-motion`: disable text-reveal and arrow nudges.

### Suggested CSS tokens (`app/globals.css`)

```css
:root {
  --surface: #f7f7f7;
  --surface-warm: #f2eee4;
  --surface-muted: #dfdfdf;
  --ink: #000f1d;
  --ink-raised: #31404e;
  --text-muted: #61686d;
  --text-subtle: #7c838a;
  --line: #bbbec0;
  --accent: #4da2ff;
  --cat-yellow: #ffd731;
  --cat-orange: #ff7a00;
  --cat-green: #55db9c;
  --cat-violet: #5c4ade;
  --cat-lilac: #e9ccff;
  --border: 2px solid var(--ink);
  --ease: cubic-bezier(0.525, 0, 0, 1);
  --dur: 0.525s;
}
```
