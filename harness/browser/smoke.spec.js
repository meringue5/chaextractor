import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const windowsFixture = path.join(
  repoRoot,
  'test/fixtures/windows-minimal/KakaoTalk_20260301_2110_00_123_windows.txt'
);

function watchLocalRuntime(page) {
  const failures = [];

  page.on('pageerror', error => {
    failures.push(`pageerror: ${error.message}`);
  });

  page.on('response', response => {
    const url = new URL(response.url());
    if (url.hostname === '127.0.0.1' && response.status() >= 400) {
      failures.push(`${response.status()} ${url.pathname}`);
    }
  });

  return failures;
}

async function openApp(page) {
  await page.goto('/');
  await expect(page).toHaveTitle(/머니버스 대화 뷰어/);
}

async function uploadWindowsFixture(page) {
  await page.setInputFiles('#zipInput', windowsFixture);
  await expect(page.locator('#zipName')).toContainText('처리 완료', { timeout: 10_000 });
  await expect(page.locator('#startBtn')).toBeEnabled();
  await page.locator('#startBtn').click();
  await expect(page.locator('#app')).toHaveClass(/active/);
}

test('static shell loads local assets and vendor script', async ({ page }) => {
  const failures = watchLocalRuntime(page);

  await openApp(page);

  await expect(page.locator('#setupScreen')).toBeVisible();
  await expect(page.locator('link[href="assets/styles/app.css"]')).toHaveCount(1);
  await expect(page.locator('script[src="assets/vendor/jszip-3.10.1.min.js"]')).toHaveCount(1);
  await expect(page.locator('script[src="assets/scripts/app.js"]')).toHaveCount(1);
  await expect(page.locator('img[src^="assets/guide/"]')).toHaveCount(6);
  await expect(page.locator('#setupTipsBtn')).toHaveCount(0);
  await expect(page.locator('#tipsModal')).toHaveCount(0);
  await expect(page.locator('#linkSidebar .link-item')).toHaveCount(6);

  await page.waitForFunction(() => {
    const image = document.querySelector('img[src="assets/guide/guide-01-settings.png"]');
    return image && image.complete && image.naturalWidth > 0;
  });

  await expect.poll(() => page.evaluate(() => typeof window.JSZip)).toBe('function');
  expect(failures).toEqual([]);
});

test('desktop smoke uploads Windows TXT and exercises core UI', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'desktop flow runs in the desktop project');
  const failures = watchLocalRuntime(page);

  await openApp(page);
  await uploadWindowsFixture(page);

  await expect(page.locator('#stats')).toContainText('8개 메시지');
  await expect(page.locator('.date-item')).toHaveCount(2);
  await expect(page.locator('#linkSidebar')).toBeVisible();
  await expect(page.locator('#linkSidebar .link-item')).toHaveCount(6);

  await page.locator('.date-item', { hasText: '2026/03/01' }).click();
  await expect(page.locator('#chatTitle')).toContainText('2026년 3월 1일');
  await expect(page.locator('#chatMessages .message')).toHaveCount(5);
  await expect(page.locator('#chatMessages')).toContainText('안녕하세요');
  await expect(page.locator('#chatMessages')).toContainText('이어서 말합니다');

  await page.locator('#searchInput').fill('자정');
  await expect(page.locator('.date-item')).toHaveCount(1);
  await expect(page.locator('.date-item')).toContainText('2026/03/02');
  await page.locator('.date-item').click();
  await expect(page.locator('#chatMessages')).toContainText('자정 메시지');

  await page.locator('#searchInput').fill('');
  await page.locator('.date-item', { hasText: '2026/03/01' }).click();
  await page.locator('#leaderFilterBtn').click();
  await expect(page.locator('#leaderFilterBtn')).toHaveClass(/active/);
  await expect(page.locator('#chatMessages .message.leader')).toHaveCount(1);
  await expect(page.locator('#chatMessages .message:not(.leader)').first()).toBeHidden();

  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsModal')).toHaveClass(/open/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#settingsModal')).not.toHaveClass(/open/);

  expect(failures).toEqual([]);
});

test('mobile smoke toggles mutually exclusive sidebars', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile', 'mobile flow runs in the mobile project');
  const failures = watchLocalRuntime(page);

  await openApp(page);
  await uploadWindowsFixture(page);

  await expect(page.locator('#sidebarToggle')).toBeVisible();
  await expect(page.locator('#linkSidebarToggle')).toBeVisible();

  await page.locator('#sidebarToggle').click();
  await expect(page.locator('.sidebar')).toHaveClass(/open/);
  await expect(page.locator('#linkSidebar')).not.toHaveClass(/open/);
  await expect(page.locator('#sidebarOverlay')).toHaveClass(/active/);

  await page.locator('#linkSidebarToggle').click();
  await expect(page.locator('#linkSidebar')).toHaveClass(/open/);
  await expect(page.locator('.sidebar')).not.toHaveClass(/open/);
  await expect(page.locator('#sidebarOverlay')).toHaveClass(/active/);

  await page.locator('#sidebarToggle').click();
  await expect(page.locator('.sidebar')).toHaveClass(/open/);
  await expect(page.locator('#linkSidebar')).not.toHaveClass(/open/);
  await expect(page.locator('#sidebarOverlay')).toHaveClass(/active/);

  await page.locator('#sidebarOverlay').click();
  await expect(page.locator('.sidebar')).not.toHaveClass(/open/);
  await expect(page.locator('#linkSidebar')).not.toHaveClass(/open/);
  await expect(page.locator('#sidebarOverlay')).not.toHaveClass(/active/);

  expect(failures).toEqual([]);
});
