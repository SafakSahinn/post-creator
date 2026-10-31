/**
 * LORE Görsel Üretim Motoru
 * Gemini 2.5 ile kusursuz İngilizce fotoğraf direktifine dönüştürür
 * ve yüksek çözünürlüklü Flux motoruyla gerçekçi arşiv karesi üretir.
 */

export async function createRefinedPhotoPrompt({ visualNote, title, category, decade, apiKey }) {
  // Eğer Gemini API varsa, önce promptu profesyonel bir fotoğrafçı direktifine dönüştür
  if (apiKey?.trim()) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;
      const systemInstruction = `You are a world-class editorial photography director for Vogue and GQ.
Your job is to convert a vintage cultural topic into a single, clean, hyper-realistic English image prompt.
Rules:
- Describe a REAL archival documentary photograph from that specific era (${decade}).
- Specify authentic 35mm film grain, Kodachrome or Polaroid lighting, real textures, shallow depth of field.
- Absolutely NO surrealism, NO cartoon, NO CGI, NO fantasy, NO text, NO collages.
- Exactly 1 or 2 concise sentences describing only physical objects, people, framing and light.`;

      const promptReq = `Topic: "${title}"
Category: ${category}
Era: ${decade}
Curator Note: "${visualNote}"

Generate ONLY the clean English photo prompt. Do not add quotes, labels, or explanations.`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: promptReq }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: { temperature: 0.4, maxOutputTokens: 120 }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text && text.length > 10) {
          return text.replace(/^"|"$/g, '').trim();
        }
      }
    } catch (e) {
      console.warn('Prompt rafine edilemedi, doğrudan temizleme yapılıyor:', e);
    }
  }

  // Fallback temizleme
  let cleaned = visualNote.replace(/^(Bu içeriğin arka planı için|Küratörün Görsel Notu|Örn:|["'])/gi, '').trim();
  return `Authentic archival ${decade} 35mm documentary photograph of ${cleaned}, realistic natural lighting, editorial magazine archival still, film grain, muted vintage color palette, photorealistic`;
}

export async function generateEditorialImage({ visualNote, title, category, decade, apiKey, customPrompt }) {
  // 1. Kusursuz İngilizce fotoğraf promptu oluştur veya kullanıcının promptunu al
  const photoPrompt = customPrompt?.trim()
    ? customPrompt.trim()
    : await createRefinedPhotoPrompt({ visualNote, title, category, decade, apiKey });

  // 2. Google Imagen 3 API denemesi
  if (apiKey?.trim()) {
    try {
      const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey.trim()}`;
      
      const payload = {
        instances: [{ prompt: `${photoPrompt}, photorealistic archival photograph, no text` }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "4:5",
          outputMimeType: "image/jpeg"
        }
      };

      const res = await fetch(imagenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const base64 = data.predictions?.[0]?.bytesBase64Encoded;
        if (base64) {
          return {
            imageUrl: `data:image/jpeg;base64,${base64}`,
            source: "Google Imagen 3 (Resmi)",
            promptUsed: photoPrompt
          };
        }
      }
    } catch (err) {
      console.warn("Imagen 3 çalışmadı, Flux motoruna geçiliyor:", err);
    }
  }

  // 3. Flux Yüksek Gerçekçilik Motoru (Ultra-Realism & 35mm Dokusu)
  const seed = Math.floor(Math.random() * 9999999);
  // Flux promptunu arındır: no text, raw documentary photo
  const finalFluxPrompt = `${photoPrompt}, raw documentary archival photograph, authentic 35mm film texture, kodachrome, high realism, highly detailed, photorealistic, no text, no watermark`;

  const fluxUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalFluxPrompt)}?width=864&height=1080&model=flux&seed=${seed}&nologo=true&enhance=false`;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      resolve({
        imageUrl: fluxUrl,
        source: "Flux Photoreal (35mm Arşiv)",
        promptUsed: photoPrompt
      });
    };
    img.onerror = () => {
      resolve({
        imageUrl: fluxUrl,
        source: "Flux Photoreal (35mm Arşiv)",
        promptUsed: photoPrompt
      });
    };
    img.src = fluxUrl;
  });
}
