/**
 * Gemini API Entegrasyonu - Post Creator Dinamik İçerik Motoru
 */
import { recordApiRequest } from './apiQuota';

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
Instagram carousel slaytlarında görselin nefes alması ve en fazla 2-3 SATIRDA (yaklaşık 10-13 kelime) rahatça okunabilmesi için 'slideQuotes' alanında her slayt için TEK BİR KISA, NET VE VURUCU CÜMLE yaz.
ÖNEMLİ: Cümle MUTLAKA eksiksiz, noktayla veya ünlemle biten tam bir editoryal tespit olmalıdır. Asla 2. bir cümleye geçme, tek bir vurucu cümleyle bitir. Asla 13 kelimeyi aşma ki slaytta tam 2-3 satırda kalsın, görseli boğmasın ve asla yarım kalmasın. Derinlemesine 3 paragraflık tam editoryal analiz ise 'lore' alanında (Instagram açıklaması için) yer alsın.

JSON yapısı:
{
  "title": "Konuyu özetleyen havalı, dergi kapağı tarzı bir isim",
  "hook": "Okuyucuyu ilk saniyede yakalayacak, merak uyandıran 1-2 cümlelik vurucu bir soru veya tespit.",
  "lore": [
    "1. Paragraf: Giriş ve konunun çarpıcı başlangıcı.",
    "2. Paragraf: Derin analiz, perde arkası veya gizli mekanizma.",
    "3. Paragraf: Geleceğe etkisi, günümüze mirası veya kapanış çıkarımı."
  ],
  "slideQuotes": [
    "Slayt 2: Tam 2-3 satıra sığacak, tek bir eksiksiz cümle (10-13 kelime, noktayla biten).",
    "Slayt 3: Tam 2-3 satıra sığacak, tek bir eksiksiz cümle (10-13 kelime, noktayla biten).",
    "Slayt 4: Tam 2-3 satıra sığacak, tek bir eksiksiz cümle (10-13 kelime, noktayla biten)."
  ],
  "visualNote": "Bu içeriğin görseli için Pinterest/Unsplash/Arşiv için en uygun İngilizce estetik arama terimi.",
  "hashtags": ["#etiket1", "#etiket2", "#etiket3", "#etiket4"]
}
Önemli: Kesinlikle hiçbir emoji kullanma. Sadece JSON döndür. Slayt cümleleri tam 2-3 satırlık (10-13 kelime) tek ve bitmiş bir cümle olsun.
`;
}

const DEFAULT_SYSTEM_INSTRUCTION = `
Rol ve Kimlik:
Sen, yüksek estetik anlayışına sahip elit bir dijital kültür dergisinin "İçerik Üretim Motoru"sun. Görevin; popüler kültürün, modanın, sinemanın ve nesnelerin ardındaki gizli statü şifrelerini (lore) kırmak ve bunları takipçilere çok "cool", eforsuz ve merak uyandırıcı bir dille anlatmaktır. Asla sıkıcı bir sosyoloji dersi vermezsin; bilgiyi bir magazin akıcılığında sunarsın. Kesinlikle hiçbir emoji KULLANMA. Minimalist, entelektüel ve dergi ciddiyetinde bir üslup benimse.

Çıktı Formatı Kuralları:
Sadece geçerli bir JSON objesi döndür.
Instagram carousel slaytlarında görselin nefes alması ve en fazla 2-3 SATIRDA (yaklaşık 10-13 kelime) rahatça okunabilmesi için 'slideQuotes' alanında her slayt için TEK BİR KISA, NET VE VURUCU CÜMLE yaz.
ÖNEMLİ: Cümle MUTLAKA eksiksiz, noktayla veya ünlemle biten tam bir editoryal tespit olmalıdır. Asla 2. bir cümleye geçme, tek bir vurucu cümleyle bitir. Asla 13 kelimeyi aşma ki slaytta tam 2-3 satırda kalsın, görseli boğmasın ve asla yarım kalmasın. Derinlemesine 3 paragraflık tam editoryal analiz ise 'lore' alanında (Instagram açıklaması için) yer alsın.

