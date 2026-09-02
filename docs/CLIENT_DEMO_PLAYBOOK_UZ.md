# Paypoq OS — mijoz demosini o‘tkazish qo‘llanmasi

## Demo maqsadi

Mijozga “yana bir ERP”ni emas, paypoq fabrikasining kundalik nazorat tizimini ko‘rsating. Asosiy hikoya:

> Xomashyo va ishlab chiqarish bosqichidan boshlab, tayyor mahsulot, sotuv, qarz va ish haqi holatigacha bitta joyda ko‘rinadi.

Demo 30–45 daqiqa davom etadi. Har bir ekranni ko‘rsatish shart emas. Mijoz uchun eng muhim biznes zanjirini ko‘rsating va savollarga vaqt qoldiring.

## Demo oldidan tayyorgarlik

### Texnik tekshiruv

Demodan kamida 30 daqiqa oldin:

1. API, web va ma’lumotlar bazasi ishlayotganini tekshiring.
2. Loginni alohida oynada sinab ko‘ring.
3. Owner va cheklangan operator hisoblari bilan kirib ko‘ring.
4. Kerakli fabrika tanlanganini tekshiring.
5. Dashboard, `/machines`, `/production`, `/warehouse`, `/sales/orders`, supplier va payroll sahifalarini bir marta oching.
6. Demo paytida ishlatiladigan yozuvlarning IDsi va holatini tekshiring.
7. Brauzer zoomini 100% qiling, bildirishnomalarni o‘chiring va keraksiz tablarni yoping.
8. Internetga bog‘liq Telegram yoki mobile qismni oldindan real qurilmada tekshirmagan bo‘lsangiz, jonli va’da bermang.
9. Factory TV’ni ko‘rsatmang: auditda demo factory kontekstiga bog‘liqlik topilgan.
10. Demo bazasining zaxira holati yoki qayta tiklash rejasini tayyorlang.

### Tayyorlanadigan sample data

Bitta tushunarli hikoya ishlating: **“Andijon Paypoq — 10 000 juft qora klassik paypoq”**.

| Ma’lumot | Tavsiya etilgan namuna |
|---|---|
| Korxona | Andijon Paypoq |
| Fabrika | Asosiy fabrika |
| Ombor | Xomashyo ombori; Tayyor mahsulot ombori |
| Zonalar | Ip; Qadoqlash; Tayyor mahsulot |
| Mahsulot | Klassik paypoq |
| Variant | Qora, 40–44, qishki |
| Material | Qora ip, rezina, etiketka, paket |
| Stanok | Lonati-01, Lonati-02 |
| Smena | Kunduzgi smena |
| Xodimlar | 1 operator, 1 mexanik, 1 qadoqlovchi, 1 Shift Receiver |
| Bosqichlar | To‘qish → Tikish → Dazmollash → Qadoqlash → Ombor |
| Partiya | BATCH-DEMO-10000 |
| Bosqich qoldig‘i | To‘qish 2 000; Tikish 1 500; Dazmollash 1 000; Qadoqlash 700; Ombor 500 |
| Mijoz | Baraka Savdo MChJ |
| Buyurtma | 1 000 juft × 12 000 so‘m = 12 000 000 so‘m |
| Mijoz to‘lovi | 7 000 000 so‘m; 5 000 000 so‘m qarz qoladi |
| Supplier | Textile Yarn MChJ |
| Purchase | 100 kg qora ip × 80 000 so‘m = 8 000 000 so‘m |
| Supplier to‘lovi | 3 000 000 so‘m; 5 000 000 so‘m qarz qoladi |
| Xarajat | Elektr energiyasi — 2 500 000 so‘m |
| Payroll | Joriy oy; kamida 3 xodim; biri qisman to‘langan |
| Nuqson | 20 juft, “tikuv nuqsoni” |
| Past qoldiq | Etiketka threshold ostida |

Sample data talablari:

- pul summalari yumaloq va og‘zaki tushuntirishga oson bo‘lsin;
- bitta to‘liq to‘langan, bitta qisman to‘langan va bitta to‘lanmagan yozuv bo‘lsin;
- barcha muhim ro‘yxatlarda kamida 3 ta yozuv bo‘lsin;
- demo qilinadigan partiyada yetarli qoldiq bo‘lsin;
- noto‘g‘ri yoki takroriy yozuv yaratishga majbur bo‘lmaslik uchun oldindan aniq nomlar tayyorlang;
- real mijoz, xodim, telefon, bank yoki parol ma’lumotidan foydalanmang.

