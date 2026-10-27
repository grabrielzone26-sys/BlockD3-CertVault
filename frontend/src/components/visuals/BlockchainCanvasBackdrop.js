import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import bgImgSrc from '../../assets/images/1-blockchain-technology.jpg';

const BlockchainCanvasBackdrop = () => {
  const canvasRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = 0;
    let height = 0;

    // Load user's 1-blockchain-technology.jpg image
    const bgImg = new Image();
    bgImg.src = bgImgSrc;
    let bgLoaded = false;
    bgImg.onload = () => {
      bgLoaded = true;
    };

    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Mouse parallax tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (e) => {
      const centerX = width / 2;
      const centerY = height / 2;
      targetMouseX = (e.clientX - centerX) / centerX;
      targetMouseY = (e.clientY - centerY) / centerY;
    };

    const handleTouchMove = (e) => {
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        const centerX = width / 2;
        const centerY = height / 2;
        targetMouseX = ((touch.clientX - centerX) / centerX) * 0.6;
        targetMouseY = ((touch.clientY - centerY) / centerY) * 0.6;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    // Handle resize with performance cap on DPR
    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Dynamic theme-aware color system
    const computed = window.getComputedStyle ? window.getComputedStyle(document.documentElement) : null;
    const COLORS = {
      cyan: computed?.getPropertyValue('--cyan')?.trim() || '#38BDF8',
      amber: computed?.getPropertyValue('--amber')?.trim() || '#F59E0B',
      violet: computed?.getPropertyValue('--violet')?.trim() || '#6366F1',
      gold: computed?.getPropertyValue('--gold')?.trim() || '#FBBF24',
      green: computed?.getPropertyValue('--green')?.trim() || '#10B981',
      magenta: computed?.getPropertyValue('--magenta')?.trim() || '#818CF8',
      bgNavy: computed?.getPropertyValue('--bg-primary')?.trim() || '#07122A',
    };

    const isMobile = width < 768;

    // Soft Bokeh Background Particles - scaled for mobile battery and GPU efficiency
    const bokehCount = isMobile ? 18 : 38;
    const bokehParticles = Array.from({ length: bokehCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 24 + 10,
      baseAlpha: Math.random() * 0.12 + 0.04,
      color: Math.random() > 0.65 ? COLORS.amber : Math.random() > 0.4 ? COLORS.violet : COLORS.cyan,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      pulse: Math.random() * Math.PI * 2,
    }));

    // Isometric Network Nodes & Cubes
    // Generate an isometric grid layout matching Reference Images 1 & 3
    const cols = isMobile ? 3 : 6;
    const rows = isMobile ? 3 : 4;
    const nodes = [];
    const spacingX = Math.max(width / (cols + 1), 160);
    const spacingY = Math.max(height / (rows + 1), 120);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Isometric offset
        const isoX = (c + 1) * spacingX + ((r % 2) * spacingX * 0.4) - spacingX * 0.2;
        const isoY = (r + 1) * spacingY + (Math.sin(c * 0.8 + r) * 20);

        const isCube = (r + c) % 2 === 0;
        nodes.push({
          x: isoX,
          y: isoY,
          baseX: isoX,
          baseY: isoY,
          row: r,
          col: c,
          isCube,
          cubeSize: isCube ? Math.random() * 12 + 24 : 0,
          color: (r + c) % 3 === 0 ? COLORS.amber : (r + c) % 2 === 0 ? COLORS.cyan : COLORS.violet,
          glowPhase: Math.random() * Math.PI * 2,
          hasLock: isCube && Math.random() > 0.4,
        });
      }
    }

    // Connectors between adjacent nodes
    const connectors = [];
    nodes.forEach((node, i) => {
      nodes.forEach((other, j) => {
        if (i < j) {
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < spacingX * 1.35) {
            connectors.push({
              from: node,
              to: other,
              isChain: node.isCube && other.isCube && Math.random() > 0.4,
              color: node.color === COLORS.amber || other.color === COLORS.amber ? COLORS.amber : COLORS.cyan,
              packets: [],
              lastPacketTime: 0,
            });
          }
        }
      });
    });

    // Helper: Draw metallic chain link
    const drawChainLink = (x1, y1, x2, y2, progress, glowColor) => {
      const x = x1 + (x2 - x1) * progress;
      const y = y1 + (y2 - y1) * progress;
      const angle = Math.atan2(y2 - y1, x2 - x1);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      // Chrome chain link torus
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 3.5, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(215, 230, 245, 0.45)';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Specular highlight
      ctx.beginPath();
      ctx.ellipse(-1, -1, 4, 1.5, 0, 0, Math.PI);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Lock/chain seam glow
      if (glowColor) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 8;
      }
      ctx.restore();
    };

    // Helper: Draw isometric blockchain cube (matches Reference Image 1)
    const drawIsometricCube = (cx, cy, size, color, hasLock, time) => {
      ctx.save();
      ctx.translate(cx, cy);

      const h = size * 0.866; // 30 deg isometric ratio
      const w = size;

      const isLight = theme === 'light';
      // Top face
      ctx.beginPath();
      ctx.moveTo(0, -h);
      ctx.lineTo(w, -h * 0.4);
      ctx.lineTo(0, h * 0.2);
      ctx.lineTo(-w, -h * 0.4);
      ctx.closePath();
      ctx.fillStyle = isLight ? 'rgba(235, 242, 252, 0.90)' : 'rgba(14, 26, 46, 0.75)';
      ctx.fill();
      ctx.strokeStyle = color === COLORS.amber 
        ? (isLight ? 'rgba(217, 119, 6, 0.5)' : 'rgba(255, 138, 43, 0.45)') 
        : (isLight ? 'rgba(29, 78, 216, 0.45)' : 'rgba(0, 229, 255, 0.4)');
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Right face
      ctx.beginPath();
      ctx.moveTo(0, h * 0.2);
      ctx.lineTo(w, -h * 0.4);
      ctx.lineTo(w, h * 0.7);
      ctx.lineTo(0, h * 1.3);
      ctx.closePath();
      ctx.fillStyle = isLight ? 'rgba(218, 228, 242, 0.92)' : 'rgba(8, 16, 30, 0.82)';
      ctx.fill();
      ctx.strokeStyle = isLight ? 'rgba(29, 78, 216, 0.25)' : 'rgba(0, 229, 255, 0.25)';
      ctx.stroke();

      // Left face
      ctx.beginPath();
      ctx.moveTo(0, h * 0.2);
      ctx.lineTo(-w, -h * 0.4);
      ctx.lineTo(-w, h * 0.7);
      ctx.lineTo(0, h * 1.3);
      ctx.closePath();
      ctx.fillStyle = isLight ? 'rgba(202, 216, 236, 0.95)' : 'rgba(5, 11, 22, 0.9)';
      ctx.fill();
      ctx.strokeStyle = isLight ? 'rgba(29, 78, 216, 0.25)' : 'rgba(0, 229, 255, 0.25)';
      ctx.stroke();

      // Amber Lock Emblem on face (signature reference accent)
      if (hasLock) {
        const pulse = Math.sin(time * 2.5) * 0.25 + 0.75;
        ctx.save();
        ctx.translate(0, h * 0.35);

        // Lock glow
        ctx.shadowColor = COLORS.amber;
        ctx.shadowBlur = 12 * pulse;

        // Lock body (small rect)
        ctx.fillStyle = COLORS.amber;
        ctx.beginPath();
        ctx.rect(-3.5, -1, 7, 5);
        ctx.fill();

        // Lock shackle (small arc)
        ctx.beginPath();
        ctx.arc(0, -1, 2.5, Math.PI, 0);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = COLORS.amber;
        ctx.stroke();

        ctx.restore();
      }

      ctx.restore();
    };

    // Active data packets
    const activePackets = [];
    let lastFrameTime = 0;
    const FRAME_INTERVAL = 1000 / 30; // 30 FPS cap for high performance and low GPU usage

    const animate = (currentTime) => {
      animationFrameId = requestAnimationFrame(animate);

      // Throttle to 30 FPS to prevent GPU stuttering
      if (currentTime - lastFrameTime < FRAME_INTERVAL) {
        return;
      }
      lastFrameTime = currentTime;

      const time = currentTime * 0.001;

      // Parallax damping
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      ctx.clearRect(0, 0, width, height);

      // Draw user's 1-blockchain-technology.jpg as high-res cinematic backdrop
      if (bgLoaded && bgImg.width > 0) {
        const scale = Math.max(width / bgImg.width, height / bgImg.height) * 1.05;
        const sw = bgImg.width * scale;
        const sh = bgImg.height * scale;
        const sx = (width - sw) / 2 + mouseX * 22;
        const sy = (height - sh) / 2 + mouseY * 22;
        ctx.drawImage(bgImg, sx, sy, sw, sh);

        // Theme-tuned scrim so UI text stays crystal clear
        ctx.fillStyle = theme === 'light'
          ? 'rgba(248, 250, 252, 0.94)'
          : theme === 'cyber'
          ? 'rgba(4, 6, 10, 0.88)'
          : 'rgba(7, 18, 42, 0.85)';
        ctx.fillRect(0, 0, width, height);
      } else {
        // Fallback gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        if (theme === 'light') {
          bgGrad.addColorStop(0, '#FFFFFF');
          bgGrad.addColorStop(0.5, '#F8FAFC');
          bgGrad.addColorStop(1, '#F1F5F9');
        } else {
          bgGrad.addColorStop(0, '#0A0E17');
          bgGrad.addColorStop(0.5, '#070B13');
          bgGrad.addColorStop(1, '#04070D');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // Radial color pools - subtle academic sapphire & navy (no harsh neon)
      const radCyan = ctx.createRadialGradient(
        width * 0.2 + mouseX * 40,
        height * 0.25 + mouseY * 40,
        10,
        width * 0.2,
        height * 0.25,
        width * 0.45
      );
      radCyan.addColorStop(0, 'rgba(37, 99, 235, 0.05)');
      radCyan.addColorStop(1, 'transparent');
      ctx.fillStyle = radCyan;
      ctx.fillRect(0, 0, width, height);

      const radAmber = ctx.createRadialGradient(
        width * 0.75 + mouseX * 50,
        height * 0.65 + mouseY * 50,
        10,
        width * 0.75,
        height * 0.65,
        width * 0.4
      );
      radAmber.addColorStop(0, 'rgba(99, 102, 241, 0.04)');
      radAmber.addColorStop(1, 'transparent');
      ctx.fillStyle = radAmber;
      ctx.fillRect(0, 0, width, height);

      // 1. Draw Soft Bokeh Particles
      bokehParticles.forEach((b) => {
        if (!prefersReducedMotion) {
          b.x += b.vx;
          b.y += b.vy;
          b.pulse += 0.015;
          if (b.x < -30) b.x = width + 30;
          if (b.x > width + 30) b.x = -30;
          if (b.y < -30) b.y = height + 30;
          if (b.y > height + 30) b.y = -30;
        }

        const alpha = b.baseAlpha * (0.8 + Math.sin(b.pulse) * 0.3);
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x + mouseX * 25, b.y + mouseY * 25, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = b.radius * 1.5;
        ctx.fill();
        ctx.restore();
      });

      // 2. Draw Isometric Grid Lines & Metallic Chain Links
      connectors.forEach((conn) => {
        const fromX = conn.from.x + mouseX * 18;
        const fromY = conn.from.y + mouseY * 18;
        const toX = conn.to.x + mouseX * 18;
        const toY = conn.to.y + mouseY * 18;

        // Base line
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.strokeStyle = conn.color === COLORS.amber
          ? (theme === 'light' ? 'rgba(217, 119, 6, 0.28)' : 'rgba(255, 138, 43, 0.16)')
          : (theme === 'light' ? 'rgba(29, 78, 216, 0.22)' : 'rgba(0, 229, 255, 0.12)');
        ctx.lineWidth = conn.isChain ? 1.5 : 1;
        ctx.stroke();

        // If chain, draw chain links along the connector
        if (conn.isChain) {
          const linksCount = 4;
          for (let k = 1; k <= linksCount; k++) {
            const progress = k / (linksCount + 1);
            drawChainLink(fromX, fromY, toX, toY, progress, conn.color === COLORS.amber ? COLORS.amber : null);
          }
        }
        ctx.restore();

        // Spawn traveling data packet occasionally
        if (!prefersReducedMotion && Math.random() < 0.003 && activePackets.length < 10) {
          const packetColor = Math.random() > 0.75 ? COLORS.green : Math.random() > 0.4 ? COLORS.amber : COLORS.cyan;
          activePackets.push({
            fromX,
            fromY,
            toX,
            toY,
            progress: 0,
            speed: Math.random() * 0.008 + 0.006,
            color: packetColor,
            size: Math.random() * 2 + 2.5,
          });
        }
      });

      // 3. Draw Traveling Data Packets
      for (let p = activePackets.length - 1; p >= 0; p--) {
        const packet = activePackets[p];
        packet.progress += packet.speed;

        if (packet.progress >= 1) {
          activePackets.splice(p, 1);
          continue;
        }

        const px = packet.fromX + (packet.toX - packet.fromX) * packet.progress;
        const py = packet.fromY + (packet.toY - packet.fromY) * packet.progress;

        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, packet.size, 0, Math.PI * 2);
        ctx.fillStyle = packet.color;
        ctx.shadowColor = packet.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
      }

      // 4. Draw Nodes and Floating Blockchain Cubes
      nodes.forEach((node) => {
        const nx = node.x + mouseX * 22;
        const ny = node.y + mouseY * 22;

        if (node.isCube) {
          drawIsometricCube(nx, ny, node.cubeSize, node.color, node.hasLock, time + node.glowPhase);
        } else {
          // Regular glowing grid intersection node
          const pulse = Math.sin(time * 2 + node.glowPhase) * 0.3 + 0.7;
          ctx.save();
          ctx.beginPath();
          ctx.arc(nx, ny, 3.2, 0, Math.PI * 2);
          ctx.fillStyle = node.color;
          ctx.shadowColor = node.color;
          ctx.shadowBlur = 12 * pulse;
          ctx.globalAlpha = 0.8 * pulse;
          ctx.fill();

          // Outer halo
          ctx.beginPath();
          ctx.arc(nx, ny, 7 * pulse, 0, Math.PI * 2);
          ctx.strokeStyle = node.color;
          ctx.lineWidth = 0.8;
          ctx.globalAlpha = 0.3 * pulse;
          ctx.stroke();
          ctx.restore();
        }
      });
    };

    animationFrameId = requestAnimationFrame(animate);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
      } else if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [theme]);

  

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[-2] w-full h-full"
      style={{ display: 'block', background: 'var(--bg-primary, #0A0E17)' }}
      aria-hidden="true"
    />
  );
};

export default BlockchainCanvasBackdrop;
