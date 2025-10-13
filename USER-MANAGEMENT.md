# 👥 User Management System - SikaBuView

## Overview
Sistem User Management untuk SikaBuView memungkinkan admin mengelola pengguna dengan level akses yang berbeda. Sistem ini menggunakan localStorage untuk penyimpanan data user dan menerapkan permission-based access control.

## User Levels & Permissions

### 1. 🔴 Administrator (admin)
**Full Access** - Dapat mengakses semua fitur dan menu
- ✅ Dashboard Overview
- ✅ Manajemen Booking  
- ✅ Manajemen Pembayaran
- ✅ Manajemen Kamar
- ✅ Manajemen Tamu
- ✅ Manajemen Keuangan
- ✅ Housekeeping
- ✅ Laporan & Analisis
- ✅ Data Management
- ✅ **User Management** (Khusus Admin)

### 2. 🔵 Staff Operasional (staff)  
**Operational Access** - Fokus pada operasional harian
- ✅ Dashboard Overview
- ✅ Manajemen Booking
- ✅ Manajemen Pembayaran  
- ✅ Manajemen Kamar
- ✅ Manajemen Tamu
- ✅ Housekeeping
- ❌ Manajemen Keuangan
- ❌ Laporan & Analisis
- ❌ Data Management
- ❌ User Management

### 3. 🟢 Staff Laporan (report)
**Report Access** - Hanya akses laporan dan analisis
- ❌ Dashboard Overview
- ❌ Manajemen Booking
- ❌ Manajemen Pembayaran
- ❌ Manajemen Kamar  
- ❌ Manajemen Tamu
- ❌ Housekeeping
- ❌ Manajemen Keuangan
- ✅ **Laporan & Analisis** (Khusus Report)
- ❌ Data Management
- ❌ User Management

## Features

### 🔐 Authentication System
- **Login Modal**: Muncul otomatis jika belum login
- **Session Management**: Login state tersimpan di localStorage
- **Auto-redirect**: Redirect ke menu yang diizinkan setelah login
- **Logout**: Clear session dan kembali ke login screen

### 👤 User Profile
- **User Avatar**: Initial nama dengan warna sesuai level
- **Profile Dropdown**: Akses profil dan logout
- **User Information**: Nama, username, level, email
- **Level Badge**: Warna berbeda untuk setiap level

### 👥 User Management (Admin Only)
- **User List**: Daftar semua user dengan informasi lengkap
- **Add User**: Form tambah user baru dengan validasi
- **Edit User**: Update informasi user termasuk password
- **Delete User**: Hapus user (tidak bisa hapus diri sendiri)
- **User Status**: Aktif/nonaktif user
- **Level Management**: Ubah level akses user

### 🎨 Logo Customization
- **Upload Logo**: Upload logo custom (PNG, JPG, SVG)
- **Drag & Drop**: Interface upload yang user-friendly
- **Logo Preview**: Preview logo sebelum dan sesudah upload
- **Remove Logo**: Kembalikan ke logo default
- **Auto Apply**: Logo langsung diterapkan setelah upload

### ⚙️ System Settings
- **Company Info**: Nama, alamat, telepon, email perusahaan
- **Regional Settings**: Mata uang, zona waktu, format tanggal
- **System Options**: Auto backup, notifikasi
- **Settings Storage**: Tersimpan di localStorage

## Technical Implementation

### File Structure
```
js/
├── user-management.js    # Core user management system
├── data-management.js    # Extended with user & logo functions
├── app.js               # Updated with permission checks
└── database.js          # Existing database system

css/
└── style-new.css        # Added user management styles
```

### Data Storage
```javascript
// Users data structure
{
  "sikabu_users": [
    {
      "id": "user_1697123456789",
      "username": "admin", 
      "password": "admin123",
      "name": "Administrator",
      "level": "admin",
      "email": "admin@sikabuview.com",
      "created": "2025-10-13T07:00:00.000Z",
      "active": true
    }
  ],
  "sikabu_current_user": { /* current logged in user */ },
  "sikabu_custom_logo": "data:image/png;base64,iVBOR...",
  "sikabu_settings": { /* system settings */ }
}
```

### Permission System
```javascript
// Level permissions mapping
const userLevels = {
  'admin': {
    permissions: ['dashboard', 'booking', 'payment', 'rooms', 'guests', 'finance', 'housekeeping', 'reports', 'data', 'users']
  },
  'staff': {
    permissions: ['dashboard', 'booking', 'payment', 'rooms', 'guests', 'housekeeping']
  },
  'report': {
    permissions: ['reports']
  }
};
```

