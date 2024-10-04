<script setup lang="ts">
import { ref } from "vue";

let peerConnection: RTCPeerConnection | null = null;
const remoteOffer = ref<string>(''); // 存储从 A 设备接收到的 Offer
const remoteVideoStream = ref<MediaStream | null>(null);

const getLocationVideo = async () => {
  peerConnection = new RTCPeerConnection();

  peerConnection.ontrack =(event) => {
    console.log('Received track:', JSON.stringify(event.track));
    // 将接收到的流绑定到 video 元素
    if (!remoteVideoStream.value) {
      remoteVideoStream.value = event.streams[0];
      const remoteVideoElement = document.getElementById('remoteVideo') as HTMLVideoElement;
      if (remoteVideoElement) {
        remoteVideoElement.srcObject = remoteVideoStream.value;
      }
    }
  };
};

const setRemoteOffer = async () => {
  if (peerConnection && remoteOffer.value) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(remoteOffer.value)));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    console.log("Answer:", JSON.stringify(answer)); // 在控制台打印 Answer
  }
};
</script>

<template>
  <div class="video-call">
    <div class="video-call-controller">
      <el-button @click="getLocationVideo" type="primary">准备接收视频</el-button>
      <input v-model="remoteOffer" placeholder="输入远程 Offer" />
      <el-button @click="setRemoteOffer">设置远程 Offer</el-button>
    </div>
    <div class="video-call-main">
      <video id="remoteVideo" style="width: 100%; height: 100%;" autoplay></video>
    </div>
  </div>
</template>


<style scoped lang="scss">
.video-call {
  width: 100%;
  height: calc(100vh - 40px);

  .video-call-controller {
    background-color: #e6e6e6;
    height: 50px;
    border-radius: 5px;
    padding: 5px;
  }

  .video-call-main {
    position: absolute;
    background-color: #f8f8f8;
    width: 100%;
    height: calc(100vh - 100px);
    bottom: 0;
    border-radius: 5px;
  }
}




</style>
