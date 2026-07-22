// Game configuration baked from the builder wizard. The engine reads these; Claude reads
// them too (via the system context) so generated logic matches the chosen resolution/theme.
export const GAME_TITLE = "Berserk Adventure";
export const GAME_ID = "46266b505e4c4a6a832afe63b872c39d";
export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;
export const BACKGROUND_COLOR = 0x0b0b12;
export const GAME_TYPE = "rpg";
export const STYLE = "fantasy";

// Arcade physics defaults. A platformer wants gravity; top-down/arcade/puzzle usually don't.
export const GRAVITY_Y = 0;