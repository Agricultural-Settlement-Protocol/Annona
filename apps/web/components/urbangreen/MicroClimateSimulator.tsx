/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { Shield, Sparkles, Activity, Award, CheckCircle, TrendingUp } from 'lucide-react';

export default function MicroClimateSimulator() {
  const [moisture, setMoisture] = useState(85); // Riwayat Pelunasan (%)
  const [temp, setTemp] = useState(25); // Kapasitas Produksi (Ton)
  const [sunlight, setSunlight] = useState(6); // Harga Acuan Komoditas (Ribuan Rp/kg)

  // Real-time calculation of credit score and borrowing limit
  const simulation = useMemo(() => {
    // Credit score ranges from 300 to 850
    // Payment history is 35% weight: adds up to 192.5 points
    // Production yield capacity is 45% weight: adds up to 247.5 points
    // Pricing consistency is 20% weight: adds up to 110 points
    const baseScore = 300;
    const paymentContribution = (moisture / 100) * 220;
    const yieldContribution = ((temp - 10) / 30) * 230;
    const priceContribution = ((sunlight - 2) / 12) * 100;

    const score = Math.max(300, Math.min(850, Math.round(baseScore + paymentContribution + yieldContribution + priceContribution)));

    let statusText = 'Reputasi Cukup (B)';
    let statusColor = 'text-yellow-800 bg-yellow-50/60 border-yellow-200';

    if (score >= 750) {
      statusText = 'Reputasi Sangat Baik (A+)';
      statusColor = 'text-emerald-800 bg-emerald-100/60 border-emerald-200';
    } else if (score >= 650) {
      statusText = 'Reputasi Baik (A)';
      statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    } else if (score >= 500) {
      statusText = 'Reputasi Cukup (B)';
      statusColor = 'text-yellow-700 bg-yellow-50/60 border-yellow-100';
    } else {
      statusText = 'Risiko Tinggi (C)';
      statusColor = 'text-red-800 bg-red-50/60 border-red-200';
    }

    // Borrowing limit estimate in Millions IDR
    const limitAmount = Math.max(10, Math.round((score - 300) * 0.4));

    return {
      score,
      statusText,
      statusColor,
      limitAmount,
    };
  }, [temp, moisture, sunlight]);

  return (
    <div className="bg-white border border-gray-100 rounded-[2rem] p-6 mt-6 shadow-sm space-y-6 relative overflow-hidden">
      {/* Simulated Monitor Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(118,154,142,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(118,154,142,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-800 animate-pulse" />
          <span className="text-xs font-semibold font-mono text-gray-500 uppercase tracking-wider">SIMULATOR SKOR KREDIT</span>
        </div>
        <span className={`text-[11px] font-mono font-bold px-3 py-1 rounded-full border ${simulation.statusColor}`}>
          {simulation.statusText}
        </span>
      </div>

      {/* Control sliders */}
      <div className="relative z-10 space-y-4">
        {/* Payment history slider (was Moisture) */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-mono text-gray-500">
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Riwayat Pelunasan (Netting)</span>
            <span className="font-semibold text-gray-900">{moisture}% Tepat Waktu</span>
          </div>
          <input
            type="range"
            min="20"
            max="100"
            step="1"
            value={moisture}
            onChange={(e) => setMoisture(parseInt(e.target.value))}
            className="w-full accent-emerald-800 h-1.5 bg-gray-100 rounded-lg cursor-pointer"
          />
        </div>

        {/* Yield Production capacity slider (was Temp) */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-mono text-gray-500">
            <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-blue-500" /> Kapasitas Hasil Produksi (Panen)</span>
            <span className="font-semibold text-gray-900">{temp} Ton / Musim</span>
          </div>
          <input
            type="range"
            min="10"
            max="40"
            step="1"
            value={temp}
            onChange={(e) => setTemp(parseInt(e.target.value))}
            className="w-full accent-emerald-800 h-1.5 bg-gray-100 rounded-lg cursor-pointer"
          />
        </div>

        {/* Commodity price slider (was Sunlight) */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-mono text-gray-500">
            <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5 text-yellow-500" /> Estimasi Harga Komoditas</span>
            <span className="font-semibold text-gray-900">Rp {sunlight}.000 / kg</span>
          </div>
          <input
            type="range"
            min="2"
            max="14"
            step="1"
            value={sunlight}
            onChange={(e) => setSunlight(parseInt(e.target.value))}
            className="w-full accent-emerald-800 h-1.5 bg-gray-100 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Outputs */}
      <div className="relative z-10 grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
        <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-center">
          <span className="text-[10px] font-mono text-gray-400 block uppercase mb-1">SKOR KREDIT LEDGER</span>
          <p className="text-2xl font-mono font-bold text-gray-900">{simulation.score} <span className="text-xs text-gray-400 font-sans">/ 850</span></p>
        </div>
        <div className="bg-[#ebf5e9]/40 p-3.5 rounded-2xl border border-soft-green/15 text-center">
          <span className="text-[10px] font-mono text-emerald-800 block uppercase mb-1">LIMIT MODAL KERJA</span>
          <p className="text-2xl font-mono font-bold text-emerald-950 flex items-center justify-center gap-1">
            {simulation.limitAmount} jt
            <span className="text-[10px] font-sans font-light text-gray-500">IDR</span>
          </p>
        </div>
      </div>
    </div>
  );
}
