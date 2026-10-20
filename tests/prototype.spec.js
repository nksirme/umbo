import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { initialState } from '../src/model.js';

const main = (page) => page.locator('main');
const visit = (page, route = '') => page.goto(`/#/${route}`, { waitUntil: 'domcontentloaded' });
function samplePdf() {
  const stream = 'BT /F1 18 Tf 20 100 Td (UMBO PDF) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf);
}
async function account(page) {
  await main(page).getByRole('button', { name: 'Use sample details', exact: true }).click();
  await main(page).getByRole('button', { name: 'Create demo & continue' }).click();
}
async function createPersonal(page) {
  await visit(page, 'example/nia');
  await main(page).getByRole('button', { name: 'Use this template', exact: true }).click();
  await account(page);
}
async function publishPersonal(page) {
  await createPersonal(page);
  await main(page).getByRole('button', { name: 'Preview & review' }).click();
  await main(page).getByRole('button', { name: 'Publish demo profile' }).click();
  await expect(main(page).locator('.qr-image')).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  // Every journey is self-contained: no fonts, images, APIs or scripts may need the network.
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort();
  });
});

test('examples search, both filters, empty recovery and interactive public preview', async ({ page }) => {
  await visit(page, 'examples');
  await expect(main(page).locator('.example-card')).toHaveCount(6);
  await main(page).getByRole('button', { name: 'Explore the complete library' }).click();
  await expect(main(page).locator('.example-card')).toHaveCount(13);
  await main(page).getByRole('button', { name: 'Personal', exact: true }).click();
  await expect(main(page).locator('.example-card')).toHaveCount(6);
  await page.getByRole('searchbox', { name: 'Search examples' }).fill('  nia  ');
  await expect(main(page).locator('.example-card')).toHaveCount(1);
  await page.getByRole('searchbox').fill('No such person');
  await expect(main(page).getByRole('heading', { name: 'No connections found just yet.' })).toBeVisible();
  await main(page).getByRole('button', { name: 'Clear filters' }).click();
  await page.getByLabel('Use case', { exact: true }).selectOption('Products & offers');
  await expect(main(page).locator('.example-card')).toHaveCount(1);
  await main(page).getByRole('button', { name: 'View example' }).click();
  await main(page).getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(main(page).getByText('Contact details are restricted.', { exact: true })).toBeVisible();
  await expect(main(page).getByRole('button', { name: 'Save contact', exact: true })).toHaveCount(0);
  await main(page).getByRole('button', { name: 'About', exact: true }).click();
  await main(page).getByText('Inside the kit', { exact: true }).click();
  await expect(main(page).getByText(/A5 recycled notebook/)).toBeVisible();
});

test('homepage inspiration cards omit the emergency profile', async ({ page }) => {
  await visit(page);
  const cards = main(page).locator('.examples-preview-section .example-card');
  await expect(cards).toHaveCount(3);
  await expect(cards.filter({ hasText: 'My emergency profile' })).toHaveCount(0);
});

test('mobile examples stay paired and emergency profile sits beside Pamoja', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, 'examples');
  await main(page).getByRole('button', { name: 'Explore the complete library' }).click();
  const cards = main(page).locator('.example-card');
  await expect(cards).toHaveCount(13);
  const layout = await cards.evaluateAll((items) => items.map((item) => {
    const rect = item.getBoundingClientRect();
    return { name: item.querySelector('h3')?.textContent.trim(), x: rect.x, y: rect.y, width: rect.width };
  }));
  const pamoja = layout.find((card) => card.name === 'Pamoja Foundation');
  const emergency = layout.find((card) => card.name === 'My emergency profile');
  const last = layout.at(-1);
  expect(Math.abs(emergency.y - pamoja.y)).toBeLessThan(2);
  expect(emergency.x).toBeGreaterThan(pamoja.x);
  expect(last.width).toBeGreaterThan(pamoja.width * 1.8);
});

test('mobile filtered examples keep an even final card paired', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, 'examples?category=Personal');
  const cards = main(page).locator('.example-card');
  await expect(cards).toHaveCount(6);
  const widths = await cards.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().width));
  expect(widths.at(-1)).toBeCloseTo(widths[0], 1);
});

