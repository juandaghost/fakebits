import { expect, test } from './fixtures';

test('empty wallet', async ({ openPopup }) => {
  const popup = await openPopup();
  await expect(popup.getByText('Balance')).toBeVisible();
  await expect(popup.getByText('$0.00')).toBeVisible();
  await expect(popup.getByText('No cravings beaten yet.', { exact: false })).toBeVisible();
  await expect(
    popup.getByText('Nothing is sent anywhere. No real money.', { exact: false }),
  ).toBeVisible();
});

test('buy, cheer, resist and filter the history', async ({
  openPopup,
  readLedger,
  outboundRequests,
}) => {
  const popup = await openPopup();
  const nav = popup.getByRole('navigation');

  // Buy 1,500 bits through the fake checkout.
  await popup.getByRole('button', { name: 'Buy bits' }).click();
  await popup.getByRole('button', { name: /^1,500 bits/ }).click();
  const pay = popup.getByRole('button', { name: 'Pay $19.95' });
  await expect(pay).toBeDisabled();
  await popup.getByLabel('Card number').fill('4242 4242 4242 4242');
  await popup.getByLabel('Expiry').fill('12/30');
  await popup.getByLabel('CVC').fill('999');
  await popup.getByLabel('Name on card').fill('Anyone');
  await pay.click();
  await expect(popup.getByRole('button', { name: 'Processing…' })).toBeVisible();
  await expect(popup.getByText('Purchase complete')).toBeVisible();
  await expect(popup.getByText('+1,500 bits added.', { exact: false })).toBeVisible();

  // Cheer 1,000 of them.
  await popup.getByRole('button', { name: 'Cheer now' }).click();
  await popup.getByLabel('Channel').fill('SomeStreamer');
  await popup.getByRole('button', { name: '1,000', exact: true }).click();
  await popup.getByLabel('Message').fill('gg');
  await expect(popup.getByText('500 left afterwards')).toBeVisible();
  await popup.getByRole('button', { name: 'Cheer 1,000 bits' }).click();
  await expect(popup.getByText('You cheered 1,000 bits to somestreamer')).toBeVisible();

  // A custom amount above the balance cannot be sent.
  await popup.getByRole('button', { name: 'Cheer again' }).click();
  await popup.getByLabel('Custom amount').fill('501');
  await expect(popup.getByRole('button', { name: 'Cheer 501 bits' })).toBeDisabled();
  await expect(popup.getByText('You have 500.')).toBeVisible();

  // "cheer<amount>" in the message sets the amount too.
  await popup.getByLabel('Message').fill('Cheer15 again');
  await expect(popup.getByRole('button', { name: 'Cheer 15 bits' })).toBeEnabled();
  await expect(popup.getByLabel('Custom amount')).toHaveValue('15');

  // Home shows the totals.
  await nav.getByRole('button', { name: 'Home' }).click();
  await expect(popup.getByText('500 bits', { exact: true })).toBeVisible();
  const saved = popup.locator('section', { hasText: 'Real money not spent' });
  await expect(saved).toContainText('$19.95');
  await expect(saved).toContainText('1 craving beaten');

  await popup.getByRole('button', { name: 'I wanted to cheer but didn’t' }).click();
  await expect(popup.getByRole('button', { name: 'Logged. Nice.' })).toBeVisible();
  await expect(popup.getByText('2 cravings beaten')).toBeVisible();

  // History filters by kind and channel.
  await nav.getByRole('button', { name: 'History' }).click();
  const rows = popup.locator('main li');
  await expect(rows).toHaveCount(3);
  await popup.getByRole('button', { name: 'Cheered' }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText('1,000 bits to somestreamer');
  await popup.getByRole('button', { name: 'All' }).click();
  await popup.getByLabel('Filter by channel').selectOption('somestreamer');
  await expect(rows).toHaveCount(1);

  const ledger = await readLedger();
  expect(ledger?.balanceBits).toBe(500);
  expect(ledger?.entries.map((e) => e.kind)).toEqual(['purchase', 'cheer', 'resisted']);
  expect(outboundRequests).toEqual([]);
});

test('the popup follows a cheer made on the page while it is open', async ({
  openPopup,
  openTwitch,
  seedBits,
}) => {
  await seedBits(1000);
  const popup = await openPopup();
  await expect(popup.getByText('1,000 bits', { exact: true })).toBeVisible();

  const page = await openTwitch('/fixturestreamer');
  await page.getByRole('button', { name: 'Cheer (fake)' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cheer 100 bits' }).click();
  await expect(page.locator('[data-fakebits="cheer"]')).toHaveCount(1);

  await expect(popup.getByText('900 bits', { exact: true })).toBeVisible();
  await expect(popup.getByText('100 bits to fixturestreamer')).toBeVisible();
});
