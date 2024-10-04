import {defineStore} from "pinia";
import {Message} from "./types/type.ts";

//创建消息仓库
let useMessageListStore = defineStore('message', {
    state: (): { messages: Message[] } => ({
        messages: []
    }),
    actions: {
        // 添加消息
        postMessage(msg: Message) {
            this.messages.push(msg); // 将消息推送到 messages 数组中
        },
        // 清空消息
        clearMessage() {
            this.messages = []; // 将 messages 数组重置为空
        },
    },
    getters: {
        // 可以根据需要添加其他getters
    }
});

export default useMessageListStore;