// How real the 3D looks, in every mode. Cartoon is the game's own look: toon shading and ink outlines.
// Soft lights everything like a photograph, in the same plain colours. Real adds photographed materials
// (terrazzo, glazed tiles, brushed steel, worn wood, marble, asphalt, corrugated roofs) and the light of a
// real sky for the time of day. Scene builders tag surfaces with mat(colour, { surface }); this file turns
// the toon materials into physically based ones after a scene is built, so every builder keeps working.
//
// Textures and sky maps are CC0, from ambientCG and Poly Haven (apps/hawker/media/textures.json, hdri.json).
// Real textures use world-space box projection, so a three metre counter and a one metre stool get tiles
// of the same size without any UV work.

import {
  Color,
  DataTexture,
  EquirectangularReflectionMapping,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  NeutralToneMapping,
  NoToneMapping,
  PMREMGenerator,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  TextureLoader,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { manifest, mediaUrl } from "./media.js";

export const LOOKS = [
  { id: "toon", name: "Cartoon", note: "Flat colours and ink outlines" },
  { id: "soft", name: "Soft", note: "Lit like a photo" },
  { id: "real", name: "Real", note: "Photo textures and real skies" },
];

let look = "toon";
export const realism = () => look;
export const isToon = () => look === "toon";
export function setRealism(id) {
  look = LOOKS.some((l) => l.id === id) ? id : "toon";
  return look;
}

// Each surface: its texture folder, how rough and metallic it is, and how far its own colour shows
// through the paint (0 keeps the builder's colour, 1 shows the photo's colour).
const SURFACES = {
  terrazzo: { tex: "terrazzo", rough: 0.5, own: 0.75 },
  floortiles: { tex: "floortiles", rough: 0.45, own: 0.8 },
  tiles: { tex: "walltiles", rough: 0.22, own: 0.15 },
  concrete: { tex: "concrete", rough: 0.85, own: 0.45 },
  steel: { tex: "steel", rough: 0.34, metal: 0.55, own: 0.45 },
  wood: { tex: "wood", rough: 0.6, own: 0.55 },
  plaster: { tex: "plaster", rough: 0.9, own: 0.1 },
  asphalt: { tex: "asphalt", rough: 0.95, own: 0.85 },
  roof: { tex: "corrugated", rough: 0.6, metal: 0.2, own: 0 },
  fabric: { tex: "fabric", rough: 0.95, own: 0.1 },
  marble: { tex: "marble", rough: 0.25, own: 0.85 },
  plastic: { rough: 0.42 },
  ceramic: { rough: 0.18 },
  glass: { rough: 0.05, metal: 0.1 },
  skin: { rough: 0.55 },
  cloth: { rough: 0.9 },
  // Food: rice is matte, fried things have a sheen, sauces and skin are glossy, soup is wet.
  rice: { rough: 0.78 },
  food: { rough: 0.6 },
  fried: { rough: 0.45 },
  glossy: { rough: 0.24 },
  soup: { rough: 0.06 },
  leaf: { rough: 0.45 },
};
// Metres one texture tile covers, until the manifest says otherwise.
const METRES = { terrazzo: 1, floortiles: 1.5, walltiles: 1.2, concrete: 2, steel: 1, wood: 0.55, plaster: 2, asphalt: 2, corrugated: 1, fabric: 1, marble: 1 };

const WHITE = new Color("#ffffff");

// ---------- Textures, shared by every material of a surface ----------

function solid(r, g, b) {
  const t = new DataTexture(new Uint8Array([r, g, b, 255]), 1, 1, RGBAFormat);
  t.needsUpdate = true;
  return t;
}
const BLANK = solid(255, 255, 255);
const FLAT = solid(128, 128, 255);

const uniforms = new Map();
let loading = null;

function surfaceUniforms(folder) {
  if (!uniforms.has(folder)) {
    uniforms.set(folder, { tpMap: { value: BLANK }, tpRough: { value: BLANK }, tpNormal: { value: FLAT }, tpScale: { value: 1 / (METRES[folder] ?? 1) }, tpOn: { value: 0 } });
  }
  return uniforms.get(folder);
}

function loadTextures(renderer) {
  if (loading) return loading;
  const loader = new TextureLoader();
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() ?? 1);
  const get = (url, srgb) =>
    new Promise((resolve) =>
      loader.load(
        url,
        (t) => {
          t.wrapS = t.wrapT = RepeatWrapping;
          t.anisotropy = aniso;
          if (srgb) t.colorSpace = SRGBColorSpace;
          resolve(t);
        },
        undefined,
        () => resolve(null),
      ),
    );
  loading = manifest("textures").then(async (m) => {
    const list = m?.textures ?? {};
    const folders = [...new Set(Object.values(SURFACES).map((s) => s.tex).filter(Boolean))];
    await Promise.all(
      folders.map(async (folder) => {
        const u = surfaceUniforms(folder);
        if (list[folder]?.metresPerTile) u.tpScale.value = 1 / list[folder].metresPerTile;
        const [c, n, r] = await Promise.all([get(mediaUrl(`textures/${folder}/color.jpg`), true), get(mediaUrl(`textures/${folder}/normal.jpg`), false), get(mediaUrl(`textures/${folder}/rough.jpg`), false)]);
        if (!c) return;
        u.tpMap.value = c;
        if (n) u.tpNormal.value = n;
        if (r) u.tpRough.value = r;
        u.tpOn.value = 1;
      }),
    );
  });
  return loading;
}

