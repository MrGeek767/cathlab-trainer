/** Who made what this app is built on, the sources its answers come from, and its limits. */
export interface Credit {
  item: string
  author: string
  licence: string
  url: string
}

export const CREDITS: Credit[] = [
  {
    item: 'iiviewer (CathLabSimulator) code',
    author: 'annasrahman.com',
    licence: "Used and modified with the author's permission",
    url: 'https://annasrahman.com',
  },
  {
    item: 'Realistic Human Heart (3D model)',
    author: 'neshallads',
    licence: 'CC BY 4.0',
    url: 'https://sketchfab.com/3d-models/realistic-human-heart-3f8072336ce94d18b3d0d055a1ece089',
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
]

export const DISCLAIMER = 'Educational simulation, not for clinical use.'

export const NON_AFFILIATION = 'CathLab Trainer is an independent project and is not affiliated with AngioView.'

export const SIMPLIFICATIONS: string[] = [
  'The coronary tree is a hand-built model, not a real patient.',
  'View ratings follow published textbook tables; the geometry shows foreshortening and overlap only.',
  'Contrast flow timing is illustrative.',
  'Spine and diaphragm are simplified shapes for orientation.',
]
