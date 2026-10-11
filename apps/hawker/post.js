// High quality only: a gentle bloom on lamps, flames and signs, and per-era colour grading.
// Loaded on demand, so phones on Low or Medium never download it.

import { HalfFloatType, Vector2, Vector3, WebGLRenderTarget } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { Pass } from "three/examples/jsm/postprocessing/Pass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

// Draws the scene with the toon outlines into the composer's buffer.
// plain(): true for the Soft and Real looks, which have no outlines.
class OutlinedScenePass extends Pass {
  constructor(effect, scene, camera, plain) {
    super();
    Object.assign(this, { effect, scene, camera, plain });
    this.needsSwap = false;
  }
  render(renderer, writeBuffer, readBuffer) {
    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
    renderer.clear();
    if (this.plain?.()) renderer.render(this.scene, this.camera);
    else this.effect.render(this.scene, this.camera);
  }
}

const Grade = {
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 1 },
    contrast: { value: 1 },
    lift: { value: new Vector3() },
    gain: { value: new Vector3(1, 1, 1) },
    vignette: { value: 0.2 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float saturation, contrast, vignette;
    uniform vec3 lift, gain;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, saturation);
      col = (col - 0.18) * contrast + 0.18;
      col = col * gain + lift * (1.0 - clamp(col, 0.0, 1.0));
      vec2 d = vUv - 0.5;
      col *= 1.0 - vignette * dot(d, d) * 2.2;
      gl_FragColor = vec4(max(col, 0.0), c.a);
    }`,
};

// Per-era looks: sepia and soft for the 1950s, warm for the 1980s, clean today, cool and bright in 2065.
const LOOKS = {
  "1950s": { saturation: 0.8, contrast: 0.96, lift: [0.05, 0.03, 0.0], gain: [1.04, 0.98, 0.88], vignette: 0.42, bloom: 0.55 },
  "1980s": { saturation: 0.95, contrast: 1.02, lift: [0.03, 0.015, 0.0], gain: [1.03, 1.0, 0.94], vignette: 0.28, bloom: 0.45 },
  today: { saturation: 1.05, contrast: 1.04, lift: [0, 0.005, 0.01], gain: [1, 1, 1], vignette: 0.18, bloom: 0.35 },
  2065: { saturation: 1.0, contrast: 1.02, lift: [0.0, 0.02, 0.03], gain: [0.97, 1.01, 1.04], vignette: 0.16, bloom: 0.5 },
};

export function makePost(renderer, scene, camera, effect, plain = null) {
  const size = renderer.getSize(new Vector2());
  const ratio = renderer.getPixelRatio();
  // Multisampled, so edges stay smooth with post-processing on.
  const target = new WebGLRenderTarget(size.x * ratio, size.y * ratio, { type: HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new OutlinedScenePass(effect, scene, camera, plain));
  // Lit white surfaces reach about 1.4 here, so only lamps, flames and glowing signs pass the threshold.
  const bloom = new UnrealBloomPass(new Vector2(size.x, size.y), 0.4, 0.4, 1.55);
  composer.addPass(bloom);
  const grade = new ShaderPass(Grade);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  return {
    composer,
    setEra(id) {
      const l = LOOKS[id] ?? LOOKS.today;
      const u = grade.uniforms;
      u.saturation.value = l.saturation;
      u.contrast.value = l.contrast;
      u.lift.value.set(...l.lift);
      u.gain.value.set(...l.gain);
      u.vignette.value = l.vignette;
      bloom.strength = l.bloom;
    },
    setSize(w, h, pr) {
      composer.setPixelRatio(pr);
      composer.setSize(w, h);
    },
    render() {
      composer.render();
    },
    dispose() {
      composer.dispose();
      target.dispose();
    },
  };
}
