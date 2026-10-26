// One browser-world unit = one metre; Rocket League uses centimetres.
export const BALL_RADIUS=91.25/100;
// Jako's model wheel centres (cm, +X forward) aligned to RocketSim's
// Octane wheelbase. Use a uniform scale, never stretch the car to its hitbox.
export const OCTANE_MODEL_FRONT=45.184871673583984;
export const OCTANE_MODEL_REAR=-40.91989517211914;
export const OCTANE_SCALE=(51.25-(-33.75))/(OCTANE_MODEL_FRONT-OCTANE_MODEL_REAR)/100;
export const OCTANE_FORWARD_OFFSET=51.25/100-OCTANE_MODEL_FRONT*OCTANE_SCALE;
