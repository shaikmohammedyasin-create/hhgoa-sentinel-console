import { Suspense } from "react";
import { Console } from "@/components/console/Console";

export default function HomePage() {
  return (
    <Suspense>
      <Console />
    </Suspense>
  );
}
