import { sanitizeHtmlForDisplay } from './sanitize-html';

describe('sanitizeHtmlForDisplay', () => {
  it('removes script tags and inline handlers', () => {
    const unsafe =
      '<p onclick="alert(1)">safe</p><script>alert(2)</script><a href="javascript:alert(3)">x</a>';
    const sanitized = sanitizeHtmlForDisplay(unsafe);

    expect(sanitized).toContain('<p>safe</p>');
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('onclick=');
    expect(sanitized).not.toContain('javascript:');
  });
});