JSON yapısı:
{
  "title": "Konuyu özetleyen havalı, dergi kapağı tarzı bir isim",
  "hook": "Okuyucuyu ilk saniyede yakalayacak, merak uyandıran 1-2 cümlelik vurucu bir soru veya tespit.",
  "lore": [
    "1. Paragraf: Tasarımın, nesnenin veya sahnenin neden ikonikleştiğinin başlangıcı.",
    "2. Paragraf: Arkasındaki statü psikolojisi, gizli sembolizm veya dönemin ruhu.",
    "3. Paragraf: Tüketim çılgınlığı, günümüze mirası ve bıraktığı kültürel iz."
  ],
  "slideQuotes": [
    "Slayt 2 (İkonikleşme): Tam 2-3 satıra sığacak, tek bir eksiksiz cümle (10-13 kelime, noktayla biten).",
    "Slayt 3 (Statü Şifresi): Tam 2-3 satıra sığacak, tek bir eksiksiz cümle (10-13 kelime, noktayla biten).",
    "Slayt 4 (Kültürel Miras & Kapanış): Tam 2-3 satıra sığacak, tek bir eksiksiz cümle (10-13 kelime, noktayla biten)."
  ],
  "visualNote": "Bu içeriğin arka planı için internetten bulunması gereken en estetik orijinal karenin İngilizce arama terimi.",
  "hashtags": ["#etiket1", "#etiket2", "#etiket3", "#etiket4"]
}
Önemli: Kesinlikle hiçbir emoji kullanma. Sadece JSON döndür. Slayt cümleleri tam 2-3 satırlık (10-13 kelime) tek ve bitmiş bir cümle olsun.
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

// Cümle ayıklayıcı (kısa slayt metni fallback'i - tam 2-3 satırlık tek ve eksiksiz cümle)
export function getPunchyExcerpt(text, maxSentences = 1) {
  if (!text) return "";
  const clean = text.trim().replace(/^["'“]+|["'”]+$/g, '');
  const matches = clean.match(/[^.!?]+[.!?]+/g);
  if (matches && matches.length > 0) {
    const first = matches[0].trim();
    const words = first.split(/\s+/);
    if (words.length <= 13) {
      return first;
    }
    return words.slice(0, 12).join(" ") + ".";
  }
  // Noktalama yoksa kelime sınırında kes ve nokta koy
  const words = clean.split(/\s+/);
  if (words.length <= 12) {
    return clean + (/[.!?]$/.test(clean) ? '' : '.');
  }
  return words.slice(0, 12).join(" ") + ".";
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

      // Slaytlarda 2-3 satırı aşmayan, eksiksiz, noktayla biten tek cümle garantisi
      const slideQuotes = rawSlideQuotes.map((q) => {
        if (!q) return '';
        let s = q.trim().replace(/^["'“]+|["'”]+$/g, '');
        const sentences = s.match(/[^.!?]+[.!?]+/g);
        if (sentences && sentences.length > 0) {
          const first = sentences[0].trim();
          const words = first.split(/\s+/);
          if (words.length <= 13) return first;
          return words.slice(0, 12).join(' ') + '.';
        }
        const words = s.split(/\s+/);
        if (words.length > 12) {
          return words.slice(0, 12).join(' ') + '.';
        }
        if (!/[.!?]$/.test(s)) {
          s = s.replace(/[,;:\s]+$/, '') + '.';
        }
        return s;
      });

      // Instagram Açıklama (Caption) formatı (Tüm detaylı paragraflar buraya gelir)
      const formattedCaption = `[Gönderi Başlığı: ${parsed.title}]

Kanca (Hook):
${parsed.hook}

Lore (Hikaye):
${Array.isArray(parsed.lore) ? parsed.lore.join("\n\n") : parsed.lore}

Küratörün Görsel Notu:
${parsed.visualNote}

${Array.isArray(parsed.hashtags) ? parsed.hashtags.join(" ") : parsed.hashtags}`;

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
