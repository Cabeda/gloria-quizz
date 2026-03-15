import { test, expect } from "@playwright/test";
import { createQuizViaUI } from "./helpers";

test.describe("Open-Ended Question Flow", () => {
  test("host starts question, player types answer, host grades, score updates", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();

    // Create quiz with 1 open-ended question
    const code = await createQuizViaUI(hostPage, "Open-Ended Flow Test", [
      {
        text: "Qual e o teu prato favorito?",
        type: "open-ended",
      },
    ]);

    // Player joins
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await playerPage.goto(`/play/${code}`);
    await playerPage.getByPlaceholder("O teu nome").fill("Bob");
    await playerPage.getByRole("button", { name: "Entrar" }).click();
    await expect(playerPage.getByText("A espera que o jogo comece...")).toBeVisible({ timeout: 5_000 });

    // Wait for host to see the player
    await expect(hostPage.getByText("Bob")).toBeVisible({ timeout: 5_000 });

    // Host starts game
    await hostPage.getByRole("button", { name: "Comecar!" }).click();

    // Host should show question
    await expect(hostPage.getByText("Qual e o teu prato favorito?")).toBeVisible({ timeout: 5_000 });

    // Player should see text input
    await expect(playerPage.getByPlaceholder("A tua resposta...")).toBeVisible({ timeout: 5_000 });

    // Player types answer and submits
    await playerPage.getByPlaceholder("A tua resposta...").fill("Bacalhau");
    await playerPage.getByRole("button", { name: "Enviar" }).click();
    await expect(playerPage.getByText("Resposta enviada!")).toBeVisible({ timeout: 3_000 });

    // Host closes responses (open-ended doesn't auto-reveal)
    await hostPage.getByRole("button", { name: "Fechar Respostas" }).click();

    // Host should see the answer text from Bob
    await expect(hostPage.getByText("Bacalhau")).toBeVisible({ timeout: 5_000 });

    // Host marks answer as correct
    await hostPage.getByRole("button", { name: "Certo" }).first().click();

    // Now "Revelar Resultado" should appear (all answers graded)
    await hostPage.getByRole("button", { name: "Revelar Resultado" }).click();

    // Player should see "Correto!" on reveal
    await expect(playerPage.getByText("Correto!")).toBeVisible({ timeout: 8_000 });

    await hostContext.close();
    await playerContext.close();
  });

  test("host marks open-ended answer as wrong, player sees Errado", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();

    const code = await createQuizViaUI(hostPage, "Open-Ended Wrong Test", [
      {
        text: "Capital da Franca?",
        type: "open-ended",
      },
    ]);

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await playerPage.goto(`/play/${code}`);
    await playerPage.getByPlaceholder("O teu nome").fill("Carol");
    await playerPage.getByRole("button", { name: "Entrar" }).click();
    await expect(playerPage.getByText("A espera que o jogo comece...")).toBeVisible({ timeout: 5_000 });

    await expect(hostPage.getByText("Carol")).toBeVisible({ timeout: 5_000 });
    await hostPage.getByRole("button", { name: "Comecar!" }).click();

    await expect(playerPage.getByPlaceholder("A tua resposta...")).toBeVisible({ timeout: 5_000 });
    await playerPage.getByPlaceholder("A tua resposta...").fill("Madrid");
    await playerPage.getByRole("button", { name: "Enviar" }).click();

    await hostPage.getByRole("button", { name: "Fechar Respostas" }).click();
    await expect(hostPage.getByText("Madrid")).toBeVisible({ timeout: 5_000 });

    // Mark as wrong
    await hostPage.getByRole("button", { name: "Errado" }).first().click();
    await hostPage.getByRole("button", { name: "Revelar Resultado" }).click();

    // Player should see "Errado!"
    await expect(playerPage.getByText("Errado!")).toBeVisible({ timeout: 8_000 });

    await hostContext.close();
    await playerContext.close();
  });
});
