/**
 * Post Creator - Çoklu Proje Yönetim Sistemi (Multi-Project Engine)
 * Kullanıcının Lore Magazine, Tech & AI Radar, Sinema Odası gibi
 * farklı yayıncılık projeleri oluşturmasını ve aralarında geçiş yapmasını sağlar.
 */

import { CURATED_INSPIRATIONS } from './curatedTopics';

export const BUILTIN_PROJECTS = [
  {
    id: 'lore-magazine',
    name: 'Lore Magazine',
    shortCode: 'LORE',
    watermark: 'L O R E',
    tagline: 'Kültürel Statü & Nostalji Stüdyosu',
    badge: 'Kültür & Moda',
    buttonText: 'Lore İçeriğini Üret',
    accentColor: '#e6c280',
    editorialTone: 'Yüksek estetik anlayışına sahip elit bir dijital kültür dergisi; popüler kültürün, modanın ve nesnelerin ardındaki gizli statü şifrelerini (lore) çözen, minimalist, entelektüel ve havalı üslup.',
    categories: [
      {
        id: 'Dolap',
        name: 'Dolap',
        sublabel: 'Moda & Stil',
        badge: 'Giyim',
        iconName: 'Shirt',
        tooltip: {
          title: 'Dolap (Moda & Giyim)',
          description: 'Gardırobun görünmeyen sosyolojisi, alt kültür üniformaları, it-bag çılgınlıkları ve kumaşların statü savaşı.'
        }
      },
      {
        id: 'Ekran',
        name: 'Ekran',
        sublabel: 'Sinema & Oyun',
        badge: 'Kült Medya',
        iconName: 'Film',
        tooltip: {
          title: 'Ekran (Sinema & Dizi)',
          description: 'Kült film kareleri, unutulmaz repliklerin ardındaki felsefe, 90\'lar animeleri ve video kaset estetiği.'
        }
      },
      {
        id: 'Masa',
        name: 'Masa',
        sublabel: 'Gastronomi & İçki',
        badge: 'Sofra',
        iconName: 'Utensils',
        tooltip: {
          title: 'Masa (Gastronomi & Ritüel)',
          description: 'Havyarlı pizzalardan üçüncü dalga kahve ritüellerine; yemeğin ve içkinin bir statü sembolüne dönüşme hikayeleri.'
        }
      },
      {
        id: 'Kutu',
        name: 'Kutu',
        sublabel: 'Obje & Teknoloji',
        badge: 'Tasarım',
        iconName: 'Box',
        tooltip: {
          title: 'Kutu (Obje, Tasarım & Oyuncak)',
          description: 'Tamagotchi çılgınlığı, Braun endüstriyel tasarımları, Walkman devrimi ve koleksiyon nesneleri.'
        }
      }
    ],
    filterTypeLabel: '02 / DÖNEM RUHUNU BELİRLE',
    filterCategoryTitle: 'Kronoloji',
    filterOptions: [
      { id: "80'ler", label: "80'ler", sublabel: 'Analog Parlaklık & Power Dressing' },
      { id: "90'lar", label: "90'lar", sublabel: 'Minimalist Grunge & Heroin Chic' },
      { id: "2000'ler", label: "2000'ler", sublabel: 'Y2K & Pop Çağı & Paparazzi' },
      { id: "2010'lar", label: "2010'lar", sublabel: 'Sessiz Lüks & Drop Kültürü' }
    ],
    curatedTopics: CURATED_INSPIRATIONS
  },
  {
    id: 'tech-ai-radar',
    name: 'Tech & AI Radar',
    shortCode: 'TECH',
    watermark: 'T E C H',
    tagline: 'Geleceğin Teknolojileri, Kod & Girişim',
    badge: 'Yapay Zeka & Sistem',
    buttonText: 'Tech Raporunu Üret',
    accentColor: '#38bdf8',
    editorialTone: 'Silikon Vadisi içeriden bir kıdemli mühendis ve teknoloji analisti bakış açısıyla; sansasyonel olmayan, teknik gerçekliğe dayalı, fütüristik, zihni açan ve analitik bir dil. Karmaşık sistemleri berraklaştırır.',
    categories: [
      {
        id: 'Kod & Mimari',
        name: 'Kod & Mimari',
        sublabel: 'Sistem Tasarımı & Dev',
        badge: 'Yazılım',
        iconName: 'Code',
        tooltip: {
          title: 'Kod & Sistem Mimarisi',
          description: 'Milyarlarca isteği yöneten dağıtık sistemler, Linux çekirdeği kararları ve programlama dillerinin evrimi.'
        }
      },
      {
        id: 'Yapay Zeka',
        name: 'Yapay Zeka',
        sublabel: 'LLM, Ajanlar & Modeller',
        badge: 'AI Engine',
        iconName: 'Cpu',
        tooltip: {
          title: 'Yapay Zeka & Ajanlar',
          description: 'Transformer mimarisi, açık kaynak modeller, otonom yapay zeka ajanları ve AGI yarışının perde arkası.'
        }
      },
      {
        id: 'Donanım & Çipler',
        name: 'Donanım & Çipler',
        sublabel: 'GPU, Kuantum & Robotik',
        badge: 'Silicon',
        iconName: 'HardDrive',
        tooltip: {
          title: 'Donanım & Çip Savaşları',
          description: 'TSMC litografisi, Nvidia Tensor çekirdekleri, kuantum işlemciler ve robotik altyapısı.'
        }
      },
      {
        id: 'Girişim & Büyüme',
        name: 'Girişim & Büyüme',
        sublabel: 'Startup, VC & Ürün',
        badge: 'Venture',
        iconName: 'Zap',
        tooltip: {
          title: 'Startup & Büyüme Modelleri',
          description: 'Product-Market Fit bulma hikayeleri, Y Combinator prensipleri ve unicorn şirketlerin kırılma anları.'
        }
      }
    ],
    filterTypeLabel: '02 / ANALİZ DERİNLİĞİ & SEGMENT',
    filterCategoryTitle: 'Format',
    filterOptions: [
      { id: 'Temel & Giriş', label: 'Temel & Giriş', sublabel: 'Karmaşık Teknolojiyi Sadeleştir' },
      { id: 'Derin Mimari', label: 'Derin Mimari', sublabel: 'Kod ve Altyapı Düzeyinde İnceleme' },
      { id: 'Vaka Analizi', label: 'Vaka Analizi', sublabel: 'Bir Şirketin Dönüm Noktası & Hatası' },
      { id: 'Gelecek Tezi', label: 'Gelecek Tezi', sublabel: 'Önümüzdeki 5 Yılın Paradigma Değişimi' }
    ],
    curatedTopics: {
      'Kod & Mimari': {
        'Temel & Giriş': [
          'REST vs GraphQL: Şirketler neden 10 yıl sonra basitliğe geri döndü?',
          'Git nasıl çalışır: Veritabanı olmayan kusursuz bir veri ağacı',
          'Monolit mimarinin mikroservis hevesini çöpe atıp geri dönüşü'
        ],
        'Derin Mimari': [
          'Discord\'un Go\'dan Rust\'a geçiş yaparak gecikmeyi 100 kat düşürme anatomisi',
          'Redis tek bir thread ile nasıl saniyede 1 milyon isteğe cevap verir?',
          'PostgreSQL B-Tree indekslerinin bellek ve disk üzerindeki dansı'
        ],
        'Vaka Analizi': [
          'Knight Capital: 45 dakikada 440 milyon dolar batıran 8 satırlık kod hatası',
          'WhatsApp: Sadece 32 mühendisle 450 milyon kullanıcıya nasıl ulaştı?',
          'CrowdStrike güncellemesinin dünyadaki tüm havalimanlarını felç etme mimarisi'
        ],
        'Gelecek Tezi': [
          'Kod yazmanın sonu mu: Yazılımcılar artık orkestra şefi mi olacak?',
          'WebAssembly (WASM): Tarayıcının işletim sistemine dönüşme süreci',
          'Local-First yazılım: Sunuculara bağımlı olmayan çevrimdışı web çağı'
        ]
      },
      'Yapay Zeka': {
        'Temel & Giriş': [
          'Token mantığı: Yapay zeka kelimeleri değil neden sayı kümelerini düşünür?',
          'Hallucination (Halüsinasyon) bir hata mı yoksa yapay zekanın hayal gücü mü?',
          'Context Window savaşı: 1 milyon token ile tüm kitapları aynı anda okumak'
        ],
        'Derin Mimari': [
          'Attention is All You Need: 2017 makalesinin dünyayı nasıl geri dönülmez kıldığı',
          'Mixture of Experts (MoE): Devasa modellerin küçük uzmanlar ordusuna bölünmesi',
          'RAG (Retrieval-Augmented Generation) mimarisinin vektör veritabanı sırrı'
        ],
        'Vaka Analizi': [
          'OpenAI ve Sam Altman darbesi: Yönetim kurulu neden onu kovdu ve geri aldı?',
          'DeepSeek devrimi: Amerika\'nın milyar dolarlık AI çiplerine ucuz Çin cevabı',
          'Google Gemini\'nin çoklu modalite (Multimodal) ile metin ve resmi birleştirmesi'
        ],
        'Gelecek Tezi': [
          'Otonom Ajanlar (Autonomous Agents): Kendi aralarında anlaşan yazılımlar',
          'Sentetik Veri paradoksu: Yapay zeka kendi ürettiği veriyi yiyerek zehirlenir mi?',
          'Edge AI: Telefonun çipinde çalışan internet gerektirmeyen zeka'
        ]
      },
      'Donanım & Çipler': {
        'Temel & Giriş': [
          'Nanometre savaşı: 3 nanometre ne anlama geliyor ve sınır nerede?',
          'ASML: Dünyadaki en gelişmiş çipleri basabilen tek Hollanda tekelinin hikayesi',
          'CPU vs GPU: Bir profesör ile binlerce ilkokul öğrencisinin matematik yarışı'
        ],
        'Derin Mimari': [
          'Nvidia CUDA: Jensen Huang\'ın 15 yıl önce attığı ve tüm AI dünyasını esir alan yazılım kancası',
          'High Bandwidth Memory (HBM): Belleğin işlemcinin üstüne kat kat dikilmesi',
          'Apple Silicon M Serisi: Birleşik bellek (Unified Memory) ile PC pazarını şok etmesi'
        ],
        'Vaka Analizi': [
          'Intel\'in 10 yıllık çöküşü: Mobil çağı kaçırıp fabrikalarında boğulma hikayesi',
          'Tayvan ve TSMC silikon kalkanı: Dünya ekonomisinin tek bir adaya bağımlılığı',
          'PlayStation 3\'ün Cell işlemcisi: Mühendislik şaheseri mi, geliştirici kabusu mu?'
        ],
        'Gelecek Tezi': [
          'Kuantum bilgisayarlar şifreleme sistemlerini tek gecede çökertecek mi?',
          'Optik/Fotonik işlemciler: Elektrik yerine ışıkla hesap yapan çipler',
          'İnsansı robotların donanım darboğazı: Batarya ve motor torku sınırları'
        ]
      },
      'Girişim & Büyüme': {
        'Temel & Giriş': [
          'Product-Market Fit (PMF): Kullanıcıların ürünü elinizden koparması hissi',
          'Viral Loop matematiği: Her kullanıcının 1.2 yeni kullanıcı getirme formülü',
          'Burn Rate ve Runway: Girişimin bankadaki parası ne zaman sıfırlanır?'
        ],
        'Derin Mimari': [
          'Stripe\'ın 7 satırlık API ile finans dünyasını tekeline alma stratejisi',
          'Figma\'nın tarayıcı tabanlı WebGL ile Adobe\'yi dize getirme hamlesi',
          'Notion\'ın çöküşten topluluk kültüne dönüşen yeniden yazım macerası'
        ],
        'Vaka Analizi': [
          'WeWork ve Adam Neumann: Gayrimenkulü teknoloji diye yutturma çılgınlığı',
          'Theranos: Tek bir damla kanla dünyayı dolandıran sahte unicorn',
          'Airbnb kurucularının batmamak için başkan adayı mısır gevreği satması'
        ],
        'Gelecek Tezi': [
          'Tek kişilik unicorn (Billion dollar one-person company) çağı yaklaşıyor mu?',
          'SaaS modelinin ölümü: Yazılım için aylık abonelik yerine çıktı bazlı ödeme',
          'Açık kaynak girişimciliği: Bedava vererek nasıl milyar dolarlık şirket kurulur?'
        ]
      }
    }
  },
  {
    id: 'cinema-visual-cult',
    name: 'Sinema & Görsel Kültür',
    shortCode: 'CINE',
    watermark: 'C I N E',
    tagline: 'Auteur Sineması, Sahne Analizi & Estetik',
    badge: 'Sinematografi & Sanat',
    buttonText: 'Sinema Postunu Üret',
    accentColor: '#f43f5e',
    editorialTone: 'Cahiers du Cinéma ve Sight & Sound ciddiyetinde; filmlerin ardındaki renk paletlerini, sinematografi tercihlerini, montaj hilelerini ve psikolojik alt metinleri büyüleyici biçimde çözümleyen entelektüel sinemasever dili.',
    categories: [
      {
        id: 'Yönetmen Bakışı',
        name: 'Yönetmen Bakışı',
        sublabel: 'Auteur İmzası & Vizyon',
        badge: 'Auteur',
        iconName: 'Camera',
        tooltip: {
          title: 'Yönetmen Bakışı & Auteur Kuramı',
          description: 'Kubrick simetrisi, Wong Kar-Wai melankolisi, Fincher takıntısı ve Wes Anderson pastel dünyası.'
        }
      },
      {
        id: 'Sahne Analizi',
        name: 'Sahne Analizi',
        sublabel: 'Bir Sahnenin Anatomisi',
        badge: 'Mise-en-Scène',
        iconName: 'Clapperboard',
        tooltip: {
          title: 'Mizansen & Sahne Anatomisi',
          description: 'Tek bir sekansın ışığı, çerçevelemesi ve arkasında yatan psikolojik gerilim kodları.'
        }
      },
      {
        id: 'Kült Karakter',
        name: 'Kült Karakter',
        sublabel: 'Arketipler & Replikler',
        badge: 'Persona',
        iconName: 'UserCheck',
        tooltip: {
          title: 'Kült Karakterler & Arketipler',
          description: 'Anti-kahramanlar, unutulmaz repliklerin doğaçlama sırları ve karakter kostüm psikolojisi.'
        }
      },
      {
        id: 'Görsel Estetik',
        name: 'Görsel Estetik',
        sublabel: 'Işık, Renk & Doku',
        badge: 'Palet',
        iconName: 'Palette',
        tooltip: {
          title: 'Görsel Estetik & Sinematografi',
          description: '35mm film greni, neon-noir aydınlatma, anamorfoz lensler ve renk teorisi.'
        }
      }
    ],
    filterTypeLabel: '02 / SİNEMA DÖNEMİ & TÜR',
    filterCategoryTitle: 'Dönem',
    filterOptions: [
      { id: 'Altın Çağ & Klasikler', label: 'Altın Çağ', sublabel: '70\'ler Yeni Hollywood & Klasikler' },
      { id: '80\'ler & 90\'lar Kült', label: '80 & 90 Kült', sublabel: 'Neo-Noir, Cyberpunk & Bağımsızlar' },
      { id: 'Modern Başyapıtlar', label: 'Modern Çağ', sublabel: '2000\'ler Milenyum Sineması' },
      { id: 'Arthouse & A24', label: 'Arthouse', sublabel: 'A24 Estetiği, Festival & Bağımsız' }
    ],
    curatedTopics: {
      'Yönetmen Bakışı': {
        'Altın Çağ & Klasikler': [
          'Stanley Kubrick\'in tek kaçışlı perspektif (One-Point Perspective) takıntısı',
          'Alfred Hitchcock ve Vertigo etkisi: Kamera geriye kayarken zum yapmanın dehşeti',
          'Francis Ford Coppola\'nın Baba filminde gölgelerle yüzleri karartma cüreti'
        ],
        '80\'ler & 90\'lar Kült': [
          'Wong Kar-wai\'nin Step-Printing tekniği: Zamanın sıvı gibi akması',
          'David Fincher\'ın asla elde kamera kullanmama kuralı ve mekanik mükemmeliyetçiliği',
          'Quentin Tarantino\'nun bagaj çekimleri ve popüler kültür diyalog orkestrasyonu'
        ],
        'Modern Başyapıtlar': [
          'Christopher Nolan\'ın zamanı doğrusal olmayan bir bulmacaya dönüştürme sanatı',
          'Denis Villeneuve ve ölçek dehşeti: Devasa uzay gemileri karşısında aciz insan figürü',
          'Paul Thomas Anderson\'ın uzun plan sekanslarında karakterleri köşeye sıkıştırma dehası'
        ],
        'Arthouse & A24': [
          'Yorgos Lanthimos\'un balıkgözü lenslerle yarattığı soğuk yabancılaşma hissi',
          'Robert Eggers\'ın The Lighthouse\'da 1.19:1 kare en-boy oranı ile yarattığı klostrofobi',
          'Céline Sciamma\'nın Portrait of a Lady on Fire\'da müziksiz yarattığı görsel ritim'
        ]
      },
      'Sahne Analizi': {
        'Altın Çağ & Klasikler': [
          'The Godfather vaftiz sahnesi: Kutsal sözler ile kanlı cinayetlerin montaj tezatlığı',
          'Taxi Driver\'ın "You talkin\' to me?" sahnesi: Aynadaki parçalanmış benlik',
          'Apocalypse Now \'Ride of the Valkyries\' sekansının savaş estetikleştirmesi'
        ],
        '80\'ler & 90\'lar Kült': [
          'Fight Club IKEA kataloğu sahnesi: Tüketim köleliğinin görsel infografikleşmesi',
          'Matrix lobi çatışması sahnesi: Mermilerin ve mermer tozlarının balesi',
          'Pulp Fiction dans yarışması: 60\'lar Fransız Yeni Dalga sinemasına saygı duruşu'
        ],
        'Modern Başyapıtlar': [
          'Whiplash final 9 dakikası: Davul solosunun psikolojik kan gölüne dönmesi',
          'No Country for Old Men otel odası sahnesi: Müziksiz mutlak sessizlik gerilimi',
          'Parasite sel felaketi sahnesi: Zenginlerden fakirlerin bodrumuna akan su metaforu'
        ],
        'Arthouse & A24': [
          'Midsommar güpegündüz aydınlıkta yaşanan dehşet: Karanlık olmayan korku filmi',
          'Aftersun diskotek sahnesi: David Bowie şarkısında donan hüzünlü baba hatırası',
          'Past Lives New York sokaklarında veda sahnesi: İki kültür arasındaki sessizlik'
        ]
      },
      'Kült Karakter': {
        'Altın Çağ & Klasikler': [
          'Travis Bickle: New York gecelerinde arınma arayan yalnız bir gazinin çöküşü',
          'Michael Corleone: Babasının yolundan gitmek istemezken canavara dönüşen prens',
          'Jack Torrance: The Shining\'in daktilo başında deliren yazar arketipi'
        ],
        '80\'ler & 90\'lar Kült': [
          'Patrick Bateman: Kusursuz cilt bakımı ile cinayet histerisi arasındaki yuppie',
          'Tyler Durden: 90\'lar erkeğinin IKEA dünyasından intikam alan hayali figürü',
          'The Dude (Big Lebowski): Halısı çalındığı için mafyayla karşılaşan tembel zen ustası'
        ],
        'Modern Başyapıtlar': [
          'Anton Chigurh: Şans ve yazı tura ile ölüm dağıtan saç stiliyle ikonikleşmiş sosyopat',
          'Daniel Plainview (There Will Be Blood): Petrol hırsıyla insanlığını yitiren kapitalist',
          'Joker (Heath Ledger): Kaosun felsefesini tek bir kartvizite dönüştüren anarşist'
        ],
        'Arthouse & A24': [
          'Pearl: Çiftlik evinde yıldız olma hayaliyle çıldıran kanlı dansçı',
          'Thomas Wake (Willem Dafoe): Deniz fenerinde deniz mitolojisi tüküren deli kaptan',
          'Lady Bird: Kendi adını kendi koyan ergenlik isyanı ve anne-kız çatışması'
        ]
      },
      'Görsel Estetik': {
        'Altın Çağ & Klasikler': [
          'Technicolor üç şerit sistemi: Kırmızı ve mavilerin masalsı doygunluğu',
          'Chinatown ve sıcak sarı tonlar: 1930\'lar Los Angeles kuraklığının görsel tercümesi',
          'Barry Lyndon: Yalnızca gerçek mum ışığı ile çekilen NASA lensli sahneler'
        ],
        '80\'ler & 90\'lar Kült': [
          'Blade Runner (1982) neon-noir: Sis, yağmur ve dev reklam panoları',
          'Fallen Angels ve aşırı geniş açı lenslerle deforme edilen yalnız yüzler',
          'Twin Peaks kırmızı oda (Black Lodge): Zikzak zemin ve kırmızı kadife perdeler'
        ],
        'Modern Başyapıtlar': [
          'Amélie\'nin yeşil ve sıcak sarı renk paleti: Paris\'i masalsı bir kutuya çevirmek',
          'Mad Max: Fury Road\'un turuncu kumlar ve kobalt mavi gökyüzü kontrastı',
          'Her (2013) filminde mavi rengin tamamen yasaklanması ve pastel melankoli'
        ],
        'Arthouse & A24': [
          'The Florida Project: Mor binalar ve pastel dondurma renklerinin ardındaki yoksulluk',
          'Euphoria makyajı ve 35mm Ektachrome film pelikülü kullanımı',
          'The Zone of Interest: Aşırı nötr ve soğuk doğal ışıkla dehşetin sıradanlığı'
        ]
      }
    }
  },
  {
    id: 'minimal-living',
    name: 'Sessiz Lüks & Minimalizm',
    shortCode: 'QUIET',
    watermark: 'Q U I E T',
    tagline: 'Sadeleşme, Mekan Tasarımı & Zamansız Kalite',
    badge: 'Tasarım & Yaşam',
    buttonText: 'Minimalist İçeriği Üret',
    accentColor: '#a8a29e',
    editorialTone: 'Kinfolk, Monocle ve Cereal dergisi zarafetinde; gösterişten ve gürültüden uzak, nefes aldıran, yalın, sakin ve derin bir dinginlik hissi veren duru Türkçe. Tüketim baskısını zarafetle eleştirir.',
    categories: [
      {
        id: 'Mekan & Mimari',
        name: 'Mekan & Mimari',
        sublabel: 'Wabi-Sabi & Brutalism',
        badge: 'Mimari',
        iconName: 'Home',
        tooltip: {
          title: 'Mekan, Işık & Mimari',
          description: 'Beton, ahşap ve doğal ışığın dengesi; Japon Wabi-Sabi felsefesi ve İskandinav sadeliği.'
        }
      },
      {
        id: 'Eşya & Sadeleşme',
        name: 'Eşya & Sadeleşme',
        sublabel: 'Kapsül Yaşam & Azın Gücü',
        badge: 'Detoks',
        iconName: 'Feather',
        tooltip: {
          title: 'Eşya Detoksu & Kapsül Yaşam',
          description: 'Bir ömürlük 100 eşya, fonksiyonellik fetişi ve dağınıklığın zihinsel maliyeti.'
        }
      },
      {
        id: 'Sessiz Lüks',
        name: 'Sessiz Lüks',
        sublabel: 'Logosuz Statü & Kalite',
        badge: 'Quiet Luxury',
        iconName: 'Sparkles',
        tooltip: {
          title: 'Sessiz Lüks (Quiet Luxury)',
          description: 'Logosuz kaşmir kazaklar, Loro Piana şapkaları ve gerçek zenginliğin fısıltısı.'
        }
      },
      {
        id: 'Zihin & Rutinler',
        name: 'Zihin & Rutinler',
        sublabel: 'Yavaş Yaşam & Dijital Detoks',
        badge: 'Ritüel',
        iconName: 'Compass',
        tooltip: {
          title: 'Zihin, Ritüel & Yavaş Yaşam',
          description: 'Bildirimleri kapatma cesareti, sabah sessizliği ritüelleri ve analog sığınaklar.'
        }
      }
    ],
    filterTypeLabel: '02 / ODAK VE DERİNLİK',
    filterCategoryTitle: 'Felsefe',
    filterOptions: [
      { id: 'Felsefe & Köken', label: 'Felsefe & Köken', sublabel: 'Neden Daha Az Sahip Olmalıyız?' },
      { id: 'Pratik Sadeleşme', label: 'Pratik Rehber', sublabel: 'Bugün Yaşamına Uygulayabileceğin Adımlar' },
      { id: 'Vaka & Mekan İnceleme', label: 'Mekan İnceleme', sublabel: 'İkonik Evler, Tasarımcılar & Nesneler' },
      { id: 'Eleştirel Bakış', label: 'Eleştirel Bakış', sublabel: 'Minimalizmin Tüketim Tuzağına Dönüşmesi' }
    ],
    curatedTopics: {
      'Mekan & Mimari': {
        'Felsefe & Köken': [
          'Wabi-Sabi: Kusurlu çatlakların ardındaki Japon güzellik felsefesi',
          'Mies van der Rohe: "Az çoktur" (Less is more) ilkesinin cam evleri',
          'Gölgeye Övgü (In\'ei Raisan): Japon mimarisinde ışık yerine karanlığın estetiği'
        ],
        'Pratik Sadeleşme': [
          'Görsel gürültüyü (Visual Clutter) evden silmenin 5 mimari prensibi',
          'Sıcak minimalizm: Soğuk hastane odası gibi olmadan sade bir ev yaratmak',
          'Tek bir odak noktası: Odadaki tüm mobilyaları tek bir sanat eserine göre dizmek'
        ],
        'Vaka & Mekan İnceleme': [
          'Axel Vervoordt\'un Belçika kalesi: Bin yıllık taşlar ile minimal sanatın buluşması',
          'Kengo Kuma ve ahşap kafes mimarisi: Doğanın içinde eriyen binalar',
          'Rick Owens ve Michèle Lamy\'nin Paris apartmanı: İlkel brutalist lüks'
        ],
        'Eleştirel Bakış': [
          'Airbnb estetiği: Tüm dünyadaki evlerin birbirinin tıpatıp aynısı bej kutulara dönüşmesi',
          'Zenginlerin yoksul gibi görünme fantezisi: Çıplak beton duvarların 5 milyon dolarlık bedeli',
          'Minimalist evde çocuk büyütmenin imkansızlığı ve sterilite yalanı'
        ]
      },
      'Eşya & Sadeleşme': {
        'Felsefe & Köken': [
          'Diderot Etkisi: Yeni bir sabahlık aldığınızda tüm mobilyaları değiştirmek zorunda kalmak',
          'William Morris kuralı: "Evinizde faydalı bilmediğiniz veya güzel olduğuna inanmadığınız hiçbir şeyi tutmayın"',
          'Eşyaların enerjisi: Sahip olduğunuz her nesne zihninizde açık bir tarayıcı sekmesidir'
        ],
        'Pratik Sadeleşme': [
          'Kapsül Gardırop: 33 parça kıyafetle 3 ay boyunca kusursuz giyinmek',
          'Ters Askı Metodu: 6 ay boyunca giyilmeyen kıyafetlerle vedalaşma kuralı',
          'Dijital Eşya Detoksu: Masaüstündeki tüm ikonları silip siyah duvar kağıdına geçmek'
        ],
        'Vaka & Mekan İnceleme': [
          'Steve Jobs\'un oturma odası fotoğrafı: Sadece bir lamba ve bir pikap',
          'Dieter Rams\'ın "İyi Tasarımın 10 İlkesi" ve Braun hesap makinesinin iPhone\'a mirası',
          'Bir ömürlük 100 eşya listesi: Seyahat çantasına sığan bir hayat'
        ],
        'Eleştirel Bakış': [
          'Daha az eşyaya sahip olmak için binlerce dolar harcama paradoksu',
          'Plastik saklama kutusu endüstrisi: Dağınıklığı çözmek yerine saklamayı satmak',
          'Sadeleşmeyi bir ahlaki üstünlük yarışına dönüştüren züppelik'
        ]
      },
      'Sessiz Lüks': {
        'Felsefe & Köken': [
          'Stealth Wealth (Görünmez Zenginlik): Logolar kime hitap eder, logosuzluk kime?',
          'Eski Para (Old Money) vs Yeni Para (New Money) estetiğinin sosyolojik çatışması',
          'Fısıldayan lüks: Kaliteyi sadece aynı kulüpteki insanların anlayabilmesi kodu'
        ],
        'Pratik Sadeleşme': [
          'Gardıroptan tüm markaları sökmek: Kumaşın dokusunu logonun önüne koymak',
          'Monokrom giyim sanatı: Bej, lacivert, füme ve siyahın zamansız uyumu',
          'Trendleri görmezden gelmenin verdiği zihinsel özgürlük'
        ],
        'Vaka & Mekan İnceleme': [
          'Loro Piana ve vicuña yünü: And Dağları\'nın en pahalı lifinin ardındaki hikaye',
          'Brunello Cucinelli: İtalya Solomeo köyünde kurulan hümanist kapitalizm',
          'The Row (Olsen kardeşler): 1500 dolarlık beyaz tişörtün ardındaki dikiş mühendisliği'
        ],
        'Eleştirel Bakış': [
          'Sessiz lüksün aslında ekonomik kriz dönemlerinde zenginlerin hedef olmama kamuflajı olması',
          'TikTok\'un "Old Money" akımını fast-fashion polyesterine dönüştürme ironisi',
          'Sessizliğin kendisinin de bir statü pazarlaması aracına evrilmesi'
        ]
      },
      'Zihin & Rutinler': {
        'Felsefe & Köken': [
          'JOMO (Joy of Missing Out): Bir şeyleri kaçırmanın verdiği derin huzur',
          'Monotasking: Aynı anda tek bir işle meşgul olmanın kaybolan süper gücü',
          'Can sıkıntısının değeri: Boşluğa izin vermeden yaratıcılık yeşerir mi?'
        ],
        'Pratik Sadeleşme': [
          'Sabahın ilk 1 saati telefonsuz yaşama kuralı ve beynin dopamin dengesi',
          'Siyah-Beyaz ekran modu: Telefonu gri yaparak bağımlılığı kırma taktiği',
          'Haftalık Analog Gün: Pazar günleri sıfır ekran ile kağıt, kalem ve yürüyüş'
        ],
        'Vaka & Mekan İnceleme': [
          'Seneca ve Stoacı sadeleşme mektupları: "Yeteri kadar olan fazladır"',
          'Haruki Murakami\'nin sabah 4\'te uyanıp koştuğu katı editoryal rutini',
          'Alain de Botton ve Sessizlik Okulu: Gürültülü dünyada iç sükunet inşa etmek'
        ],
        'Eleştirel Bakış': [
          'Verimlilik pornografisi: Her saniyeyi bir kişisel gelişim projesine çevirme deliliği',
          'Meditasyon aplikasyonlarının kullanıcıyı ekrana bağlama çelişkisi',
          'Huzurun da parayla satın alınabilen bir lüks tüketim ürününe dönüşmesi'
        ]
      }
    }
  }
];