test('personal examples include child, pet, emergency and political profiles', async ({ page }) => {
  await visit(page, 'examples?category=Personal');
  await expect(main(page).locator('.example-card')).toHaveCount(6);
  await page.getByRole('searchbox', { name: 'Search examples' }).fill('emergency');
  await expect(main(page).getByRole('heading', { name: 'My emergency profile' })).toBeVisible();
  await main(page).locator('.example-card').filter({ hasText: 'My emergency profile' }).getByRole('button', { name: 'View example' }).click();
  await expect(main(page).getByRole('button', { name: 'Create for myself', exact: true })).toBeVisible();
  await expect(main(page).getByRole('button', { name: 'Create for a child', exact: true })).toBeVisible();
  await main(page).getByRole('button', { name: 'Create for a child', exact: true }).click();
  await account(page);
  await expect(main(page).getByRole('heading', { name: 'Make it yours.' })).toBeVisible();
  await expect(main(page).getByLabel('Profile name')).toHaveValue('Your child’s profile');
  await expect(main(page).getByLabel('Headline')).toHaveValue('A calm, clear way to help them get home.');
});

test('emergency example can generate a personal emergency profile', async ({ page }) => {
  await visit(page, 'example/emergency-self');
  await main(page).getByRole('button', { name: 'Create for myself', exact: true }).click();
  await account(page);
  await expect(main(page).getByLabel('Profile name')).toHaveValue('Alex Kimani');
  await expect(main(page).getByLabel('Headline')).toHaveValue('The details that matter in a moment.');
  await main(page).getByRole('button', { name: 'Sections', exact: true }).click();
  await expect(main(page).getByLabel('Section 1 title')).toHaveValue('If I need help');
});

test('organization examples include a political party profile', async ({ page }) => {
  await visit(page, 'examples?category=Organizations');
  await page.getByRole('searchbox', { name: 'Search examples' }).fill('political party');
  await expect(main(page).getByRole('heading', { name: 'Umoja Civic Party' })).toBeVisible();
  await main(page).locator('.example-card').filter({ hasText: 'Umoja Civic Party' }).getByRole('button', { name: 'View example' }).click();
  await expect(main(page).locator('.detail-hero h1')).toHaveText('Umoja Civic Party');
  await expect(main(page).locator('.detail-hero h1')).toHaveText('Umoja Civic Party');
  await expect(main(page).getByText('Political parties', { exact: true })).toBeVisible();
});

test('the local server serves the production release bundle', async ({ page }) => {
  await visit(page);
  await expect(page.locator('[data-build-mode="production"]')).toContainText('Production release');
  await expect(page.locator('[data-build-mode="production"]')).toContainText('Local browser data');
  await expect(page.locator('#startup-fallback')).toHaveCount(0);
});

test('main menu stays sticky and back to top returns to the page start', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, 'examples');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.locator('[data-sticky-header]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to top' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to top' }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
  await expect(page.getByRole('button', { name: 'Back to top' })).toHaveCount(0);
});

test('SmartMerch artwork keeps the complete product composition visible on home and hero', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page);
  const homeImage = main(page).locator('.home-merch .merch-photo-wrap img');
  await expect(homeImage).toHaveCSS('object-fit', 'contain');
  await expect(homeImage).toHaveAttribute('alt', /card, desk stand and key fob/i);
  await homeImage.scrollIntoViewIfNeeded();
  await expect.poll(() => homeImage.evaluate((image) => ({ naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight }))).toEqual({ naturalWidth: 1366, naturalHeight: 678 });
  await visit(page, 'smartmerch');
  const heroImage = main(page).locator('.merch-hero .merch-photo-wrap img');
  await expect(heroImage).toHaveCSS('object-fit', 'contain');
  await expect(heroImage).toHaveAttribute('alt', /card, desk stand and key fob/i);
  const box = await heroImage.boundingBox();
  expect(box.width / box.height).toBeGreaterThan(1.8);
});

