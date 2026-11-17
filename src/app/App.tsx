import { RouterProvider } from "react-router";
import { router } from "@/app/routes";
import { IS_SYNTHETIC_SANDBOX, SYNTHETIC_SANDBOX_PROFILE } from "@/config";
import { ThemeSync } from "@/app/lib/theme";

export default function App() {
  return (
    <>
      <ThemeSync />
      {IS_SYNTHETIC_SANDBOX && (
        <div
          role="note"
          className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-950"
        >
          Synthetic development sandbox ({SYNTHETIC_SANDBOX_PROFILE === "legacy" ? "original" : SYNTHETIC_SANDBOX_PROFILE}) · isolated test data · email captured
          locally · Google disabled
        </div>
      )}
      <RouterProvider router={router} />
    </>
  );
}
