# Folk models

Real-looking rigged people for the farm game, one GLB per person (`<id>.glb`), loaded by
`src/game/three/realPeople.js` only when the id is listed in `manifest.json`.

- **Made with:** MakeHuman / MPFB2 in Blender, by `scripts/build/build_people.py` (people from
  `scripts/build/people_specs.mjs`), then compressed with gltf-transform (WebP textures, meshopt).
- **Assets:** the MakeHuman base mesh, skins, eyes, eyebrows, eyelashes, teeth, hair, shoes and the clothes it
  repaints come from MakeHuman's `makehuman_system_assets` pack, **CC0 1.0** (public domain); MakeHuman claims no
  rights over exported models. Local dress (lungi, sari, kurta hem, turbans, caps, scarves, beards) and fabric
  patterns are made by the build script.
- **Done:** `razib` (2026-11-06). The other `.glb` files here are from an earlier version of the script and are not
  listed in the manifest, so the game does not load them.
