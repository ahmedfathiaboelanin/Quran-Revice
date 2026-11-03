import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(projectRoot, "quran");
const outputRoot = path.join(projectRoot, "public", "quran");
const sourceSurahsDir = path.join(sourceRoot, "surahs");
const outputSurahsDir = path.join(outputRoot, "surahs");
const outputPagesDir = path.join(outputRoot, "pages");

const TOTAL_PAGES = 604;
const TOTAL_AYAHS = 6236;

function stripBom(value) {
  return typeof value === "string" ? value.replace(/^\uFEFF/, "").replaceAll("\uFEFF", "") : value;
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  console.log("→ بناء بيانات القرآن من مجلد quran …");

  const surahs = JSON.parse(await readFile(path.join(sourceRoot, "surahs.json"), "utf8"));

  if (!Array.isArray(surahs) || surahs.length !== 114) {
    throw new Error("تعذر قراءة قائمة السور: يجب أن تحتوي على 114 سورة.");
  }

  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputSurahsDir, { recursive: true });
  await mkdir(outputPagesDir, { recursive: true });

  const pages = new Map();
  const juzPortions = new Map();
  const normalizedSurahs = [];
  let totalAyahs = 0;

  for (const meta of surahs) {
    const source = JSON.parse(
      await readFile(path.join(sourceSurahsDir, `${meta.number}.json`), "utf8"),
    );

    if (source.number !== meta.number) {
      throw new Error(`عدم تطابق رقم السورة في الملف ${meta.number}.json`);
    }
    if (!Array.isArray(source.ayahs) || source.ayahs.length !== meta.numberOfAyahs) {
      throw new Error(`عدد آيات السورة ${meta.number} غير مطابق للبيانات الوصفية.`);
    }

    const ayahs = source.ayahs.map((ayah) => {
      if (
        typeof ayah.number !== "number" ||
        typeof ayah.numberInSurah !== "number" ||
        typeof ayah.page !== "number" ||
        typeof ayah.text !== "string"
      ) {
        throw new Error(`بيانات آية غير صالحة في السورة ${meta.number}.`);
      }

      return {
        number: ayah.number,
        numberInSurah: ayah.numberInSurah,
        text: stripBom(ayah.text),
        juz: ayah.juz,
        page: ayah.page,
      };
    });

    const surah = {
      number: meta.number,
      name: stripBom(meta.name),
      englishName: meta.englishName,
      englishNameTranslation: meta.englishNameTranslation,
      revelationType: meta.revelationType,
      numberOfAyahs: meta.numberOfAyahs,
      ayahs,
    };

    const surahPages = [...new Set(ayahs.map((ayah) => ayah.page))].sort((a, b) => a - b);
    const surahJuzs = [...new Set(ayahs.map((ayah) => ayah.juz))].sort((a, b) => a - b);
    const juzStart = surahJuzs[0];
    const juzEnd = surahJuzs[surahJuzs.length - 1];

    normalizedSurahs.push({
      number: surah.number,
      name: surah.name,
      englishName: surah.englishName,
      englishNameTranslation: surah.englishNameTranslation,
      revelationType: surah.revelationType,
      numberOfAyahs: surah.numberOfAyahs,
      juzStart,
      juzEnd,
      startPage: surahPages[0],
      endPage: surahPages[surahPages.length - 1],
      pageCount: surahPages.length,
    });

    totalAyahs += ayahs.length;

    // تجميع آيات السورة في أجزاء دقيقة. السورة قد تمتد على أكثر من جزء،
    // لذلك نحفظ لكل جزء نطاق الآيات والصفحات الخاص به.
    let currentPortion = null;
    const flushPortion = () => {
      if (!currentPortion) return;
      const portionPages = [...currentPortion.pages].sort((a, b) => a - b);
      const portion = {
        juz: currentPortion.juz,
        surah: {
          number: surah.number,
          name: surah.name,
          englishName: surah.englishName,
          numberOfAyahs: surah.numberOfAyahs,
        },
        startAyah: currentPortion.startAyah,
        endAyah: currentPortion.endAyah,
        ayahCount: currentPortion.endAyah - currentPortion.startAyah + 1,
        startPage: portionPages[0],
        endPage: portionPages[portionPages.length - 1],
        pageCount: portionPages.length,
      };

      if (!juzPortions.has(portion.juz)) {
        juzPortions.set(portion.juz, []);
      }
      juzPortions.get(portion.juz).push(portion);
      currentPortion = null;
    };

    for (const ayah of ayahs) {
      if (
        !Number.isInteger(ayah.juz) ||
        ayah.juz < 1 ||
        ayah.juz > 30
      ) {
        throw new Error(`رقم جزء غير صالح في السورة ${meta.number}: ${ayah.juz}`);
      }

      if (!currentPortion || currentPortion.juz !== ayah.juz) {
        flushPortion();
        currentPortion = {
          juz: ayah.juz,
          startAyah: ayah.numberInSurah,
          endAyah: ayah.numberInSurah,
          pages: new Set([ayah.page]),
        };
      } else {
        currentPortion.endAyah = ayah.numberInSurah;
        currentPortion.pages.add(ayah.page);
      }
    }
    flushPortion();

    for (const ayah of ayahs) {
      if (ayah.page < 1 || ayah.page > TOTAL_PAGES) {
        throw new Error(`رقم صفحة خارج النطاق في السورة ${meta.number}: ${ayah.page}`);
      }

      if (!pages.has(ayah.page)) {
        pages.set(ayah.page, []);
      }

      pages.get(ayah.page).push({
        number: ayah.number,
        numberInSurah: ayah.numberInSurah,
        text: ayah.text,
        juz: ayah.juz,
        page: ayah.page,
        surah: surah.number,
        surahName: surah.name,
        englishName: surah.englishName,
      });
    }

    await writeJson(path.join(outputSurahsDir, `${surah.number}.json`), surah);
  }

  if (totalAyahs !== TOTAL_AYAHS) {
    throw new Error(`عدد الآيات الإجمالي غير صحيح: ${totalAyahs} بدلاً من ${TOTAL_AYAHS}.`);
  }

  const missingPages = [];
  const emptyPages = [];
  for (let page = 1; page <= TOTAL_PAGES; page += 1) {
    const ayahs = pages.get(page);
    if (!ayahs) {
      missingPages.push(page);
      continue;
    }
    if (ayahs.length === 0) {
      emptyPages.push(page);
      continue;
    }

    ayahs.sort((a, b) => a.number - b.number);
    await writeJson(path.join(outputPagesDir, `${page}.json`), {
      page,
      ayahs,
    });
  }

  if (missingPages.length > 0) {
    throw new Error(`صفحات مفقودة في بيانات القرآن: ${missingPages.slice(0, 20).join(", ")}`);
  }
  if (emptyPages.length > 0) {
    throw new Error(`صفحات فارغة في بيانات القرآن: ${emptyPages.slice(0, 20).join(", ")}`);
  }

  await writeJson(path.join(outputRoot, "surahs.json"), normalizedSurahs);

  const juzs = Array.from({ length: 30 }, (_, index) => {
    const number = index + 1;
    const portions = (juzPortions.get(number) ?? []).sort(
      (first, second) =>
        first.surah.number - second.surah.number || first.startAyah - second.startAyah,
    );

    if (portions.length === 0) {
      throw new Error(`الجزء ${number} لا يحتوي على أي آيات.`);
    }

    return { number, portions };
  });

  await writeJson(path.join(outputRoot, "juzs.json"), juzs);
  await writeJson(path.join(outputRoot, "meta.json"), {
    totalSurahs: normalizedSurahs.length,
    totalAyahs,
    totalPages: TOTAL_PAGES,
    totalJuzs: juzs.length,
    pagesWithAyahs: pages.size,
    source: "quran/surahs/*.json",
  });

  console.log(
    `✓ تم تجهيز ${normalizedSurahs.length} سورة، و${totalAyahs} آية، و${TOTAL_PAGES} صفحة و${juzs.length} جزءاً في public/quran`,
  );
}

main().catch((error) => {
  console.error("✗ فشل بناء بيانات القرآن:", error);
  process.exitCode = 1;
});
