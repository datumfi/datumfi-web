/* ═══════════════════════════════════════════════════════════════════════════════════════════
   THE MARKET CLIMATE — FIVE MODEL DESIGNS, PORTED FROM THE CAPTAIN'S MOCK.

   SOURCE: Studio Mock.html — md5 e7f463163a7576c994b9099ab989c6a1, internal markers to V258
   (<style id="v258-surgical-pass">). The tile copy, the tags, the per-tile help and the
   methodology accordion below are the Architect's words, extracted from that file by script and
   never retyped. L47.
     ⛔ A PORT SOURCE IS A DEPENDENCY WITH A VERSION. Record the mock's md5 AND its internal
        marker in every port commit — "faithful to the mock" means nothing without saying WHICH
        mock. The measurement room was SIX REVISIONS STALE within a day of its port.

   ── ⛔⛔ WHAT THIS REPLACED, AND WHY DELETION IS THE REPAIR ──────────────────────────────────
   Four tiles — History Repeats / Valuations Matter / Cautious / Optimistic — each displaying a
   four-row weighting table. ALL FOUR TABLES STATED PERCENTAGES THE ENGINE DOES NOT USE, and the
   DEFAULT one was INVERTED against its own description: it showed CAPE at 15%, the lowest of its
   four, while the copy beside it said "Trusts valuation-aware models more" and the engine actually
   weighted CAPE at 40%, the highest.
     🔑 A WRONG NUMBER SHOWN TO A HOUSEHOLD IS WORSE THAN NO NUMBER, BECAUSE IT IS A NUMBER THEY
        CAN ACT ON. The tables are not corrected here. They are GONE. §82.2736 — deletion counts
        as porting.

   ── ⭐ THE CONTROL STOPS BEING WIRED TO AN AVERAGE. §82.2723 ─────────────────────────────────
   The four old presets were blend WEIGHTS over the same four models, and every one of them landed
   within the tier ladder's own $1,000 rounding of every other — MEASURED: per-model tiers spread
   23,000-31,000 while per-preset blends spread 1,000-2,000. A weighted average of a tight cluster
   is a tighter cluster. The five designs below are the MODELS THEMSELVES, and they spread $13,000:
   Blend $142k · Parametric $137k · Historical $149k · CAPE $147k · Regime $136k.
     ⚠️ NOBODY'S ANSWER MOVES ON THE DAY THIS SHIPS. The shipped Studio sends 'valuations_matter',
        which the engine already resolves to the Blend, and the Blend is the new default. What
        changes is that the other four stop being decorative.

   ── ⛔⛔ THE ELEMENT CARRIES THE ENGINE'S OWN ENUM, AND THAT IS THE POINT ─────────────────────
   The old tiles stored a DISPLAY LABEL in data-outlook, so every consumer needed a label->enum
   map to recover the answer — and there were THREE of them: two in studio.html and one in
   studio-blueprint.js. A RULE KEPT IN THREE LANGUAGES HAS ALREADY DRIFTED.
     🔑 THE MAPS ARE NOT SYNCHRONISED HERE, THEY ARE DELETED. data-outlook-key IS the enum the
        engine accepts, so there is nothing left to translate and no second place for it to drift
        to. The only surviving translation is the four retired ALIASES below, and it has one home.

   ⛔ PLAIN TOP-LEVEL FUNCTIONS. NOT AN IIFE, NOT A NAMESPACE — the sandbox gates lift a
      function's TEXT and run it in `new Function(...)`; a namespace is invisible to them. Same
      structural rule as the other Studio parts.

   ⚠️ ITS ABSENCE IS VISIBLE, NEVER WRONG. The shell keeps an empty .climate-grid. If this file
      fails to load the household sees NO climate control rather than a stale contradictory one —
      the same contract scripts/datum-footer.js holds for the disclosure footer.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/* THE FIVE DESIGNS. Copy is the Architect's, verbatim from the Mock; `key` is the engine's own
   market_outlook enum, so the DOM carries the answer rather than a label that has to be decoded. */
