# Telefondaki APK'yi (Hamsi) Cloudflare Tüneliyle Yerel Geliştirmeye Bağlama

Bu Element Call kopyasını yerelde çalıştırıp, telefondaki APK'nin (**Hamsi**)
"Özel URL" alanına vereceğin halka açık bir HTTPS adresi elde etmek için
[try.cloudflare.com](https://try.cloudflare.com/) "quick tunnel" kullanıyoruz.

> Sadece **yerel test** içindir. Proje henüz canlıya alınmadı. Bazı sorunlar kod
> hatası değil, bu geçici tünel kurulumundan kaynaklanabilir (TLS, well-known,
> CORS, her açılışta değişen URL, port çakışması vb.).

---

## 1) İlk sefer (bu klasörde bir kez)

Terminale sırayla şunları yaz:

```powershell
pnpm install
Copy-Item config/config.devenv.json public/config.json
```

`cloudflared` zaten şurada duruyor:
`C:\Users\108488\Downloads\cloudflared-windows-amd64.exe`
(Yeni makinede yoksa <https://github.com/cloudflare/cloudflared/releases/latest>
adresinden `cloudflared-windows-amd64.exe` indirip Downloads'a koy.)

---

## 2) Her seferinde başlatma (2 terminal)

### Terminal 1 — dev server (HTTP)

```powershell
pnpm dev --config vite-tunnel.config.ts --port 3002
```

> `vite-tunnel.config.ts` HTTPS'i kapatıp `allowedHosts: true` verir; bu yüzden
> `vite.config.ts`'e **dokunmuyoruz** (upstream çakışması olmasın diye).
> Port: 3000 = Hamsi, 3001 = upstream dolu → bu repo için **3002**. Doluysa 3003 yaz.

### Terminal 2 — tünel

```powershell
C:\Users\108488\Downloads\cloudflared-windows-amd64.exe tunnel --url http://localhost:3002
```

Çıktıda şuna benzer bir satır göreceksin:

```
+--------------------------------------------------------------------------+
|  https://kelime-kelime-kelime.trycloudflare.com                          |
+--------------------------------------------------------------------------+
```

---

## 3) Hamsi'ye gir

1. Yukarıdaki `https://....trycloudflare.com` adresini kopyala.
2. Hamsi → **Ayarlar → Geliştirici → Özel URL** alanına yapıştır.
3. Bağlan ve test et.

> URL her açılışta **değişir** (quick tunnel geçici). Her başlattığında yeni
> adresi Hamsi'ye tekrar girmen gerekir.

---

## Sık karşılaşılan sorunlar

- **Boş/siyah ekran:** Önce bilgisayarın tarayıcısında `http://localhost:3002`
  açılıyor mu bak. Açılmıyorsa sorun dev server'da, tünelde değil. Terminal 1
  log'unda Hamsi'den (Tekir) gelen isteklerin hatası görünür.
- **"Blocked request. This host is not allowed":** `--config vite-tunnel.config.ts`
  ile başlattığından emin ol (allowedHosts ondan geliyor).
- **Port dolu:** İki komutta da portu aynı yap ve boş bir port seç (ör. 3003).
- **cloudflared bulunamadı:** `.exe`'yi Downloads klasörüne koy.
- **config.json yok / 404:** `Copy-Item config/config.devenv.json public/config.json`.

---

## Not: neden `vite.config.ts`'i düzenlemiyoruz

Eskiden `vite.config.ts` içinde `https` bloğunu yoruma alıp `allowedHosts: true`
ekliyordun. İşe yarıyor ama upstream her güncellemede o dosyaya dokunduğu için
**merge çakışması** üretir. `vite-tunnel.config.ts` aynı sonucu verir,
`vite.config.ts` temiz kalır. Eski yöntemi istersen söyle, ona göre ayarlarım.
