export const animations = {
  fadeIn: { from: { opacity: 0 }, to: { opacity: 1 }, animation: 'fadeIn 0.3s ease both' },
  slideIn: { from: { transform: 'translateY(-8px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 }, animation: 'slideIn 0.3s ease both' },
  pulse: { animation: 'pulse 1.5s ease-in-out infinite' },
  shimmer: { animation: 'shimmer 1.5s linear infinite' },
  spin: { animation: 'spin 1s linear infinite' },
};
export default animations;