function _marketClimateDesigns() {
  return [
    { key: "blend", name: "Datumae Blend", tag: "ENSEMBLE",
      desc: "The default. Four modeling lenses run 10,000 paths each — 40,000 modeled paths total — before Monte Carlo resolves the range.",
      help: "WHAT IT MEANS — Datumae Blend is the default Model Design. All four engines participate equally, so no single market lens dominates the result.\n\nWHY YOU MIGHT CHOOSE IT — Start here for the broadest first read. It lets Parametric, Historical, CAPE-Adjusted, and Regime each contribute to the modeled range before you isolate any one assumption set.\n\nWHAT IT MAY DO TO THE RANGE — Because the lenses share the work, the result is usually more balanced than relying on one engine alone. Use it as the reference design for the four single-model comparisons.\n\nMODEL MIX — Parametric 25% · Historical 25% · CAPE-Adjusted 25% · Regime 25%\n\nRUN SIZE — 10,000 paths from each of four engines · 40,000 modeled paths total",
      /* ⛔⛔ `active: true` -> false (2026-09-19). THE FOURTH LAYER. Copy Bank §1.4 ruled that no
         Model Design is active on load; this table lit the Blend anyway, so `.climate-option.active`
         existed on a cold page and `marketClimateSelectedKey()` — which was written specifically to
         return '' rather than substitute — returned "blend" truthfully, because a tile really was
         selected. The accessor was honest and the data under it was not.
         ⚠️ THE WORD "The default." STAYS IN THE COPY ABOVE and is the Architect's. It describes what
            the Blend IS — the ensemble you get when you decline to have a view — not what the
            product picks for you. Those are different claims and only the second one was wrong. */
      active: false },
    { key: "parametric", name: "Parametric", tag: "PARAMETRIC",
      desc: "Mathematical projection alone — one engine, 10,000 modeled paths, without the other three lenses.",
      help: "WHAT IT MEANS — Parametric runs the mathematical projection alone. Returns are generated from the model’s calculated drift and volatility rather than sampled directly from historical years or valuation regimes.\n\nWHY YOU MIGHT CHOOSE IT — Use it to see the clean mathematical baseline without historical sequencing, CAPE adjustment, or regime persistence influencing the result.\n\nWHAT IT MAY DO TO THE RANGE — The result reflects the distributional assumptions of the Parametric engine by itself. Compare it with Datumae Blend to see how much the other three lenses change the Estate.\n\nMODEL MIX — Parametric 100% · Historical 0% · CAPE-Adjusted 0% · Regime 0%\n\nRUN SIZE — Parametric only · 10,000 modeled paths total",
      active: false },
    { key: "historical", name: "Historical", tag: "HISTORICAL",
      desc: "Real historical sequences alone — one engine, 10,000 modeled paths drawn from the historical record.",
      help: "WHAT IT MEANS — Historical runs real historical sequences alone. The engine samples the market record directly so crashes, recoveries, and fat-tail years remain embedded in the simulation.\n\nWHY YOU MIGHT CHOOSE IT — Use it when you want the actual historical record to carry the entire market assumption rather than a mathematical or valuation-adjusted model.\n\nWHAT IT MAY DO TO THE RANGE — The range will reflect the distribution and sequencing found in the historical data itself. Compare it with Datumae Blend to see what diversification across models adds.\n\nMODEL MIX — Historical 100% · Parametric 0% · CAPE-Adjusted 0% · Regime 0%\n\nRUN SIZE — Historical only · 10,000 modeled paths total",
      active: false },
    { key: "cape", name: "CAPE-Adjusted", tag: "CAPE",
      desc: "Valuation-adjusted returns alone — one engine, 10,000 modeled paths shaped by starting valuation.",
      help: "WHAT IT MEANS — CAPE-Adjusted runs the valuation-aware model alone. Starting valuations directly influence the return assumptions used to test the Estate.\n\nWHY YOU MIGHT CHOOSE IT — Use it when the price level at the retirement starting line deserves the strongest voice in the analysis.\n\nWHAT IT MAY DO TO THE RANGE — When valuations are elevated, this design can compress modeled capacity relative to less valuation-sensitive designs. It is sensitivity analysis, not a market forecast.\n\nMODEL MIX — CAPE-Adjusted 100% · Parametric 0% · Historical 0% · Regime 0%\n\nRUN SIZE — CAPE-Adjusted only · 10,000 modeled paths total",
      active: false },
    { key: "regime", name: "Regime", tag: "REGIME",
      desc: "Multi-year regimes alone — one engine, 10,000 modeled paths with persistent market environments.",
      help: "WHAT IT MEANS — Regime runs the multi-year regime model alone. Contiguous blocks preserve prolonged market environments instead of treating each year as independent.\n\nWHY YOU MIGHT CHOOSE IT — Use it to ask what happens when difficult or supportive conditions persist for years rather than resolving quickly.\n\nWHAT IT MAY DO TO THE RANGE — Regime persistence can expose sequence pressure that smoother models may dilute. Compare it with Datumae Blend to see how much sustained environments affect the structure.\n\nMODEL MIX — Regime 100% · Parametric 0% · Historical 0% · CAPE-Adjusted 0%\n\nRUN SIZE — Regime only · 10,000 modeled paths total",
      active: false }
  ];
}

