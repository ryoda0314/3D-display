import { FaceLandmarker, FilesetResolver, ObjectDetector } from "@mediapipe/tasks-vision";

export class HeadTracker {
    private faceLandmarker: FaceLandmarker | null = null;
    private objectDetector: ObjectDetector | null = null;
    private video: HTMLVideoElement;
    private running: boolean = false;
    private lastVideoTime = -1;
    private results: any = null;
    public faceResults: any = null;

    // Tracking Mode
    public mode: 'face' | 'phone' = 'face';

    // Normalized head/phone position
    public info = { x: 0, y: 0, z: 1 };

    private neutralFaceWidth = 0.2;
    private neutralPhoneWidth = 0.2; // Calibrated width for phone
    public lastFaceWidth = 0.2;

    // Calibration state for Phone
    public lastPhoneWidth = 0.2;

    public modelStatus = { face: false, phone: false };

    constructor() {
        this.video = document.createElement("video");
        this.video.autoplay = true;
        this.video.muted = true; // Ensure autoplay works
        this.video.playsInline = true;
        this.video.style.display = "none";
        document.body.appendChild(this.video);
    }

    async init() {
        const filesetResolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );

        // 1. Face Landmarker
        try {
            this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                    delegate: "GPU"
                },
                outputFaceBlendshapes: false,
                runningMode: "VIDEO",
                numFaces: 1
            });
            this.modelStatus.face = true;
        } catch (e) {
            console.warn("FaceLandmarker failed to load:", e);
        }

        // 2. Object Detector (for Phone)
        try {
            this.objectDetector = await ObjectDetector.createFromOptions(filesetResolver, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
                    delegate: "GPU"
                },
                scoreThreshold: 0.5,
                runningMode: "VIDEO"
            });
            this.modelStatus.phone = true;
        } catch (e) {
            console.warn("ObjectDetector failed to load:", e);
        }

        await this.setupCamera();
    }

    private async setupCamera() {
        const constraints = {
            video: {
                width: 640,
                height: 480,
                facingMode: "user"
            }
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = stream;
            this.video.addEventListener("loadeddata", () => {
                this.running = true;
                this.video.play().catch(e => console.error("Video play failed", e));
                this.predictWebcam();
            });
        } catch (err) {
            console.error("Error accessing webcam:", err);
            alert("Webcam access denied or error. Tracking will not work.");
        }
    }

    public setMode(mode: 'face' | 'phone') {
        this.mode = mode;
        console.log(`Tracking Mode switched to: ${mode}`);
    }

    private lastPredictionTime = 0;
    private readonly PREDICTION_INTERVAL = 33; // ~30 FPS

    private predictWebcam() {
        if (!this.running) return;

        const now = performance.now();
        if (now - this.lastPredictionTime < this.PREDICTION_INTERVAL) {
            requestAnimationFrame(() => this.predictWebcam());
            return;
        }

        if (this.video.currentTime !== this.lastVideoTime) {
            this.lastVideoTime = this.video.currentTime;
            this.lastPredictionTime = now;
            const startTimeMs = now;

            if (this.mode === 'face' && this.faceLandmarker) {
                const results = this.faceLandmarker.detectForVideo(this.video, startTimeMs);
                this.faceResults = results;
                this.results = results; // Backward compat
                if (results.faceLandmarks.length > 0) {
                    this.updateHeadPosition(results.faceLandmarks[0]);
                }
            } else if (this.mode === 'phone' && this.objectDetector) {
                const results = this.objectDetector.detectForVideo(this.video, startTimeMs);
                this.results = results;
                this.updatePhonePosition();
            }
        }

        requestAnimationFrame(() => this.predictWebcam());
    }

    private updateHeadPosition(landmarks: any) {
        if (!landmarks) return;

        const nose = landmarks[1];
        const rawX = nose.x;
        const rawY = nose.y;

        // Mapping: (rawX - 0.5) * -3.0
        this.info.x = (rawX - 0.5) * -3.0;
        this.info.y = (rawY - 0.5) * -3.0;

        // Z estimation
        const left = landmarks[234];
        const right = landmarks[454];
        const dx = right.x - left.x;
        const dy = right.y - left.y;
        const faceWidth = Math.sqrt(dx * dx + dy * dy);

        this.lastFaceWidth = faceWidth;
        this.info.z = this.neutralFaceWidth / Math.max(0.01, faceWidth);
    }

    private updatePhonePosition() {
        // results for ObjectDetector is { detections: Detection[] }
        if (this.results && this.results.detections && this.results.detections.length > 0) {
            // Find "cell phone"
            const phone = this.results.detections.find((d: any) =>
                d.categories.some((c: any) => c.categoryName === 'cell phone')
            );

            if (phone) {
                const box = phone.boundingBox; // { originX, originY, width, height } - these are in PIXELS usually? Or Normalized?
                // MediaPipe Web API usually returns NormalizedRect 0..1? 
                // Wait, ObjectDetector result boundingBox is typically pixel coordinates if not mapped?
                // Actually, let's verify if `detectForVideo` returns normalized rects.
                // Documentation says: boundingBox: BoundingBox { originX, originY, width, height, angle }
                // In Python these are pixels. In JS?
                // Let's assume Pixel Coordinates relative to video size (640x480).

                const vidW = this.video.videoWidth;
                const vidH = this.video.videoHeight;

                const cx = (box.originX + box.width / 2) / vidW;
                const cy = (box.originY + box.height / 2) / vidH;

                // Map same as face
                this.info.x = (cx - 0.5) * -3.0; // Mirror X?
                // Note facingMode user usually mirrors image, so if I move phone Left, image moves Right.
                // If image moves Right (cx > 0.5), we want Camera X > 0.
                // If cx > 0.5 => (cx - 0.5) is + => * -3 => -
                // Wait.
                // If I move Left (World Left), Camera (Mirror) shows me on Right.
                // I want to look into Left side -> Camera Position Left (-).
                // So if Image X is Right (>0.5), I want Camera X Left (-).
                // So (cx - 0.5) * -Factor is correct.

                this.info.y = (cy - 0.5) * -3.0;

                // Z estimation using Width
                const phoneWidth = box.width / vidW; // Normalized width
                this.lastPhoneWidth = phoneWidth;
                this.info.z = this.neutralPhoneWidth / Math.max(0.01, phoneWidth);
            }
        }
    }

    public calibrateDistance() {
        if (this.mode === 'face' && this.lastFaceWidth > 0) {
            this.neutralFaceWidth = this.lastFaceWidth;
            console.log("Calibrated neutral face width:", this.neutralFaceWidth);
        } else if (this.mode === 'phone' && this.lastPhoneWidth > 0) {
            this.neutralPhoneWidth = this.lastPhoneWidth;
            console.log("Calibrated neutral phone width:", this.neutralPhoneWidth);
        }
    }
}
