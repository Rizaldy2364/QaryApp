export type TajwidRule =
  | 'izhar'
  | 'ikhfa'
  | 'idgham_bighunnah'
  | 'idgham_bilaghunnah'
  | 'iqlab'
  | 'ghunnah'
  | 'qalqalah'
  | 'mad'

export interface TajwidRuleInfo {
  id: TajwidRule
  label: string
  description: string
  example: string
  textClass: string
  swatchClass: string
}

export const TAJWID_RULES: ReadonlyArray<TajwidRuleInfo> = [
  {
    id: 'izhar',
    label: 'Izhar',
    description: 'Nun mati atau tanwin bertemu huruf tenggorokan (ء هـ ع ح غ خ); dibaca jelas tanpa dengung.',
    example: 'مِنْ خَوْفٍ',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    swatchClass: 'bg-emerald-600 dark:bg-emerald-400',
  },
  {
    id: 'ikhfa',
    label: 'Ikhfa',
    description: 'Nun mati/tanwin bertemu 15 huruf ikhfa, atau mim mati bertemu ب; dibaca samar disertai dengung.',
    example: 'مِنْ قَبْلُ',
    textClass: 'text-rose-600 dark:text-rose-400',
    swatchClass: 'bg-rose-600 dark:bg-rose-400',
  },
  {
    id: 'idgham_bighunnah',
    label: 'Idgham Bighunnah',
    description: 'Nun mati/tanwin bertemu ي ن م و, atau mim mati bertemu م; dilebur disertai dengung.',
    example: 'مَنْ يَقُولُ',
    textClass: 'text-purple-700 dark:text-purple-400',
    swatchClass: 'bg-purple-600 dark:bg-purple-400',
  },
  {
    id: 'idgham_bilaghunnah',
    label: 'Idgham Bilaghunnah',
    description: 'Nun mati atau tanwin bertemu ل atau ر; dilebur tanpa dengung.',
    example: 'مِنْ رَبِّهِمْ',
    textClass: 'text-slate-600 dark:text-slate-400',
    swatchClass: 'bg-slate-500 dark:bg-slate-400',
  },
  {
    id: 'iqlab',
    label: 'Iqlab',
    description: 'Nun mati atau tanwin bertemu huruf ب; bunyi nun berubah menjadi mim disertai dengung.',
    example: 'مِنْ بَعْدِ',
    textClass: 'text-sky-600 dark:text-sky-400',
    swatchClass: 'bg-sky-600 dark:bg-sky-400',
  },
  {
    id: 'ghunnah',
    label: 'Ghunnah',
    description: 'Huruf نّ atau مّ bertasydid; dibaca dengan dengung yang ditahan sekitar 2 ketukan.',
    example: 'إِنَّ · ثُمَّ',
    textClass: 'text-orange-600 dark:text-orange-400',
    swatchClass: 'bg-orange-500 dark:bg-orange-400',
  },
  {
    id: 'qalqalah',
    label: 'Qalqalah',
    description: 'Huruf ق ط ب ج د berharakat sukun; dibaca dengan pantulan suara yang jelas.',
    example: 'يَدْخُلُونَ',
    textClass: 'text-amber-600 dark:text-amber-300',
    swatchClass: 'bg-amber-500 dark:bg-amber-300',
  },
  {
    id: 'mad',
    label: 'Mad',
    description: 'Bacaan panjang bertanda maddah (~) seperti Mad Wajib Muttashil atau Mad Jaiz Munfashil.',
    example: 'جَاءَ · أُولَئِكَ',
    textClass: 'text-indigo-600 dark:text-indigo-400',
    swatchClass: 'bg-indigo-600 dark:bg-indigo-400',
  },
]

export const TAJWID_RULE_MAP: Record<TajwidRule, TajwidRuleInfo> = Object.fromEntries(
  TAJWID_RULES.map((item) => [item.id, item]),
) as Record<TajwidRule, TajwidRuleInfo>

export interface TajwidSegment {
  text: string
  rule: TajwidRule | null
}

const SUKUN_CHARS = new Set(['\u0652', '\u06E1'])
const TANWIN_CHARS = new Set(['\u064B', '\u064C', '\u064D', '\u08F0', '\u08F1', '\u08F2'])
const SHADDAH = '\u0651'
const MADDAH_CHARS = new Set(['\u0653', '\u06E4'])
const SMALL_MEEM_CHARS = new Set(['\u06E2', '\u06ED'])

const IZHAR_LETTERS = new Set(['ء', 'أ', 'إ', 'ؤ', 'ئ', 'ه', 'ع', 'ح', 'غ', 'خ'])
const IDGHAM_BIGHUNNAH_LETTERS = new Set(['ي', 'ن', 'م', 'و'])
const IDGHAM_BILAGHUNNAH_LETTERS = new Set(['ل', 'ر'])
const IKHFA_LETTERS = new Set([
  'ت', 'ث', 'ج', 'د', 'ذ', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ف', 'ق', 'ك',
])
const QALQALAH_LETTERS = new Set(['ق', 'ط', 'ب', 'ج', 'د'])

