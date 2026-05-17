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
  await expect(page.locator('html')).toHaveAttribute('data-theme', '1995');
  await expect(page.locator('html')).toHaveAttribute('data-font', 'iyagi');
  await expect(page.locator('meta[name="app-version"]')).toHaveAttribute('content', /1995-default-reset/);
  await expect(page.locator('link[href^="assets/styles/app.css"]')).toHaveCount(1);
  await expect(page.locator('script[src="assets/vendor/jszip-3.10.1.min.js"]')).toHaveCount(1);
  await expect(page.locator('script[src^="assets/scripts/app.js"]')).toHaveCount(1);
  await expect(page.locator('img[src^="assets/guide/"]')).toHaveCount(6);
  await expect(page.locator('#heroImage')).toHaveCount(0);
  await expect(page.locator('#setupTipsBtn')).toHaveCount(0);
  await expect(page.locator('#tipsModal')).toHaveCount(0);
  await expect(page.locator('#linkSidebar .link-item')).toHaveCount(6);
  const setupThemeStyles = await page.evaluate(() => {
    const guideImage = getComputedStyle(document.querySelector('.guide-item img'));
    const guideSection = getComputedStyle(document.querySelector('.guide-section'));
    const progressBar = getComputedStyle(document.querySelector('.progress-bar'));
    const progressFill = getComputedStyle(document.querySelector('.progress-bar .fill'));
    return {
      guideImageBorder: guideImage.borderTopStyle,
      guideImageTopColor: guideImage.borderTopColor,
      guideImageBottomColor: guideImage.borderBottomColor,
      guideSectionTop: guideSection.borderTopStyle,
      guideSectionRight: guideSection.borderRightStyle,
      guideSectionLeft: guideSection.borderLeftStyle,
      guideSectionBottomColor: guideSection.borderBottomColor,
      progressHeight: progressBar.height,
      progressFillBackground: progressFill.backgroundColor
    };
  });
  expect(setupThemeStyles.guideImageBorder).toBe('solid');
  expect(setupThemeStyles.guideImageTopColor).toBe('rgb(128, 128, 128)');
  expect(setupThemeStyles.guideImageBottomColor).toBe('rgb(255, 255, 255)');
  expect(setupThemeStyles.guideSectionTop).toBe('none');
  expect(setupThemeStyles.guideSectionRight).toBe('none');
  expect(setupThemeStyles.guideSectionLeft).toBe('none');
  expect(setupThemeStyles.guideSectionBottomColor).toBe('rgb(128, 128, 128)');
  expect(Number.parseFloat(setupThemeStyles.progressHeight)).toBeGreaterThanOrEqual(16);
  expect(setupThemeStyles.progressFillBackground).toBe('rgb(0, 128, 128)');

  await page.locator('#reportIssueFooterBtn').click();
  await expect(page.locator('#reportIssueModal')).toHaveClass(/open/);
  await expect(page.locator('#diagnosticReportText')).toHaveValue(/chaextractor 오류 진단 리포트/);
  await expect(page.locator('#downloadDiagnosticBtn')).toHaveText(/TXT 다운로드/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#reportIssueModal')).not.toHaveClass(/open/);

  await page.waitForFunction(() => {
    const image = document.querySelector('img[src="assets/guide/guide-01-settings.png"]');
    return image && image.complete && image.naturalWidth > 0;
  });

  await expect.poll(() => page.evaluate(() => typeof window.JSZip)).toBe('function');
  expect(failures).toEqual([]);
});

