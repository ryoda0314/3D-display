export interface AppConfig {
    // Physical units (cm)
    screenHeight: number;
    sensitivityX_Left: number;
    sensitivityX_Right: number;
    sensitivityY_Top: number;
    sensitivityY_Bottom: number;
    baseZ: number;
    zSensitivity: number;
    aspectRatio: number;
    invertX: boolean;
    invertY: boolean;
    invertZ: boolean;
    offsetX: number;
    offsetY: number;
    lookAtCenter: boolean;
    debugView: boolean;

    // Avatar Config
    avatarScale: number;
    avatarScaleX: number;
    avatarScaleY: number;
    avatarScaleZ: number;
    avatarY: number;
    avatarZ: number;
    showDepthObjects: boolean;
    autoDance: boolean;

    // Wall Colors (Hex Strings)
    sideWallColor: string;
    topWallColor: string;

    // VMD Retargeting
    vrmInvertX: boolean;
    vrmInvertY: boolean;
    vrmInvertZ: boolean;
    vmdHipScale: number;
    vmdHipHeightOffset: number;
    vmdArmAposeOffset: number;
    vmdBoneRotX: number;
    vmdBoneRotY: number;
    vmdBoneRotZ: number;
    vmdPlaybackSpeed: number;
    vmdLoop: boolean;
    vmdAxisMap: string;
    vmdMirrorX: boolean;
    vmdMirrorY: boolean;
    vmdMirrorZ: boolean;

    // YouTube
    youtubeId: string;
    youtubeMirror: boolean;
    youtubeMotionInvert: boolean;
    youtubeX: number;
    youtubeY: number;
    youtubeZ: number;
    youtubeScale: number;

    // Hand Tuning
    handDepthFactor: number;
    handBaseSize: number;
    handZOffset: number;
    handInvertX: boolean;
    handInvertY: boolean;
    handInvertZ: boolean;

    // Debug Readouts
    lastHandSize: number;
    lastHandZ: number;
}

export const DEFAULT_CONFIG: AppConfig = {
    // Physical units reference: Let's assume 1 unit = 1 cm for intuition.
    // A typical laptop/monitor is ~20-30cm tall.
    screenHeight: 20.0,

    // Webcam constraints usually mean we need higher sensitivity to map small real movements 
    // to screen-edge travel.
    // Sensitivity split for 4 quadrants
    sensitivityX_Left: 1.691377,
    sensitivityX_Right: 1.652277,
    sensitivityY_Top: 1.943930,
    sensitivityY_Bottom: 1.2780,

    // Typical viewing distance ~50-60cm.
    // If screenHeight is 20, baseZ should be around 50-60.
    baseZ: 70.8,

    zSensitivity: 0.8, // Needs clearer depth changes
    aspectRatio: 1.0,

    // Axis inversion flags - frequently needed for mirror/non-mirror setups
    invertX: false,
    invertY: false,
    invertZ: false,

    // Calibration offsets (Raw input space)
    offsetX: 0.0,
    offsetY: 0.0,

    lookAtCenter: false, // Default OFF to ensure rectangular front
    debugView: false,

    // Avatar Config
    avatarScale: 12.0,
    avatarScaleX: 0.5785,
    avatarScaleY: 1.0,
    avatarScaleZ: 1.0,
    avatarY: 0,
    avatarZ: -0.7,
    showDepthObjects: true,
    autoDance: false, // Default: Stop procedural dance

    // Wall Colors
    sideWallColor: '#888888',
    topWallColor: '#111111',

    // VMD Retargeting Config
    vrmInvertX: true,
    vrmInvertY: true,
    vrmInvertZ: false, // Usually Z doesn't need inversion if X/Y are flipped for Quaternions? Or maybe it does. Let's try standard (-x, -y, z, w).

    vmdHipScale: 0.1,
    vmdHipHeightOffset: 0.0, // Adjust root height
    vmdArmAposeOffset: 0.0,  // Degree offset for A-pose correction (Shoulders)
    vmdBoneRotX: 0.0,
    vmdBoneRotY: 0.0,
    vmdBoneRotZ: 0.0,
    vmdPlaybackSpeed: 1.0,
    vmdLoop: true,

    // Axis Mapping (Permutation)
    vmdAxisMap: 'XYZ', // Default order

    // Mirroring / Planes
    vmdMirrorX: true, // Left/Right Swap + Inv X
    vmdMirrorY: false, // Inv Y
    vmdMirrorZ: true, // Inv Z

    youtubeId: 'jfKfPfyJRdk', // Default Video
    youtubeMirror: false, // Mirror video horizontally
    youtubeMotionInvert: true, // Invert Parallax Motion for YouTube Only
    youtubeX: 0.0,
    youtubeY: -14.6,
    youtubeZ: -100.0,
    youtubeScale: 0.1, // Default Scale

    // Hand Tuning
    handDepthFactor: 300.0,
    handBaseSize: 0.05,
    handZOffset: 0.0,
    handInvertX: false,
    handInvertY: false,
    handInvertZ: false,

    // Debug Readouts
    lastHandSize: 0,
    lastHandZ: 0
};
