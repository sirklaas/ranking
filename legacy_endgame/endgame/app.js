// Endgame Application - Shared State Management

// Card Configuration
const cards = [
  { id: 'bedrieglijk', name: 'Bedrieglijk', image: 'bedriegelijk.webp', video: 'bedrieglijk.m4v' },
  { id: 'beschermend', name: 'Beschermend', image: 'beschermend.webp', video: 'beschermend.m4v' },
  { id: 'creatief', name: 'Creatief', image: 'creatief.webp', video: 'creatief.m4v' },
  { id: 'dapper', name: 'Dapper', image: 'dapper.webp', video: 'dapper.m4v' },
  { id: 'doorzetter', name: 'Doorzetter', image: 'doorzetter.webp', video: 'doorzetter.m4v' },
  { id: 'sinister', name: 'Sinister', image: 'sinister.webp', video: 'sinister.m4v' },
  { id: 'vreugdevol', name: 'Vreugdevol', image: 'vreugdevol.webp', video: 'vreugdevol.m4v' },
  { id: 'wreed', name: 'Wreed', image: 'wreed.webp', video: 'wreed.m4v' }
];

// State Management
class EndgameState {
  constructor() {
    this.selectedCard = null;
    this.playbackState = 'grid'; // 'grid', 'paused', 'playing'
    this.usedCards = new Set();
    this.loadState();
  }

  loadState() {
    try {
      const saved = localStorage.getItem('endgameState');
      if (saved) {
        const state = JSON.parse(saved);
        this.selectedCard = state.selectedCard || null;
        this.playbackState = state.playbackState || 'grid';
        this.usedCards = new Set(state.usedCards || []);
      }
    } catch (e) {
      console.error('Error loading state:', e);
    }
  }

  saveState() {
    const state = {
      selectedCard: this.selectedCard,
      playbackState: this.playbackState,
      usedCards: Array.from(this.usedCards),
      timestamp: Date.now()
    };
    localStorage.setItem('endgameState', JSON.stringify(state));
  }

  selectCard(cardId) {
    if (this.usedCards.has(cardId)) return false;
    this.selectedCard = cardId;
    this.playbackState = 'paused';
    this.saveState();
    return true;
  }

  playVideo() {
    if (this.playbackState === 'paused') {
      this.playbackState = 'playing';
      this.saveState();
      return true;
    }
    return false;
  }

  returnToGrid() {
    if (this.selectedCard) {
      this.usedCards.add(this.selectedCard);
    }
    this.selectedCard = null;
    this.playbackState = 'grid';
    this.saveState();
  }

  reset() {
    this.selectedCard = null;
    this.playbackState = 'grid';
    this.usedCards.clear();
    this.saveState();
  }

  showEndTitle() {
    this.selectedCard = null;
    this.playbackState = 'endtitle';
    this.saveState();
  }

  isCardUsed(cardId) {
    return this.usedCards.has(cardId);
  }
}

// Video Controller
class VideoController {
  constructor(videoElement, titleElement) {
    this.video = videoElement;
    this.title = titleElement;
    this.currentCard = null;
  }

  loadCard(card) {
    this.currentCard = card;

    if (card.video) {
      // Has video - load and show first frame
      console.log('Loading video:', card.video);
      this.video.src = card.video;
      this.video.load();
      this.video.currentTime = 0;
      this.video.style.display = 'block';
      
      // Log when video is ready
      this.video.addEventListener('loadeddata', () => {
        console.log('Video loaded and ready:', card.name, 'duration:', this.video.duration);
      }, { once: true });
      
      this.video.addEventListener('error', (e) => {
        console.error('Video load error:', card.video, e);
      }, { once: true });
    } else {
      // No video - use static image
      this.video.style.display = 'none';
      this.video.poster = card.image;
    }

    if (this.title) {
      this.title.textContent = card.name;
      this.title.classList.remove('hidden');
    }
  }

  async play() {
    if (this.currentCard && this.currentCard.video) {
      try {
        console.log('Playing video:', this.currentCard.name);
        this.video.currentTime = 0;
        if (this.title) {
          this.title.classList.add('hidden');
        }
        await this.video.play();
        console.log('Video playing successfully');
        return true;
      } catch (e) {
        console.error('Error playing video:', e);
        return false;
      }
    } else {
      // No video - just show image for a moment
      if (this.title) {
        this.title.classList.add('hidden');
      }
      return true;
    }
  }

  pause() {
    if (this.video) {
      this.video.pause();
    }
  }

  reset() {
    if (this.video) {
      this.video.pause();
      this.video.currentTime = 0;
      this.video.src = '';
    }
    if (this.title) {
      this.title.textContent = '';
      this.title.classList.add('hidden');
    }
    this.currentCard = null;
  }
}

// Utility Functions
function getCardById(cardId) {
  return cards.find(card => card.id === cardId);
}

function updateCardVisuals(cardElement, cardId, state) {
  if (state.isCardUsed(cardId)) {
    cardElement.classList.add('used');
  } else {
    cardElement.classList.remove('used');
  }

  if (state.selectedCard === cardId && state.playbackState !== 'grid') {
    cardElement.classList.add('selected');
  } else {
    cardElement.classList.remove('selected');
  }
}

// Event Debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
