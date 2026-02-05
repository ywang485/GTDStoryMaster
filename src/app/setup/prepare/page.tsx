import { PreparationScreen } from "@/components/game/preparation-screen";
import { HydrationGate } from "@/components/providers/hydration-gate";

export default function PreparePage() {
  return (
    <HydrationGate>
      <PreparationScreen />
    </HydrationGate>
  );
}