/* ⛔⛔ THE FOUR RETIRED NAMES, AND THE ONLY TRANSLATION LEFT IN THE PRODUCT.
   The shipped Studio has been sending these since before the five designs existed, and the
   Captain's own saved plans carry them. The engine keeps them as accepted aliases that all
   resolve to the Blend — so lighting the Blend tile for a stored alias is not a substitution,
   it is a report of what the engine will actually compute for that word.
   ⚠️ DELETING THEM WOULD 422 EVERY REVEAL FROM A SAVED PLAN. They are retired as CHOICES, not as
      accepted input. */
function _marketClimateAliases() {
  return { valuations_matter: 'blend', history_repeats: 'blend', cautious: 'blend', optimistic: 'blend' };
}

/* The enum a stored value should LIGHT. Unknown values light nothing rather than guessing — a
   refusal is a correct answer; a plausible guess is not. */
function marketClimateResolveKey(stored) {
  if (!stored) return null;
  var designs = _marketClimateDesigns();
  for (var i = 0; i < designs.length; i++) if (designs[i].key === stored) return stored;
  var alias = _marketClimateAliases()[stored];
  return alias || null;
}

/* The design the household has chosen, read off the DOM. Returns the engine enum or '' — never a
   substituted default, so the caller decides what absence means. */
function marketClimateSelectedKey() {
  var el = document.querySelector('.climate-option.active');
  return (el && el.dataset && el.dataset.outlookKey) ? el.dataset.outlookKey : '';
}

/* Light the tile for an engine enum (or one of the four aliases). Returns the key it lit. */
function marketClimateSetKey(stored) {
  var key = marketClimateResolveKey(stored);
  if (!key) return null;
  var tiles = document.querySelectorAll('.climate-option');
  for (var i = 0; i < tiles.length; i++) {
    tiles[i].classList.toggle('active', tiles[i].dataset.outlookKey === key);
  }
  return key;
}

function _marketClimateEscAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function _marketClimateEscText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ⚠️ THE METHODOLOGY BLOCK IS THE MOCK'S OWN MARKUP, CARRIED WHOLE. It is the reachable home for
   the long-form explanation of all five designs plus the Stress Battery that sets the Floor. */
