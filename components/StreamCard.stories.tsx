import type { Meta, StoryObj } from "@storybook/react";
import StreamCard from "@/components/StreamCard";
import { BookmarksProvider } from "@/src/context/BookmarksContext";

/**
 * **StreamCard** is the primary UI tile for a single payment stream.
 *
 * It displays:
 * - Stream ID with a copy-to-clipboard button
 * - Sender and recipient addresses (with federation name lookup + copy)
 * - Flow rate and total deposit in token units with optional USD equivalent
 * - Status badge (Active / Paused / Completed / Cancelled / Scheduled)
 * - Health score chip when start and end times are both known
 * - Time remaining for active streams with a known end date
 * - Estimated completion time for active streams
 * - Bulk-selection checkbox (when `onToggle` is provided)
 * - Clone action button (when `onClone` is provided)
 * - Bookmark toggle
 * - Tag chips
 *
 * ### Context requirements
 * `StreamCard` consumes `useBookmarks` internally. The decorator below wraps
 * every story in `BookmarksProvider`; the global preview already supplies
 * `ThemeProvider`, `SettingsProvider`, and `WalletProvider`.
 */

// StreamCard uses useBookmarks, which requires BookmarksProvider.
const meta: Meta<typeof StreamCard> = {
  title: "UI/StreamCard",
  component: StreamCard,
  decorators: [
    (Story) => (
      <BookmarksProvider>
        <Story />
      </BookmarksProvider>
    ),
  ],
  argTypes: {
    status: {
      control: "select",
      options: ["Active", "Paused", "Completed", "Ended", "Not Started", "Cancelled"],
      description: "Stream lifecycle status.",
    },
    loading: {
      control: "boolean",
      description: "Show an in-place skeleton placeholder instead of the card.",
    },
    selected: {
      control: "boolean",
      description: "Whether the card is in a bulk-selected state (green border).",
    },
    token: {
      control: "select",
      options: ["XLM", "USDC", "AQUA", "yXLM"],
      description: "Token type displayed in flow rate and deposit.",
    },
    flowRate: {
      control: { type: "number", min: 0 },
      description: "Flow rate in stroops per second (1 XLM = 10 000 000 stroops).",
    },
    deposit: {
      control: { type: "number", min: 0 },
      description: "Total deposit in stroops.",
    },
    optimisticPending: {
      control: "boolean",
      description: "Show a 'Confirming…' badge while a transaction is in-flight.",
    },
    optimisticStatus: {
      control: "select",
      options: [undefined, "Active", "Paused", "Cancelled"],
      description: "Overrides the status badge while an optimistic update is pending.",
    },
  },
  args: {
    id: "stream-001",
    sender: "GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3UN3IXYNEP",
    recipient: "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOOHSUJUJ6",
    flowRate: 11574,       // ~0.0000011574 XLM/sec ≈ 0.1 XLM/day
    deposit: 100_000_000,  // 10 XLM
    token: "XLM",
  },
  parameters: {
    layout: "padded",
  },
};

export default meta;

type Story = StoryObj<typeof StreamCard>;

// ── Reference timestamps ──────────────────────────────────────────────────
const NOW = new Date();
const oneHourAgo = new Date(NOW.getTime() - 60 * 60 * 1000).toISOString();
const oneDayAgo = new Date(NOW.getTime() - 24 * 60 * 60 * 1000).toISOString();
const inOneHour = new Date(NOW.getTime() + 60 * 60 * 1000).toISOString();
const inSevenDays = new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
const inThirtyDays = new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
const scheduledInOneHour = Math.floor(NOW.getTime() / 1000) + 3600;

// ── Status variants ───────────────────────────────────────────────────────

/**
 * Healthy active stream currently flowing funds. Health score badge and
 * "Time remaining" / "Est. completion" rows are visible.
 */
export const Default: Story = {
  name: "Active",
  args: {
    status: "Active",
    startTime: oneDayAgo,
    endTime: inThirtyDays,
  },
};

/**
 * Stream paused by the sender. The `pausedAt` timestamp freezes the
 * streamed-out balance calculation so the displayed amount does not advance.
 */
export const Paused: Story = {
  args: {
    status: "Paused",
    startTime: oneDayAgo,
    endTime: inThirtyDays,
    pausedAt: oneHourAgo,
  },
};

/**
 * Stream that has fully completed — shown with a blue badge.
 * The end time is in the past so no "Time remaining" row appears.
 */
export const Completed: Story = {
  args: {
    status: "Completed",
    startTime: oneDayAgo,
    endTime: oneHourAgo,
  },
};

