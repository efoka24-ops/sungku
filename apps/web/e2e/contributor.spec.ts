import { test, expect } from "@playwright/test";

// Profile 2: Contributor
test.describe("Profil contributeur", () => {
  test("contribue à une campagne et voit le remerciement", async ({ page }) => {
    await page.goto("/");

    // Open the first featured campaign
    await page.getByRole("heading", { name: /Soins pour Maman Ngo Bell/ }).click();

    // Contribution panel: method defaults to Mobile Money, pick a preset amount
    await page.getByRole("button", { name: /^1 000 FCFA$/ }).click();

    // Phone field appears for Mobile Money
    await page.getByPlaceholder(/Numéro de téléphone/).fill("+237690000000");
    await page.getByPlaceholder(/Message de soutien/).fill("Bon courage à la famille");

    await page.getByRole("button", { name: /^Contribuer/ }).click();

    await expect(page.getByText("Merci pour votre soutien !")).toBeVisible({ timeout: 10_000 });
  });
});
