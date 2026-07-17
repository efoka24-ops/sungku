import { Page, expect } from "@playwright/test";

export function uniqueEmail(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}@sungku-test.cm`;
}

// Register a fresh organizer via the auth modal and land logged in.
// Relies on the dev-only "code test : XXXXXX" surfaced in the modal (non-production).
export async function registerOrganizer(page: Page, name: string, email: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.getByPlaceholder("Nom complet").fill(name);
  await page.getByPlaceholder("Adresse e-mail").fill(email);
  await page.getByRole("button", { name: "Recevoir le code" }).click();

  const info = page.locator("text=/code test : \\d{6}/");
  await expect(info).toBeVisible({ timeout: 10_000 });
  const text = (await info.textContent()) || "";
  const code = text.match(/code test : (\d{6})/)?.[1];
  if (!code) throw new Error("dev OTP code not found in modal");

  await page.getByPlaceholder("Code à 6 chiffres").fill(code);
  await page.getByRole("button", { name: "Valider" }).click();

  // Once authenticated, the dashboard nav link appears.
  await expect(page.getByRole("button", { name: "Tableau de bord", exact: true })).toBeVisible({ timeout: 10_000 });
}

// Log in an existing (already-verified) account via the login OTP flow.
export async function loginExisting(page: Page, email: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Se connecter" }).click();
  // Switch the modal from register to login mode (bottom toggle is the last match).
  await page.getByRole("button", { name: "Se connecter" }).last().click();
  await page.getByPlaceholder("Adresse e-mail").fill(email);
  await page.getByRole("button", { name: "Recevoir le code" }).click();

  const info = page.locator("text=/code test : \\d{6}/");
  await expect(info).toBeVisible({ timeout: 10_000 });
  const code = ((await info.textContent()) || "").match(/code test : (\d{6})/)?.[1];
  await page.getByPlaceholder("Code à 6 chiffres").fill(code!);
  await page.getByRole("button", { name: "Valider" }).click();
}
