import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CorrelationPlot from './CorrelationPlot';
import MetricsBox from './MetricsBox';
import ExportButtons from './ExportButtons';
import type { PatientSample } from '../types/patient';
import type { CorrelationResult } from '../types/correlation';

interface MainCanvasProps {
  samples: PatientSample[];
  result: CorrelationResult;
  geneA: string;
  geneB: string;
  cancerType: string;
  showGtex: boolean;
  isLoading: boolean;
  selectedSamples: string[];
  onHover: (id: string | null) => void;
  onResetView: () => void;
}

const MainCanvas: React.FC<MainCanvasProps> = (props) => {
  return (
    <div className="flex flex-col flex-1 min-w-0 bg-[#0f172a]">
      <div className="flex-1 relative p-3 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${props.cancerType}-${props.geneA}-${props.geneB}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full rounded-xl border border-gray-800 overflow-hidden"
            style={{ background: '#111827', minHeight: 400 }}
          >
            <CorrelationPlot
              samples={props.samples}
              result={props.result}
              geneA={props.geneA}
              geneB={props.geneB}
              cancerType={props.cancerType}
              showGtex={props.showGtex}
              isLoading={props.isLoading}
              onHover={props.onHover}
              selectedSamples={props.selectedSamples}
            />
            {!props.isLoading && (
              <MetricsBox
                result={props.result}
                geneA={props.geneA}
                geneB={props.geneB}
                cancerType={props.cancerType}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <ExportButtons
        samples={props.samples}
        result={props.result}
        geneA={props.geneA}
        geneB={props.geneB}
        cancerType={props.cancerType}
        onResetView={props.onResetView}
      />
    </div>
  );
};

export default React.memo(MainCanvas);
