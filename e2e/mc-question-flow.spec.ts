import { test, expect } from "@playwright/test";
import { createQuizViaUI } from "./helpers";

test.describe("MC Question Flow", () => {
  test("host starts question, player answers MC, auto-reveal shows correct answer", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();

    // Create quiz with 1 MC question
    const code = await createQuizViaUI(hostPage, "MC Flow Test", [
      {
        text: "Capital de Portugal?",
        type: "multiple-choice",
        options: ["Madrid", "Lisboa"],
        correctIndex: 1,
      },
    ]);

    // Player joins
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await playerPage.goto(`/play/${code}`);
    await playerPage.getByPlaceholder("O teu nome").fill("Alice");
    await playerPage.getByRole("button", { name: "Entrar" }).click();
    await expect(playerPage.getByText("A espera que o jogo comece...")).toBeVisible({ timeout: 5_000 });

    // Wait for host to see the player
    await expect(hostPage.getByText("Alice")).toBeVisible({ timeout: 8_000 });

    // Host starts game
    await hostPage.getByRole("button", { name: "Comecar!" }).click();

    // Host should show question
    await expect(hostPage.getByText("Capital de Portugal?")).toBeVisible({ timeout: 8_000 });

    // Player should see MC options
    await expect(playerPage.getByRole("button", { name: "Lisboa" })).toBeVisible({ timeout: 8_000 });

    // Player answers correctly
    await playerPage.getByRole("button", { name: "Lisboa" }).click();
    await expect(playerPage.getByText("Resposta enviada!")).toBeVisible({ timeout: 3_000 });

    // With 1 player, auto-reveal triggers after 2s for MC
    // Host transitions to reveal phase — should show correct answer "Lisboa"
    // and "Ver Resultado Final" since it's the last (only) question
    await expect(hostPage.getByText("Resposta: Lisboa")).toBeVisible({ timeout: 10_000 });

    // Host reveal should show "Acertaram" section with Alice
    await expect(hostPage.getByText(/Acertaram/)).toBeVisible({ timeout: 5_000 });

    // Player should see "Correto!" on reveal
    await expect(playerPage.getByText("Correto!")).toBeVisible({ timeout: 10_000 });

    await hostContext.close();
    await playerContext.close();
  });
});
