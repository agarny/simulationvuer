import { createApp } from "vue";
import * as VueRouter from "vue-router";
import App from "./App.vue";
import ElementPlus from "element-plus";

const routes = [{ path: "/", component: App }];
const router = VueRouter.createRouter({
  // Provide the history implementation to use. We are using the hash history for simplicity here.
  history: VueRouter.createWebHashHistory(),
  routes,
});
const app = createApp(App);

app.use(router);
app.use(ElementPlus);
app.mount("#app");
