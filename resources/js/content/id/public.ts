export const publicCopy = {
  layout: {
    process: 'Cara kerja', privacy: 'Privasi', faq: 'Tanya jawab', login: 'Masuk', register: 'Daftar',
    footerAbout: 'Zawjan memfasilitasi perkenalan dengan tujuan pernikahan bagi Muslim dewasa di Indonesia. Zawjan tidak melangsungkan akad nikah dan bukan layanan KUA.',
    legal: 'Ketentuan', terms: 'Syarat Layanan', privacyPolicy: 'Kebijakan Privasi',
    contact: 'Kontak', contactNote: 'Kanal dukungan resmi akan diumumkan sebelum peluncuran.',
    copyright: '© 2026 Zawjan. Prototipe frontend — konten hukum belum final.',
  },
  hero: {
    title: 'Saling mengenal,',
    titleEmphasis: 'dengan tenang.',
    body: "Zawjan membantu Muslim usia 19 tahun ke atas berkenalan untuk tujuan pernikahan. Kenali calon lewat CV ta'aruf, saling terima pengajuan, lalu libatkan pendamping sebelum mulai mengobrol.",
    primary: "Mulai Ta'aruf",
    secondary: 'Coba Simulasi',
    caption: 'Mulai dari CV. Lanjut dengan empat persetujuan.'
  },
  process: {
    title: 'Empat tahap yang jelas',
    lead: 'Setiap tahap menunjukkan apa yang sudah terjadi, siapa yang perlu bertindak, dan apa yang bisa Anda lakukan sekarang.',
    steps: [
      { title: 'Verifikasi identitas dan usia', body: 'Unggah dokumen identitas dan swafoto. Bila pemeriksaan otomatis tidak yakin, moderator meninjau secara manual.' },
      { title: 'Lengkapi CV dan undang pendamping', body: 'Isi CV ta\'aruf secara bertahap dan undang orang dewasa yang Anda percaya sebagai pendamping. Pendamping juga memverifikasi identitasnya sendiri.' },
      { title: 'Ajukan dan saling menerima', body: 'Pengajuan baru berjalan bila kedua peserta menerima. Sejak itu Anda berada dalam satu proses eksklusif.' },
      { title: 'Dua pendamping menyetujui', body: 'Percakapan baru terbuka setelah kedua pendamping menyetujui. Ruang diikuti empat orang: kedua peserta dan kedua pendamping.' },
    ],
  },
  privacy: {
    title: 'Privasi bertahap, bukan sekaligus',
    items: [
      { title: 'Foto tersembunyi secara bawaan', body: 'Foto hanya dapat dilihat oleh penerima yang Anda pilih, setelah pendamping Anda mengonfirmasi. Akses dapat dicabut kapan saja.' },
      { title: 'Data dibuka sesuai tahap', body: 'Jelajahi hanya menampilkan perkenalan teks dari peserta yang memilih tampil. Bagian CV yang lebih pribadi terbuka setelah kedua pihak menerima pengajuan.' },
      { title: 'Laporan dengan bukti pilihan Anda', body: 'Saat melapor, Anda memilih sendiri pesan yang dikirim sebagai bukti. Moderator hanya meninjau bukti tersebut.' },
    ],
    note: 'Mencabut akses menghentikan akses berikutnya di Zawjan. Salinan yang sudah disimpan atau ditangkap layar tidak ikut terhapus.',
  },
  verification: {
    title: 'Apa yang diperiksa — dan apa yang tidak',
    checks: ['Kecocokan wajah dengan dokumen identitas', 'Usia minimal 19 tahun', 'Konfirmasi alamat email'],
    notChecks: ['Status perkawinan (dinyatakan sendiri oleh pengguna)', 'Hubungan keluarga dengan pendamping', 'Status wali nikah secara hukum', 'Niat atau kesungguhan seseorang'],
    checksLabel: 'Diperiksa', notChecksLabel: 'Tidak diperiksa oleh Zawjan',
  },
  pendamping: {
    title: 'Peran pendamping',
    body: "Pendamping Ta'aruf adalah orang dewasa terpercaya yang Anda pilih, dengan akunnya sendiri yang telah terverifikasi. Pendamping menyetujui setiap perkenalan secara khusus dan menjadi anggota ruang percakapan.",
    caveat: 'Pendamping bukan otomatis wali nikah yang sah, dan keberadaannya tidak berarti percakapan dipantau secara langsung setiap saat.',
  },
  faq: {
    title: 'Tanya jawab',
    items: [
      { q: 'Apakah Zawjan aplikasi kencan?', a: 'Tidak. Zawjan ditujukan untuk perkenalan dengan tujuan pernikahan. Tidak ada fitur geser, skor kecocokan, atau percakapan tanpa persetujuan pendamping.' },
      { q: 'Siapa yang dapat mendaftar?', a: 'Muslim dewasa berusia 19 tahun ke atas. Akses Jelajahi dibuka setelah identitas dan usia terverifikasi.' },
      { q: "Mengapa hanya satu ta'aruf dalam satu waktu?", a: 'Agar setiap perkenalan dijalani dengan sungguh-sungguh. Anda tetap dapat mengakhiri proses kapan saja secara sepihak.' },
      { q: 'Bisakah admin membaca percakapan saya?', a: 'Rancangan Zawjan tidak memberi admin akses bebas ke riwayat percakapan. Moderator hanya meninjau bukti yang Anda kirim bersama laporan. Implementasi teknisnya masih dalam peninjauan keamanan.' },
      { q: 'Apakah Zawjan menjamin pernikahan atau keamanan?', a: 'Tidak. Zawjan menyediakan proses yang terstruktur dan alat keamanan, tetapi tidak menjamin hasil apa pun.' },
    ],
  },
  demo: {
    label: "Simulasi ta'aruf",
    disclaimer: 'Profil dan tindakan di sini fiktif. Tidak ada data atau pengajuan yang dikirim.',
    chapters: [
      { nav: 'CV ta’aruf', title: 'Kenali lewat tulisan.', body: 'Baca dua profil contoh, satu per satu. Berpindah profil tidak mengirim pengajuan atau menandai ketertarikan.' },
      { nav: 'Persetujuan', title: 'Empat orang perlu setuju.', body: 'Dalam contoh bersama Nisa, kedua calon menerima pengajuan terlebih dahulu. Setelah itu, masing-masing pendamping menyetujui perkenalan ini sebelum ruang percakapan terbuka.' },
      { nav: 'Izin foto', title: 'Foto tetap milik Anda.', body: 'Persetujuan untuk berkenalan tidak otomatis membuka foto. Pemilik memilih penerimanya, lalu pendamping pemilik mengonfirmasi izin tersebut.' },
    ],
    profiles: [
      { name: 'Nisa', meta: '27 tahun · Bandung', introduction: 'Saya pustakawan dan ingin tetap bekerja setelah menikah. Bagi saya, musyawarah dimulai dari hal sehari-hari, seperti membagi tugas rumah dan menentukan tempat tinggal.' },
      { name: 'Hana', meta: '29 tahun · Yogyakarta', introduction: 'Saya mengajar di sekolah dasar dan sering mengunjungi orang tua di akhir pekan. Saya ingin membicarakan sejak awal bagaimana nanti kami membagi waktu untuk keluarga besar dan keluarga sendiri.' },
    ],
    profile: { label: 'Profil fiktif', previous: 'Sebelumnya', next: 'Berikutnya', intent: 'Lihat simulasi persetujuan' },
    approvals: {
      roles: ['Anda', 'Nisa', 'Pendamping Anda', 'Pendamping Nisa'],
      actions: ['Ajukan perkenalan', 'Simulasikan penerimaan Nisa', 'Simulasikan persetujuan pendamping Anda', 'Simulasikan persetujuan pendamping Nisa'],
      title: 'Urutan persetujuan', complete: 'Ruang percakapan contoh terbuka untuk empat orang.', locked: 'Percakapan belum terbuka.',
      approved: 'Disetujui', next: 'Giliran kini', waiting: 'Menunggu', reset: 'Ulangi persetujuan',
    },
    grant: {
      title: 'Izin melihat foto', recipient: 'Nisa · Peserta', receiverLabel: 'Penerima yang dipilih',
      fields: ['Tersembunyi', 'Menunggu konfirmasi', 'Izin aktif', 'Izin dicabut'],
      messages: ['Belum ada yang bisa melihat foto.', 'Pendamping pemilik foto perlu mengonfirmasi izin ini.', 'Hanya penerima yang dipilih dapat melihat foto.', 'Penerima tidak bisa lagi melihat foto melalui Zawjan.'],
      actions: ['Pilih Nisa dan ajukan izin', 'Simulasikan konfirmasi pendamping', 'Cabut izin contoh', 'Ulangi simulasi izin'],
    },
  },
  legal: {
    termsNote: 'Syarat layanan belum final. Zawjan memfasilitasi perkenalan, bukan layanan KUA dan tidak melangsungkan akad nikah.',
    privacyNote: 'Kebijakan privasi belum final. Simulasi di halaman ini tidak meminta informasi pribadi atau mengirim tindakan Anda.',
  },
  cta: { title: 'Siap memulai dengan niat baik?', body: 'Mulai dengan membuat akun. Lengkapi verifikasi identitas dan usia sebelum membuka Jelajahi.', button: 'Buat akun' },
} as const;
