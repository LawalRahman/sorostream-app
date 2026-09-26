import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useState, type ReactNode } from "react";
import StreamCard from "@/components/StreamCard";

// ---------------------------------------------------------------------------
// Mock child components that have their own complex dependencies.
// Replacing them with simple stubs keeps these tests focused on StreamCard's
// own rendering logic.
// ---------------------------------------------------------------------------

vi.mock("@/components/FederationName", () => ({
  default: ({ address }: { address: string }) => <span>{address}</span>,
}));

vi.mock("@/components/CopyButton", () => ({
  default: ({ label }: { label: string }) => (
    <button aria-label={label}>copy</button>
  ),
}));

vi.mock("@/components/FiatDisplay", () => ({
  default: () => null,
}));

vi.mock("@/components/StreamHealthBadge", () => ({
  default: () => null,
  calculateHealthScore: () => 80,
  getHealthTier: () => "healthy",
}));

vi.mock("@/components/StreamTagChips", () => ({
  default: () => null,
}));

// ---------------------------------------------------------------------------
// Mock @/src/lib/sorostream — stub only what StreamCard uses so real module
// tree-shaking doesn't accidentally pull in heavy deps.
// ---------------------------------------------------------------------------

vi.mock("@/src/lib/sorostream", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/src/lib/sorostream")>();
  return {
    ...original,
    getMockStreamHistory: vi.fn(() => []),
    truncateAddress: (addr: string) =>
      addr ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : "",
    formatStellarAmount: (n: number) => (n / 10_000_000).toFixed(7),
    estimateStreamCompletionTime: vi.fn(() => null),
    formatTimeUntil: vi.fn(() => "in 2d"),
  };
});

// ---------------------------------------------------------------------------
// Mock timezone helpers used for title attributes — not under test here.
// ---------------------------------------------------------------------------

vi.mock("@/src/lib/timezone", () => ({
  formatDateWithTimezone: (d: Date) => d.toISOString(),
  formatDateUtc: (d: Date) => d.toISOString(),
}));

// ---------------------------------------------------------------------------
// Mock contexts so the component renders without a full provider tree.
// ---------------------------------------------------------------------------

const mockToggleBookmark = vi.fn();
const mockIsBookmarked = vi.fn(() => false);

vi.mock("@/src/context/BookmarksContext", () => ({
  useBookmarks: () => ({
    isBookmarked: mockIsBookmarked,
    toggleBookmark: mockToggleBookmark,
    bookmarkedIds: new Set<string>(),
  }),
}));

// ---------------------------------------------------------------------------
// Default prop factory — keeps individual tests concise.
// ---------------------------------------------------------------------------

