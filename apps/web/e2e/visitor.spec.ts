import { test, expect } from "@playwright/test";

// Profile 1: Visitor / public (not logged in)
test.describe("Profil visiteur", () => {
  test("voit l'accueil, recherche, filtre et ouvre une campagne", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /Financez ce qui compte/ })).toBeVisible();

    // Dashboard must NOT be visible on the public site.
    await expect(page.getByRole("button", { name: "Tableau de bord" })).toHaveCount(0);

    // Search
    await page.getByPlaceholder(/Rechercher une campagne/).fill("Ngo Bell");
    await expect(page.getByRole("heading", { name: /Soins pour Maman Ngo Bell/ })).toBeVisible();

    // Clear + filter by category
    await page.getByPlaceholder(/Rechercher une campagne/).fill("");
    await page.getByRole("button", { name: "Tontine", exact: true }).click();
    await expect(page.getByRole("heading", { name: /Tontine des Commer/ })).toBeVisible();

    // Open a campaign detail
    await page.getByRole("button", { name: "Santé", exact: true }).click();
    await page.getByRole("heading", { name: /Soins pour Maman Ngo Bell/ }).click();
    await expect(page.getByRole("heading", { name: "Mur des contributeurs" })).toBeVisible();
  });

  test("les pages du footer sont accessibles", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Comment ça marche" }).click();
    await expect(page.getByRole("heading", { name: "Comment ça marche" })).toBeVisible();

    await page.getByRole("button", { name: "Conformité COBAC" }).click();
    await expect(page.getByRole("heading", { name: "Conformité COBAC" })).toBeVisible();

    await page.getByRole("button", { name: "Nous contacter" }).click();
    await expect(page.getByText("support@sungku.cm")).toBeVisible();
  });
});