## Modullarni ko‘rsatish tartibi

1. Login, rol va fabrika tanlash
2. Dashboard
3. Stanoklar va production run
4. Ishlab chiqarish va Stage Inventory
5. Nuqson va ishchi faoliyati
6. Ombor
7. Mijozlar va buyurtmalar
8. Mijoz to‘lovi, qarz va yetkazish
9. Supplier purchase, to‘lov va qarz
10. Xarajat va advance
11. Payroll
12. Hisobot va audit izi
13. Xodimlar va ruxsatlar
14. Telegram va mobile — faqat tushuntirish yoki oldindan tekshirilgan qisqa ko‘rsatish
15. Yakuniy dashboard va savol-javob

Bu tartib biznes oqimini saqlaydi: **ishlab chiqarish → ombor → sotuv → pul → ish haqi → rahbar nazorati**.

## 30–45 daqiqalik to‘liq demo ssenariysi

### 0–3 daqiqa — Kirish

Ayting:

> Paypoq OS fabrikadagi asosiy savollarga javob beradi: qayerda nechta mahsulot bor, kim nima qildi, qancha sotildi, kimdan qancha olishimiz va kimga qancha berishimiz kerak.

Ko‘rsating:

- shaxsiy login;
- tanlangan fabrika;
- rolga qarab menyu farqi.

Urg‘u: har operator faqat o‘z ishiga kerak bo‘lgan bo‘limni ko‘radi. Moliyaviy tasdiqlovchi va to‘lovchini amalda alohida odam sifatida tashkil qilish kerak; tizimdagi yanada qat’iy ajratish rejalashtirilgan yaxshilanish.

### 3–6 daqiqa — Dashboard

Ayting:

> Rahbar ertalab birinchi navbatda shu ekranga kiradi. Bu yerda ishlab chiqarish, ombor, buyurtma, qarz va e’tibor talab qiladigan holatlar jamlangan.

Ko‘rsating:

- bugungi ishlab chiqarish;
- bosqich qoldiqlari;
- past stock ogohlantirishi;
- mijoz va supplier qarzi;
- ochiq payroll yoki xarajatlar.

Savol bering: “Hozir siz ertalab shu raqamlarni nechta odamdan va nechta Excel fayldan yig‘asiz?”

### 6–10 daqiqa — Stanok va production run

Ko‘rsating:

1. Lonati-01 stanogini oching.
2. Operator, mahsulot varianti va smenani ko‘rsating.
3. Tayyor production runni oching.
4. Oldindan tayyorlangan kichik outputni qabul qiling yoki mavjud intake tarixini ko‘rsating.

Ayting:

> Biz IoT va avtomatik sensorni V1ga majburan qo‘shmadik. Hozir real ish jarayoniga mos ravishda mas’ul odam tasdiqlaydi. Keyin ishonchli jarayon ustiga avtomatlashtirish qo‘shish mumkin.

Eslatma: production run intake avtomatik payroll activity yaratadi deb aytmang.

### 10–15 daqiqa — Ishlab chiqarish va Stage Inventory

Bu demoninng markaziy qismi.

1. BATCH-DEMO-10000 partiyasini toping.
2. Har bosqichdagi qoldiqni ko‘rsating.
3. Masalan, Tikishdan Dazmollashga 100 juft ko‘chiring.
4. Oldingi bosqich 100 taga kamayib, keyingisi 100 taga oshganini tekshiring.
5. Qoldiqdan ko‘p ko‘chirishga tizim yo‘l qo‘ymasligini og‘zaki tushuntiring; jonli xato yaratish shart emas.

Ayting:

> Paypoq OSning asosiy biznes metrigi partiya emas, Stage Inventory. Rahbar har bir bosqichda qancha mahsulot tiqilib qolganini ko‘radi. Partiya esa izchillik va sababni topish uchun saqlanadi.

### 15–18 daqiqa — Ishchi faoliyati va nuqson

Ko‘rsating:

- bitta ishchi faoliyati yozuvi;
- bitta nuqson yozuvi;
- kim, qachon, qaysi bosqichda va qancha kiritganini.

Ayting:

> Ishchi faoliyati ish haqi uchun dalil bo‘lishi mumkin, lekin u mahsulot qoldig‘ini o‘zi o‘zgartirmaydi. Qoldiq faqat alohida, mas’ul tasdiqlagan harakat bilan o‘zgaradi.

