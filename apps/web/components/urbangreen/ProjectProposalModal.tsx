/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sprout, ArrowRight, ArrowLeft, CheckCircle, Sparkles, Building, BarChart2, Droplets } from 'lucide-react';

interface ProjectProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProjectProposalModal({ isOpen, onClose }: ProjectProposalModalProps) {
  const [step, setStep] = useState(1);
  const [projectType, setProjectType] = useState('kud-padi');
  const [sqFootage, setSqFootage] = useState(25); // Lahan dalam Hektar (HA)
  const [city, setCity] = useState('Cianjur');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [org, setOrg] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Dynamic calculations based on acreage (Hektar) and crop type
  const metrics = useMemo(() => {
    let priceMultiplier = 12.0; // Juta Rp per Hektar
    let yieldMultiplier = 4.2;  // Ton per Hektar
    let efficiencyRate = 95;    // % Netting Accuracy

    switch (projectType) {
      case 'kud-padi':
        priceMultiplier = 15.0;
        yieldMultiplier = 5.5;
        efficiencyRate = 98;
        break;
      case 'kud-horti':
        priceMultiplier = 18.5;
        yieldMultiplier = 3.8;
        efficiencyRate = 94;
        break;
      case 'kud-kebun':
        priceMultiplier = 24.0;
        yieldMultiplier = 2.1;
        efficiencyRate = 96;
        break;
      case 'poktan-desa':
        priceMultiplier = 9.5;
        yieldMultiplier = 4.0;
        efficiencyRate = 92;
        break;
    }

    const totalFunding = sqFootage * priceMultiplier;
    const totalYield = sqFootage * yieldMultiplier;

    return {
      totalFunding: parseFloat(totalFunding.toFixed(1)),
      totalYield: parseFloat(totalYield.toFixed(1)),
      efficiencyRate,
    };
  }, [projectType, sqFootage]);

