import type { FaseModule } from '@/types/fases';
import { registerFase } from '@/modules/fases';
import { key, title, group, needs, skipTrailer } from './config';
import DisplayView from './DisplayView';
import PresenterView from './PresenterView';
import PlayerView from './PlayerView';

export const faseModule: FaseModule = {
    key,
    group,
    title,
    needs,
    skipTrailer,
    DisplayView,
    PresenterView,
    PlayerView,
};

registerFase(faseModule);

export default faseModule;
