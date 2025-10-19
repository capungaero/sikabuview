const puppeteer = require('puppeteer');
const expect = require('chai').expect;

describe('Integration: booking -> payment -> finance', function() {
  this.timeout(30000);
  let browser;
  let page;

  before(async () => {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    page = await browser.newPage();
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
  });

  after(async () => {
    if (browser) await browser.close();
  });

  it('creates a booking and processes payment that appears in finance', async () => {
    // Open booking tab
    await page.click('a[data-tab="booking"]');
    await page.waitForSelector('#add-booking-form', { visible: false });

    // Show add booking form
    await page.click('button[onclick="showAddBookingForm()"]');
    await page.waitForSelector('#add-booking-form', { visible: true });

    // Fill booking form
    const now = new Date();
    const bookingDate = now.toISOString().split('T')[0];
    const checkin = new Date(now);
    checkin.setDate(checkin.getDate() + 1);
    const checkout = new Date(now);
    checkout.setDate(checkout.getDate() + 2);

    await page.type('#guest-id', 'TESTG1');
    await page.type('#guest-name', 'Integration Tester');
    await page.type('#guest-phone', '08123456789');
    await page.evaluate((d) => document.querySelector('#booking-date').value = d, bookingDate);
    await page.evaluate((d) => document.querySelector('#checkin-date').value = d, checkin.toISOString().split('T')[0]);
    await page.evaluate((d) => document.querySelector('#checkout-date').value = d, checkout.toISOString().split('T')[0]);
    await page.select('#booking-type', 'kamar');
    await page.type('#booking-quantity', '1');
    await page.type('#booking-price', '100000');

    // Submit
    await page.click('#add-booking-form button[type="submit"]');

    // Wait for booking list to update
    await page.waitForFunction(() => document.querySelectorAll('#booking-list tr').length > 0, { timeout: 5000 });

    // Find the booking row containing 'Integration Tester'
    const rows = await page.$$eval('#booking-list tr', trs => trs.map(tr => tr.innerText));
    const found = rows.find(r => r.includes('Integration Tester'));
    expect(found).to.exist;

    // Click Bayar button in that row
    await page.evaluate(() => {
      const trs = Array.from(document.querySelectorAll('#booking-list tr'));
      const tr = trs.find(t => t.innerText.includes('Integration Tester'));
      const payBtn = tr.querySelector('button.pay');
      if (payBtn) payBtn.click();
    });

    // Wait for payment modal (we used window.showModal) - modal has id 'modal'
    await page.waitForSelector('#modal', { visible: true });

    // Click Konfirmasi Bayar button inside modal
    await page.evaluate(() => {
      const btn = document.querySelector('#confirm-payment-btn') || document.querySelector('#modal .btn-success');
      if (btn) btn.click();
    });

    // Allow some time for DB updates
    await page.waitForTimeout(500);

    // Go to Finance tab
    await page.click('a[data-tab="finance"]');
    await page.waitForSelector('#finance', { visible: true });

    // Wait for finance table to show a row containing 'Integration Tester' or amount
    const financeHas = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#finance-transactions tr'));
      return rows.some(r => r.innerText.includes('Integration Tester') || r.innerText.includes('100000'));
    });

    expect(financeHas).to.be.true;
  });
});
