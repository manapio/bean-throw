const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ===============================
// スコア
// ===============================
let score = 0;
let hitCooldownUntil = 0;

// ===============================
// 人の当たり判定
// ===============================
let human = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 120,
  detected: false
};

// ===============================
// MediaPipe Pose
// ===============================
const pose = new Pose({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
  modelComplexity: 0,
  smoothLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

pose.onResults((results) => {
  if (!results.poseLandmarks) return;

  const leftShoulder = results.poseLandmarks[11];
  const rightShoulder = results.poseLandmarks[12];
  const leftHip = results.poseLandmarks[23];
  const rightHip = results.poseLandmarks[24];

  human.x =
    ((leftShoulder.x + rightShoulder.x) / 2) * canvas.width;
  human.y =
    ((leftHip.y + rightHip.y) / 2) * canvas.height;

  human.detected = true;
});

// ===============================
// カメラ起動
// ===============================
navigator.mediaDevices.getUserMedia({
  video: { facingMode: "environment" },
  audio: false
}).then(stream => {
  video.srcObject = stream;

  const camera = new Camera(video, {
    onFrame: async () => {
      await pose.send({ image: video });
    },
    width: 640,
    height: 480
  });
  camera.start();
});

// ===============================
// 豆クラス
// ===============================
class Bean {
  constructor() {
    this.startX = canvas.width / 2;
    this.startY = canvas.height - 80;
    this.x = this.startX;
    this.y = this.startY;
    this.t = 0;
    this.active = true;
  }

  update() {
    this.t += 0.03;
    this.x = this.startX;
    this.y =
      this.startY -
      300 * this.t +
      200 * this.t * this.t;
    this.scale = 1 - this.t * 0.6;
    if (this.t > 1) this.active = false;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);
    ctx.fillStyle = "#c49a6c";
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

let beans = [];

// ===============================
// 操作
// ===============================
window.addEventListener("touchstart", (e) => {
  e.preventDefault();
  beans.push(new Bean());
}, { passive: false });

window.addEventListener("click", () => {
  beans.push(new Bean());
});

// ===============================
// メインループ
// ===============================
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 人の当たり判定（デバッグ用）
  if (human.detected) {
    ctx.beginPath();
    ctx.arc(human.x, human.y, human.radius, 0, Math.PI * 2);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  beans.forEach(bean => {
    if (!bean.active) return;
    bean.update();

    if (
      human.detected &&
      bean.t > 0.7 &&
      Date.now() > hitCooldownUntil
    ) {
      const dx = bean.x - human.x;
      const dy = bean.y - human.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < human.radius) {
        score++;
        hitCooldownUntil = Date.now() + 800;
        bean.active = false;
      }
    }

    bean.draw();
  });

  beans = beans.filter(b => b.active);

  // スコア表示
  ctx.fillStyle = "white";
  ctx.font = "bold 32px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(`HIT : ${score}`, canvas.width / 2, 50);

  requestAnimationFrame(loop);
}

loop();