### 18–21 daqiqa — Ombor

Ko‘rsating:

- xomashyo va tayyor mahsulot qoldig‘i;
- ombor va zona;
- past qoldiq threshold;
- oxirgi stock harakatlari.

Ayting:

> Purchase — moliyaviy majburiyat. Stock kirimi — jismoniy tovar kelgani. Tizim ularni ataylab alohida saqlaydi, chunki hisob-faktura kelishi bilan tovar kelishi har doim bir vaqt emas.

### 21–26 daqiqa — Sotuv, to‘lov va qarz

1. Baraka Savdo mijozini oching.
2. 12 000 000 so‘mlik buyurtmani ko‘rsating.
3. 7 000 000 so‘m to‘lovni va 5 000 000 so‘m qolgan qarzni ko‘rsating.
4. To‘lov qaysi buyurtmaga taqsimlanganini ko‘rsating.
5. Yetkazish stockni kamaytirishi va qarz qoldirishi mumkinligini tushuntiring.

Muhim izoh:

> Rasmiy siyosat: yetkazib berish sex tomonidan va mijoz uchun bepul; dastur
> to‘liq to‘lanmagan buyurtmani ham yetkazishga ruxsat beradi va qolgan
> summani mijoz qarzi sifatida saqlaydi.

### 26–30 daqiqa — Supplier va qarz

Ko‘rsating:

- 8 000 000 so‘mlik ip purchase;
- 3 000 000 so‘m to‘lov;
- 5 000 000 so‘m supplier qarzi;
- allocation tarixi.

Ayting:

> Supplier qarzi purchase va to‘lovlardan hisoblanadi. Purchase stockni avtomatik ko‘paytirmaydi; tovar real kelganda omborchi alohida kirim qiladi.

Jonli supplier payment yaratish shart emas. Demo fixture’ni qayta ishlatishdagi ma’lum muammo sabab mavjud xavfsiz yozuvlarni ko‘rsatish afzal.

### 30–34 daqiqa — Xarajat, advance va payroll

Ko‘rsating:

- xarajatning so‘rov → tasdiq → to‘lov holatlari;
- xodim advance yozuvi;
- payroll davri, xodim summasi, to‘langan va qolgan summa.

Ayting:

> Maqsad buxgalteriya dasturini almashtirish emas. Paypoq OS operatsion pul oqimini ishlab chiqarish va xodim faoliyati bilan bog‘laydi. Rasmiy soliq va bosh kitob hisobi alohida tizimda qolishi mumkin.

Ehtiyot chorasi: parallel payroll payment yaratmang. Auditda concurrency xavf patterni topilgan, lekin runtime natijasi hali maxsus test bilan tasdiqlanishi kerak.

### 34–37 daqiqa — Hisobot, audit va xodimlar

Ko‘rsating:

- rahbar ko‘radigan umumiy natijalar;
- muhim amalni kim va qachon bajargani;
- xodimni o‘chirish o‘rniga inactive qilish;
- turli rol bilan menyu farqi.

Ayting:

> Muhim savol faqat “raqam nechta?” emas, “bu raqam qayerdan paydo bo‘ldi va kim kiritdi?” Tizimning foydasi shu izni saqlashda.

### 37–40 daqiqa — Telegram va mobile

Faqat oldindan sinovdan o‘tgan bo‘lsa ko‘rsating. Aks holda screenshot yoki qisqa tushuntirish yetarli.

Ayting:

> Ishchilar web kabinetga kirmaydi. Telegram orqali o‘ziga kerakli cheklangan ma’lumotni olishi rejalashtirilgan oqimga mos. Mobile esa rahbar uchun ko‘rish va nazorat poydevori. Real qurilma session sinovlari production oldidan alohida bajariladi.

Telegram identity/privacy va mobile refresh’ni production-ready deb aytmang.

### 40–45 daqiqa — Yakun va savollar

Dashboardga qayting.

Ayting:

> Bugun biz bitta zanjirni ko‘rdik: stanokdan chiqqan mahsulot bosqichlar bo‘ylab yurdi, omborga tushdi, buyurtmaga sotildi, mijoz qarzi va supplier qarzi ko‘rindi, xodim mehnati payrollga tayyorlandi. Paypoq OSning qiymati — shu ma’lumotlarni bitta operatsion haqiqatga aylantirish.

Keyingi qadamni taklif qiling:

