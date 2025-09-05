let song;
let amplitude;
let fft;
let particles = [];
let playPauseBtn;

let backgroundHearts = [];
const MAX_BG_HEARTS = 5;
const fixedPositions = [
  { x: 100, y: 300 },
  { x: 350, y: 700 },
  { x: 480, y: 150 },
  { x: 1150, y: 200 },
  { x: 1280, y: 650 },
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);

  noStroke();
  colorMode(RGB);

  // Create floating heart particles
  for (let i = 0; i < 500; i++) {
    let p = new HeartParticle();
    p.y = random(height);  // start somewhere randomly visible
    particles.push(p);
  }
  // 5 heartt pos
  for (let pos of fixedPositions) {
    backgroundHearts.push(new BackgroundHeart(pos.x, pos.y));
  }
  amplitude = new p5.Amplitude();
  fft = new p5.FFT(0.8, 1024);

  // Grab play/pause button from HTML
  playPauseBtn = document.getElementById('playPauseBtn');
  playPauseBtn.disabled = true;  // disable at first because no audio loaded

  // Play/pause toggle listener
  playPauseBtn.addEventListener('click', () => {
    if (!song) return; // No song loaded, do nothing

    if (song.isPlaying()) {
      song.pause();
      playPauseBtn.textContent = 'Play';
    } else {
      song.play();
      playPauseBtn.textContent = 'Pause';
    }
  });

  // Audio file input listener
  const fileInput = document.getElementById('audioUpload');
  const nowPlayingName = document.getElementById('nowPlayingName');

  fileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('audio')) {
      if (song) song.stop(); // Stop old song
      nowPlayingName.textContent = file.name;

      song = loadSound(URL.createObjectURL(file), () => {
        song.loop();
        playPauseBtn.disabled = false;       
        playPauseBtn.textContent = 'Pause';  
      });
    } else {
      alert('Please upload a valid audio file.');
    }
  });
}

function draw() {
  background(0);

  // Mini heart floats
  for (let p of particles) {
    p.update();
    p.show();
  }

  // Update and draw background hearts
  for (let h of backgroundHearts) {
    h.update();
    h.show();
  }

  drawWaveform();

  push();
  translate(width / 2, height / 2);

  let scaleFactor = 1;
  if (song && song.isPlaying()) {
    fft.analyze();
    let midEnergy = fft.getEnergy("mid");
    let bassEnergy = fft.getEnergy("bass");
    let trebleEnergy = fft.getEnergy("treble");
    scaleFactor = map(midEnergy, 0, 255, 0.8, 1.4);
  }
  scale(50 * scaleFactor);

  noStroke();
  drawHeartGradient();

  pop();
}


// 5BackgroundHeart 
class BackgroundHeart {
  constructor(x, y) {
    this.baseSize = 30;
    this.x = x;
    this.y = y;
    this.alpha = 255; 
    this.respawn();
    this.size = this.baseSize;
    this.isBursting = false;
    this.burstTimer = 0;
    this.burstDuration = 30;
    this.respawnDelay = 60;
    this.delayCounter = 0;
    this.visible = true;
  }

  respawn() {
    this.size = this.baseSize;
    this.alpha = 0;
    this.isBursting = false;
    this.burstTimer = 0;
    this.delayCounter = 0;
    this.visible = true;
  }

  update() {
    if (this.isBursting) {
      this.burstTimer++;
      this.size += 2;
      this.alpha = map(this.burstTimer, 0, this.burstDuration, 255, 0); 
      if (this.burstTimer > this.burstDuration) {
        this.isBursting = false;
        this.visible = false;
      }
    } else if (!this.visible) {
      this.delayCounter++;
      if (this.delayCounter > this.respawnDelay) {
        this.respawn();
      }
    } else if (this.alpha < 255) {
      this.alpha += 10; // fade in
      this.alpha = min(this.alpha, 255);
    }
  }

