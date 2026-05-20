/**
 * AnimationManager — Controls the runway canvas: procedural sky with clouds,
 * ATL control tower, runway stripes, plane sprite, and takeoff animation.
 *
 * ASSET REQUIREMENTS:
 * - Plane sprite: 200×80px (transparent PNG, facing right), placed at assets/images/plane.png
 *   (Falls back to procedural plane if missing)
 */
class AnimationManager {
  constructor(canvas, emitter) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._emitter = emitter;

    // State
    this._speed = 0;
    this._targetSpeed = 0;
    this._planeX = 0.08;
    this._planeTargetX = 0.08;
    this._planeY = 0.68;
    this._takeoffActive = false;
    this._takeoffProgress = 0;
    this._animFrame = null;
    this._runwayOffset = 0;
    this._baseStripeSpeed = 0.5;
    this._time = 0;

    // Clouds
    this._clouds = [];
    this._initClouds();

    // Tower position (scrolls slowly)
    this._towerX = 0.85; // normalized, starts near right

    // Plane image
    this._planeImage = null;
    this._planeLoaded = false;

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const rect = this._canvas.parentElement.getBoundingClientRect();
    this._canvas.width = rect.width * window.devicePixelRatio;
    this._canvas.height = rect.height * window.devicePixelRatio;
    this._ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    this._w = rect.width;
    this._h = rect.height;
  }

  _initClouds() {
    // Create a set of clouds at random positions
    for (let i = 0; i < 6; i++) {
      this._clouds.push({
        x: Math.random() * 1.4, // normalized, can start off-screen right
        y: 0.08 + Math.random() * 0.35,
        width: 0.08 + Math.random() * 0.12,
        height: 0.03 + Math.random() * 0.04,
        opacity: 0.4 + Math.random() * 0.4,
        speed: 0.0001 + Math.random() * 0.0002,
      });
    }
  }

  loadAssets(bgPath, planePath) {
    if (planePath) {
      this._planeImage = new Image();
      this._planeImage.onload = () => { this._planeLoaded = true; };
      this._planeImage.src = planePath;
    }
  }

  start() {
    if (this._animFrame) return;
    this._loop();
  }

  stop() {
    if (this._animFrame) {
      cancelAnimationFrame(this._animFrame);
      this._animFrame = null;
    }
  }

  setSpeed(speed) {
    this._targetSpeed = speed / 100;
    this._planeTargetX = 0.08 + (speed / 100) * 0.67;
  }

  triggerTakeoff() {
    this._takeoffActive = true;
    this._takeoffProgress = 0;
  }

  _loop() {
    this._update();
    this._draw();
    this._animFrame = requestAnimationFrame(() => this._loop());
  }

  _update() {
    this._time++;

    // Smooth speed interpolation
    this._speed += (this._targetSpeed - this._speed) * 0.04;

    // Smooth plane X interpolation (skip during takeoff — takeoff controls position directly)
    if (!this._takeoffActive) {
      this._planeX += (this._planeTargetX - this._planeX) * 0.03;
    }

    // Runway stripe scroll (moving left-to-right to simulate forward motion)
    const stripeSpeed = this._baseStripeSpeed + this._speed * 6;
    this._runwayOffset -= stripeSpeed;

    // Cloud movement (right to left, speed increases with plane speed)
    const cloudSpeedMultiplier = 1 + this._speed * 3;
    for (const cloud of this._clouds) {
      cloud.x -= cloud.speed * cloudSpeedMultiplier;
      // Wrap around when off-screen left
      if (cloud.x + cloud.width < -0.1) {
        cloud.x = 1.1 + Math.random() * 0.3;
        cloud.y = 0.08 + Math.random() * 0.35;
        cloud.opacity = 0.4 + Math.random() * 0.4;
      }
    }

    // Tower movement (very slow drift right to left)
    const towerSpeed = 0.00015 + this._speed * 0.0008;
    this._towerX -= towerSpeed;
    // Wrap tower
    if (this._towerX < -0.15) {
      this._towerX = 1.15;
    }

    // Takeoff animation: realistic commercial takeoff, exits right side
    if (this._takeoffActive) {
      this._takeoffProgress += 0.004;
      // Moderate horizontal acceleration — plane exits via the right edge
      this._planeX += 0.005 + this._takeoffProgress * 0.003;
      // Gentle climb — visible upward ascent while still exiting right
      this._planeY -= 0.004;
      if (this._planeX > 1.3) {
        this._takeoffActive = false;
        this._emitter.emit('takeoffComplete');
      }
    }
  }

  _draw() {
    const ctx = this._ctx;
    const w = this._w;
    const h = this._h;

    // --- Sky gradient ---
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.75);
    skyGrad.addColorStop(0, '#4a90d9');   // upper sky blue
    skyGrad.addColorStop(0.5, '#7ab8e0'); // mid sky
    skyGrad.addColorStop(1, '#b8d4e8');   // horizon haze
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.75);

    // --- Clouds ---
    for (const cloud of this._clouds) {
      this._drawCloud(ctx, cloud.x * w, cloud.y * h, cloud.width * w, cloud.height * h, cloud.opacity);
    }

    // --- ATL Control Tower ---
    this._drawTower(ctx, this._towerX * w, h * 0.75);

    // --- Ground/grass strip ---
    ctx.fillStyle = '#3d6b35';
    ctx.fillRect(0, h * 0.72, w, h * 0.06);

    // --- Runway surface ---
    const runwayY = h * 0.75;
    const runwayH = h * 0.14;
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, runwayY, w, runwayH);

    // Runway edge lines
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, runwayY + 1);
    ctx.lineTo(w, runwayY + 1);
    ctx.moveTo(0, runwayY + runwayH - 1);
    ctx.lineTo(w, runwayY + runwayH - 1);
    ctx.stroke();

    // Runway center dashes (scrolling)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.setLineDash([40, 25]);
    ctx.lineDashOffset = -this._runwayOffset;
    ctx.beginPath();
    ctx.moveTo(0, runwayY + runwayH / 2);
    ctx.lineTo(w, runwayY + runwayH / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // --- Plane ---
    const planeX = w * this._planeX;
    const planeY = h * this._planeY + 15;
    this._drawPlane(ctx, planeX, planeY);
  }

  _drawCloud(ctx, x, y, w, h, opacity) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = '#ffffff';

    // Cloud is a cluster of overlapping ellipses
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.5, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x - w * 0.3, y + h * 0.2, w * 0.35, h * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.3, y + h * 0.15, w * 0.4, h * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.15, y - h * 0.3, w * 0.3, h * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawTower(ctx, x, groundY) {
    // ATL-style control tower: tall narrow shaft with wider cab on top
    const towerH = this._h * 0.35;
    const shaftW = 14;
    const cabW = 36;
    const cabH = 22;
    const baseY = groundY - 4;

    ctx.save();

    // Tower shaft
    ctx.fillStyle = '#5a6a7a';
    ctx.fillRect(x - shaftW / 2, baseY - towerH, shaftW, towerH);

    // Shaft detail lines
    ctx.strokeStyle = '#4a5a6a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - shaftW / 2 + 3, baseY - towerH + 30);
    ctx.lineTo(x - shaftW / 2 + 3, baseY);
    ctx.moveTo(x + shaftW / 2 - 3, baseY - towerH + 30);
    ctx.lineTo(x + shaftW / 2 - 3, baseY);
    ctx.stroke();

    // Support flare at base
    ctx.fillStyle = '#4a5a6a';
    ctx.beginPath();
    ctx.moveTo(x - shaftW / 2, baseY);
    ctx.lineTo(x - shaftW - 4, baseY);
    ctx.lineTo(x - shaftW / 2, baseY - 20);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + shaftW / 2, baseY);
    ctx.lineTo(x + shaftW + 4, baseY);
    ctx.lineTo(x + shaftW / 2, baseY - 20);
    ctx.closePath();
    ctx.fill();

    // Cab (observation deck) — wider rectangle with windows
    const cabY = baseY - towerH - cabH / 2;
    ctx.fillStyle = '#3a4a5a';
    ctx.fillRect(x - cabW / 2, cabY, cabW, cabH);

    // Cab windows (tinted glass band)
    ctx.fillStyle = 'rgba(135,206,235,0.7)';
    ctx.fillRect(x - cabW / 2 + 3, cabY + 4, cabW - 6, cabH * 0.5);

    // Window frame lines
    ctx.strokeStyle = '#2a3a4a';
    ctx.lineWidth = 1;
    const windowTop = cabY + 4;
    const windowH = cabH * 0.5;
    for (let i = 1; i < 5; i++) {
      const wx = x - cabW / 2 + 3 + (cabW - 6) * (i / 5);
      ctx.beginPath();
      ctx.moveTo(wx, windowTop);
      ctx.lineTo(wx, windowTop + windowH);
      ctx.stroke();
    }

    // Roof / antenna platform
    ctx.fillStyle = '#3a4a5a';
    ctx.fillRect(x - cabW / 2 - 2, cabY - 4, cabW + 4, 5);

    // Antenna
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, cabY - 4);
    ctx.lineTo(x, cabY - 24);
    ctx.stroke();

    // Antenna tip light (blinking)
    const blink = Math.sin(this._time * 0.05) > 0.3;
    if (blink) {
      ctx.fillStyle = '#ff3333';
      ctx.beginPath();
      ctx.arc(x, cabY - 25, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _drawPlane(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);

    // Gradual rotation during takeoff — eases up to ~15° for realistic commercial climb
    if (this._takeoffActive) {
      const eased = 1 - Math.pow(1 - Math.min(this._takeoffProgress * 2, 1), 2);
      const angle = -eased * 0.26; // ~15 degrees max
      ctx.rotate(angle);
    }

    if (this._planeLoaded && this._planeImage) {
      const drawW = Math.min(this._w * 0.15, 150);
      const drawH = drawW * 0.4;
      ctx.drawImage(this._planeImage, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      this._drawFallbackPlane(ctx);
    }

    ctx.restore();
  }

  _drawFallbackPlane(ctx) {
    const size = Math.min(this._w * 0.08, 50);

    ctx.fillStyle = '#c0d0e0';
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 1.5;

    // Fuselage
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Wings
    ctx.beginPath();
    ctx.moveTo(-size * 0.2, 0);
    ctx.lineTo(-size * 0.1, -size * 0.5);
    ctx.lineTo(size * 0.2, -size * 0.5);
    ctx.lineTo(size * 0.1, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tail
    ctx.beginPath();
    ctx.moveTo(-size * 0.8, 0);
    ctx.lineTo(-size * 0.9, -size * 0.35);
    ctx.lineTo(-size * 0.6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Engine glow
    if (this._speed > 0.1) {
      const glowAlpha = this._speed * 0.6;
      ctx.fillStyle = `rgba(232,135,61,${glowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(-size * 0.95, 0, size * 0.15 + this._speed * 8, size * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  reset() {
    this._speed = 0;
    this._targetSpeed = 0;
    this._planeX = 0.08;
    this._planeTargetX = 0.08;
    this._planeY = 0.68;
    this._takeoffActive = false;
    this._takeoffProgress = 0;
    this._runwayOffset = 0;
    this._towerX = 0.85;
  }
}

window.AnimationManager = AnimationManager;