/**
 * Ended stream — alias of the "Completed" lifecycle state that some contract
 * versions emit. Renders with a blue badge identical to Completed.
 */
export const Ended: Story = {
  name: "Ended",
  args: {
    status: "Ended",
    startTime: oneDayAgo,
    endTime: oneHourAgo,
  },
};

/**
 * Stream cancelled before completion — red badge, no health score
 * (cancelled streams are excluded from health calculations).
 */
export const Cancelled: Story = {
  args: {
    status: "Cancelled",
    startTime: oneDayAgo,
    endTime: inThirtyDays,
  },
};

// ── Scheduled / future start ─────────────────────────────────────────────

/**
 * **Not Started** — stream exists on-chain but its `startTime` is in the
 * future and no `scheduledStartTime` override is set. The card renders in a
 * "pending" state: the health score badge is absent and "Time remaining" refers
 * to the stream's _end_ date, not how much has been streamed.
 *
 * Covers the acceptance-criteria requirement for a "Not Started" status story.
 */
export const NotStarted: Story = {
  name: "Not Started",
  args: {
    id: "stream-ns",
    status: "Active",
    startTime: inSevenDays,
    endTime: inThirtyDays,
    flowRate: 11_574,
    deposit: 100_000_000,
  },
};

/**
 * Stream created with a future `scheduledStartTime`.
 * A pulsing "Scheduled" badge appears next to the status badge.
 * The stream has not started yet so health score and flow are not shown.
 */
export const Scheduled: Story = {
  name: "Scheduled (future start)",
  args: {
    status: "Active",
    scheduledStartTime: scheduledInOneHour,
    startTime: inSevenDays,
    endTime: inThirtyDays,
  },
};

// ── Skeleton / loading state ──────────────────────────────────────────────

/**
 * Skeleton placeholder shown while stream data is loading.
 * All content is replaced with animated grey pulses.
 */
export const Loading: Story = {
  args: {
    loading: true,
  },
};

// ── Selection and actions ─────────────────────────────────────────────────

/**
 * Card in the selected (bulk-checked) state.
 * The border turns green and the checkbox appears pre-checked.
 */
export const Selected: Story = {
  args: {
    status: "Active",
    selected: true,
    startTime: oneDayAgo,
    endTime: inThirtyDays,
    onToggle: (id) => console.log("toggled", id),
  },
};

/**
 * Card with both the selection checkbox and the clone action button visible.
 * Click "Clone stream" to see the `onClone` callback fire in the Actions panel.
 */
export const WithCloneAction: Story = {
  name: "With Clone & Selection",
  args: {
    status: "Active",
    startTime: oneDayAgo,
    endTime: inThirtyDays,
    onToggle: (id) => console.log("toggled", id),
    onClone: (id) => console.log("clone", id),
  },
};

// ── Token variants ────────────────────────────────────────────────────────

/**
 * Stream denominated in **XLM** (the native Stellar asset). The `FiatDisplay`
 * component converts the flow rate and deposit to USD via an XLM oracle price.
 * This story explicitly names the XLM variant so it is easy to find in the
 * sidebar alongside the USDC story below.
 */
export const XlmToken: Story = {
  name: "XLM token",
  args: {
    status: "Active",
    token: "XLM",
    flowRate: 11_574,       // ~0.001 XLM/sec
    deposit: 100_000_000,   // 10 XLM
    startTime: oneDayAgo,
    endTime: inThirtyDays,
  },
};

/**
 * Stream denominated in **USDC**. The fiat display logic shows USD equivalents
 * directly (1 USDC = $1) rather than going through an XLM oracle.
 */
export const UsdcToken: Story = {
  name: "USDC token",
  args: {
    status: "Active",
    token: "USDC",
    flowRate: 115_740,      // ~0.01 USDC/sec
    deposit: 1_000_000_000, // 100 USDC
    startTime: oneDayAgo,
    endTime: inThirtyDays,
  },
};

/**
 * Stream denominated in **AQUA** — demonstrates the generic token display path
 * (no USD fiat conversion for unknown tokens).
 */
export const AquaToken: Story = {
  name: "AQUA token",
  args: {
    status: "Active",
    token: "AQUA",
    flowRate: 11_574,
    deposit: 100_000_000,
    startTime: oneDayAgo,
    endTime: inThirtyDays,
  },
};

// ── Long address / truncation ─────────────────────────────────────────────

/**
 * Both sender and recipient use full-length Stellar public keys to verify
 * that `FederationName` truncates long addresses gracefully in the card layout.
 * The raw address is 56 chars; the card should show a shortened version.
 */