// Box projection in world space: each fragment takes the texture from the axis its surface faces.
function project(material, folder) {
  const u = surfaceUniforms(folder);
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vTpPos;\nvarying vec3 vTpN;")
      .replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>
        vec4 tpW = vec4(transformed, 1.0);
        vec3 tpN0 = objectNormal;
        #ifdef USE_INSTANCING
          tpW = instanceMatrix * tpW;
          tpN0 = mat3(instanceMatrix) * tpN0;
        #endif
        tpW = modelMatrix * tpW;
        vTpPos = tpW.xyz;
        vTpN = normalize(mat3(modelMatrix) * tpN0);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vTpPos;
        varying vec3 vTpN;
        uniform sampler2D tpMap;
        uniform sampler2D tpRough;
        uniform sampler2D tpNormal;
        uniform float tpScale;
        uniform float tpOn;`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        vec3 tpNw = normalize(vTpN);
        vec3 tpA = abs(tpNw);
        vec2 tpUv;
        vec3 tpT;
        vec3 tpB;
        if (tpA.y >= tpA.x && tpA.y >= tpA.z) {
          tpUv = tpNw.y > 0.0 ? vec2(vTpPos.x, -vTpPos.z) : vTpPos.xz;
          tpT = vec3(1.0, 0.0, 0.0);
          tpB = vec3(0.0, 0.0, tpNw.y > 0.0 ? -1.0 : 1.0);
        } else if (tpA.x >= tpA.z) {
          tpUv = tpNw.x > 0.0 ? vec2(-vTpPos.z, vTpPos.y) : vTpPos.zy;
          tpT = vec3(0.0, 0.0, tpNw.x > 0.0 ? -1.0 : 1.0);
          tpB = vec3(0.0, 1.0, 0.0);
        } else {
          tpUv = tpNw.z > 0.0 ? vTpPos.xy : vec2(-vTpPos.x, vTpPos.y);
          tpT = vec3(tpNw.z > 0.0 ? 1.0 : -1.0, 0.0, 0.0);
          tpB = vec3(0.0, 1.0, 0.0);
        }
        tpUv *= tpScale;
        diffuseColor.rgb *= mix(vec3(1.0), texture2D(tpMap, tpUv).rgb, tpOn);`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, clamp(roughnessFactor * (0.35 + texture2D(tpRough, tpUv).g * 1.1), 0.04, 1.0), tpOn);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        vec3 tpTn = texture2D(tpNormal, tpUv).xyz * 2.0 - 1.0;
        tpTn.xy *= 0.8;
        vec3 tpPn = normalize(tpT * tpTn.x + tpB * tpTn.y + tpNw * tpTn.z) * faceDirection;
        normal = normalize(mix(normal, normalize((viewMatrix * vec4(tpPn, 0.0)).xyz), tpOn));`,
      );
  };
  material.customProgramCacheKey = () => "box-projected";
}

// ---------- Materials ----------

const made = new Map();

// The material for the current look. Works both ways: a converted material remembers its toon original.
export function asLook(material) {
  return convert(material);
}

function convert(material) {
  if (material instanceof MeshBasicMaterial) {
    // Lit signs and labels keep their exact colours.
    material.toneMapped = look === "toon";
    return material;
  }
  const m = material.userData?.toon ?? material;
  if (!(m instanceof MeshToonMaterial)) return material;
  if (look === "toon") return m;
  const key = `${m.uuid}|${look}`;
  if (made.has(key)) return made.get(key);
  const s = SURFACES[m.userData.surface] ?? null;
  const n = new MeshStandardMaterial({
    color: m.color.clone(),
    map: m.map,
    emissive: m.emissive.clone(),
    emissiveIntensity: m.emissiveIntensity,
    transparent: m.transparent,
    opacity: m.opacity,
    side: m.side,
    depthWrite: m.depthWrite,
    alphaTest: m.alphaTest,
    vertexColors: m.vertexColors,
    roughness: s?.rough ?? (m.emissiveIntensity > 0.5 && m.emissive.getHex() ? 0.4 : 0.72),
    metalness: s?.metal ?? 0,
  });
  n.name = m.name;
  n.userData = { ...m.userData, toon: m, outlineParameters: { visible: false } };
  if (look === "real" && s?.tex) {
    n.color.lerp(WHITE, s.own ?? 0);
    n.map = null;
    project(n, s.tex);
  }
  made.set(key, n);
  return n;
}

// Turns every material in a scene into this look, sets the sky light, and tunes the renderer.
// time: "day" | "dusk" | "night". indoor: lit by the hall's own even light (a neutral room) rather than the
// open sky. sky: show the real sky behind everything (Real only). Returns how much to scale the
// hemisphere light by.
export function realise(scene, renderer, { time = "day", indoor = true, sky = false } = {}) {
  // Khronos' neutral tone mapping keeps food and paint colours true; Real gets a touch more light.
  renderer.toneMapping = look === "toon" ? NoToneMapping : NeutralToneMapping;
  renderer.toneMappingExposure = look === "real" ? 1.05 : 1;
  scene.traverse((o) => {
    if (!o.material) return;
    if (Array.isArray(o.material)) o.material = o.material.map(convert);
    else o.material = convert(o.material);
  });
  if (scene.userData.skyColour === undefined) scene.userData.skyColour = scene.background;
  if (look === "toon") {
    scene.environment = null;
    if (scene.userData.skyColour) scene.background = scene.userData.skyColour;
    return 1;
  }
  if (look === "real") loadTextures(renderer);
  const want = look === "real" && !indoor ? time : "room";
  scene.userData.envKey = want;
  const apply = (tex, key) => {
    if (!tex || scene.userData.envKey !== want) return;
    scene.environment = tex;
    scene.environmentIntensity = key === "room" ? (look === "real" ? 0.5 : 0.32) : time === "night" ? 0.55 : 0.75;
  };
  // The neutral room light straight away; the real sky as soon as it has loaded.
  environment(renderer, "room").then((t) => (want === "room" || !scene.environment ? apply(t, "room") : null));
  if (want !== "room") environment(renderer, want).then((t) => apply(t, want));
  // Behind it all, the real sky, softly out of focus.
  if (look === "real" && sky) {
    scene.userData.skyKey = time;
    hdrSky(time).then((t) => {
      if (!t || scene.userData.skyKey !== time || realism() !== "real") return;
      scene.background = t;
      scene.backgroundBlurriness = 0.45;
      scene.backgroundIntensity = time === "night" ? 0.7 : 0.85;
    });
  } else if (scene.userData.skyColour) {
    scene.userData.skyKey = null;
    scene.background = scene.userData.skyColour;
  }
  return look === "real" ? 0.6 : 0.7;
}

const skies = new Map();
function hdrSky(key) {
  if (!skies.has(key)) {
    skies.set(
      key,
      new Promise((resolve) =>
        new HDRLoader().load(
          mediaUrl(`hdri/${key}.hdr`),
          (hdr) => {
            hdr.mapping = EquirectangularReflectionMapping;
            resolve(hdr);
          },
          undefined,
          () => resolve(null),
        ),
      ),
    );
  }
  return skies.get(key);
}

// A material for things made after the scene was realised (a dish on a tray, a new prop).
export function realiseObject(obj) {
  if (look === "toon") return obj;
  obj.traverse((o) => {
    if (!o.material) return;
    o.material = Array.isArray(o.material) ? o.material.map(convert) : convert(o.material);
  });
  return obj;
}

// ---------- Sky light ----------

const envs = new Map();
// After the browser restores a lost WebGL context the sky light maps are blank, so they are made again.
export function gpuReset() {
  envs.clear();
}

function environment(renderer, key) {
  if (envs.has(key)) return envs.get(key);
  const pmrem = new PMREMGenerator(renderer);
  let p;
  if (key === "room") {
    const t = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    p = Promise.resolve(t);
  } else {
    p = new Promise((resolve) => {
      new HDRLoader().load(
        mediaUrl(`hdri/${key}.hdr`),
        (hdr) => {
          hdr.mapping = EquirectangularReflectionMapping;
          const t = pmrem.fromEquirectangular(hdr).texture;
          hdr.dispose();
          pmrem.dispose();
          resolve(t);
        },
        undefined,
        () => {
          pmrem.dispose();
          resolve(null);
        },
      );
    });
  }
  envs.set(key, p);
  return p;
}

// The time of day a scene should borrow its sky light from.
export function skyFor(presetTime, eraId) {
  if (presetTime === "night") return "night";
  if (presetTime === "dusk" || presetTime === "evening") return "dusk";
  if (eraId === "1950s") return "dusk";
  return "day";
}
