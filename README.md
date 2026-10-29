# Post Creator — Instagram Carousel & İçerik Stüdyosu

Yüksek estetik anlayışına sahip popüler kültür, moda, sinema ve gastronomi gönderileri üreten; 4:5 Instagram carousel slaytlarını tasarlayıp doğrudan Google Drive'a yedekleyen modern web stüdyosu.

---

## ⚡ Özellikler

* **4 Ana Kategori:** Dolap (Moda), Ekran (Sinema/Oyun), Masa (Gastronomi), Kutu (Kült Obje/Tasarım)
* **4 İkonik Dönem:** 80'ler, 90'lar, 2000'ler, 2010'lar
* **İnteraktif Bilgi Kartları (Tooltip):** Kategori ve dönemlerin üzerine gelindiğinde zengin kültürel arka plan ve örnekler sunan hover kartları.
* **4:5 Portre Carousel Stüdyosu (WYSIWYG):**
  * Slayt başına bağımsız görsel atama ve çoklu dosya tepsisi (Sürükle-bırak & `Ctrl+V` yapıştırma)
  * Estetik filtreler (35mm Film, Mono Noir, Muted Luxury, Vintage Sıcak)
  * Ayarlanabilir siyah alt karartma (Vignette) ve dikey metin ince ayarı
  * Tam klavye geçmişi: `Ctrl+Z` (Geri Al) ve `Ctrl+Y` (İleri Al)
  * Tek tıkla slayt veya tüm slaytları yüksek çözünürlüklü PNG indirme
* **Google Drive Entegrasyonu (Thalamus Mimarisi):**
  * Google OAuth 2.0 (`drive.file` kapsamı: Yalnızca uygulamanın oluşturduğu klasörü görür)
  * İçerikler ve slayt fotoğrafları kullanıcının kendi Drive'ındaki `Post Creator/posts` ve `Post Creator/images` klasöründe saklanır
  * Sıfır üçüncü taraf sunucu; tam veri gizliliği
* **Görsellerle Birlikte Yerel Arşiv (IndexedDB):**
  * Gönderiler 4 slayt görseliyle birlikte tarayıcının yerel hafızasında saklanır
  * Arşivden tek tıkla hem metin hem görseller stüdyoya geri yüklenir
* **Canlı API Kota & İstek Takipçisi:**
  * Günlük kalan istek hakkı (1.500 RPD), dakika başı hız limiti (15 RPM) ve ilerleme çubuğu

---

## 🚀 Geliştirme ve Çalıştırma

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev

# Canlı derleme (Production build)
npm run build
```

---

## 🔑 Kurulum & Tanımlamalar

### 1. Google Gemini API (İçerik Motoru - Ücretsiz)
1. [Google AI Studio](https://aistudio.google.com/app/apikey) adresinden ücretsiz API anahtarınızı alın.
2. Sağ üstteki **API** butonuna tıklayarak anahtarınızı kaydedin.

### 2. Google Drive Girişi (Bulut Depolama)
1. [Google Cloud Console](https://console.cloud.google.com/) üzerinden bir proje açın.
2. **APIs & Services &rarr; Enabled APIs & services &rarr; + ENABLE APIS** adımından **Google Drive API**'yi etkinleştirin.
3. **Credentials &rarr; Create Credentials &rarr; OAuth client ID** seçin (Application type: *Web application*).
4. Authorized JavaScript origins kısmına:
   - Yerel için: `http://localhost:5173`
   - Canlı için: `https://<kullanici_adiniz>.github.io`
   ekleyin.
5. Oluşan Client ID'yi giriş ekranında veya arşiv ayarlarında tanımlayın.
