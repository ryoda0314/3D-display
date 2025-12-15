import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
// @ts-ignore - MMDLoader has no type declaration
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader.js';
// @ts-ignore - MMDAnimationHelper has no type declaration
import { MMDAnimationHelper } from 'three/examples/jsm/animation/MMDAnimationHelper.js';
import { DEFAULT_CONFIG, type AppConfig } from '../config';

import { VRM, VRMLoaderPlugin, VRMUtils, VRMHumanBoneName } from '@pixiv/three-vrm';

// MMD Bone Name to VRM Bone Name Mapping
const MMD_TO_VRM_MAP: { [key: string]: VRMHumanBoneName } = {
    '全ての親': 'hips', // Fallback/Root
    'センター': 'hips',
    '上半身': 'spine',
    '上半身2': 'chest',
    '首': 'neck',
    '頭': 'head',
    '左肩': 'leftShoulder',
    '左腕': 'leftUpperArm',
    '左ひじ': 'leftLowerArm',
    '左手首': 'leftHand',
    '右肩': 'rightShoulder',
    '右腕': 'rightUpperArm',
    '右ひじ': 'rightLowerArm',
    '右手首': 'rightHand',
    '左足': 'leftUpperLeg',
    '左ひざ': 'leftLowerLeg',
    '左足首': 'leftFoot',
    '右足': 'rightUpperLeg',
    '右ひざ': 'rightLowerLeg',
    '右足首': 'rightFoot',
    // Add more as needed...
};

export class SceneController {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    // private cube: THREE.Mesh; // Removed unused property
    private torusMesh: THREE.Mesh | undefined;
    private depthGroup: THREE.Group | undefined;
    private currentVrm: VRM | undefined;
    private animationMixer: THREE.AnimationMixer | undefined;
    private clock = new THREE.Clock();

    // Smoothing
    private targetPos = new THREE.Vector3(0, 0, 60);
    // private currentPos = new THREE.Vector3(0, 0, 5);

    // Configuration for Debugging
    public config: AppConfig = { ...DEFAULT_CONFIG };

    private screenWidth = 0; // calculated on resize

    // VMD Cache
    private lastVmdData: any;

    // CSS3D
    private cssScene: THREE.Scene;
    private cssRenderer: CSS3DRenderer;
    private youtubeObject: CSS3DObject | null = null; // Store reference

    public sideWallMat: THREE.MeshBasicMaterial | null = null;
    public topWallMat: THREE.MeshBasicMaterial | null = null; // New Top Material
    public backWallMat: THREE.MeshBasicMaterial | null = null; // Back Wall Material
    private backWallMesh: THREE.Mesh | null = null; // Back Wall Mesh

    // PMX/MMD Support
    private mmdLoader: any;
    private mmdHelper: any;
    private currentPmxMesh: THREE.SkinnedMesh | null = null;
    private modelType: 'vrm' | 'pmx' | null = null;

    constructor(container: HTMLElement) {
        // 1. Scene
        this.scene = new THREE.Scene();
        // this.scene.background = new THREE.Color(0x222222); // REMOVE Background for transparency
        this.cssScene = new THREE.Scene();

        // 2. Camera
        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
        this.scene.add(this.camera);

        // 3. Renderer (WebGL)
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Transparent
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.zIndex = '1'; // In front
        this.renderer.domElement.style.pointerEvents = 'none'; // Passthrough
        container.appendChild(this.renderer.domElement);

        // 3.5 CSS Renderer
        this.cssRenderer = new CSS3DRenderer();
        this.cssRenderer.setSize(window.innerWidth, window.innerHeight);
        this.cssRenderer.domElement.style.position = 'absolute';
        this.cssRenderer.domElement.style.top = '0';
        this.cssRenderer.domElement.style.zIndex = '0'; // Behind
        container.appendChild(this.cssRenderer.domElement);


        this.updateScreenDimensions();

        // 4. Content (The Box)
        // The box should look like it extends FROM the screen (z=0) backwards.
        const boxDepth = 20;
        const boxSize = 20;

        // Wall Material: Dark Grey (Top/Bottom)
        const blackMat = new THREE.MeshBasicMaterial({
            color: 0x111111,
            side: THREE.BackSide,
            dithering: true
        });

        // Use a separate material for Side Walls (per user request to make them "shine")
        // We'll expose this material's color to the config/GUI.
        // We attach it to "this" so we can access it later? Or just recreate/update in a method?
        // Better: store it as a property if we want fast updates, but for now we can rely on traversing or just keeping a reference.
        // Actually, scene controller usually holds references to Config, not materials directly, 
        // but we can add a method `updateWallMaterial`.

        // Let's create it here, but maybe we need to store it to update it?
        // Or we can just access mesh.material later.
        const sideWallMat = new THREE.MeshBasicMaterial({
            color: 0x888888, // Brighter default as requested ("Kagayaku")
            side: THREE.BackSide,
            dithering: true
        });
        this.sideWallMat = sideWallMat;

        // Top Wall Material (Ceiling)
        const topWallMat = new THREE.MeshBasicMaterial({
            color: 0x111111, // Start dark like before
            side: THREE.BackSide,
            dithering: true
        });
        this.topWallMat = topWallMat;

        const invisibleMat = new THREE.MeshBasicMaterial({ visible: false });

        // Order: Right, Left, Top, Bottom, Front, Back
        const materials = [
            sideWallMat, // Right
            sideWallMat, // Left
            topWallMat,  // Top (Changed)
            blackMat,    // Bottom
            invisibleMat, // Front (Open)
            invisibleMat  // Back (Open for Youtube)
        ];

        const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxDepth);
        const cube = new THREE.Mesh(geometry, materials);
        cube.position.z = -10;

