/** Shared by export-figma.mjs and validate-export.mjs so captures and re-renders use identical frames. */
export const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
  small: { width: 360, height: 780 },
  tablet: { width: 768, height: 1024 },
};

/**
 * Full-page frames: grow the real viewport to the content height instead of using Playwright's
 * fullPage stitching, so fixed/sticky chrome (bottom nav, composer, sidebar) lands where it would in a
 * tall Figma frame. Iterates because dvh-based min-heights react to the new viewport.
 */
export async function growViewportToContent(page, vp) {
  let h = vp.height;
  for (let i = 0; i < 4; i++) {
    const content = await page.evaluate(() => Math.ceil(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)));
    if (content <= h) break;
    h = Math.min(content, 8000);
    await page.setViewportSize({ width: vp.width, height: h });
    await page.waitForTimeout(80);
  }
  return h;
}
