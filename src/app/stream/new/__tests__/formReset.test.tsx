import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewStreamPage from "@/src/app/stream/new/page";
import { FORM_DRAFT_KEY } from "@/src/lib/useFormPersist";

const push = vi.fn();
const triggerStreamRefresh = vi.fn();
const createStream = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/src/context/WalletContext", () => ({
  useWallet: () => ({
    address: "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ",
    isConnecting: false,
    error: null,
    triggerStreamRefresh,
  }),
}));

vi.mock("@/src/context/PreferencesContext", () => ({
  usePreferences: () => ({
    defaultToken: "USDC",
    defaultDuration: 3600,
    defaultCliffDuration: 0,
  }),
}));

vi.mock("@/src/context/SettingsContext", () => ({
  useSettings: () => ({ streamThreshold: 10000, language: "en" }),
}));

vi.mock("@/src/lib/addressVerification", () => ({
  verifyAddress: vi.fn().mockResolvedValue({
    status: "verified",
    address: "GB7B2XS7YYUWVLXUYG6EWBEYHV4WTUY5VWFDOXWOITVNHAJBMMRV7ZGO",
    federationName: null,
    accountExists: true,
    error: null,
    lastCheckedAt: Date.now(),
  }),
  canCreateStream: vi.fn((verification) => verification?.status !== "unverified"),
}));

vi.mock("@/src/lib/sorostream", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/sorostream")>();
  return {
    ...actual,
    sorostream: {
      ...actual.sorostream,
      createStream,
    },
    getStreamCapConfig: vi.fn().mockResolvedValue({ maxDepositStroops: 10_000_000_000 }),
    getCollateralConfig: vi.fn().mockResolvedValue({ basisPoints: 0 }),
    checkIsNewSender: vi.fn().mockResolvedValue(false),
    getGasFeeEstimate: vi.fn().mockResolvedValue({ gasFee: "100", fee: "100" }),
    validateMetadataUri: vi.fn().mockReturnValue(""),
  };
});

describe("Create stream happy path", () => {
  beforeEach(() => {
    push.mockReset();
    triggerStreamRefresh.mockReset();
    createStream.mockReset();
    createStream.mockResolvedValue({ streamId: "new-stream-123" });
    window.sessionStorage.clear();
  });

  it("clears the saved draft and navigates after a successful create-stream flow", async () => {
    const recipient = "GB7B2XS7YYUWVLXUYG6EWBEYHV4WTUY5VWFDOXWOITVNHAJBMMRV7ZGO";
    const draft = { recipient, amount: "100", duration: 3600, selectedToken: "USDC", customTokenAddress: "", endDate: "", cliffDate: "" };
    window.sessionStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(draft));

    render(<NewStreamPage />);

    const recipientInput = screen.getByTestId("recipient-input");
    fireEvent.change(recipientInput, { target: { value: recipient } });

    await waitFor(() => expect(screen.getByRole("button", { name: "Next" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    const amountInput = await screen.findByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(screen.getByTestId("confirm-sign-button")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("confirm-sign-button"));

    await waitFor(() => expect(createStream).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/stream/new-stream-123?new=true"));
    await waitFor(() => expect(window.sessionStorage.getItem(FORM_DRAFT_KEY)).toBeNull());
    expect(triggerStreamRefresh).toHaveBeenCalledTimes(1);
  });
});
