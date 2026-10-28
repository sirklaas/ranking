import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/components/common/DisplayVideo.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function setup({ rejectPlay = false, captureFails = false } = {}) {
  const events = () => {
    const listeners = new Map();
    return {
      addEventListener: (name, fn) => listeners.set(name, fn),
      removeEventListener: (name, fn) => { if (listeners.get(name) === fn) listeners.delete(name); },
      fire: (name) => listeners.get(name)?.(),
      listeners,
    };
  };
  const video = Object.assign(events(), {
    style: {}, paused: true, duration: 10, currentTime: 0,
    videoWidth: 1920, videoHeight: 1080, plays: 0, pauses: 0,
    play() {
      this.plays++;
      if (rejectPlay) return Promise.reject(new Error('blocked'));
      this.paused = false;
      return Promise.resolve();
    },
    pause() { this.pauses++; this.paused = true; },
  });
  let captured = 0;
  const canvas = { hidden: true, getContext: () => ({ drawImage() {
    if (captureFails) throw new Error('capture failed');
    captured++;
  } }) };
  const window = events();
  const document = Object.assign(events(), { hidden: false });
  let effect;
  let refIndex = 0;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, window, document, console: { warn() {} },
    require(name) {
      if (name === 'react') return {
        useRef: (initial) => ({ current: refIndex++ === 0 ? video : refIndex === 2 ? canvas : initial }),
        useEffect: (fn) => { effect = fn; },
      };
      return { jsx: () => null, jsxs: () => null };
    },
  });
  let frozen = 0;
  exports.default({ src: '/example.mp4', freezeBeforeEnd: 0.5, onFrozen: () => frozen++ });
  const cleanup = effect();
  return { video, canvas, window, document, cleanup, captured: () => captured, frozen: () => frozen };
}

test('display holds a frame and does not restart it on clicks, keys or canplay', async () => {
  const s = setup();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(s.video.muted, true);
  assert.equal(s.video.volume, 0);
  s.video.currentTime = 9.6;
  s.video.fire('timeupdate');
  assert.equal(s.captured(), 1);
  assert.equal(s.canvas.hidden, false);
  assert.equal(s.video.style.visibility, 'hidden');
  assert.equal(s.video.paused, true);
  s.window.fire('click');
  s.window.fire('keydown');
  s.video.fire('canplay');
  s.video.fire('ended');
  assert.equal(s.video.plays, 1);
  assert.equal(s.frozen(), 1);
  s.cleanup();
  assert.equal(s.window.listeners.size, 0);
  assert.equal(s.video.listeners.size, 0);
  assert.equal(s.document.listeners.size, 0);
});

test('blocked playback can be retried with a display gesture', async () => {
  const s = setup({ rejectPlay: true });
  await new Promise(resolve => setImmediate(resolve));
  s.window.fire('click');
  assert.equal(s.video.plays, 2);
  await new Promise(resolve => setImmediate(resolve));
  s.cleanup();
});

test('capture failure leaves the original video visible', () => {
  const s = setup({ captureFails: true });
  s.video.currentTime = 9.6;
  s.video.fire('timeupdate');
  assert.equal(s.canvas.hidden, true);
  assert.equal(s.video.style.visibility, 'visible');
  assert.equal(s.frozen(), 0);
  s.cleanup();
});