test('new app version resets stored theme once', async ({ page }) => {
  const failures = watchLocalRuntime(page);

  await openApp(page);
  await page.evaluate(() => {
    localStorage.setItem('chaextractorAppVersion', 'legacy');
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('font', 'neodgm');
    localStorage.setItem('fontAutoSwitch', 'false');
  });
  await page.reload();

  await expect(page).toHaveTitle(/머니버스 대화 뷰어/);

  const appVersion = await page.locator('meta[name="app-version"]').getAttribute('content');
  await expect(page.locator('html')).toHaveAttribute('data-theme', '1995');
  await expect(page.locator('html')).toHaveAttribute('data-font', 'iyagi');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('1995');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('font'))).toBe('iyagi');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('fontAutoSwitch'))).toBe(null);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chaextractorAppVersion'))).toBe(appVersion);

  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
    localStorage.setItem('font', 'ridi');
    localStorage.setItem('fontAutoSwitch', 'false');
  });
  await page.reload();
  await expect(page).toHaveTitle(/머니버스 대화 뷰어/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-font', 'ridi');

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
  await page.locator('#captureBtn').click();
  await expect(page.locator('#captureModal')).toHaveClass(/open/);
  await expect(page.locator('#captureText')).toHaveValue(/# 카카오톡 대화 갈무리/);
  await expect(page.locator('#captureText')).toHaveValue(/첨부파일 내용: 포함하지 않음/);
  await expect(page.locator('#captureText')).toHaveValue(/\[09:05\] 채상욱 리더:/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#captureModal')).not.toHaveClass(/open/);

  await page.locator('#searchInput').fill('자정');
  await expect(page.locator('.date-item')).toHaveCount(1);
  await expect(page.locator('.date-item')).toContainText('2026/03/02');
  await page.locator('.date-item').click();
  await expect(page.locator('#chatMessages')).toContainText('자정 메시지');

  await page.locator('#searchInput').fill('');
  await page.locator('.date-item', { hasText: '2026/03/01' }).click();
  await page.locator('#leaderFilterBtn').click();
  await expect(page.locator('#leaderFilterPanel')).toBeVisible();
  await expect(page.locator('#leaderFilterInput')).toHaveValue('채상욱 리더');
  await expect(page.locator('#leaderFilterInput')).toBeFocused();
  await expect(page.locator('#leaderFilterBtn')).toHaveClass(/active/);
  const leaderFilterUi = await page.evaluate(() => {
    const panel = getComputedStyle(document.querySelector('#leaderFilterPanel'));
    const input = getComputedStyle(document.querySelector('#leaderFilterInput'));
    return {
      clearText: document.querySelector('#leaderFilterClearBtn').textContent.trim(),
      panelBorderTopColor: panel.borderTopColor,
      panelBorderRightColor: panel.borderRightColor,
      panelBorderBottomColor: panel.borderBottomColor,
      panelBorderLeftColor: panel.borderLeftColor,
      inputOutlineStyle: input.outlineStyle,
      inputOutlineColor: input.outlineColor
    };
  });
  expect(leaderFilterUi.clearText).toBe('해제');
  expect(leaderFilterUi.panelBorderTopColor).toBe('rgb(128, 128, 128)');
  expect(leaderFilterUi.panelBorderRightColor).toBe('rgb(255, 255, 255)');
  expect(leaderFilterUi.panelBorderBottomColor).toBe('rgb(255, 255, 255)');
  expect(leaderFilterUi.panelBorderLeftColor).toBe('rgb(128, 128, 128)');
  expect(leaderFilterUi.inputOutlineStyle).toBe('dotted');
  expect(leaderFilterUi.inputOutlineColor).toBe('rgb(0, 0, 0)');
  await expect(page.locator('#chatMessages .message.leader')).toHaveCount(1);
  await expect(page.locator('#chatMessages .message:not(.leader)').first()).toBeHidden();
  await page.locator('#leaderFilterInput').fill('테스터');
  await page.locator('#leaderFilterInput').press('Enter');
  await expect(page.locator('#leaderFilterPanel')).toBeHidden();
  await expect(page.locator('#chatMessages .message.leader')).toHaveCount(4);
  await expect(page.locator('#chatMessages .message:not(.leader)').first()).toBeHidden();
  await page.locator('#captureBtn').click();
  await expect(page.locator('#captureModal')).toHaveClass(/open/);
  await expect(page.locator('#captureUseLeaderFilter')).toBeChecked();
  await expect(page.locator('#captureText')).toHaveValue(/사용자 필터: 테스터/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#captureModal')).not.toHaveClass(/open/);
  await page.locator('#leaderFilterBtn').click();
  await page.locator('#leaderFilterClearBtn').click();
  await expect(page.locator('#leaderFilterBtn')).not.toHaveClass(/active/);
  await expect(page.locator('#chatMessages .message').first()).toBeVisible();

  await page.locator('#settingsBtn').click();
  const settingsGhost = await page.evaluate(() => {
    const ghost = document.querySelector('.win31-ghost-box');
    const frames = Array.from(document.querySelectorAll('.win31-ghost-frame'));
    const frameStyle = frames[0] ? getComputedStyle(frames[0]) : null;
    return {
      exists: Boolean(ghost),
      frameCount: frames.length,
      dataFrameCount: ghost ? Number(ghost.dataset.frameCount) : 0,
      frameAnimationName: frameStyle ? frameStyle.animationName : '',
      frameAnimationDelay: frames[1] ? getComputedStyle(frames[1]).animationDelay : '',
      borderTopWidth: frameStyle ? frameStyle.borderTopWidth : '',
      outlineStyle: frameStyle ? frameStyle.outlineStyle : '',
      boxShadow: frameStyle ? frameStyle.boxShadow : '',
      modalHidden: document.querySelector('#settingsModal').classList.contains('win31-window-hidden')
    };
  });
  expect(settingsGhost.exists).toBe(true);
  expect(settingsGhost.frameCount).toBe(9);
  expect(settingsGhost.dataFrameCount).toBe(9);
  expect(settingsGhost.frameAnimationName).toContain('win31-ghost-frame-show');
  expect(settingsGhost.frameAnimationDelay).toBe('0.03s');
  expect(settingsGhost.borderTopWidth).toBe('3px');
  expect(settingsGhost.outlineStyle).toBe('none');
  expect(settingsGhost.boxShadow).not.toBe('none');
  expect(settingsGhost.modalHidden).toBe(true);
  await expect(page.locator('#settingsModal')).toHaveClass(/open/);
  await expect(page.locator('#settingsModal')).not.toHaveClass(/win31-window-hidden/);
  const settingsPreview = await page.evaluate(() => {
    const stylesFor = selector => {
      const style = getComputedStyle(document.querySelector(selector));
      return {
        background: style.backgroundColor,
        color: style.color,
        font: style.fontFamily
      };
    };

    return {
      theme1995: stylesFor('button[data-theme="1995"]'),
      fontIyagiText: document.querySelector('button[data-font="iyagi"]').textContent.trim(),
      fontIyagi: stylesFor('button[data-font="iyagi"]'),
      fontRidi: stylesFor('button[data-font="ridi"]')
    };
  });
  expect(settingsPreview.theme1995.background).toBe('rgb(10, 33, 64)');
  expect(settingsPreview.theme1995.color).toBe('rgb(244, 247, 255)');
  expect(settingsPreview.theme1995.font).toContain('IyagiGGC');
  expect(settingsPreview.fontIyagiText).toBe('PJW48 이야기');
  expect(settingsPreview.fontIyagi.font).toContain('IyagiGGC');
  expect(settingsPreview.fontRidi.font).toContain('RIDIBatang');
  await page.locator('button[data-theme="1995"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', '1995');
  await expect(page.locator('html')).toHaveAttribute('data-font', 'iyagi');
  const pcThemeUi = await page.evaluate(() => {
    const bubble = getComputedStyle(document.querySelector('#chatMessages .message-bubble'));
    const header = getComputedStyle(document.querySelector('.chat-header'));
    const scrollMarkers = getComputedStyle(document.querySelector('#scrollMarkers'));
    const sidebar = getComputedStyle(document.querySelector('.sidebar'));
    const sidebarHeader = getComputedStyle(document.querySelector('.sidebar-header'));
    const settingsHeaderBtn = getComputedStyle(document.querySelector('#settingsBtn'));
    const searchBox = getComputedStyle(document.querySelector('.search-box'));
    const calendar = getComputedStyle(document.querySelector('.calendar'));
    const linkSidebar = getComputedStyle(document.querySelector('.link-sidebar'));
    const linkGroup = getComputedStyle(document.querySelector('.link-group'));
    const chatArea = getComputedStyle(document.querySelector('.chat-area'));
    const dropZone = getComputedStyle(document.querySelector('.drop-zone'));
    const hint = getComputedStyle(document.querySelector('.hint'));
    const userName = getComputedStyle(document.querySelector('#chatMessages .message .user-name.desktop-only'));
    const leaderUserName = getComputedStyle(document.querySelector('#chatMessages .message.leader .user-name.desktop-only'));
    const leaderContent = getComputedStyle(document.querySelector('#chatMessages .message.leader .content'));
    const leaderContentBefore = getComputedStyle(document.querySelector('#chatMessages .message.leader .content'), '::before');
    const leaderTime = getComputedStyle(document.querySelector('#chatMessages .message.leader .time'));
    const userAfter = getComputedStyle(
      document.querySelector('#chatMessages .message .user-name.desktop-only'),
      '::after'
    );
    return {
      bubbleBackground: bubble.backgroundColor,
      bubbleBorder: bubble.borderTopStyle,
      bubbleRadius: bubble.borderTopLeftRadius,
      bubbleShadow: bubble.boxShadow,
      headerBorder: header.borderBottomStyle,
      headerBorderBottomColor: header.borderBottomColor,
      scrollMarkersBorderRightColor: scrollMarkers.borderRightColor,
      sidebarBackground: sidebar.backgroundColor,
      sidebarColor: sidebar.color,
      sidebarFont: sidebar.fontFamily,
      sidebarBorderTop: sidebar.borderTopStyle,
      sidebarBorderRight: sidebar.borderRightStyle,
      sidebarBorderBottom: sidebar.borderBottomStyle,
      sidebarBorderLeft: sidebar.borderLeftStyle,
      sidebarHeaderBorderTop: sidebarHeader.borderTopStyle,
      sidebarHeaderBorderRight: sidebarHeader.borderRightStyle,
      sidebarHeaderBorderBottom: sidebarHeader.borderBottomStyle,
      sidebarHeaderBorderLeft: sidebarHeader.borderLeftStyle,
      sidebarHeaderShadow: sidebarHeader.boxShadow,
      settingsHeaderBtnBackground: settingsHeaderBtn.backgroundColor,
      settingsHeaderBtnBorder: settingsHeaderBtn.borderTopStyle,
      settingsHeaderBtnBorderTopColor: settingsHeaderBtn.borderTopColor,
      settingsHeaderBtnBorderBottomColor: settingsHeaderBtn.borderBottomColor,
      settingsHeaderBtnShadow: settingsHeaderBtn.boxShadow,
      searchBoxBorderTop: searchBox.borderTopStyle,
      searchBoxBorderBottom: searchBox.borderBottomStyle,
      searchBoxShadow: searchBox.boxShadow,
      calendarBorderTop: calendar.borderTopStyle,
      calendarBorderBottom: calendar.borderBottomStyle,
      calendarShadow: calendar.boxShadow,
      linkSidebarBorderTop: linkSidebar.borderTopStyle,
      linkSidebarBorderRight: linkSidebar.borderRightStyle,
      linkSidebarBorderBottom: linkSidebar.borderBottomStyle,
      linkSidebarBorderLeft: linkSidebar.borderLeftStyle,
      linkGroupBorderTop: linkGroup.borderTopStyle,
      linkGroupBorderBottom: linkGroup.borderBottomStyle,
      chatAreaBackground: chatArea.backgroundColor,
      dropZoneBorder: dropZone.borderTopStyle,
      dropZoneBorderTopColor: dropZone.borderTopColor,
      dropZoneBorderBottomColor: dropZone.borderBottomColor,
      dropZoneShadow: dropZone.boxShadow,
      hintPaddingLeft: hint.paddingLeft,
      leaderUserNameColor: leaderUserName.color,
      leaderContentColor: leaderContent.color,
      leaderContentBeforeColor: leaderContentBefore.color,
      leaderTimeColor: leaderTime.color,
      userNameWhiteSpace: userName.whiteSpace,
      userNameOverflowWrap: userName.overflowWrap,
      userPrompt: userAfter.content
    };
  });
  expect(pcThemeUi.bubbleBackground).toBe('rgba(0, 0, 0, 0)');
  expect(pcThemeUi.bubbleBorder).toBe('none');
  expect(pcThemeUi.bubbleRadius).toBe('0px');
  expect(pcThemeUi.bubbleShadow).toBe('none');
  expect(pcThemeUi.headerBorder).toBe('solid');
  expect(pcThemeUi.headerBorderBottomColor).toBe('rgb(20, 37, 60)');
  expect(pcThemeUi.scrollMarkersBorderRightColor).toBe('rgb(20, 37, 60)');
  expect(pcThemeUi.sidebarBackground).toBe('rgb(192, 192, 192)');
  expect(pcThemeUi.sidebarColor).toBe('rgb(0, 0, 0)');
  expect(pcThemeUi.sidebarFont).toContain('IyagiGGC');
  expect(pcThemeUi.sidebarBorderTop).toBe('none');
  expect(pcThemeUi.sidebarBorderRight).toBe('solid');
  expect(pcThemeUi.sidebarBorderBottom).toBe('none');
  expect(pcThemeUi.sidebarBorderLeft).toBe('none');
  expect(pcThemeUi.sidebarHeaderBorderTop).toBe('none');
  expect(pcThemeUi.sidebarHeaderBorderRight).toBe('none');
  expect(pcThemeUi.sidebarHeaderBorderBottom).toBe('solid');
  expect(pcThemeUi.sidebarHeaderBorderLeft).toBe('none');
  expect(pcThemeUi.sidebarHeaderShadow).toContain('rgb(255, 255, 255)');
  expect(pcThemeUi.settingsHeaderBtnBackground).toBe('rgb(192, 192, 192)');
  expect(pcThemeUi.settingsHeaderBtnBorder).toBe('solid');
  expect(pcThemeUi.settingsHeaderBtnBorderTopColor).toBe('rgb(255, 255, 255)');
  expect(pcThemeUi.settingsHeaderBtnBorderBottomColor).toBe('rgb(0, 0, 0)');
  expect(pcThemeUi.settingsHeaderBtnShadow).toBe('none');
  expect(pcThemeUi.searchBoxBorderTop).toBe('none');
  expect(pcThemeUi.searchBoxBorderBottom).toBe('solid');
  expect(pcThemeUi.searchBoxShadow).toContain('rgb(255, 255, 255)');
  expect(pcThemeUi.calendarBorderTop).toBe('none');
  expect(pcThemeUi.calendarBorderBottom).toBe('solid');
  expect(pcThemeUi.calendarShadow).toContain('rgb(255, 255, 255)');
  expect(pcThemeUi.linkSidebarBorderTop).toBe('none');
  expect(pcThemeUi.linkSidebarBorderRight).toBe('none');
  expect(pcThemeUi.linkSidebarBorderBottom).toBe('none');
  expect(pcThemeUi.linkSidebarBorderLeft).toBe('solid');
  expect(pcThemeUi.linkGroupBorderTop).toBe('none');
  expect(pcThemeUi.linkGroupBorderBottom).toBe('none');
  expect(pcThemeUi.chatAreaBackground).toBe('rgb(7, 26, 51)');
  expect(pcThemeUi.dropZoneBorder).toBe('solid');
  expect(pcThemeUi.dropZoneBorderTopColor).toBe('rgb(128, 128, 128)');
  expect(pcThemeUi.dropZoneBorderBottomColor).toBe('rgb(255, 255, 255)');
  expect(pcThemeUi.dropZoneShadow).toBe('none');
  expect(Number.parseFloat(pcThemeUi.hintPaddingLeft)).toBeGreaterThan(0);
  expect(pcThemeUi.leaderUserNameColor).toBe('rgb(255, 212, 0)');
  expect(pcThemeUi.leaderContentColor).toBe('rgb(255, 212, 0)');
  expect(pcThemeUi.leaderContentBeforeColor).toBe('rgb(255, 212, 0)');
  expect(pcThemeUi.leaderTimeColor).toBe('rgb(255, 212, 0)');
  expect(pcThemeUi.userNameWhiteSpace).toBe('normal');
  expect(pcThemeUi.userNameOverflowWrap).toBe('anywhere');
  expect(pcThemeUi.userPrompt).toContain('>');
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
  const mobileWin31Ui = await page.evaluate(() => {
    const ghost = document.querySelector('.win31-ghost-box');
    const frames = Array.from(document.querySelectorAll('.win31-ghost-frame'));
    const frameStyle = frames[0] ? getComputedStyle(frames[0]) : null;
    const sidebar = getComputedStyle(document.querySelector('.sidebar'));
    const sidebarToggle = getComputedStyle(document.querySelector('#sidebarToggle'));
    return {
      ghostExists: Boolean(ghost),
      ghostFrameCount: frames.length,
      ghostDataFrameCount: ghost ? Number(ghost.dataset.frameCount) : 0,
      ghostFrameAnimationName: frameStyle ? frameStyle.animationName : '',
      ghostFrameAnimationDelay: frames[1] ? getComputedStyle(frames[1]).animationDelay : '',
      ghostBorderTopWidth: frameStyle ? frameStyle.borderTopWidth : '',
      ghostOutlineStyle: frameStyle ? frameStyle.outlineStyle : '',
      ghostBoxShadow: frameStyle ? frameStyle.boxShadow : '',
      sidebarOpening: document.querySelector('.sidebar').classList.contains('panel-opening'),
      sidebarTransition: sidebar.transitionDuration,
      toggleBackground: sidebarToggle.backgroundColor,
      toggleBorder: sidebarToggle.borderTopStyle,
      toggleTopColor: sidebarToggle.borderTopColor,
      toggleBottomColor: sidebarToggle.borderBottomColor,
      toggleRadius: sidebarToggle.borderTopLeftRadius
    };
  });
  await expect(page.locator('.sidebar')).toHaveClass(/open/);
  await expect(page.locator('#linkSidebar')).not.toHaveClass(/open/);
  await expect(page.locator('#sidebarOverlay')).toHaveClass(/active/);
  expect(mobileWin31Ui.ghostExists).toBe(true);
  expect(mobileWin31Ui.ghostFrameCount).toBe(9);
  expect(mobileWin31Ui.ghostDataFrameCount).toBe(9);
  expect(mobileWin31Ui.ghostFrameAnimationName).toContain('win31-ghost-frame-show');
  expect(mobileWin31Ui.ghostFrameAnimationDelay).toBe('0.03s');
  expect(mobileWin31Ui.ghostBorderTopWidth).toBe('3px');
  expect(mobileWin31Ui.ghostOutlineStyle).toBe('none');
  expect(mobileWin31Ui.ghostBoxShadow).not.toBe('none');
  expect(mobileWin31Ui.sidebarOpening).toBe(true);
  expect(mobileWin31Ui.sidebarTransition).toBe('0s');
  expect(mobileWin31Ui.toggleBackground).toBe('rgb(192, 192, 192)');
  expect(mobileWin31Ui.toggleBorder).toBe('solid');
  expect(mobileWin31Ui.toggleTopColor).toBe('rgb(255, 255, 255)');
  expect(mobileWin31Ui.toggleBottomColor).toBe('rgb(0, 0, 0)');
  expect(mobileWin31Ui.toggleRadius).toBe('0px');
  await expect(page.locator('.sidebar')).not.toHaveClass(/panel-opening/);

  await page.locator('#linkSidebarToggle').click();
  await expect(page.locator('#linkSidebar')).toHaveClass(/open/);
  await expect(page.locator('.sidebar')).not.toHaveClass(/open/);
  await expect(page.locator('#sidebarOverlay')).toHaveClass(/active/);

  await page.locator('#sidebarToggle').click();
  await expect(page.locator('.sidebar')).toHaveClass(/open/);
  await expect(page.locator('#linkSidebar')).not.toHaveClass(/open/);
  await expect(page.locator('#sidebarOverlay')).toHaveClass(/active/);

  await page.locator('#sidebarOverlay').dispatchEvent('click');
  await expect(page.locator('.sidebar')).not.toHaveClass(/open/);
  await expect(page.locator('#linkSidebar')).not.toHaveClass(/open/);
  await expect(page.locator('#sidebarOverlay')).not.toHaveClass(/active/);

  expect(failures).toEqual([]);
});
