function showModule(module) {
  const main = document.getElementById('main-content');
  if (module === 'booking') {
    main.innerHTML = `<h2>Modul Booking</h2><div id='booking-form'></div>`;
    // ...load booking form...
  } else if (module === 'payment') {
    main.innerHTML = `<h2>Modul Pembayaran</h2><div id='payment-form'></div>`;
    // ...load payment form...
  } else if (module === 'finance') {
    main.innerHTML = `<h2>Modul Keuangan</h2><div id='finance-report'></div>`;
    // ...load finance report...
  }
}
// Default load
showModule('booking');