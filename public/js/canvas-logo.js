// Dynamic Particle Logo Morphing Canvas (Optimized for Split-Screen & Constellations)
// Generates ultra-smooth high-resolution particle morphs of the official "E-CELL SIT" and "IITB NEC 2026" logos

class ParticleLogo {
  constructor(canvasId, containerId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.container = document.getElementById(containerId);
    
    this.particles = [];
    this.maxParticles = 1800; // High particle count for high-resolution outlines
    this.states = ['EUREKA', 'E-CELL SIT', 'NEC 2026', 'SPIN'];
    this.currentStateIndex = 0;
    this.stateTimer = null;
    
    // Mouse properties for push and constellation interaction
    this.mouse = { x: -1000, y: -1000, active: false, radius: 100 };
    
    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
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

    // Populate particles pool
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: 0,
        vy: 0,
        tx: this.width / 2,
        ty: this.height / 2,
        size: Math.random() * 1.5 + 1.2,
        color: '#a855f7',
        targetColor: '#a855f7',
        alpha: Math.random() * 0.4 + 0.6
      });
    }

    // Set first morph target
    this.setMorphTargets(this.states[this.currentStateIndex]);
    
    // Start cycles
    this.startMorphCycle();
    this.animate();
  }

  resize() {
    this.width = this.container ? this.container.offsetWidth : window.innerWidth * 0.45;
    this.height = this.container ? this.container.offsetHeight : 480;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    
    if (this.particles.length > 0) {
      this.setMorphTargets(this.states[this.currentStateIndex]);
    }
  }

  // Draw and scan targets (E-CELL SIT and IITB NEC 2026 draw exact replica structures)
  getCoordinates(stateName) {
    const coords = [];
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCanvas.width = this.width;
    tempCanvas.height = this.height;
    
    if (stateName === 'EUREKA') {
      // Draw the exact custom vector components of the E-Cell Eureka logo!
      const svgW = 220;
      const svgH = 62;
      
      const scale = Math.min(this.width / svgW, this.height / svgH) * 0.85;
      const ox = (this.width - svgW * scale) / 2;
      const oy = (this.height - svgH * scale) / 2;

      tempCtx.textBaseline = 'alphabetic';
      tempCtx.textAlign = 'left';
      
      // 1. Draw "E-CELL SIT'S" tagline header
      tempCtx.fillStyle = '#ffffff';
      tempCtx.font = `700 ${6.5 * scale}px 'Space Grotesk', sans-serif`;
      tempCtx.fillText("E-CELL SIT'S", ox + 50 * scale, oy + 12 * scale);
      
      // 2. Draw vertical purple bars
      tempCtx.fillStyle = '#a855f7';
      tempCtx.fillRect(ox + 5 * scale, oy + 26 * scale, 5 * scale, 15 * scale);
      tempCtx.fillRect(ox + 13 * scale, oy + 18 * scale, 5 * scale, 23 * scale);
      tempCtx.fillRect(ox + 21 * scale, oy + 10 * scale, 5 * scale, 31 * scale);
      
      // 3. Draw horizontal white lines of letter "E"
      tempCtx.fillStyle = '#ffffff';
      tempCtx.fillRect(ox + 26 * scale, oy + 10 * scale, 13 * scale, 5 * scale);
      tempCtx.fillRect(ox + 26 * scale, oy + 23 * scale, 9 * scale, 5 * scale);
      tempCtx.fillRect(ox + 26 * scale, oy + 36 * scale, 13 * scale, 5 * scale);
      
      // 4. Draw large "UREKA" white bold text
      tempCtx.fillStyle = '#ffffff';
      tempCtx.font = `900 ${34 * scale}px 'Space Grotesk', sans-serif`;
      tempCtx.fillText("UREKA", ox + 43 * scale, oy + 41 * scale);
      
      // 5. Draw visual borders/framing components
      tempCtx.fillStyle = '#ffffff';
      tempCtx.fillRect(ox + 200 * scale, oy + 10 * scale, 5 * scale, 21 * scale);
      
      tempCtx.beginPath();
      tempCtx.moveTo(ox + 200 * scale, oy + 35 * scale);
      tempCtx.lineTo(ox + 205 * scale, oy + 35 * scale);
      tempCtx.lineTo(ox + 204 * scale, oy + 41 * scale);
      tempCtx.lineTo(ox + 199 * scale, oy + 41 * scale);
      tempCtx.closePath();
      tempCtx.fill();
      
      // Footer bar frame
      tempCtx.beginPath();
      tempCtx.moveTo(ox + 21 * scale, oy + 46 * scale);
      tempCtx.lineTo(ox + 165 * scale, oy + 46 * scale);
      tempCtx.lineTo(ox + 161 * scale, oy + 54 * scale);
      tempCtx.lineTo(ox + 21 * scale, oy + 54 * scale);
      tempCtx.closePath();
      tempCtx.fill();
      
      // Footer black text
      tempCtx.fillStyle = '#000000';
      tempCtx.font = `800 ${5.8 * scale}px 'Outfit', sans-serif`;
      tempCtx.fillText("WHERE VISION MEETS VENTURE", ox + 27 * scale, oy + 52.5 * scale);
      
      // Footer year
      tempCtx.fillStyle = '#a855f7';
      tempCtx.font = `900 ${11 * scale}px 'Space Grotesk', sans-serif`;
      tempCtx.fillText("2026", ox + 168 * scale, oy + 54 * scale);
      
    } else if (stateName === 'SPIN') {
      // 3D double helix spiral mathematical projection
      const center = { x: this.width / 2, y: this.height / 2 };
      const baseRadius = Math.min(this.width, this.height) * 0.38;
      for (let i = 0; i < this.maxParticles; i++) {
        const theta = (i / this.maxParticles) * Math.PI * 2 * 8;
        const r = (i / this.maxParticles) * baseRadius + 15;
        coords.push({
          x: center.x + Math.cos(theta) * r,
          y: center.y + Math.sin(theta) * r,
          color: `hsl(${(i / this.maxParticles) * 360}, 85%, 60%)`
        });
      }
      return coords;
    }

    if (stateName === 'E-CELL SIT') {
      // Draw E-Cell SIT Logo Composition (Left of Reference Image)
      const svgW = 200;
      const svgH = 60;
      const scale = Math.min(this.width / svgW, this.height / svgH) * 0.95;
      const ox = (this.width - svgW * scale) / 2;
      const oy = (this.height - svgH * scale) / 2;

      // 1. Draw Rotated Diamond Icon with Concentric Waves
      tempCtx.save();
      tempCtx.strokeStyle = '#0066ff'; // Neon blue
      tempCtx.lineWidth = 3.5 * scale;
      
      // Outer Diamond outline
      tempCtx.translate(ox + 35 * scale, oy + 30 * scale);
      tempCtx.rotate(Math.PI / 4);
      tempCtx.strokeRect(-18 * scale, -18 * scale, 36 * scale, 36 * scale);
      tempCtx.restore();

      // Inside Wave arcs
      tempCtx.strokeStyle = '#0066ff';
      tempCtx.lineWidth = 2.2 * scale;
      for (let r = 6; r <= 22; r += 7) {
        tempCtx.beginPath();
        tempCtx.arc(ox + 17 * scale, oy + 30 * scale, r * scale, -Math.PI / 3, Math.PI / 3);
        tempCtx.stroke();
      }

      // 2. Draw Vertical Divider
      tempCtx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      tempCtx.lineWidth = 1.8 * scale;
      tempCtx.beginPath();
      tempCtx.moveTo(ox + 70 * scale, oy + 12 * scale);
      tempCtx.lineTo(ox + 70 * scale, oy + 48 * scale);
      tempCtx.stroke();

      // 3. Draw Typography Block
      // E-Cell Title
      tempCtx.fillStyle = '#ffffff';
      tempCtx.textAlign = 'left';
      tempCtx.textBaseline = 'alphabetic';
      tempCtx.font = `700 ${22 * scale}px 'Space Grotesk', sans-serif`;
      tempCtx.fillText("E-Cell", ox + 80 * scale, oy + 28 * scale);

      // SIT Subtitle
      tempCtx.font = `800 ${12 * scale}px 'Space Grotesk', sans-serif`;
      tempCtx.fillText("SIT", ox + 105 * scale, oy + 46 * scale);

      // Flanking horizontal borders
      tempCtx.fillStyle = '#ffffff';
      tempCtx.fillRect(ox + 80 * scale, oy + 41 * scale, 20 * scale, 2 * scale);
      tempCtx.fillRect(ox + 135 * scale, oy + 41 * scale, 20 * scale, 2 * scale);

    } else if (stateName === 'NEC 2026') {
      // Draw IITB National Entrepreneurship Challenge Logo Composition (Right of Reference Image)
      const svgW = 200;
      const svgH = 60;
      const scale = Math.min(this.width / svgW, this.height / svgH) * 0.95;
      const ox = (this.width - svgW * scale) / 2;
      const oy = (this.height - svgH * scale) / 2;

      // 1. Draw Glowing Lightbulb
      const bulbGrad = tempCtx.createRadialGradient(
        ox + 40 * scale, oy + 24 * scale, 2 * scale,
        ox + 40 * scale, oy + 24 * scale, 20 * scale
      );
      bulbGrad.addColorStop(0, '#93c5fd'); // Glowing sky blue center
      bulbGrad.addColorStop(1, '#2563eb'); // Neon blue edge
      tempCtx.fillStyle = bulbGrad;

      tempCtx.beginPath();
      tempCtx.arc(ox + 40 * scale, oy + 22 * scale, 15 * scale, -Math.PI * 0.15, Math.PI * 1.15);
      tempCtx.lineTo(ox + 33 * scale, oy + 42 * scale);
      tempCtx.lineTo(ox + 47 * scale, oy + 42 * scale);
      tempCtx.closePath();
      tempCtx.fill();

      // Rocket Silhouette Cutout inside Bulb
      tempCtx.fillStyle = '#080415'; // Match background color for outline cutout
      tempCtx.beginPath();
      tempCtx.moveTo(ox + 40 * scale, oy + 12 * scale); // Nose cone
      tempCtx.quadraticCurveTo(ox + 42 * scale, oy + 20 * scale, ox + 42 * scale, oy + 32 * scale);
      tempCtx.lineTo(ox + 45 * scale, oy + 35 * scale); // Fin right
      tempCtx.lineTo(ox + 40 * scale, oy + 35 * scale);
      tempCtx.lineTo(ox + 35 * scale, oy + 35 * scale); // Fin left
      tempCtx.lineTo(ox + 38 * scale, oy + 32 * scale);
      tempCtx.quadraticCurveTo(ox + 38 * scale, oy + 20 * scale, ox + 40 * scale, oy + 12 * scale);
      tempCtx.closePath();
      tempCtx.fill();

      // Launch Exhaust Tail
      tempCtx.fillRect(ox + 39.2 * scale, oy + 35 * scale, 1.6 * scale, 6 * scale);

      // Bulb metallic base rings
      tempCtx.fillStyle = '#cbd5e1';
      tempCtx.fillRect(ox + 35 * scale, oy + 43 * scale, 10 * scale, 2.2 * scale);
      tempCtx.fillRect(ox + 36 * scale, oy + 46.5 * scale, 8 * scale, 2.2 * scale);

      // Oval mount ring
      tempCtx.fillStyle = '#94a3b8';
      tempCtx.beginPath();
      tempCtx.ellipse(ox + 40 * scale, oy + 50.5 * scale, 4.5 * scale, 1.8 * scale, 0, 0, Math.PI * 2);
      tempCtx.fill();

      // 2. Draw NEC Typography Block
      tempCtx.textAlign = 'left';
      tempCtx.textBaseline = 'alphabetic';

      // Header Tagline
      tempCtx.fillStyle = '#94a3b8';
      tempCtx.font = `600 ${6 * scale}px 'Space Grotesk', sans-serif`;
      tempCtx.fillText("IIT BOMBAY PRESENTS", ox + 66 * scale, oy + 12 * scale);

      // Main Titles
      tempCtx.fillStyle = '#ffffff';
      tempCtx.font = `900 ${14 * scale}px 'Space Grotesk', sans-serif`;
      tempCtx.fillText("NATIONAL", ox + 66 * scale, oy + 25 * scale);

      tempCtx.font = `800 ${10.5 * scale}px 'Space Grotesk', sans-serif`;
      tempCtx.fillText("ENTREPRENEURSHIP", ox + 66 * scale, oy + 35 * scale);

      // CHALLENGE 2026 (Highlights)
      tempCtx.fillStyle = '#38bdf8'; // Sky blue
      tempCtx.font = `900 ${12 * scale}px 'Space Grotesk', sans-serif`;
      tempCtx.fillText("CHALLENGE", ox + 66 * scale, oy + 47 * scale);

      tempCtx.fillStyle = '#ffffff';
      const challWidth = tempCtx.measureText("CHALLENGE ").width;
      tempCtx.fillText("2026", ox + 66 * scale + challWidth, oy + 47 * scale);

      // Footer Tagline
      tempCtx.fillStyle = '#60a5fa';
      tempCtx.font = `700 ${6.5 * scale}px 'Outfit', sans-serif`;
      tempCtx.fillText("WE RISE BY LIFTING OTHERS", ox + 66 * scale, oy + 54 * scale);
    }
    
    // Scan pixel coordinates from temp offscreen canvas
    const imgData = tempCtx.getImageData(0, 0, this.width, this.height).data;
    const step = 2; // High resolution scanning step
    
    for (let y = 0; y < this.height; y += step) {
      for (let x = 0; x < this.width; x += step) {
        const index = (y * this.width + x) * 4;
        const alpha = imgData[index + 3];
        
        if (alpha > 70) {
          const ratio = x / this.width;
          let color = '#a855f7'; // Purple default
          
          if (stateName === 'E-CELL SIT') {
            // Map logo colors based on scan positions
            if (x < ox + 65 * scale) {
              color = '#0066ff'; // Neon blue waves/diamond
            } else {
              color = '#ffffff'; // White text & borders
            }
          } else if (stateName === 'NEC 2026') {
            if (x < ox + 55 * scale) {
              // Bulb parts
              const pxIndex = (y * this.width + x) * 4;
              const r = imgData[pxIndex];
              const g = imgData[pxIndex + 1];
              const b = imgData[pxIndex + 2];
              if (r === 8 && g === 4 && b === 21) {
                // Background silhouette cutout (do not scan)
                continue;
              }
              color = (y < oy + 42 * scale) ? '#3b82f6' : '#94a3b8'; // Blue bulb / Grey base
            } else {
              // Text coloring
              if (y > oy + 38 * scale && y < oy + 50 * scale) {
                color = (x < ox + 66 * scale + challWidth) ? '#38bdf8' : '#ffffff'; // Cyan Challenge / White 2026
              } else if (y >= oy + 50 * scale) {
                color = '#60a5fa'; // Blue slogan
              } else if (y < oy + 15 * scale) {
                color = '#94a3b8'; // Grey subheader
              } else {
                color = '#ffffff'; // White titles
              }
            }
          } else {
            // Spin colors
            if (ratio < 0.35) color = '#06b6d4';
            else if (ratio > 0.65) color = '#ec4899';
            else color = '#6366f1';
          }
          
          coords.push({ x, y, color });
        }
      }
    }
    
    return coords;
  }

  setMorphTargets(stateName) {
    const targets = this.getCoordinates(stateName);
    const targetCount = targets.length;
    
    if (targetCount === 0) return;
    
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      const target = targets[i % targetCount];
      
      p.tx = target.x;
      p.ty = target.y;
      p.targetColor = target.color;
    }
  }

  startMorphCycle() {
    this.stateTimer = setInterval(() => {
      this.currentStateIndex = (this.currentStateIndex + 1) % this.states.length;
      this.setMorphTargets(this.states[this.currentStateIndex]);
    }, 5500); // 5.5 seconds morph interval
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // Ambient light background glow
    const glowGrad = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, 10,
      this.width / 2, this.height / 2, Math.min(this.width, this.height) * 0.75
    );
    glowGrad.addColorStop(0, 'rgba(0, 102, 255, 0.08)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = glowGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    const mouseRadiusSq = this.mouse.radius * this.mouse.radius;
    const nearParticles = [];
    const linkDistLimit = 85;
    
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      
      p.vx += dx * 0.04;
      p.vy += dy * 0.04;
      
      if (this.mouse.active) {
        const mdx = this.mouse.x - p.x;
        const mdy = this.mouse.y - p.y;
        const distSq = mdx * mdx + mdy * mdy;
        
        if (distSq < mouseRadiusSq && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const force = (this.mouse.radius - dist) / this.mouse.radius;
          const angle = Math.atan2(mdy, mdx);
          
          p.vx -= Math.cos(angle) * force * 8;
          p.vy -= Math.sin(angle) * force * 8;
          
          if (dist < linkDistLimit) {
            nearParticles.push({ p, dist });
          }
        }
      }
      
      p.vx *= 0.83;
      p.vy *= 0.83;
      
      p.x += p.vx;
      p.y += p.vy;
      
      if (p.color !== p.targetColor) {
        p.color = p.targetColor;
      }
      
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // Draw cursor-linked constellation lines
    if (this.mouse.active && nearParticles.length > 0) {
      for (const item of nearParticles) {
        const p = item.p;
        const alpha = (1 - item.dist / linkDistLimit) * 0.45;
        this.ctx.strokeStyle = `rgba(0, 102, 255, ${alpha})`; // Blue connecting lines
        this.ctx.lineWidth = 0.8;
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, p.y);
        this.ctx.lineTo(this.mouse.x, this.mouse.y);
        this.ctx.stroke();
      }
      
      const maxLinksCount = 50;
      const list = nearParticles.slice(0, maxLinksCount);
      const closeLimit = 38;
      
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const p1 = list[i].p;
          const p2 = list[j].p;
          
          const ldx = p1.x - p2.x;
          const ldy = p1.y - p2.y;
          const lDistSq = ldx * ldx + ldy * ldy;
          
          if (lDistSq < closeLimit * closeLimit) {
            const dist = Math.sqrt(lDistSq);
            const alpha = (1 - dist / closeLimit) * 0.18 * (1 - list[i].dist / linkDistLimit);
            this.ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
            this.ctx.lineWidth = 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(p1.x, p1.y);
            this.ctx.lineTo(p2.x, p2.y);
            this.ctx.stroke();
          }
        }
      }
    }
    
    this.ctx.globalAlpha = 1.0;
    requestAnimationFrame(() => this.animate());
  }

  destroy() {
    if (this.stateTimer) clearInterval(this.stateTimer);
  }
}

// Instantiate
document.addEventListener('DOMContentLoaded', () => {
  window.logoCanvas = new ParticleLogo('logo-canvas', 'logo-canvas-container');
});