const STORAGE_PROJECTS_KEY = 'pc_user_projects';
const ACTIVE_PROJECT_KEY = 'pc_active_project_id';

/**
 * Kayıtlı tüm projeleri getirir (Varsayılanlar + Kullanıcının eklediği özel projeler)
 */
export function getAllProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_PROJECTS_KEY);
    if (!raw) {
      return BUILTIN_PROJECTS;
    }
    const userCustomProjects = JSON.parse(raw);
    // Builtin projeler ile custom projeleri birleştir
    const combined = [...BUILTIN_PROJECTS];
    userCustomProjects.forEach((custom) => {
      const idx = combined.findIndex((p) => p.id === custom.id);
      if (idx >= 0) {
        combined[idx] = custom; // Güncellenmiş
      } else {
        combined.push(custom);
      }
    });
    return combined.map((p) => ({
      ...p,
      watermark: p.watermark || (p.shortCode ? p.shortCode.split('').join(' ') : (p.name || 'POST').slice(0, 4).toUpperCase().split('').join(' '))
    }));
  } catch (err) {
    console.warn('Projeler yüklenirken hata:', err);
    return BUILTIN_PROJECTS;
  }
}

/**
 * Aktif seçili projeyi getirir
 */
export function getActiveProject() {
  const all = getAllProjects();
  const activeId = localStorage.getItem(ACTIVE_PROJECT_KEY) || 'lore-magazine';
  const found = all.find((p) => p.id === activeId);
  return found || all[0] || BUILTIN_PROJECTS[0];
}

