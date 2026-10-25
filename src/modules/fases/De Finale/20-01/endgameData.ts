export interface EndgameCard {
  id: string;
  name: string;
  image: string;
  video: string;
  fallbackVideoUrl: string;
}

export const ENDGAME_CARDS: EndgameCard[] = [
  {
    id: 'bedrieglijk',
    name: 'Bedrieglijk',
    image: '/endgame/bedriegelijk.webp',
    video: '/endgame/bedrieglijk.m4v',
    fallbackVideoUrl: 'https://www.end.pinkmilk.eu/bedrieglijk.m4v'
  },
  {
    id: 'beschermend',
    name: 'Beschermend',
    image: '/endgame/beschermend.webp',
    video: '/endgame/beschermend.m4v',
    fallbackVideoUrl: 'https://www.end.pinkmilk.eu/beschermend.m4v'
  },
  {
    id: 'creatief',
    name: 'Creatief',
    image: '/endgame/creatief.webp',
    video: '/endgame/creatief.m4v',
    fallbackVideoUrl: 'https://www.end.pinkmilk.eu/creatief.m4v'
  },
  {
    id: 'dapper',
    name: 'Dapper',
    image: '/endgame/dapper.webp',
    video: '/endgame/dapper.m4v',
    fallbackVideoUrl: 'https://www.end.pinkmilk.eu/dapper.m4v'
  },
  {
    id: 'doorzetter',
    name: 'Doorzetter',
    image: '/endgame/doorzetter.webp',
    video: '/endgame/doorzetter.m4v',
    fallbackVideoUrl: 'https://www.end.pinkmilk.eu/doorzetter.m4v'
  },
  {
    id: 'sinister',
    name: 'Sinister',
    image: '/endgame/sinister.webp',
    video: '/endgame/sinister.m4v',
    fallbackVideoUrl: 'https://www.end.pinkmilk.eu/sinister.m4v'
  },
  {
    id: 'vreugdevol',
    name: 'Vreugdevol',
    image: '/endgame/vreugdevol.webp',
    video: '/endgame/vreugdevol.m4v',
    fallbackVideoUrl: 'https://www.end.pinkmilk.eu/vreugdevol.m4v'
  },
  {
    id: 'wreed',
    name: 'Wreed',
    image: '/endgame/wreed.webp',
    video: '/endgame/wreed.m4v',
    fallbackVideoUrl: 'https://www.end.pinkmilk.eu/wreed.m4v'
  }
];

export interface EndgameState {
  selectedCard: string | null;
  playbackState: 'grid' | 'paused' | 'playing' | 'finished' | 'endtitle';
  usedCards: string[];
  teamSelections: Record<string, string>; // teamNumber (string) -> cardId
  revealedCards: string[];                // cardIds whose display video has finished
  timestamp?: number;
}

export const DEFAULT_ENDGAME_STATE: EndgameState = {
  selectedCard: null,
  playbackState: 'grid',
  usedCards: [],
  teamSelections: {},
  revealedCards: []
};
