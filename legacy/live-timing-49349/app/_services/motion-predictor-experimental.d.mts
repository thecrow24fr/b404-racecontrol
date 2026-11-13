export interface PredictorSample {
  distance: number; at: number; lap: number; running: boolean;
  sourceAt?: number; sourceId?: string;
}
export interface PredictorState {
  x: number; target: number; last: PredictorSample; v: number; clock: number; length: number;
  correction?: number | null;
}
export function update(state: PredictorState | null, sample: PredictorSample, length: number): PredictorState | null;
export function step(state: PredictorState, time: number): PredictorState;
