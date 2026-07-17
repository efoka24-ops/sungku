import { test, expect, request as pwRequest } from "@playwright/test";
import { loginExisting } from "./helpers";

const ADMIN_EMAIL = "emm.foka@gmail.com"; // must be in the API's ADMIN_EMAILS
const API = "http://localhost:4000";

// Profile 5: Platform administrator (back office)
test.describe("Profil administrateur (back office)", () => {
  // Ensure the admin account exists and is verified (register + verify via API).
  test.beforeAll(async () => {
    const ctx = await pwRequest.newContext();
    const reg = await ctx.post(`${API}/auth/register`, { data: { name: "Admin Sungku", email: ADMIN_EMAIL } });
    if (reg.ok()) {
      const body = await reg.json();
      if (body.devCode) {
        await ctx.post(`${API}/auth/verify-otp`, { data: { email: ADMIN_EMAIL, code: body.devCode } });
      }
    } // 409 => already verified admin
    await ctx.dispose();
  });

  test("accède au back office, voit les stats et modère", async ({ page }) => {
    await loginExisting(page, ADMIN_EMAIL);

    // Admin-only nav link appears
    await expect(page.getByRole("button", { name: "Back office" })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Back office" }).click();

    await expect(page.getByRole("heading", { name: "Back office" })).toBeVisible();

    // Overview shows stat tiles
    await expect(page.getByText("Total collecté")).toBeVisible();

    // Moderation tab lists campaigns
    await page.getByRole("button", { name: "Modération" }).click();
    await expect(page.getByRole("button", { name: "Approuver" }).first()).toBeVisible({ timeout: 10_000 });

    // Fees tab is editable
    await page.getByRole("button", { name: "Frais", exact: true }).click();
    await expect(page.getByRole("button", { name: "Enregistrer les frais" })).toBeVisible();
  });
});
