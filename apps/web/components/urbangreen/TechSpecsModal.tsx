/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { X, Cpu, Zap, Radio, Layers, Check } from 'lucide-react';

interface TechSpecsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TechSpecsModal({ isOpen, onClose }: TechSpecsModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div id="tech-specs-modal-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div
          id="tech-specs-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="bg-white text-gray-900 rounded-[2.5rem] w-full max-w-3xl overflow-hidden border border-gray-100 shadow-2xl p-8 flex flex-col md:h-[550px] justify-between"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary-dark" />
              <span className="text-sm font-semibold tracking-wider font-mono text-gray-500 uppercase">PROTOCOL & TECHNICAL SPECIFICATIONS</span>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center hover:bg-gray-100 transition-colors"
              id="close-tech-specs-btn"
            >
              <X className="w-5 h-5 text-gray-500 hover:text-gray-900" />
            </button>
          </div>

          {/* Grid Specifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 overflow-y-auto no-scrollbar">
            {/* Soroban Smart Contract */}
            <div className="border border-gray-100 p-5 rounded-3xl bg-gray-50/50 flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-pale-mint flex items-center justify-center text-emerald-800 shrink-0">
                <Radio className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-semibold text-gray-900">Soroban Smart Contract (Netting)</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Decentralized smart contracts on the Stellar Network that record crop deposits and execute input-credit netting atomically, eliminating manual bookkeeping errors.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  <span className="text-[10px] font-mono bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-500">Stellar Soroban</span>
                  <span className="text-[10px] font-mono bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-500">Audit-Safe</span>
                </div>
              </div>
            </div>

            {/* Stellar Anchor & dIDR Bridge */}
            <div className="border border-gray-100 p-5 rounded-3xl bg-gray-50/50 flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-pale-mint flex items-center justify-center text-emerald-800 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-semibold text-gray-900">Stellar Anchor & dIDR Bridge</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Real-time payment gateway facilitating automated conversion between Digital Rupiah (dIDR) stablecoins and local cooperative bank accounts to ensure swift cash-outs.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  <span className="text-[10px] font-mono bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-500">SEP-24 Standard</span>
                  <span className="text-[10px] font-mono bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-500">Real-time settlement</span>
                </div>
              </div>
            </div>

            {/* AI Credit Scoring */}
            <div className="border border-gray-100 p-5 rounded-3xl bg-gray-50/50 flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-pale-mint flex items-center justify-center text-emerald-800 shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-semibold text-gray-900">Decentralized Reputation Score</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  A credit assessment engine that computes non-collateralized reputation scores based on repayment consistency, historical yield capacity, and operational stability.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  <span className="text-[10px] font-mono bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-500">Decentralized ID (DID)</span>
                  <span className="text-[10px] font-mono bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-500">Score 300-850</span>
                </div>
              </div>
            </div>

            {/* Timbangan IoT */}
            <div className="border border-gray-100 p-5 rounded-3xl bg-gray-50/50 flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-pale-mint flex items-center justify-center text-emerald-800 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-semibold text-gray-900">Smart Digital Weighing Scales (IoT)</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Direct blockchain integration of calibrated digital weighing sensors in cooperative warehouses to verify physical harvest tonnage instantly.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  <span className="text-[10px] font-mono bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-500">Wi-Fi / LoRa</span>
                  <span className="text-[10px] font-mono bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-500">Accuracy ±100g</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer certification checklist */}
          <div className="bg-[#E2F1E1]/40 border border-soft-green/30 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-700">
            <span className="font-medium">Certifications & Regulatory Compliance:</span>
            <div className="flex gap-4">
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-700" /> OJK Sandbox</span>
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-700" /> Stellar Certified</span>
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-700" /> ISO 27001</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
