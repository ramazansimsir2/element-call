/*
Yerel gelistirme yardimcisi (upstream'in parcasi DEGILDIR).

Amac: dev sunucusunu Cloudflare quick tunnel ile telefondaki APK'ye (Hamsi)
acabilmek. Hamsi WebView origin'e duz HTTP konustugu icin HTTPS'i kapatiriz ve
rastgele *.trycloudflare.com host'una izin vermek icin allowedHosts: true
veririz.

Bu dosya vite.config.ts'i DEGISTIRMEDEN ayni sonucu verir; boylece upstream
(element-hq) ile merge cakismasi olmaz. vite-embedded.config.ts ile ayni
oruntudedir.

Kullanim:
  pnpm dev --config vite-tunnel.config.ts --port 3002
*/

import { type ConfigEnv, type UserConfig } from "vite";

import fullConfig from "./vite.config";

export default (env: ConfigEnv): UserConfig => {
  const base = fullConfig({ ...env, packageType: "full" });
  return {
    ...base,
    server: {
      ...(base.server ?? {}),
      https: undefined, // HTTPS kapali -> duz HTTP (Hamsi WebView icin)
      allowedHosts: true, // rastgele *.trycloudflare.com host'una izin ver
    },
  };
};
