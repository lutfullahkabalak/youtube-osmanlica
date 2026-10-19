# Tanıtım sayfası

Derleme gerektirmeyen statik sayfa. Yerel önizleme:

```sh
python3 -m http.server 8788 --bind 127.0.0.1 --directory landing-page
```

Sayfada tek bir gerçek ekran görüntüsü kullanılıyor: `assets/youtube-cift-altyazi.png`. Görüntü tıklayınca büyütülür. Yeni ekran görüntüsü eklenecekse `config.js` içindeki `screenshots` listesine `src` alanı dolu bir öge ekle; `src` alanı boş ögeler gösterilmez. Mağaza bağlantısı hazır olduğunda aynı dosyadaki `storeUrl` alanını doldurun.

Yayın adresi: https://lutfullahkabalak.github.io/youtube-osmanlica/

GitHub Pages, `gh-pages` dalının kök dizininden yayınlanır. Kaynak bu repodaki `landing-page/` klasörüdür. Değişiklikleri `main` dalına commit edip gönderdikten sonra yeniden yayınlayın:

```sh
sh scripts/publish-pages.sh
```

Komut kontrolleri çalıştırır, bu klasörün geçmişini `gh-pages` dalına aktarır ve GitHub’a gönderir. GitHub Pages yayını ardından otomatik güncellenir. `.nojekyll` statik dosyaların Jekyll işleminden geçirilmesini önler.

Önceki Sites önizlemesi ayrı bir kopyadır: https://youtube-osmanlica-altyazi.stableleaf256.chatgpt.site. GitHub Pages güncellemeleri bu eski kopyayı değiştirmez.

Sayfa demoları tarayıcıda hazırlanmış sabit örneklerdir; API çağrısı veya analitik betiği içermez. `privacy.html` açıklaması eklentinin v0.1.3 altyazı akışına göredir.