        this.scene.add(cube);

        // Back Wall (for when YouTube is disabled)
        const backWallMat = new THREE.MeshBasicMaterial({
            color: this.config.backWallColor,
            side: THREE.FrontSide
        });
        this.backWallMat = backWallMat;

        const backWallGeo = new THREE.PlaneGeometry(boxSize, boxSize);
        const backWall = new THREE.Mesh(backWallGeo, backWallMat);
        backWall.position.z = -boxDepth;
        backWall.visible = !this.config.youtubeEnabled; // Hidden if YouTube is on
        this.backWallMesh = backWall;
        this.scene.add(backWall);

        // Init YouTube or hide based on config
        if (this.config.youtubeEnabled) {
            this.updateYoutubeVideo(this.config.youtubeId);
        }

        // --- Grids on Walls ---
        // const gridColor = 0xffffff; // Removed unused
        const divisions = 10;

        // Helper to place grids
        // Helper to place grids (Removed unused addGrid)

        // Floor (Bottom)
        const floorGrid = new THREE.GridHelper(boxSize, divisions, 0x888888, 0x444444); // User said White.
        floorGrid.material.color.setHex(0xffffff);
        floorGrid.material.opacity = 0.3; // Make it subtle ("faintly bright"?)
        floorGrid.material.transparent = true;
        floorGrid.position.set(0, -boxSize / 2 + 0.01, -boxDepth / 2);
        this.scene.add(floorGrid);

        // Ceiling (Top)
        const ceilGrid = floorGrid.clone();
        ceilGrid.position.set(0, boxSize / 2 - 0.01, -boxDepth / 2);
        this.scene.add(ceilGrid);

        // Back Wall (XY plane -> Rotate X 90)
        // Removed Grid on Back Wall to allow clear YouTube projection
        /*
        const backGrid = new THREE.GridHelper(boxSize, divisions, 0xffffff, 0xffffff);
        backGrid.rotation.x = Math.PI / 2;
        backGrid.position.set(0, 0, -boxDepth + 0.01);
        backGrid.material.opacity = 0.3;
        backGrid.material.transparent = true;
        this.scene.add(backGrid);
        */

        // Left Wall (YZ plane -> Rotate Z 90)
        const leftGrid = new THREE.GridHelper(boxDepth, divisions, 0xffffff, 0xffffff);
        leftGrid.rotation.z = Math.PI / 2;
        leftGrid.position.set(-boxSize / 2 + 0.01, 0, -boxDepth / 2);
        leftGrid.material.opacity = 0.3;
        leftGrid.material.transparent = true;
        this.scene.add(leftGrid);

        // Right Wall
        const rightGrid = leftGrid.clone();
        rightGrid.position.set(boxSize / 2 - 0.01, 0, -boxDepth / 2);
        this.scene.add(rightGrid);


        // --- Objects for Depth Perception ---
        this.depthGroup = new THREE.Group();
        this.scene.add(this.depthGroup);

        // Objects removed as requested.

