import { GestureWalkthrough } from "@/components/live/GestureWalkthrough";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const capture = (await searchParams).capture === "1";
  return <GestureWalkthrough capture={capture} />;
}
