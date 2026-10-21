// Title-card definitions — code replacements for the Ranking*.m4v clips.
//
// The originals were built in Keynote (see the Superfoods HTML export):
//   - subtitle (purple): "From Darkness" build, 2.5s, ease-in-out, Shine on, Scale 70%
//   - title (white):     "Keyboard" build, 3s, per character (cursor + irregular typing)
//   - audio:             two SFX ("Cartoon Accent 12" + "Afganistan Sand Rabab 05")
// Timings below were measured frame-by-frame (24 fps) from the original videos.

export type SfxCue = { src: string; at: number; gain?: number };

export type TitleCardConfig = {
  id: string;
  /** White line, typed in by the keyboard build */
  title: string;
  /** Purple line, "From Darkness" build */
  subtitle: string;
  /** Total length in seconds (matches the original clip) */
  duration: number;
  /** Start of the purple "From Darkness" build */
  subtitleStart: number;
  subtitleDuration?: number;
  /** Absolute time (s) at which each character of `title` appears (same length as title) */
  typeTimes: number[];
  /** Intervals [from, to) in which the cursor is visible */
  cursorOn: [number, number][];
  sfx: SfxCue[];
};

export const SFX = {
  cartoonAccent: '/titlecards/sfx/cartoon-accent-12.m4a',
  rabab: '/titlecards/sfx/rabab-05.m4a',
};

const f = (frame: number) => frame / 24;

export const TITLE_CARDS: Record<string, TitleCardConfig> = {
  flirt: {
    id: 'flirt',
    title: 'IK FLIRT SOMS',
    subtitle: 'OM IETS TE KRIJGEN',
    duration: 14.29,
    subtitleStart: f(48),
    subtitleDuration: 2.5,
    //            I     K     _     F     L     I     R     T     _     S     O     M     S
    typeTimes: [124, 128, 130, 132, 135, 139, 142, 143, 155, 158, 159, 163, 165].map(f),
    cursorOn: [
      [f(112), f(115)],
      [f(122), f(144)],
      [f(151), f(168)],
      [f(174), f(177)],
    ],
    sfx: [
      { src: SFX.cartoonAccent, at: 1.96 },
      { src: SFX.rabab, at: 4.45 },
    ],
  },
};
