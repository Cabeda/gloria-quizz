import { test, expect } from "@playwright/test";
import { createQuizViaUI } from "./helpers";

test.describe("Player Rejoin", () => {
  test("player refreshes page mid-game, session restored from localStorage", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();

    const code = await createQuizViaUI(hostPage, "Rejoin Test Quiz", [
      {
        text: "Pergunta rejoin?",
        type: "multiple-choice",
        options: ["Sim", "Nao"],
        correctIndex: 0,
      },
    ]);

    // Player joins in a persistent context (localStorage survives reload)
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await playerPage.goto(`/play/${code}`);
    await playerPage.getByPlaceholder("O teu nome").fill("Frank");
    await playerPage.getByRole("button", { name: "Entrar" }).click();
    await expect(playerPage.getByText("A espera que o jogo comece...")).toBeVisible({ timeout: 5_000 });
    await expect(hostPage.getByText("Frank")).toBeVisible({ timeout: 5_000 });

    // Host starts game
    await hostPage.getByRole("button", { name: "Comecar!" }).click();
    await expect(hostPage.getByText("Pergunta rejoin?")).toBeVisible({ timeout: 5_000 });

    // Player should see the question
    await expect(playerPage.getByRole("button", { name: "Sim" })).toBeVisible({ timeout: 5_000 });

    // Player refreshes the page (simulating disconnect/reconnect)
    await playerPage.reload();

    // After reload, player should be restored from localStorage
    // They should NOT see the join screen — they should see the game
    // Either the question buttons or a waiting state (depending on timing)
    await expect(
      playerPage.getByRole("button", { name: "Sim" }).or(
        playerPage.getByText(/espera|Resposta enviada/i)
      )
    ).toBeVisible({ timeout: 8_000 });

    // Verify player is NOT asked to enter name again
    await expect(playerPage.getByPlaceholder("O teu nome")).not.toBeVisible();

    await hostContext.close();
    await playerContext.close();
  });
});
