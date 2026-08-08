// Dynamic Image-Based Particle Morphing Canvas (Optimized & High Performance)
// Loads transparent partner logos and morphs particles to form their exact shapes

class ParticleLogo {
  constructor(canvasId, containerId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.container = document.getElementById(containerId);
    
    this.particles = [];
    this.maxParticles = 2000; // Optimal resolution for transparent logo outlines
    this.logoData = {
      eureka: [],
      ecell: [],
      nec: []
    };
    
    this.logoImages = {
      eureka: 'uploads/logos/eureka-logo.png',
      ecell: 'uploads/logos/ecell-logo.png',
      nec: 'uploads/logos/nec-logo.png'
    };
    
    this.activeLogoIndex = 1; // 1 = Eureka, 2 = ECell, 3 = NEC
    this.state = 'FORMING'; // FORMING, DEFORMING
    this.stateStartTime = performance.now();
    this.stateDuration = 4500; // Show logo for 4.5s
    this.deformDuration = 1200; // Deform/transition for 1.2s
    
    this.mouse = { x: -1000, y: -1000, active: false, radius: 100 };
    
    this.init();
  }

  async init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    // Clean up slideshow overlay if it was created in previous sessions
    const oldSlideshow = document.getElementById('logo-image-slideshow');
    if (oldSlideshow) oldSlideshow.remove();
    
