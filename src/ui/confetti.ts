const COLORS = ['#FF6B3D', '#2E86DE', '#F2B705', '#4CC38A', '#E84A5F', '#8E5BD9'];
/** short DOM confetti burst at a screen position */
export function confetti(x: number, y: number, n = 16) {
  const host = document.getElementById('ui');
  if (!host) return;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.className = 'confetti';
    p.style.left = `${x}px`; p.style.top = `${y}px`;
    p.style.background = COLORS[i % COLORS.length];
    host.appendChild(p);
    const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 70;
    const anim = p.animate([
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
      { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d - 30}px) rotate(${Math.random() * 540}deg)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${Math.cos(a) * d * 1.1}px, ${Math.sin(a) * d + 60}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
    ], { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(.2,.7,.4,1)' });
    anim.onfinish = () => p.remove();
  }
}
