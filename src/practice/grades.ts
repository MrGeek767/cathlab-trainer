/**
 * How the practice grades each choice, and the sources its notes cite. Four grades, so
 * red stays for real danger: "Not suitable" is a choice that won't do the job but would
 * not harm the patient (design §7.5).
 */
export type Grade = 'best' | 'acceptable' | 'not-suitable' | 'unsafe'

export const GRADE_LABEL: Record<Grade, string> = {
  best: 'Best',
  acceptable: 'Acceptable',
  'not-suitable': 'Not suitable',
  unsafe: 'Unsafe',
}

const ORDER: Grade[] = ['best', 'acceptable', 'not-suitable', 'unsafe']

/** The worse of two grades. */
export function worseGrade(a: Grade, b: Grade): Grade {
  return ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b
}

export type ReferenceId = 'cit-2024' | 'stllr-2008' | 'sizing-review' | 'qca-2021' | 'charts'

export const PRACTICE_REFERENCES: Record<ReferenceId, { label: string; url: string | null }> = {
  'cit-2024': { label: 'Lesion preparation, CIT 2024', url: 'https://citoday.com/articles/2024-may-june/drug-coated-balloons' },
  'stllr-2008': { label: 'Geographic miss, STLLR trial (Costa 2008)', url: 'https://doi.org/10.1016/j.amjcard.2008.02.053' },
  'sizing-review': { label: 'Imaging-guided stent sizing review', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11307675' },
  'qca-2021': { label: 'Normal coronary diameters by QCA, Indian Heart J 2021', url: 'https://doi.org/10.1016/j.ihj.2021.04.001' },
  charts: { label: 'Compliance values are illustrative', url: null },
}

/** One piece of feedback. A null grade is information only. */
export interface Note {
  key: string
  grade: Grade | null
  title: string
  text: string
  reference: ReferenceId | null
}
