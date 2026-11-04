import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, TrendingUp, TrendingDown, RefreshCw, Zap, ShieldAlert, Award, Bot } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-[#0c1017] text-white p-4 flex flex-col items-center justify-center">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-bold text-xl">V</div>
        <h1 className="text-2xl font-bold tracking-wider">VERTEX <span className="text-red-500">pro</span></h1>
      </div>
      <p className="text-gray-400">High-Frequency Binary Options Trading Platform</p>
    </div>
  );
}