function makeProps(overrides: Partial<Parameters<typeof StreamCard>[0]> = {}) {
  return {
    id: "42",
    sender: "GAAAA...SENDER",
    recipient: "GBBBB...RECIP",
    flowRate: 10_000_000,   // 1 XLM/sec in stroops
    deposit: 100_000_000,   // 10 XLM in stroops
    status: "Active" as const,
    token: "XLM",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Wrapper (not strictly needed since contexts are mocked, but consistent
// with the rest of the test suite)
// ---------------------------------------------------------------------------

function Wrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function renderCard(props: Partial<Parameters<typeof StreamCard>[0]> = {}) {
  return render(<StreamCard {...makeProps(props)} />, { wrapper: Wrapper });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("StreamCard", () => {
  beforeEach(() => {
    mockToggleBookmark.mockReset();
    mockIsBookmarked.mockReset();
    mockIsBookmarked.mockReturnValue(false);
  });

  // ── loading skeleton ──────────────────────────────────────────────────────

  describe("loading skeleton", () => {
    it("renders a status region with aria-busy when loading=true", () => {
      renderCard({ loading: true });
      const skeleton = screen.getByRole("status");
      expect(skeleton).toHaveAttribute("aria-busy", "true");
    });

    it("shows the stream ID in the loading label when provided", () => {
      renderCard({ id: "99", loading: true });
      expect(screen.getByLabelText("Loading stream 99")).toBeInTheDocument();
    });

    it("does not render the card body content while loading", () => {
      renderCard({ loading: true, recipient: "GBBBB...RECIP" });
      // "From:" and "To:" labels only appear in the normal card
      expect(screen.queryByText(/^From:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/^To:/)).not.toBeInTheDocument();
    });
  });

  // ── status badge ──────────────────────────────────────────────────────────

  describe("status badge", () => {
    it.each([
      ["Active"],
      ["Paused"],
      ["Ended"],
      ["Cancelled"],
    ] as const)("displays %s status correctly", (status) => {
      renderCard({ status });
      expect(screen.getByLabelText(`Status: ${status}`)).toBeInTheDocument();
      expect(screen.getByLabelText(`Status: ${status}`)).toHaveTextContent(status);
    });

    it("applies green classes for Active status", () => {
      renderCard({ status: "Active" });
      const badge = screen.getByLabelText("Status: Active");
      expect(badge.className).toMatch(/green/);
    });

    it("applies amber classes for Paused status", () => {
      renderCard({ status: "Paused" });
      const badge = screen.getByLabelText("Status: Paused");
      expect(badge.className).toMatch(/amber/);
    });

    it("applies blue classes for Ended status", () => {
      renderCard({ status: "Ended" });
      const badge = screen.getByLabelText("Status: Ended");
      expect(badge.className).toMatch(/blue/);
    });

    it("applies red classes for Cancelled status", () => {
      renderCard({ status: "Cancelled" });
      const badge = screen.getByLabelText("Status: Cancelled");
      expect(badge.className).toMatch(/red/);
    });

    it("uses optimisticStatus over real status when provided", () => {
      renderCard({ status: "Active", optimisticStatus: "Paused" });
      expect(screen.getByLabelText("Status: Paused")).toBeInTheDocument();
      expect(screen.queryByLabelText("Status: Active")).not.toBeInTheDocument();
    });
  });

  // ── amount & recipient display ────────────────────────────────────────────

  describe("amount and recipient display", () => {
    it("renders the stream ID in the card heading", () => {
      renderCard({ id: "7" });
      expect(screen.getByText("Stream #7")).toBeInTheDocument();
    });

    it("renders the sender address via FederationName", () => {
      renderCard({ sender: "GSEND...1234" });
      expect(screen.getByText("GSEND...1234")).toBeInTheDocument();
    });

    it("renders the recipient address via FederationName", () => {
      renderCard({ recipient: "GRECV...5678" });
      expect(screen.getByText("GRECV...5678")).toBeInTheDocument();
    });

    it("renders the flow rate correctly converted from stroops", () => {
      // 10_000_000 stroops → 1.00 XLM/sec
      renderCard({ flowRate: 10_000_000, token: "XLM" });
      expect(screen.getByText(/1\.00 XLM\/sec/)).toBeInTheDocument();
    });

    it("renders the deposit total correctly converted from stroops", () => {
      // 50_000_000 stroops → 5.00 XLM
      renderCard({ deposit: 50_000_000, token: "XLM" });
      expect(screen.getByText(/5\.00 XLM/)).toBeInTheDocument();
    });

    it("uses optimisticDeposit for the fiat conversion input when provided", () => {
      // The component passes effectiveDeposit (= optimisticDeposit ?? deposit)
      // to depositXlm which feeds FiatDisplay. The raw XLM text in the Total row
      // always shows the deposit prop directly. This test verifies the Total row
      // renders the raw deposit value, confirming optimisticDeposit doesn't
      // change the displayed XLM amount (which is intentional — optimistic
      // values affect internal calculations/fiat only).
      renderCard({
        flowRate: 20_000_000,     // 2.00 XLM/sec — distinct from deposit row
        deposit: 30_000_000,      // 3.00 XLM shown in Total row
        optimisticDeposit: 50_000_000,
        token: "XLM",
      });
      // The Total row text node renders from `toXlm(deposit)` — always the prop.
      const allSpans = document.querySelectorAll(".text-sm span");
      const depositSpan = Array.from(allSpans).find(
        (el) => el.textContent?.includes("XLM") && !el.textContent?.includes("/sec"),
      );
      expect(depositSpan).toBeDefined();
      expect(depositSpan!.textContent).toMatch(/3\.00/);
    });

    it("shows the token type in flow rate display", () => {
      renderCard({ flowRate: 10_000_000, token: "USDC" });
      expect(screen.getByText(/USDC\/sec/)).toBeInTheDocument();
    });

    it("renders From and To section labels", () => {
      renderCard();
      expect(screen.getByText(/^From:/)).toBeInTheDocument();
      expect(screen.getByText(/^To:/)).toBeInTheDocument();
    });
  });

  // ── copy-link button ──────────────────────────────────────────────────────

  describe("copy-link button (issue #15)", () => {
    it("renders a copy button for the stream ID", () => {
      renderCard({ id: "42" });
      expect(
        screen.getByRole("button", { name: "Copy stream ID" }),
      ).toBeInTheDocument();
    });

    it("renders a copy button for the sender address", () => {
      renderCard();
      expect(
        screen.getByRole("button", { name: "Copy sender address" }),
      ).toBeInTheDocument();
    });

    it("renders a copy button for the recipient address", () => {
      renderCard();
      expect(
        screen.getByRole("button", { name: "Copy recipient address" }),
      ).toBeInTheDocument();
    });
  });

  // ── time remaining display (issue #21) ───────────────────────────────────

  describe("time remaining display (issue #21)", () => {
    it("shows 'Time remaining' label for Active streams with an endTime", () => {
      const endTime = new Date(Date.now() + 86_400_000 * 2).toISOString(); // 2 days from now
      renderCard({ status: "Active", endTime });
      expect(screen.getByText(/Time remaining:/)).toBeInTheDocument();
    });

    it("does not show 'Time remaining' for Paused streams", () => {
      const endTime = new Date(Date.now() + 86_400_000).toISOString();
      renderCard({ status: "Paused", endTime });
      expect(screen.queryByText(/Time remaining:/)).not.toBeInTheDocument();
    });

    it("does not show 'Time remaining' for Ended streams", () => {
      const endTime = new Date(Date.now() - 1000).toISOString(); // already past
      renderCard({ status: "Ended", endTime });
      expect(screen.queryByText(/Time remaining:/)).not.toBeInTheDocument();
    });

    it("does not show 'Time remaining' when no endTime is provided", () => {
      renderCard({ status: "Active", endTime: undefined });
      expect(screen.queryByText(/Time remaining:/)).not.toBeInTheDocument();
    });
  });

  // ── bookmark button ───────────────────────────────────────────────────────

  describe("bookmark button", () => {
    it("renders bookmark button in un-bookmarked state by default", () => {
      renderCard({ id: "42" });
      expect(
        screen.getByRole("button", { name: "Bookmark stream" }),
      ).toBeInTheDocument();
    });

    it("shows 'Remove bookmark' label when stream is already bookmarked", () => {
      mockIsBookmarked.mockReturnValue(true);
      renderCard({ id: "42" });
      expect(
        screen.getByRole("button", { name: "Remove bookmark" }),
      ).toBeInTheDocument();
    });

    it("calls toggleBookmark with the stream id when bookmark button is clicked", () => {
      renderCard({ id: "42" });
      fireEvent.click(screen.getByRole("button", { name: "Bookmark stream" }));
      expect(mockToggleBookmark).toHaveBeenCalledWith("42");
    });
  });

  // ── selection checkbox ────────────────────────────────────────────────────

  describe("selection checkbox", () => {
    it("renders a checkbox when onToggle is provided", () => {
      const onToggle = vi.fn();
      renderCard({ id: "42", onToggle });
      expect(screen.getByRole("checkbox", { name: "Select stream 42" })).toBeInTheDocument();
    });

    it("does not render a checkbox when onToggle is omitted", () => {
      renderCard({ id: "42" });
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });

    it("reflects the selected prop on the checkbox", () => {
      const onToggle = vi.fn();
      renderCard({ id: "42", onToggle, selected: true });
      expect(screen.getByRole("checkbox", { name: "Select stream 42" })).toBeChecked();
    });

    it("calls onToggle with the stream id when checkbox changes", () => {
      const onToggle = vi.fn();
      renderCard({ id: "42", onToggle, selected: false });
      fireEvent.click(screen.getByRole("checkbox", { name: "Select stream 42" }));
      expect(onToggle).toHaveBeenCalledWith("42");
    });
  });

  // ── clone button ──────────────────────────────────────────────────────────

  describe("clone button", () => {
    it("renders the clone button when onClone is provided", () => {
      const onClone = vi.fn();
      renderCard({ id: "42", onClone });
      expect(screen.getByRole("button", { name: "Clone stream" })).toBeInTheDocument();
    });

    it("does not render the clone button when onClone is omitted", () => {
      renderCard({ id: "42" });
      expect(screen.queryByRole("button", { name: "Clone stream" })).not.toBeInTheDocument();
    });

    it("calls onClone with the stream id when clicked", () => {
      const onClone = vi.fn();
      renderCard({ id: "42", onClone });
      fireEvent.click(screen.getByRole("button", { name: "Clone stream" }));
      expect(onClone).toHaveBeenCalledWith("42");
    });
  });

  // ── optimistic confirming badge ───────────────────────────────────────────

  describe("optimistic pending badge", () => {
    it("shows the 'Confirming…' badge when optimisticPending=true", () => {
      renderCard({ optimisticPending: true });
      expect(screen.getByTestId("optimistic-confirming")).toBeInTheDocument();
    });

    it("does not show the 'Confirming…' badge when optimisticPending=false", () => {
      renderCard({ optimisticPending: false });
      expect(screen.queryByTestId("optimistic-confirming")).not.toBeInTheDocument();
    });
  });

  // ── scheduled badge ───────────────────────────────────────────────────────

  describe("scheduled badge", () => {
    it("shows 'Scheduled' badge when scheduledStartTime is in the future", () => {
      const futureTs = Math.floor(Date.now() / 1000) + 86_400; // 1 day ahead
      renderCard({ scheduledStartTime: futureTs });
      expect(screen.getByLabelText("Scheduled stream")).toBeInTheDocument();
    });

    it("does not show 'Scheduled' badge when scheduledStartTime is in the past", () => {
      const pastTs = Math.floor(Date.now() / 1000) - 100;
      renderCard({ scheduledStartTime: pastTs });
      expect(screen.queryByLabelText("Scheduled stream")).not.toBeInTheDocument();
    });
  });

  // ── article role & accessibility ──────────────────────────────────────────

  describe("accessibility", () => {
    it("renders the card as an article element", () => {
      renderCard({ id: "42" });
      expect(screen.getByRole("article", { name: "Stream 42" })).toBeInTheDocument();
    });

    it("sets aria-current when the stream is selected", () => {
      const onToggle = vi.fn();
      renderCard({ id: "42", onToggle, selected: true });
      expect(screen.getByRole("article")).toHaveAttribute("aria-current", "true");
    });

    it("does not set aria-current when the stream is not selected", () => {
      renderCard({ id: "42", selected: false });
      expect(screen.getByRole("article")).not.toHaveAttribute("aria-current");
    });
  });

  describe("memoization", () => {
    it("does not re-run the bookmark hook when unrelated parent state changes", () => {
      const renderSpy = vi.fn();
      function WrapperWithState() {
        const [count, setCount] = useState(0);
        renderSpy(count);
        return (
          <>
            <button type="button" onClick={() => setCount((n) => n + 1)}>
              bump {count}
            </button>
            <StreamCard id="42" sender="GAAAA...SENDER" recipient="GBBBB...RECIP" flowRate={10_000_000} deposit={100_000_000} status="Active" token="XLM" />
          </>
        );
      }

      render(<WrapperWithState />);
      expect(mockIsBookmarked).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole("button", { name: /bump 0/i }));

      expect(mockIsBookmarked).toHaveBeenCalledTimes(1);
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });
});
