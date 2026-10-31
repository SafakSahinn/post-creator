# Post Creator — Çoklu Proje & Instagram Carousel Stüdyosu

Yüksek estetik anlayışına sahip popüler kültür, teknoloji, sinema, gastronomi ve özel niş alanlarda editoryal içerikler üreten; **2 ila 10 slaytlık 4:5 (1080x1350) Instagram Carousel** tasarımlarını WYSIWYG stüdyoda hazırlayan, doğrudan **Meta Graph API** üzerinden yayınlayan/planlayan ve **Google Drive** ile yerel hafızaya (IndexedDB) yedekleyen profesyonel içerik üretim platformu.

---

## ⚡ Temel Yetenekler & Özellikler

### 1. 🚀 Resmi Meta Graph API ile Otomatik Paylaşım & Planlama
* **Doğrudan Paylaşım (Instant Publish):** Hazırlanan 2-10 slaytlık carousel gönderilerini tarayıcıdan hiç çıkmadan, 1080x1350 tam portre çözünürlüğünde resmi Instagram API üzerinden tek tıkla hesabınıza yükleyin.
* **İleri Tarihli Planlama (Scheduling):** İçeriklerinizi istediğiniz gün ve saate planlayın (Meta standartlarına uygun olarak 15 dakika ile 75 gün arası). Belirlenen saatte gönderiniz otomatik olarak yayına girer.
* **Görsel Köprüsü & Uyumluluk:** Instagram API standartlarına tam uyumlu 1080x1350 JPEG formatı, optimize edilmiş Vite yerel sunucu görsel köprüsü (`/api/upload-slide`) ve Imgur yedek hattı.

### 2. 🔐 Kalıcı / Sınırsız Token & Meta Güvenliği
* **Sistem Kullanıcısı (System User) Desteği:** Graph API Explorer'ın 1 saatlik geçici jetonları yerine Meta Business Suite üzerinden süresi asla dolmayan (`Never Expirable`) kalıcı erişim jetonları ile kesintisiz paylaşım.
* **60 Günlük Token Uzatma:** Token Debugger entegrasyonu ile hızlı başlangıç için 60 günlük uzun ömürlü jeton desteği.
* **Kapsamlı Hata Rehberi & Tanı:** Süresi dolmuş token, eksik varlık yetkilendirmesi veya format uyumsuzluklarında kullanıcıyı adım adım yönlendiren tanı ve çözüm arayüzü.

### 3. 🌐 Çoklu Proje Mimarisi (Multi-Brand / Multi-Niche)
* **Bağımsız Projeler:** Tek bir arayüz üzerinden dilediğiniz sayıda proje (örn: *Lore Magazine*, *Tech & AI Radar*, *Sinema & Sanat* veya kişisel markanız) oluşturun ve anında aralarında geçiş yapın.
* **Özelleştirilebilir Kategori & Filtreler:** Her proje için bağımsız 4 ana kategori, ikinci aşama filtreleri (dönemler, analiz derinliği vb.), bilgi kartı açıklamaları (tooltip) ve filigran slayt logosu.
* **Özel Yapay Zeka Kimliği:** Projeye özel editoryal ses tonu, persona ve üslup tanımlama.

