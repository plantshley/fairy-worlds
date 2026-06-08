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
        id: "ac-to-melody",
        target: "lovely-melody-interior",
        // TUNE: feet-on-ground. Logged camera pose was [-0.76, 3.98, -6.77]
        // (eye height in AC's scaled space); subtract ~1.6 × 2.3 ≈ 3.6 for
        // feet. Use window.logPortalSpot(3.6) in the console for live tuning.
        position: [-1.54, 1.75, -10.82],
        rotationY: 0.398,
        animation: "bob",
        loaderText: "·˚*୨୧ entering Celeste's home ୨୧*˚·",
        render: {
          kind: "glb",
          url: import.meta.env.BASE_URL + "characters/celeste_-_animal_crossing_new_horizons.glb",
          scale: 0.075, // TUNE
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
    title: "Portals Hub",
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
        { id: "lavender-laundry-1-1",             label: "⸜♡⸝ Lavender Laundry ⸜♡⸝",           emoji: "🪻" },
        { id: "lovecore-patio-1-1",               label: "˚₊‧ ꒰ა  Random ໒꒱ ‧₊˚",                    emoji: "🦄" },
      ],
    }),
  },
];
