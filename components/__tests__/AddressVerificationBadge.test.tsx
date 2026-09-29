import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AddressVerificationBadge from "@/components/AddressVerificationBadge";
import type { VerificationStatus } from "@/src/lib/addressVerification";

// ---------------------------------------------------------------------------
// Mock i18n — the component only needs string labels; we don't want the full
// SettingsContext provider tree in unit tests.
// ---------------------------------------------------------------------------

vi.mock("@/src/lib/i18n", () => ({
  useTranslations: () => (key: string) => {
    const labels: Record<string, string> = {
      address_verified: "Verified",
      address_active: "Active",
      address_unverified: "Unverified",
      address_verifying: "Verifying…",
    };
    return labels[key] ?? key;
  },
}));

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderBadge(
  status: VerificationStatus,
  federationName?: string | null,
) {
  return render(
    <AddressVerificationBadge status={status} federationName={federationName} />,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AddressVerificationBadge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── verified ──────────────────────────────────────────────────────────────

  describe("verified status", () => {
    it("renders the 'Verified' label", () => {
      renderBadge("verified");
      expect(screen.getByText(/Verified/)).toBeInTheDocument();
    });

    it("applies green badge styles", () => {
      const { container } = renderBadge("verified");
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toMatch(/green/);
    });

    it("renders the SVG checkmark icon", () => {
      const { container } = renderBadge("verified");
      // The checkmark path uses `fill="currentColor"` — check for the SVG
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThan(0);
    });

    it("shows the federation name when provided", () => {
      renderBadge("verified", "alice*stellar.org");
      expect(screen.getByText(/alice\*stellar\.org/)).toBeInTheDocument();
    });

    it("does not show federation name text when federationName is null", () => {
      renderBadge("verified", null);
      expect(screen.queryByText(/\(/)).not.toBeInTheDocument();
    });
  });

  // ── active ────────────────────────────────────────────────────────────────

  describe("active status", () => {
    it("renders the 'Active' label", () => {
      renderBadge("active");
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("applies blue badge styles", () => {
      const { container } = renderBadge("active");
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toMatch(/blue/);
    });

    it("does not show a federation name even when provided (only shown for verified)", () => {
      renderBadge("active", "alice*stellar.org");
      // The federation name span is only rendered for "verified"
      expect(screen.queryByText(/alice\*stellar\.org/)).not.toBeInTheDocument();
    });
  });

  // ── unverified ────────────────────────────────────────────────────────────

  describe("unverified status", () => {
    it("renders the 'Unverified' label", () => {
      renderBadge("unverified");
      expect(screen.getByText("Unverified")).toBeInTheDocument();
    });

    it("applies red badge styles", () => {
      const { container } = renderBadge("unverified");
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toMatch(/red/);
    });

    it("renders a warning / info icon (not the checkmark)", () => {
      const { container } = renderBadge("unverified");
      // The unverified icon has a circle with two lines (info icon) — no filled path
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThan(0);
      // checkmark path for "verified" is fill="currentColor"; unverified icon is stroke-only
      const filledPath = container.querySelector("svg path[fill='currentColor']");
      expect(filledPath).not.toBeInTheDocument();
    });
  });

  // ── pending ───────────────────────────────────────────────────────────────

  describe("pending status", () => {
    it("renders the 'Verifying…' label", () => {
      renderBadge("pending");
      expect(screen.getByText("Verifying…")).toBeInTheDocument();
    });

    it("applies gray badge styles", () => {
      const { container } = renderBadge("pending");
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toMatch(/gray/);
    });

    it("renders a spinning animation icon", () => {
      const { container } = renderBadge("pending");
      const spinSvg = container.querySelector("svg.animate-spin");
      expect(spinSvg).toBeInTheDocument();
    });
  });
});
