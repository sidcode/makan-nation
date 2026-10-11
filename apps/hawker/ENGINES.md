# Which 3D library for a co-op cooking game?

Makan Nation is a small grid kitchen seen from above, with chunky low-poly shapes, toon shading, outlines and 1 to 4 players. It has to load fast on a phone over hawker centre wifi and build with Bun alone. That weighs heavily on size and toolchain, and lightly on physics.

## Measured

A minimal lit scene (one box, two lights, a camera), bundled with `bun build --minify`, then gzipped. Measured on 2026-10-05.

| Package | Minified | Gzipped |
|---|---|---|
| three 0.186.1 | 525 KB | 130 KB |
| @babylonjs/core 9.29.0 (tree-shaken imports, with shadows) | 1,739 KB | 406 KB |
| playcanvas 2.23.0 | 2,385 KB | 619 KB |
| trystero 0.26.0 (peer to peer networking) | 75 KB | 27 KB |

The whole game, including Three.js, the outline effect, Trystero and fonts, builds to a 709 KB script and a 380 KB stylesheet before compression.

## Compared

| | Look | Built in | First load | Fits a Bun-only repo | Multiplayer | Learning curve |
|---|---|---|---|---|---|---|
| **Three.js** | Anything you can write a material for; toon and outline examples ship with it | Renderer, scene graph, loaders, post effects. No physics, GUI or editor | Smallest of the 3D options above | Yes. Plain ES modules, bundles from an HTML file | Bring your own | Gentle start, you assemble the rest |
| **Babylon.js** | PBR, node materials, nice defaults | Physics through a Havok WebAssembly plugin, GUI, the Inspector debugger, particles | About 3x Three.js in our test | Yes, with deep imports for tree-shaking | Bring your own | Larger API, very good docs |
| **PlayCanvas** | Strong lighting and WebGPU support | Engine plus a browser-based visual editor (both MIT) | Largest in our test | Engine yes; the editor workflow lives in the browser | Bring your own | Easy with the editor, more to learn without |
| **Godot (web export)** | Full engine, great 2D and 3D tooling | Physics, UI, animation, editor | Ships the engine as WebAssembly, so even tiny games are megabytes | No. Separate editor and export step | High-level multiplayer API with WebSocket and WebRTC peers | Easy for games, new toolchain. C# projects cannot export to web in Godot 4 |
| **Unity (Web)** | Mature pipeline, huge asset store | Everything, plus an editor | Heavy downloads for the web | No. Separate editor, C# | Netcode for GameObjects; web builds need a WebSocket transport | Steep, with licensing to read |
| **react-three-fiber** | Same as Three.js | Same as Three.js, plus helpers like drei and a Rapier physics wrapper | Three.js plus React | Yes, Bun bundles JSX | Bring your own | Natural if the team already writes React |
| **Phaser / Excalibur** (2D fallback) | Sprites and tilemaps | 2D physics, input, scenes | Not measured here | Yes | Bring your own | Easy |

## Verdict

**Three.js.** It is the smallest, it bundles cleanly from an HTML import, the toon shading and outline effect we wanted come with it, and a grid kitchen needs no physics engine (collisions are a dozen lines against the tile grid). Its huge community also means more answers when you get stuck mid-makeathon.

**Pick Babylon.js instead when** you want real physics (Havok rigid bodies, joints, character controllers), on-screen GUI widgets, or to poke at a live scene in the Inspector without writing tooling. A kitchen with tossed ingredients and sliding plates, Overcooked style, would tip it towards Babylon.

**Pick Godot when** the game outgrows a web page: lots of levels, animation, and an editor for the non-coders on the team. Pay for it in first-load size.

## Networking, briefly

Neither Three.js nor Babylon.js does multiplayer, so Makan Nation has its own: the host's browser runs the kitchen, guests send button presses, the host sends back about 20 snapshots a second.

- **Same wifi:** WebSocket rooms on the Bun server. The server only relays.
- **Online:** [Trystero](https://github.com/dmotz/trystero) connects browsers directly over WebRTC, using public Nostr relays to find each other. This also works from a static site with no server of ours.
- **Caveat:** peer to peer needs the two browsers to reach each other. Most home and phone networks work. Some strict office, school or carrier networks block it, and fixing that needs a TURN relay server (Trystero accepts one through `turnConfig`). Same wifi with the Bun server is the safe choice for a live demo.

## Sources

- [Three.js](https://threejs.org/) and its [OutlineEffect](https://threejs.org/docs/#examples/en/effects/OutlineEffect)
- [Babylon.js Havok plugin](https://doc.babylonjs.com/features/featuresDeepDive/physics/havokPlugin)
- [PlayCanvas engine](https://playcanvas.com/products/engine) and its [MIT editor frontend](https://alternativeto.net/news/2025/8/playcanvas-editor-frontend-is-now-open-source-with-mit-license)
- [Godot: exporting for the web](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)
- [Unity Netcode for GameObjects](https://docs-multiplayer.unity3d.com/netcode/current/about/)
- [react-three-fiber](https://r3f.docs.pmnd.rs/)
