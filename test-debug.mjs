import { chromium } from 'playwright';

async function testApp() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('📍 Navigating to login page...');
  await page.goto('http://localhost:3000/login');

  await page.fill('input[name="email"]', 'admin@masjid.local');
  await page.fill('input[name="password"]', 'ChangeMe123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
  console.log('✅ Logged in, URL:', page.url());

  console.log('📍 Navigating to collections/new...');
  await page.goto('http://localhost:3000/collections/new');
  await page.waitForLoadState('networkidle');
  console.log('URL:', page.url());

  // Wait for form to load
  await page.waitForSelector('#amount', { state: 'visible', timeout: 10000 });
  console.log('Form loaded');

  console.log('📝 Test: Walk-in donor with random amount...');
  // Don't select a member - use walk-in
  await page.fill('#amount', '150.00');
  const today = new Date().toISOString().split('T')[0];
  await page.fill('#date', today);
  await page.selectOption('#mode', 'CASH');

  // Add allocation
  await page.click('button:has-text("Add allocation")');
  await page.waitForTimeout(500);

  // Select category
  await page.selectOption('select:near(:text("Category"))', { index: 1 });
  await page.waitForTimeout(200);

  // Fill amount in allocation
  await page.fill('input:near(:text("Amount")):not(#amount)', '150.00');
  await page.waitForTimeout(200);

  console.log('💰 Submitting payment...');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);

  console.log('URL after submit:', page.url());

  if (page.url().includes('/receipts/')) {
    console.log('✅ Success! Receipt created.');
    const receiptNo = await page.locator('text=/MSA-/').first().textContent();
    console.log(`📄 Receipt: ${receiptNo}`);
  } else {
    const error3 = await page.locator('[role="alert"]').textContent().catch(() => null);
    console.log('Error:', error3);
    const pageText = await page.textContent('body');
    console.log('Page:', pageText.substring(0, 1500));
  }

  await browser.close();
}

testApp().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});