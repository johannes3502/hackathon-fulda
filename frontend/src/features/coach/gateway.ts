import { MockCoachGateway } from "./mock/MockCoachGateway";
// Only this factory knows the adapter. A live adapter must implement CoachGateway.
let instance: MockCoachGateway | undefined;
export function getGateway() {
  if (
    process.env.NEXT_PUBLIC_COACH_GATEWAY &&
    process.env.NEXT_PUBLIC_COACH_GATEWAY !== "mock"
  )
    throw new Error(
      "The live coaching adapter is not implemented. Set NEXT_PUBLIC_COACH_GATEWAY=mock.",
    );
  return (instance ??= new MockCoachGateway());
}
