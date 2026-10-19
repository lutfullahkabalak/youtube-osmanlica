# YouTube Osmanlıca Altyazı · 0.1.7

Masaüstü **Chrome 111+ / Edge** için Manifest V3 eklentisi: YouTube oynatıcısındaki Türkçe altyazıyı çeviri motoruna gönderir ve videonun üzerinde **eKalem Düz** fontuyla Osmanlı harfleriyle gösterir.

- Tanıtım ve gizlilik sayfası: <https://lutfullahkabalak.github.io/youtube-osmanlica/>
- Çeviri motoru ayrı projededir: [osmanlica-ceviri](https://github.com/lutfullahkabalak/osmanlica-ceviri) — bu repo yalnızca tarayıcı eklentisini içerir.

## Özellikler

- **Görünüm:** Türkçe + Osmanlıca çifti tek kutuda birlikte ya da yalnız Osmanlıca.
- **Boyut ve konum:** 22–72 px; kutu alt kenara yakın (boşluk video yüksekliğinin %4'ü, en az 12, en fazla 32 px).
- **Geçiş:** Yeni çift hazır olunca iki yazı birlikte değişir. YouTube'un kısa süreli DOM yenilemelerinde (180 ms boşluk toleransı) önceki çift en fazla 750 ms korunur; gerçek boşlukta ikisi birlikte temizlenir. Sarma, reklam, altyazıyı kapatma ve video değişiminde korunma beklenmez.
- **Hata davranışı:** Servis cevap vermezse YouTube'un Türkçe altyazısı geri gelir, bağlantı yeniden denenir.
- **Katman:** Tam ekran ve sinema modunda aynı oynatıcı katmanı kullanılır.
- Eklenti başlangıçta **kapalıdır**; popup'tan açılır.

## Kurulum

1. Repoyu indirin veya Releases'ten ZIP paketini alıp çıkarın. Font pakette hazırdır.
2. `chrome://extensions` (Edge: `edge://extensions`) açın, **Geliştirici modu**nu etkinleştirin.
3. **Paketlenmemiş öğe yükle** ile `manifest.json`'ın bulunduğu reponun kök klasörünü seçin.
4. YouTube sekmesini yenileyin; bir video açıp altyazıyı açın ve dili **Türkçe** seçin (otomatik oluşturulan Türkçe altyazılar da kullanılabilir).
5. Eklenti simgesine tıklayıp **Osmanlıca altyazıyı göster** işaretleyin, **Kaydet ve uygula**.

## Servis ve veri

| Uç nokta | Amaç |
| --- | --- |
| `POST /api/subtitles/translate` | Çeviri (tekli veya toplu) |
| `GET /api/health` | Sağlık kontrolü |

- Varsayılan servis: `https://osmanlica-ceviri.abapnews.tr` — yerel servis çalıştırmak gerekmez. Erişim izni pakette tanımlıdır.
- Kendi sunucunuzu da seçebilirsiniz: ana adresi girip kaydedin, **Servis bağlantısını kontrol et** ile doğrulayın. Başka bir HTTPS adresine ilk kayıtta yalnız o sunucu için izin istenir; yerel HTTP yalnız `localhost` / `127.0.0.1` ile çalışır. Güncellemede kayıtlı adres korunur.
- Eklenti açıkken yalnız görünen ve yaklaşık 20 saniye içindeki Türkçe altyazı parçaları gönderilir; **ses, video, çerezler ve video adresi gönderilmez**.
- Çeviri önbelleği sekme belleğindedir (en fazla 300 metin), video veya ayar değişiminde temizlenir. Servis cevapları 15 saniye ile sınırlıdır.
- **Loglama notu:** Varsayılan sunucunun `/api/subtitles/translate` yolu girdi, çıktı, uyarı, istek metadatası ve motor hata ayrıntılarını loglamaz. Eklenti bu yol kullanılamadığında log tutan `/api/translate` yoluna geri dönmez. Kendi sunucunuzu seçerseniz aynı yolu desteklemeli ve loglama politikasını ayrıca doğrulamalısınız.

## Sınırlar

- Yalnız masaüstü `www.youtube.com` oynatıcısı; Shorts, gömülü oynatıcı, mobil ve resim içinde resim kapsam dışıdır.
- Türkçe altyazıyı kullanıcının seçmesi gerekir; otomatik dil seçimi veya sesten altyazı üretimi yapılmaz.
- YouTube'un sayfa içi altyazı yapısına bağlıdır; YouTube değişirse seçiciler güncellenebilir.
- YouTube zaman kodlu Türkçe veri sağlamazsa çeviri altyazı ekrana geldikten sonra başlar ve servis hızına göre gecikebilir. Çok hızlı değişen satırlar atlanabilir; eski cevaplar yeni satırın üzerine yazılmaz.
- Altyazılar cümle ortasında bölünebildiğinden çözümleme bağlamı sınırlıdır; otomatik altyazı hataları çıktıya yansır. Yalnız eksik çözümleme bilgisi videoda küçük bir notla gösterilir.
- Mağaza yayını bu çalışmaya dahil değildir.

## Geliştirme ve doğrulama

```sh
npm test       # birim testler
npm run build  # paketleri oluşturur
```

- Node.js 22+ ve Python 3 gerekir; npm bağımlılığı yoktur.
- `npm run build` çıktıları: `dist/youtube-osmanlica/`, `dist/youtube-osmanlica.zip` ve Chrome Web Mağazası için `dist/youtube-osmanlica-webstore.zip` (kökte `manifest.json`).
- Kaynak değişince paketi yeniden oluşturup uzantılar sayfasından **Yeniden yükle** yapın; YouTube sekmesini de yenileyin. Servis API'si ve lügat değiştirilmez.
- Simge: `icons/` içinde kırmızı zeminli, siyah `ی` (U+06CC) harfli SVG ve 16/32/48/128/512 px PNG'ler. İsteğe bağlı yeniden üretim: `python3 scripts/create_icon.py` (fonttools + Pillow gerekir; normal test/paketleme bu bağımlılıkları gerektirmez).
- Statik tanıtım ve gizlilik sayfaları `landing-page/` klasöründedir; ekran görüntüleri ve mağaza bağlantısı `landing-page/config.js` dosyasından güncellenir.

### Duman testleri

Playwright CLI `run-code` ile çalıştırılan tarayıcı kontrolleri:

- `browser-smoke.js` — derlenmiş eklenti yüklü ayrı Chromium profilinde, gerçek yerel servis ve kontrollü oynatıcı sayfasıyla: font yüklenmesi, alt kenar konumu, yavaş cevapta çift yazının birlikte görünmesi, temizlenme, boyut/çift dil ayarı, tam ekran ve kapatma. Gerçek YouTube altyazı akışı için Türkçe altyazısı erişilebilir bir video gerekir.
- `browser-default-smoke.js` — kayıtlı ayarlar temizlenmiş profil: yeni kurulumda canlı API varsayılanı, hazır sunucu izni, popup sağlık kontrolü ve gerçek çeviri cevabı.
- `browser-transition-smoke.js` — API cevabı kontrollü geciktirilirken: önceki çiftin korunumu, DOM yenilemedeki kısa boşluğun gizlenmesi, iki satırın birlikte değişmesi ve gerçek boşlukta temizlenme; boyanan kareler örneklemeyle denetlenir.

<details>
<summary>Zaman kodlu altyazıyı önden hazırlama</summary>

YouTube oynatıcısının Türkçe zaman kodlu altyazı kaynağı, sayfanın MAIN dünyasında çalışan `caption-track.js` ile alınır. Yalnız YouTube'un aynı kaynaklı `/api/timedtext` yanıtları işlenir; keyfi URL, hesap verisi veya başka ağ yanıtı okunmaz. Hazır ve önceden kaydedilmiş otomatik altyazılar desteklenir; henüz üretilmemiş canlı altyazı önden hazırlanamaz. YouTube erişim vermediğinde görünür satır akışı devam eder, kısıtlama aşılmaz.

- Kanalın zaman kodları sekme belleğinde tutulur. Oynatma konumundan yaklaşık 20 saniye ilerideki parçalar 8'li gruplarla, aynı anda en fazla bir toplu istekle hazırlanır; yoğun bir pencerede en fazla 128 aday değerlendirilir.
- İleri/geri sarma yeni konuma göre seçim yapar; video veya servis/ayar değişiminde önceki toplu sonuçlar atılır.
- Sunucu `POST /api/subtitles/translate` üzerinde `{"texts":["satır 1","satır 2"]}` kabul eder; sonuç sırası korunur. Sınırlar: en fazla 16 parça, parça başına 4000, toplam 12000 karakter. Toplu yanıt yalnız `output` ve `complete` alanlarını döndürür; log bastırma tekli isteklerle aynıdır.
- Görüntüleme, YouTube'un o anda gösterdiği metinle tam eşleşen önbellek kaydını kullanır; gelecekteki metin erkenden ekrana verilmez.
- Zaman kodu, video kimliği, kanal URL'si ve YouTube çerezleri çeviri API'sine eklenmez. YouTube'a altyazı kaynağı için yapılan normal aynı kaynaklı isteklerde YouTube'un kendi oturum kuralları geçerlidir.
</details>
