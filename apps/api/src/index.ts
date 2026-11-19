import { createApp } from "./app";
import { loadEnv } from "./env";

const env = loadEnv();
const app = createApp({ webOrigin: env.WEB_ORIGIN });

app.listen(env.API_PORT, () => {
  console.log(`dawry api listening on http://localhost:${env.API_PORT}`);
});
