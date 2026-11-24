# Lumen Player: LG Seller Lounge form, field by field

Copy these into **LG Seller Lounge → App Management → App Submission**. Items in `[brackets]` still need to be filled in.

## File Upload

| Field | Value |
|---|---|
| App ID | `io.github.mo-animation.lumen` (it can never be changed after release) |
| Service platform | webOS |
| File | `store/io.github.mo-animation.lumen_<version>_all.ipk` (build it with `node tools/store.js`) |
| Graphic display resolution | 1920 x 1080 |
| File title | Lumen Player |
| File version | same as the ipk version, e.g. 1.1.11 |
| Deep link URL | leave empty / Default |

## Images (folder `store/images`)

| Field | File |
|---|---|
| App icon (400x400, square, no transparency) | `icon_400.png` |
| App tile / background color | `#5F7594` |
| Primary screenshot | `screenshot_1_primary_home_1280x720.jpg` |
| Secondary screenshots | `screenshot_2_movie…`, `screenshot_3_series…`, `screenshot_4_player…`, `screenshot_5_live…`, `screenshot_6_start…` |
| Launcher background (1920x1080) | `launcher_bg_1920x1080.png` |
| Splash screen background (1920x1080) | `splash_1920x1080.png` |

## Service Info

| Field | Value |
|---|---|
| App rating | General audiences / All ages (the app contains no content of its own) |
| Content rating | No |
| Category | Entertainment |
| Tag keywords | IPTV player, M3U, Xtream Codes, live TV, movies, series, playlist |
| App service languages | English, Arabic |
| Display language on TV | English (required). Arabic can be added as a second entry. |
| Customer support URL | https://mo-animation.github.io/lumen-tv/support.html |
| Customer support e-mail | `[optional: your support e-mail]` |
| Privacy policy URL (if asked) | https://mo-animation.github.io/lumen-tv/privacy.html |
| Geo-IP block | **No** (LG rejects "Yes" for global apps) |
| Paid content | No |
| In-app ads | No |
| DIAL | leave empty |

### Title
Lumen Player

### Description (English)
Lumen Player is a fast, beautiful player for your own IPTV playlist.

Add your Xtream Codes account or an M3U playlist link from your provider and Lumen Player arranges it into a clean, TV-friendly library:
• Live TV with categories, favorites and quick channel switching
• Movies and TV shows with artwork, descriptions, trailers and "More Like This"
• Continue Watching, watched episodes, Up Next and resume from where you stopped
• Your own lists, search, English and Arabic, light and dark looks
• Works with the Magic Remote pointer and the standard remote

Lumen Player is a player only. It does not include, sell or provide any channels, movies or series. You need a playlist from a provider you are allowed to use. Try it first with the built-in demo.

Movie and series details are from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB. Demo videos: Big Buck Bunny © Blender Foundation (CC BY 3.0).

### الوصف (عربي)
Lumen Player مشغّل سريع وأنيق لقائمة IPTV الخاصة بك.

أضف حساب Xtream Codes أو رابط M3U من مزوّد الخدمة، وسيرتّبه Lumen Player في مكتبة واضحة ومريحة على التلفزيون:
• بث مباشر مع الأقسام والمفضّلة والتنقّل السريع بين القنوات
• أفلام ومسلسلات بالصور والوصف والتريلرات وأعمال مشابهة
• متابعة المشاهدة والحلقات التي شاهدتها والحلقة التالية والاستكمال من حيث توقفت
• قوائمك الخاصة، والبحث، والعربية والإنجليزية، والمظهر الفاتح والداكن
• يعمل مع مؤشّر Magic Remote ومع الريموت العادي

Lumen Player مشغّل فقط، ولا يتضمّن أو يبيع أو يوفّر أي قنوات أو أفلام أو مسلسلات. تحتاج إلى قائمة تشغيل من مزوّد مسموح لك باستخدامه. جرّبه أولاً بالنسخة التجريبية المدمجة.

### Описание (Russian, required when Russia is a service country)
App Title: Lumen Player

Lumen Player — быстрый и красивый плеер для вашего собственного IPTV-плейлиста.

Добавьте аккаунт Xtream Codes или ссылку на M3U-плейлист от вашего провайдера, и Lumen Player превратит его в удобную библиотеку для телевизора:
- Прямой эфир с категориями, избранным и быстрым переключением каналов
- Фильмы и сериалы с обложками, описаниями, трейлерами и похожими рекомендациями
- «Продолжить просмотр», отметки о просмотренных сериях, следующая серия и продолжение с места остановки
- Собственные списки, поиск, английский и арабский интерфейс, светлая и тёмная темы
- Поддержка указателя Magic Remote и обычного пульта

Lumen Player — это только плеер. Он не содержит, не продаёт и не предоставляет никаких каналов, фильмов или сериалов. Вам нужен плейлист от провайдера, которым вы имеете право пользоваться. Сначала попробуйте встроенную демоверсию.

Информация о фильмах и сериалах предоставлена TMDB. Этот продукт использует API TMDB, но не одобрен и не сертифицирован TMDB. Демо-видео: Big Buck Bunny © Blender Foundation (CC BY 3.0).

## Test Info

| Field | Value |
|---|---|
| Reference e-mail | `[your e-mail, the same one on the UX Scenario cover]` |
| Self-checklist | `store/docs/Lumen_Self_Checklist_5.0.xlsx` |
| UX scenario | `store/docs/Lumen_UX_Scenario_4.3.pptx` |
| Note for tester | First submission |
| Device requirement | None |
| Remote controller | Both Magic and general remote |
| Test account / password | No account is needed. See below. |
| Voucher code | N/A |

**Test account text to paste:**
> Lumen Player is a player for the user's own playlist, so no account is needed.
> Option 1: on the first screen press "Try the demo".
> Option 2: enter this M3U address in the first field and leave Username and Password empty, then press Connect: `mo-animation.github.io/lumen-tv/qa.m3u`
> It contains public test streams (Akamai, Apple, Unified Streaming) and open movies from the Blender Foundation, and works on any number of TVs.

**Player specification:**

| | |
|---|---|
| DRM | None |
| Streaming protocol | HLS, progressive MP4 |
| Video codec | H.264/AVC |
| Audio codec | AAC |
| Sample asset | "Big Buck Bunny" (Open Movies) and "Akamai Live Test" (Test Channels) in the sample playlist |
