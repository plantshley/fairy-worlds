import { buildHubPortals } from "./hubPortals.js";

export const SCENES = [
  {
    id: "heart-pool-1-1-1004",
    world: "Heart Pool Pavilion",
    title: "Heart Pool Pavilion 1.1-1004",
    url: import.meta.env.BASE_URL + "splats/Heart%20Pool%20Pavilion.spz",
    spawn: {
      position: [0, 1.5, 0.82],
      quaternion: [0, 0, 0, 1],
    },
  },
  {
    id: "heart-pool-1-1",
    world: "Heart Pool Pavilion",
    title: "Heart Pool Pavilion 1.1",
    url: import.meta.env.BASE_URL + "splats/Heart%20Pool%20Pavilion%201-1.spz",
    spawn: {
      position: [0, 1.5, 0.82],
      quaternion: [0, 0, 0, 1],
    },
  },
  {
    id: "heart-pool-1-0",
    world: "Heart Pool Pavilion",
    title: "Heart Pool Pavilion 1.0",
    url: import.meta.env.BASE_URL + "splats/Heart%20Pool%20Pavilion%201-0.spz",
    spawn: {
      position: [-0.02, 1.36, 0.72],
      quaternion: [-0.048, 0.014, 0.001, 0.999],
    },
  },
  {
    id: "berry-dream-kitchen-1-1",
    world: "Berry Dream Kitchen",
    title: "Berry Dream Kitchen 1.1",
    url: import.meta.env.BASE_URL + "splats/Berry%20Dream%20Kitchen%201-1.spz",
    spawn: {
      position: [-0.02, 1.36, 0.72],
      quaternion: [-0.048, 0.014, 0.001, 0.999],
    },
  },
  {
    id: "berry-dream-kitchen-1-0",
    world: "Berry Dream Kitchen",
    title: "Berry Dream Kitchen 1.0",
    url: import.meta.env.BASE_URL + "splats/Berry%20Dream%20Kitchen%201-0.spz",
    spawn: {
      position: [-0.02, 1.36, 0.72],
      quaternion: [-0.048, 0.014, 0.001, 0.999],
    },
  },
  {
    id: "berry-dream-kitchen-1-1-pano",
    world: "Berry Dream Kitchen",
    title: "Berry Dream Kitchen 1.1-pano",
    url: import.meta.env.BASE_URL + "splats/Berry%20Dream%20Kitchen%201-1-pano.spz",
    spawn: {
      position: [-0.02, 1.36, 0.72],
      quaternion: [-0.048, 0.014, 0.001, 0.999],
    },
  },
  
{
    id: "twinkle-butterfly-patio-1-1004",
    world: "Twinkle Butterfly Patio",
    title: "Twinkle Butterfly Patio 1.1-1004",
    url: import.meta.env.BASE_URL + "splats/Twinkle%20Butterfly%20Patio%201-1-1004.spz",
    spawn: {
      position: [-0.35, 1.56, 1.23],
      quaternion: [-0.001, -0.035, 0.001, 0.999],
    },
  },
  
  {
    id: "twinkle-butterfly-patio-1-1",
    world: "Twinkle Butterfly Patio",
    title: "Twinkle Butterfly Patio 1.1",
    url: import.meta.env.BASE_URL + "splats/Twinkle%20Butterfly%20Patio%201-1.spz",
    spawn: {
      position: [-0.35, 1.56, 1.23],
      quaternion: [-0.001, -0.035, 0.001, 0.999],
    },
  },
  {
    id: "twinkle-butterfly-patio-1-1-7",
    world: "Twinkle Butterfly Patio",
    title: "Twinkle Butterfly Patio 1.1-7",
    url: import.meta.env.BASE_URL + "splats/Twinkle%20Butterfly%20Patio%201-1-7.spz",
    spawn: {
      position: [-0.35, 1.56, 1.23],
      quaternion: [-0.001, -0.035, 0.001, 0.999],
    },
  },

  {
    id: "jewel-princess-bathroom-1-1",
    world: "Jewel Princess Bathroom",
    title: "Jewel Princess Bathroom 1.1",
    url: import.meta.env.BASE_URL + "splats/Jewel%20Princess%20Bathroom%201-1.spz",
    spawn: {
      position: [-0.27, 1.56, 0.08],
      quaternion: [-0.001, -0.035, 0.001, 0.999],
    },
  },
  {
    id: "jewel-princess-bathroom-1-1-E",
    world: "Jewel Princess Bathroom",
    title: "Jewel Princess Bathroom 1.1e2",
    url: import.meta.env.BASE_URL + "splats/Jewel%20Princess%20Bathroom%201-1-E.spz",
    spawn: {
      position: [-0.27, 1.56, 0.08],
      quaternion: [-0.001, -0.035, 0.001, 0.999],
    },
  },
  {
    id: "jewel-princess-bathroom-1-1-pano",
    world: "Jewel Princess Bathroom",
    title: "Jewel Princess Bathroom 1.1-pano",
    url: import.meta.env.BASE_URL + "splats/Jewel%20Princess%20Bathroom%201-1-pano.spz",
    spawn: {
      position: [-0.86, 1.61, 0.89],
      quaternion: [-0.034, -0.338, -0.011, 0.940],
    },
  },

    {
    id: "swan-lake-suite-1-1",
    world: "Swan Lake Suite",
    title: "Swan Lake Suite 1.1",
    url: import.meta.env.BASE_URL + "splats/Swan%20Lake%20Suite%201-1.spz",
    spawn: {
      position: [-0.31, 1.60, -0.75],
  quaternion: [-0.024, -0.175, -0.003, 0.984],
    },
    
  },
    {
    id: "swan-lake-suite-1-1-1004",
    world: "Swan Lake Suite",
    title: "Swan Lake Suite 1.1-1004",
    url: import.meta.env.BASE_URL + "splats/Swan%20Lake%20Suite%201-1-1004.spz",
    spawn: {
      position: [-0.31, 1.60, -0.75],
  quaternion: [-0.024, -0.175, -0.003, 0.984],
    },
  },
  {
    id: "swan-lake-suite-1-1-pano",
    world: "Swan Lake Suite",
    title: "Swan Lake Suite 1.1-pano",
    url: import.meta.env.BASE_URL + "splats/Swan%20Lake%20Suite%201-1-pano.spz",
    spawn: {
      position: [-0.93, 1.61, 0.86],
    quaternion: [-0.030, -0.268, -0.007, 0.963],
    },
  },

  {
    id: "sunkissed-sparkle-lounge-1-1",
    world: "Sunkissed Sparkle Room",
    title: "Sunkissed Sparkle Room 1.1",
    url: import.meta.env.BASE_URL + "splats/Sunkissed%20Sparkle%20Lounge%201-1.spz",
    spawn: {
      position: [-0.43, 1.51, -0.21],
      quaternion: [-0.038, -0.051, -0.001, 0.998],
    },
  },
  {
    id: "sunkissed-sparkle-lounge-1-1-E2",
    world: "Sunkissed Sparkle Room",
    title: "Sunkissed Sparkle Room 1.1e2",
    url: import.meta.env.BASE_URL + "splats/Sunkissed%20Sparkle%20Lounge%201-1-E2.spz",
    spawn: {
      position: [-0.43, 1.51, -0.21],
      quaternion: [-0.038, -0.051, -0.001, 0.998],
    },
  },
  {
    id: "sunkissed-sparkle-lounge-1-1-pano",
    world: "Sunkissed Sparkle Room",
    title: "Sunkissed Sparkle Room 1.1-pano",
    url: import.meta.env.BASE_URL + "splats/Sunkissed%20Sparkle%20Lounge%201-1-pano.spz",
    spawn: {
      position: [-0.43, 1.51, -0.21],
      quaternion: [-0.038, -0.051, -0.001, 0.998],
    },
  },
  
  {
    id: "glitter-frutiger-lounge-1-1-pano",
    world: "Glitter Hibiscus Lodge",
    title: "Glitter Hibiscus Lodge 1.1-pano",
    url: import.meta.env.BASE_URL + "splats/Glitter%20Frutiger%20Lounge%201-1-pano.spz",
    spawn: {
      position: [-0.43, 1.51, -0.21],
      quaternion: [-0.035, 0.001, 0.001, 0.999],
    },
  },

  {
    id: "glitter-frutiger-lounge-1-1",
    world: "Glitter Hibiscus Lodge",
    title: "Glitter Hibiscus Lodge 1.1",
    url: import.meta.env.BASE_URL + "splats/Glitter%20Frutiger%20Lounge%201-1.spz",
    spawn: {
      position: [-0.43, 1.51, -0.21],
      quaternion: [-0.035, 0.001, 0.001, 0.999],
    },
  },
  {
    id: "glitter-frutiger-lounge-1-1-E2",
    world: "Glitter Hibiscus Lodge",
    title: "Glitter Hibiscus Lodge 1.1e2",
    url: import.meta.env.BASE_URL + "splats/Glitter%20Frutiger%20Lounge%201-1-E2.spz",
    spawn: {
      position: [-0.43, 1.51, -0.21],
      quaternion: [-0.035, 0.001, 0.001, 0.999],
    },
  },

  {
    id: "blooming-frutiger-1-1-pano",
    world: "Flowers of our Future Club",
    title: "Flowers of our Future Club 1.1-pano",
    url: import.meta.env.BASE_URL + "splats/Blooming%20Frutiger%201-1-pano.spz",
    spawn: {
      position: [-1.00, 1.64, 1.87],
      quaternion: [-0.064, -0.142, -0.009, 0.988],
    },
  },
  {
    id: "blooming-frutiger-1-1",
    world: "Flowers of our Future Club",
    title: "Flowers of our Future Club 1.1",
    url: import.meta.env.BASE_URL + "splats/Blooming%20Frutiger%201-1.spz",
    spawn: {
      position: [-0.31, 1.32, -0.46],
      quaternion: [-0.063, 0.005, 0.001, 0.998],
    },
  },
  {
    id: "blooming-frutiger-1-1-E2",
    world: "Flowers of our Future Club",
    title: "Flowers of our Future Club 1.1e2",
    url: import.meta.env.BASE_URL + "splats/Blooming%20Frutiger%201-1-E2.spz",
    spawn: {
      position: [-0.31, 1.32, -0.46],
      quaternion: [-0.063, 0.005, 0.001, 0.998],
    },
  },
  
  {
    id: "lavender-laundry-1-1",
    world: "Lavender Laundry",
    title: "Lavender Laundry 1.1",
    url: import.meta.env.BASE_URL + "splats/Lavender%20Laundry%201-1.spz",
    spawn: {
      position: [-0.31, 1.32, -0.46],
      quaternion: [-0.063, 0.005, 0.001, 0.998],
    },
  },
  {
    id: "lavender-laundry-1-1-pano",
    world: "Lavender Laundry",
    title: "Lavender Laundry 1.1-pano",
    url: import.meta.env.BASE_URL + "splats/Lavender%20Laundry%201-1-pano.spz",
    spawn: {
      position: [-0.30, 1.45, 0.54],
      quaternion: [-0.063, 0.005, 0.001, 0.998],
    },
  },
  {
    id: "lavender-laundry-1-1-E2",
    world: "Lavender Laundry",
    title: "Lavender Laundry 1.1e2",
    url: import.meta.env.BASE_URL + "splats/Lavender%20Laundry%201-1-E2.spz",
    spawn: {
      position: [-0.30, 1.45, 0.54],
      quaternion: [-0.063, 0.005, 0.001, 0.998],
    },
  },

  {
    id: "pink-cherry-plane-1-1-pano",
    world: "Pink Cherry Plane",
    title: "Pink Cherry Plane 1.1-pano",
    url: import.meta.env.BASE_URL + "splats/Pink%20Cherry%20Plane%201-1-pano.spz",
    spawn: {
      position: [-0.21, 1.57, 0.82],
      quaternion: [-0.007, -0.115, -0.000, 0.993],
    },
  },
  {
    id: "pink-cherry-plane-1-1",
    world: "Pink Cherry Plane",
    title: "Pink Cherry Plane 1.1",
    url: import.meta.env.BASE_URL + "splats/Pink%20Cherry%20Plane%201-1.spz",
    spawn: {
      position: [-0.21, 1.57, 0.82],
      quaternion: [-0.007, -0.115, -0.000, 0.993],
    },
  },
  {
    id: "pink-cherry-plane-1-0",
    world: "Pink Cherry Plane",
    title: "Pink Cherry Plane 1.0",
    url: import.meta.env.BASE_URL + "splats/Pink%20Cherry%20Plane%201-0.spz",
    spawn: {
      position: [-0.21, 1.57, 0.82],
      quaternion: [-0.007, -0.115, -0.000, 0.993],
    },
  },

  {
    id: "angelic-quartz-chamber-1-1",
    world: "Angelic Quartz Chamber",
    title: "Angelic Quartz Chamber 1.1",
    url: import.meta.env.BASE_URL + "splats/Angelic%20Quartz%20Chamber%201-1.spz",
    spawn: {
      position: [-0.45, 0.91, 0.48],
      quaternion: [-0.026, 0.008, 0.001, 1.000],
    },
  },
  {
    id: "angelic-quartz-chamber-1-1-pano",
    world: "Angelic Quartz Chamber",
    title: "Angelic Quartz Chamber 1.1-pano",
    url: import.meta.env.BASE_URL + "splats/Angelic%20Quartz%20Chamber%201-1-pano.spz",
    spawn: {
      position: [-0.51, 0.93, 0.92],
      quaternion: [-0.035, 0.045, 0.002, 0.998],
    },
  },
  {
    id: "angelic-quartz-chamber-1-1-pano-E2",
    world: "Angelic Quartz Chamber",
    title: "Angelic Quartz Chamber 1.1e2",
    url: import.meta.env.BASE_URL + "splats/Angelic%20Quartz%20Chamber%201-1-pano-E2.spz",
    spawn: {
      position: [-0.51, 0.93, 0.92],
      quaternion: [-0.035, 0.045, 0.002, 0.998],
    },
  },

  {
    id: "frutiger-rainbow-cafe-1-1-API",
    world: "Frutiger Rainbow Cafe",
    title: "Frutiger Rainbow Cafe 1.1-API",
    url: import.meta.env.BASE_URL + "splats/Frutiger%20Rainbow%20Cafe%201-1-API.spz",
    spawn: {
      position: [-0.48, 1.56, 0.12],
      quaternion: [-0.028, -0.205, -0.005, 0.978],
    },
  },
  {
    id: "frutiger-rainbow-cafe-1-1",
    world: "Frutiger Rainbow Cafe",
    title: "Frutiger Rainbow Cafe 1.1",
    url: import.meta.env.BASE_URL + "splats/Frutiger%20Rainbow%20Cafe%201-1.spz",
    spawn: {
      position: [-0.48, 1.56, 0.12],
      quaternion: [-0.028, -0.205, -0.005, 0.978],
    },
    // autoAlignFloor: true,        // snap collider's lowest vertex to (spawn.y − 1.6),
    // colliderOffset: [x, y, z], // optional fine-tune on top, if needed
  },
  {
    id: "frutiger-rainbow-cafe-1-1-pano",
    world: "Frutiger Rainbow Cafe",
    title: "Frutiger Rainbow Cafe 1.1-pano",
    url: import.meta.env.BASE_URL + "splats/Frutiger%20Rainbow%20Cafe%201-1-pano.spz",
    spawn: {
      position: [-0.48, 1.56, 0.12],
      quaternion: [-0.028, -0.205, -0.005, 0.978],
    },
  },
  

  {
    id: "lovecore-patio-1-1",
    world: "Random",
    title: "Lovecore Patio",
    url: import.meta.env.BASE_URL + "splats/Lovecore%20Patio%201-1.spz",
    spawn: {
      position: [-0.88, 1.63, 0.89],
      quaternion: [-0.013, 0.016, 0.001, 1.000],
    },
  },
  
  {
    id: "lavender-patio-1-1",
    world: "Random",
    title: "Enchanting Lavender Patio",
    url: import.meta.env.BASE_URL + "splats/Enchanting%20Lavender%20Patio%201-1.spz",
    spawn: {
      position: [-0.46, 1.30, -0.06],
      quaternion: [0.028, -0.178, 0.006, 0.984],
    },
  },

  {   
    id: "ocean-breeze-office",
    world: "Random",
    title: "Ocean Breeze Office",
    url: import.meta.env.BASE_URL + "splats/Random-OceanBreezeOffice.spz",
    spawn: {
      position: [-0.07, 1.71, 2.13],
      quaternion: [-0.026, -0.063, -0.001, 0.998],    
    },
  },

  {   
    id: "fairy-kitchen",
    world: "Random",
    title: "Whimsical Fairy Kitchen",
    url: import.meta.env.BASE_URL + "splats/Random-FairyKitchen.spz",
    spawn: {
      position: [0.03, 1.38, -1.56],
      quaternion: [0.056, -0.007, 0.001, 0.998],
    },
  },

  {   
    id: "pearl-wings-kitchen",
    world: "Random",
    title: "Pearlescent Flutter Kitchen",
    url: import.meta.env.BASE_URL + "splats/Random-Pearlescent Wings Kitchen.spz",
    spawn: {
      position: [0.00, 1.17, 0.30],
      quaternion: [0.014, -0.027, 0.001, 1.000],
    },
  },

  {
    id: "lovely-melody-interior",
    world: "Random",
    title: "Lovely Melody Interior",
    url: import.meta.env.BASE_URL + "splats/Random-AC-lovely-melody-interior.spz",
    objectTags: ["ac"],
    hideInPicker: true,
    spawn: {
      position: [0.10, 2.06, 0.16],
      quaternion: [-0.095, 0.169, 0.017, 0.981],
    },
    // Doorway portals stand in the two hallway openings. Positions are from
    // logPose() walking up to each door (camera-eye height ≈ 1.5), so each
    // portal sits roughly where the user was looking — tune with HMR. The
    // rotationY value was derived as logged-yaw + π so the portal faces back
    // toward the player. Sizes are conservative; bump width/height if doors
    // are larger in the splat.
    portals: [
      {
        id: "melody-to-pink",
        target: "lovely-pink-interior",
        // Logged: position [0.02, 1.53, -4.11], quaternion ≈ identity → yaw ≈ 0
        // → portal yaw ≈ π. Y dropped 0.3m below logged eye since the door
        // center sits below standing eye height; tune as needed.
        position: [0.15, 1.23, -4.75],
        rotationY: Math.PI,
        loaderText: "‧₊˚.entering pink interior₊˚⊹♡",
        render: {
          kind: "doorway",
          width: 1.9,
          height: 2.5,
          radius: 0.18,
          colorA: "#ff9bce",
          colorB: "#ffd5ec",
        },
      },
      {
        id: "melody-to-mint",
        target: "lovely-mint-interior",
        // Logged: position [3.27, 1.45, -3.08], quaternion ≈ [-0.015, -0.765,
        // -0.017, 0.643] → yaw ≈ -1.74 → portal yaw ≈ 1.40.
        position: [4.4, 1.15, -2.6],
        rotationY: 1.5,
        loaderText: "‧₊˚.entering mint interior ⋆˚꩜｡",
        render: {
          kind: "doorway",
          width: 1.9,
          height: 2.5,
          radius: 0.18,
          colorA: "#9beed1",
          colorB: "#d5f5e8",
        },
      },
      {
        id: "melody-to-ac",
        target: "animal-crossing",
        // Exit back outside. Circular lavender return (same style as the room
        // returns), placed ~1m behind the spawn (spawn yaw ≈ 0.34) with y dropped
        // 0.3m to door center. TUNE: stand in the real exit, run window.logPose().
        position: [-0.3, 1.76, 1.1],
        rotationY: 0.34,
        loaderText: "ೃ⁀➷ back to Animal Crossing ࿐ೃ.",
        render: {
          kind: "doorway",
          width: 1,
          height: 1,
          radius: 0.5,
          colorA: "#cba6e2",
          colorB: "#e6d6f5",
        },
      },
    ],
  },
  {
    id: "lovely-pink-interior",
    world: "Random",
    title: "Lovely Pink Interior",
    url: import.meta.env.BASE_URL + "splats/Random-AC-lovely-pink-interior.spz",
    objectTags: ["ac"],
    hideInPicker: true,
    spawn: {
      position: [0.50, 1.40, 0.81],
      quaternion: [-0.044, 0.104, 0.005, 0.994],
    },
    // Return portal ~1m behind the spawn spot. Derived: spawn fwd ≈
    // (-0.21, -0.09, -0.97) → back ≈ (+0.21, +0.09, +0.97); position =
    // spawn + back*1.0 with y dropped 0.3m to door center; rotationY =
    // spawn yaw (0.21), which makes the plane face the player after they
    // turn around. Tune position[2] tighter/looser if 1m clips a wall.
    portals: [
      {
        id: "pink-to-melody",
        target: "lovely-melody-interior",
        position: [0.71, 1.10, 1.78],
        rotationY: 0.21,
        loaderText: "⋆.˚returning to melody room ⋆˖࿔ ",
        render: {
          kind: "doorway",
          width: 1,
          height: 1,
          radius: 0.5,
          // Lavender — distinct from the pink/mint front-side doors so the
          // return portal reads as a different destination.
          colorA: "#cba6e2",
          colorB: "#e6d6f5",
        },
      },
    ],
  },
  {
    id: "lovely-mint-interior",
    world: "Random",
    title: "Lovely Mint Interior",
    url: import.meta.env.BASE_URL + "splats/Random-AC-lovely-mint-interior.spz",
    objectTags: ["ac"],
    hideInPicker: true,
    spawn: {
      position: [0.50, 1.40, 0.81],
      quaternion: [-0.044, 0.104, 0.005, 0.994],
    },
    // Same return-portal geometry as the pink interior — both share a spawn.
    portals: [
      {
        id: "mint-to-melody",
        target: "lovely-melody-interior",
        position: [0.71, 1.10, 1.78],
        rotationY: 0.21,
        loaderText: "⋆.˚returning to melody room ⋆˖࿔ ࣪",
        render: {
          kind: "doorway",
          width: 1,
          height: 1,
          radius: 0.5,
          colorA: "#cba6e2",
          colorB: "#e6d6f5",
        },
      },
    ],
  },

  {
    id: "animal-crossing",
    world: "Random",
    title: "Animal Crossing",
    url: import.meta.env.BASE_URL + "splats/Random-AnimalCrossing.spz",
    objectTags: ["ac"],
    spawn: {
      position: [1.51, 3.58, -3.84],
      quaternion: [-0.055, 0.198, 0.012, 0.979],
    },
    portals: [
      {
        id: "ac-to-observatory",
        target: "ac-observatory",
        // TUNE: feet-on-ground. Logged camera pose was [-0.76, 3.98, -6.77]
        // (eye height in AC's scaled space); subtract ~1.6 × 2.3 ≈ 3.6 for
        // feet. Use window.logPortalSpot(3.6) in the console for live tuning.
        position: [-3.25, 2.1, -8.82],
        rotationY: 0.7,
        animation: "bob",
        // Pink glowing orb (sparkles + 🌟 inside) floating above her head,
        // instead of the flat ☆ speech bubble.
        bubble: { kind: "orb", glyph: "🌟", colorA: "#ff7ec0", colorB: "#ffd6ee", offsetY: 0.5 },
        loaderText: "˚.⋆⊹☆ entering the observatory ☆⊹⋆.˚",
        render: {
          kind: "glb",
          url: import.meta.env.BASE_URL + "characters/celeste_-_animal_crossing_new_horizons.glb",
          scale: 0.075, // TUNE
        },
      },
      {
        id: "ac-to-melody",
        target: "lovely-melody-interior",
        // Just behind Celeste (who stands at [-1.54, 1.75, -10.82]), pushed
        // ~2.5m further along the spawn→Celeste direction so the house reads as
        // set back behind her. ALL THREE are placeholders — see the tuning note
        // in the response / below. To retune: in AC, run
        // window.logPortalSpot(3.6) in the console where you want the house — it
        // prints a feet-on-ground position AND a rotationY already turned to
        // face you. Paste both here.
        position: [-0.65, -0.8, -15.4], // pushed back behind Celeste + lowered
        rotationY: 0.18, // = 3.455 − π, flipped 180° so its front faces you
        animation: "none", // a bobbing house looks wrong — keep it planted
        bubble: false, // no ♡ speech bubble over a building
        loaderText: "·˚*୨୧ entering Celeste's home ୨୧*˚·",
        render: {
          kind: "glb",
          url: import.meta.env.BASE_URL + "characters/ac-house2.glb",
          // Raw model is HUGE (~228 units wide) and centered on its own origin
          // (extends ~79 units below it), so scale 1.0 buried the camera inside
          // it. scale 0.03 → ~6.8 units wide / ~4.8 tall (a person here is ~3.6
          // units, so this reads as a small building). TUNE the size from here.
          scale: 0.0475,
          // Lifts the base to the portal's ground y, since the origin is the
          // model's center. Keep this ≈ 79.3 × scale whenever you change scale,
          // or just nudge it until the base sits on the ground.
          offsetY: 2.38,
        },
      },
      {
        id: "ac-to-mushroom-forest",
        target: "mushroom-forest",
        // The house you walk into to reach the mushroom forest. Derived from a
        // logPose() taken standing at [6.94, 3.77, -4.47] facing yaw ≈ -1.445:
        // pushed ~5.5m along that forward vector (0.99, -0.13) so it sits in
        // front of you, and turned to face back (rotationY = yaw + π ≈ 1.697).
        // TUNE: stand where you want it, run window.logPortalSpot(1.9), paste
        // both the position and rotationY it prints.
        position: [10.80, 3.10, -4.75],
        rotationY: -1.400,
        animation: "none", // a bobbing house looks wrong — keep it planted
        bubble: false, // no ♡ speech bubble over a building
        loaderText: "‧₊˚ ⊹ entering the mystical mushroom room ⊹ ˚₊‧",
        render: {
          kind: "glb",
          url: import.meta.env.BASE_URL + "props/ac-house-notreefence.glb",
          // Raw GLB assembles to ~0.15 units wide (an FBX cm→m 0.01 scale is
          // baked into its node tree), so scale 50 → ~7.4 wide / ~2.4 tall /
          // ~6 deep. Its origin sits at the model's base, so no offsetY is
          // needed — position[1] is the ground the house stands on. TUNE size
          // from here; bump position[1] if the base floats or sinks.
          scale: 50,
          // Boost color vividness — the raw textures read washed-out next to the
          // splat. 1 = unchanged, >1 = more saturated. TUNE to taste.
          saturate: 1.4,
        },
      },
      {
        id: "ac-to-sakura-spa",
        target: "ac-sakura-spa",
        // AC house models face +Z, so rotationY = yaw (not yaw+π) turns the front
        // toward you. TUNE: window.portal("ac-to-sakura-spa", { x, y, z, ry, s }).
        position: [-12.00, 2.00, 11.00],
        rotationY: 1.845,
        animation: "none",
        bubble: false,
        loaderText: "‧₊˚ ✿ entering the sakura spa ✿ ˚₊‧",
        render: {
          kind: "glb",
          url: import.meta.env.BASE_URL + "props/zen-house.glb",
          // Assembles to ~1.46 units wide; scale 4.8 → ~7 wide. offsetY: 0.
          // Re-converted OPAQUE (--no-alpha): wallmax_00.png has an embedded
          // alpha channel whose transparent pixels are the door/window/arch
          // regions — applied as a MASK cutout it punched see-through holes in
          // the front wall (the "open archway"). The source .mtl is opaque, so
          // don't re-run the converter with alpha on this model. TUNE size with window.portal.
          scale: 4.8,
          offsetY: 0,
        },
      },
      {
        id: "ac-to-gullivers-office",
        target: "ac-gullivers-office",
        // Tortimer shack. From a logPose() at [6.77, 3.60, 3.23] facing yaw ≈
        // -1.189: pushed ~5m forward. AC house models face +Z, so rotationY = yaw
        // (not yaw+π) turns the front toward you. Re-origined GLB grounds at
        // offsetY: 0 (base at origin). TUNE: window.portal("ac-to-gullivers-office", …).
        position: [10.00, 0.70, 3.75],
        rotationY: -1.300,
        animation: "none",
        bubble: false,
        loaderText: "‧₊˚ ⊹ entering Gulliver's office ⊹ ˚₊‧",
        render: {
          kind: "glb",
          url: import.meta.env.BASE_URL + "props/tortimer-shack.glb",
          // Assembles to ~2.2 units wide; scale 3.2 → ~7 wide. Re-origined so the
          // base sits at the model origin → offsetY: 0. TUNE with window.portal.
          scale: 2.2,
          offsetY: 0,
        },
      },
    ],
    // Static, non-interactive props (no portal trigger, no bubble). All
    // transforms live on the outer group — position is world coords, scale is
    // uniform. These two are TEST placements near Celeste; tune live in the
    // console with window.deco(i, { x, y, z, ry, s }) then paste the logged
    // values back here. Celeste stands at ≈[-1.54, 1.75, -10.82].
    decorations: [
      {
        id: "flower-arch",
        url: import.meta.env.BASE_URL + "props/flower-arch.glb",
        // Raw GLB ≈95 units wide / 82 tall, so scale ~0.06 → ~5 units (a person
        // here is ~3.6). TUNE.
        position: [-3.35, 1.50, -9.00],
        rotationY: 0.6,
        scale: 0.0550,
      },

      // --- Trees ---------------------------------------------------------
      // All use `ground: true` (loader re-centers each GLB on its XZ footprint
      // and drops the base to position[1]) so `position` is simply the trunk
      // base on the ground and `scale` grows it from there. The XZ comes
      // straight from each logPose() spot you stood on; position[1] is your
      // logged eye-Y minus ~0.7 (rough eye→ground in AC's scale, same as the
      // mushroom house grounding). The terrain is hilly, so nudge each Y (and
      // scale) live with window.deco(i, { x, y, z, ry, s }) and paste back.
      //
      // Native heights at scale 1: palm 1.79, apple 457, pine 1.90, sakura 0.05
      // — that's why the scales differ wildly. Palms/pines sit ~2.8 units tall;
      // the sakuras were hand-tuned much larger (and some flipped upright via
      // rotationX/Z) with the prop editor, hence their varied scales. The sakura
      // + apple use alpha-BLEND foliage atlases, so they carry `alphaTest` to
      // turn the leaves into depth-writing cutouts (otherwise the leaf cards
      // smear over the houses/each other).
      {
        id: "palm-1",
        url: import.meta.env.BASE_URL + "props/animal_crossing_coconut_palm_tree.glb",
        position: [12.02, 2.4, -0.04],
        rotationX: 3.142,
        rotationY: -1.477,
        rotationZ: 3.142,
        scale: 1.8449,
        ground: true,
      },
      {
        id: "palm-2",
        url: import.meta.env.BASE_URL + "props/animal_crossing_coconut_palm_tree.glb",
        position: [10.85, 2.28, 1.13],
        rotationY: 0.8,
        scale: 1.6,
        ground: true,
      },
      {
        id: "palm-3",
        url: import.meta.env.BASE_URL + "props/animal_crossing_coconut_palm_tree.glb",
        position: [13.03, 2.43, 2.63],
        rotationY: 0.8,
        scale: 1.6,
        ground: true,
      },
      {
        id: "palm-4",
        url: import.meta.env.BASE_URL + "props/animal_crossing_coconut_palm_tree.glb",
        position: [7.17, 1.43, 1.47],
        rotationY: -0.451,
        scale: 1.8449,
        ground: true,
      },
      {
        id: "palm-5",
        url: import.meta.env.BASE_URL + "props/animal_crossing_coconut_palm_tree.glb",
        position: [9.08, 1.43, 6.93],
        rotationX: 3.142,
        rotationY: -1.53,
        rotationZ: 3.142,
        scale: 1.8449,
        ground: true,
      },
      {
        id: "apple-1",
        url: import.meta.env.BASE_URL + "props/animal_crossing_apple_tree.glb",
        position: [10.98, 2.94, -7.33],
        rotationY: -1.157,
        scale: 0.0073,
        ground: true,
        alphaTest: 0.4,
      },
      {
        id: "apple-2",
        url: import.meta.env.BASE_URL + "props/animal_crossing_apple_tree.glb",
        position: [12.8, 2.88, -9.91],
        rotationY: -1.06,
        scale: 0.0085,
        ground: true,
        alphaTest: 0.4,
      },
      {
        id: "sakura-1",
        url: import.meta.env.BASE_URL + "props/sakura-tree.glb",
        position: [-11.96, 3.01, 7.07],
        rotationX: 3.142,
        rotationY: -1.339,
        rotationZ: 3.142,
        scale: 64.0042,
        ground: true,
        alphaTest: 0.5,
      },
      {
        id: "sakura-2",
        url: import.meta.env.BASE_URL + "props/sakura-tree.glb",
        position: [-9.79, 2.67, 14.31],
        rotationX: 0.044,
        rotationY: -0.557,
        rotationZ: -0.006,
        scale: 70.1424,
        ground: true,
        alphaTest: 0.5,
      },
      // A loose grove along ~Z, hand-placed with the prop editor.
      {
        id: "sakura-row-1",
        url: import.meta.env.BASE_URL + "props/sakura-tree.glb",
        position: [-21.5, 7.22, 11.95],
        rotationY: -1.259,
        scale: 98.2631,
        ground: true,
        alphaTest: 0.5,
      },
      {
        id: "sakura-row-2",
        url: import.meta.env.BASE_URL + "props/sakura-tree.glb",
        position: [-19.72, 7.31, 14.63],
        rotationY: 2.0,
        scale: 93.0495,
        ground: true,
        alphaTest: 0.5,
      },
      {
        id: "sakura-row-3",
        url: import.meta.env.BASE_URL + "props/sakura-tree.glb",
        position: [-17.33, 5.71, 17.65],
        rotationY: -0.867,
        scale: 90.29,
        ground: true,
        alphaTest: 0.5,
      },
      // Duplicates placed live with the prop editor's `d` key (renamed from the
      // editor's auto "-copy" ids). All share the sakura GLB + foliage cutout.
      {
        id: "sakura-3",
        url: import.meta.env.BASE_URL + "props/sakura-tree.glb",
        position: [-22.74, 6.29, 6.82],
        rotationX: 2.868,
        rotationY: -1.441,
        rotationZ: 2.761,
        scale: 98.2631,
        ground: true,
        alphaTest: 0.5,
      },
      {
        id: "sakura-4",
        url: import.meta.env.BASE_URL + "props/sakura-tree.glb",
        position: [-17.95, 5.11, 4.84],
        rotationX: 2.868,
        rotationY: -1.441,
        rotationZ: 2.761,
        scale: 98.2631,
        ground: true,
        alphaTest: 0.5,
      },
      {
        id: "sakura-5",
        url: import.meta.env.BASE_URL + "props/sakura-tree.glb",
        position: [-12.83, 2.9, 18.09],
        rotationY: -0.867,
        scale: 90.29,
        ground: true,
        alphaTest: 0.5,
      },
      {
        id: "sakura-6",
        url: import.meta.env.BASE_URL + "props/sakura-tree.glb",
        position: [-14.11, 3.41, 4.07],
        rotationX: -3.043,
        rotationY: -1.339,
        rotationZ: 3.142,
        scale: 64.0042,
        ground: true,
        alphaTest: 0.5,
      },
      {
        id: "sakura-7",
        url: import.meta.env.BASE_URL + "props/sakura-tree.glb",
        position: [-12.62, 3.44, 21.02],
        rotationY: -0.681,
        scale: 81.4906,
        ground: true,
        alphaTest: 0.5,
      },
      {
        id: "pine-1",
        url: import.meta.env.BASE_URL + "props/animal_crossing_pine_tree.glb",
        position: [4.98, 1.71, -14.38],
        scale: 2.5842,
        ground: true,
      },
      {
        id: "pine-2",
        url: import.meta.env.BASE_URL + "props/animal_crossing_pine_tree.glb",
        position: [11.35, 2.89, -2.59],
        rotationY: 0.5,
        scale: 1.5062,
        ground: true,
      },
      {
        id: "pine-3",
        url: import.meta.env.BASE_URL + "props/animal_crossing_pine_tree.glb",
        position: [2.92, 1.76, -15.97],
        scale: 2.5842,
        ground: true,
      },
      {
        id: "pine-4",
        url: import.meta.env.BASE_URL + "props/animal_crossing_pine_tree.glb",
        position: [-3.54, 1.92, -13.74],
        scale: 2.5842,
        ground: true,
      },
      {
        id: "pine-5",
        url: import.meta.env.BASE_URL + "props/animal_crossing_pine_tree.glb",
        position: [2.06, 2.24, -17.82],
        scale: 2.5842,
        ground: true,
      },
      {
        id: "pine-6",
        url: import.meta.env.BASE_URL + "props/animal_crossing_pine_tree.glb",
        position: [-6.16, 2.24, -14.3],
        scale: 2.5842,
        ground: true,
      },
      {
        id: "pine-7",
        url: import.meta.env.BASE_URL + "props/animal_crossing_pine_tree.glb",
        position: [1.49, 1.76, -12.72],
        scale: 2.5842,
        ground: true,
      },
      {
        id: "pine-8",
        url: import.meta.env.BASE_URL + "props/animal_crossing_pine_tree.glb",
        position: [10.51, 2.89, -9.37],
        rotationY: 0.5,
        scale: 1.5062,
        ground: true,
      },
    ],
  },

  {
    id: "ac-observatory",
    world: "Random",
    title: "AC Observatory",
    url: import.meta.env.BASE_URL + "splats/Random-AC-observatory.spz",
    objectTags: ["ac"],
    // Reached only by walking into / clicking the AC house — keep it out of the
    // picker dropdown and the single/double-trigger cycle (same as the lovely
    // interiors above).
    hideInPicker: true,
    // TUNE — placeholder spawn. Walk to where you want to start inside the
    // observatory, run window.logPose(), and paste its position + quaternion.
    spawn: {
      position: [1.51, 1.46, 1.33],
      quaternion: [-0.002, 0.274, 0.001, 0.962],
    },
    // Two doorways out to the witchy-coven and spooky rooms. Positions are from
    // logPose() taken in the observatory facing each door; y dropped ~0.3m from
    // logged eye height to the door center, and rotationY = logged-yaw + π so
    // each plane faces back toward the player. TUNE with HMR if a door sits off.
    portals: [
      {
        id: "observatory-to-witchy",
        target: "ac-witchy-coven",
        // Logged: [0.00, 1.50, -5.12], quaternion identity → yaw 0 → rotationY π.
        position: [0.15, 1.2, -6.5],
        rotationY: Math.PI,
        loaderText: "‧₊˚.entering the witchy coven ⋆˚꩜｡",
        render: {
          kind: "doorway",
          width: 2.2,
          height: 2.5,
          radius: 0.18,
          colorA: "#7a5ded",
          colorB: "#c098ff",
        },
      },
      {
        id: "observatory-to-spooky",
        target: "ac-spooky",
        // Logged: [-2.85, 1.38, -0.43], quaternion ≈ [-0.018, 0.802, 0.024,
        // 0.597] → yaw ≈ 1.863 → rotationY = yaw + π ≈ 5.00.
        position: [-3.85, 1.06, -0.6],
        rotationY: 5.0,
        loaderText: "·˚*🎃 entering the spooky room 🎃*˚·",
        render: {
          kind: "doorway",
          width: 2.3,
          height: 2.5,
          radius: 0.18,
          colorA: "#4dfff6",
          colorB: "#ad9bff",
        },
      },
      {
        id: "observatory-to-ac",
        target: "animal-crossing",
        // Exit back outside. Circular lavender return (same style as the room
        // returns), placed ~1m behind the spawn (spawn yaw ≈ 0.55) with y dropped
        // 0.3m to door center. TUNE: stand in the real exit, run window.logPose().
        position: [1.04, 1.75, 3],
        rotationY: 0.0,
        loaderText: "ೃ⁀➷ back to Animal Crossing ࿐ೃ.",
        render: {
          kind: "doorway",
          width: 1,
          height: 1,
          radius: 0.5,
          colorA: "#cba6e2",
          colorB: "#e6d6f5",
        },
      },
    ],
  },

  {
    id: "ac-witchy-coven",
    world: "Random",
    title: "AC Witchy Coven",
    url: import.meta.env.BASE_URL + "splats/Random-AC-witchy-coven.spz",
    objectTags: ["ac"],
    hideInPicker: true,
    // Spawn from your in-room logPose(). Facing ≈ -Z (near-identity quaternion).
    spawn: {
      position: [0.0, 1.5, 1.65],
      quaternion: [-0.005, 0.014, 0.0, 1.0],
    },
    // Return portal — same style/behavior as the pink & mint interiors: a small
    // circular lavender doorway placed ~1m behind the spawn (you face -Z, so
    // behind is +Z) with y dropped 0.3m to door center; rotationY = spawn yaw so
    // it faces you after you turn around. TUNE position/rotationY with HMR.
    portals: [
      {
        id: "witchy-to-observatory",
        target: "ac-observatory",
        position: [0.0, 1.2, 2.65],
        rotationY: 0,
        loaderText: "⋆.˚returning to the observatory ⋆˖࿔",
        render: {
          kind: "doorway",
          width: 1,
          height: 1,
          radius: 0.5,
          colorA: "#cba6e2",
          colorB: "#e6d6f5",
        },
      },
    ],
  },

  {
    id: "ac-spooky",
    world: "Random",
    title: "AC Spooky Room",
    url: import.meta.env.BASE_URL + "splats/Random-AC-spooky.spz",
    objectTags: ["ac"],
    hideInPicker: true,
    // Spawn from your in-room logPose(). Facing yaw ≈ -0.39 rad.
    spawn: {
      position: [-0.05, 1.61, 0.52],
      quaternion: [-0.016, -0.194, -0.003, 0.981],
    },
    // Return portal — same circular lavender doorway as the pink/mint interiors
    // (see witchy-coven note). ~1m behind the spawn along your back vector (spawn
    // yaw ≈ -0.39), y dropped 0.3m to door center; rotationY = spawn yaw.
    portals: [
      {
        id: "spooky-to-witchy",
        target: "ac-witchy-coven",
        // A second doorway in the spooky room straight through to the witchy
        // coven (so the two themed rooms connect directly, not only via the
        // observatory). PLACEHOLDER — placed ~3m in front of the spawn
        // ([-0.05, 1.61, 0.52] facing yaw ≈ -0.39), y dropped ~0.4m to door
        // center, rotationY = yaw + π so it faces back at you. TUNE: stand in
        // front of the real opening, run window.logPose() (or
        // window.portal("spooky-to-witchy", { x, y, z, ry, w, h })).
        position: [0.40, 1, -6],
        rotationY: 3.162,
        loaderText: "‧₊˚.entering the witchy coven ⋆˚꩜｡",
        render: {
          kind: "doorway",
          width: 2,
          height: 2,
          radius: 0.18,
          colorA: "#7a5ded",
          colorB: "#c098ff",
        },
      },
      {
        id: "spooky-to-observatory",
        target: "ac-observatory",
        position: [-0.43, 1.31, 1.44],
        rotationY: -0.39,
        loaderText: "⋆.˚returning to the observatory ⋆˖࿔",
        render: {
          kind: "doorway",
          width: 1,
          height: 1,
          radius: 0.5,
          colorA: "#cba6e2",
          colorB: "#e6d6f5",
        },
      },
    ],
  },

  {
    // Reached by walking into the new house in Animal Crossing
    // (ac-to-mushroom-forest). Like the other AC interiors, it's out of the
    // picker and the cycle — portal-only.
    id: "mushroom-forest",
    world: "Random",
    title: "Mystical Mushroom Forest",
    url: import.meta.env.BASE_URL + "splats/Random-AC-mystical-mushroom-forest.spz",
    objectTags: ["ac"],
    hideInPicker: true,
    // TUNE — placeholder spawn. Walk to where you want to arrive, run
    // window.logPose(), and paste its position + quaternion here.
    spawn: {
      position: [1.00, 1.65, 1.91],
      quaternion: [-0.033, 0.238, 0.008, 0.971],
    },
    portals: [
      {
        id: "mushroom-to-woodland",
        target: "woodland-interior",
        // The one doorway through to the woodland interior. TUNE: stand facing
        // the real doorway, run window.logPose(), drop y ~0.3m to door center,
        // and set rotationY = logged-yaw + π so the plane faces back at you.
        position: [0.055, 1, -3.5],
        rotationY: Math.PI,
        loaderText: "‧₊˚.into the woodland room⋆˚꩜｡",
        render: {
          kind: "doorway",
          width: 1.9,
          height: 2.1,
          radius: 0.18,
          colorA: "#8fd68a",
          colorB: "#d9f5c8",
        },
      },
      {
        id: "mushroom-to-ac",
        target: "animal-crossing",
        // Return back outside to Animal Crossing — small circular lavender
        // doorway ~1m behind the spawn ([1.00, 1.65, 1.91], yaw 0.481), y dropped
        // 0.3m to door center; rotationY = spawn yaw so it faces you after you
        // turn around. (Where you LAND in AC is decided by the return-pose
        // capture in world.js, not here.) TUNE: stand at the exit, logPose().
        position: [1.46, 1.35, 2.8],
        rotationY: 0.481,
        loaderText: "ೃ⁀➷ back to Animal Crossing ࿐ೃ.",
        render: {
          kind: "doorway",
          width: 1,
          height: 1,
          radius: 0.5,
          colorA: "#cba6e2",
          colorB: "#e6d6f5",
        },
      },
    ],
  },

  {
    // Reached only via the doorway in the mushroom forest. Portal-only.
    id: "woodland-interior",
    world: "Random",
    title: "Woodland Interior",
    url: import.meta.env.BASE_URL + "splats/Random-AC-woodland-interior.spz",
    objectTags: ["ac"],
    hideInPicker: true,
    // TUNE — placeholder spawn. Walk to where you want to arrive, run
    // window.logPose(), and paste its position + quaternion here.
    spawn: {
      position: [-0.49, 1.49, 2.11],
      quaternion: [-0.025, -0.026, -0.001, 0.999],
    },
    portals: [
      {
        id: "woodland-to-mushroom",
        target: "mushroom-forest",
        // Return ~1m behind the spawn ([-0.49, 1.49, 2.11], yaw -0.052) to the
        // mushroom forest, y dropped 0.3m to door center; rotationY = spawn yaw.
        // TUNE with logPose.
        position: [-0.54, 1.19, 3.11],
        rotationY: -0.052,
        loaderText: "⋆.˚returning to the mushroom forest ⋆˖࿔",
        render: {
          kind: "doorway",
          width: 1,
          height: 1,
          radius: 0.5,
          colorA: "#cba6e2",
          colorB: "#e6d6f5",
        },
      },
    ],
  },

  {
    // Reached by entering the Zen house in Animal Crossing (ac-to-sakura-spa).
    // Portal-only, like the other AC interiors.
    id: "ac-sakura-spa",
    world: "Random",
    title: "Sakura Spa",
    url: import.meta.env.BASE_URL + "splats/Random-AC-sakura-spa.spz",
    objectTags: ["ac"],
    hideInPicker: true,
    // TUNE — placeholder spawn. Walk to where you want to arrive, run
    // window.logPose(), and paste its position + quaternion here.
    spawn: {
      position: [0.00, 1.50, 1.44],
      quaternion: [0.000, 0.000, 0.000, 1.000],
    },
    portals: [
      {
        id: "sakura-to-onsen",
        target: "ac-onsen-garden",
        // The one doorway through to the onsen garden. TUNE: stand facing the
        // real doorway, run window.logPose(), drop y ~0.3m to door center, and
        // set rotationY = logged-yaw + π so the plane faces back at you. (Or use
        // window.portal("sakura-to-onsen", { x, y, z, ry, w, h }).)
        position: [0.45, 0.50, -9.00],
        rotationY: Math.PI,
        loaderText: "‧₊˚.into the onsen garden ⋆˚꩜｡",
        render: {
          kind: "doorway",
          width: 2,
          height: 2,
          radius: 1,
          colorA: "#ffb7e8",
          colorB: "#ffe0ee",
        },
      },
      {
        id: "sakura-to-ac",
        target: "animal-crossing",
        // Return outside to Animal Crossing. Where you LAND in AC is set by the
        // return-pose capture in world.js (back at the Zen house); this just
        // places the doorway ~1m behind the spawn. TUNE with logPose.
        position: [0, 1.2, 2.5],
        rotationY: 0,
        loaderText: "ೃ⁀➷ back to Animal Crossing ࿐ೃ.",
        render: {
          kind: "doorway",
          width: 1,
          height: 1,
          radius: 0.5,
          colorA: "#cba6e2",
          colorB: "#e6d6f5",
        },
      },
    ],
  },

  {
    // Reached only via the doorway in the sakura spa. Portal-only.
    id: "ac-onsen-garden",
    world: "Random",
    title: "Onsen Garden",
    url: import.meta.env.BASE_URL + "splats/Random-AC-onsen-garden.spz",
    objectTags: ["ac"],
    hideInPicker: true,
    // TUNE — placeholder spawn.
    spawn: {
      position: [-2.09, 1.48, -5.64],
      quaternion: [-0.024, -0.807, -0.033, 0.590],
    },
    portals: [
      {
        id: "onsen-to-sakura",
        target: "ac-sakura-spa",
        // Return ~1m behind the spawn to the sakura spa. TUNE with logPose.
        position: [0, 1.2, 1.0],
        rotationY: 0,
        loaderText: "⋆.˚returning to the sakura spa ⋆˖࿔",
        render: {
          kind: "doorway",
          width: 1,
          height: 1,
          radius: 0.5,
          colorA: "#cba6e2",
          colorB: "#e6d6f5",
        },
      },
    ],
  },

  {
    // Reached by entering the Tortimer shack in Animal Crossing
    // (ac-to-gullivers-office). Portal-only.
    id: "ac-gullivers-office",
    world: "Random",
    title: "Gulliver's Office",
    url: import.meta.env.BASE_URL + "splats/Random-AC-gullivers-office.spz",
    objectTags: ["ac"],
    hideInPicker: true,
    // TUNE — placeholder spawn.
    spawn: {
      position: [-1.06, 1.41, 0.71],
      quaternion: [0.003, -0.158, 0.001, 0.987],
    },
    portals: [
      {
        // Orb / wisp portal into the mermaid sanctuary — small additive glowing
        // sphere with twinkling sparkles, a 🐚 seashell glyph floating inside it,
        // and a gentle bob. This is the only room on the orb style for now; the
        // other scenes keep their doorways. TUNE: window.portal("gullivers-to-mermaid",
        // { x, y, z, ry }) for position, or render.size for the orb radius.
        id: "gullivers-to-mermaid",
        target: "ac-dreamy-mermaid-sanctuary",
        position: [-4.5, 2.00, -5],
        rotationY: 4.652,
        glyph: "🐚",
        loaderText: "‧₊˚.into the mermaid sanctuary ⋆˚꩜｡",
        render: {
          kind: "orb",
          size: 0.4,
          colorA: "#8fd6e0",
          colorB: "#eaffff",
        },
      },
      {
        id: "gullivers-to-ac",
        target: "animal-crossing",
        // Return outside to Animal Crossing (lands back at the shack via the
        // return-pose capture in world.js). Doorway ~1m behind spawn
        // ([-1.06, 1.41, 0.71], yaw -0.317), y dropped 0.3m. TUNE.
        position: [-1.37, 1.11, 1.66],
        rotationY: -0.317,
        loaderText: "ೃ⁀➷ back to Animal Crossing ࿐ೃ.",
        render: {
          kind: "doorway",
          width: 1,
          height: 1,
          radius: 0.5,
          colorA: "#cba6e2",
          colorB: "#e6d6f5",
        },
      },
    ],
  },

  {
    // Reached only via the doorway in Gulliver's office. Portal-only.
    id: "ac-dreamy-mermaid-sanctuary",
    world: "Random",
    title: "Dreamy Mermaid Sanctuary",
    url: import.meta.env.BASE_URL + "splats/Random-AC-dreamy-mermaid-sanctuary.spz",
    objectTags: ["ac"],
    hideInPicker: true,
    // TUNE — placeholder spawn.
    spawn: {
      position: [0.00, 1.50, 1.73],
      quaternion: [-0.044, -0.002, -0.000, 0.999],
    },
    portals: [
      {
        id: "mermaid-to-gullivers",
        target: "ac-gullivers-office",
        // Return ~1m behind the spawn ([0.00, 1.50, 1.73], yaw -0.004) to
        // Gulliver's office, y dropped 0.3m. TUNE with logPose.
        position: [0.0, 1.2, 2.73],
        rotationY: -0.004,
        loaderText: "⋆.˚returning to Gulliver's office ⋆˖࿔",
        render: {
          kind: "doorway",
          width: 1,
          height: 1,
          radius: 0.5,
          colorA: "#cba6e2",
          colorB: "#e6d6f5",
        },
      },
    ],
  },

  {
    // Portal hub. Reuses the Heart Pool Pavilion splat but is its own entry so
    // it can carry its own spawn + ring of portals without affecting the
    // standalone heart-pool-1-1-1004 scene. Placed LAST in the Random group
    // so cycleWorld's "walk back to first scene of group" never lands here.
    //
    // Tuning: edit center/radius/height/portalSize/startAngle/hueStart in the
    // buildHubPortals call below — HMR re-renders the ring. To relocate the
    // ring after changing splat, walk to the new center, run window.logPose(),
    // and paste its position into both spawn.position and center (XZ).
    id: "hub-heart-pool",
    world: "Random",
    title: "Portals Glade",
    // Reached via its own flower / hub button (#btn-portals-hub), so keep it out
    // of the world-picker dropdown AND out of single/double-trigger cycling
    // (cycleScene skips hideInPicker). cycleWorld never lands here anyway since
    // it's last in the Random group.
    hideInPicker: true,
    url: import.meta.env.BASE_URL + "splats/Heart%20Pool%20Pavilion.spz",
    spawn: {
      position: [-0.02, 1.92, -3.69],
      quaternion: [-0.004, 0.993, 0.039, 0.109],
    },
    portals: buildHubPortals({
      center: [-0.02, -3.69],      // [cx, cz] — XZ of spawn; portals' Y comes from `height`
      radius: 3.0,                 // TUNE
      height: 1.92,                // portal center Y (matches spawn eye height)
      portalSize: 1.0,             // diameter; circle since render uses width=height=size, radius=size/2
      startAngle: 0,               // radians — rotate the whole ring
      hueStart: 0,                 // degrees — first portal's hue (0 = red)
      hueDirection: 1,             // +1 clockwise around the wheel
      // Hue density bias — see hubPortals.js for the math (θ − A·sin(θ − θ_warm)).
      // hueBias  : 0 = even rainbow, 0.55 = moderate warm cluster, ~0.7 = strong
      //            (cool hues compress to a brief sweep). Must stay < 1 or the
      //            curve goes non-monotonic and adjacent portals share/reverse hues.
      // hueWarm  : 300 = more purple, 310 = pink-purple, 320 = magenta,
      //            340 = pink-red, 0 = red. Picks the hue that gets densest sampling.
      // hueStart : rotates which target lands on the densest hue (e.g. -60 shifts
      //            everyone 60° earlier in the spectrum, without changing the bias).
      hueBias: 0.25,
      hueWarmCenter: 310,

      // Each label uses a distinct kaomoji-style text decoration on both sides
      // (https://emojicombos.com/deco-kaomoji). Per-target colorA/colorB can
      // override the rainbow if a specific portal needs a brand color.
      targets: [
        { id: "heart-pool-1-1-1004",              label: "˗ˏˋ♡ Heart Pool Pavilion ♡ˎˊ˗",        emoji: "💖" },
        { id: "pink-cherry-plane-1-1-pano",       label: "⋆˚꒰ Pink Cherry Plane ꒱˚⋆",         emoji: "🍒" },
        { id: "berry-dream-kitchen-1-1",          label: "୨୧ Berry Dream Kitchen ୧୨",           emoji: "🍓" },
        { id: "sunkissed-sparkle-lounge-1-1",     label: "✧˖° Sunkissed Sparkle Room °˖✧",      emoji: "☀️" },
        { id: "twinkle-butterfly-patio-1-1004",   label: "｡ﾟ Twinkle Butterfly Patio ﾟ｡",       emoji: "🦋" },
        { id: "blooming-frutiger-1-1-pano",       label: ".ೃ࿐ Flowers of our Future ࿐ೃ.",      emoji: "🌷" },
        { id: "glitter-frutiger-lounge-1-1-pano", label: "✿.｡.: Glitter Hibiscus Lodge :.｡.✿", emoji: "🌺" },
        { id: "frutiger-rainbow-cafe-1-1-API",    label: "⋆｡‧˚ʚ Frutiger Rainbow Cafe ɞ˚‧｡⋆", emoji: "🌈" },
        { id: "jewel-princess-bathroom-1-1",      label: "⊹˚.♡ Jewel Princess Bathroom ♡.˚⊹",  emoji: "💎" },
        { id: "angelic-quartz-chamber-1-1",       label: "ೃ⁀➷ Angelic Quartz Chamber ೃ⁀➷",     emoji: "🪽" },
        { id: "swan-lake-suite-1-1",              label: "ೃ｡୨୧ Swan Lake Suite ୨୧˚࿐ೃ",     emoji: "🦢" },
        { id: "lavender-laundry-1-1",             label: "⸜♡⸝ Lavender Laundry ⸜♡⸝",           emoji: "🪻" },
        { id: "lovecore-patio-1-1",               label: "˚₊‧ ꒰ა  Random ໒꒱ ‧₊˚",                    emoji: "🦄" },
      ],
    }),
  },
];
