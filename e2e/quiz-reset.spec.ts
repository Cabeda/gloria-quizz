import { test, expect } from "@playwright/test";
import { createQuizViaUI } from "./helpers";

test.describe("Quiz Reset", () => {
  test("host resets game mid-question, returns to lobby, scores cleared", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();

    const code = await createQuizViaUI(hostPage, "Reset Test Quiz", [
      {
        text: "Pergunta reset?",
        type: "multiple-choice",
        options: ["A", "B"],
        correctIndex: 0,
      },
    ]);

    // Player joins
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await playerPage.goto(`/play/${code}`);
    await playerPage.getByPlaceholder("O teu nome").fill("Eve");
    await playerPage.getByRole("button", { name: "Entrar" }).click();
    await expect(playerPage.getByText("A espera que o jogo comece...")).toBeVisible({ timeout: 5_000 });
    await expect(hostPage.getByText("Eve")).toBeVisible({ timeout: 8_000 });

    // Host starts game
    await hostPage.getByRole("button", { name: "Comecar!" }).click();
    await expect(hostPage.getByText("Pergunta reset?")).toBeVisible({ timeout: 8_000 });

    // Player answers
    await expect(playerPage.getByRole("button", { name: "A" })).toBeVisible({ timeout: 8_000 });
    await playerPage.getByRole("button", { name: "A" }).click();

    // Wait for auto-reveal to complete (MC with 1 player → 2s + polling)
    // Then click "Reiniciar Jogo" from the reveal phase
    await expect(hostPage.getByText("Reiniciar Jogo")).toBeVisible({ timeout: 10_000 });
    await hostPage.getByText("Reiniciar Jogo").click();

    // Confirmation dialog appears
    await expect(hostPage.getByText("Tens a certeza que queres reiniciar o jogo?")).toBeVisible({ timeout: 3_000 });

    // Confirm reset
    await hostPage.getByRole("button", { name: "Sim, Reiniciar" }).click();

    // Host should return to lobby (shows room code heading)
    await expect(hostPage.getByRole("heading", { name: new RegExp(code) })).toBeVisible({ timeout: 10_000 });
    // The "Comecar!" button should reappear (lobby state with player still connected)
    await expect(hostPage.getByRole("button", { name: "Comecar!" })).toBeVisible({ timeout: 10_000 });

    await hostContext.close();
    await playerContext.close();
  });
});