/**
 * Aktif projeyi değiştirir
 */
export function setActiveProjectId(id) {
  localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pc_project_changed', { detail: { projectId: id } }));
  }
}

/**
 * Yeni proje kaydeder veya var olanı günceller
 */
export function saveProject(project) {
  const raw = localStorage.getItem(STORAGE_PROJECTS_KEY);
  let customProjects = [];
  try {
    customProjects = raw ? JSON.parse(raw) : [];
  } catch {
    customProjects = [];
  }

  const existingIdx = customProjects.findIndex((p) => p.id === project.id);
  if (existingIdx >= 0) {
    customProjects[existingIdx] = project;
  } else {
    customProjects.push(project);
  }

  localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(customProjects));
  setActiveProjectId(project.id);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pc_projects_updated'));
  }
  return project;
}

/**
 * Özel projeyi siler (Yerleşik projeler silinemez, sıfırlanır)
 */
export function deleteProject(id) {
  if (BUILTIN_PROJECTS.some((b) => b.id === id)) {
    throw new Error('Yerleşik sistem projeleri silinemez.');
  }

  const raw = localStorage.getItem(STORAGE_PROJECTS_KEY);
  if (!raw) return;
  try {
    const list = JSON.parse(raw).filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(list));
    // Eğer silinen proje aktifse varsayılana dön
    if (localStorage.getItem(ACTIVE_PROJECT_KEY) === id) {
      setActiveProjectId('lore-magazine');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pc_projects_updated'));
    }
  } catch (err) {
    console.error('Proje silinemedi:', err);
  }
}