const COMBINING_RE = /^[\u064B-\u065F\u0670\u06D6-\u06ED\u08F0-\u08F2]$/
const ARABIC_BASE_LETTER_RE = /^[\u0621-\u064A\u0671]$/

interface Cluster {
  raw: string
  base: string
  marks: string
  isLetter: boolean
}

function tokenizeArabicClusters(text: string): Cluster[] {
  const clusters: Cluster[] = []
  for (const ch of text) {
    if (COMBINING_RE.test(ch) && clusters.length > 0) {
      const prev = clusters[clusters.length - 1]
      prev.raw += ch
      prev.marks += ch
    } else {
      clusters.push({
        raw: ch,
        base: ch,
        marks: '',
        isLetter: ARABIC_BASE_LETTER_RE.test(ch),
      })
    }
  }
  return clusters
}

function hasAnyMark(marks: string, set: Set<string>): boolean {
  for (const ch of marks) {
    if (set.has(ch)) return true
  }
  return false
}

function findNextLetterBase(clusters: Cluster[], startIndex: number): string | null {
  for (let i = startIndex; i < clusters.length; i++) {
    const c = clusters[i]
    if (!c.isLetter) continue
    // Alif khanjariyah/alif maqsurah penanda tanwin fathah di akhir kata (tanpa harakat sendiri) dilewati
    if ((c.base === 'ا' || c.base === 'ى') && c.marks.length === 0 && i === startIndex) {
      continue
    }
    return c.base
  }
  return null
}

/**
 * Memecah teks Arab menjadi segmen-segmen tajwid tanpa mengubah, menambah,
 * atau menghapus satu karakter pun dari teks asli.
 */
export function parseTajwidSegments(arabicText: string): TajwidSegment[] {
  if (!arabicText) return []

  const clusters = tokenizeArabicClusters(arabicText)
  const segments: TajwidSegment[] = []

  const pushSegment = (text: string, rule: TajwidRule | null) => {
    const last = segments[segments.length - 1]
    if (last && last.rule === rule) {
      last.text += text
    } else {
      segments.push({ text, rule })
    }
  }

  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i]
    let rule: TajwidRule | null = null

    if (c.isLetter) {
      const hasSukun = hasAnyMark(c.marks, SUKUN_CHARS)
      const hasTanwin = hasAnyMark(c.marks, TANWIN_CHARS)
      const hasShaddah = c.marks.includes(SHADDAH)
      const hasMaddah = hasAnyMark(c.marks, MADDAH_CHARS) || c.base === 'آ'
      const hasSmallMeem = hasAnyMark(c.marks, SMALL_MEEM_CHARS)

      // 1. Ghunnah: Nun atau Mim bertasydid
      if ((c.base === 'ن' || c.base === 'م') && hasShaddah) {
        rule = 'ghunnah'
      }
      // 2. Hukum Nun Sukun atau Tanwin
      else if ((c.base === 'ن' && hasSukun) || hasTanwin) {
        if (hasSmallMeem) {
          rule = 'iqlab'
        } else {
          const nextBase = findNextLetterBase(clusters, i + 1)
          if (nextBase === 'ب') {
            rule = 'iqlab'
          } else if (nextBase && IDGHAM_BIGHUNNAH_LETTERS.has(nextBase)) {
            rule = 'idgham_bighunnah'
          } else if (nextBase && IDGHAM_BILAGHUNNAH_LETTERS.has(nextBase)) {
            rule = 'idgham_bilaghunnah'
          } else if (nextBase && IZHAR_LETTERS.has(nextBase)) {
            rule = 'izhar'
          } else if (nextBase && IKHFA_LETTERS.has(nextBase)) {
            rule = 'ikhfa'
          }
        }
      }
      // 3. Hukum Mim Sukun (Ikhfa Syafawi & Idgham Mimi)
      else if (c.base === 'م' && hasSukun) {
        const nextBase = findNextLetterBase(clusters, i + 1)
        if (nextBase === 'ب') {
          rule = 'ikhfa'
        } else if (nextBase === 'م') {
          rule = 'idgham_bighunnah'
        }
      }
      // 4. Qalqalah: ق ط ب ج د sukun
      else if (QALQALAH_LETTERS.has(c.base) && hasSukun) {
        rule = 'qalqalah'
      }
      // 5. Mad bertanda maddah (~)
      else if (hasMaddah) {
        rule = 'mad'
      }
    }

    pushSegment(c.raw, rule)
  }

  return segments
}