1. bitta fabrika va bitta smena bilan nazoratli pilot;
2. mijozning delivery, approval va correction siyosatini yozma kelishish;
3. boshlang‘ich katalog va qoldiqni tayyorlash;
4. operatorlarni rollar bo‘yicha o‘qitish;
5. backup/restore va P0 audit shartlarini yopish;
6. bir hafta parallel nazorat, keyin qaror.

## Har bir modulni sodda o‘zbekcha tushuntirish

| Modul | Sodda tushuntirish |
|---|---|
| Dashboard | Fabrikaning bugungi umumiy holati |
| Stanoklar | Qaysi stanok ishlayapti, kim javobgar va nima ishlab chiqaryapti |
| Ishlab chiqarish | Mahsulot hozir qaysi bosqichda va nechta |
| Ishchi faoliyati | Qaysi ishchi qancha ish bajardi |
| Nuqson | Qayerda qancha brak yoki muammo chiqdi |
| Ombor | Xomashyo va tayyor mahsulot qayerda, qancha |
| Mijozlar | Kimga sotamiz va u bizdan qancha qarz |
| Buyurtmalar | Mijoz nima, qancha va nech pulga buyurtma qildi |
| Mijoz to‘lovi | Mijoz qancha to‘ladi va qaysi buyurtmaga yozildi |
| Yetkazish/qaytarish | Qancha mahsulot chiqib ketdi yoki qaytib keldi |
| Supplier | Kimdan xomashyo olamiz va unga qancha qarzimiz bor |
| Xarajat | Elektr, transport va boshqa operatsion chiqimlar |
| Advance | Xodimga oldindan berilgan pul |
| Payroll | Xodim qancha ishlab topdi, qancha to‘landi va qancha qoldi |
| Xodimlar | Kim ishlaydi, vazifasi nima va qaysi fabrikaga kiradi |
| Hisobot | Davr bo‘yicha natijalarni ko‘rish |
| Audit tarixi | Muhim amalni kim va qachon bajarganini ko‘rish |
| Telegram bot | Xodim yoki mijozga o‘ziga tegishli qisqa ma’lumotni yetkazish |
| Mobile | Rahbar uchun telefondan asosiy ko‘rsatkichlarni ko‘rish |
| Factory TV | Sex ekranida ishlab chiqarish holatini ko‘rsatish; hozir production demoda ko‘rsatilmasin |

## Production-ready deb ko‘rsatish mumkin bo‘lgan qismlar

“Production-ready” iborasini faqat **nazoratli bir fabrikali pilot**, kuchli secrets, backup/restore va audit P0 shartlari bajarilgan kontekstda ishlating.

- asosiy web login va rolga asoslangan ish jarayoni;
- production run va output qabul qilish;
- Stage Inventory va bosqichlararo harakat;
- manfiy qoldiqni rad etish;
- ombor stock harakatlari;
- mijoz, buyurtma, to‘lov allocationi, qarz va return/reversal asosiy oqimi;
- supplier purchase, payment allocation va qarz hisoblash;
- supplier payment idempotency va transaction himoyasi;
- xodim faoliyati va payroll hisoblashning asosiy oqimi;
- audit yozuvlari;
- production secrets va CORS uchun konfiguratsiya tekshiruvlari;
- development/demo seedning productionda bloklanishi.

Bu ro‘yxat “barcha edge case productionda sinovdan o‘tgan” degani emas.

## “Rejalashtirilgan yaxshilanish” deb aytiladigan qismlar

- Manager tasdiqlashi va Accountant to‘lovi uchun qat’iy alohida ruxsatlar;
- Factory TV credentialini aniq tenant/factoryga bog‘lash;
- payroll va finance transitionlar uchun maxsus concurrency himoyasi va testi;
- refresh tokenni parallel qayta ishlatishga qarshi atomik himoya;
- ko‘p tenantda bir xil email uchun aniq login siyosati;
- barcha katta ro‘yxatlar uchun pagination va performance limitlari;
- Telegram uchun shared rate limit, real production smoke va privacy operatsiyasi;
- mobile uchun real iOS/Android session va recovery sinovlari;
- encrypted off-host avtomatik backup va davriy restore mashqi;
- dependency advisoriesni reachability bo‘yicha yopish;
- delivery uchun paid-only yoki debt-enabled siyosatni mijoz bo‘yicha sozlash;
- kelajakda IoT integratsiyasi, faqat qo‘lda jarayon barqarorlashgandan keyin.

## Demoda ko‘rsatmaslik kerak bo‘lgan zaif joylar

