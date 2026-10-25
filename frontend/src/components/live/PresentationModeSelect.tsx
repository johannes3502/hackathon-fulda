import { NativeSelect } from "@/components/ui/input";
import {
  PRESENTATION_MODES,
  type PresentationMode,
} from "@/features/questions/presentation";

export function PresentationModeSelect({
  mode,
  onMode,
}: {
  mode: PresentationMode;
  onMode: (mode: PresentationMode) => void;
}) {
  return (
    <div className="field">
      <label htmlFor="presentation-mode">What are you preparing for?</label>
      <NativeSelect
        id="presentation-mode"
        value={mode}
        onChange={(event) => onMode(event.target.value as PresentationMode)}
        aria-describedby="presentation-mode-focus"
      >
        {Object.entries(PRESENTATION_MODES).map(([key, item]) => (
          <option key={key} value={key}>
            {item.label}
          </option>
        ))}
      </NativeSelect>
      <p className="field-hint" id="presentation-mode-focus">
        {PRESENTATION_MODES[mode].listener}: {PRESENTATION_MODES[mode].focus}{" "}
        Sets the focus for voice and typed questions after recording.
      </p>
    </div>
  );
}
