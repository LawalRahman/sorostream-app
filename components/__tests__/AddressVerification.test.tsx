import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AddressVerificationBadge from "@/components/AddressVerificationBadge";
import AddressVerificationWarning from "@/components/AddressVerificationWarning";

vi.mock("@/src/lib/i18n", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      address_verified: "Verified",
      address_active: "Active",
      address_unverified: "Unverified",
      address_verifying: "Verifying…",
      address_unverified_warning_title: "Unverified Address",
      address_unverified_warning_desc: "This address could not be verified.",
      address_verification_error: "Verification error",
      address_acknowledge_warning: "I understand the risks and want to proceed",
    };
    return translations[key] ?? key;
  },
}));

describe("AddressVerificationBadge", () => {
  it("shows the verified label and federation name for a verified address", () => {
    render(<AddressVerificationBadge status="verified" federationName="federation.example" />);

    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("(federation.example)")).toBeInTheDocument();
  });

  it("shows the unverified label for an unverified address", () => {
    render(<AddressVerificationBadge status="unverified" />);

    expect(screen.getByText("Unverified")).toBeInTheDocument();
  });
});

describe("AddressVerificationWarning", () => {
  it("renders the warning only for unverified addresses that have not been acknowledged", () => {
    const onAcknowledge = vi.fn();

    const { rerender } = render(
      <AddressVerificationWarning
        verification={{
          status: "unverified",
          address: "GB7B2XS7YYUWVLXUYG6EWBEYHV4WTUY5VWFDOXWOITVNHAJBMMRV7ZGO",
          federationName: null,
          accountExists: false,
          error: "Account not found",
          lastCheckedAt: Date.now(),
        }}
        onAcknowledge={onAcknowledge}
        acknowledged={false}
      />,
    );

    expect(screen.getByText("Unverified Address")).toBeInTheDocument();
    expect(screen.getByText(/Account not found/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("I understand the risks and want to proceed"));
    expect(onAcknowledge).toHaveBeenCalledTimes(1);

    rerender(
      <AddressVerificationWarning
        verification={{
          status: "unverified",
          address: "GB7B2XS7YYUWVLXUYG6EWBEYHV4WTUY5VWFDOXWOITVNHAJBMMRV7ZGO",
          federationName: null,
          accountExists: false,
          error: "Account not found",
          lastCheckedAt: Date.now(),
        }}
        onAcknowledge={onAcknowledge}
        acknowledged={true}
      />,
    );

    expect(screen.queryByText("Unverified Address")).not.toBeInTheDocument();
  });
});
