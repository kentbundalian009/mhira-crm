import React, { useState, useMemo } from 'react';

export default function ProductionTimeCalculatorModal({
  isOpen,
  onClose,
  selectedProduct,
  numberOfBatches = 1,
  totalBatchWeight = 5,
  batchUom = 'kg',
  targetQuantity = 100,
  ingredients = [],
  mfgDate = '',
}) {
  // Base duration settings (in minutes) per batch
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(30); // weighing & setup
  const [processingTimeMinutes, setProcessingTimeMinutes] = useState(90); // heating, blending, reacting
  const [qaCoolingTimeMinutes, setQaCoolingTimeMinutes] = useState(45); // resting, QA inspection
  const [packagingTimeMinutes, setPackagingTimeMinutes] = useState(45); // bottle/pack filling

  // Procurement delay settings if materials have shortages
  const [procurementDelayDays, setProcurementDelayDays] = useState(2); // default 2 days if shortage
  const [procurementType, setProcurementType] = useState('standard'); // 'standard' (2 days) | 'rush' (1 day) | 'local' (4 hours) | 'custom'

  const numBatches = Math.max(1, Number(numberOfBatches) || 1);

  // Check for ingredient shortages
  const missingMaterials = useMemo(() => {
    return (ingredients || []).filter(
      (ing) => (Number(ing.shortageQty) || 0) > 0
    );
  }, [ingredients]);

  const hasShortage = missingMaterials.length > 0;

  // Total production time in minutes
  // Batch processing scales with number of batches; setup and QA have a base buffer
  const totalProductionMinutes = useMemo(() => {
    const setup = Number(prepTimeMinutes) || 0;
    const processing = (Number(processingTimeMinutes) || 0) * numBatches;
    const qa = (Number(qaCoolingTimeMinutes) || 0) * Math.ceil(numBatches * 0.7);
    const packaging = (Number(packagingTimeMinutes) || 0) * numBatches;
    return setup + processing + qa + packaging;
  }, [prepTimeMinutes, processingTimeMinutes, qaCoolingTimeMinutes, packagingTimeMinutes, numBatches]);

  // Production duration formatted
  const productionHours = Math.floor(totalProductionMinutes / 60);
  const productionRemainingMinutes = totalProductionMinutes % 60;
  const productionDurationString = `${productionHours}h ${productionRemainingMinutes > 0 ? `${productionRemainingMinutes}m` : ''}`.trim();

  // Procurement delay in hours
  const procurementDelayHours = useMemo(() => {
    if (!hasShortage) return 0;
    if (procurementType === 'local') return 4;
    if (procurementType === 'rush') return 24;
    if (procurementType === 'standard') return 48;
    return Math.max(0, (Number(procurementDelayDays) || 0) * 24);
  }, [hasShortage, procurementType, procurementDelayDays]);

  // Total lead time calculation
  const totalLeadTimeHours = (totalProductionMinutes / 60) + procurementDelayHours;

  // Calculate projected completion date & time
  const { startTime, completionDateString } = useMemo(() => {
    const baseDate = mfgDate ? new Date(mfgDate) : new Date();
    // If mfgDate is just YYYY-MM-DD, default start time to 08:00 AM
    if (mfgDate && mfgDate.length === 10) {
      baseDate.setHours(8, 0, 0, 0);
    }

    const finishDate = new Date(baseDate.getTime() + totalLeadTimeHours * 60 * 60 * 1000);

    const startFormatted = baseDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const finishFormatted = finishDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return {
      startTime: startFormatted,
      completionDateString: finishFormatted,
    };
  }, [mfgDate, totalLeadTimeHours]);

  // Early return strictly placed AFTER all hooks have executed unconditionally
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Production Lead Time & Schedule Calculator
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Automated production time range and material procurement delay estimator
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto flex-1 custom-scrollbar text-xs sm:text-sm">
          {/* TOP SUMMARY BANNER */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            hasShortage ? 'bg-amber-50/70 border-amber-200' : 'bg-emerald-50/70 border-emerald-200'
          }`}>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Target Product & Batch Size
              </span>
              <span className="text-sm font-bold text-slate-900 block">
                {selectedProduct?.itemName || selectedProduct?.itemDescription || 'Selected Finished Good'}
              </span>
              <span className="text-xs text-slate-600 font-medium">
                {numBatches} {numBatches === 1 ? 'Batch' : 'Batches'} &bull; {totalBatchWeight} {batchUom} &bull; Target Yield: {targetQuantity} pcs
              </span>
            </div>

            <div className="sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Estimated Total Lead Time
              </span>
              <span className="text-lg font-mono font-bold text-[#01390f] block">
                {hasShortage
                  ? `${Math.floor(procurementDelayHours / 24)}d ${procurementDelayHours % 24 > 0 ? `${procurementDelayHours % 24}h ` : ''}${productionDurationString}`
                  : productionDurationString}
              </span>
              <span className="text-[11px] font-semibold text-slate-600">
                Projected Finish: <strong className="text-slate-900">{completionDateString}</strong>
              </span>
            </div>
          </div>

          {/* MATERIAL SHORTAGE & PROCUREMENT STATUS */}
          <div className="border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Raw Material Availability Status
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                hasShortage
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {hasShortage ? `Shortage (${missingMaterials.length} item${missingMaterials.length > 1 ? 's' : ''})` : 'All Materials Available'}
              </span>
            </div>

            {hasShortage ? (
              <div className="flex flex-col gap-3">
                <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-3 text-xs text-amber-950 flex flex-col gap-1.5">
                  <span className="font-semibold">
                    The following materials must be purchased or replenished before full production:
                  </span>
                  <div className="divide-y divide-amber-200/60 border border-amber-200/80 rounded-lg overflow-hidden bg-white">
                    {missingMaterials.map((item, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800">{item.name || item.materialCode}</span>
                        <span className="font-mono font-bold text-rose-600">
                          {Number(item.shortageQty || 0).toLocaleString()} {item.uom || 'g'} shortage
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PROCUREMENT DELAY SELECTOR */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">
                    Procurement Lead Time Option
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setProcurementType('local')}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        procurementType === 'local'
                          ? 'bg-[#01390f] text-white border-[#01390f]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Local / Urgent (4h)
                    </button>

                    <button
                      type="button"
                      onClick={() => setProcurementType('rush')}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        procurementType === 'rush'
                          ? 'bg-[#01390f] text-white border-[#01390f]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Rush Order (1 Day)
                    </button>

                    <button
                      type="button"
                      onClick={() => setProcurementType('standard')}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        procurementType === 'standard'
                          ? 'bg-[#01390f] text-white border-[#01390f]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Standard (2 Days)
                    </button>

                    <button
                      type="button"
                      onClick={() => setProcurementType('custom')}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        procurementType === 'custom'
                          ? 'bg-[#01390f] text-white border-[#01390f]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Custom Days
                    </button>
                  </div>

                  {procurementType === 'custom' && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">Days to deliver:</span>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={procurementDelayDays}
                        onChange={(e) => setProcurementDelayDays(Math.max(1, Number(e.target.value) || 1))}
                        className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-800"
                      />
                      <span className="text-xs text-slate-500">({procurementDelayDays * 24} hours delay)</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50/50 border border-emerald-200/60 rounded-xl text-xs text-emerald-900 font-medium">
                No raw material shortages detected. Production can begin immediately with zero procurement delays.
              </div>
            )}
          </div>

          {/* BATCH PRODUCTION TIME BREAKDOWN SETTINGS */}
          <div className="border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3 bg-white">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Per-Batch Phase Duration (Customizable)
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  1. Setup & Weighing
                </label>
                <div className="flex items-center border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={prepTimeMinutes}
                    onChange={(e) => setPrepTimeMinutes(Number(e.target.value) || 0)}
                    className="w-full bg-transparent text-xs font-mono font-bold text-slate-800 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 font-bold ml-1">mins</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  2. Blending & Cooking
                </label>
                <div className="flex items-center border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={processingTimeMinutes}
                    onChange={(e) => setProcessingTimeMinutes(Number(e.target.value) || 0)}
                    className="w-full bg-transparent text-xs font-mono font-bold text-slate-800 focus:none"
                  />
                  <span className="text-[10px] text-slate-400 font-bold ml-1">mins</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  3. Resting & Quality Check
                </label>
                <div className="flex items-center border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={qaCoolingTimeMinutes}
                    onChange={(e) => setQaCoolingTimeMinutes(Number(e.target.value) || 0)}
                    className="w-full bg-transparent text-xs font-mono font-bold text-slate-800 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 font-bold ml-1">mins</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  4. Packaging & Bottling
                </label>
                <div className="flex items-center border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={packagingTimeMinutes}
                    onChange={(e) => setPackagingTimeMinutes(Number(e.target.value) || 0)}
                    className="w-full bg-transparent text-xs font-mono font-bold text-slate-800 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 font-bold ml-1">mins</span>
                </div>
              </div>
            </div>
          </div>

          {/* ESTIMATED SCHEDULE TIMELINE CARD */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Projected Production Schedule Range
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white border border-slate-200 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Start Time</span>
                <span className="font-semibold text-slate-800">{startTime}</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Processing Duration</span>
                <span className="font-semibold text-slate-800">{productionDurationString} ({numBatches} batch{numBatches > 1 ? 'es' : ''})</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Completion</span>
                <span className="font-bold text-[#01390f]">{completionDateString}</span>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end shrink-0 whitespace-nowrap">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
