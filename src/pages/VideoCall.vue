<script setup lang="ts">
import {onUnmounted, ref} from "vue";

//自己的ID
const clientId = ref<string>('')

//对方的ID
const otherId = ref<string>('')

let localStream: MediaStream;
let peerConnection: RTCPeerConnection;
let isCalling = ref(false);

let offer: RTCSessionDescriptionInit;

let candidates: RTCIceCandidate[] = []


// 在组件卸载时关闭WebSocket连接
onUnmounted(() => {
  if (socket) {
    socket.close();
  }
});

let url = `ws://localhost:8080/ws/endpoint?clientId=`
let socket: WebSocket | null = null;
/**
 * 先建立连接
 */
const setClientId = () => {
  initWebSocket()
  initPeerConnection()
  altClientButtonAndInputState(true)
}

// 初始化WebSocket连接
const initWebSocket = () => {
  socket = new WebSocket(url + clientId.value);

  // 连接成功时触发
  socket.onopen = () => {
    successState(url + clientId.value)
    console.log('WebSocket connection opened');
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

  // 收到服务器消息时触发
  socket.onmessage = async (event) => {

    let offerData = JSON.parse(event.data);

    if (offerData.type == 'offer') {
      console.log("收到offer")
      // 确保 data.data 的结构包含 type 和 sdp
      // 确保 data 是一个对象
      const sdpData = JSON.parse(offerData.data); // 解析 data 字符串为对象
      await peerConnection.setRemoteDescription(new RTCSessionDescription({type: sdpData.type, sdp: sdpData.sdp}));
      // 自动响应
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket!.send(JSON.stringify({
        clientId: clientId.value,
        otherId: offerData.clientId,
        type: 'answer',
        data: answer
      }));
    }

    if (offerData.type == 'answer') {
      console.log("收到answer")
      const sdpData = JSON.parse(offerData.data); // 解析 data 字符串为对象
      await peerConnection.setRemoteDescription(new RTCSessionDescription({type: sdpData.type, sdp: sdpData.sdp}));

      // 将通话发起端的描述文件发送给对方
      socket!.send(JSON.stringify({
        clientId: clientId.value,
        otherId: offerData.clientId,
        type: 'candidate',
        data: candidates
      }))
    }

    if (offerData.type == 'candidate') {
      console.log("收到candidate")
      const candidatesData: RTCIceCandidate[] = JSON.parse(offerData.data); // 解析 data 字符串为对象

      candidatesData.forEach(can => {
        peerConnection.addIceCandidate(new RTCIceCandidate({
          candidate: can.candidate,
          sdpMid: can.sdpMid,
          sdpMLineIndex: can.sdpMLineIndex,
          usernameFragment: can.usernameFragment
        }));
      })

      if (!isCalling) {
        // 将通话接听端的描述文件发送给发起方
        socket!.send(JSON.stringify({
          clientId: clientId.value,
          otherId: offerData.clientId,
          type: 'candidate',
          data: candidates
        }))
      }
    }
  }
  ;
}


/**
 * 初始化 initPeerConnection
 */
const initPeerConnection = async () => {
  // 获取本地摄像头的流
  try {
    localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
  } catch (err) {
    console.error('Error accessing media devices:', err);
  }

  // 将本地的音视频流传递给指定标签
  const localVideoElement = document.getElementById('video-self') as HTMLVideoElement;
  if (localVideoElement) {
    localVideoElement.srcObject = localStream;
  }

  // 创建 RTCPeerConnection 并配置 turn 与 stun
  peerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: 'turn:111.229.154.56:3478',
        username: 'h', // 替换为您的用户名
        credential: '123456' // 替换为您的密码
      },
      {
        urls: 'stun:111.229.154.56:3478'
      },
      {
        urls: 'stun:stun.l.google.com:19302' // STUN 服务器
      }
    ]
  });

  // 监听 ICE 连接状态变化
  peerConnection.oniceconnectionstatechange = () => {
    const iceConnectionState = peerConnection.iceConnectionState;
    console.log(`ICE connection state: ${iceConnectionState}`);

    if (iceConnectionState === 'connected' || iceConnectionState === 'completed') {
      console.log('ICE 连接成功');
      // ICE 连接已经建立，可以进行数据传输
    } else if (iceConnectionState === 'disconnected') {
      console.log('ICE 连接断开');
      // 可以处理断开连接的情况
    } else if (iceConnectionState === 'failed') {
      console.log('ICE 连接失败');
      // 可以处理连接失败的情况，可能需要重试
    }
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('New ICE candidate:', event.candidate);
    } else {
      console.log('All ICE candidates have been sent');
    }
  };


  // 将本地流存放到 peerConnection.addTrack(track, localStream)) 中
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  // 当有流传来时将流赋值给对应的标签
  peerConnection.ontrack = async event => {
    console.log('ontrack 事件触发:', event.streams);
    const remoteVideoElement = document.getElementById('video-other') as HTMLVideoElement;
    if (remoteVideoElement) {
      remoteVideoElement.srcObject = event.streams[0];
    }
  };

  // 创建并设置本地 SDP
  offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  console.log(offer)
  /**
   *  将描述文件保存下来等待转发
   * @param event
   */
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      candidates.push(event.candidate)
    }
  };
}


