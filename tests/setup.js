import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

/* Unmount anything a test rendered so the mount test starts clean. */
afterEach(() => cleanup());
