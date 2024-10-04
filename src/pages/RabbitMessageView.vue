<script setup lang="ts">
import useMessageListStore from "../store/modules/messages.ts";
import {onMounted, onUnmounted, ref} from "vue";
import useUserStore from "../store/modules/user.ts";
import {ElMessage} from "element-plus";

const token = ref('')

let messageListStore = useMessageListStore();
let userStore = useUserStore();

// //存储信息
// let messages: Message[] = messageListStore.messages

//存储user信息
const setToken = () => {
  userStore.token = token.value
}

const getToken = () => {
  token.value = userStore.token
}

const clearToken = () => {
  userStore.token = ''
}

const connect = () => {
  if (userStore.getToken()) {
    initWebSocket()
  } else {
    errorState()
    ElMessage({
      type: 'error',
      message: '必须设置Token'
    })
  }
}

let url = `ws://localhost:8080/ws/endpoint?clientId=`
let socket: WebSocket | null = null;
// 初始化WebSocket连接
const initWebSocket = () => {
  socket = new WebSocket(url + userStore.getToken());

  // 连接成功时触发
  socket.onopen = () => {
    successState(url + userStore.getToken())
    console.log('WebSocket connection opened');
  };

  // 收到服务器消息时触发
  socket.onmessage = (event) => {
    messageListStore.postMessage({
      type: 'none',
      time: '',
      ip: event.origin,
      title: '',
      message: event.data
    })
    console.log('Message from server:', event);
  };

  // 连接关闭时触发
  socket.onclose = () => {
    warningState()
    console.log('WebSocket connection closed');
  };

  // 发生错误时触发
  socket.onerror = (error) => {
    warningState()
    console.error('WebSocket error:', error);
  };
}

const alertTitle = ref('未连接')
const alertType = ref('error')

const successState = (url: string) => {
  alertTitle.value = '成功连接   ' + url
  alertType.value = 'success'
}
const warningState = () => {
  alertTitle.value = '断开连接'
  alertType.value = 'warning'
}
const errorState = () => {
  alertTitle.value = '未连接'
  alertType.value = 'error'
}

// 在组件挂载时初始化WebSocket
onMounted(() => {
  connect();
});

// 在组件卸载时关闭WebSocket连接
onUnmounted(() => {
  if (socket) {
    socket.close();
  }
});

</script>

<template>
  <div>
    <el-card style="max-width: 100%;min-height: calc(100vh - 40px)">
      <el-alert style="margin-bottom: 10px" :title="alertTitle" :type="alertType" :closable="false"/>
      <div style="margin-bottom: 40px">
        <el-input show-icon style="margin-right: 10px;width: 55%" v-model="token" placeholder="Please input Token"/>
        <el-button type="success" @click="connect">connect</el-button>
        <el-button type="primary" @click="setToken">setToken</el-button>
        <el-button type="primary" @click="getToken">getToken</el-button>
        <el-button type="warning" @click="clearToken">clearToken</el-button>
      </div>
      <el-timeline style="max-width: 600px">
        <el-timeline-item v-for="(item,index) in messageListStore.messages" :key="index" :timestamp="item.time"
                          placement="top">
          <el-card>
            <h4>{{ item.title }}</h4>
            <p>{{ item.message }}</p>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </el-card>
  </div>
</template>

<style scoped lang="scss">

</style>