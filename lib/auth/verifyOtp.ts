// Mock OTP — the ONLY place an OTP is compared. MVP: any phone is accepted;
// the code must equal MOCK_OTP_CODE (default "123456"). Swapping to a real
// SMS provider in Phase 2 means rewriting the body of this one function.
// See CLAUDE.md non-negotiable #4 and .claude/rules/conventions.md (lib/auth/**).
export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  const expected = process.env.MOCK_OTP_CODE ?? "123456";
  return otp === expected;
}
