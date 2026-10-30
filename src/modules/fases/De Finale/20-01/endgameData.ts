export interface EndgameCard {
  id: string;
  name: string;
  image: string;
  line1: string;
  line2: string;
  color?: string;
}

// 8 Halloween Endgame Cards with Munten measures
export const ENDGAME_HALLOWEEN_CARDS: EndgameCard[] = [
  {
    id: 'betoverd',
    name: 'Betoverd',
    image: '/pics/End Halloween/betoverd.jpeg',
    line1: 'Jammer',
    line2: 'jullie halveren',
    color: '#ff7518',
  },
  {
    id: 'vrolijk',
    name: 'Vrolijk',
    image: '/pics/End Halloween/vrolijk.jpeg',
    line1: 'Lekker',
    line2: '5 munten extra',
    color: '#ff7518',
  },
  {
    id: 'ondeugend',
    name: 'Ondeugend',
    image: '/pics/End Halloween/ondeugend.jpeg',
    line1: 'Geef 1 munt',
    line2: 'aan elk team',
    color: '#ff7518',
  },
  {
    id: 'mystiek',
    name: 'Mystiek',
    image: '/pics/End Halloween/mystiek.jpeg',
    line1: 'Krijg 1 munt',
    line2: 'van elk team',
    color: '#ff7518',
  },
  {
    id: 'gentle',
    name: 'Gentle',
    image: '/pics/End Halloween/gentle.jpeg',
    line1: 'Lever',
    line2: '3 munten in',
    color: '#ff7518',
  },
  {
    id: 'elegant',
    name: 'Elegant',
    image: '/pics/End Halloween/elegant.jpeg',
    line1: 'Lekker',
    line2: 'jullie verdubbelen',
    color: '#ff7518',
  },
  {
    id: 'wijs',
    name: 'Wijs',
    image: '/pics/End Halloween/wijs.jpeg',
    line1: 'Lever',
    line2: '7 munten in',
    color: '#ff7518',
  },
  {
    id: 'muzikaal',
    name: 'Muzikaal',
    image: '/pics/End Halloween/muzikaal.jpeg',
    line1: 'Jullie',
    line2: 'ver<span class="large-num">3</span>voudigen',
    color: '#ff7518',
  },
];

// 8 Standard Endgame Cards with Munten measures
export const ENDGAME_STANDARD_CARDS: EndgameCard[] = [
  {
    id: 'creatief',
    name: 'Creatief',
    image: '/endgame/creatief.webp',
    line1: 'Jammer',
    line2: 'jullie halveren',
    color: '#5b215c',
  },
  {
    id: 'doorzetter',
    name: 'Doorzetter',
    image: '/endgame/doorzetter.webp',
    line1: 'Lekker',
    line2: '5 munten extra',
    color: '#5b215c',
  },
  {
    id: 'wreed',
    name: 'Wreed',
    image: '/endgame/wreed.webp',
    line1: 'Geef 1 munt',
    line2: 'aan elk team',
    color: '#5b215c',
  },
  {
    id: 'beschermend',
    name: 'Beschermend',
    image: '/endgame/beschermend.webp',
    line1: 'Krijg 1 munt',
    line2: 'van elk team',
    color: '#5b215c',
  },
  {
    id: 'dapper',
    name: 'Dapper',
    image: '/endgame/dapper.webp',
    line1: 'Lever',
    line2: '3 munten in',
    color: '#5b215c',
  },
  {
    id: 'bedrieglijk',
    name: 'Bedrieglijk',
    image: '/endgame/bedriegelijk.webp',
    line1: 'Lekker',
    line2: 'jullie verdubbelen',
    color: '#5b215c',
  },
  {
    id: 'sinister',
    name: 'Sinister',
    image: '/endgame/sinister.webp',
    line1: 'Lever',
    line2: '7 munten in',
    color: '#5b215c',
  },
  {
    id: 'vreugdevol',
    name: 'Vreugdevol',
    image: '/endgame/vreugdevol.webp',
    line1: 'Jullie',
    line2: 'ver<span class="large-num">3</span>voudigen',
    color: '#5b215c',
  },
];

// Active cards on Halloween branch
export const ENDGAME_CARDS: EndgameCard[] = ENDGAME_HALLOWEEN_CARDS;

export interface EndgameState {
  selectedCard: string | null;
  playbackState: 'trailer' | 'grid' | 'paused' | 'playing' | 'finished' | 'endtitle';
  usedCards: string[];
  teamSelections?: Record<number, string>;
  revealedCards?: string[];
  timestamp?: number;
}

export const DEFAULT_ENDGAME_STATE: EndgameState = {
  selectedCard: null,
  playbackState: 'trailer',
  usedCards: [],
  teamSelections: {},
  revealedCards: [],
};
