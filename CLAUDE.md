# CLAUDE.md

Bu dosya, bu depoda çalışırken Claude Code'un (ve diğer yapay zekâ ajanlarının)
uyması gereken kuralları tanımlar. Lütfen her görevden önce bu kuralları dikkate al.

## Proje Hakkında

- Bu proje **Element Call**'un bir kopyasıdır (`element-hq/element-call`).
- Üzerinde çalışılan dal: **`livekit`**.
- **ÖNEMLİ:** Bu proje, Element Call ekibi tarafından **sürekli geliştirilmektedir
  (upstream)**. Yani üst kaynakta (upstream) düzenli olarak yeni commit'ler gelir.
  Bizim yaptığımız değişikliklerin, gelen güncellemelerle **çakışmaması (merge
  conflict)** kritik öneme sahiptir.

## Çalışma Kuralları

### 1) Gereksiz yorum satırı ekleme

- Koda **kendiliğinden açıklama amaçlı yorum satırları ekleme.**
- Sadece açıkça istediğimde yorum ekle; aksi halde mevcut kodun yorum
  yoğunluğunu ve stilini koru.

### 2) Upstream çakışmalarına dikkat et (conflict önleme)

- Bu depo upstream ile sürekli senkronize edileceği için, **çakışma riskini en aza
  indirecek şekilde** değişiklik yap:
  - Mümkünse **mevcut dosyaların ortasını değiştirmek yerine**, yeni dosya / yeni
    fonksiyon ekleyerek genişlet.
  - Upstream'in sık dokunduğu çekirdek dosyalarda **geniş çaplı yeniden düzenleme
    (refactor)** yapma.
  - Değişiklikleri küçük ve izole tut; gereksiz biçimsel (formatting) değişiklik
    yapma — bunlar gereksiz çakışma üretir.
- **Eğer bir değişiklik çakışmaya yol açabilecekse veya çakışmadan
  yapılamıyorsa: ÖNCE BANA SOR.** Ben onaylamadan devam etme.
- Upstream ile ilgili bir işlem (merge, rebase, güncelleme alma vb.) gerekiyorsa,
  yapmadan önce bana bilgi ver ve onayımı al.

### 3) Mantıksal değişiklikleri sınırlı tut

- **Çok fazla mantıksal (logic) değişiklik yapma.**
- Bir özelliğin davranışını, akışını veya iş mantığını değiştirmek gerekiyorsa,
  **önce benden onay iste.** Onay almadan büyük mantıksal değişiklik uygulama.
- Küçük, yerel ve geri alınabilir değişiklikleri tercih et.

## Onay Gerektiren Durumlar — Özet

Aşağıdaki durumlarda **dur ve bana sor**, ben onaylayınca devam et:

1. Bir değişiklik upstream ile çakışma (conflict) riski taşıyorsa.
2. Çakışma olmadan yapılamıyorsa.
3. Önemli/geniş bir mantıksal değişiklik gerekiyorsa.
4. Merge / rebase / upstream güncellemesi gibi git işlemleri gerekiyorsa.

## Faydalı Komutlar

- Geliştirme sunucusu: `pnpm dev`
- Backend (Docker): `pnpm backend`
- Lint: `pnpm lint` (tipler + eslint + knip)
- Testler: `pnpm test` / `pnpm test:unit`
- Playwright testleri: `pnpm test:playwright`
- Çeviri anahtarı çıkarma: `pnpm i18n`

> Paket yöneticisi: **pnpm** (`packageManager: pnpm@10.33.0`).
