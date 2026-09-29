import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AddressVerificationWarning from "@/components/AddressVerificationWarning";
import type { AddressVerification } from "@/src/lib/addressVerification";

// ---------------------------------------------------------------------------
// Mock i18n — keeps tests independent of SettingsContext.
// ---------------------------------------------------------------------------

vi.mock("@/src/lib/i18n", () => ({
  useTranslations: () => (key: string) => {
    const labels: Record<string, string> = {
      address_unverified_warning_title: "Unverified Address",
      address_unverified_warning_desc:
        "This address could not be verified on the Stellar network. Please double-check the address before creating the stream.",
      address_verification_error: "Verification error",
      address_acknowledge_warning:
        "I understand the risks and want to proceed with this unverified address",
    };
    return labels[key] ?? key;
  },
}));

// ---------------------------------------------------------------------------
// Test data factory
// ---------------------------------------------------------------------------

function makeVerification(
  overrides: Partial<AddressVerification> = {},
): AddressVerification {
  return {
    status: "unverified",
    address: "GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3UN3IXYNEP",
    federationName: null,
    accountExists: false,
    error: null,
    lastCheckedAt: Date.now(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AddressVerificationWarning", () => {
  const noop = vi.fn();

  beforeEach(() => {
    noop.mockReset();
  });

  // ── should render ─────────────────────────────────────────────────────────

  describe("when verification is unverified and not yet acknowledged", () => {
    it("renders the warning title text", () => {
      render(
        <AddressVerificationWarning
          verification={makeVerification()}
          onAcknowledge={noop}
          acknowledged={false}
        />,
      );
      expect(screen.getByText("Unverified Address")).toBeInTheDocument();
    });

    it("renders the warning description text", () => {
      render(
        <AddressVerificationWarning
          verification={makeVerification()}
          onAcknowledge={noop}
          acknowledged={false}
        />,
      );
      expect(
        screen.getByText(/Please double-check the address/),
      ).toBeInTheDocument();
    });

    it("renders the acknowledgment checkbox unchecked", () => {
      render(
        <AddressVerificationWarning
          verification={makeVerification()}
          onAcknowledge={noop}
          acknowledged={false}
        />,
      );
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    it("calls onAcknowledge when the checkbox is checked", () => {
      render(
        <AddressVerificationWarning
          verification={makeVerification()}
          onAcknowledge={noop}
          acknowledged={false}
        />,
      );
      fireEvent.click(screen.getByRole("checkbox"));
      expect(noop).toHaveBeenCalledOnce();
    });

    it("shows the verification error detail when present", () => {
      render(
        <AddressVerificationWarning
          verification={makeVerification({ error: "Account not found on Stellar network" })}
          onAcknowledge={noop}
          acknowledged={false}
        />,
      );
      expect(screen.getByText(/Account not found/)).toBeInTheDocument();
    });

    it("does not render the error detail when error is null", () => {
      render(
        <AddressVerificationWarning
          verification={makeVerification({ error: null })}
          onAcknowledge={noop}
          acknowledged={false}
        />,
      );
      expect(screen.queryByText("Verification error")).not.toBeInTheDocument();
    });
  });

  // ── should NOT render ─────────────────────────────────────────────────────

  describe("when the warning should be suppressed", () => {
    it("renders nothing when verification is null", () => {
      const { container } = render(
        <AddressVerificationWarning
          verification={null}
          onAcknowledge={noop}
          acknowledged={false}
        />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing for a verified address", () => {
      const { container } = render(
        <AddressVerificationWarning
          verification={makeVerification({ status: "verified" })}
          onAcknowledge={noop}
          acknowledged={false}
        />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing for an active address (account exists, no federation name)", () => {
      const { container } = render(
        <AddressVerificationWarning
          verification={makeVerification({ status: "active", accountExists: true })}
          onAcknowledge={noop}
          acknowledged={false}
        />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing for a pending address", () => {
      const { container } = render(
        <AddressVerificationWarning
          verification={makeVerification({ status: "pending" })}
          onAcknowledge={noop}
          acknowledged={false}
        />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing when the warning has already been acknowledged", () => {
      const { container } = render(
        <AddressVerificationWarning
          verification={makeVerification()}
          onAcknowledge={noop}
          acknowledged={true}
        />,
      );
      expect(container.firstChild).toBeNull();
    });
  });
});
