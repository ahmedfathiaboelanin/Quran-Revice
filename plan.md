Act as an Expert Full-Stack Web Developer. Build a complete, production-ready Progressive Web App (PWA) for Quran Memorization and Revision using Spaced Repetition (SRS).

### 1. Tech Stack & Architecture
- **Framework:** Next.js (App Router) with React and TypeScript.
- **Styling:** Tailwind CSS + Lucide React (for icons).
- **UI Language & Direction:** Arabic (RTL layout `dir="rtl"`), using clean Arabic typography (e.g., 'Amiri' or 'Uthmanic' font for Quranic verses, and 'Cairo' or 'Tajawal' for UI).
- **State & Storage:** LocalStorage / IndexedDB (so the user can use it immediately on their phone without needing a backend database initially), with React Context or Zustand for state management.
- **External API:** Fetch Quranic data dynamically from `https://api.alquran.cloud/v1` (to get Surah lists, specific Ayahs, or specific Mushaf pages).
- **PWA Support:** Configure `manifest.json`, service workers, and meta tags so the app is fully installable on Android and iOS devices as a standalone mobile app.

### 2. Core Features Required

#### A. Target Selection (إضافة ورد حفظ أو مراجعة)
Create a flexible form/modal allowing the user to add a "Memorization/Revision Unit" (وحدة حفظ/مراجعة) in 3 ways:
1. **By Surah (بالسورة):** Select a Surah from a dropdown (1 to 114).
2. **By Ayah Range (بنطاق آيات):** Select a Surah, then specify `From Ayah` and `To Ayah`.
3. **By Page (بالصفحة):** Specify a Mushaf page number (1 to 604) or range of pages.
- Allow the user to tag the unit status initially as: "حفظ جديد" (New Memorization) or "مراجعة غير مثبتة" (Unstable/Weak Revision).

#### B. Spaced Repetition System - SRS (خوارزمية التكرار المتباعد)
Implement the **SuperMemo-2 (SM-2)** algorithm to schedule revisions. Each tracked unit must store:
- `id`, `title`, `type` (surah | ayah_range | page), `reference` (surah number, start/end ayah, or page number).
- `interval` (in days), `repetitions`, `easeFactor` (default 2.5), `nextReviewDate` (ISO timestamp), `lastReviewed`.

When reviewing a unit, after reading/reciting, the user grades their recall quality using 4 buttons:
1. **نسيت تماماً (Again - Grade 1):** Reset `repetitions = 0`, `interval = 1` day.
2. **صعب / به أخطاء (Hard - Grade 3):** Slight increase in interval, decrease `easeFactor`.
3. **جيد (Good - Grade 4):** Standard SM-2 interval calculation (`interval * easeFactor`).
4. **متقن / ممتاز (Easy - Grade 5):** Bonus interval increase, increase `easeFactor`.

#### C. Interactive Review Session (جلسة التسميع والمراجعة)
- When the user clicks "ابدأ المراجعة اليومية" (Start Due Reviews), open a focused reader view.
- Fetch and display the exact Quranic text for that unit from the API.
- **Hide/Blur Mode (وضع الاختبار/التسميع):** Add a toggle button to blur the Ayahs (إخفاء الآيات للتسميع الغيبي). When the user taps/clicks on a blurred Ayah, it reveals itself so they can check if they made a mistake.
- Show the grading buttons (Again, Hard, Good, Easy) at the bottom to complete the card and move to the next due unit.

#### D. Dashboard & Analytics (لوحة التحكم)
- **Due Today (مراجعات اليوم):** Counter and list of units where `nextReviewDate <= today`.
- **Weak/Unstable Items (أجزاء تحتاج تثبيت):** Filter showing items with low `easeFactor` (< 2.1) or frequent resets.
- **All Tracked Items (كل المحفوظات):** Searchable list showing progress, next review date, and strength indicator badge.
- **Data Backup:** Export/Import JSON buttons so the user never loses their progress on their phone.

### 3. Deliverables & Steps
Please write the clean, modular code for this application:
1. Provide the folder structure.
2. Write the `srsAlgorithm.ts` utility file containing the exact SM-2 math and types.
3. Write the Quran API helper functions (`quranApi.ts`) to fetch Surahs, Ayah ranges, and Pages.
4. Build the main components: `Dashboard`, `AddUnitModal`, and `ReviewSession` (with the blur/reveal testing feature).
5. Provide the `manifest.json` and Next.js PWA configuration so I can install it on my mobile phone immediately.
6. Ensure all code is complete without placeholders or `// TODO` comments.