1. Factory TV — demo tenantga bog‘langan kontekst tuzatilmaguncha.
2. Ikki brauzerdan parallel payroll payment.
3. Bir expense/advanceni bir vaqtda approve va reject qilish.
4. Bir refresh tokenni parallel ishlatish.
5. Bir xil email bilan ikki tenant login holati.
6. Supplier paymentdan keyin demo seedni qayta ishga tushirish.
7. Fresh browser testlari o‘tmagan muhitda “hamma UI testdan o‘tgan” deyish.
8. Real Telegram bot, agar webhook/polling va account linking shu kuni tekshirilmagan bo‘lsa.
9. Real mobile refresh/logout, agar aynan shu build va qurilma sinovdan o‘tmagan bo‘lsa.
10. Backup/restore’ni production-ready deb ko‘rsatish, agar encrypted off-host restore dalili bo‘lmasa.
11. “Buxgalteriyani to‘liq almashtiradi” yoki “har qanday fabrikaga tayyor” degan da’vo.

## Eng ko‘p uchraydigan operator xatolari

- noto‘g‘ri fabrika tanlash;
- bir tugmani tarmoq sekinligida bir necha marta bosish;
- partiya yoki mahsulot variantini adashtirish;
- mavjud qoldiqni tekshirmay ko‘chirish;
- worker activity bilan stock movementni bir narsa deb o‘ylash;
- supplier purchase yaratib, stock ham oshdi deb o‘ylash;
- omborga kelmagan tovarni kirim qilish;
- paymentni noto‘g‘ri order/purchasega taqsimlash;
- qarz va stockni frontendda qo‘lda hisoblash;
- correction o‘rniga soxta qarshi yozuv yaratish;
- payroll yopishdan oldin activity/stavkani tekshirmaslik;
- demo paytida real maxfiy yoki shaxsiy ma’lumotni ochish.

## Demo paytida muammo chiqsa

### Login ishlamasa

1. Email/parolni qayta-qayta kiritmang.
2. To‘g‘ri demo hisob ekanini tekshiring.
3. API health va database holatini tekshiring.
4. Oldindan ochilgan, xavfsiz sessionga o‘ting.
5. Tuzalmaysa screenshot orqali oqimni tushuntiring va muammoni yashirmang.

### Sahifa ochilmasa yoki eski ko‘rinsa

1. Hard refresh qiling.
2. Bitta yangi incognito oynada tekshiring.
3. Serverni demo o‘rtasida qayta build qilmang.
4. Oldindan tayyorlangan screenshot yoki boshqa modulga o‘ting.

### Mutation xato bersa

1. Tugmani takror bosmang.
2. Ro‘yxatni yangilab, amal aslida saqlanganini tekshiring.
3. Yozuv IDsi, vaqt va xabarni yozib oling.
4. Yangi soxta yozuv bilan “to‘g‘rilamang”.
5. Mavjud, oldindan tayyorlangan yozuv orqali hikoyani davom ettiring.

### Stock yoki pul raqami kutilmaganda chiqsa

1. To‘g‘ri fabrika, davr, status va yozuv tanlanganini tekshiring.
2. Audit/history orqali manbani ko‘rsating.
3. Jonli ma’lumotni o‘zgartirib yashirmang.
4. “Buni tekshirib, dalil bilan qaytamiz” deb ayting.

### Telegram yoki mobile ishlamasa

1. Demo vaqtini debuggingga sarflamang.
2. Uni “real muhit testi talab qiladigan kanal” deb aniq ayting.
3. Webdagi asosiy biznes oqimiga qayting.

### To‘liq demo to‘xtasa

Uchta screenshot va bitta diagramma bilan davom eting:

1. Dashboard.
2. Stage Inventory.
3. Buyurtma va qarz.
4. Ishlab chiqarish → ombor → sotuv → pul oqimi.

## Mijoz berishi mumkin bo‘lgan savollar va kuchli javoblar

### “Bu 1C yoki buxgalteriya dasturini almashtiradimi?”

Yo‘q. Paypoq OSning vazifasi fabrikadagi ishlab chiqarish, stock, qarz va ish haqi operatsiyalarini boshqarish. Rasmiy soliq, bank va bosh kitob hisobi alohida buxgalteriya tizimida qolishi mumkin.

### “Excel’dan nima farqi bor?”

Excelda ma’lumot fayllarga va odamlarga bo‘linib ketadi. Paypoq OSda bir harakat keyingi ko‘rsatkichlarga bog‘lanadi: ishlab chiqarish qoldig‘i, ombor, buyurtma, qarz va payroll izchil ko‘rinadi; kim kiritgani ham saqlanadi.