  const handleNextStep = () => {
    if (step === 2) {
      const errs: Record<string, string> = {};
      if (!name.trim()) errs.name = 'Full name is required';
      if (!email.trim() || !email.includes('@')) errs.email = 'Invalid email address';
      
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        return;
      }
    }
    setErrors({});
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleNextStep();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div id="proposal-modal-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div
          id="proposal-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="bg-white text-gray-900 rounded-[2.5rem] w-full max-w-4xl overflow-hidden border border-gray-100 shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-[580px]"
        >
          {/* Left Column: Dynamic Simulator Display */}
          <div className="w-full md:w-[360px] bg-primary-dark text-white p-8 flex flex-col justify-between relative overflow-hidden">
            {/* Background botanical decorations */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-soft-green/10 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -ml-8 -mb-8" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-soft-green mb-6">
                <Sprout className="w-5 h-5" />
                <span className="text-xs font-semibold tracking-wider uppercase font-mono">PARTNER CALCULATOR</span>
              </div>
              
              <h3 className="text-2xl font-medium tracking-tight text-white mb-2 leading-snug">
                Estimated Partnership Impact
              </h3>
              <p className="text-sm text-gray-300 font-light mb-8">
                Calculated in real-time based on commodity type and managed agricultural acreage.
              </p>

              {/* Dynamic Stats Stack */}
              <div className="space-y-6">
                {/* Funding Estimation */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-400 font-mono mb-1">
                    <span>ESTIMATED WORKING CAPITAL</span>
                    <Sparkles className="w-3.5 h-3.5 text-soft-green" />
                  </div>
                  <p className="text-3xl font-mono font-semibold text-soft-green">
                    Rp {metrics.totalFunding} <span className="text-sm font-sans font-light text-white">Million/season</span>
                  </p>
                </div>

                {/* Crop Production Estimate */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-400 font-mono mb-1">
                    <span>ESTIMATED YIELD PRODUCTION</span>
                    <Droplets className="w-3.5 h-3.5 text-blue-300" />
                  </div>
                  <p className="text-3xl font-mono font-semibold text-white">
                    {metrics.totalYield} <span className="text-sm font-sans font-light text-gray-300">Tons/season</span>
                  </p>
                </div>

                {/* Netting Accuracy */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-400 font-mono mb-1">
                    <span>AUTOMATED SETTLEMENT EFFICIENCY</span>
                    <Building className="w-3.5 h-3.5 text-orange-300" />
                  </div>
                  <p className="text-3xl font-mono font-semibold text-white">
                    {metrics.efficiencyRate}% <span className="text-sm font-sans font-light text-gray-300">Accuracy</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Microclaimer bottom */}
            <p className="text-[10px] text-gray-400 font-mono leading-relaxed mt-6 relative z-10">
              *Estimates are based on historical regional crop yields and current Bapanas market price standards.
            </p>
          </div>

          {/* Right Column: Step-by-Step Forms */}
          <div className="flex-1 bg-white p-8 flex flex-col justify-between relative overflow-y-auto no-scrollbar">
            {/* Header / Dismiss */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono font-semibold text-gray-400">
                STEP {step} OF 3 • {step === 1 ? 'CONFIGURATION' : step === 2 ? 'COOPERATIVE PROFILE' : 'SUMMARY'}
              </span>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center hover:bg-gray-100 transition-colors"
                id="close-proposal-modal-btn"
              >
                <X className="w-5 h-5 text-gray-500 hover:text-gray-900" />
              </button>
            </div>

            {/* Forms body */}
            <div className="flex-grow flex flex-col justify-center">
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Land & Partnership Configuration</h2>
                    <p className="text-sm text-gray-500 mt-1">Select your cooperative category and total farm size to calculate the netting settlement model.</p>
                  </div>

                  {/* Project Type Grid Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-700 font-mono uppercase tracking-wider">GROUP / COOPERATIVE CATEGORY</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setProjectType('kud-padi')}
                        className={`p-3.5 rounded-2xl text-left border text-sm transition-all flex flex-col justify-between gap-1 ${
                          projectType === 'kud-padi'
                            ? 'bg-pale-mint/30 border-primary-dark/30 ring-1 ring-primary-dark text-gray-900'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-semibold block">Paddy Sector Cooperative (KUD)</span>
                        <span className="text-xs text-gray-500 leading-tight">Grains & Food Crops</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setProjectType('kud-horti')}
                        className={`p-3.5 rounded-2xl text-left border text-sm transition-all flex flex-col justify-between gap-1 ${
                          projectType === 'kud-horti'
                            ? 'bg-pale-mint/30 border-primary-dark/30 ring-1 ring-primary-dark text-gray-900'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-semibold block">Horticulture Cooperative (KUD)</span>
                        <span className="text-xs text-gray-500 leading-tight">Seasonal Fruits & Vegetables</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setProjectType('kud-kebun')}
                        className={`p-3.5 rounded-2xl text-left border text-sm transition-all flex flex-col justify-between gap-1 ${
                          projectType === 'kud-kebun'
                            ? 'bg-pale-mint/30 border-primary-dark/30 ring-1 ring-primary-dark text-gray-900'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-semibold block">Plantation Cooperative</span>
                        <span className="text-xs text-gray-500 leading-tight">Coffee, Cocoa, & Tea Commodities</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setProjectType('poktan-desa')}
                        className={`p-3.5 rounded-2xl text-left border text-sm transition-all flex flex-col justify-between gap-1 ${
                          projectType === 'poktan-desa'
                            ? 'bg-pale-mint/30 border-primary-dark/30 ring-1 ring-primary-dark text-gray-900'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-semibold block">Village Farmer Group (Poktan)</span>
                        <span className="text-xs text-gray-500 leading-tight">Local Farmer Unions & Gapoktan</span>
                      </button>
                    </div>
                  </div>

                  {/* Square Footage Slider */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-semibold text-gray-700 font-mono tracking-wider">
                      <span>ESTIMATED TOTAL LAND SIZE</span>
                      <span className="text-sm font-semibold text-primary-dark bg-pale-mint/50 px-3 py-1 rounded-full border border-soft-green">
                        {sqFootage} Hectares (HA)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="500"
                      step="5"
                      value={sqFootage}
                      onChange={(e) => setSqFootage(parseInt(e.target.value))}
                      className="w-full accent-primary-dark h-2 bg-gray-100 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                      <span>5 HA</span>
                      <span>250 HA</span>
                      <span>500 HA</span>
                    </div>
                  </div>

                  {/* City dropdown */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-700 font-mono uppercase tracking-wider">PRIMARY OPERATIONS REGION</label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-primary-dark focus:border-primary-dark"
                    >
                      <option value="Cianjur">Cianjur, West Java</option>
                      <option value="Malang">Malang, East Java</option>
                      <option value="Subang">Subang, West Java</option>
                      <option value="Aceh Gayo">Aceh Gayo, Aceh</option>
                      <option value="Lainnya">Other Regions (Outside Pilots)</option>
                    </select>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Connect Your Cooperative</h2>
                    <p className="text-sm text-gray-500 mt-1">Provide the representative details to validate and establish your node on our network.</p>
                  </div>

                  <form className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 font-mono uppercase">Full Name of Representative</label>
                      <input
                        type="text"
                        placeholder="e.g. Suhardi"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                        }}
                        className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-1 ${
                          errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-primary-dark'
                        }`}
                      />
                      {errors.name && <p className="text-xs text-red-500 font-mono">{errors.name}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 font-mono uppercase">Cooperative Email Address</label>
                      <input
                        type="email"
                        placeholder="e.g. jaya.coop@desa.id"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                        }}
                        className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-1 ${
                          errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-primary-dark'
                        }`}
                      />
                      {errors.email && <p className="text-xs text-red-500 font-mono">{errors.email}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 font-mono uppercase">Cooperative / Legal Entity Name (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. KUD Cianjur Jaya Mandiri"
                        value={org}
                        onChange={(e) => setOrg(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-primary-dark"
                      />
                    </div>
                  </form>
                </div>
              )}

              {step === 3 && (
                <div className="text-center space-y-6">
                  {/* Confetti / Success graphic */}
                  <div className="mx-auto w-20 h-20 rounded-full bg-pale-mint/50 flex items-center justify-center text-primary-dark border border-soft-green">
                    <CheckCircle className="w-10 h-10" />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-3xl font-semibold tracking-tight text-gray-900">Partnership Submitted!</h2>
                    <p className="text-sm text-gray-600 max-w-md mx-auto">
                      Thank you, <span className="font-semibold text-gray-900">{name}</span>. We have generated your automated netting and credit capacity proposal for <span className="font-semibold text-gray-900">{sqFootage} HA</span> in <span className="font-semibold text-gray-900">{city}</span>.
                    </p>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-gray-50 border border-gray-100 rounded-3xl p-5 text-left text-xs space-y-3 font-mono">
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="text-gray-400">PROPOSAL REGISTRATION</span>
                      <span className="font-semibold text-gray-800">#AN-{city.toUpperCase().substring(0, 3)}-{Math.floor(Math.random() * 90000 + 10000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-sans">Registered Land Size:</span>
                      <span className="font-semibold text-gray-800 font-sans">{sqFootage} HA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-sans">Potential Working Capital:</span>
                      <span className="font-semibold text-emerald-700 font-sans">Rp {metrics.totalFunding} Million/season</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-sans">Contact Email:</span>
                      <span className="font-semibold text-gray-800 font-sans">{email}</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 font-light max-w-sm mx-auto">
                    The partnership framework, dIDR API integration guide, and smart contract netting parameters have been sent to your email.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-6">
              {step > 1 && step < 3 ? (
                <button
                  onClick={handlePrevStep}
                  className="px-6 py-3 rounded-full border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button
                  onClick={handleNextStep}
                  className="px-6 py-3 rounded-full bg-primary-dark text-white text-sm font-medium hover:bg-opacity-90 flex items-center gap-2 transition-colors ml-auto"
                >
                  {step === 1 ? 'Complete Profile' : 'Submit Proposal'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="px-8 py-3 rounded-full bg-primary-dark text-white text-sm font-medium hover:bg-opacity-90 transition-colors w-full"
                >
                  Finish & Close
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
