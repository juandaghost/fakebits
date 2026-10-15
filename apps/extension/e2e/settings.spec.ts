import { expect, test } from './fixtures';

test('the display name from settings is used on the local chat line', async ({
  openPopup,
  openTwitch,
  seedBits,
}) => {
  await seedBits(20000);
  const popup = await openPopup();
  await popup.getByRole('navigation').getByRole('button', { name: 'Settings' }).click();

  const name = popup.getByLabel('Name on your chat lines');
  await expect(name).toHaveValue('You');
  await name.fill('  Night   Owl ');
  await popup.getByRole('button', { name: 'Save' }).click();
  await expect(name).toHaveValue('Night Owl');

  const page = await openTwitch('/fixturestreamer');
  await page.getByRole('button', { name: 'Cheer (fake)' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '10,000', exact: true }).click();
  await dialog.getByRole('button', { name: 'Cheer 10,000 bits' }).click();

  const line = page.locator('[data-fakebits="cheer"]');
  await expect(line).toContainText('Night Owl');
  // Red tier, biggest gem.
  await expect(line.locator('.line')).toHaveCSS('border-left-color', 'rgb(244, 48, 33)');
  await expect(line.locator('svg')).toHaveCSS('width', '30px');
});

test('reset wallet asks twice and keeps the settings', async ({
  openPopup,
  seedBits,
  readLedger,
}) => {
  await seedBits(500);
  const popup = await openPopup();
  await popup.getByRole('navigation').getByRole('button', { name: 'Settings' }).click();
  await popup.getByLabel('Name on your chat lines').fill('Keeper');
  await popup.getByRole('button', { name: 'Save' }).click();

  await expect(popup.getByText('Deletes 1 entry, 500 bits', { exact: false })).toBeVisible();
  await popup.getByRole('button', { name: 'Reset wallet' }).click();
  // First tap only arms the button.
  expect((await readLedger())?.balanceBits).toBe(500);
  await popup.getByRole('button', { name: 'Tap again to delete everything' }).click();

  await expect(popup.getByText('Wallet cleared. Your settings were kept.')).toBeVisible();
  expect(await readLedger()).toBeUndefined();
  await expect(popup.getByLabel('Name on your chat lines')).toHaveValue('Keeper');

  await popup.getByRole('navigation').getByRole('button', { name: 'Home' }).click();
  await expect(popup.getByText('0 bits', { exact: true })).toBeVisible();
});

test('the reset button disarms itself', async ({ openPopup, seedBits, readLedger }) => {
  await seedBits(100);
  const popup = await openPopup();
  await popup.getByRole('navigation').getByRole('button', { name: 'Settings' }).click();
  await popup.getByRole('button', { name: 'Reset wallet' }).click();
  await expect(popup.getByRole('button', { name: 'Reset wallet' })).toBeVisible({
    timeout: 6000,
  });
  expect((await readLedger())?.balanceBits).toBe(100);
});

test('resisting starts a streak on the home screen', async ({ openPopup }) => {
  const popup = await openPopup();
  await expect(popup.getByTestId('streak')).toHaveCount(0);
  await popup.getByRole('button', { name: 'I wanted to cheer but didn’t' }).click();
  await expect(popup.getByTestId('streak')).toHaveText('1-day streak');
});

test('sound follows the setting', async ({ context, openPopup, seedBits }) => {
  // Count synthesized notes in extension pages.
  await context.addInitScript(() => {
    const w = window as unknown as { __notes: number };
    w.__notes = 0;
    const original = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function (this: AudioContext) {
      w.__notes += 1;
      return original.call(this);
    };
  });
  await seedBits(1000);
  const popup = await openPopup();
  const notes = () => popup.evaluate(() => (window as unknown as { __notes: number }).__notes);
  const nav = popup.getByRole('navigation');

  const cheerOnce = async () => {
    await nav.getByRole('button', { name: 'Cheer' }).click();
    await popup.getByLabel('Channel').fill('somestreamer');
    await popup.getByRole('button', { name: '1', exact: true }).click();
    await popup.getByRole('button', { name: 'Cheer 1 bits' }).click();
    await expect(popup.getByText('You cheered 1 bits')).toBeVisible();
  };

  await cheerOnce();
  await expect.poll(notes).toBeGreaterThan(0);

  await nav.getByRole('button', { name: 'Settings' }).click();
  await popup.getByLabel('Sound on buy and cheer').uncheck();
  const before = await notes();
  await cheerOnce();
  // Give an async cue time to (not) play.
  await popup.waitForTimeout(300);
  expect(await notes()).toBe(before);
});
