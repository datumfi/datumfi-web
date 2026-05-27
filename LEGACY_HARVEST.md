# LEGACY_HARVEST.md
> Patterns extracted from index.html before Prompt 0 surgery (2026-04-23).
> Source line numbers reference the **pre-surgery** file (2904 lines).
> These are reference implementations for studio.html corrections.

---

## 1. ACCOUNT_DEFS (lines 1808–1818)
Complete object with 9 keys — these are the **correct engine enum names** that studio.html's rDataList gets wrong.

```javascript
const ACCOUNT_DEFS = {
    pretax_401k: { name: 'Pre-Tax 401(k)',       desc: 'Taxed as ordinary income. First in line for RMDs.' },
    pretax_457b: { name: 'Pre-Tax 457(b)',        desc: 'Accessible penalty-free before 59.5 upon separation.' },
    pretax_ira:  { name: 'Pre-Tax IRA',           desc: 'Consolidated pre-tax capital.' },
    roth_401k:   { name: 'Roth 401(k)',           desc: 'Tax-free growth from employer plan.' },
    roth_457b:   { name: 'Roth 457(b)',           desc: 'Tax-free growth, accessible early.' },
    roth_ira:    { name: 'Roth IRA',              desc: 'Aspirational, completely tax-free expansion space.' },
    taxable:     { name: 'Taxable Brokerage',     desc: 'Capital gains and dividends. Highly liquid.' },
    hysa:        { name: 'High Yield Savings',    desc: 'Cash buffer. No market risk.' },
    pension:     { name: 'Pension (Annual Income)', desc: 'Secure, fixed income floor.' },
};
```

---

## 2. buildAPIRequest() (lines 1962–1996)
Reference implementation for wiring DOB→age, retirement date→age, SS strategy, accounts with correct types, location, datum_spend, market_outlook, ss_strategy_primary, and conditional co-architect inclusion.

```javascript
function buildAPIRequest() {
    const currentAge  = getAgeFromDOB('p-dob-month', 'p-dob-year') || 43;
    const retireAge   = getRetirementAge('p-ret-month', 'p-ret-year') || 53;
    const datumSpend  = parseInt($('datum-input').value.replace(/[^\d]/g, ''), 10) || 120000;
    const ssPrimary   = SS_MAP[$('p-ss-strategy').dataset.value] || 'optimal_70';
    const outlook     = OUTLOOK_API_MAP[currentOutlook] || 'valuations_matter';

    const accounts = [];
    document.querySelectorAll('.bp-room[data-account-type]').forEach(room => {
        const accountType  = room.getAttribute('data-account-type');
        const balInput     = room.querySelector('.room-input');
        const contribInput = room.querySelector('.r-contrib input[type="text"]');
        const freqSelect   = room.querySelector('.r-contrib select');
        const balance      = parseInt((balInput?.value  || '0').replace(/[^\d]/g, ''), 10) || 0;
        const rawContrib   = parseInt((contribInput?.value || '0').replace(/[^\d]/g, ''), 10) || 0;
        const isMonthly    = freqSelect?.value === 'Monthly';
        accounts.push({ type: accountType, balance, annual_contribution: isMonthly ? rawContrib * 12 : rawContrib });
    });

    // Capture SS benefit estimates from optional inputs
    SS_BENEFIT_FULL    = parseInt(($('p-ss-benefit')?.value    || '0').replace(/[^\d]/g,''), 10) || 0;
    SS_BENEFIT_CO_FULL = parseInt(($('p-co-ss-benefit')?.value || '0').replace(/[^\d]/g,''), 10) || 0;

    const body = { current_age: currentAge, retirement_age: retireAge, location: 'FL', datum_spend: datumSpend, market_outlook: outlook, ss_strategy_primary: ssPrimary, accounts };
    LAST_SS_PRIMARY = ssPrimary;

    const coCheck = $('p-co-check');
    if (coCheck && coCheck.checked) {
        const coAge = getAgeFromDOB('p-co-dob-month', 'p-co-dob-year');
        const coSS  = SS_MAP[$('p-co-ss').dataset.value] || 'optimal_70';
        if (coAge !== null) { body.co_architect_age = coAge; body.ss_strategy_secondary = coSS; LAST_SS_SECONDARY = coSS; }
    } else { LAST_SS_SECONDARY = null; }

    console.log('[DATUM FI] API request:', JSON.parse(JSON.stringify(body)));
    return body;
}
```

---

## 3. SS Benefit Input Pattern (lines 1982–1983)
How primary (`p-ss-benefit`) and co-architect (`p-co-ss-benefit`) dollar inputs are captured. Studio.html entirely lacks this.

```javascript
// Capture SS benefit estimates from optional inputs
SS_BENEFIT_FULL    = parseInt(($('p-ss-benefit')?.value    || '0').replace(/[^\d]/g,''), 10) || 0;
SS_BENEFIT_CO_FULL = parseInt(($('p-co-ss-benefit')?.value || '0').replace(/[^\d]/g,''), 10) || 0;
```

Input element IDs: `p-ss-benefit` (primary architect annual SS at 67) and `p-co-ss-benefit` (co-architect annual SS at 67).

---

## 4. OUTLOOK_API_MAP (lines 1783–1786)
Maps UI labels to engine enums.

```javascript
const OUTLOOK_API_MAP = {
    history: 'history_repeats', cape: 'valuations_matter',
    cautious: 'cautious', optimistic: 'optimistic', custom: 'custom'
};
```

---

## 5. SS_MAP (lines 1787–1791)
Maps SS strategy UI values to engine enums.

```javascript
const SS_MAP = {
    'Optimal (Age 70)': 'optimal_70',
    'Full (Age 67)':    'full_67',
    'Early (Age 62)':   'early_62'
};
```

---

## 6. Co-Architect Wiring Pattern (lines 1988–1993)
Conditional logic — if co checkbox checked AND getAgeFromDOB returns non-null, include `co_architect_age` and `ss_strategy_secondary` in request body.

```javascript
const coCheck = $('p-co-check');
if (coCheck && coCheck.checked) {
    const coAge = getAgeFromDOB('p-co-dob-month', 'p-co-dob-year');
    const coSS  = SS_MAP[$('p-co-ss').dataset.value] || 'optimal_70';
    if (coAge !== null) { body.co_architect_age = coAge; body.ss_strategy_secondary = coSS; LAST_SS_SECONDARY = coSS; }
} else { LAST_SS_SECONDARY = null; }
```

Co-architect checkbox ID: `p-co-check`. Co-architect DOB selects: `p-co-dob-month`, `p-co-dob-year`. Co-architect SS cards container: `p-co-ss` (dataset.value holds the UI label).
