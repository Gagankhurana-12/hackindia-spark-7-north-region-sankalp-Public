import React, { useEffect, useRef } from 'react';

export default function AnimatedAIOr({ isListening = false, isSpeaking = false, onClick }) {
  const canvasRef = useRef(null);
  const animationRef = useRef();
  const timeRef = useRef(0);
  const wavesRef = useRef([]);
  const intensityRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;

    // Initialize waves if not already done
    if (wavesRef.current.length === 0) {
      for (let i = 0; i < 8; i++) {
        wavesRef.current.push({
          angle: (i / 8) * Math.PI * 2,
          speed: 0.01 + Math.random() * 0.02,
          amplitude: radius * (0.15 + Math.random() * 0.2),
          frequency: 1 + Math.random() * 2,
          colorIndex: i % 5,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    const colors = [
      { r: 108, g: 60, b: 225 },   // Curiosity Violet (#6C3CE1)
      { r: 0, g: 212, b: 170 },    // Curiosity Teal (#00D4AA)
      { r: 125, g: 79, b: 245 },   // Lighter Violet
      { r: 0, g: 163, b: 131 },    // Darker Teal
      { r: 150, g: 100, b: 255 },  // Soft Purple
    ];

    const animate = () => {
      // Only animate if listening or speaking, otherwise fade out
      if (isListening || isSpeaking) {
        timeRef.current += 0.02;
      } else {
        timeRef.current *= 0.96; // Gradually slow down
      }
      const time = timeRef.current;

      // Smooth intensity transition - gradually increase when listening starts
      const targetIntensity = isListening || isSpeaking ? 1.2 : 0.3;
      intensityRef.current += (targetIntensity - intensityRef.current) * 0.08; // Smooth easing

      // Clear with dark background
      ctx.fillStyle = '#0E0E16'; // Deep Blue-Black
      ctx.fillRect(0, 0, width, height);

      // Draw outer circular gradient border
      const outerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius + 50);
      outerGradient.addColorStop(0, 'rgba(108, 60, 225, 0.15)');
      outerGradient.addColorStop(0.5, 'rgba(0, 212, 170, 0.08)');
      outerGradient.addColorStop(1, 'rgba(14, 14, 22, 0)');

      ctx.fillStyle = outerGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 50, 0, Math.PI * 2);
      ctx.fill();

      const intensity = intensityRef.current;

      // Draw multiple layered waves
      for (let layer = 0; layer < 4; layer++) {
        const layerRadius = radius * (0.3 + (layer * 0.175));
        const waves = wavesRef.current;

        for (let w = 0; w < waves.length; w++) {
          const wave = waves[w];
          wave.angle += wave.speed * (isListening || isSpeaking ? 0.8 : 0.4);
          wave.phase += 0.008 * (isListening || isSpeaking ? 1 : 0.6);

          const color = colors[wave.colorIndex];
          const alpha = (0.7 - layer * 0.15) * intensity;

          // Create mesh of connected points
          const points = [];
          const segments = 40 + layer * 10;

          for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            
            // Multiple sine waves for complex shape
            const wave1 = Math.sin(angle * 3 + time * 1.2 + wave.phase) * 15;
            const wave2 = Math.sin(angle * 5 + time * 0.8) * 10;
            const wave3 = Math.cos(angle * 2.5 + time * 1.5) * 12;
            
            const offset = (wave1 + wave2 + wave3) * (1 + Math.sin(wave.angle) * 0.3) * intensity;
            const r = layerRadius + offset;

            const x = centerX + Math.cos(angle + wave.angle) * r;
            const y = centerY + Math.sin(angle + wave.angle) * r;

            points.push({ x, y });
          }

          // Draw smooth path through points
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
          ctx.strokeStyle = `rgba(${color.r + 50}, ${color.g + 50}, ${color.b + 50}, ${alpha * 0.6})`;
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);

          for (let i = 1; i < points.length; i++) {
            const p1 = points[i - 1];
            const p2 = points[i];
            const p3 = points[(i + 1) % points.length];

            const cpx = (p2.x + p3.x) / 2;
            const cpy = (p2.y + p3.y) / 2;

            ctx.quadraticCurveTo(p2.x, p2.y, cpx, cpy);
          }

          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }

      // Add pulsing center glow
      if (isListening || isSpeaking) {
        const pulse = 0.3 + Math.sin(time * 2.5) * 0.2;
        const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.5);
        glowGradient.addColorStop(0, `rgba(108, 60, 225, ${0.25 * pulse})`);
        glowGradient.addColorStop(0.5, `rgba(0, 212, 170, ${0.12 * pulse})`);
        glowGradient.addColorStop(1, 'rgba(14, 14, 22, 0)');

        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw center text
      const textAlpha = isListening || isSpeaking ? 0.9 : 0.7;
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const textY = centerY;
      if (!isListening && !isSpeaking) {
        ctx.fillStyle = `rgba(108, 60, 225, ${textAlpha})`;
        ctx.fillText('Tap to Speak', centerX, textY);
      } else if (isSpeaking) {
        ctx.fillStyle = `rgba(0, 212, 170, ${textAlpha})`;
        ctx.fillText('Speaking...', centerX, textY);
      } else {
        ctx.fillStyle = `rgba(108, 60, 225, ${textAlpha})`;
        ctx.fillText('Listening...', centerX, textY);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isListening, isSpeaking]);

  return (
    <div className="flex flex-col items-center justify-center gap-6 cursor-pointer hover:scale-105 transition-transform duration-300" onClick={onClick}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={550}
          height={550}
          className="rounded-full shadow-2xl"
          style={{
            filter: isListening || isSpeaking ? 'drop-shadow(0 0 50px rgba(108, 60, 225, 0.6))' : 'drop-shadow(0 0 30px rgba(108, 60, 225, 0.3))',
          }}
        />
        <div className="absolute inset-0 rounded-full border border-[#6C3CE1]/20" />
      </div>
      
      <div className="text-center">
        <p className="text-[#00D4AA] font-bold text-sm tracking-widest uppercase">
          {isSpeaking ? 'Speaking' : isListening ? 'Listening' : 'Idle'}
        </p>
      </div>
    </div>
  );
}
