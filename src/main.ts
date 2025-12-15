import './style.css'
import { SceneController } from './three/scene';
import { HeadTracker } from './tracking/headTracker';
import GUI from 'lil-gui';

// プリセットモデル一覧 (public/models/ 内のファイル)
// VRM形式: '/models/ファイル名.vrm'
// PMX形式: '/models/フォルダ名/ファイル名.pmx' (テクスチャも同じフォルダに配置)
const PRESET_MODELS: { [key: string]: string } = {
  'なし': '',
  'VRMアバター': '/models/6265712701278043856.vrm',
  '宝鐘マリン': '/models/HoushouMarine/HoushouMarine.pmx',
  'さくらみこ': '/models/SakuraMiko/SakuraMiko.pmx',
  'ときのそら': '/models/TokinoSora/TokinoSora.pmx',
};

// プリセットダンス一覧 (public/dances/ 内のファイル)
const PRESET_DANCES: { [key: string]: string } = {
  'なし': '',
  '美少女無罪♡パイレーツ': '/dances/美少女無罪♡パイレーツモーション.vmd',
};

// Helper function to determine model type from file extension
function loadModelByExtension(scene: SceneController, url: string) {
  const ext = url.toLowerCase().split('.').pop();
  if (ext === 'pmx' || ext === 'pmd') {
    console.log("Loading PMX model:", url);
    scene.loadPMX(url);
  } else {
    console.log("Loading VRM model:", url);
    scene.loadVRM(url);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const appContainer = document.querySelector<HTMLElement>('#app')!;

  // 1. Init Scene
  const scene = new SceneController(appContainer);

  // 1.5 Init Debug GUI
  const gui = new GUI({ title: '設定メニュー' });
  const debugState = { status: 'Initializing...' };

  // Save defaults
  const defaults = { ...scene.config };

  const updateControllers = () => {
    gui.controllersRecursive().forEach(c => c.updateDisplay());
  };

  const resetCalls = {
    reset: () => {
      Object.assign(scene.config, defaults);
      scene.forceUpdateDims();
      updateControllers();
    },
    saveDefaults: () => {
      Object.assign(defaults, scene.config);
      alert("現在の設定を初期値（リセット時の戻り先）として保存しました。\n※リロードすると消えます。");
    }
  };

  // ===== 全画面モード機能 =====
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Fullscreen error: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // スマホ用 全画面ボタンを作成
  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.textContent = '⛶';
  fullscreenBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    font-size: 24px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.8);
    color: #333;
    cursor: pointer;
    z-index: 9999;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    display: none;
  `;
  fullscreenBtn.onclick = toggleFullscreen;
  document.body.appendChild(fullscreenBtn);

  // モバイルデバイス検出して全画面ボタンを表示
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    fullscreenBtn.style.display = 'block';
  }

  // 全画面状態が変わったらボタンのテキストを更新
  document.addEventListener('fullscreenchange', () => {
    fullscreenBtn.textContent = document.fullscreenElement ? '✕' : '⛶';
  });

  // ===== 1. モデル選択 (第一階層) =====
  const modelFolder = gui.addFolder('モデル選択');
  const modelState = { selected: 'なし' };

  modelFolder.add(modelState, 'selected', Object.keys(PRESET_MODELS)).name('プリセット').onChange((name: string) => {
    const url = PRESET_MODELS[name];
    if (url) {
      loadModelByExtension(scene, url);
    }
  });

  const modelActions = {
    loadFromFile: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.vrm,.glb,.pmx,.pmd';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const url = URL.createObjectURL(file);
          loadModelByExtension(scene, url);
        }
      };
      input.click();
    }
  };
  modelFolder.add(modelActions, 'loadFromFile').name('ファイルから読み込み...');

  // ===== 2. ダンス選択 (第一階層) =====
  const danceFolder = gui.addFolder('ダンス選択');
  const danceState = { selected: 'なし' };

  // Helper function to load VMD based on model type
  function loadDance(url: string) {
    const modelType = scene.getModelType();
    console.log("Loading VMD for model type:", modelType);
    if (modelType === 'pmx') {
      scene.loadVMDForPMX(url);
    } else if (modelType === 'vrm') {
      scene.loadVMD(url);
    } else {
      alert("先にモデルを読み込んでください");
    }
  }

  danceFolder.add(danceState, 'selected', Object.keys(PRESET_DANCES)).name('プリセット').onChange((name: string) => {
    const url = PRESET_DANCES[name];
    if (url) {
      loadDance(url);
    }
  });

  const danceActions = {
    loadFromFile: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.vmd';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const url = URL.createObjectURL(file);
          loadDance(url);
        }
      };
      input.click();
    }
  };
  danceFolder.add(danceActions, 'loadFromFile').name('ファイルから読み込み...');

  // ===== 3. キャリブレーション (第一階層) =====
  const calibFolder = gui.addFolder('キャリブレーション');
  const calibration = {
    step1_Center: () => {
      tracker.calibrateDistance();
      const current = tracker.info;
      scene.config.offsetX = -current.x;
      scene.config.offsetY = -current.y;
      console.log(`Center Calibrated: OffsetX=${scene.config.offsetX}, OffsetY=${scene.config.offsetY}`);
      updateControllers();
    },
    step2_TopLeft: () => {
      const current = tracker.info;
      const rawX = current.x + scene.config.offsetX;
      const rawY = current.y + scene.config.offsetY;
      let finalX = scene.config.invertX ? -rawX : rawX;
      let finalY = scene.config.invertY ? -rawY : rawY;
      if (Math.abs(finalX) > 0.01) scene.config.sensitivityX_Left = 1.0 / Math.abs(finalX);
      if (Math.abs(finalY) > 0.01) scene.config.sensitivityY_Top = 1.0 / Math.abs(finalY);
      updateControllers();
    },
    step3_TopRight: () => {
      const current = tracker.info;
      const rawX = current.x + scene.config.offsetX;
      const rawY = current.y + scene.config.offsetY;
      let finalX = scene.config.invertX ? -rawX : rawX;
      let finalY = scene.config.invertY ? -rawY : rawY;
      if (Math.abs(finalX) > 0.01) scene.config.sensitivityX_Right = 1.0 / Math.abs(finalX);
      if (Math.abs(finalY) > 0.01) scene.config.sensitivityY_Top = 1.0 / Math.abs(finalY);
      updateControllers();
    },
    step4_BottomRight: () => {
      const current = tracker.info;
      const rawX = current.x + scene.config.offsetX;
      const rawY = current.y + scene.config.offsetY;
      let finalX = scene.config.invertX ? -rawX : rawX;
      let finalY = scene.config.invertY ? -rawY : rawY;
      if (Math.abs(finalX) > 0.01) scene.config.sensitivityX_Right = 1.0 / Math.abs(finalX);
      if (Math.abs(finalY) > 0.01) scene.config.sensitivityY_Bottom = 1.0 / Math.abs(finalY);
      updateControllers();
    },
    step5_BottomLeft: () => {
      const current = tracker.info;
      const rawX = current.x + scene.config.offsetX;
      const rawY = current.y + scene.config.offsetY;
      let finalX = scene.config.invertX ? -rawX : rawX;
      let finalY = scene.config.invertY ? -rawY : rawY;
      if (Math.abs(finalX) > 0.01) scene.config.sensitivityX_Left = 1.0 / Math.abs(finalX);
      if (Math.abs(finalY) > 0.01) scene.config.sensitivityY_Bottom = 1.0 / Math.abs(finalY);
      updateControllers();
    }
  };

  calibFolder.add(calibration, 'step1_Center').name('1. 中心を見てクリック');
  calibFolder.add(calibration, 'step2_TopLeft').name('2. 左上の角を見てクリック');
  calibFolder.add(calibration, 'step3_TopRight').name('3. 右上の角を見てクリック');
  calibFolder.add(calibration, 'step4_BottomRight').name('4. 右下の角を見てクリック');
  calibFolder.add(calibration, 'step5_BottomLeft').name('5. 左下の角を見てクリック');

  // ===== 4. アバター詳細設定 (第二階層) =====
  const avatarFolder = gui.addFolder('アバター詳細設定');
  avatarFolder.close(); // デフォルトで閉じる

  const vmdSettings = avatarFolder.addFolder('VMD補正設定 (詳細)');
  vmdSettings.add(scene.config, 'vrmInvertX').name('回転軸反転 X').onChange(() => scene.reapplyVMD());
  vmdSettings.add(scene.config, 'vrmInvertY').name('回転軸反転 Y').onChange(() => scene.reapplyVMD());
  vmdSettings.add(scene.config, 'vrmInvertZ').name('回転軸反転 Z').onChange(() => scene.reapplyVMD());

  vmdSettings.add(scene.config, 'vmdHipScale', 0.01, 1.0).name('移動量の縮小率').onChange(() => scene.reapplyVMD());
  vmdSettings.add(scene.config, 'vmdHipHeightOffset', -20, 20).name('高さオフセット (Y)').onChange(() => scene.reapplyVMD());
  vmdSettings.add(scene.config, 'vmdArmAposeOffset', -90, 90).name('腕の角度補正 (Aポーズ)').onChange(() => scene.reapplyVMD());
  vmdSettings.add(scene.config, 'vmdBoneRotX', -180, 180).name('全体回転補正 X').onChange(() => scene.reapplyVMD());
  vmdSettings.add(scene.config, 'vmdBoneRotY', -180, 180).name('全体回転補正 Y').onChange(() => scene.reapplyVMD());
  vmdSettings.add(scene.config, 'vmdBoneRotZ', -180, 180).name('全体回転補正 Z').onChange(() => scene.reapplyVMD());
  const mirrorFolder = vmdSettings.addFolder('軸・ミラー設定');
  mirrorFolder.add(scene.config, 'vmdAxisMap', ['XYZ', 'XZY', 'YXZ', 'YZX', 'ZXY', 'ZYX']).name('軸の入れ替え (Mapping)').onChange(() => scene.reapplyVMD());

  mirrorFolder.add(scene.config, 'vmdMirrorX').name('左右反転 (X)').onChange(() => scene.reapplyVMD());
  mirrorFolder.add(scene.config, 'vmdMirrorY').name('上下反転 (Y)').onChange(() => scene.reapplyVMD());
  mirrorFolder.add(scene.config, 'vmdMirrorZ').name('前後反転 (Z)').onChange(() => scene.reapplyVMD());

  vmdSettings.add(scene.config, 'vmdPlaybackSpeed', 0.1, 3.0).name('再生速度').onChange(() => scene.reapplyVMD());
  vmdSettings.add(scene.config, 'vmdLoop').name('ループ再生').onChange(() => scene.reapplyVMD());

  try {
    avatarFolder.add(scene.config, 'avatarScale', 1.0, 50.0).name('全体サイズ (Master)').onChange(() => scene.forceUpdateDims()); // Just in case

    const scaleFolder = avatarFolder.addFolder('軸別サイズ調整 (変形)');
    scaleFolder.add(scene.config, 'avatarScaleX', 0.1, 3.0).name('幅 (Scale X)');
    scaleFolder.add(scene.config, 'avatarScaleY', 0.1, 3.0).name('高さ (Scale Y)');
    scaleFolder.add(scene.config, 'avatarScaleZ', 0.1, 3.0).name('奥行 (Scale Z)');

    avatarFolder.add(scene.config, 'avatarY', -50, 50).name('位置 Y (高さ)');
    avatarFolder.add(scene.config, 'avatarZ', -100, 50).name('位置 Z (奥行)');

    const rotFolder = avatarFolder.addFolder('向き調整 (回転)');
    rotFolder.add(scene.config, 'avatarRotX', -180, 180).name('回転 X (前後傾き)');
    rotFolder.add(scene.config, 'avatarRotY', -180, 180).name('回転 Y (左右向き)');
    rotFolder.add(scene.config, 'avatarRotZ', -180, 180).name('回転 Z (傾き)');
  } catch (e) {
    console.error("Failed to add avatar config controls:", e);
  }

  // Main Controls
  const mainFolder = gui.addFolder('メイン設定');
  mainFolder.add(scene.config, 'showDepthObjects').name('立体オブジェクト表示').onChange((v: boolean) => {
    scene.toggleDepthObjects(v);
  });
  mainFolder.add(scene.config, 'screenHeight', 1, 500).name('画面の高さ (単位)');
  mainFolder.add(scene.config, 'aspectRatio', 0.1, 10.0).name('アスペクト比 (横幅調整)').onChange(() => scene.forceUpdateDims());
  mainFolder.add(scene.config, 'baseZ', 1, 500.0).name('基準距離 Z');
  mainFolder.add(scene.config, 'zSensitivity', 0.1, 50.0).name('奥行感度 (Zoom)');
  mainFolder.add(scene.config, 'lookAtCenter').name('視点追従 (LookAt Center)');

  const trackConfig = { mode: 'face' };
  mainFolder.add(trackConfig, 'mode', ['face', 'phone']).name('追跡対象 (Face/Phone)')
    .onChange((v: 'face' | 'phone') => tracker.setMode(v));

  const sceneFolder = gui.addFolder('シーン設定');
  sceneFolder.add(scene.config, 'baseZ', 20, 200).name('基準距離(Z)');
  sceneFolder.add(scene.config, 'zSensitivity', 0.1, 5.0).name('奥行き感度');
  sceneFolder.add(scene.config, 'screenHeight', 5, 100).name('画面の高さ(cm)');
  sceneFolder.add(scene.config, 'showDepthObjects').name('深度オブジェクト表示').onChange((v: boolean) => scene.toggleDepthObjects(v));

  // YouTube / Back Wall Toggle
  sceneFolder.add(scene.config, 'youtubeEnabled').name('YouTube表示').onChange((v: boolean) => scene.toggleYoutube(v));

  // YouTube ID Control
  sceneFolder.add(scene.config, 'youtubeId').name('YouTube ID').onFinishChange((id: string) => scene.updateYoutubeVideo(id));
  sceneFolder.add(scene.config, 'youtubeMirror').name('YouTube反転 (画) (Mirror)').onChange(() => scene.updateYoutubeVideo(scene.config.youtubeId));
  sceneFolder.add(scene.config, 'youtubeMotionInvert').name('YouTube反転 (動) (Motion)');

  // Side Wall Color
  sceneFolder.addColor(scene.config, 'sideWallColor').name('横壁の色 (輝き)').onChange((c: string) => {
    if (scene.sideWallMat) {
      scene.sideWallMat.color.set(c);
    }
  });

  // Top Wall Color
  sceneFolder.addColor(scene.config, 'topWallColor').name('天井の色').onChange((c: string) => {
    if (scene.topWallMat) {
      scene.topWallMat.color.set(c);
    }
  });

  // Back Wall Color (when YouTube is disabled)
  sceneFolder.addColor(scene.config, 'backWallColor').name('奥壁の色').onChange((c: string) => {
    scene.updateBackWallColor(c);
  });

  const ytPos = sceneFolder.addFolder('YouTube位置調整 (XYZ)');
  ytPos.add(scene.config, 'youtubeX', -50, 50).name('位置 X (左右)');
  ytPos.add(scene.config, 'youtubeY', -50, 50).name('位置 Y (上下)');
  ytPos.add(scene.config, 'youtubeZ', -100, 50).name('位置 Z (奥行)'); // Allow closer or further
  ytPos.add(scene.config, 'youtubeScale', 0.001, 0.1).name('大きさ (Scale)');

  // Background color control might be redundant if we use CSS YouTube, but okay to keep if no video.
  sceneFolder.addColor({ color: '#000000' }, 'color').name('背景色').onChange((c: any) => document.body.style.backgroundColor = c);
  const sensFolder = gui.addFolder('感度・軸設定');
  sensFolder.add(scene.config, 'sensitivityX_Left', 0.1, 3.0).name('感度 X (左)');
  sensFolder.add(scene.config, 'sensitivityX_Right', 0.1, 3.0).name('感度 X (右)');
  sensFolder.add(scene.config, 'sensitivityY_Top', 0.1, 3.0).name('感度 Y (上)');
  sensFolder.add(scene.config, 'sensitivityY_Bottom', 0.1, 3.0).name('感度 Y (下)');

  sensFolder.add(scene.config, 'invertX').name('横反転 (左右)');
  sensFolder.add(scene.config, 'invertY').name('縦反転 (上下)');
  sensFolder.add(scene.config, 'invertZ').name('奥行反転 (前後)');

  // Fine Tuning System
  const tuneFolder = gui.addFolder('微調整 (±)');
  const tuneState = {
    target: 'screenHeight',
    step: 0.1
  };

  tuneFolder.add(tuneState, 'target', [
    'screenHeight', 'aspectRatio', 'baseZ', 'zSensitivity',
    'offsetX', 'offsetY',
    'sensitivityX_Left', 'sensitivityX_Right',
    'sensitivityY_Top', 'sensitivityY_Bottom'
  ]).name('調整項目');
  tuneFolder.add(tuneState, 'step', 0.01, 1.0).name('変化量');

  const applyStep = (sign: number) => {
    const key = tuneState.target as keyof typeof scene.config;
    // Type safety hack: assume all targets are numbers
    const current = scene.config[key] as number;
    if (typeof current === 'number') {
      (scene.config[key] as number) = current + (tuneState.step * sign);
      if (key === 'screenHeight') {
        scene.forceUpdateDims();
      }
      updateControllers();
    }
  };

  tuneFolder.add({ decrease: () => applyStep(-1) }, 'decrease').name('[-] 減らす');
  tuneFolder.add({ increase: () => applyStep(1) }, 'increase').name('[+] 増やす');

  // 全画面ボタンをGUIに追加
  gui.add({ toggleFullscreen }, 'toggleFullscreen').name('全画面表示切替');
  gui.add(resetCalls, 'saveDefaults').name('現在の値を初期値にする');
  gui.add(resetCalls, 'reset').name('設定をリセット');
  const tracker = new HeadTracker();

  // Optional: Move video to preview container
  // accessing private video property workaround or changing HeadTracker class would be better.
  // For now, let's fix HeadTracker to expose video or append to specific container.
  // Actually, I can select the video element it made (it appends to body).
  // Or I can update HeadTracker. But let's assume I can stick it in the UI.

  await tracker.init();
  const s = tracker.modelStatus;
  debugState.status = `Running (Face:${s.face ? "OK" : "X"} Phone:${s.phone ? "OK" : "X"})`;

  // Video preview logic removed as requested
  // The video element remains hidden (created in HeadTracker with display: none)

  // 3. Render Loop
  const animate = () => {
    requestAnimationFrame(animate);

    const headData = tracker.info;

    // Update camera based on head position
    // x, y are [-1, 1], z is scale (1 neutral)
    scene.updateCameraPosition(headData.x, headData.y, headData.z);

    // Update hands/face removed
    // scene.updateHands(...);
    // scene.updateFace(...);

    // Update Debug Info
    const dbg = document.getElementById('debug-info');
    if (dbg) {
      dbg.innerText = `Head X: ${tracker.info.x.toFixed(2)}\nHead Y: ${tracker.info.y.toFixed(2)}\nHead Z: ${tracker.info.z.toFixed(2)}`;
    }

    scene.render();
  };

  animate();
});
