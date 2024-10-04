import {defineStore} from "pinia";
import {User} from "./types/type.ts";

//创建消息仓库
let useUserStore = defineStore('user', {
    state: (): User => ({
        token: ''
    }),
    actions: {
        // setToken
        setToken(token: string) {
            this.token = token
        },
        // 清空消息
        clearToken() {
            this.token = '' // 将 messages 数组重置为空
        },
        getToken(): string {
            return this.token
        }
    },
    getters: {
        // 可以根据需要添加其他getters
    }
});

export default useUserStore;