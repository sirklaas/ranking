import type { FaseModule } from '@/types/fases';
import { registerFase } from '@/modules/fases';
import { key, title, group, needs, stateField, skipTrailer } from './config';
import PresenterView from './PresenterView';
import DisplayView from './DisplayView';
import PlayerView from './PlayerView';

export const faseModule: FaseModule = {
  key,
  group,
  title,
  needs,
  stateField,
  skipTrailer,
  PresenterView,
  DisplayView,
  PlayerView,
};

registerFase(faseModule);

export default faseModule;
