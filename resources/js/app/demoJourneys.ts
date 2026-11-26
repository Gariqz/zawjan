/** DEV/DEMO ONLY: scripted stakeholder walkthroughs. Mirrors STAKEHOLDER_DEMO.md. */
import { ROUTES } from '@/routing/routes';

export interface DemoJourney {
  id: string;
  title: string;
  owner: string;
  start: { path: string; scenario: string; persona?: string };
  steps: string[];
}

export const DEMO_JOURNEYS: DemoJourney[] = [
  {
    id: 'onboarding', title: 'Pendaftaran hingga siap mengajukan', owner: 'Marinasi + BrandyKeun',
    start: { path: ROUTES.register, scenario: 'unverified' },
    steps: [
      'Isi formulir Daftar (nama, email apa saja, sandi ≥ 8, tanggal lahir 19+), centang tiga persetujuan, lalu Daftar.',
      'Pilih "Lanjutkan ke langkah berikutnya". Coba atau lewati tur; lanjutkan ke Verifikasi identitas dan kirim dokumen serta swafoto fiktif.',
      'Tunggu ±2 detik: status berpindah dari pemeriksaan otomatis ke disetujui (simulasi).',
      'Isi CV per bagian lalu Terbitkan. Undang akun demo fatimah@contoh.id.',
      'Panel Skenario → Masuk sebagai Pendamping. Buka dan terima undangan. Pindah kembali ke Peserta untuk melihat Beranda; Jelajahi tetap opsional.',
    ],
  },
  {
    id: 'discovery', title: "Jelajahi dan pengajuan ta'aruf", owner: 'BrandyKeun + Khaslana',
    start: { path: ROUTES.catalog, scenario: 'verified_browsing' },
    steps: [
      'Baca satu perkenalan tanpa foto. Pakai Sebelumnya atau Berikutnya untuk berpindah; ini tidak mengirim sinyal minat.',
      'Saat Fikri S. muncul, pilih "Lihat CV", lalu "Ajukan Ta\'aruf" dan konfirmasi secara eksplisit.',
      'Ta\'aruf → Terkirim menampilkan pengajuan baru. Panel Skenario → "Calon menerima pengajuan".',
      'Pengajuan berpindah ke "Menunggu persetujuan pendamping" dengan reservasi eksklusif.',
    ],
  },
  {
    id: 'approvals', title: 'Persetujuan dua pendamping', owner: 'Khaslana',
    start: { path: ROUTES.guardianApproval('tar-rahman'), scenario: 'two_pendamping_waiting', persona: 'pendamping' },
    steps: [
      'Sebagai Ibu Fatimah S.: tinjau ringkasan, "Setujui ta\'aruf", konfirmasi.',
      'Keluar (ikon di kanan atas). Di halaman Masuk pilih akun demo "Peserta — Aisyah R." lalu Masuk. Data tetap sama karena sesi demo tidak dimuat ulang.',
      'Ta\'aruf → Rahman F. → Persetujuan: 1 dari 2. Panel Skenario → "Pendamping pihak lain menyetujui".',
      'Ruang percakapan empat anggota kini aktif.',
    ],
  },
  {
    id: 'chat', title: 'Ruang percakapan, foto, dan laporan', owner: 'Khaslana + BrandyKeun',
    start: { path: ROUTES.chat('tar-rahman'), scenario: 'active_four_member_chat' },
    steps: [
      'Kirim pesan; Panel Skenario → "Calon mengirim pesan" untuk balasan.',
      'Detail ruang → Privasi & foto → Bagikan foto ke Rahman (menunggu konfirmasi pendamping).',
      'Keamanan → Laporkan: pilih kategori dan bukti, Tinjau, Kirim. Ruang dibekukan dan eksklusivitas dilepas.',
    ],
  },
  {
    id: 'moderation', title: 'Moderasi dan administrasi', owner: 'EAAA',
    start: { path: `${ROUTES.reportNew}?subjek=cand-rahman`, scenario: 'verified_browsing' },
    steps: [
      'Kirim laporan profil fiktif (kategori Permintaan uang atau penipuan). Catat nomor laporan.',
      'Panel Skenario → Masuk sebagai → Moderator. Cocokkan nomor di Laporan prioritas dan buka detailnya.',
      'Ringkasan → Antrean verifikasi KYC: buka kasus fiktif, minta perbaikan atau setujui; riwayat kasus bertambah.',
      'Laporan → LAP-2611-201: hanya bukti kiriman pelapor yang tampil; tambah catatan, lalu Tangguhkan akun dengan alasan.',
      'Riwayat Aksi memuat tindakan Anda. Keluar, masuk sebagai "Admin — Rizal": Pengguna → Tangguhkan/Pulihkan, lalu Audit.',
    ],
  },
  {
    id: 'resilience', title: 'Kegagalan dan batasan', owner: 'Semua tim',
    start: { path: ROUTES.home, scenario: 'network_offline' },
    steps: [
      'Koneksi terputus: layar menampilkan pesan koneksi dan "Coba lagi" (tanpa data palsu).',
      'Skenario lain: "Layanan tidak tersedia", "Dibatasi sementara", "Laporan gagal terkirim" (keluar aman tetap ada), "Akses ditolak".',
    ],
  },
];
