import { Suspense } from "react";
import { Console } from "@/components/console/Console";

export default function BenchmarkPage() {
  return (
    <Suspense>
      <Console />
    </Suspense>
  );
}