## Usage Guide

### First Time Setup
1. **Initial Access**: Sistem membuat default admin user
   - Username: `admin`
   - Password: `admin123`
2. **Login**: Gunakan kredensial default untuk masuk
3. **Create Users**: Admin dapat membuat user baru sesuai kebutuhan
4. **Change Password**: Ubah password default untuk keamanan

### User Management Workflow
1. **Access**: Login sebagai admin
2. **Navigate**: Pergi ke Data Management > User Management
3. **Add User**: Klik "Tambah User" dan isi form
4. **Manage**: Edit atau hapus user sesuai kebutuhan
5. **Monitor**: Lihat status dan aktivitas user

### Logo Customization
1. **Access**: Data Management > Upload Logo
2. **Upload**: Drag & drop atau pilih file logo
3. **Preview**: Lihat hasil sebelum apply
4. **Apply**: Logo otomatis diterapkan
5. **Revert**: Hapus logo untuk kembali ke default

### System Settings
1. **Company Setup**: Isi informasi perusahaan
2. **Regional Config**: Atur mata uang dan zona waktu  
3. **System Options**: Aktifkan fitur yang diinginkan
4. **Save**: Simpan pengaturan

## Security Features

### Authentication
- ✅ **Session Management**: Secure session handling
- ✅ **Permission Checks**: Every menu access verified
- ✅ **Auto Logout**: Session expiry handling
- ✅ **Password Protection**: Required for all operations

### User Management
- ✅ **Self-Protection**: User tidak bisa hapus diri sendiri
- ✅ **Admin Protection**: Minimal satu admin harus ada
- ✅ **Input Validation**: Form validation untuk semua input
- ✅ **Level Control**: Permission-based menu access

### Data Protection
- ✅ **Local Storage**: Data tersimpan lokal browser
- ✅ **Validation**: Input sanitization dan validation
- ✅ **Backup**: Include user data dalam backup system
- ✅ **Recovery**: User data dapat di-restore dari backup

## API Functions

### User Management
```javascript
// Check permissions
userManager.hasPermission('booking')

// Get current user
userManager.getCurrentUser()

// User CRUD operations
userManager.createUser(userData)
userManager.updateUser(userId, userData)  
userManager.deleteUser(userId)
userManager.getAllUsers()

// Authentication
userManager.login(username, password)
userManager.logout()
```

### Logo & Settings
```javascript
// Logo management
showLogoSettings()
handleLogoUpload(file)
removeCustomLogo()
applyCustomLogo()

// System settings
showSystemSettings()
```

## Troubleshooting

### Common Issues

**1. Cannot Access Menu**
- **Cause**: User tidak memiliki permission
- **Solution**: Admin update user level atau permission

**2. Login Failed**
- **Cause**: Username/password salah atau user inactive
- **Solution**: Check credentials atau aktivasi user

**3. Logo Not Showing**
- **Cause**: File terlalu besar atau format tidak supported
- **Solution**: Gunakan file < 2MB dengan format PNG/JPG/SVG

**4. Settings Not Saved**
- **Cause**: localStorage error atau browser restrictions
- **Solution**: Check browser settings dan localStorage quota

### Reset System
```javascript
// Reset all users (emergency)
localStorage.removeItem('sikabu_users');
localStorage.removeItem('sikabu_current_user');
// Refresh page to recreate default admin
```

## Future Enhancements

### Planned Features
- 🔄 **Password Hashing**: Encrypt passwords for security
- 🔄 **Session Timeout**: Auto logout after inactivity
- 🔄 **User Activity Log**: Track user actions
- 🔄 **Role-based Permissions**: More granular permission control
- 🔄 **Multi-tenant Support**: Support multiple organizations
- 🔄 **LDAP Integration**: External authentication support

### Technical Improvements
- 🔄 **Database Migration**: Move to proper database
- 🔄 **API Integration**: RESTful API for user management
- 🔄 **Real-time Updates**: WebSocket for live updates
- 🔄 **Mobile App**: Dedicated mobile application
- 🔄 **Audit Trail**: Comprehensive logging system

---

## Default Credentials
**Username**: `admin`  
**Password**: `admin123`  
**Level**: `Administrator`

⚠️ **IMPORTANT**: Change default password after first login for security!

---

*Last Updated: October 13, 2025*  
*Version: 1.0.0*