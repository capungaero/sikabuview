# SikaBu View - Manajemen Penginapan

Sistem manajemen penginapan untuk villa dan camping ground dengan 3 modul utama:

## Fitur Utama

### 🏨 Modul Booking
- Pencatatan booking tamu
- Detail ID tamu, tanggal, jenis pesanan
- Jenis: Kamar, Villa, Tenda, Sewa Camp Ground
- Harga dan notes khusus

### 💰 Modul Pembayaran  
- Checkout dan pembayaran tamu
- Total biaya penginapan
- Pesanan tambahan (makanan, BBQ, dll)

### 📊 Modul Keuangan
- Laporan pendapatan dan pengeluaran
- Rekapan transaksi lengkap
- Dashboard statistik

### ✨ Fitur Tambahan
- Fungsi cetak laporan
- Export/Import data (JSON, CSV)
- Database lokal (fallback jika offline)
- Responsive design

## Teknologi
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Database**: IndexedDB (browser local storage)
- **Deployment**: Static hosting ready

## Cara Menjalankan

### Development
```bash
npm install
npm run dev
```

### Production
```bash
npm run start
```

### Deploy ke Static Hosting

#### GitHub Pages
1. Push ke repository GitHub
2. Aktifkan GitHub Pages di Settings > Pages
3. Pilih branch `main` sebagai source

#### Netlify
1. Drag & drop folder project ke netlify.com
2. Atau connect dengan GitHub repository

#### Vercel
```bash
npx vercel --prod
```

## Struktur File
```
sikabuview/
├── index.html          # Main HTML file
├── css/
│   ├── style.css       # Main styles
│   └── print.css       # Print styles
├── js/
│   ├── app.js          # Main application
│   ├── database.js     # Database layer
│   ├── booking.js      # Booking module
│   ├── payment.js      # Payment module
│   ├── finance.js      # Finance module
│   └── print.js        # Print functionality
└── package.json        # Dependencies
```

## Browser Support
- Chrome/Edge 80+
- Firefox 75+
- Safari 13+

## Demo
Akses aplikasi di: [https://capungaero.github.io/sikabuview](https://capungaero.github.io/sikabuview)

## License
MIT License
