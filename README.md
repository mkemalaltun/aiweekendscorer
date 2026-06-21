# AI Weekend · Canlı Şarkı Puanlama

Öğrencilerin yaptığı şarkıları, sahnedeki kişiyi tek tek **5 yıldız** üzerinden canlı puanlatan
küçük bir web uygulaması. Ekranda çıkan **QR kodu** okutan öğrenciler oy verir; sen "Bitir"e
basınca o kişinin **ortalaması skor tablosuna** kaydedilir.

- **Ana ekran (sahne + kontrol):** `https://<adres>/` — projeksiyona bunu yansıt.
- **Oylama (telefon):** `https://<adres>/oy` — QR bunu açar.

Tamamı Cloudflare Workers + Durable Objects (SQLite) üzerinde çalışır. Veritabanı, kurulum,
ayrı sunucu yok — paylaşımlı canlı durum tek bir Durable Object içinde tutulur ve
**Workers ücretsiz planında** çalışır.

---

## Kurulum (2 dakika)

Bilgisayarında [Node.js](https://nodejs.org) kurulu olsun. Sonra bu klasörde:

```bash
npm install
npx wrangler login      # tarayıcıda Cloudflare hesabına giriş yap (ilk seferde)
npm run deploy
```

Bittiğinde terminal sana adresini verir, örn:
`https://ai-weekend-puanlama.<kullanıcı-adın>.workers.dev`

Bu adresi aç → QR ve kontrol paneli gelir. Hepsi bu.

> İlk `deploy` sırasında Durable Object migration'ı otomatik uygulanır; ekstra bir şey yapmana
> gerek yok.

### Alternatif: GitHub ile (panelden)
İstersen bu klasörü bir GitHub deposuna koyup Cloudflare panelinde
**Workers & Pages → Create → Workers → repoyu bağla** diyebilirsin. Cloudflare `wrangler.jsonc`'i
okuyup `npm run deploy`'u kendisi çalıştırır.

---

## Etkinlik sırasında nasıl kullanılır

1. Ana ekranı projeksiyona yansıt. Öğrenciler QR'ı okutup `/oy` sayfasını açsın (ekran açık kalsın).
2. Sahnedeki kişinin adını yaz → **Başlat**. O an telefonlarda oylama açılır.
3. Öğrenciler 1–5 yıldız seçip gönderir. Ortalama ve oy sayısı ekranda canlı güncellenir.
4. O kişi bitince **Bitir & Skora Kaydet**'e bas → ortalaması skor tablosuna eklenir, konfeti patlar.
5. Sıradaki kişiyle 2. adımdan devam et.

Diğer butonlar:
- **Kaydetmeden iptal:** aktif oylamayı skora yazmadan kapatır.
- **Skoru sıfırla:** tüm tabloyu temizler (yeni tur için).
- Skor tablosundaki **×**: yanlış giren bir kaydı siler.

---

## Notlar

- Her telefon kendi kimliğini saklar; **kişi başına 1 oy** sayılır (tekrar gönderince oyu güncellenir).
- Kontrol paneli ana adreste (`/`) açık olduğundan onu kendi bilgisayarında tut; öğrencilere yalnızca
  QR'daki `/oy` adresi gider.
- Yerelde denemek için: `npm run dev` → `http://localhost:8787`.

## Dosyalar

```
wrangler.jsonc      Cloudflare yapılandırması (assets + Durable Object)
src/index.js        Worker + RatingRoom Durable Object (tüm API)
public/index.html   Ana ekran: QR, canlı ortalama, kontroller, skor tablosu
public/oy.html      Telefon oylama ekranı
```
