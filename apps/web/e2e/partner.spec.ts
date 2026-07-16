import { test, expect } from "@playwright/test";
import { uniqueEmail } from "./helpers";

// Profile 4: Technical partner / third-party developer
test.describe("Profil partenaire développeur", () => {
  test("crée un compte partenaire et génère une clé API sandbox", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Développeurs" }).click();
    await expect(page.getByRole("heading", { name: "Portail développeur" })).toBeVisible();

    // Register a partner account
    await page.getByPlaceholder("Nom de l'organisation").fill("ONG E2E");
    await page.getByPlaceholder("Nom du contact").fill("Contact Test");
    await page.getByPlaceholder(/contact@org.cm/).fill(uniqueEmail("partner"));
    await page.getByRole("button", { name: "Créer le compte partenaire" }).click();

    await expect(page.getByText(/En attente de validation/)).toBeVisible({ timeout: 10_000 });

    // Select a scope and generate a sandbox key
    await page.getByRole("button", { name: "campaigns:create", exact: true }).click();
    await page.getByRole("button", { name: "Générer une clé sandbox" }).click();

    await expect(page.getByText(/X-Api-Key : sk_sandbox_/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/X-Api-Secret :/)).toBeVisible();
  });

  test("clé production refusée tant que le partenaire n'est pas validé", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Développeurs" }).click();
    await page.getByPlaceholder("Nom de l'organisation").fill("ONG E2E 2");
    await page.getByPlaceholder("Nom du contact").fill("Contact Test 2");
    await page.getByPlaceholder(/contact@org.cm/).fill(uniqueEmail("partner2"));
    await page.getByRole("button", { name: "Créer le compte partenaire" }).click();
    await expect(page.getByText(/En attente de validation/)).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Générer une clé production" }).click();
    await expect(page.getByText(/uniquement après validation/)).toBeVisible({ timeout: 10_000 });
  });
});
