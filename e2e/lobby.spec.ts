import { test, expect } from "@playwright/test";
import { createQuizViaUI } from "./helpers";

test.describe("Lobby", () => {
  test("host sees room code and player appears after joining", async ({ browser }) => {
    // Host context
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();

    const code = await createQuizViaUI(hostPage, "Lobby Test Quiz", [
      {
        text: "Pergunta lobby?",
        type: "multiple-choice",
        options: ["A", "B"],
        correctIndex: 0,
      },
    ]);

    // Host should see room code in heading
    await expect(hostPage.getByRole("heading", { name: new RegExp(code) })).toBeVisible();

    // Player context
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();

    await playerPage.goto(`/play/${code}`);
    await playerPage.getByPlaceholder("O teu nome").fill("Jogador1");
    await playerPage.getByRole("button", { name: "Entrar" }).click();

    // Player should see lobby/waiting state
    await expect(
      playerPage.getByText(/esperar|espera|lobby/i).first()
    ).toBeVisible({ timeout: 5_000 });

    // Host should see the player name (polling updates every 1.5s)
    await expect(hostPage.getByText("Jogador1")).toBeVisible({ timeout: 8_000 });

    await hostContext.close();
    await playerContext.close();
  });
});
