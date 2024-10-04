<template>
  <div>
    <h1>WebSocket Example</h1>
    <p>WebSocket Status: {{ status }}</p>
    <input v-model="message" placeholder="Enter message"/>
    <button @click="sendMessage">Send Message</button>
    <p>Server Response: {{ serverResponse }}</p>
  </div>
</template>

<script lang="ts">
import {defineComponent, ref, onMounted, onUnmounted} from 'vue';

export default defineComponent({
  name: 'WebSocketComponent',
  setup() {
    const socketUrl = 'ws://localhost:8080/ws/endpoint'; // WebSocket服务器的地址
    let socket: WebSocket | null = null;
    const status = ref('Disconnected');
    const message = ref('');
    const serverResponse = ref('');

    const initWebSocket = () => {
      socket = new WebSocket(socketUrl);

      socket.onopen = () => {
        status.value = 'Connected';
        console.log('WebSocket connection opened');
      };

      socket.onmessage = (event) => {
        serverResponse.value = event.data;
        console.log('Message from server:', event.data);
      };

      socket.onclose = () => {
        status.value = 'Disconnected';
        console.log('WebSocket connection closed');
      };

      socket.onerror = (error) => {
        status.value = 'Error';
        console.error('WebSocket error:', error);
      };
    };

    const sendMessage = () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(message.value);
        message.value = '';
      } else {
        console.log('WebSocket is not connected');
      }
    };

    onMounted(() => {
      initWebSocket();
    });

    onUnmounted(() => {
      if (socket) {
        socket.close();
      }
    });

    return {
      status,
      message,
      sendMessage,
      serverResponse,
    };
  },
});
</script>

<style scoped>
/* 自定义样式 */
</style>
