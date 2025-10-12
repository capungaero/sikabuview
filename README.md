# Sikabuview - Sistem Manajemen Penginapan Modern

![Status](https://img.shields.io/badge/status-active-success.svg)
![Version](https://img.shields.io/badge/version-2.0-blue.svg)

Aplikasi web modern untuk manajemen penginapan villa dan camping ground dengan interface yang elegan dan fitur lengkap.

## 🚀 Demo Live

**URL**: [https://capungaero.github.io/sikabuview](https://capungaero.github.io/sikabuview)

## ✨ Fitur Lengkap

### 📊 Dashboard Overview
- Statistik real-time booking hari ini
- Grafik pendapatan bulan berjalan
- Status okupansi kamar
- Aktivitas terbaru

### 🏨 Modul Booking
- Pencatatan booking tamu dengan detail lengkap
- Support multiple jenis akomodasi: Kamar, Villa, Tenda, Camping Ground
- Management status booking (Pending, Confirmed, Checked-in, Checked-out)
- Filter dan pencarian booking
- Print laporan booking

### 🚪 Check-in & Check-out
- Proses check-in tamu dengan validasi
- Check-out dengan kondisi kamar
- Update status real-time
- Notifikasi otomatis

### � Manajemen Pembayaran
- Proses pembayaran dengan multiple metode
- Pesanan tambahan (makanan, BBQ, sewa alat, dll)
- Riwayat pembayaran lengkap
- Cetak struk pembayaran

### 🧹 Housekeeping Management
- Jadwal cleaning kamar
- Task maintenance
- Inventory check
- Status monitoring

### 🛏️ Konfigurasi Kamar & Harga
- Master data kamar dan villa
- Setting harga per kategori
- Fasilitas dan kapasitas
- Status ketersediaan

### 👥 Database Tamu
- Registrasi tamu baru
- Riwayat menginap
- Data kontak dan identitas
- Rating dan feedback

### 📅 Kalender Ketersediaan
- Visual kalender booking
- Status ketersediaan real-time
- Legend status (Available, Booked, Maintenance, Check-in, Check-out)
- Navigasi bulan/minggu

### � Modul Keuangan
- Dashboard pendapatan dan pengeluaran
- Kategori transaksi lengkap
- Grafik trend keuangan
- Perhitungan profit margin

### 📈 Laporan & Analytics
- Occupancy Rate analysis
- Revenue per Room (RevPAR)
- Average Daily Rate (ADR)
- Booking trends
- Financial reports
- Guest analytics

### 💾 Data Management
- Backup dan restore data (JSON format)
- Database status monitoring
- Import/export data
- Reset data dengan konfirmasi

## 🎨 Modern UI/UX Features

- **Responsive Design**: Bekerja sempurna di desktop, tablet, dan mobile
- **Dark Sidebar**: Elegant dark sidebar dengan categorized menu
- **Icon System**: Font Awesome icons di seluruh aplikasi
- **Gradient Cards**: Modern gradient backgrounds untuk visual appeal
- **Smooth Animations**: Hover effects dan transitions
- **Status Badges**: Color-coded status badges
- **Clean Typography**: Inter font untuk readability

## 🛠️ Teknologi

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Database**: IndexedDB (browser local storage)
- **Icons**: Font Awesome 6.4
- **Fonts**: Google Fonts (Inter)
- **Architecture**: Modular JavaScript with clean separation
- **No Dependencies**: Pure vanilla JS, no frameworks needed

## 📦 Cara Menjalankan

### Development (Local)

```bash
# Clone repository
git clone https://github.com/capungaero/sikabuview.git
cd sikabuview

# Jalankan dengan Python HTTP server
python3 -m http.server 8000

# Atau dengan Node.js
npx http-server -p 8000

# Buka browser
http://localhost:8000
```

### Production Deployment

#### GitHub Pages (Recommended)
```bash
# 1. Push ke repository
git add .
git commit -m "Deploy Sikabuview"
git push origin main

# 2. Enable GitHub Pages
# - Buka Settings > Pages
# - Source: Deploy from branch
# - Branch: main / (root)
# - Save

# 3. Akses di: https://capungaero.github.io/sikabuview
```

#### Netlify
```bash
# Drag & drop folder ke Netlify Dashboard
# Atau connect GitHub repository
# Build settings: None (static site)
```

#### Vercel
```bash
vercel --prod
```

## 📁 Struktur Project

```
sikabuview/
├── index.html              # Main application
├── css/
│   ├── style-new.css       # Modern styling
│   └── print.css          # Print-specific styles
├── js/
│   ├── app.js             # Main application controller
│   ├── database.js        # IndexedDB management
│   ├── booking.js         # Booking module
│   ├── payment.js         # Payment processing
│   ├── finance.js         # Financial management
│   ├── advanced-features.js  # Rooms & check-in/out
│   ├── reports-housekeeping.js  # Reports & housekeeping
│   ├── modern-navigation.js  # Navigation system
│   └── print.js           # Print functionality
└── README.md
```

## 🔧 Konfigurasi

### Database
Aplikasi menggunakan IndexedDB untuk menyimpan data secara lokal di browser:
- **Bookings**: Data booking tamu
- **Payments**: Riwayat pembayaran
- **Guests**: Database tamu
- **Rooms**: Master kamar dan harga
- **Tasks**: Housekeeping tasks
- **Expenses**: Transaksi pengeluaran

### Backup & Restore
1. Buka menu **Data Management**
2. Klik **Export Data** untuk backup
3. Simpan file JSON di tempat aman
4. Untuk restore, klik **Import Data** dan pilih file backup

## 🚀 Deployment Status

✅ **Deployed to GitHub Pages**: https://capungaero.github.io/sikabuview

### Latest Updates
- ✅ Clean HTML structure rebuild
- ✅ Fixed navigation system (all 11 modules working)
- ✅ Enhanced UI with modern design
- ✅ Added comprehensive styling for all pages
- ✅ Validated HTML structure (balanced sections)
- ✅ Ready for production use

## 🎯 Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 📝 Lisensi

MIT License - Free to use for personal and commercial projects

## 👨‍💻 Developer

**Capungaero**
- GitHub: [@capungaero](https://github.com/capungaero)
- Repository: [sikabuview](https://github.com/capungaero/sikabuview)

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📞 Support

Jika ada pertanyaan atau butuh bantuan, silakan buka issue di GitHub repository.

---

**Built with ❤️ using Vanilla JavaScript**

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
