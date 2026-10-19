# YouTube Osmanlıca Altyazı · 0.1.7

Masaüstü Chrome 111+ / Edge için Manifest V3 eklentisi. YouTube oynatıcısında gösterilen Türkçe altyazıyı mevcut Osmanlıca çeviri motoruna gönderir ve eKalem Düz ile videonun üzerinde gösterir. Türkçe kelimeleri ve eklerini Osmanlı harflerine aktarır.

Tanıtım sayfası: https://lutfullahkabalak.github.io/youtube-osmanlica/

## Kurulum

1. Repoyu indirin veya Releases bölümünden ZIP paketini alıp çıkarın. Eklenti ve eKalem Düz fontu pakette hazırdır.
2. Chrome’da `chrome://extensions` (Edge’de `edge://extensions`) açın. **Geliştirici modu**nu etkinleştirin.
3. **Paketlenmemiş öğe yükle** ile reponun kök klasörünü (`manifest.json` dosyasının bulunduğu klasör) seçin. ZIP kullanıyorsanız önce çıkarın ve içindeki `youtube-osmanlica` klasörünü seçin.
4. Varsayılan servis `https://osmanlica-ceviri.abapnews.tr`; yerel servis çalıştırmanız gerekmez.
5. Açık YouTube sekmesini yenileyin. Bir video açın, altyazıyı açın ve altyazı dilini **Türkçe** seçin; otomatik oluşturulan Türkçe altyazılar da kullanılabilir.
6. Eklenti simgesine tıklayın. **Osmanlıca altyazıyı göster** seçeneğini işaretleyip **Kaydet ve uygula**ya basın.

Eklenti başlangıçta kapalıdır. Yazı boyutu 22–72 px arasında ayarlanır. Türkçe altyazıyı birlikte gösterebilir veya yalnız Osmanlı harfli çıktıyı seçebilirsiniz. Çift dil açıkken Türkçe ve Osmanlı harfli karşılığı tek kutuda, birlikte gösterilir. Yeni satırın çevirisi beklenirken önceki Türkçe/Osmanlıca çifti en fazla 750 ms korunur; yeni çift hazır olunca birlikte değiştirilir. YouTube’un altyazı düğümlerini kısa süreli yenilemesi için 180 ms boşluk toleransı vardır. Gerçek boşlukta iki yazı birlikte temizlenir; sarma, reklam, altyazıyı kapatma ve video değişiminde beklenmez. Yeni satır isteği ek tarama gecikmesi olmadan başlatılır. Servis hatasında YouTube’un Türkçe altyazısı geri gelir. Tam ekran ve sinema modunda aynı oynatıcı katmanı kullanılır. Altyazı kutusu alt kenara yakındır: alt boşluk video yüksekliğinin %4’ü, en az 12 ve en fazla 32 pikseldir.

## Servis ve veri

Varsayılan API: `https://osmanlica-ceviri.abapnews.tr/api/subtitles/translate`. Sağlık kontrolü: `/api/health`. Çeviri motoru eklentinin içinde değildir; varsayılan olarak canlı sunucuyu kullanır. İsterseniz kendi HTTPS sunucunuzu veya yerelde `http://127.0.0.1:8765` adresini seçebilirsiniz. Farklı servis için ana adresi girip kaydedin, ardından **Servis bağlantısını kontrol et** düğmesine basın. Varsayılan sunucu erişim izni pakette tanımlıdır. Başka bir HTTPS adresine ilk kayıtta yalnız o sunucu için erişim izni istenir. Yerel HTTP yalnız `localhost` ve `127.0.0.1` ile kullanılabilir. Bağlantı kontrolü kaydedilmiş adresi kullanır. Güncellemede önceden kaydedilmiş servis adresi korunur; canlı API’ye geçmek için adresi değiştirip kaydedin.

Eklenti açıkken görünen ve yaklaşık 20 saniye içindeki sıradaki Türkçe altyazı parçaları servise gönderilebilir; ses, video, çerezler ve video adresi gönderilmez. **Varsayılan sunucudaki `/api/subtitles/translate` yolu uygulama kullanım loglarını atlar; altyazı girdisi, çıktısı, uyarılar ve istek metadatası bu yolda loglanmaz. Motor hatası ve panic ayrıntıları da bu yolda uygulama loguna yazılmaz. Eklenti, bu yol kullanılamadığında log tutan `/api/translate` yoluna geri dönmez. Kendi sunucunuzu seçerseniz aynı yolu desteklemeli ve loglama politikasını ayrıca doğrulamalısınız.** Eklenti çeviri önbelleği sekme belleğindedir, en fazla 300 metin tutar ve video/ayar değişiminde temizlenir. Servis cevapları 15 saniye ile sınırlıdır. Hatalarda YouTube’un Türkçe altyazısı geri gelir, bağlantı yeniden denenir.

## Sınırlar

- YouTube’un masaüstü `www.youtube.com` oynatıcısına yöneliktir. Shorts, gömülü oynatıcı, mobil ve resim içinde resim modu bu sürümün kapsamı dışındadır.
- Türkçe altyazıyı kullanıcının seçmesi gerekir. Otomatik dil seçimi veya sesten altyazı üretimi yapılmaz.
- YouTube’un sayfa içindeki altyazı yapısına bağlıdır; YouTube değişirse seçiciler güncellenebilir.
- YouTube zaman kodlu Türkçe altyazı verisini sağlarsa yaklaşan parçalar 8’li gruplarla önceden çevrilir. YouTube bu veriyi vermediğinde, boş döndürdüğünde veya parça önceden hazırlanamamışsa çeviri altyazı göründükten sonra başlar ve servis hızına göre gecikebilir. Çok hızlı değişen satırlar atlanabilir; eski cevaplar yeni satırın üzerine yazılmaz.
- Altyazılar cümle ortasında bölünebildiğinden çözümleme bağlamı sınırlıdır. Otomatik altyazı hataları çıktıya yansır. Yalnız eksik çözümleme bilgisi videoda küçük bir notla gösterilir.
- Paket uygulamadaki eKalem Düz fontunu aynen içerir. Mağaza yayını bu çalışmaya dahil değildir.

