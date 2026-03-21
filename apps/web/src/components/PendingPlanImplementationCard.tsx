import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function PendingPlanImplementationCard({
  planContent,
  isBusy,
  onApply,
}: {
  planContent: string;
  isBusy: boolean;
  onApply: () => void;
}): React.JSX.Element {
  return (
    <motion.div
      key="pending-plan-implementation"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.15 }}
      className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-sm"
    >
      <div className="text-[10px] text-amber-700 dark:text-amber-300 uppercase tracking-wider font-medium">
        Pending Plan
      </div>
      <div className="mt-1 text-sm font-medium text-foreground">
        Ready to apply this plan
      </div>
      <div className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg border border-amber-500/20 bg-background/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        {planContent}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          Continue this thread and start implementation.
        </div>
        <Button type="button" size="sm" onClick={onApply} disabled={isBusy}>
          Apply Plan
        </Button>
      </div>
    </motion.div>
  );
}