test('Explore the preview opens a profile-only visitor view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, 'example/maji');
  await main(page).getByRole('button', { name: 'Explore the preview', exact: true }).click();
  await expect(page).toHaveURL(/#\/profile-preview\/maji$/);
  await expect(main(page).locator('.full-profile-preview-page .public-builder-preview')).toBeVisible();
  await expect(main(page).getByLabel('Public profile preview').getByRole('heading', { name: 'Maji House', exact: true })).toBeVisible();
  await expect(main(page).getByText('A little closer to the coast.', { exact: true })).toBeVisible();
  await expect(main(page).getByText('A purpose behind every profile', { exact: true })).toHaveCount(0);
});

test('mobile personal journey persists template, inputs, style, images, privacy and a stable published URL', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'userAgent', { configurable: true, get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' }));
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await createPersonal(page);
  await expect(main(page).getByText(/Personal profile · Professional card/)).toBeVisible();
  await page.getByLabel('Profile name', { exact: true }).fill('Alex Kimani');
  await page.getByLabel('Headline', { exact: true }).fill('Independent designer in Nairobi.');
  await page.getByLabel('Biography', { exact: true }).fill('A clear place for my work and my next collaboration.');
  await page.getByLabel('Upload profile image').setInputFiles('public/images/business.jpg');
  await page.getByLabel('Profile image horizontal position').fill('18');
  await page.getByLabel('Profile image vertical position').fill('82');
  await main(page).getByRole('button', { name: 'Links', exact: true }).click();
  await page.getByLabel('Website or portfolio').fill('example.com/work');
  await page.getByLabel('Add a social platform').selectOption('instagram');
  await main(page).getByRole('button', { name: 'Add platform', exact: true }).click();
  await page.getByLabel('Instagram profile').fill('@alex.design');
  await page.getByLabel('Add a social platform').selectOption('github');
  await main(page).getByRole('button', { name: 'Add platform', exact: true }).click();
  await page.getByLabel('GitHub profile').fill('github.com/alex-design');
  await main(page).getByRole('button', { name: 'Files', exact: true }).click();
  const communityImage = await readFile('public/images/community.jpg');
  await page.getByLabel('Upload profile files').setInputFiles([
    { name: 'brochure.pdf', mimeType: 'application/pdf', buffer: samplePdf() },
    { name: 'community.jpg', mimeType: 'image/jpeg', buffer: communityImage },
  ]);
  await page.getByLabel('File button name 1').fill('Download brochure');
  await page.getByLabel('File button name 2').fill('View portfolio');
  await main(page).getByRole('button', { name: 'Style', exact: true }).click();
  await page.getByLabel('Upload cover image').setInputFiles('public/images/community.jpg');
  await page.getByLabel('Cover image horizontal position').fill('72');
  await page.getByLabel('Cover image vertical position').fill('24');
  await page.getByRole('button', { name: 'purple accent' }).click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(main(page).locator('.storage-warning')).toHaveCount(0);
  const storedState = await page.evaluate(() => JSON.parse(localStorage.getItem('umbo.prototype.v2')));
  expect(storedState.profiles.personal.draft.files[0].dataUrl).toBe('');
  expect(storedState.profiles.personal.draft.files[0].storageKey).toMatch(/^profile:personal:draft:file:/);
  await main(page).getByRole('button', { name: 'Style', exact: true }).click();
  await expect(page.getByRole('button', { name: 'purple accent' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Cover image horizontal position')).toHaveValue('72');
  await expect(page.getByLabel('Cover image vertical position')).toHaveValue('24');
  await expect(page.getByAltText('Cover image preview')).toHaveAttribute('src', /^data:image\/jpeg/);
  await main(page).getByRole('button', { name: 'Files', exact: true }).click();
  await expect(page.getByLabel('File button name 1')).toHaveValue('Download brochure');
  await expect(page.getByLabel('File button name 2')).toHaveValue('View portfolio');
  await expect(main(page).getByText('You have reached the 2-file limit.', { exact: false })).toBeVisible();
  await main(page).getByRole('button', { name: 'Live preview', exact: true }).click();
  await expect(main(page).getByRole('heading', { name: 'Alex Kimani', exact: true })).toBeVisible();
  await expect(main(page).locator('.builder-avatar img')).toHaveAttribute('src', /^data:image\/jpeg/);
  await expect(main(page).locator('.builder-avatar img')).toHaveCSS('object-position', '18% 82%');
  await expect(main(page).locator('.builder-cover')).toHaveCSS('background-position', /72% 24%/);
  const profileFiles = main(page).locator('.profile-file-list');
  await expect(profileFiles.getByRole('button', { name: 'Download brochure', exact: true })).toBeVisible();
  await expect(profileFiles.getByRole('button', { name: 'View portfolio', exact: true })).toBeVisible();
  const fileButtonBoxes = await profileFiles.getByRole('button').evaluateAll((buttons) => buttons.map((button) => { const box = button.getBoundingClientRect(); return { top: box.top, left: box.left }; }));
  expect(fileButtonBoxes).toHaveLength(2);
  expect(Math.abs(fileButtonBoxes[0].top - fileButtonBoxes[1].top)).toBeLessThan(2);
  expect(fileButtonBoxes[0].left).not.toBe(fileButtonBoxes[1].left);
  await profileFiles.getByRole('button', { name: 'Download brochure', exact: true }).click();
  const pdfDialog = main(page).getByRole('dialog');
  await expect(pdfDialog.locator('canvas')).toBeVisible();
  const pdfDownloadPromise = page.waitForEvent('download');
  await pdfDialog.getByRole('button', { name: 'Download file', exact: true }).click();
  const pdfDownload = await pdfDownloadPromise;
  expect(pdfDownload.suggestedFilename()).toBe('brochure.pdf');
  const pdf = await readFile(await pdfDownload.path());
  expect(pdf.toString('utf8')).toContain('%PDF-1.4');
  await pdfDialog.getByRole('button', { name: 'Close file preview', exact: true }).click();
  await profileFiles.getByRole('button', { name: 'View portfolio', exact: true }).click();
  const imageDialog = main(page).getByRole('dialog');
  await expect(imageDialog.getByRole('img', { name: 'Preview of View portfolio' })).toBeVisible();
  const imageDownloadPromise = page.waitForEvent('download');
  await imageDialog.getByRole('button', { name: 'Download file', exact: true }).click();
  const imageDownload = await imageDownloadPromise;
  expect(imageDownload.suggestedFilename()).toBe('community.jpg');
  await imageDialog.getByRole('button', { name: 'Close file preview', exact: true }).click();
  await expect(main(page).getByRole('link', { name: 'Website', exact: true })).toBeVisible();
  await expect(main(page).getByRole('link', { name: 'Instagram', exact: true })).toBeVisible();
  await expect(main(page).getByRole('link', { name: 'GitHub', exact: true })).toBeVisible();
  await main(page).getByRole('button', { name: 'Review visibility', exact: true }).click();
  await page.getByRole('switch', { name: 'Public social links' }).click();
  await expect(main(page).getByRole('link', { name: 'Website', exact: true })).toHaveCount(0);
  await page.getByRole('switch', { name: 'Public profile basics' }).click();
  await expect(main(page).getByRole('button', { name: 'Publish demo profile' })).toBeDisabled();
  await expect(main(page).getByText('This profile is restricted.', { exact: true })).toBeVisible();
  await page.getByRole('switch', { name: 'Public profile basics' }).click();
  await main(page).getByRole('button', { name: 'Publish demo profile' }).click();
  await expect(main(page).locator('.qr-image')).toBeVisible();
  await main(page).getByRole('button', { name: 'Copy sample profile link' }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('https://umbo.me/alex-kimani');
  const downloadPromise = page.waitForEvent('download');
  await main(page).getByRole('button', { name: 'Download QR · SVG' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('umbo-alex-kimani-qr.svg');
  const svg = await readFile(await download.path(), 'utf8');
  expect(svg).toContain('<svg'); expect(svg).toContain('#061e49'); expect(svg.length).toBeGreaterThan(1000);
  const localUrl = await main(page).locator('.qr-image').getAttribute('data-qr-value');
  await page.goto(localUrl, { waitUntil: 'domcontentloaded' });
  await expect(main(page).getByRole('heading', { name: 'Alex Kimani', exact: true })).toBeVisible();
  await expect(main(page).getByRole('link', { name: 'Website', exact: true })).toHaveCount(0);
  await expect(main(page).locator('.profile-file-list').getByRole('button', { name: 'Download brochure', exact: true })).toBeVisible();
  await main(page).getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(main(page).getByText('Contact details are restricted.', { exact: true })).toBeVisible();
  await visit(page, 'builder/personal');
  await page.getByLabel('Profile name', { exact: true }).fill('Alex Newname');
  await visit(page, 'p/personal/alex-kimani');
  await expect(main(page).getByRole('heading', { name: 'Alex Kimani', exact: true })).toBeVisible();
  await visit(page, 'review/personal');
  await page.getByRole('switch', { name: 'Public contact details' }).click();
  await main(page).getByRole('button', { name: 'Publish demo update' }).click();
  await expect(main(page).locator('.success-url')).toHaveText('https://umbo.me/alex-kimani');
  await visit(page, 'p/personal/alex-kimani');
  await main(page).getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(main(page).getByRole('link', { name: 'alex@example.com' })).toBeVisible();
  await expect(main(page).getByRole('heading', { name: 'Alex Newname', exact: true })).toBeVisible();
  await expect(main(page).getByRole('button', { name: 'Save contact', exact: true })).toBeVisible();
  const contactDownloadPromise = page.waitForEvent('download');
  await main(page).getByRole('button', { name: 'Save contact', exact: true }).click();
  const contactDownload = await contactDownloadPromise;
  expect(contactDownload.suggestedFilename()).toBe('alex-newname.vcf');
  const vcard = await readFile(await contactDownload.path(), 'utf8');
  expect(vcard).toContain('BEGIN:VCARD');
  expect(vcard).toContain('FN:Alex Newname');
  expect(vcard).toContain('EMAIL;TYPE=INTERNET:alex@example.com');
});

test('mobile save contact uses the native vCard share flow when contact details are public', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'userAgent', { configurable: true, get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' });
    Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(Navigator.prototype, 'share', { configurable: true, value: async (payload) => { window.__sharedContact = { title: payload.title, fileName: payload.files?.[0]?.name, type: payload.files?.[0]?.type, body: payload.files?.[0] ? await payload.files[0].text() : '' }; } });
  });
  await createPersonal(page);
  await main(page).getByRole('button', { name: 'Preview & review' }).click();
  await main(page).getByRole('switch', { name: 'Public contact details' }).click();
  await main(page).getByRole('button', { name: 'Connect', exact: true }).click();
  await main(page).getByRole('button', { name: 'Save contact', exact: true }).click();
  const sharedContact = await page.evaluate(() => window.__sharedContact);
  expect(sharedContact).toMatchObject({ title: 'Alex Kimani contact', fileName: 'alex-kimani.vcf', type: 'text/vcard;charset=utf-8' });
  expect(sharedContact.body).toContain('EMAIL;TYPE=INTERNET:alex@example.com');
});

test('business template carries through evidence and only reviewer approval unlocks publication', async ({ page }) => {
  await visit(page, 'example/maji');
  await main(page).getByRole('button', { name: 'Use this template', exact: true }).click();
  await expect(main(page).locator('.selected-template').getByText('Stay & dine', { exact: true })).toBeVisible();
  await account(page);
  await expect(page).toHaveURL(/application\/business/);
  await main(page).getByRole('button', { name: 'Use sample application details' }).click();
  await main(page).getByRole('button', { name: 'Continue to evidence' }).click();
  await main(page).getByRole('button', { name: 'Submit demo application' }).click();
  await expect(main(page).getByText('Choose an evidence file or use the sample document.')).toBeVisible();
  await main(page).getByRole('button', { name: 'Use sample evidence' }).click();
  await main(page).getByRole('checkbox').check();
  await main(page).getByRole('button', { name: 'Submit demo application' }).click();
  await expect(main(page).getByRole('heading', { name: 'Your application is in review.' })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(main(page).getByText('Stay & dine', { exact: true })).toHaveCount(2);
  await visit(page, 'review/business');
  await expect(main(page).getByRole('button', { name: 'Publish demo profile' })).toBeDisabled();
  await visit(page, 'admin');
  await expect(main(page).getByRole('button', { name: 'Approve application' })).toHaveCount(0);
  await main(page).getByRole('button', { name: 'Enter simulated reviewer role' }).click();
  await main(page).getByLabel('Reviewer note').fill('Demo registration and authorization checked.');
  await main(page).getByRole('button', { name: 'Approve application' }).click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(main(page).getByRole('button', { name: 'Enter simulated reviewer role' })).toBeVisible();
  await visit(page, 'application/organization');
  await expect(main(page).getByLabel('Organization name', { exact: true })).toBeVisible();
  await visit(page, 'application/business');
  await expect(main(page).getByRole('heading', { name: 'Your workspace is approved.' })).toBeVisible();
  await main(page).getByRole('button', { name: 'Customize your profile' }).click();
  await expect(main(page).getByText(/Business profile · Stay & dine/)).toBeVisible();
  await main(page).getByRole('button', { name: 'Preview & review' }).click();
  await main(page).getByRole('button', { name: 'Publish demo profile' }).click();
  await expect(main(page).locator('.success-url')).toHaveText('https://umbo.me/kijani-studio');
});

test('organization requests for evidence and rejection have actionable notes and separate records', async ({ page }) => {
  await visit(page, 'account'); await account(page);
  await visit(page, 'reviewer');
  await main(page).getByRole('button', { name: 'Enter simulated reviewer role' }).click();
  await main(page).getByRole('button', { name: 'Load sample applications' }).click();
  await main(page).getByRole('button', { name: /Pamoja Foundation.*Organizations/ }).click();
  await main(page).getByRole('button', { name: 'Request more evidence' }).click();
  await expect(main(page).getByRole('alert')).toHaveText(/Add a reviewer note/);
  await main(page).getByLabel('Reviewer note').fill('Please add a letter authorizing this applicant.');
  await main(page).getByRole('button', { name: 'Request more evidence' }).click();
  await visit(page, 'application/organization');
  await expect(main(page).getByText('Please add a letter authorizing this applicant.', { exact: true })).toBeVisible();
  await main(page).getByRole('button', { name: 'Update application' }).click();
  await main(page).getByRole('button', { name: 'Continue to evidence' }).click();
  await main(page).getByRole('button', { name: 'Use sample evidence' }).click();
  await main(page).getByRole('button', { name: 'Submit demo application' }).click();
  await visit(page, 'admin');
  await main(page).getByRole('button', { name: /Pamoja Foundation.*Organizations/ }).click();
  await main(page).getByLabel('Reviewer note').fill('Demo authorization did not match the applicant. Submit a revised application.');
  await main(page).getByRole('button', { name: 'Reject application' }).click();
  await visit(page, 'application/organization');
  await expect(main(page).getByRole('heading', { name: 'This application wasn’t approved.' })).toBeVisible();
  await expect(main(page).getByRole('button', { name: 'Update application' })).toBeVisible();
  await visit(page, 'application/business');
  await expect(main(page).getByRole('heading', { name: 'Your application is in review.' })).toBeVisible();
  await visit(page, 'admin');
  await main(page).getByRole('button', { name: 'Decision records' }).click();
  await expect(main(page).getByText('Reviewer: rejected', { exact: true })).toBeVisible();
});

test('SmartMerch personalization, destination and indicative quote persist into the dashboard', async ({ page }) => {
  await publishPersonal(page);
  await visit(page, 'smartmerch?kind=personal');
  await main(page).getByRole('button', { name: /Desk stand.*A welcome/ }).click();
  await main(page).getByRole('button', { name: 'Mint', exact: true }).click();
  await main(page).getByLabel('Name or short message').fill('Hello, I’m Alex.');
  await main(page).getByLabel('Quantity', { exact: true }).fill('3');
  await expect(main(page).locator('.product-render--stand.product-render--mint')).toBeVisible();
  await expect(main(page).locator('.product-render strong')).toHaveText('Hello, I’m Alex.');
  await expect(main(page).locator('.merch-destination-card')).toContainText('https://umbo.me/alex-kimani');
  await main(page).getByRole('button', { name: 'Request demo quote' }).click();
  await expect(main(page).locator('.quote-receipt')).toContainText('KSh 4,950');
  await expect(main(page).locator('.quote-receipt')).toContainText('No order, payment or email was sent.');
  await visit(page, 'dashboard');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(main(page).getByText('Desk stand · 3 × Mint', { exact: true })).toBeVisible();
  await visit(page, 'smartmerch');
  await expect(main(page).getByLabel('Quantity', { exact: true })).toHaveValue('3');
});

test('sharing links and flow overview cannot publish a draft accidentally', async ({ page }) => {
  await visit(page, 'share/personal');
  await expect(main(page).getByRole('heading', { name: 'A little more to do before sharing.' })).toBeVisible();
  await visit(page, 'p/personal/no-profile');
  await expect(main(page).getByRole('heading', { name: 'This profile is still a draft.' })).toBeVisible();
  await visit(page, 'flow');
  await main(page).locator('.journey-item').filter({ hasText: 'Publish & share' }).getByRole('link', { name: 'Explore' }).click();
  await expect(main(page).getByRole('heading', { name: 'A little more to do before sharing.' })).toBeVisible();
});

test('legacy saved data cannot blank the builder, review or dashboard', async ({ page }) => {
  const saved = initialState();
  saved.authenticated = true;
  saved.account = { name: 'Demo member', email: 'demo@example.com' };
  saved.activeKind = 'legacy-personal';
  saved.selectedTemplateId = 'retired-template';
  saved.profiles.personal.draft.name = 'My saved introduction';
  saved.profiles.personal.draft.sections = { legacy: true };
  saved.profiles.personal.draft.headline = null;
  saved.quotes = null;
  saved.records = [null];
  await page.addInitScript((value) => localStorage.setItem('umbo.prototype.v2', JSON.stringify(value)), saved);
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await visit(page, 'builder/personal');
  await expect(page.getByLabel('Profile name', { exact: true })).toHaveValue('My saved introduction');
  await main(page).getByRole('button', { name: 'Sections', exact: true }).click();
  await expect(page.getByLabel('Section 1 title')).toBeVisible();
  await visit(page, 'review/personal');
  await expect(main(page).getByRole('button', { name: 'Publish demo profile' })).toBeEnabled();
  await visit(page, 'dashboard');
  await expect(main(page).getByRole('heading', { name: 'Hello, Demo.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('a failed application module shows a reload screen and recovers without clearing data', async ({ page }) => {
  await page.route('**/assets/*.js', (route) => route.abort('failed'));
  await visit(page);
  await expect(page.getByRole('heading', { name: 'UMBO couldn’t finish loading.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reload UMBO' })).toBeVisible();
  await page.unroute('**/assets/*.js');
  await page.getByRole('button', { name: 'Reload UMBO' }).click();
  await expect(main(page).getByRole('heading', { level: 1 })).toHaveText('Your profile.Your business.Your connection.');
  await expect(page.locator('#startup-fallback')).toHaveCount(0);
});

test('an unexpected render failure has a working return-to-home recovery', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Object.fromEntries;
    window.__simulateRenderFailure = true;
    Object.fromEntries = function (...args) {
      if (window.__simulateRenderFailure) throw new Error('Simulated unavailable browser feature');
      return original.apply(this, args);
    };
  });
  await visit(page, 'builder/personal');
  await expect(page.getByRole('heading', { name: 'This view couldn’t open.' })).toBeVisible();
  await page.evaluate(() => { window.__simulateRenderFailure = false; });
  await page.getByRole('link', { name: 'Return to homepage' }).click();
  await expect(main(page).getByRole('heading', { level: 1 })).toHaveText('Your profile.Your business.Your connection.');
  await expect(page.locator('.boot-screen')).toHaveCount(0);
});

for (const width of [375, 768, 1440]) {
  test(`main layouts fit ${width}px without horizontal overflow or missing assets`, async ({ page }) => {
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await visit(page, 'account'); await account(page);
    for (const route of ['', 'examples', 'example/amina', 'builder/personal', 'review/personal', 'dashboard', 'application/business', 'workspace/business', 'workspace/organization', 'smartmerch', 'design', 'flow', 'reviewer']) {
      await visit(page, route);
      await expect(main(page)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `overflow at ${route}, ${width}px`).toBe(true);
      const missing = await page.locator('img').evaluateAll((images) => images.filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.src));
      expect(missing, `missing assets at ${route}`).toEqual([]);
    }
    expect(errors).toEqual([]);
    await visit(page);
    await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
    if (width === 375) {
      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
      await page.locator('#main-nav').getByRole('link', { name: 'Examples', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
    }
  });
}
