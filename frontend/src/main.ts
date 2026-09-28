import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import { router } from "./router";
import { authStore } from "./stores/auth";

async function bootstrap(): Promise<void> {
  await authStore.initialise();

  createApp(App)
    .use(router)
    .mount("#app");
}

void bootstrap();
