/** Who made the app, whose work it uses, the sources its answers come from, and its limits. */

/** Credited in the footer of every screen. */
export const CREATOR = 'Omar M. Noreldin'

export interface Credit {
  /** What the work is to this app, such as "Base code". */
  role: string
  item: string
  author: string
  licence?: string
  url: string
}

export const CREDITS: Credit[] = [
  {
    role: 'Base code',
    item: 'iiviewer (CathLabSimulator)',
    author: 'annasrahman.com',
    url: 'https://annasrahman.com',
  },
  {
    role: '3D heart model',
    item: 'Realistic Human Heart',
    author: 'neshallads',
    licence: 'CC BY 4.0',
    url: 'https://sketchfab.com/3d-models/realistic-human-heart-3f8072336ce94d18b3d0d055a1ece089',
  },
  {
    role: 'Typeface',
    item: 'Atkinson Hyperlegible',
    author: 'the Braille Institute',
    licence: 'SIL Open Font License 1.1',
    url: 'https://www.brailleinstitute.org/freefont/',
  },
  {
    role: 'Typeface',
    item: 'Barlow Condensed',
    author: 'Jeremy Tribby',
    licence: 'SIL Open Font License 1.1',
    url: 'https://tribby.com/fonts/barlow/',
  },
]

export interface Reference {
  label: string
  url: string
}

export const REFERENCES: Reference[] = [
  { label: 'Di Mario & Sutaria, Heart 2005', url: 'https://heart.bmj.com/content/91/7/968.info' },
  {
    label: 'SYNTAX segment definitions',
    url: 'https://syntaxscore.org/index.php/tutorial/definitions/14-appendix-i-segment-definitions',
  },
  { label: 'Normal coronary diameters by QCA, Indian Heart J 2021', url: 'https://doi.org/10.1016/j.ihj.2021.04.001' },
  { label: "POT and Finet's law, Hoye 2018", url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5808474' },
  { label: 'BJC guide to angiographic views', url: 'https://bjcardio.co.uk/?p=35300' },
  { label: 'Lesion preparation, CIT 2024', url: 'https://citoday.com/articles/2024-may-june/drug-coated-balloons' },
  { label: 'Geographic miss, STLLR trial (Costa 2008)', url: 'https://doi.org/10.1016/j.amjcard.2008.02.053' },
  { label: 'Imaging-guided stent sizing review', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11307675' },
  { label: 'Direct stenting meta-analysis (Piscione 2010)', url: 'https://doi.org/10.1136/hrt.2009.183277' },
]

export const DISCLAIMER = 'Educational simulation, not for clinical use.'

export const SIMPLIFICATIONS: string[] = [
  'The coronary tree is a hand-built model, not a real patient.',
  'View ratings follow published textbook tables; the geometry shows foreshortening and overlap only.',
  'Heart motion, contrast filling and coronary flow are simple models at a fixed heart rate of 70, and the patient never breathes.',
  'The heart shadow, spine, ribs, diaphragm, aorta and guide catheter are simplified shapes for orientation.',
  "Devices, compliance charts and the lesion's response are simple models with illustrative values.",
]