## Geliştirme ve doğrulama

```sh
npm test
npm run build
```

`npm run build`, yalnız eklenti dosyalarını ve fontu içeren `dist/youtube-osmanlica/` klasörünü ve `dist/youtube-osmanlica.zip` paketini oluşturur. Chrome Web Mağazası için ayrıca `manifest.json` dosyası kökte olan `dist/youtube-osmanlica-webstore.zip` üretilir. Node.js 22+ ve Python 3 gerekir; npm bağımlılığı yoktur.

Paket kaynakları değiştiğinde yeniden oluşturun ve uzantılar sayfasında **Yeniden yükle**ye basın; YouTube sekmesini de yenileyin. Servis API’si ve lügat değiştirilmez.

`browser-smoke.js`, derlenmiş eklenti yüklenmiş ayrı bir Chromium profilinde Playwright CLI `run-code` ile çalıştırılabilen tarayıcı kontrolüdür. Gerçek yerel servisi kullanır; YouTube adresine yönlendirilen kontrollü oynatıcı sayfasında fontun gerçekten yüklendiğini, alt kenar konumunu, yavaş servis cevabında iki yazının birlikte görünmesini, altyazı temizlenmesini, boyut/çift dil ayarını, tam ekranı ve kapatmayı doğrular. Gerçek YouTube altyazı akışı için ayrıca Türkçe altyazısı erişilebilir bir videoyla kontrol gerekir.

Çeviri motoru ayrı projededir: [osmanlica-ceviri](https://github.com/lutfullahkabalak/osmanlica-ceviri). Bu repo yalnız tarayıcı eklentisini içerir.

`browser-default-smoke.js`, ayrı test profilinde kayıtlı ayarları temizleyerek yeni kurulumun canlı API varsayılanını, hazır sunucu iznini, popup sağlık kontrolünü ve gerçek çeviri cevabını doğrular. Playwright CLI `run-code` ile çalıştırılır.

## Tanıtım sayfası

Statik tanıtım ve gizlilik sayfaları [landing-page/](landing-page/) klasöründedir. Ekran görüntüleri için üç yer tutucu ayrılmıştır; görseller ve mağaza bağlantısı `landing-page/config.js` dosyasından güncellenir.

## Simge

`icons/` klasöründe kırmızı (`#FF0000`) zemin ve siyah Osmanlıca ye (`ی`, U+06CC) harfinden oluşan SVG ile 16/32/48/128/512 px PNG dosyaları bulunur. Harf eKalem Düz fontundan üretilmiştir. Yeniden üretme isteğe bağlıdır: `python3 scripts/create_icon.py` (fonttools ve Pillow gerekir). Normal test/paketleme bu bağımlılıkları gerektirmez.

`browser-transition-smoke.js`, gerçek API cevabı kontrollü geciktirilirken hazır altyazı geçişlerinde önceki çiftin korunduğunu, DOM yenilenmesindeki kısa boşluğun gizlendiğini, iki satırın birlikte değiştiğini ve gerçek boşlukta temizlendiğini boyanan kareleri örnekleyerek denetler.

## Zaman kodlu altyazıyı önden hazırlama

YouTube oynatıcısının Türkçe zaman kodlu altyazı kaynağı, sayfanın MAIN dünyasında çalışan `caption-track.js` ile alınır. Yalnız YouTube’un aynı kaynaklı `/api/timedtext` yanıtları işlenir; keyfi URL, hesap verisi veya başka ağ yanıtı okunmaz. Hazır ve önceden kaydedilmiş otomatik altyazılar desteklenir. Henüz üretilmemiş canlı altyazı önden hazırlanamaz. YouTube erişim vermediğinde görünür satır akışı devam eder; erişim kısıtlaması aşılmaz.

Kanalın zaman kodları sekme belleğinde tutulur. Oynatma konumundan yaklaşık 20 saniye ilerideki parçalar 8’li gruplarla, aynı anda en fazla bir toplu istekle hazırlanır. Yoğun bir pencerede en fazla 128 farklı aday değerlendirilir. İleri/geri sarma yeni konuma göre seçim yapar. Video veya servis/ayar değişiminde önceki toplu sonuçlar atılır. Sunucu `POST /api/subtitles/translate` üzerinde `{"texts":["satır 1","satır 2"]}` kabul eder; sonuç dizisinin sırası korunur. API sınırları en fazla 16 parça, parça başına 4000 ve toplam 12000 karakterdir. Toplu yanıt yalnız `output` ve `complete` alanlarını döndürür. Log bastırma tekli isteklerle aynıdır.

Görüntüleme YouTube’un o anda gösterdiği metinle tam eşleşen önbellek kaydını kullanır; gelecekteki metin erkenden ekrana verilmez. Zaman kodu, video kimliği, kanal URL’si ve YouTube çerezleri çeviri API’sine eklenmez. YouTube’a altyazı kaynağı için yapılan normal aynı kaynaklı isteklerde YouTube’un kendi oturum kuralları geçerlidir.