### “Internet o‘chsa nima bo‘ladi?”

Hozir asosiy ish server bilan aloqani talab qiladi. Internet uzilganda operator amallarni takrorlamaydi, vaqtincha qog‘oz qayd yuritadi va aloqa qaytgach mas’ul nazoratida kiritadi. To‘liq offline write — rejalashtirilgan yaxshilanish.

### “Ma’lumotlarim boshqa fabrikaga ko‘rinmaydimi?”

Asosiy foydalanuvchi oqimlari tenant va fabrika konteksti bilan ajratilgan. Lekin productiondan oldin alohida Deep Security Scan va ko‘p tenantli isolation testi talab qilinadi. Factory TV aynan shu sabab hozircha production demoda ishlatilmaydi.

### “Xodim noto‘g‘ri ma’lumot kiritsa nima qilamiz?”

Muhim amallar audit izida qoladi. To‘lov va yetkazishda reversal/correction oqimidan foydalaniladi. Hamma domenlarda bir xil qulay correction hali to‘liq emas, shuning uchun xatoni delete yoki soxta yozuv bilan yashirmay, mas’ul tasdig‘i bilan tuzatamiz.

### “Bir amal ikki marta yozilib qolmaydimi?”

Supplier payment va ayrim ishlab chiqarish oqimlarida takroriy so‘rov himoyasi bor. Barcha mutationlarda bir xil daraja deb va’da bermaymiz; operator tugmani takror bosmasligi va natijani tekshirishi kerak.

### “Ma’lumot yo‘qolsa-chi?”

Kodda backup va restore vositalari bor, lekin production uchun encrypted off-host backup va toza bazaga real restore mashqi pilotning majburiy sharti. Faqat “backup olindi” emas, “restore qilindi” dalili kerak.

### “Necha kunda ishga tushadi?”

Bu katalog, boshlang‘ich qoldiq, rollar va operator tayyorgarligiga bog‘liq. Eng xavfsiz usul — bitta fabrika va bitta smenada nazoratli pilot, parallel tekshiruv, keyin bosqichma-bosqich kengaytirish. Dalilsiz aniq kun va’da bermaymiz.

### “Narxi qancha?”

Narx foydalanuvchi soniga emas, pilot doirasi, data tayyorlash, integratsiya, support va hosting mas’uliyatiga qarab taklif qilinadi. Avval scope va muvaffaqiyat mezonlarini yozma kelishamiz.

### “Telefonimdan ko‘rsam bo‘ladimi?”

Mobile poydevor bor, ammo production real-device session testi hali alohida gate. Hozir ishonchli asosiy ish web orqali; mobile pilotni alohida tekshirib yoqamiz.

## FAQ — fabrika egalari

**Q: Eng katta foyda nima?**  
A: Har bosqichdagi qoldiq, stock, buyurtma, qarz va payrollni bitta operatsion manbada ko‘rish.

**Q: Men har kuni nimani ko‘raman?**  
A: Dashboard, kechikkan/tiqilgan bosqich, past stock, ochiq qarz va e’tibor talab qiladigan holatlar.

**Q: Filiallar bo‘lsa ishlaydimi?**  
A: Tenant/factory modeli bor, lekin ko‘p fabrikali rollout alohida isolation va permission testi bilan bosqichma-bosqich qilinadi.

**Q: Kim pul yozuvini o‘zgartirganini bilamanmi?**  
A: Muhim amallarda user va vaqt auditda saqlanadi. Audit reportining to‘liqligi pilot case’lari bilan tekshiriladi.

**Q: Bu darhol daromadni oshiradimi?**  
A: Tizim o‘zi daromad yaratmaydi. U yo‘qotish, kechikish, noto‘g‘ri qoldiq va qarzni tezroq ko‘rsatib, boshqaruv qarorini yaxshilaydi.

## FAQ — buxgalterlar

**Q: Mijoz qarzi qanday chiqadi?**  
A: Buyurtma summasi, to‘lov allocationi, yetkazish/return va reversal yozuvlaridan operatsion qarz ko‘rinadi.

**Q: Supplier qarzi qanday chiqadi?**  
A: Purchase qarzni oshiradi, supplier payment va allocation qarzni kamaytiradi.

**Q: Purchase stockni ham oshiradimi?**  
A: Yo‘q. Purchase moliyaviy yozuv; real material kelganda ombor kirimi alohida qilinadi.

