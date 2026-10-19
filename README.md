# Tanıtım sayfası

Derleme gerektirmeyen statik sayfa. Yerel önizleme:

```sh
python3 -m http.server 8788 --bind 127.0.0.1 --directory landing-page
```

Gerçek ekran görüntüleri geldiğinde `assets/` klasörüne ekleyip `config.js` içindeki üç `screenshots[].src` alanını doldurun. Yer tutucular otomatik olarak gerçek görsellere dönüşür; tıklayınca büyütülür. Mağaza bağlantısı hazır olduğunda aynı dosyadaki `storeUrl` alanını doldurun. Geçerli ekran görüntüsü veya mağaza bağlantısı yokken bunlar varmış gibi gösterilmez.

Bu klasörün barındırılan Sites kopyası: https://youtube-osmanlica-altyazi.stableleaf256.chatgpt.site (özel önizleme). Sites kaynak kaydı ayrı yönetilir; sonraki değişikliklerde bu klasörü ve mevcut Site kaynağını birlikte güncelleyin. Yeni Site oluşturmayın. Mevcut project_id: `appgprj_6ad5db3e152881919196679b59a99e7c`.

Sayfa demoları tarayıcıda hazırlanmış sabit örneklerdir; API çağrısı veya analitik betiği içermez. `privacy.html` açıklaması eklentinin v0.1.3 altyazı akışına göredir.
