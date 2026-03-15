import { test, expect } from "@playwright/test";
import { createQuizViaUI } from "./helpers";

test.describe("Quiz Library", () => {
  test("created quiz appears in library and can be deleted", async ({ page }) => {
    // Create a quiz first
    await createQuizViaUI(page, "Library Delete Test", [
      {
        text: "Pergunta teste?",
        type: "multiple-choice",
        options: ["A", "B"],
        correctIndex: 0,
      },
    ]);

    // Go to quiz library
    await page.goto("/quizzes");
    await expect(page.getByText("Library Delete Test")).toBeVisible({ timeout: 5_000 });

    // Delete it — click Apagar, then confirm with Sim
    await page.getByRole("button", { name: "Apagar" }).first().click();
    await page.getByRole("button", { name: "Sim" }).click();

    // Wait for the delete API call to complete and page to update
    await page.waitForTimeout(2_000);

    // Reload to confirm it's actually gone from DB
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should be gone
    await expect(page.getByText("Library Delete Test")).not.toBeVisible({ timeout: 5_000 });
  });

  test("quiz can be cloned from library", async ({ page }) => {
    // Create a quiz
    await createQuizViaUI(page, "Clone Source Quiz", [
      {
        text: "Pergunta original?",
        type: "multiple-choice",
        options: ["X", "Y"],
        correctIndex: 1,
      },
    ]);

    // Go to library
    await page.goto("/quizzes");
    await expect(page.getByText("Clone Source Quiz")).toBeVisible({ timeout: 5_000 });

    // Clone it
    await page.getByRole("button", { name: "Duplicar" }).first().click();

    // Should see the copy
    await expect(page.getByText("Clone Source Quiz (copia)")).toBeVisible({ timeout: 5_000 });

    // Clean up — delete both
    const deleteButtons = page.getByRole("button", { name: "Apagar" });
    const count = await deleteButtons.count();
    for (let i = 0; i < count; i++) {
      await page.getByRole("button", { name: "Apagar" }).first().click();
      await page.getByRole("button", { name: "Sim" }).click();
      await page.waitForTimeout(1_000);
    }
  });
});