**Q: Xarajatni kim tasdiqlaydi va kim to‘laydi?**  
A: Biznes qoidasi bo‘yicha Manager tasdiqlashi, Accountant to‘lashi kerak. Hozir tizimdagi permissionni qat’iy ajratish planned improvement; pilotda odamlar tashkiliy jihatdan ajratiladi.

**Q: Paypoq OS soliq hisobotini beradi-mi?**  
A: V1ning maqsadi operatsion moliya. Rasmiy soliq/bosh kitob integratsiyasi alohida scope.

**Q: Payroll summasiga ishonish mumkinmi?**  
A: Activity, stavka va adjustmentlar tekshirilgandan keyin hisoblanadi. Productiondan oldin reconciliation va parallel-payment testi majburiy.

## FAQ — ombor xodimlari

**Q: Qaysi joyda qancha mahsulot borligini ko‘ramanmi?**  
A: Mahsulot/material, ombor va zona bo‘yicha qoldiq ko‘rinadi.

**Q: Minusga chiqarib yuborsam bo‘ladimi?**  
A: Asosiy stock/stage oqimi yetarli qoldiq bo‘lmasa rad qilishi kerak. Xabar chiqsa qayta bosmang, qoldiq va tanlangan joyni tekshiring.

**Q: Supplier purchase keldi, nima qilaman?**  
A: Purchase mavjudligini tekshirib, real kelgan miqdorni alohida ombor kirimi sifatida yozasiz.

**Q: Noto‘g‘ri zonaga yozdim, o‘chiramanmi?**  
A: Yo‘q. Mas’ulga bildiring va tasdiqlangan correction/reversal tartibidan foydalaning.

**Q: Past qoldiq qanday bilinadi?**  
A: Material uchun belgilangan minimal chegaradan past bo‘lsa ogohlantirish ko‘rinadi.

## FAQ — ishlab chiqarish menejerlari

**Q: Eng muhim raqam qaysi?**  
A: Stage Inventory — har bosqichda hozir nechta mahsulot borligi.

**Q: Partiya nima uchun kerak?**  
A: Muammo yoki nuqson qayerdan kelganini izlash uchun. Asosiy kunlik hisobot esa bosqich qoldig‘i.

**Q: Stanokdan chiqqan mahsulot qayerga tushadi?**  
A: Output qabul qilinganda boshlang‘ich ishlab chiqarish bosqichiga tushadi.

**Q: Ishchi activity stockni o‘zgartiradimi?**  
A: Yo‘q. Activity mehnat dalili; stock/stage harakati alohida tasdiqlanadi.

**Q: IoT bormi?**  
A: V1da majburiy IoT yo‘q. Avval odamlar boshqaradigan jarayonni to‘g‘ri va barqaror qilamiz, keyin sensor integratsiyasini qo‘shamiz.

**Q: Brakni qayerda ko‘raman?**  
A: Nuqson yozuvida partiya, bosqich, tur va miqdor ko‘rinadi.

## FAQ — kompaniya egalari

**Q: Men fabrikada bo‘lmasam ham nazorat qilamanmi?**  
A: Web dashboard orqali asosiy ko‘rsatkichlarni ko‘rasiz. Mobile real-device gate’dan keyin qo‘shimcha kanal bo‘lishi mumkin.

**Q: Menejer pulni o‘zi tasdiqlab, o‘zi to‘lay oladimi?**  
A: Hozirgi permission modeli buni tizim darajasida yetarlicha ajratmagan. Bu P0 yaxshilanish; ungacha pilotda approver va payer odamlar hamda ichki tartib bilan ajratiladi.

**Q: Raqamga ishonmasam, manbasini topamanmi?**  
A: Yozuv, status va audit tarixidan manbaga borish mumkin. Har bir muhim hisobot uchun pilotda reconciliation case belgilaymiz.

**Q: Birinchi kundan hamma bo‘limni yoqamizmi?**  
A: Yo‘q. Avval production va warehouse, keyin sales/debt, so‘ng finance/payroll. Har bosqich qabul qilingandan keyin keyingisiga o‘tamiz.

**Q: Eng katta joriy risk nima?**  
A: Texnikadan tashqari, noto‘g‘ri boshlang‘ich data va intizomsiz operator jarayoni. Texnik P0lar — TV context, finance separation, concurrency testlari, session rotation va backup/restore dalili.

## Demo yakunidagi kelishuv savollari