        // 5. Lighting Update for Shadows/Depth
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 10, 5); // Top-Right-Front
        this.scene.add(dirLight);

        const pointLight = new THREE.PointLight(0xffffff, 0.8);
        pointLight.position.set(0, 5, -5);
        this.scene.add(pointLight);

        // Resize listener
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    private updateScreenDimensions() {
        this.screenWidth = this.config.screenHeight * this.config.aspectRatio;
    }

    public forceUpdateDims() {
        this.updateScreenDimensions();
    }

    public getModelType(): 'vrm' | 'pmx' | null {
        return this.modelType;
    }

    // --- Clear existing model ---
    private clearCurrentModel() {
        if (this.currentVrm) {
            this.scene.remove(this.currentVrm.scene);
            VRMUtils.deepDispose(this.currentVrm.scene);
            this.currentVrm = undefined;
        }
        if (this.currentPmxMesh) {
            this.scene.remove(this.currentPmxMesh);
            this.currentPmxMesh.geometry.dispose();
            if (Array.isArray(this.currentPmxMesh.material)) {
                this.currentPmxMesh.material.forEach(m => m.dispose());
            } else {
                this.currentPmxMesh.material.dispose();
            }
            this.currentPmxMesh = null;
        }
        if (this.mmdHelper) {
            // Reset helper
            this.mmdHelper = new MMDAnimationHelper({ afterglow: 2.0 });
        }
        if (this.animationMixer) {
            this.animationMixer.stopAllAction();
            this.animationMixer = undefined;
        }
        this.modelType = null;
    }

    // --- VRM Loader & Animation ---
    public async loadVRM(url: string) {
        this.clearCurrentModel();

        const loader = new GLTFLoader();
        loader.register((parser) => {
            return new VRMLoaderPlugin(parser);
        });

        loader.load(
            url,
            (gltf) => {
                const vrm = gltf.userData.vrm;

                this.currentVrm = vrm;
                this.modelType = 'vrm';
                this.scene.add(vrm.scene);

                // Setup initial position
                vrm.scene.rotation.y = Math.PI; // Face forward
                vrm.scene.position.set(0, this.config.avatarY, this.config.avatarZ);

                // Adjust scale if needed (some models are huge)
                vrm.scene.scale.setScalar(this.config.avatarScale);

                // Fix: Disable Frustum Culling to prevent disappearing when animated off-screen
                vrm.scene.traverse((obj: any) => {
                    if (obj.isMesh) {
                        obj.frustumCulled = false;
                    }
                });

                console.log("VRM Loaded successfully");
            },
            undefined,
            (error) => console.error(error)
        );
    }

    // --- PMX Loader ---
    public async loadPMX(url: string, vmdUrl?: string) {
        this.clearCurrentModel();

        if (!this.mmdLoader) {
            this.mmdLoader = new MMDLoader();
        }
        if (!this.mmdHelper) {
            this.mmdHelper = new MMDAnimationHelper({ afterglow: 2.0 });
        }

        this.mmdLoader.load(
            url,
            (mesh: any) => {
                this.currentPmxMesh = mesh;
                this.modelType = 'pmx';

                // Setup initial position and scale
                mesh.rotation.y = Math.PI; // Face forward
                mesh.position.set(0, this.config.avatarY, this.config.avatarZ);
                mesh.scale.setScalar(this.config.avatarScale * 0.1); // PMX models are usually larger

                // Disable frustum culling
                mesh.frustumCulled = false;

                this.scene.add(mesh);

                // Register mesh with helper (required for animation)
                this.mmdHelper.add(mesh, {
                    animation: null,
                    physics: true
                });

                console.log("PMX Loaded successfully");

                // Load VMD if provided
                if (vmdUrl) {
                    this.loadVMDForPMX(vmdUrl);
                }
            },
            (xhr: any) => {
                console.log(`PMX Loading: ${(xhr.loaded / xhr.total * 100).toFixed(0)}%`);
            },
            (error: any) => {
                console.error("Error loading PMX:", error);
            }
        );
    }

    // --- Load VMD for PMX model ---
    public loadVMDForPMX(url: string) {
        if (!this.currentPmxMesh) {
            console.warn("Load a PMX model first!");
            alert("先にPMXモデルを読み込んでください");
            return;
        }

        if (!this.mmdLoader) {
            this.mmdLoader = new MMDLoader();
        }
        if (!this.mmdHelper) {
            this.mmdHelper = new MMDAnimationHelper({ afterglow: 2.0 });
        }

        this.mmdLoader.loadAnimation(
            url,
            this.currentPmxMesh,
            (clip: any) => {
                // Remove any existing animation
                this.mmdHelper.remove(this.currentPmxMesh);

                this.mmdHelper.add(this.currentPmxMesh, {
                    animation: clip,
                    physics: true
                });

                console.log("VMD animation loaded for PMX");
            },
            (xhr: any) => {
                console.log(`VMD Loading: ${(xhr.loaded / xhr.total * 100).toFixed(0)}%`);
            },
            (error: any) => {
                console.error("Error loading VMD:", error);
            }
        );
    }

    // --- VMD Animation Loader ---
    public async loadVMD(url: string) {
        if (!this.currentVrm) {
            console.warn("Load a VRM model first!");
            alert("先にVRMアバターを読み込んでください");
            return;
        }

        try {
            const response = await fetch(url);
            const buffer = await response.arrayBuffer();

            // Dynamic import to avoid type issues if possible
            // @ts-ignore
            const MMDParser = await import('mmd-parser');
            const parser = new MMDParser.Parser();
            const vmd = parser.parseVmd(buffer);

            // console.log("VMD Parsed:", vmd);
            this.lastVmdData = vmd;
            this.playVMDData(vmd);
        } catch (e) {
            console.error("Failed to load VMD:", e);
        }
    }

    public reapplyVMD() {
        if (this.lastVmdData) {
            this.playVMDData(this.lastVmdData);
        }
    }

    private playVMDData(vmd: any) {
        if (!this.currentVrm) return;

        const tracks: THREE.KeyframeTrack[] = [];
        const humanoid = this.currentVrm.humanoid;

        // Group motions by bone name
        const boneMotions: { [key: string]: { times: number[], pos: number[], rot: number[] } } = {};

        vmd.motions.forEach((m: any) => {
            const name = m.boneName;
            if (!boneMotions[name]) {
                boneMotions[name] = { times: [], pos: [], rot: [] };
            }
            // VMD is 30fps
            const t = m.frameNum / 30.0;
            boneMotions[name].times.push(t);

            // Position
            boneMotions[name].pos.push(m.position[0], m.position[1], m.position[2]);
            // Rotation
            boneMotions[name].rot.push(m.rotation[0], m.rotation[1], m.rotation[2], m.rotation[3]);
        });

        // Create Tracks
        let matchCount = 0;
        for (const boneName in boneMotions) {
            const vrmBoneName = MMD_TO_VRM_MAP[boneName];
            if (!vrmBoneName) continue;

            const node = humanoid.getNormalizedBoneNode(vrmBoneName);
            if (!node) continue;

            const data = boneMotions[boneName];

            // Simple sort approach (inefficient but safe)
            const indices = data.times.map((_, i) => i);
            indices.sort((a, b) => data.times[a] - data.times[b]);

            const sortedTimes = new Float32Array(data.times.length);
            const sortedPos = new Float32Array(data.times.length * 3);
            const sortedRot = new Float32Array(data.times.length * 4);

            for (let i = 0; i < indices.length; i++) {
                const idx = indices[i];
                sortedTimes[i] = data.times[idx];

                // 0. Axis Mapping (Permutation) before any processing
                // Original VMD: px, py, pz, rx, ry, rz
                // We map them to: ox, oy, oz based on config.

                // Position
                let px = data.pos[idx * 3 + 0];
                let py = data.pos[idx * 3 + 1];
                let pz = data.pos[idx * 3 + 2];

                // Rotation (Quat components x, y, z)
                let rx = data.rot[idx * 4 + 0];
                let ry = data.rot[idx * 4 + 1];
                let rz = data.rot[idx * 4 + 2];
                let rw = data.rot[idx * 4 + 3];

                const applyMap = (x: number, y: number, z: number, map: string) => {
                    switch (map) {
                        case 'XZY': return [x, z, y];
                        case 'YXZ': return [y, x, z];
                        case 'YZX': return [y, z, x];
                        case 'ZXY': return [z, x, y];
                        case 'ZYX': return [z, y, x];
                        default: return [x, y, z]; // XYZ
                    }
                };

                [px, py, pz] = applyMap(px, py, pz, this.config.vmdAxisMap);
                [rx, ry, rz] = applyMap(rx, ry, rz, this.config.vmdAxisMap);

                // 1. Scale
                px *= this.config.vmdHipScale;
                py *= this.config.vmdHipScale;
                pz *= this.config.vmdHipScale;

                // 1.5. Hip Height Offset (Restore)
                if (vrmBoneName === 'hips') {
                    py += this.config.vmdHipHeightOffset;
                }

                // 2. Standard MMD -> Three conversion (Pos: -z)
                pz = -pz;

                // 3. Mirroring (Position)
                if (this.config.vmdMirrorX) px = -px;
                if (this.config.vmdMirrorY) py = -py;
                if (this.config.vmdMirrorZ) pz = -pz;

                sortedPos[i * 3 + 0] = px;
                sortedPos[i * 3 + 1] = py;
                sortedPos[i * 3 + 2] = pz;

                // 4. Rotation Component Inversion (Standard MMD->Three is -x, -y)
                if (this.config.vrmInvertX) rx = -rx;
                if (this.config.vrmInvertY) ry = -ry;
                if (this.config.vrmInvertZ) rz = -rz;

                // 5. Mirroring (Rotation)
                // If we mirror Pos X, we usually flip Rot Y and Z (for standard reflection).
                if (this.config.vmdMirrorX) { ry = -ry; rz = -rz; }
                if (this.config.vmdMirrorY) { rx = -rx; rz = -rz; }
                if (this.config.vmdMirrorZ) { rx = -rx; ry = -ry; }

                // Create base quaternion
                const q = new THREE.Quaternion(rx, ry, rz, rw);

                // 1. General Bone Rotation Offset (X/Y/Z) - Applies to ALL bones
                if (Math.abs(this.config.vmdBoneRotX) > 0.01 || Math.abs(this.config.vmdBoneRotY) > 0.01 || Math.abs(this.config.vmdBoneRotZ) > 0.01) {
                    const euler = new THREE.Euler(
                        THREE.MathUtils.degToRad(this.config.vmdBoneRotX),
                        THREE.MathUtils.degToRad(this.config.vmdBoneRotY),
                        THREE.MathUtils.degToRad(this.config.vmdBoneRotZ),
                        'XYZ'
                    );
                    const qOffset = new THREE.Quaternion().setFromEuler(euler);
                    q.multiply(qOffset);
                }

                // 2. A-Pose Correction (Primitive) - Only Shoulders/Arms
                if ((vrmBoneName.includes('Shoulder') || vrmBoneName.includes('Arm')) && Math.abs(this.config.vmdArmAposeOffset) > 0.01) {
                    const offsetRad = THREE.MathUtils.degToRad(this.config.vmdArmAposeOffset);
                    const qOffset = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), offsetRad);
                    q.multiply(qOffset);
                }

                // Unpack
                sortedRot[i * 4 + 0] = q.x;
                sortedRot[i * 4 + 1] = q.y;
                sortedRot[i * 4 + 2] = q.z;
                sortedRot[i * 4 + 3] = q.w;
            }

            // Create tracks
            const trackNameBase = node.name; // Use node name for mixer targeting

            // Position Track (only for Hips usually)
            if (vrmBoneName === 'hips') {
                tracks.push(new THREE.VectorKeyframeTrack(`${trackNameBase}.position`, sortedTimes as any, sortedPos as any));
            }

            // Rotation Track
            tracks.push(new THREE.QuaternionKeyframeTrack(`${trackNameBase}.quaternion`, sortedTimes as any, sortedRot as any));

            matchCount++;
        }

        console.log(`Manual VMD Parse: Matched ${matchCount} bones.`);

        let maxTime = 0;
        for (const boneName in boneMotions) {
            const times = boneMotions[boneName].times;
            if (times.length > 0) {
                const last = times.reduce((a, b) => Math.max(a, b), 0);
                if (last > maxTime) maxTime = last;
            }
        }

        const clip = new THREE.AnimationClip("VMD_Manual", maxTime, tracks);

        // Play
        if (this.animationMixer) {
            this.animationMixer.stopAllAction();
            this.animationMixer.uncacheRoot(this.currentVrm.scene);
        }

        this.animationMixer = new THREE.AnimationMixer(this.currentVrm.scene);

        const action = this.animationMixer.clipAction(clip);

        // Settings
        action.setLoop(this.config.vmdLoop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
        action.timeScale = this.config.vmdPlaybackSpeed;
        action.clampWhenFinished = !this.config.vmdLoop;

        action.play();
        console.log("Animation playing (Manual Parse)... clip dur:", clip.duration);
    }

    public updateAvatar(delta: number) {
        // Update PMX model
        if (this.modelType === 'pmx' && this.currentPmxMesh) {
            const s = this.config.avatarScale * 0.1; // PMX scale factor
            this.currentPmxMesh.scale.set(
                s * this.config.avatarScaleX,
                s * this.config.avatarScaleY,
                s * this.config.avatarScaleZ
            );
            this.currentPmxMesh.position.y = this.config.avatarY;
            this.currentPmxMesh.position.z = this.config.avatarZ;

            // Apply rotation (degrees to radians)
            this.currentPmxMesh.rotation.x = THREE.MathUtils.degToRad(this.config.avatarRotX);
            this.currentPmxMesh.rotation.y = THREE.MathUtils.degToRad(this.config.avatarRotY);
            this.currentPmxMesh.rotation.z = THREE.MathUtils.degToRad(this.config.avatarRotZ);

            // Update MMD helper for physics and animation
            if (this.mmdHelper) {
                this.mmdHelper.update(delta);
            }
            return;
        }

        // Update VRM model
        if (!this.currentVrm) return;

        // Apply Base Transform (Scale & Position) - ALWAYS run this
        const s = this.config.avatarScale;
        this.currentVrm.scene.scale.set(
            s * this.config.avatarScaleX,
            s * this.config.avatarScaleY,
            s * this.config.avatarScaleZ
        );
        this.currentVrm.scene.position.y = this.config.avatarY;
        this.currentVrm.scene.position.z = this.config.avatarZ;

        // Apply rotation (degrees to radians)
        this.currentVrm.scene.rotation.x = THREE.MathUtils.degToRad(this.config.avatarRotX);
        this.currentVrm.scene.rotation.y = THREE.MathUtils.degToRad(this.config.avatarRotY);
        this.currentVrm.scene.rotation.z = THREE.MathUtils.degToRad(this.config.avatarRotZ);

        // Update Mixer (VMD)
        if (this.animationMixer) {
            this.animationMixer.update(delta);
            this.currentVrm.update(delta);
            return;
        }

        /* Procedural Dance Disabled/Removed
        const time = this.clock.getElapsedTime();
        if (this.config.autoDance) { ... }
        */

        // Standard update if no mixer
        this.currentVrm.update(delta);
    }

    // --- Hand/Face Visualization Removed ---

    public updateCameraPosition(x: number, y: number, zScale: number) {
        // Recalculate dimensions in case config changed
        this.updateScreenDimensions();

        // x, y: [-1, 1] normalized head position
        // Map to world units based on config sensitivity

        // Apply calibration offsets first
        const offsetX = x + this.config.offsetX;
        const offsetY = y + this.config.offsetY;

        // Then apply inversion on component basis (if needed)
        let finalX = offsetX;
        let finalY = offsetY;

        if (this.config.invertX) finalX = -finalX;
        if (this.config.invertY) finalY = -finalY;

        // Select Sensitivity based on Quadrant (relative to center)
        // We use finalX/finalY signs to determine direction FROM CENTER.
        // If finalX is negative, we are moving Left -> use sensitivityX_Left.
        // If finalY is positive (Up in 3D Y), we are moving Up -> use sensitivityY_Top.
        // (Note: In 3D, +Y is Up, -Y is Down).

        const sensX = finalX < 0 ? this.config.sensitivityX_Left : this.config.sensitivityX_Right;
        const sensY = finalY > 0 ? this.config.sensitivityY_Top : this.config.sensitivityY_Bottom;

        const headX = finalX * (this.screenWidth / 2) * sensX;
        const headY = finalY * (this.config.screenHeight / 2) * sensY;

        // Z mapping
        // zScale ~ 1.0 (neutral).
        // If zScale < 1 (closer), we want smaller Z.
        // If zScale > 1 (further), we want larger Z.

        let zDelta = (zScale - 1) * this.config.zSensitivity;
        if (this.config.invertZ) {
            zDelta = -zDelta;
        }

        const headZ = this.config.baseZ * (1 + zDelta);

        // Limit Z to avoid clipping into screen or going too far
        const clampedZ = Math.max(1.0, Math.min(headZ, 200));

        this.targetPos.set(headX, headY, clampedZ);

        // Apply smoothing
        this.camera.position.lerp(this.targetPos, 0.15);

        // Reverted to Off-Axis Projection as requested
        if (this.config.lookAtCenter) {
            this.camera.lookAt(0, 0, 0);
            this.camera.updateProjectionMatrix();
        } else {
            this.camera.rotation.set(0, 0, 0);
            this.updateProjectionMatrix(this.camera.position.x, this.camera.position.y, this.camera.position.z);
        }
    }

    private updateProjectionMatrix(headX: number, headY: number, headZ: number) {
        // Screen boundaries in World Space (assuming screen is centered at 0,0,0)
        const bottom = -this.config.screenHeight / 2;
        const top = this.config.screenHeight / 2;
        const left = -this.screenWidth / 2;
        const right = this.screenWidth / 2;

        // assuming camera is at (headX, headY, headZ) and looks towards -Z.
        // screen is at Z=0.

        const near = 0.1; // small near clip

        // Relationship: screen_segment / distance_to_screen = near_segment / distance_to_near
        // distance_to_screen = headZ (since screen is at 0, camera at +Z)

        const dist = Math.max(0.1, headZ); // protect against z=0

        const l = (near * (left - headX)) / dist;
        const r = (near * (right - headX)) / dist;
        const b = (near * (bottom - headY)) / dist;
        const t = (near * (top - headY)) / dist;

        this.camera.projectionMatrix.makePerspective(l, r, t, b, near, 1000);
    }

    public render() {
        if (this.torusMesh) {
            this.torusMesh.rotation.x += 0.01;
            this.torusMesh.rotation.y += 0.01;
        }

        const delta = this.clock.getDelta();
        this.updateAvatar(delta);

        this.renderer.render(this.scene, this.camera);

        // Update YouTube Motion (Isolated Inversion)
        const baseX = this.config.youtubeX;
        const baseY = this.config.youtubeY;
        const baseZ = this.config.youtubeZ;
        const scale = this.config.youtubeScale;

        if (this.youtubeObject) {
            // Apply Transform
            // Position
            if (this.config.youtubeMotionInvert) {
                this.youtubeObject.position.x = baseX + (this.camera.position.x * 2.5);
                this.youtubeObject.position.y = baseY + (this.camera.position.y * 2.5);
                this.youtubeObject.position.z = baseZ;
            } else {
                this.youtubeObject.position.set(baseX, baseY, baseZ);
            }

            // Scale (Dynamic Update)
            this.youtubeObject.scale.set(
                this.config.youtubeMirror ? -scale : scale,
                scale,
                scale
            );
        }

        this.cssRenderer.render(this.cssScene, this.camera);
    }

    private onWindowResize() {
        this.updateScreenDimensions();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.cssRenderer.setSize(window.innerWidth, window.innerHeight);
    }

    // VMD Cache (Original declaration is at top)
    // Duplicate constructor removed.

    public updateYoutubeVideo(id: string) {
        this.config.youtubeId = id;
        this.cssScene.clear();

        const width = 1000;
        const height = 1000;

        const div = document.createElement('div');
        div.style.width = `${width}px`;
        div.style.height = `${height}px`;
        div.style.backgroundColor = '#000';

        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = '0';
        iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}`;
        div.appendChild(iframe);

        const videoObject = new CSS3DObject(div);
        videoObject.position.set(0, 0, -20); // Back Wall Z

        // Scale: 0.02
        const s = 0.02;
        videoObject.scale.set(this.config.youtubeMirror ? -s : s, s, s);
        videoObject.rotation.y = Math.PI;

        this.cssScene.add(videoObject);
        this.youtubeObject = videoObject; // Save reference
    }

    public toggleDepthObjects(visible: boolean) {
        if (this.depthGroup) {
            this.depthGroup.visible = visible;
        }
    }

    public toggleYoutube(enabled: boolean) {
        this.config.youtubeEnabled = enabled;

        if (enabled) {
            // Show YouTube, hide back wall
            if (this.backWallMesh) {
                this.backWallMesh.visible = false;
            }
            this.updateYoutubeVideo(this.config.youtubeId);
        } else {
            // Hide YouTube, show back wall
            this.cssScene.clear();
            this.youtubeObject = null;
            if (this.backWallMesh) {
                this.backWallMesh.visible = true;
            }
        }
    }

    public updateBackWallColor(color: string) {
        this.config.backWallColor = color;
        if (this.backWallMat) {
            this.backWallMat.color.set(color);
        }
    }

}