function _marketClimateMethodologyHtml() {
  return "<section class=\"datum-methodology\" data-methodology>\n                <button class=\"datum-methodology-toggle\" type=\"button\" data-methodology-toggle aria-expanded=\"false\" aria-controls=\"datumMethodologyBody\">\n                  <span><strong>Model Methodology &amp; Assumptions</strong><small>How the five Model Designs shape the Range</small></span>\n                  <span class=\"datum-methodology-screw\" aria-hidden=\"true\">+</span>\n                </button>\n                <div class=\"datum-methodology-body\" id=\"datumMethodologyBody\" data-methodology-body hidden>\n                  <p>The Datumae Intelligence engine offers five Model Designs. Run size follows the design you choose: Datumae Blend runs four engines at 10,000 paths each — 40,000 total — while Parametric, Historical, CAPE-Adjusted, and Regime each run one 10,000-path simulation. The result is not a prediction. It is a modeled spending shape designed to show how sensitive the Estate is to the market lens underneath it.</p>\n                  <h4>Datumae Blend</h4>\n                  <p>Runs Parametric, Historical, CAPE-Adjusted, and Regime together at 10,000 paths apiece — 40,000 modeled paths total. The four lenses remain distinct before their results are combined into the Datumae reference design.</p>\n                  <h4>Parametric Log-Normal</h4>\n                  <p>Runs 10,000 modeled paths using dynamically calculated drift and volatility. It assumes returns follow a log-normal distribution, providing a baseline spectrum of mathematical probabilities.</p>\n                  <h4>Empirical (1926-Present)</h4>\n                  <p>Runs 10,000 modeled paths sampled directly from historical market data. By using actual historical years, this model preserves “fat-tail” risk and true sequence-of-returns crashes that pure math often smooths over.</p>\n                  <h4>CAPE Valuation Adjustment</h4>\n                  <p>Runs 10,000 modeled paths with baseline expectations adjusted by the starting Shiller PE ratio. If markets begin from historically elevated valuations, the engine applies a reversion-to-mean penalty to future returns.</p>\n                  <h4>Regime Bootstrap</h4>\n                  <p>Runs 10,000 modeled paths by selecting contiguous multi-year blocks (regimes), preserving prolonged periods of market stagnation, inflation, or supportive conditions rather than treating each year independently.</p>\n                  <h4>The Stress Battery</h4>\n                  <p>Sets the Floor with five fixed stress cases rather than a Monte Carlo percentile: 1929, Japan 1990, the 2000 dot-com bust, the 2008 crisis, and a constructed twelve-year stagnation. The Systems Panel controls how many of those five the Floor must survive.</p>\n                </div>\n              </section>";
}

function _marketClimateTileHtml(d) {
  return '<div class="climate-option' + (d.active ? ' active' : '') + '"'
       + ' data-outlook-key="' + _marketClimateEscAttr(d.key) + '"'
       + ' tabindex="0" role="button" aria-pressed="' + (d.active ? 'true' : 'false') + '"'
       + ' data-help="' + _marketClimateEscAttr(d.help) + '">'
       + '<strong>' + _marketClimateEscText(d.name) + '</strong>'
       + '<span class="outlook-tag">' + _marketClimateEscText(d.tag) + '</span>'
       + '<p>' + _marketClimateEscText(d.desc) + '</p>'
       + '</div>';
}

/* ⛔ RENDERS SYNCHRONOUSLY AT PARSE TIME AND THAT IS LOAD-BEARING. The <script src> sits
   immediately after the mount in studio.html, so the tiles exist before ANY later script runs —
   which is why the shell's own click binding, its readiness check and studio-blueprint.js's
   commit listener all still find .climate-option with no ordering guard and no re-binding.
   ⚠️ MOVING THE SCRIPT TAG INTO <head> OR ADDING defer BREAKS ALL THREE SILENTLY: the tiles would
      render, and nothing would be listening to them. */