### 4. 🎨 4:5 Portre Carousel Stüdyosu (WYSIWYG)
* **Dinamik Slayt Kapasitesi:** 2 ile 10 slayt arasında esnek carousel mimarisi.
* **5 Editoryal Tipografi Ailesi:**
  * *Cinzel* (Klasik & Heybetli Roma estetiği)
  * *Playfair Display* (Vogue & Harper's Bazaar editoryal serifi)
  * *Cormorant Garamond* (Zarif, lüks & edebiyat esintili)
  * *Syne* (Modern, avangart & brutalist sans-serif)
  * *Montserrat* (Temiz, dinamik & çağdaş geometrik sans)
* **Detaylı Görsel & Tasarım Ayarları:**
  * Slayt başına bağımsız görsel atama, sürükle-bırak ve `Ctrl+V` doğrudan panodan yapıştırma.
  * Estetik renk filtreleri (*35mm Film, Mono Noir, Muted Luxury, Vintage Sıcak*).
  * Karartma (Vignette) ve dikey metin pozisyonu ince ayarları.
  * Tam geçmiş desteği: `Ctrl+Z` (Geri Al) ve `Ctrl+Y` (İleri Al).

### 5. 🔍 1080x1350 Lightbox (Büyük Boy Önizleme)
* Slayt kartlarına tıklayarak stüdyo modundan tam ekran / büyük boy inceleme modalına geçiş.
* Klavye ok tuşları (`←` / `→`) ile slaytlar arası akıcı gezinme, `Esc` ile anında kapanış.

### 6. 🎬 10 Mbps Yüksek Çözünürlüklü MP4 Reel / Video İhracı
* Hazırladığınız carousel slaytlarını tek tıkla Instagram Reels veya TikTok için optimize edilmiş **1080x1350 portre MP4 videosuna** dönüştürün.
* Slaytlar arası yumuşak sinematik geçişler ve 10 Mbps yüksek bitrate ile sıfır kalite kaybı.

### 7. ☁️ Google Drive & Yerel Arşiv (IndexedDB)
* **Thalamus Mimarisi:** Google OAuth 2.0 (`drive.file` izniyle) tüm gönderiler ve slayt görselleri kullanıcının kendi Google Drive'ındaki `Post Creator` klasörüne yedeklenir. Sıfır üçüncü taraf sunucu depolaması; %100 veri gizliliği.
* **IndexedDB Yerel Depolama:** İnternet bağlantısı kesilse bile üretilen tüm gönderiler ve yüksek çözünürlüklü görseller tarayıcının yerel veritabanında saklanır.

### 8. ⌨️ Klavye Kısayolları & Hızlı Erişim
| Kısayol | İşlev |
| :--- | :--- |
| `/` | Arşivde anında arama kutusuna odaklan |
| `Ctrl + Z` | Stüdyo değişikliklerini geri al |
| `Ctrl + Y` | Geri alınan değişiklikleri ileri al |
| `Ctrl + Enter` | Seçili parametrelerle yeni içerik üret |
| `←` / `→` | Lightbox modunda önceki/sonraki slayta geç |
| `Esc` | Açık olan modal veya lightbox'ı kapat |

---

## 🚀 Kurulum ve Çalıştırma

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyin:

```bash
# 1. Depoyu klonlayın
git clone https://github.com/SafakSahinn/post-creator.git
cd post-creator

# 2. Bağımlılıkları yükleyin
npm install

# 3. Geliştirme sunucusunu başlatın
npm run dev

# 4. Canlı derleme (Production build)
npm run build
```

---

## 🔑 API & Servis Yapılandırması

### 1. Google Gemini API (İçerik Üretim Motoru — Ücretsiz)
1. [Google AI Studio](https://aistudio.google.com/app/apikey) adresine gidin ve Google hesabınızla giriş yapın.
2. **"Create API Key"** butonuna basarak ücretsiz API anahtarınızı oluşturun (Günde 1.500 istek ücretsizdir).
3. Post Creator arayüzünün sağ üstündeki **API** butonuna tıklayarak anahtarınızı yapıştırın.

---

### 2. Meta Graph API (Instagram Paylaşım & Planlama)
Post Creator doğrudan resmi Meta Graph API üzerinden paylaşım yapar. Kesintisiz kullanım için önerilen adımlar:

#### A. Sınırsız / Kalıcı Token Alma (Önerilen Yöntem):
1. **[Meta Business Suite Ayarları](https://business.facebook.com/settings/system-users)** sayfasına gidin.
2. *Kullanıcılar* &rarr; **Sistem Kullanıcıları (System Users)** sekmesine girin.
3. Yeni bir sistem kullanıcısı oluşturun ve rolünü **Yönetici (Admin)** olarak belirleyin.
4. **Varlıklar Ata (Assign Assets)** butonuna tıklayın:
   * **Uygulamalar (Apps):** `PostCreator` uygulamasını seçin ve **Tam Kontrol (Manage App)** yetkisi verin.
   * **Instagram Hesapları:** Paylaşım yapacağınız hesabı (örn: `@timsahgibi`) seçin ve **İçerik Yönetimi (Manage)** yetkisi verin.
5. **Yeni Jeton Oluştur (Generate New Token)** butonuna tıklayın:
   * Süre: **Asla (Never)** seçin.
   * İzinler: Aşağıdaki 3 izni işaretleyin:
     * `instagram_basic`
     * `instagram_content_publish`
     * `pages_show_list`
6. Üretilen jetonu kopyalayın ve Post Creator'daki **Instagram'da Paylaş** &rarr; **Meta Ayarları** bölümüne yapıştırın.

#### B. Hızlı 60 Günlük Token (Alternatif):
1. [Graph API Explorer](https://developers.facebook.com/tools/explorer/) üzerinden aldığınız 1 saatlik jetonu kopyalayın.
2. [Meta Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken) aracına yapıştırıp **Debug** butonuna basın.
3. Sayfanın en altındaki **"Extend Access Token"** butonuna basarak jetonunuzu 60 güne uzatın.

#### C. Instagram İşletme Hesap ID'sini Bulma:
1. [Graph API Explorer](https://developers.facebook.com/tools/explorer/) ekranında sorgu kutusuna şunu yazıp çalıştırın:
   ```http
   GET me/accounts?fields=instagram_business_account{id,username}
   ```
2. Gelen yanıttaki `instagram_business_account` içindeki `id` değerini kopyalayıp Post Creator'a kaydedin (Örn: `17841455084676157`).

---

### 3. Google Drive Entegrasyonu (İsteğe Bağlı Bulut Yedekleme)
1. [Google Cloud Console](https://console.cloud.google.com/) üzerinden bir proje açın.
2. **APIs & Services &rarr; Enabled APIs & services &rarr; + ENABLE APIS** adımından **Google Drive API**'yi etkinleştirin.
3. **Credentials &rarr; Create Credentials &rarr; OAuth client ID** adımlarını izleyin (*Web application*).
4. Authorized JavaScript origins bölümüne yerel adresinizi (`http://localhost:5173`) veya canlı alan adınızı ekleyin.
5. Oluşan Client ID'yi arayüzdeki Drive ayarlarında tanımlayın.

---

## 🛠️ Teknoloji Yığını

* **Çatı & Temel:** React 19, Vite, JavaScript (ESNext)
* **Stil & Tasarım:** Tailwind CSS, Lucide React Icons
* **Yapay Zeka:** Google Gemini 2.5 Flash / Pro (Google GenAI SDK)
* **Görsel & Video İşleme:** `html-to-image`, Canvas API, MediaRecorder API (10 Mbps WebM/MP4)
* **Depolama:** IndexedDB, Google Drive API v3 (REST), LocalStorage
* **Sosyal Medya API:** Meta Graph API v21.0 / v22.0 (Instagram Content Publishing API)

---

## 📄 Lisans
Bu proje MIT lisansı ile korunmaktadır.
