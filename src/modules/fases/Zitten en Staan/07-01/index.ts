import type { FaseModule } from '@/types/fases';
import { registerFase } from '@/modules/fases';
import { key, title, group, needs, skipTrailer } from './config';
import PresenterView from './PresenterView';
import PlayerView from './PlayerView';
import DisplayView from './DisplayView';

export const faseModule: FaseModule = {
  key,
  group,
  title,
  needs,
  skipTrailer,
  PresenterView,
  PlayerView,
  DisplayView,
};

registerFase(faseModule);

export default faseModule;
