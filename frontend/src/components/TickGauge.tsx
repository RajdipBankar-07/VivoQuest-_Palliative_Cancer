'use client';

interface TickGaugeProps {
  score: number; // 0 to 100
  label: string;
}

export default function TickGauge({ score, label }: TickGaugeProps) {
  const totalTicks = 32;
  const activeTicks = Math.round((score / 100) * totalTicks);
  const radius = 100;
  const center = 120; // x and y center point

  const renderTicks = () => {
    const ticks = [];
    for (let i = 0; i < totalTicks; i++) {
      // Math: space ticks from Pi to 0 radians (semi-circle)
      const angle = Math.PI - (i / (totalTicks - 1)) * Math.PI;
      const isTickActive = i < activeTicks;
      
      const innerR = radius - 12;
      const outerR = radius;
      
      const x1 = center + innerR * Math.cos(angle);
      const y1 = center - innerR * Math.sin(angle);
      const x2 = center + outerR * Math.cos(angle);
      const y2 = center - outerR * Math.sin(angle);
      
      ticks.push(
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={isTickActive ? '#C8E882' : 'rgba(200,232,130,0.18)'}
          strokeWidth={4.5}
          strokeLinecap="round"
          className="transition-colors duration-500"
        />
      );
    }
    return ticks;
  };

  return (
    <div className="relative flex flex-col items-center select-none">
      <svg width={240} height={125} viewBox="0 0 240 125" className="overflow-visible">
        {renderTicks()}
      </svg>
      <div className="absolute bottom-2 flex flex-col items-center text-center">
        <span 
          style={{ 
            fontFamily: 'var(--font-heading)',
            fontWeight: '800',
            fontSize: '44px',
            color: 'white',
            lineHeight: 1
          }}
        >
          {score}
        </span>
        <span 
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: '600',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.7)',
            marginTop: '2px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
