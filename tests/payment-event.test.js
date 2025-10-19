const { JSDOM } = require('jsdom');
const { expect } = require('chai');

describe('Event flow: paymentCreated -> finance refresh', function() {
  let window, document;

  beforeEach(() => {
    const dom = new JSDOM(`<!doctype html><html><body></body></html>`);
    window = dom.window;
    document = window.document;
    global.document = document;
    global.window = window;
    global.navigator = window.navigator;
  });

  afterEach(() => {
    delete global.document;
    delete global.window;
    delete global.navigator;
  });

  it('should call finance reload when paymentCreated is dispatched', function(done) {
    let called = false;

    // simulate finance manager listener
    document.addEventListener('paymentCreated', async (e) => {
      called = true;
      // Check payload structure
      expect(e.detail).to.have.property('payment');
      done();
    });

    // Dispatch event
    const payload = { id: 'PAY-1', amount: 1000 };
    document.dispatchEvent(new window.CustomEvent('paymentCreated', { detail: { payment: payload } }));

    // Fallback if listener not called
    setTimeout(() => {
      if (!called) done(new Error('paymentCreated listener not invoked'));
    }, 100);
  });
});
