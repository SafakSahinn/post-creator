/**
 * Gemini API Entegrasyonu - Post Creator Dinamik İçerik Motoru
 */
import { recordApiRequest } from './apiQuota';

// Ayarlarda kaydedilen Gemini anahtarı (App.jsx ile aynı kaynak)
function getStoredApiKey() {
  try {
    return localStorage.getItem('lore_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
  } catch {
    return import.meta.env.VITE_GEMINI_API_KEY || '';
  }
}

export function buildSystemInstruction(project) {
  if (!project) {
    return DEFAULT_SYSTEM_INSTRUCTION;
  }

  const categoriesDesc = (project.categories || [])
    .map((c) => `- ${c.name || c.id}: ${c.sublabel || ''} (${c.tooltip?.description || ''})`)
    .join('\n');

  const filterDesc = (project.filterOptions || [])
    .map((f) => `${f.label} (${f.sublabel || ''})`)
    .join(', ');

  return `
Rol ve Kimlik:
Sen, "${project.name}" projesinin ve yayın markasının resmi "Baş Editörü & İçerik Üretim Motoru"sun.
Slogan & Vizyon: ${project.tagline || 'Kapsamlı İçerik ve Görsel Stüdyosu'}
Yayıncılık Dili ve Editoryal Ton: ${project.editorialTone || 'Entelektüel, vurucu, rafine, merak uyandırıcı ve akıcı.'}

Kurallar:
- Bilgiyi sıkıcı bir ders gibi değil; sürükleyici, ufuk açıcı ve prestijli bir dergi mizanpajı gibi aktar.
- Kesinlikle hiçbir emoji KULLANMA. Asla ucuz Instagram klişeleri (işte o detay, kaydetmeyi unutma vb.) kullanma.
- Dergi ciddiyetinde, Türkçe dilbilgisine ve kelime estetiğine tam hakim bir üslup benimse.

Proje Parametreleri:
- Kategoriler:
${categoriesDesc}
- ${project.filterTypeLabel || 'Filtre / Segment / Dönem'}: ${filterDesc}

Çıktı Formatı Kuralları:
Sadece geçerli bir JSON objesi döndür.

1. 'lore' Alanı (Instagram Açıklaması / Caption):
Yapay zeka metni burada detaylı, zengin ve uzun olmalıdır. 3 dolu paragraftan oluşur ve konunun tüm hikayesini, derin sosyolojisini ve perde arkasını eksiksiz anlatır.

2. 'slideQuotes' Alanı (Görsel Üstü 3 Satırlık Vurucu Kanca Cümleleri):
Instagram carousel slaytlarının üzerine basılacak metin TAM 3 SATIR UZUNLUĞUNDA (yaklaşık 14-18 kelime), okuyucuyu ekranda tutacak ve kaydırmaya teşvik edecek ultra vurucu, eksiksiz, bağımsız bir editoryal tespittir.
KRİTİK ANLAM & DİL KURALLARI:
- Cümle KESİNLİKLE yarım kalmış bir düşünce veya uzun bir paragrafın kopuk bir parçası olmamalıdır!
- Cümlenin öznesi ve yüklemi tam olmalı; anlamı kendi içinde eksiksiz ve güçlü bir aforizma veya şok edici bir tespit tamamlamalıdır.
- Tam 3 satırda (14-18 kelime) okunacak şekilde kurgulanmalı, sonuna mutlaka nokta (.) veya ünlem (!) konulmalıdır.
- Slayt 2 (İkonikleşme): Konunun neden sıradan olmadığını ve arkasındaki şok edici çıkış noktasını 3 satırda özetleyen vurucu tespit.
- Slayt 3 (Perde Arkası & Statü): Görünmeyen gizli mekanizmayı, statü şifresini veya psikolojik gerçeği ifşa eden 3 satırlık sarsıcı tespit.
- Slayt 4 (Kültürel Miras & Kapanış): Günümüz dünyasına etkisini özetleyen ve okuyucuyu yorum yapmaya sevk eden 3 satırlık güçlü kapanış tespiti.

Örnek 3 Satırlık Vurucu Cümle Tonu:
- "Bir nesne yalnızca pahalı olduğu için değil; kime ait olduğunu fısıldadığı için arzu nesnesine dönüşür." (Tam anlam, tam yüklem, tam 3 satır)
- "Herkes tasarımı konuşurken, asıl devrim kimsenin fark etmediği o tek bir detayda gizliydi." (Tam anlam, tam yüklem, tam 3 satır)

JSON yapısı:
{
  "title": "Konuyu özetleyen havalı, dergi kapağı tarzı bir isim",
  "shortTitle": "Başlığın dergi arka kapağı listesi için kısa hali: en fazla 4 kelime / 30 karakter, konunun özü (örnek: Gri Devrim: PlayStation)",
  "hook": "Okuyucuyu ilk saniyede yakalayacak, merak uyandıran 1-2 cümlelik vurucu bir soru veya tespit.",
  "lore": [
    "1. Paragraf: Giriş ve konunun çarpıcı başlangıcı.",
    "2. Paragraf: Derin analiz, perde arkası veya gizli mekanizma.",
    "3. Paragraf: Geleceğe etkisi, günümüze mirası veya kapanış çıkarımı."
  ],
  "slideQuotes": [
    "Slayt 2: Tam 3 satıra sığacak (14-18 kelime), anlamı ve yüklemi eksiksiz, noktayla biten vurucu tespit.",
    "Slayt 3: Tam 3 satıra sığacak (14-18 kelime), anlamı ve yüklemi eksiksiz, perde arkasını ifşa eden tespit.",
    "Slayt 4: Tam 3 satıra sığacak (14-18 kelime), anlamı ve yüklemi eksiksiz, kültürel miras ve kapanış tespiti."
  ],
  "visualNote": "Bu içeriğin görseli için Pinterest/Unsplash/Arşiv için en uygun İngilizce estetik arama terimi.",
  "hashtags": ["#etiket1", "#etiket2", "#etiket3", "#etiket4"]
}
Önemli: Kesinlikle hiçbir emoji kullanma. Sadece JSON döndür. Slayt cümlelerinin anlamını asla yarım bırakma.
`;
}

const DEFAULT_SYSTEM_INSTRUCTION = `
Rol ve Kimlik:
Sen, yüksek estetik anlayışına sahip elit bir dijital kültür dergisinin "İçerik Üretim Motoru"sun. Görevin; popüler kültürün, modanın, sinemanın ve nesnelerin ardındaki gizli statü şifrelerini (lore) kırmak ve bunları takipçilere çok "cool", eforsuz ve merak uyandırıcı bir dille anlatmaktır. Asla sıkıcı bir sosyoloji dersi vermezsin; bilgiyi bir magazin akıcılığında sunarsın. Kesinlikle hiçbir emoji KULLANMA. Minimalist, entelektüel ve dergi ciddiyetinde bir üslup benimse.

Çıktı Formatı Kuralları:
Sadece geçerli bir JSON objesi döndür.

1. 'lore' Alanı (Instagram Açıklaması / Caption):
Yapay zeka metni burada detaylı, zengin ve uzun olmalıdır. 3 dolu paragraftan oluşur ve konunun tüm hikayesini, derin sosyolojisini ve perde arkasını eksiksiz anlatır.

2. 'slideQuotes' Alanı (Görsel Üstü 3 Satırlık Vurucu Kanca Cümleleri):
Instagram carousel slaytlarının üzerine basılacak metin TAM 3 SATIR UZUNLUĞUNDA (yaklaşık 14-18 kelime), okuyucuyu ekranda tutacak ve kaydırmaya teşvik edecek ultra vurucu, eksiksiz, bağımsız bir editoryal tespittir.
KRİTİK ANLAM & DİL KURALLARI:
- Cümle KESİNLİKLE yarım kalmış bir düşünce veya uzun bir paragrafın kopuk bir parçası olmamalıdır!
- Cümlenin öznesi ve yüklemi tam olmalı; anlamı kendi içinde eksiksiz ve güçlü bir aforizma veya şok edici bir tespit tamamlamalıdır.
- Tam 3 satırda (14-18 kelime) okunacak şekilde kurgulanmalı, sonuna mutlaka nokta (.) veya ünlem (!) konulmalıdır.
- Slayt 2 (İkonikleşme): Konunun neden sıradan olmadığını ve arkasındaki şok edici çıkış noktasını 3 satırda özetleyen vurucu tespit.
- Slayt 3 (Statü Şifresi & Perde Arkası): Görünmeyen gizli mekanizmayı, statü şifresini veya psikolojik gerçeği ifşa eden 3 satırlık sarsıcı tespit.
- Slayt 4 (Kültürel Miras & Kapanış): Günümüz dünyasına etkisini özetleyen ve okuyucuyu yorum yapmaya sevk eden 3 satırlık güçlü kapanış tespiti.

Örnek 3 Satırlık Vurucu Cümle Tonu:
- "Bir nesne yalnızca pahalı olduğu için değil; kime ait olduğunu fısıldadığı için arzu nesnesine dönüşür." (Tam anlam, tam yüklem, tam 3 satır)
- "Herkes tasarımı konuşurken, asıl devrim kimsenin fark etmediği o tek bir detayda gizliydi." (Tam anlam, tam yüklem, tam 3 satır)

JSON yapısı:
{
  "title": "Konuyu özetleyen havalı, dergi kapağı tarzı bir isim",
  "shortTitle": "Başlığın dergi arka kapağı listesi için kısa hali: en fazla 4 kelime / 30 karakter, konunun özü (örnek: Gri Devrim: PlayStation)",
  "hook": "Okuyucuyu ilk saniyede yakalayacak, merak uyandıran 1-2 cümlelik vurucu bir soru veya tespit.",
  "lore": [
    "1. Paragraf: Tasarımın, nesnenin veya sahnenin neden ikonikleştiğinin başlangıcı.",
    "2. Paragraf: Arkasındaki statü psikolojisi, gizli sembolizm veya dönemin ruhu.",
    "3. Paragraf: Tüketim çılgınlığı, günümüze mirası ve bıraktığı kültürel iz."
  ],
  "slideQuotes": [
    "Slayt 2 (İkonikleşme): Tam 3 satıra sığacak (14-18 kelime), anlamı ve yüklemi eksiksiz, noktayla biten vurucu tespit.",
    "Slayt 3 (Statü Şifresi): Tam 3 satıra sığacak (14-18 kelime), anlamı ve yüklemi eksiksiz, perde arkasını ifşa eden tespit.",
    "Slayt 4 (Kültürel Miras & Kapanış): Tam 3 satıra sığacak (14-18 kelime), anlamı ve yüklemi eksiksiz, kapanış tespiti."
  ],
  "visualNote": "Bu içeriğin arka planı için internetten bulunması gereken en estetik orijinal karenin İngilizce arama terimi.",
  "hashtags": ["#etiket1", "#etiket2", "#etiket3", "#etiket4"]
}
Önemli: Kesinlikle hiçbir emoji kullanma. Sadece JSON döndür. Slayt cümlelerinin anlamını asla yarım bırakma.
`;

/**
 * Kullanıcının API anahtarına özel aktif modelleri Google'dan sorgular
 */
export async function getAvailableModels(apiKey) {
  if (!apiKey?.trim()) return [];
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => ({
        id: m.name.replace(/^models\//, ""),
        fullName: m.name,
        displayName: m.displayName || m.name.replace(/^models\//, ""),
        description: m.description
      }));
  } catch (err) {
    console.warn("Modeller listelenemedi:", err);
    return [];
  }
}

// Cümle ayıklayıcı (kısa slayt metni fallback'i - anlamı tam, eksiksiz cümle)
export function getPunchyExcerpt(text, maxSentences = 1) {
  if (!text) return "";
  const clean = text.trim().replace(/^["'“]+|["'”]+$/g, '');
  const matches = clean.match(/[^.!?]+[.!?]+/g);
  if (matches && matches.length > 0) {
    return matches.slice(0, maxSentences).join(" ").trim();
  }
  return clean + (/[.!?]$/.test(clean) ? '' : '.');
}

/**
 * Gerçek Instagram Yayın Metni Formatlayıcı
 * Geliştirici etiketlerini ([Gönderi Başlığı: ...], Kanca (Hook): vb.) kaldırır.
 * Instagram akışında tam bir editoryal dergi paylaşımı gibi başlık, kanca, paragraflar ve etiketleri temizce birleştirir.
 */
export function cleanRawCaption(text) {
  if (!text) return '';
  return text
    .replace(/\[\s*Gönderi Başlığı:\s*([^\]]+)\]/gi, '$1\n')
    .replace(/^Kanca\s*\(\s*Hook\s*\)\s*:\s*/gim, '')
    .replace(/^Lore\s*\(\s*Hikaye\s*\)\s*:\s*/gim, '')
    .replace(/^Küratörün Görsel Notu:\s*[^\n]+(\n|$)/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function formatInstagramCaption(post) {
  if (!post) return '';

  if (typeof post === 'string') {
    return cleanRawCaption(post);
  }

  const title = (post.title || '').trim();
  const hook = (post.hook || '').trim();

  let loreParagraphs = [];
  if (Array.isArray(post.lore)) {
    loreParagraphs = post.lore.map((p) => (typeof p === 'string' ? p.trim() : '')).filter(Boolean);
  } else if (typeof post.lore === 'string') {
    loreParagraphs = post.lore.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  }

  let hashtagsStr = '';
  if (Array.isArray(post.hashtags)) {
    hashtagsStr = post.hashtags
      .filter(Boolean)
      .map((t) => (t.startsWith('#') ? t : `#${t}`))
      .join(' ');
  } else if (typeof post.hashtags === 'string') {
    hashtagsStr = post.hashtags.trim();
  }

  if (loreParagraphs.length === 0 && post.formattedCaption) {
    return cleanRawCaption(post.formattedCaption);
  }

  const parts = [];

  // 1. Manşet Başlık
  if (title) {
    parts.push(title.toUpperCase());
  }

  // 2. Kanca Cümlesi
  if (hook) {
    parts.push(hook);
  }

  // 3. Hikaye ve Detay Paragrafları
  if (loreParagraphs.length > 0) {
    parts.push(loreParagraphs.join('\n\n'));
  }

  // 4. Ayrım ve Etiketler
  if (hashtagsStr) {
    parts.push(`· · ·\n${hashtagsStr}`);
  }

  return parts.join('\n\n');
}

export async function generateEditorialPost({ apiKey, category, decade, customTopic, model = "gemini-2.5-flash", onProgress, project }) {
  if (!apiKey?.trim()) {
    throw new Error("Lütfen ayarlardan geçerli bir Gemini API anahtarı girin.");
  }

  const promptUser = `
Proje: ${project?.name || 'Post Creator'}
Kategori: ${category}
${project?.filterTypeLabel || 'Filtre / Dönem'}: ${decade}
Özel Konu: ${customTopic?.trim() ? customTopic.trim() : "Seçimi sen yap (bu projeye en uygun, en çarpıcı konuyu seç)"}
`;

  if (onProgress) onProgress("Google'dan hesabınıza uygun aktif modeller listeleniyor...");

  let availableModels = await getAvailableModels(apiKey);
  let targetModelNames = [];

  if (availableModels.length > 0) {
    const userSelected = availableModels.find(
      (m) => m.id === model || m.fullName === model || m.id.includes(model)
    );

    const flashModels = availableModels.filter((m) => m.id.toLowerCase().includes("flash"));
    const otherModels = availableModels.filter((m) => !m.id.toLowerCase().includes("flash"));

    if (userSelected) {
      targetModelNames.push(userSelected.fullName);
    }
    flashModels.forEach((m) => {
      if (!targetModelNames.includes(m.fullName)) targetModelNames.push(m.fullName);
    });
    otherModels.forEach((m) => {
      if (!targetModelNames.includes(m.fullName)) targetModelNames.push(m.fullName);
    });
  }

  if (targetModelNames.length === 0) {
    const fallbacks = [
      model,
      "models/gemini-2.5-flash",
      "models/gemini-2.0-flash",
      "models/gemini-1.5-flash"
    ];
    targetModelNames = fallbacks.map((m) => (m.startsWith("models/") ? m : `models/${m}`));
  }

  let lastError = null;

  for (const currentModelFullName of targetModelNames) {
    const shortName = currentModelFullName.replace(/^models\//, "");
    if (onProgress) {
      onProgress(`İçerik üretiliyor: ${shortName}...`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 14000);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/${currentModelFullName}:generateContent?key=${apiKey.trim()}`;

      const payload = {
        contents: [
          {
            role: "user",
            parts: [{ text: promptUser }]
          }
        ],
        systemInstruction: {
          parts: [{ text: buildSystemInstruction(project) }]
        },
        generationConfig: {
          temperature: 0.75,
          topP: 0.95,
          responseMimeType: "application/json"
        }
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const msg = errorData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        console.warn(`Model ${currentModelFullName} başarısız: ${msg}`);
        throw new Error(msg);
      }

      const data = await res.json();
      recordApiRequest();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("Yapay zekadan boş yanıt döndü.");

      let cleaned = rawText.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
      }

      const parsed = JSON.parse(cleaned);

      // Slide quotes fallback (3 slides: 2, 3 and 4)
      const rawSlideQuotes = Array.isArray(parsed.slideQuotes) && parsed.slideQuotes.length >= 3
        ? parsed.slideQuotes
        : [
            getPunchyExcerpt(Array.isArray(parsed.lore) ? parsed.lore[0] : parsed.lore, 1),
            getPunchyExcerpt(Array.isArray(parsed.lore) ? (parsed.lore[1] || parsed.lore[0]) : parsed.lore, 1),
            getPunchyExcerpt(Array.isArray(parsed.lore) ? (parsed.lore[2] || parsed.lore[0]) : parsed.lore, 1)
          ];

      // Slaytlarda anlamı tam, eksiksiz vurucu cümle garantisi (asla yüklem veya kelime kesilmez)
      const slideQuotes = rawSlideQuotes.map((q) => {
        if (!q) return '';
        let s = q.trim().replace(/^["'“]+|["'”]+$/g, '');
        const sentences = s.match(/[^.!?]+[.!?]+/g);
        if (sentences && sentences.length > 0) {
          return sentences[0].trim();
        }
        if (!/[.!?]$/.test(s)) {
          s = s.replace(/[,;:\s]+$/, '') + '.';
        }
        return s;
      });

      // Gerçek Instagram Açıklama (Caption) formatı (Editoryal Dergi Akışı)
      const formattedCaption = formatInstagramCaption(parsed);

      return {
        ...parsed,
        lore: Array.isArray(parsed.lore) ? parsed.lore : [parsed.lore],
        slideQuotes,
        category,
        decade,
        formattedCaption,
        activeModelUsed: shortName,
        projectId: project?.id || 'lore-magazine',
        projectName: project?.name || 'Lore Magazine',
        projectShortCode: project?.shortCode || 'LORE',
        watermark: project?.watermark || project?.shortCode || 'L O R E',
        accentColor: project?.accentColor || '#e6c280',
        createdAt: new Date().toISOString(),
        id: "post_" + Date.now()
      };
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;

      if (err.message && (err.message.includes("API key not valid") || err.message.includes("PERMISSION_DENIED"))) {
        throw new Error("Gemini API Anahtarınız geçersiz. Lütfen sağ üstteki ayarlardan anahtarı kontrol edin.");
      }
    }
  }

  throw new Error(
    lastError?.message || "İçerik üretilemedi. Lütfen API anahtarınızı kontrol edin."
  );
}

/**
 * 90'lar Editoryal Dergi Formatı İçin Derinlemesine Kültürel Analiz ve Arşiv Notları Üretir
 * Instagram'a sığmayan detaylı perde arkası, tasarım sosyolojisi, tarihi anekdotlar ve dipnotları içerir.
 */
export async function generateDeepMagazineEssay({ post, project, apiKey, model = 'gemini-2.5-flash' }) {
  const activeKey = apiKey || getStoredApiKey();
  if (!activeKey) {
    throw new Error('Lütfen Gemini API anahtarınızı tanımlayın.');
  }

  const prompt = `
Rol: 1990'ların kült İngiliz ve İtalyan editoryal dergilerinin (The Face, Ray Gun, Dazed, Vogue Italia) Baş Editörü ve Kültür Tarihçisi.
Konu: "${post.title || post.conceptTitle}"
Kategori / Dönem: ${post.category || 'Kültür'} - ${post.period || "90'lar"}
Mevcut Instagram Özeti: ${(post.lore || []).join(' ')}

Görev:
Bu konu için Instagram slaytlarına ve karakter sınırlarına SIĞMAYAN, dergi okuyucusuna derin kültürel tatmin sunacak 90'lar ruhunda bir "Özel Dergi Dosyası" hazırla.

JSON Formatında Sadece Aşağıdaki Yapıyı Döndür:
{
  "subtitle": "90'lar editoryal dergisi tarzında çarpıcı, edebi bir alt başlık",
  "deepEssay": [
    "1. Paragraf: Konunun 90'lardaki çıkış noktası, alt kültürdeki yeri ve dönemin ruhunu nasıl yakaladığı.",
    "2. Paragraf: Tasarım, sinema veya moda arkasındaki gizli mekanizma; neden sıradan bir trend değil bir kırılma noktası olduğu.",
    "3. Paragraf: Bugünün dijital dünyasından geriye bakıldığında bu konunun bıraktığı analog tortu ve kültürel miras."
  ],
  "pullQuote": "Sayfanın ortasına büyük harflerle basılacak, 1990'lar dergi estetiğinde ultra vurucu ve sarsıcı bir aforizma veya alıntı.",
  "culturalTrivia": [
    { "label": "Tarihi Dönüm Noktası", "detail": "Konuyla ilgili spesifik bir yıl, olay, skandal veya kırılma anı." },
    { "label": "Kilit İsimler & Arka Plan", "detail": "İlgili yönetmen, tasarımcı, mimar veya alt kültür hareketi." },
    { "label": "Analog Estetik & Teknik Detay", "detail": "Kullanılan malzeme, 35mm film estetiği, tipografi veya üretim sırrı." },
    { "label": "Popüler Kültür Yankısı", "detail": "90'lar gençliği, kulüpleri veya sokak modasındaki somut karşılığı." }
  ],
  "curatorNote": "Fotoğraf küratörünün 1-2 cümlelik estetik değerlendirmesi ve kadraj notu."
}
`;

  const modelsToTry = [
    model,
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash'
  ];
  const uniqueModels = Array.from(new Set(modelsToTry));

  for (const mod of uniqueModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${activeKey}`;
    try {
      recordApiRequest();
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!res.ok) continue;
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
      return parsed;
    } catch (e) {
      console.warn(`Dergi derinlik üretimi ${mod} ile başarısız:`, e);
    }
  }

  throw new Error('Dergi makalesi üretilemedi. Lütfen bağlantınızı ve API anahtarınızı kontrol edin.');
}

/**
 * Dergi listelerindeki (İçindekiler, arka kapak "Bu Sayıda") uzun başlıkları kısaltır.
 * Her öğe kendi `maxChars` sınırını taşıyabilir (varsayılan 30): satıra sığacak uzunluk.
 * Tek istekte toplu çalışır; { [id]: kısaBaşlık } döndürür.
 */
export async function generateShortMagazineTitles({ items, apiKey, model = 'gemini-2.5-flash' }) {
  const activeKey = apiKey || getStoredApiKey();
  if (!activeKey) throw new Error('Gemini API anahtarı tanımlı değil.');
  if (!items?.length) return {};

  const list = items.map((it) => ({
    id: String(it.id),
    title: it.title || '',
    concept: it.conceptTitle || '',
    maxChars: Math.max(8, Math.round(Number(it.maxChars) || 30))
  }));
  const prompt = `
Rol: 1990'lar kültür dergisinin baş editörü.
Görev: Aşağıdaki makale başlıklarını derginin içindekiler ve "Bu Sayıda" listelerinde tek satıra sığacak şekilde kısalt.

Kurallar:
- Her kısa başlık, o öğenin "maxChars" değerini (boşluklar dahil karakter sayısı) KESİNLİKLE aşmasın ve en fazla 4 kelime olsun.
- Sınır izin veriyorsa sınıra yakın, bilgi taşıyan bir başlık yaz; gereksiz kısaltma yapma.
- Konunun özünü ve özel adını koru; açıklayıcı uzun kuyruğu at.
- Başlıkta "Ana İfade: Özel Ad" yapısı varsa onu kullan.
- Örnek (maxChars 30): "Gri Devrim: PlayStation ve 90'ların Oturma Odasını Ele Geçiren Konsol" -> "Gri Devrim: PlayStation"
- Örnek (maxChars 14): aynı başlık -> "PlayStation"
- Türkçe yazım ve özel adların doğru yazılışı korunmalı (PlayStation, Nokia, MTV...).
- Tırnak işareti ve sonda nokta kullanma.

Başlıklar (JSON):
${JSON.stringify(list)}

Sadece şu JSON yapısını döndür:
{ "titles": [ { "id": "aynı id", "shortTitle": "kısa başlık" } ] }
`;

  for (const mod of Array.from(new Set([model, 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']))) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${activeKey}`;
    try {
      recordApiRequest();
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, responseMimeType: 'application/json' }
        })
      });
      if (!res.ok) continue;
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;
      const parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
      const out = {};
      for (const row of parsed?.titles || []) {
        const short = String(row?.shortTitle || '').trim().replace(/^["'“”\s]+|["'“”.,;:\s]+$/g, '');
        if (row?.id != null && short) out[String(row.id)] = short;
      }
      return out;
    } catch (e) {
      console.warn(`Kısa başlık üretimi ${mod} ile başarısız:`, e);
    }
  }
  throw new Error('Kısa başlıklar üretilemedi.');
}