    // Mouse events
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.mouse.active = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.x = -1000;
      this.mouse.y = -1000;
      this.mouse.active = false;
    });
    
    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.touches[0].clientX - rect.left;
        this.mouse.y = e.touches[0].clientY - rect.top;
        this.mouse.active = true;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => {
      this.mouse.x = -1000;
      this.mouse.y = -1000;
      this.mouse.active = false;
    }, { passive: true });

    // Load and scan images
    try {
      const [imgEureka, imgEcell, imgNec] = await Promise.all([
        this.loadImage(this.logoImages.eureka),
        this.loadImage(this.logoImages.ecell),
        this.loadImage(this.logoImages.nec)
      ]);
      
      this.logoData.eureka = this.scanImage(imgEureka, 'EUREKA');
      this.logoData.ecell = this.scanImage(imgEcell, 'ECELL');
      this.logoData.nec = this.scanImage(imgNec, 'NEC');
      
      this.setupParticles();
      this.animate();
    } catch (err) {
      console.error('Error loading partner logos:', err);
    }
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
    });
  }

  scanImage(img, name) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return [];
    
    // Fit image inside canvas boundaries with scaling
    const isMobile = this.width < 768;
    const maxDimension = isMobile ? Math.min(this.width * 0.9, 320) : Math.min(this.width * 0.8, 520);
    const scale = maxDimension / img.width;
    const w = Math.floor(img.width * scale);
    const h = Math.floor(img.height * scale);
    
    tempCanvas.width = w;
    tempCanvas.height = h;
    tempCtx.drawImage(img, 0, 0, w, h);
    
    const imgData = tempCtx.getImageData(0, 0, w, h).data;
    const coords = [];
    const ox = (this.width - w) / 2;
    const oy = (this.height - h) / 2;
    
    // Grid scan density based on name/mobile
    const step = name === 'EUREKA' ? (isMobile ? 1.8 : 1.3) : (isMobile ? 2.0 : 1.5);
    
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const index = (Math.floor(y) * w + Math.floor(x)) * 4;
        const r = imgData[index];
        const g = imgData[index + 1];
        const b = imgData[index + 2];
        const a = imgData[index + 3];
        const brightness = (r + g + b) / 3;
        
        // Scan non-transparent and reasonably bright logo pixels
        if (a > 75 && brightness > 15) {
          coords.push({
            x: ox + x,
            y: oy + y,
            color: `rgb(${r},${g},${b})`
          });
        }
      }
    }
    return coords;
  }

  setupParticles() {
    const l1 = this.logoData.eureka.length;
    const l2 = this.logoData.ecell.length;
    const l3 = this.logoData.nec.length;
    this.maxParticles = Math.max(l1, l2, l3, 1800);
    
    const getTarget = (array, index) => {
      if (array.length === 0) {
        return { x: this.width / 2, y: this.height / 2, color: '#a855f7' };
      }
      return array[index % array.length];
    };
    
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      const t1 = getTarget(this.logoData.eureka, i);
      const t2 = getTarget(this.logoData.ecell, i);
      const t3 = getTarget(this.logoData.nec, i);
      
      // Initialize particles randomly around first target
      this.particles.push({
        x: t1.x + (Math.random() - 0.5) * 160,
        y: t1.y + (Math.random() - 0.5) * 160,
        vx: 0,
        vy: 0,
        size: Math.random() * 1.4 + 1.1,
        color: t1.color,
        targetX: t1.x,
        targetY: t1.y,
        targetColor: t1.color,
        t1X: t1.x, t1Y: t1.y, t1Color: t1.color,
        t2X: t2.x, t2Y: t2.y, t2Color: t2.color,
        t3X: t3.x, t3Y: t3.y, t3Color: t3.color
      });
    }
  }

  resize() {
    this.width = this.container ? this.container.offsetWidth : window.innerWidth * 0.45;
    this.height = this.container ? this.container.offsetHeight : 480;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    
    // Rescan if images are already loaded
    if (this.logoData.eureka.length > 0) {
      this.init(); // Reload and rescan
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    const now = performance.now();
    const elapsed = now - this.stateStartTime;
    
    // State machine updates
    if (this.state === 'FORMING' && elapsed >= this.stateDuration) {
      this.state = 'DEFORMING';
      this.stateStartTime = now;
    } else if (this.state === 'DEFORMING' && elapsed >= this.deformDuration) {
      this.activeLogoIndex = (this.activeLogoIndex % 3) + 1;
      this.state = 'FORMING';
      this.stateStartTime = now;
      
      // Assign new targets
      this.particles.forEach(p => {
        if (this.activeLogoIndex === 1) {
          p.targetX = p.t1X; p.targetY = p.t1Y; p.targetColor = p.t1Color;
        } else if (this.activeLogoIndex === 2) {
          p.targetX = p.t2X; p.targetY = p.t2Y; p.targetColor = p.t2Color;
        } else {
          p.targetX = p.t3X; p.targetY = p.t3Y; p.targetColor = p.t3Color;
        }
      });
    }
    
    const mouseRadiusSq = this.mouse.radius * this.mouse.radius;
    
    // Update & draw particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      
      if (this.state === 'FORMING') {
        // Move towards target
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        p.vx += dx * 0.07;
        p.vy += dy * 0.07;
        p.vx *= 0.81;
        p.vy *= 0.81;
      } else {
        // Explode / Drift
        p.vx += (Math.random() - 0.5) * 1.5;
        p.vy += (Math.random() - 0.5) * 1.5;
        p.vx *= 0.94;
        p.vy *= 0.94;
      }
      
      // Mouse push/repulsion
      if (this.mouse.active) {
        const mdx = p.x - this.mouse.x;
        const mdy = p.y - this.mouse.y;
        const distSq = mdx * mdx + mdy * mdy;
        
        if (distSq < mouseRadiusSq && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const force = (this.mouse.radius - dist) / this.mouse.radius;
          const angle = Math.atan2(mdy, mdx);
          p.vx += Math.cos(angle) * force * 5;
          p.vy += Math.sin(angle) * force * 5;
        }
      }
      
      p.x += p.vx;
      p.y += p.vy;
      
      // Color interpolation
      p.color = p.targetColor;
      
      // Draw particle as tiny square (much faster than circle arcs)
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    
    requestAnimationFrame(() => this.animate());
  }
}

// Instantiate
document.addEventListener('DOMContentLoaded', () => {
  window.logoCanvas = new ParticleLogo('logo-canvas', 'logo-canvas-container');
});
