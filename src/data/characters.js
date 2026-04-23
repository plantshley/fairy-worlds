export const CHARACTERS = [
  {
    id: "procedural-fairy",
    kind: "procedural",
    title: "fairy",
    description: "fully customizable — tint, swap, toggle every part",
  },
    {
    id: "cat-strawberries",
    kind: "glb",
    title: "cat",
    description: "GLB — tint materials",
    url: "/characters/cute_cat_with_strawberries.glb",
    scale: 0.3,
  },
  {
    id: "bunnie",
    kind: "glb",
    title: "bunnie",
    description: "animal crossing — tint Shirt",
    url: "/characters/animal_crossing__bunnie.glb",
    scale: 12.0,
    tintable: [{ name: "cloth", label: "Shirt" }],
  },
  {
    id: "bob",
    kind: "glb",
    title: "bob",
    description: "animal crossing pocket camp — tint Shirt",
    url: "/characters/mobile_-_animal_crossing_pocket_camp_-_bob.glb",
    scale: 12.0,
    tintable: [{ name: "cloth", label: "Shirt" }],
  },
  {
    id: "bunny-1",
    kind: "glb",
    title: "bunny 1",
    description: "GLB — tint materials",
    url: "/characters/bunny_gltf.glb",
    nodePrefix: "bunny1_",
    scale: 0.225,
  },
  {
    id: "bunny-2",
    kind: "glb",
    title: "bunny 2",
    description: "GLB — tint materials",
    url: "/characters/bunny_gltf.glb",
    nodePrefix: "bunny2_",
    scale: 0.225,
  },

];

export const DEFAULT_CHARACTER_ID = "procedural-fairy";
