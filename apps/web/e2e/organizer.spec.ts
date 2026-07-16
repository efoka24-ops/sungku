import { test, expect } from "@playwright/test";
import { registerOrganizer, uniqueEmail } from "./helpers";

// Profile 3: Organizer (account + KYC + create + withdraw with OTP)
test.describe("Profil organisateur", () => {
  test("s'inscrit, crée une campagne, valide le KYC et fait un retrait", async ({ page }) => {
    const email = uniqueEmail("orga");
    await registerOrganizer(page, "Organisateur Test", email);

    // Create a campaign (only possible while authenticated)
    await page.getByRole("button", { name: "Créer une campagne" }).click();
    await page.getByPlaceholder(/Soins pour Maman Ngo Bell/).fill("Campagne E2E Organisateur");
    await page.getByPlaceholder(/Expliquez le contexte/).fill("Description de test end to end.");
    await page.getByPlaceholder(/2 000 000/).fill("1500000");
    await page.getByPlaceholder("Nom du bénéficiaire").fill("Bénéficiaire Test");
    await page.getByRole("button", { name: "Créer la campagne" }).click();
    await expect(page.getByText("Campagne créée avec succès")).toBeVisible({ timeout: 10_000 });

    // Go to dashboard, complete KYC
    await page.getByRole("button", { name: "Tableau de bord", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Tableau de bord organisateur" })).toBeVisible();
    await page.getByPlaceholder(/pièce d'identité/).fill("CNI-123456789");
    await page.getByPlaceholder("Téléphone retrait").fill("+237690000001");
    await page.getByRole("button", { name: "Valider le KYC" }).click();
    await expect(page.getByText("Vérifié", { exact: true })).toBeVisible({ timeout: 10_000 });

    // Withdraw with double validation (OTP)
    await page.getByRole("button", { name: "Demander un retrait" }).click();
    await page.getByPlaceholder("Montant (FCFA)").fill("100000");
    await page.getByRole("button", { name: "Demander le code de confirmation" }).click();

    const info = page.locator("text=/code test : \\d{6}/");
    await expect(info).toBeVisible({ timeout: 10_000 });
    const code = ((await info.textContent()) || "").match(/code test : (\d{6})/)?.[1];
    await page.getByPlaceholder("Code de retrait").fill(code!);
    await page.getByRole("button", { name: "Confirmer le retrait" }).click();
    await expect(page.getByText(/Traitement sous 24h/)).toBeVisible({ timeout: 10_000 });
  });

  test("la création de campagne est bloquée sans compte", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Créer une campagne" }).click();
    await expect(page.getByText(/nécessite un compte organisateur/)).toBeVisible();
  });
});
