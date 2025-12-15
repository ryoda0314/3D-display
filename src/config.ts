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
    avatarRotX: number;
    avatarRotY: number;
    avatarRotZ: number;
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
    youtubeEnabled: boolean;
    youtubeId: string;
    youtubeMirror: boolean;
    youtubeMotionInvert: boolean;
    youtubeX: number;
    youtubeY: number;
    youtubeZ: number;
    youtubeScale: number;
    youtubeVolume: number; // 0-100
    backWallColor: string;

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

// PC用デフォルト設定
export const PC_DEFAULT_CONFIG: AppConfig = {
    screenHeight: 20.0,
    sensitivityX_Left: 1.691377,
    sensitivityX_Right: 1.652277,
    sensitivityY_Top: 1.943930,
    sensitivityY_Bottom: 1.2780,
    baseZ: 70.8,
    zSensitivity: 0.8,
    aspectRatio: 1.0,
    invertX: false,
    invertY: false,
    invertZ: false,
    offsetX: 0.0,
    offsetY: 0.0,
    lookAtCenter: false,
    debugView: false,

    // Avatar Config - PC
    avatarScale: 7.0,
    avatarScaleX: 0.5785,
    avatarScaleY: 1.0,
    avatarScaleZ: 0.5785,
    avatarY: -9.2,
    avatarZ: -0.7,
    avatarRotX: 0,
    avatarRotY: 0,
    avatarRotZ: 0,
    showDepthObjects: true,
    autoDance: false,

    // Wall Colors
    sideWallColor: '#888888',
    topWallColor: '#111111',

    // VMD Retargeting Config
    vrmInvertX: true,
    vrmInvertY: true,
    vrmInvertZ: false,
    vmdHipScale: 0.1,
    vmdHipHeightOffset: 0.0,
    vmdArmAposeOffset: 0.0,
    vmdBoneRotX: 0.0,
    vmdBoneRotY: 0.0,
    vmdBoneRotZ: 0.0,
    vmdPlaybackSpeed: 1.0,
    vmdLoop: true,
    vmdAxisMap: 'XYZ',
    vmdMirrorX: true,
    vmdMirrorY: false,
    vmdMirrorZ: true,

    youtubeEnabled: false,
    youtubeId: 'jfKfPfyJRdk',
    youtubeMirror: true,
    youtubeMotionInvert: true,
    youtubeX: 0.0,
    youtubeY: -14.6,
    youtubeZ: -100.0,
    youtubeScale: 0.1,
    youtubeVolume: 10, // 0-100
    backWallColor: '#222222',

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

// スマホ用デフォルト設定
export const MOBILE_DEFAULT_CONFIG: AppConfig = {
    screenHeight: 20.0,  // スマホは小さめ
    sensitivityX_Left: 1.5574,
    sensitivityX_Right: 1.5574,
    sensitivityY_Top: 1.7548,
    sensitivityY_Bottom: 2.6053,
    baseZ: 50.0,  // スマホは近い距離
    zSensitivity: 0.8,
    aspectRatio: 1.0,
    invertX: false,
    invertY: false,
    invertZ: false,
    offsetX: 0.0,
    offsetY: 0.0,
    lookAtCenter: false,
    debugView: false,

    // Avatar Config - Mobile (縦画面向け調整)
    avatarScale: 7.0,
    avatarScaleX: 0.5785,
    avatarScaleY: 1.0,
    avatarScaleZ: 0.5785,
    avatarY: -9.2,
    avatarZ: 0.04,
    avatarRotX: 0,
    avatarRotY: 0,
    avatarRotZ: 0,
    showDepthObjects: true,
    autoDance: false,

    // Wall Colors
    sideWallColor: '#ebade3ff',
    topWallColor: '#f480c4ff',

    // VMD Retargeting Config
    vrmInvertX: true,
    vrmInvertY: true,
    vrmInvertZ: false,
    vmdHipScale: 0.1,
    vmdHipHeightOffset: 0.0,
    vmdArmAposeOffset: 0.0,
    vmdBoneRotX: 0.0,
    vmdBoneRotY: 0.0,
    vmdBoneRotZ: 0.0,
    vmdPlaybackSpeed: 1.0,
    vmdLoop: true,
    vmdAxisMap: 'XYZ',
    vmdMirrorX: true,
    vmdMirrorY: false,
    vmdMirrorZ: true,

    youtubeEnabled: false,
    youtubeId: 'jfKfPfyJRdk',
    youtubeMirror: true,
    youtubeMotionInvert: true,
    youtubeX: 0.0,
    youtubeY: -10.0,  // スマホ用位置調整
    youtubeZ: -80.0,
    youtubeScale: 0.08,
    youtubeVolume: 10, // 0-100
    backWallColor: '#fbd8fdff',

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

// デバイスに応じて初期設定を取得
export function getDefaultConfig(): AppConfig {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    return isMobile ? { ...MOBILE_DEFAULT_CONFIG } : { ...PC_DEFAULT_CONFIG };
}

// 後方互換性のためDEFAULT_CONFIGはPC版を維持
export const DEFAULT_CONFIG = PC_DEFAULT_CONFIG;
