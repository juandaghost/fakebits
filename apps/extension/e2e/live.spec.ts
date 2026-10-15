import { expect, test } from './fixtures';

// Smoke test against the real twitch.tv, to catch Twitch DOM changes that the stubbed
// page cannot. Opt-in because it depends on the network and on Twitch:
//   FAKEBITS_LIVE=1 pnpm --filter @fakebits/extension e2e
// FAKEBITS_LIVE_CHANNEL picks the channel. By default it is the first live channel in
// Twitch's side bar: offline channel pages do not render the chat column.

test.skip(!process.env.FAKEBITS_LIVE, 'set FAKEBITS_LIVE=1 to run against twitch.tv');

test('real twitch.tv: button, modal and local chat line', async ({
  context,
  seedBits,
}, testInfo) => {
  test.setTimeout(90_000);
  await seedBits(100);
  const page = await context.newPage();
  // Wide enough that Twitch shows the chat column next to the player.
  await page.setViewportSize({ width: 1600, height: 900 });

  let channel = process.env.FAKEBITS_LIVE_CHANNEL;
  if (!channel) {
    await page.goto('https://www.twitch.tv/');
    const live = page.getByRole('group', { name: 'Live Channels' }).getByRole('link').first();
    channel = (await live.getAttribute('href'))!.replace(/^\//, '');
  }
  testInfo.annotations.push({ type: 'channel', description: channel });
  await page.goto(`https://www.twitch.tv/${channel}`);

  const button = page.getByRole('button', { name: 'Cheer (fake)' });
  await expect(button).toBeVisible({ timeout: 45_000 });
  await page.screenshot({ path: testInfo.outputPath('button.png') });

  await button.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('modal.png') });

  await dialog.getByRole('button', { name: '1', exact: true }).click();
  await dialog.getByLabel('Message').fill('live smoke test');
  await dialog.getByRole('button', { name: 'Cheer 1 bits' }).click();
  await expect(dialog.getByText('It is in your chat now, visible only to you.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Close' }).last().click();

  const line = page.locator('[data-fakebits="cheer"]');
  await expect(line).toContainText('live smoke test');
  await page.screenshot({ path: testInfo.outputPath('chat-line.png') });

  // Hard rule 1: Twitch's real chat input stays empty.
  const input = page.locator('[data-a-target="chat-input"]');
  await expect(input).not.toContainText('live smoke test');
});