/* ⛔ THE KICKER AND THE INTRO ARE THE ARCHITECT'S, AND THEY REPLACED A LIVE FALSEHOOD. The shell
   used to carry "This calibrates the algorithmic blend used to stress-test your estate" — true of
   the four presets, FALSE of five designs, four of which are a single lens and calibrate nothing.
   ⚠️ IT WAS ALSO NEARLY INVISIBLE IN LIGHT MODE (var(--muted) on cream) and that was caught by a
      SCREENSHOT, not by a gate. A colour that fails to contrast has no value to assert against. */
function _marketClimateIntroHtml() {
  return '<div class="workspace-kicker">The Design</div>'
       + '<p class="phase-workspace-intro market-climate-intro">' + _marketClimateEscText("Choose the market design before the engine runs. Datumae Blend runs all four modeling lenses at 10,000 paths each — 40,000 modeled paths total. The other designs isolate one lens at 10,000 paths so you can see exactly how the Estate responds when that model carries the full simulation.") + '</p>';
}

function renderMarketClimate() {
  var mount = document.querySelector('.climate-grid');
  if (!mount) return 0;
  var designs = _marketClimateDesigns();
  /* ⛔ THE WORKSPACE CARD IS THE MOCK'S OWN WRAPPER AND IT WAS MISSING FROM THE FIRST PORT —
     Captain-caught on the eyes-on, 2026-09-18. In the Mock this whole activity sits inside
     <div class="workspace-card market-climate-workspace">, which is what draws the subtle blue
     box the tiles live in. Without it the kicker, intro, tiles and accordion floated on the page
     with no container at all.
     🔑 A MISSING WRAPPER IS INVISIBLE TO EVERY GATE I WROTE: the tiles rendered, the copy was
        verbatim, the colours resolved, eleven legs were green. WHAT WAS MISSING WAS THE THING
        AROUND THEM, AND NOTHING ASSERTS THE SHAPE OF AN ABSENCE. */
  var html = '<div class="workspace-card market-climate-workspace">'
           + _marketClimateIntroHtml() + '<div class="outlook-list">';
  for (var i = 0; i < designs.length; i++) html += _marketClimateTileHtml(designs[i]);
  html += '</div>' + _marketClimateMethodologyHtml() + '</div>';
  mount.innerHTML = html;
  return designs.length;
}

/* The Mock's own two interactions, ported: the accordion, and select-one-of-five.
   ⚠️ DELEGATED ON document FOR THE SAME REASON THE MOCK DELEGATES — the tiles are rendered, and a
      listener bound to an element that does not exist yet is the silent half of every hollow
      handler this project has already paid for. */
function _marketClimateBind() {
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-methodology-toggle]');
    if (t) {
      e.preventDefault();
      e.stopPropagation();
      var root = t.closest('[data-methodology]');
      var body = root && root.querySelector('[data-methodology-body]');
      var open = t.getAttribute('aria-expanded') === 'true';
      t.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (root) root.classList.toggle('open', !open);
      if (body) body.hidden = open;
      return;
    }
    var tile = e.target.closest && e.target.closest('.climate-option[data-outlook-key]');
    if (tile) {
      var list = tile.closest('.outlook-list');
      var all = list ? list.querySelectorAll('.climate-option') : [];
      for (var i = 0; i < all.length; i++) {
        var on = all[i] === tile;
        all[i].classList.toggle('active', on);
        all[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    }
  });
  /* keyboard parity with the Mock's tabindex="0" tiles */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var tile = e.target.closest && e.target.closest('.climate-option[data-outlook-key]');
    if (!tile) return;
    e.preventDefault();
    tile.click();
  });
}

renderMarketClimate();
_marketClimateBind();

window.renderMarketClimate = renderMarketClimate;
window.marketClimateSelectedKey = marketClimateSelectedKey;
window.marketClimateSetKey = marketClimateSetKey;
window.marketClimateResolveKey = marketClimateResolveKey;
