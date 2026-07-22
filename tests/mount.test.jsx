import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import UcatDrillTrainer from "../ucat-drill-trainer.jsx";

/* One component throwing used to white out the whole site. At minimum
   the app must mount without throwing. It loads state asynchronously
   from the storage adapter, so this waits for the loading screen to
   clear before asserting the app is on the page. */
describe("the app mounts without throwing", () => {
  it("renders past the loading state", async () => {
    expect(() => render(<UcatDrillTrainer />)).not.toThrow();
    await waitFor(() => {
      expect(screen.getAllByText(/Tempo/i).length).toBeGreaterThan(0);
    });
    /* The default signup screen carries the required terms consent box. */
    await waitFor(() => {
      expect(screen.getByText(/agree to the Terms/i)).toBeTruthy();
    });
  });
});
