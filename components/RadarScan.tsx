import React from 'react';

export const RadarScan: React.FC = () => {
  return (
    <div className="relative flex items-center justify-center w-64 h-64 mx-auto mb-8">
      {/* Core */}
      <div className="absolute z-10 w-4 h-4 bg-cyan-400 rounded-full shadow-[0_0_15px_rgba(34,211,238,1)] animate-pulse"></div>
      
      {/* Rings */}
      <div className="absolute w-full h-full border border-cyan-500/20 rounded-full animate-radar" style={{ animationDelay: '0s' }}></div>
      <div className="absolute w-full h-full border border-cyan-500/10 rounded-full animate-radar" style={{ animationDelay: '0.6s' }}></div>
      <div className="absolute w-full h-full border border-cyan-500/5 rounded-full animate-radar" style={{ animationDelay: '1.2s' }}></div>
      
      {/* Label */}
      <div className="absolute -bottom-8 w-full text-center">
        <p className="text-cyan-400 text-sm font-mono animate-pulse">BUSCANDO DISPOSITIVOS...</p>
      </div>
    </div>
  );
};