  show() {
    if (!this.visible && this.alpha <= 0) return;

    push();
    translate(this.x, this.y);

    const ctx = drawingContext;
    ctx.shadowColor = `rgba(255, 128, 191, ${this.alpha / 255})`;
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    noStroke();
    fill(255, 128, 191, this.alpha);
    scale(this.size / 20);
    drawMiniHeart();
    pop();
  }

  contains(px, py) {
    let d = dist(px, py, this.x, this.y);
    return d < this.size / 2;
  }

  burst() {
    this.isBursting = true;
    this.burstTimer = 0;
  }
}

function mousePressed() {
  // Check background hearts first
  for (let h of backgroundHearts) {
    if (!h.isBursting && h.contains(mouseX, mouseY)) {
      h.burst();
      return; // only burst one per click
    }
  }
}


//MAIN HEAR

function drawHeart() {
  beginShape();
  vertex(0, -1);

  // Right lobe
  bezierVertex(2, -5, 7, -1, 0, 3.5);

  // Left lobe (mirrored)
  bezierVertex(-7, -1, -2, -5, 0, -1);

  endShape(CLOSE);
}

function drawWaveform(bassEnergy) {
  let waveform = fft.waveform();
  noFill();
  stroke(255, 0, 100);
  strokeWeight(2);

  beginShape();
  for (let i = 0; i < waveform.length; i++) {
    let x = map(i, 0, waveform.length, 0, width);
    let y = map(waveform[i], -1, 1, height / 2 + 50, height / 2 - 50);
    vertex(x, y);
  }
  endShape();
}
//bg mini
class HeartParticle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = random(width);
    this.y = random(height, height + 100);
    this.size = random(5, 12);
    this.speedY = random(-1, -0.3);
    this.driftX = random(-0.3, 0.3);
    this.alpha = random(100, 200);

    const colors = [
      [255, 107, 171],
      [255, 0, 64],
      [255, 128, 191]
    ];
    this.color = random(colors);
  }

  update() {
    let d = dist(this.x, this.y, mouseX, mouseY);
    let avoidRadius = 70;
    let avoidStrength = 3;

    if (d < avoidRadius) {
      if (this.x < mouseX) {
        this.x -= avoidStrength;
      } else if (this.y < mouseY) {
        this.y -= avoidStrength;
      } else if (this.y > mouseY) {
        this.y += avoidStrength;
      } else {
        this.x += avoidStrength;
      }
    } else {
      this.x += this.driftX;
    }

    this.y += this.speedY;

    if (this.y < -this.size) {
      this.reset();
      this.y = height + this.size;
    }
  }

  show() {
    push();
    translate(this.x, this.y);
    scale(this.size / 20);
    noStroke();
    fill(this.color[0], this.color[1], this.color[2], this.alpha);
    drawMiniHeart();
    pop();
  }
}

function drawMiniHeart() {
  beginShape();
  scale(3);
  vertex(0, -5);
  bezierVertex(3, -10, 10, -5, 0, 5);
  bezierVertex(-10, -5, -3, -10, 0, -5);
  endShape(CLOSE);
}

function drawHeartGradient() {
  const ctx = drawingContext;
  ctx.save();

  ctx.shadowColor = '#FF6BAB';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.bezierCurveTo(2, -5, 7, -1, 0, 3.5);
  ctx.bezierCurveTo(-7, -1, -2, -5, 0, -1);
  ctx.closePath();
  ctx.fillStyle = '#FF0064';
  ctx.fill();

  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.bezierCurveTo(2, -5, 7, -1, 0, 3.5);
  ctx.bezierCurveTo(-7, -1, -2, -5, 0, -1);
  ctx.closePath();
  ctx.clip();

  let grad = ctx.createRadialGradient(0, 0, 1, 0, 0, 7);
  grad.addColorStop(0, '#FF6BAB');
  grad.addColorStop(0.7, '#FF0064');
  grad.addColorStop(1, '#FF0064');
  ctx.fillStyle = grad;
  ctx.fillRect(-7, -7, 14, 14);

  ctx.restore();
}
