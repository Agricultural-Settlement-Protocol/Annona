/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Globe, Activity, Thermometer, Droplets, ShieldAlert, Heart, RefreshCw } from 'lucide-react';
import { TELEMETRY_CITIES } from './data';
import type { LiveTelemetryCity } from './types';

interface LiveTelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCityId?: string;
}

export default function LiveTelemetryModal({ isOpen, onClose, initialCityId = 'cianjur' }: LiveTelemetryModalProps) {
  const [selectedCity, setSelectedCity] = useState<LiveTelemetryCity>(
    TELEMETRY_CITIES.find(c => c.id === initialCityId) || TELEMETRY_CITIES[0]!
  );
  const [isLive, setIsLive] = useState(true);
  const [ticker, setTicker] = useState(0);

  // Simulate updating transaction metrics in real-time
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setTicker(prev => prev + 1);
      setSelectedCity(prev => {
        const randTemp = (Math.random() - 0.5) * 0.2;
        const randHum = Math.round((Math.random() - 0.5) * 1);
        return {
          ...prev,
          temperature: parseFloat((prev.temperature + randTemp).toFixed(1)),
          humidity: Math.max(50, Math.min(100, prev.humidity + randHum)),
          plantHealth: Math.max(90, Math.min(100, prev.plantHealth + (Math.random() > 0.7 ? 1 : Math.random() > 0.7 ? -1 : 0))),
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isLive, selectedCity.id]);

  const handleCitySelect = (cityId: string) => {
    const city = TELEMETRY_CITIES.find(c => c.id === cityId);
    if (city) {
      setSelectedCity(city);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div id="telemetry-modal-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div
          id="telemetry-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="bg-white text-gray-900 rounded-[2.5rem] w-full max-w-5xl overflow-hidden border border-gray-100 shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-[600px]"
        >
          {/* Left Column: Video Feed */}
          <div className="flex-1 relative bg-zinc-900 overflow-hidden group flex flex-col justify-between">
            {/* Custom video scanline effect / feed filter */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.4))] z-10" />
            
            {/* The City View Image */}
            <img
              src={selectedCity.imageUrl}
              alt={selectedCity.name}
              className="absolute inset-0 w-full h-full object-cover opacity-80 filter brightness-90 saturate-[0.8] transition-all duration-700"
            />
            
            {/* Telemetry HUD Overlays */}
            <div className="relative z-10 p-6 flex justify-between items-start w-full">
              <div className="bg-black/60 backdrop-blur-md rounded-full px-4 py-2 border border-white/10 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs font-mono tracking-widest text-emerald-400">
                  {isLive ? 'LORA FEED: AKTIF' : 'LORA FEED: TERHENTI'}
                </span>
              </div>
              <div className="bg-black/60 backdrop-blur-md rounded-full px-4 py-2 border border-white/10 text-xs font-mono text-white">
                SINKRONISASI UTC: {new Date().toISOString().substring(11, 19)}
              </div>
            </div>

            {/* Play/Pause control overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {!isLive && (
                <div className="bg-black/80 text-white p-4 rounded-full border border-white/10">
                  <span className="text-xs font-mono">MONITOR DIHENTIKAN</span>
                </div>
              )}
            </div>

            {/* Bottom HUD info */}
            <div className="relative z-10 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent w-full mt-auto text-white">
              <p className="text-sm font-mono text-emerald-400 mb-1">MONITOR TRANSAKSI KOPERASI</p>
              <h3 className="text-3xl font-medium tracking-tight text-white mb-2">
                KUD {selectedCity.name} <span className="text-lg text-zinc-400 font-light">, {selectedCity.country}</span>
              </h3>
              <p className="text-xs text-zinc-300 max-w-md font-sans">
                Memantau penyaluran saprotan aman, pengukuran tonase panen terverifikasi, dan pelunasan netting otomatis secara real-time di Stellar Blockchain.
              </p>
            </div>
          </div>

          {/* Right Column: Telemetry Specs */}
          <div className="w-full md:w-[380px] bg-white p-6 md:p-8 flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-100 overflow-y-auto no-scrollbar relative">
            {/* Subtle background grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(118,154,142,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(118,154,142,0.015)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-emerald-800">
                <Activity className="w-5 h-5 animate-pulse" />
                <span className="text-sm font-semibold tracking-wider font-mono">METRIK LEDGER KUD</span>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                id="close-telemetry-modal-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* City Selector Tabs */}
            <div className="relative z-10 grid grid-cols-4 gap-2 mb-6">
              {TELEMETRY_CITIES.map(city => (
                <button
                  key={city.id}
                  onClick={() => handleCitySelect(city.id)}
                  className={`py-2 px-1 rounded-xl text-xs font-medium border font-mono transition-all text-center ${
                    selectedCity.id === city.id
                      ? 'bg-[#ebf5e9] text-emerald-800 border-soft-green/30 font-bold shadow-sm'
                      : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  {city.name.substring(0, 4).toUpperCase()}
                </button>
              ))}
            </div>

            {/* Numeric Indicators */}
            <div className="relative z-10 space-y-4 mb-6">
              {/* Plant Health */}
              <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100/50 flex items-center justify-center text-emerald-800">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 font-mono">INDEKS REPUTASI</p>
                    <p className="text-xs font-semibold text-gray-800">Reputasi Koperasi</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold font-mono text-emerald-800">
                    {selectedCity.plantHealth}%
                  </p>
                  <p className="text-[9px] text-emerald-600 font-mono font-bold">SANGAT BAIK</p>
                </div>
              </div>

              {/* Climate Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Thermometer className="w-4 h-4 text-orange-500" />
                    <span className="text-[10px] font-mono">YIELD RATA-RATA</span>
                  </div>
                  <p className="text-lg font-mono font-bold text-gray-900">{selectedCity.temperature} Ton</p>
                </div>

                <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Droplets className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] font-mono">NETTING RATIO</span>
                  </div>
                  <p className="text-lg font-mono font-bold text-gray-900">{selectedCity.humidity}%</p>
                </div>
              </div>

              {/* AQI Indicator */}
              <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-gray-400 font-mono">MITRA PETANI AKTIF</p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5">Petani Terdaftar</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#ebf5e9] text-emerald-800 border border-soft-green/30 text-xs font-mono font-bold">
                  {selectedCity.activeSensors} Jiwa
                </span>
              </div>

              {/* CO2 Sequestration Rate */}
              <div className="bg-[#ebf5e9]/40 border border-soft-green/15 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-emerald-800 font-bold font-mono">DANA NETTING TERKUNCI</span>
                  <Globe className="w-4 h-4 text-emerald-800" />
                </div>
                <p className="text-xl font-mono font-bold text-emerald-950 tracking-tight">
                  Rp {(selectedCity.co2Offset * 1000 + (ticker * 150000)).toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] text-emerald-700/80 mt-1 font-sans">
                  Total volume modal dan netting yang berjalan secara aman di KUD ini.
                </p>
              </div>
            </div>

            {/* Toggle System Activity */}
            <div className="relative z-10 flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
              <button
                onClick={() => setIsLive(!isLive)}
                className="flex items-center gap-2 text-xs font-mono text-gray-500 hover:text-gray-900 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLive ? 'animate-spin' : ''}`} />
                {isLive ? 'HENTIKAN MONITOR' : 'SINKRONISASI KEMBALI'}
              </button>
              <span className="text-[10px] font-mono text-gray-400 font-bold">KUD-{selectedCity.id.toUpperCase()}-X8</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
