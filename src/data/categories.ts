import { StemCategoryOption } from '../types';

export const STEM_CATEGORIES: StemCategoryOption[] = [
  // --- VOCES ---
  {
    id: 'vocals_all',
    name: 'Voces Completas',
    group: 'Voces',
    description: 'Pista vocal completa aislada de la mezcla principal (Lead + Coros).',
    isAvailable: true,
    iconName: 'Mic',
    color: '#3B82F6', // Blue
  },
  {
    id: 'vocal_lead',
    name: 'Voz Principal',
    group: 'Voces',
    parentCategory: 'vocals_all',
    description: 'Separación fina de la línea vocal solista o voz melódica central.',
    isAvailable: true,
    iconName: 'User',
    color: '#60A5FA',
  },
  {
    id: 'vocal_backing',
    name: 'Coros y Segundas Voces',
    group: 'Voces',
    parentCategory: 'vocals_all',
    description: 'Armonías vocales secundarias, coros de fondo y doblajes.',
    isAvailable: true,
    iconName: 'Users',
    color: '#93C5FD',
  },
  {
    id: 'vocal_fx',
    name: 'Efectos Vocales / Reverb',
    group: 'Voces',
    parentCategory: 'vocals_all',
    description: 'Ambiente vocal, colas de reverberación y delays de la voz aislados.',
    isAvailable: true,
    iconName: 'Sparkles',
    color: '#A78BFA',
  },
  {
    id: 'vocal_noise',
    name: 'Ruido y Artefactos Vocales',
    group: 'Voces',
    parentCategory: 'vocals_all',
    description: 'Ruidos de respiración, siseos y artefactos de micrófono capturados.',
    isAvailable: true,
    iconName: 'Wind',
    color: '#9CA3AF',
  },

  // --- BATERÍA ---
  {
    id: 'drums_all',
    name: 'Batería Completa',
    group: 'Batería',
    description: 'Set completo de percusión y batería acústica/electrónica.',
    isAvailable: true,
    iconName: 'Drum',
    color: '#EF4444', // Red
  },
  {
    id: 'drum_kick',
    name: 'Bombo (Kick)',
    group: 'Batería',
    parentCategory: 'drums_all',
    description: 'Frecuencias sub-graves y ataque del bombo.',
    isAvailable: true,
    iconName: 'Disc',
    color: '#F87171',
  },
  {
    id: 'drum_snare',
    name: 'Caja (Snare)',
    group: 'Batería',
    parentCategory: 'drums_all',
    description: 'Caja, golpe central y bordonero de la batería.',
    isAvailable: true,
    iconName: 'CircleDot',
    color: '#FCA5A5',
  },
  {
    id: 'drum_toms',
    name: 'Toms',
    group: 'Batería',
    parentCategory: 'drums_all',
    description: 'Toms aéreos y tom de piso de la batería.',
    isAvailable: true,
    iconName: 'Boxes',
    color: '#FDBA74',
  },
  {
    id: 'drum_cymbals',
    name: 'Platos (Hi-Hat / Crash)',
    group: 'Batería',
    parentCategory: 'drums_all',
    description: 'Platillos hi-hat, ride, crash y agudos de percusión.',
    isAvailable: true,
    iconName: 'Sun',
    color: '#FCD34D',
  },

  // --- INSTRUMENTOS ---
  {
    id: 'bass',
    name: 'Bajo',
    group: 'Instrumentos',
    description: 'Línea de bajo eléctrico, bajo sintético o contrabajo.',
    isAvailable: true,
    iconName: 'Activity',
    color: '#10B981', // Emerald
  },
  {
    id: 'piano_keys',
    name: 'Piano y Teclados',
    group: 'Instrumentos',
    description: 'Piano acústico, piano eléctrico, sintetizadores y órganos.',
    isAvailable: true,
    iconName: 'Piano',
    color: '#8B5CF6', // Purple
  },
  {
    id: 'guitar_all',
    name: 'Guitarra (General)',
    group: 'Instrumentos',
    description: 'Todas las guitarras aisladas de la mezcla.',
    isAvailable: true,
    iconName: 'Music2',
    color: '#F59E0B', // Amber
  },
  {
    id: 'guitar_acoustic',
    name: 'Guitarra Acústica',
    group: 'Instrumentos',
    parentCategory: 'guitar_all',
    description: 'Guitarras de cuerdas de nailon/acero sin distorsión.',
    isAvailable: true,
    iconName: 'Music',
    color: '#FBBF24',
  },
  {
    id: 'guitar_electric',
    name: 'Guitarra Eléctrica',
    group: 'Instrumentos',
    parentCategory: 'guitar_all',
    description: 'Guitarras amplificadas, procesadas o distorsionadas.',
    isAvailable: true,
    iconName: 'Zap',
    color: '#F97316',
  },

  // --- OTROS & OTHER ---
  {
    id: 'other',
    name: 'Other (Resto de la Mezcla)',
    group: 'Otros',
    description: 'Suma matemática complementaria con preservación de fase de todo lo no seleccionado.',
    isAvailable: true,
    iconName: 'Layers',
    color: '#EC4899', // Pink
  }
];
