import {createApp} from 'vue'
import './style.css'
import App from './App.vue'
import ElementPlus from 'element-plus';
import './styles/reset.scss'
import 'element-plus/dist/index.css'
import router from "./router";
import pinia from "./store"

// import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

createApp(App).use(ElementPlus,).use(router).use(pinia).mount('#app')