Mijozdan so‘rang:

1. Sizda yetkazishdan oldin to‘liq to‘lov shartmi?
2. Xarajatni kim so‘raydi, kim tasdiqlaydi, kim to‘laydi?
3. Noto‘g‘ri stock, payment va production movement qanday tasdiq bilan tuzatiladi?
4. Qaysi bitta fabrika va smena pilot uchun eng mos?
5. Boshlang‘ich qoldiqning to‘g‘riligiga kim imzo qo‘yadi?
6. Pilot muvaffaqiyatini qaysi 5 ko‘rsatkich bilan o‘lchaymiz?
7. Backup va incident uchun mas’ul kim bo‘ladi?

Javoblar yozma bo‘lmasa, ularni mahsulot qoidasi deb taxmin qilmang.

## Skeptik fabrika egasining 30 qiyin savoli

Bu savollar mashq uchun. Ular birma-bir beriladi; har javobdan keyin CTO sifatida dalil, aniqlik, biznes qiymati va ortiqcha va’da bo‘yicha fikr bildiriladi.

1. Nega men Excel va Telegram guruhlarimni tashlab, sizning tizimingizga ishonishim kerak?
2. Tizimdagi stock raqami bilan real ombor farq qilsa, qaysi biri haqiqat va kim javobgar?
3. Operator ataylab noto‘g‘ri miqdor kiritsa, buni qachon va qanday bilaman?
4. Manager o‘zi xarajat yaratib, o‘zi tasdiqlab, o‘zi to‘lay olsa, bu tizim menga qanday nazorat beradi?
5. Bir vaqtning o‘zida ikki buxgalter bitta payrollni to‘lasa, pul ikki marta ketmaydimi?
6. Internet bir kun bo‘lmasa, fabrika to‘xtab qoladimi?
7. Server buzilsa, kechagi ma’lumotni qancha vaqtda tiklaysiz?
8. Backup borligini emas, tiklanishini qanday isbotlaysiz?
9. Boshqa mijozingiz mening ma’lumotimni ko‘ra olmasligiga qanday kafolat berasiz?
10. Factory TV noto‘g‘ri fabrikani ko‘rsatishi mumkin bo‘lsa, yana qaysi ekran noto‘g‘ri tenantni ko‘rsatishi mumkin?
11. Bir xil email ikki kompaniyada ishlatilsa, odam nega kira olmaydi?
12. Mijoz to‘lamasdan mahsulotni olib ketsa, tizim bunga nega ruxsat beradi?
13. Men paid-only siyosat xohlasam, bu konfiguratsiyami yoki alohida dasturlashmi?
14. Supplier invoice kiritildi, lekin material kelmadi — qarz va stockni qanday ajratasiz?
15. Material keldi, invoice keyin kelsa nima qilamiz?
16. Brak mahsulot payroll va stockdan qanday chiqariladi?
17. Ishchi bajarmagan ishini o‘ziga yozdirsa, kim tekshiradi?
18. Yopilgan payroll xato bo‘lsa, qonuniy va auditli tuzatish qanday bo‘ladi?
19. Tizim buxgalteriya va soliq hisobotimni to‘liq bera olmasa, nega finance moduli kerak?
20. 100 ming mahsulot va bir necha yillik data bo‘lsa, sahifalar sekinlashmaydimi?
21. Telegram hisobi o‘g‘irlansa, ishchi yoki mijoz ma’lumoti ochilib ketmaydimi?
22. Telefon yo‘qolsa mobile sessionni qanday bekor qilamiz?
23. Siz aytgan testlar real ishlab chiqarishdagi xatoni qanchalik isbotlaydi?
24. Dependency auditda 16 ta muammo bo‘lsa, nega men hozir pilot boshlashim kerak?
25. Qaysi funksiyalarni bugun shartnomada kafolatlay olasiz, qaysilarini yo‘q?
26. Pilot muvaffaqiyatsiz bo‘lsa, data va operatsiyalarimni qanday qaytarib olaman?
27. Operatorlarni o‘qitish qancha vaqt oladi va ular tizimni ishlatmasa nima qilamiz?
28. Boshlang‘ich stock noto‘g‘ri kiritilsa, keyingi barcha hisobotlar noto‘g‘ri bo‘lmaydimi?
29. Bu tizim menga oyiga aniq qancha pul tejaydi?
30. Nega hozir sotib olishim kerak, yana olti oy kutib barcha kamchiliklar yopilgandan keyin emas?