export const LongRecipientAddress: Story = {
  name: "Long recipient address (truncation)",
  args: {
    id: "stream-long",
    sender: "GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3UN3IXYNEP",
    recipient: "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOOHSUJUJ6",
    status: "Active",
    flowRate: 11_574,
    deposit: 100_000_000,
    startTime: oneDayAgo,
    endTime: inThirtyDays,
  },
};

// ── Time-sensitive states ─────────────────────────────────────────────────

/**
 * Active stream expiring very soon (end time is 1 hour away).
 * The "Time remaining" value should show something like "in 59 minutes".
 */
export const ExpiringSoon: Story = {
  name: "Expiring soon (1 h)",
  args: {
    status: "Active",
    startTime: oneDayAgo,
    endTime: inOneHour,
    deposit: 100_000_000,
    flowRate: 11_574,
  },
};

/**
 * Active stream with a large deposit and low flow rate — the estimated
 * completion date is far in the future, demonstrating the "Est. completion"
 * row with a distant timestamp.
 */
export const LongRunning: Story = {
  name: "Long-running stream",
  args: {
    status: "Active",
    flowRate: 1_157,         // very slow — ~0.001 XLM/day
    deposit: 1_000_000_000, // 100 XLM
    startTime: oneDayAgo,
    endTime: new Date(NOW.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
};

// ── Zero / edge-case values ───────────────────────────────────────────────

/**
 * Stream with zero flow rate — demonstrates graceful rendering when the
 * on-chain flow rate field is 0 (e.g. a deposit-only stream).
 */
export const ZeroFlowRate: Story = {
  name: "Zero flow rate",
  args: {
    status: "Active",
    flowRate: 0,
    deposit: 50_000_000,
    startTime: oneDayAgo,
    endTime: inThirtyDays,
  },
};

/**
 * Minimal card — no start/end times, no optional callbacks.
 * Verifies the component doesn't crash when time-dependent sections
 * have no data.
 */
export const MinimalProps: Story = {
  name: "Minimal props (no timestamps)",
  args: {
    id: "stream-min",
    sender: "GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3UN3IXYNEP",
    recipient: "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOOHSUJUJ6",
    flowRate: 11_574,
    deposit: 100_000_000,
    status: "Active",
  },
};

// ── Dark / light background comparison ───────────────────────────────────

/**
 * Card on an explicit **dark** background — the default Storybook theme.
 * Verifies that `dark:` Tailwind classes render correctly (e.g. dark borders,
 * dark status badge colours).
 */
export const DarkTheme: Story = {
  name: "Dark theme",
  parameters: {
    backgrounds: { default: "dark" },
  },
  decorators: [
    (Story) => (
      <div className="dark bg-gray-900 p-6 rounded-lg">
        <Story />
      </div>
    ),
  ],
  args: {
    status: "Active",
    startTime: oneDayAgo,
    endTime: inThirtyDays,
  },
};

/**
 * Card on an explicit **light** background — confirms Tailwind dark-mode classes
 * fall back correctly in light mode.
 */
export const LightBackground: Story = {
  name: "Light theme",
  parameters: {
    backgrounds: { default: "light" },
  },
  decorators: [
    (Story) => (
      <div className="bg-white p-6 rounded-lg">
        <Story />
      </div>
    ),
  ],
  args: {
    status: "Active",
    startTime: oneDayAgo,
    endTime: inThirtyDays,
  },
};

export const DarkBackground: Story = {
  name: "On dark background",
  parameters: {
    backgrounds: { default: "dark" },
  },
  decorators: [
    (Story) => (
      <div className="bg-slate-950 p-6 rounded-lg">
        <Story />
      </div>
    ),
  ],
  args: {
    status: "Paused",
    startTime: oneDayAgo,
    endTime: inThirtyDays,
    pausedAt: oneHourAgo,
  },
};

export const LongRecipientAddress: Story = {
  name: "Long recipient address (truncation)",
  args: {
    status: "Active",
    recipient: "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOOHSUJUJ6SOMETHINGVERYLONG",
    startTime: oneDayAgo,
    endTime: inThirtyDays,
  },
};

// ── Optimistic / pending transaction state ────────────────────────────────

/**
 * Card showing the "Confirming…" badge after an action (withdraw, top-up,
 * cancel) has been submitted on-chain but not yet confirmed.
 *
 * The `optimisticStatus` prop overrides the displayed status badge while the
 * transaction is in-flight, so the UI reflects the expected end-state
 * immediately rather than waiting for an RPC round-trip.
 */
export const OptimisticPending: Story = {
  name: "Optimistic — confirming",
  args: {
    status: "Active",
    optimisticPending: true,
    optimisticStatus: "Paused",
    startTime: oneDayAgo,
    endTime: inThirtyDays,
  },
};