import { test, expect } from "@playwright/test";
import { createQuizViaUI } from "./helpers";

test.describe("Quiz Creation", () => {
  test("creates a quiz with MC + open-ended questions and redirects to host", async ({ page }) => {
    const code = await createQuizViaUI(page, "E2E Test Quiz", [
      {
        text: "Capital de Portugal?",
        type: "multiple-choice",
        options: ["Madrid", "Lisboa", "Porto"],
        correctIndex: 1,
      },
      {
        text: "Qual e o teu prato favorito?",
        type: "open-ended",
      },
    ]);

    // Should be on host page with room code visible in heading
    expect(code).toMatch(/^[A-Za-z0-9]+$/);
    await expect(page.getByRole("heading", { name: new RegExp(code) })).toBeVisible({ timeout: 5_000 });

    // Should show lobby state — "Jogadores" section and waiting for players
    await expect(page.getByText(/Jogadores/)).toBeVisible();
  });

  test("validates required fields before saving", async ({ page }) => {
    await page.goto("/create");

    // Try to save without title
    await page.getByRole("button", { name: "Guardar e Criar Sala" }).click();
    await expect(page.getByText("Da um titulo ao quiz!")).toBeVisible();

    // Add title but leave question empty
    await page.getByPlaceholder("Titulo do quiz...").fill("Test");
    await page.getByRole("button", { name: "Guardar e Criar Sala" }).click();
    await expect(page.getByText(/[Vv]erifica as perguntas/)).toBeVisible();
  });
});
