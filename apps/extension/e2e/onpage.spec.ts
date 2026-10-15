import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const cheerButton = (page: Page) => page.getByRole('button', { name: 'Cheer (fake)' });

test('cheering from the page adds a local-only chat line and spends fake bits', async ({
  openTwitch,
  seedBits,
  readLedger,
  outboundRequests,
}) => {
  await seedBits(1000);
  const page = await openTwitch('/fixturestreamer');

  // The chat renders late; the button must appear once it does.
  await cheerButton(page).click();

  const dialog = page.getByRole('dialog', { name: 'Fake cheer for FixtureStreamer' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('1,000 fake bits in your wallet')).toBeVisible();
  await expect(dialog.locator('header img')).toHaveAttribute(
    'src',
    'https://www.twitch.tv/fixture-avatar.svg',
  );

  await dialog.getByRole('button', { name: '500', exact: true }).click();
  await dialog.getByLabel('Message').fill('hello from the test');
  await dialog.getByRole('button', { name: 'Cheer 500 bits' }).click();

  await expect(dialog.getByText('You cheered 500 bits')).toBeVisible();
  await expect(dialog.getByText('It is in your chat now, visible only to you.')).toBeVisible();

  const line = page.locator(
    '[data-test-selector="chat-scrollable-area__message-container"] > [data-fakebits="cheer"]',
  );
  await expect(line).toHaveCount(1);
  await expect(line).toContainText('local only');
  await expect(line).toContainText('You');
  await expect(line).toContainText('500');
  await expect(line).toContainText('hello from the test');

  await dialog.getByRole('button', { name: 'Close' }).last().click();
  await expect(dialog).toBeHidden();

  const ledger = await readLedger();
  expect(ledger?.balanceBits).toBe(500);
  expect(ledger?.entries.at(-1)).toMatchObject({
    kind: 'cheer',
    bits: 500,
    channel: 'fixturestreamer',
    message: 'hello from the test',
  });

  // Hard rule 1: Twitch's own chat input is never written to or submitted.
  await expect(page.locator('[data-a-target="chat-input"]')).toHaveValue('');
  expect(
    await page.evaluate(() => (window as { __realChatTouched?: boolean }).__realChatTouched),
  ).toBe(false);
  expect(outboundRequests).toEqual([]);
});

test('the message is rendered as text, never as HTML', async ({ openTwitch, seedBits }) => {
  await seedBits(100);
  const page = await openTwitch('/fixturestreamer');
  await cheerButton(page).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '1', exact: true }).click();
  await dialog.getByLabel('Message').fill('<img src=x onerror="window.__xss=1">');
  await dialog.getByRole('button', { name: 'Cheer 1 bits' }).click();

  const line = page.locator('[data-fakebits="cheer"]');
  await expect(line).toContainText('<img src=x onerror="window.__xss=1">');
  await expect(line.locator('img')).toHaveCount(0);
  expect(await page.evaluate(() => (window as { __xss?: number }).__xss)).toBeUndefined();
});

test('the button follows SPA navigation between channels', async ({ openTwitch }) => {
  const page = await openTwitch('/fixturestreamer');
  await expect(cheerButton(page)).toHaveCount(1);

  await page.locator('#go-other').click();
  await expect(page).toHaveURL(/\/otherstreamer$/);
  await expect(cheerButton(page)).toHaveCount(1);

  await cheerButton(page).click();
  await expect(page.getByRole('dialog', { name: 'Fake cheer for OtherStreamer' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.locator('#go-directory').click();
  await expect(page).toHaveURL(/\/directory$/);
  await expect(cheerButton(page)).toHaveCount(0);
});

test('not enough bits: buy inside the modal, then cheer', async ({ openTwitch, readLedger }) => {
  const page = await openTwitch('/fixturestreamer');
  await cheerButton(page).click();
  const dialog = page.getByRole('dialog');

  await expect(dialog.getByRole('button', { name: 'Cheer 100 bits' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Buy more' }).click();

  await dialog.getByRole('button', { name: /^500 bits/ }).click();
  await dialog.getByLabel('Card number').fill('4242424242424242');
  await dialog.getByLabel('Expiry').fill('1230');
  await dialog.getByLabel('CVC').fill('123');
  await dialog.getByLabel('Name on card').fill('Nobody');
  await dialog.getByRole('button', { name: 'Pay $7.00' }).click();
  await expect(dialog.getByText('Purchase complete')).toBeVisible();

  await dialog.getByRole('button', { name: 'Cheer now' }).click();
  await dialog.getByRole('button', { name: 'Cheer 100 bits' }).click();
  await expect(page.locator('[data-fakebits="cheer"]')).toHaveCount(1);
  expect((await readLedger())?.balanceBits).toBe(400);
});

test('resisting from the modal logs a craving and sends nothing', async ({
  openTwitch,
  readLedger,
}) => {
  const page = await openTwitch('/fixturestreamer');
  await cheerButton(page).click();
  const dialog = page.getByRole('dialog');

  await dialog.getByRole('button', { name: /log that I resisted/ }).click();
  await expect(dialog.getByText('Logged. Nice.')).toBeVisible();
  await expect(page.locator('[data-fakebits]')).toHaveCount(0);
  expect((await readLedger())?.entries).toMatchObject([
    { kind: 'resisted', channel: 'fixturestreamer' },
  ]);
});

test('typing cheer<amount> in the message sets the amount, any case', async ({
  openTwitch,
  seedBits,
  readLedger,
}) => {
  await seedBits(5000);
  const page = await openTwitch('/fixturestreamer');
  await cheerButton(page).click();
  const dialog = page.getByRole('dialog');
  const message = dialog.getByLabel('Message');
  const custom = dialog.getByLabel('Custom amount');

  await message.fill('nice run Cheer1500');
  await expect(dialog.getByRole('button', { name: 'Cheer 1,500 bits' })).toBeVisible();
  await expect(custom).toHaveValue('1500');

  // A preset amount lights up its chip and clears the custom field.
  await message.fill('nice run CHEER500');
  await expect(dialog.getByRole('button', { name: 'Cheer 500 bits' })).toBeVisible();
  await expect(custom).toHaveValue('');

  // Picking a preset afterwards sticks while the cheer token stays the same.
  await dialog.getByRole('button', { name: '100', exact: true }).click();
  await message.fill('nice run CHEER500 gg');
  await expect(dialog.getByRole('button', { name: 'Cheer 100 bits' })).toBeVisible();

  // Several tokens add up, as on Twitch; not-a-token text is ignored.
  await message.fill('cheer10 and cheer5 but not cheer100!');
  await expect(dialog.getByRole('button', { name: 'Cheer 15 bits' })).toBeVisible();

  // Capped at 100,000.
  await message.fill('cheer250000');
  await expect(dialog.getByRole('button', { name: 'Cheer 100,000 bits' })).toBeDisabled();

  await message.fill('cheer42 for the PB');
  await dialog.getByRole('button', { name: 'Cheer 42 bits' }).click();
  await expect(page.locator('[data-fakebits="cheer"]')).toContainText('42');
  expect((await readLedger())?.entries.at(-1)).toMatchObject({
    kind: 'cheer',
    bits: 42,
    message: 'cheer42 for the PB',
  });
});
