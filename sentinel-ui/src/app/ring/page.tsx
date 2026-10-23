import { Suspense } from "react";
import { Console } from "@/components/console/Console";

export default function RingPage() {
  return (
    <Suspense>
      <Console />
    </Suspense>
  );
}
