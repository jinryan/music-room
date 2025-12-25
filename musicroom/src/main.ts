import "./style.css";
import { bootApp } from "./app/main";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("Missing #app root element");
}

app.innerHTML = `
  <div class="app-shell">
    <h1>Room Instrument V1</h1>
    <p class="status">Booting…</p>
  </div>
`;

bootApp().catch((error) => {
  console.error("Failed to boot app", error);
});
