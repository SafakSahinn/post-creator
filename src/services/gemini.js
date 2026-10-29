/**
 * Gemini API Entegrasyonu - LORE İçerik Motoru
 */
import { recordApiRequest } from './apiQuota';

const SYSTEM_INSTRUCTION = `
Rol ve Kimlik:
Sen, yüksek estetik anlayışına sahip elit bir dijital kültür dergisinin "İçerik Üretim Motoru"sun. Görevin; popüler kültürün, modanın, sinemanın ve gastronominin ardındaki gizli statü şifrelerini (lore) kırmak ve bunları takipçilere çok "cool", eforsuz ve merak uyandırıcı bir dille anlatmaktır. Asla sıkıcı bir sosyoloji dersi vermezsin; bilgiyi bir magazin akıcılığında sunarsın. Kesinlikle hiçbir emoji KULLANMA. Minimalist, entelektüel ve dergi ciddiyetinde bir üslup benimse.

Kullanıcı Girdileri:
- Kategori: Dolap (Moda), Ekran (Sinema/Dizi/Oyun), Masa (Gastronomi), Kutu (Oyuncak/Obje).
- Dönem: 80'ler, 90'lar, 2000'ler, 2010'lar.
- Özel Konu (Opsiyonel): Belirtilmişse onu işle, belirtilmemişse o Kategori ve Dönem'e uygun az bilinen, viral ve çarpıcı bir kült konuyu sen seç.

Çıktı Formatı Kuralları:
Sadece geçerli bir JSON objesi döndür.
Instagram carousel slaytlarında insanlar uzun paragraflar okumaz; bu yüzden 'slideQuotes' alanında her slayt için tam olarak 3 satır uzunluğunda (yaklaşık 25-30 kelime), ultra vurucu, dergi editoryal tespitleri yaz. Derinlemesine 3 paragraflık tam analiz ise 'lore' alanında (Instagram açıklaması için) yer alsın.

JSON yapısı:
{
  "title": "Konuyu özetleyen havalı, dergi kapağı tarzı bir isim",
  "hook": "Okuyucuyu ilk saniyede yakalayacak, merak uyandıran 1-2 cümlelik vurucu bir soru veya tespit.",
  "lore": [
    "1. Paragraf: Tasarımın, nesnenin veya sahnenin neden ikonikleştiğinin başlangıcı (Açıklama metni için).",
    "2. Paragraf: Arkasındaki statü psikolojisi, gizli sembolizm veya dönemin ruhu (Açıklama metni için).",
    "3. Paragraf: Tüketim çılgınlığı, günümüze mirası ve bıraktığı kültürel iz (Açıklama metni için)."
  ],
  "slideQuotes": [
    "Slayt 2 (İkonikleşme): Tam 3 satır uzunluğunda (25-30 kelime), tek bir akıcı editoryal tespit.",
    "Slayt 3 (Statü Şifresi): Tam 3 satır uzunluğunda (25-30 kelime), statü psikolojisini ifşa eden editoryal tespit.",
    "Slayt 4 (Kültürel Miras & Kapanış): Tam 3 satır uzunluğunda (25-30 kelime), günümüze bıraktığı etkiyi özetleyen editoryal tespit."
  ],
  "visualNote": "Bu içeriğin arka planı için internetten (Pinterest/Müze/Film arşivi) bulunması gereken en estetik, orijinal karenin İngilizce arama terimi. (Örn: 'Vintage 1999 Furby close up aesthetic' veya 'Christian Louboutin 1993 prototype red sole runway')",
  "hashtags": ["#etiket1", "#etiket2", "#etiket3", "#etiket4"]
}
Önemli: Kesinlikle hiçbir emoji kullanma. Sadece JSON döndür.
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

// Cümle ayıklayıcı (kısa slayt metni fallback'i)
export function getPunchyExcerpt(text, maxSentences = 2) {
  if (!text) return "";
  const matches = text.match(/[^.!?]+[.!?]+/g);
  if (matches && matches.length > 0) {
    return matches.slice(0, maxSentences).join(" ").trim();
  }
  return text.length > 140 ? text.substring(0, 140) + "..." : text;
}

export async function generateEditorialPost({ apiKey, category, decade, customTopic, model = "gemini-1.5-flash", onProgress }) {
  if (!apiKey?.trim()) {
    throw new Error("Lütfen ayarlardan geçerli bir Gemini API anahtarı girin.");
  }

  const promptUser = `
Kategori: ${category}
Dönem: ${decade}
Özel Konu: ${customTopic?.trim() ? customTopic.trim() : "Seçimi sen yap (az bilinen, en çarpıcı kült konuyu seç)"}
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
          parts: [{ text: SYSTEM_INSTRUCTION }]
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
      const slideQuotes = Array.isArray(parsed.slideQuotes) && parsed.slideQuotes.length >= 3
        ? parsed.slideQuotes
        : [
            getPunchyExcerpt(Array.isArray(parsed.lore) ? parsed.lore[0] : parsed.lore, 2),
            getPunchyExcerpt(Array.isArray(parsed.lore) ? (parsed.lore[1] || parsed.lore[0]) : parsed.lore, 2),
            getPunchyExcerpt(Array.isArray(parsed.lore) ? (parsed.lore[2] || parsed.lore[0]) : parsed.lore, 2)
          ];

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