const startCall = async () => {
  isCalling.value = true;
  //发送offer
  socket!.send(JSON.stringify({clientId: clientId.value, otherId: otherId.value, type: 'offer', data: offer}));
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
// const errorState = () => {
//   alertTitle.value = '未连接'
//   alertType.value = 'error'
// }

const clientButtonAndInputState = ref<boolean>(false)
const altClientButtonAndInputState = (b: boolean) => {
  clientButtonAndInputState.value = b
}

// let localStream = ref<MediaStream | null>(null);
// let peerConnection: RTCPeerConnection | null = null;
// const offer = ref<string>(''); // 存储生成的 Offer
//

</script>

<template>
  <div class="video-call">
    <div class="video-call-controller">
      <el-input :disabled="clientButtonAndInputState" v-model="clientId" size="large" style="width: 150px"
                placeholder="设置自己的编号"></el-input>
      <el-button :disabled="clientButtonAndInputState" style="margin-left: 10px" size="large" @click="setClientId"
                 type="primary">设置
      </el-button>
      <el-input v-model="otherId" size="large" style="width: 150px;margin-left: 10px" placeholder="对方编号"></el-input>
      <el-button style="margin-left: 10px" size="large" @click="startCall" type="success">
        呼叫
      </el-button>
      <el-button size="large" style="position: absolute;right: 0;margin-right: 10px" type="danger">挂断</el-button>
    </div>
    <div class="video-call-tip">
      <el-alert style="margin-bottom: 10px" :title="alertTitle" :type="alertType" :closable="false"/>
    </div>
    <div class="video-call-main">
      <el-card class="video-call-main-self">
        <template #header>自己</template>
        <div class="video-container">
          <video id="video-self" muted="true" autoplay></video>
        </div>
      </el-card>

      <el-card class="video-call-main-other">
        <template #header>他人</template>
        <div class="video-container">
          <video id="video-other" autoplay></video>
        </div>
      </el-card>
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

  .video-call-tip {
    width: 100%;
    margin-top: 10px;
  }

  .video-call-main {
    position: absolute;
    width: 100%;
    height: calc(100vh - 150px);
    bottom: 0;
    border-radius: 5px;

    .video-call-main-self {
      position: absolute;
      width: calc(50% - 10px);
      height: 100%;
      left: 0;
      overflow: hidden; /* 隐藏超出部分 */
    }

    .video-call-main-other {
      position: absolute;
      width: calc(50% - 10px);
      height: 100%;
      right: 0;
    }

    .video-container {
      width: 100%; /* 或者设定具体宽度 */
      height: calc(100vh - 250px); /* 设置容器高度 */
      overflow: hidden; /* 隐藏超出部分 */
      position: relative; /* 位置相对 */

      #video-self {
        transform: scaleX(-1);
        width: 100%; /* 使视频宽度填满容器 */
        height: 100%; /* 使视频高度填满容器 */
        object-fit: cover; /* 让视频保持比例，充满容器 */
        object-position: center; /* 视频居中 */
      }

      #video-other {
        transform: scaleX(-1);
        width: 100%; /* 使视频宽度填满容器 */
        height: 100%; /* 使视频高度填满容器 */
        object-fit: cover; /* 让视频保持比例，充满容器 */
        object-position: center; /* 视频居中 */
      }
    }
  }
}
</style>