import type { FaseModule } from '@/types/fases';
import { registerFase } from '@/modules/fases';
import { key, title, group, needs, skipTrailer } from './config';
import PresenterView from './PresenterView';
import PlayerView from './PlayerView';

// No custom DisplayView — normal media overlay handles video playback on display
export const faseModule: FaseModule = {
  key,
  group,
  title,
  needs,
  skipTrailer,
  PresenterView,
  PlayerView,
};

registerFase(faseModule);

export default faseModule;
