<script setup lang="ts">
import {onUnmounted, ref} from "vue";

//自己的ID
const clientId = ref<string>('')

//对方的ID
const otherId = ref<string>('')

// 保存本地视频流
let localStream: MediaStream;

// 对等体连接
let peerConnection: RTCPeerConnection;

// 是否的呼叫方
let isCalling = ref(false);

// 保存自己的offer
let offer: RTCSessionDescriptionInit;

// 保存协商信息
let candidates: RTCIceCandidate[] = []


// 在组件卸载时关闭WebSocket连接
onUnmounted(() => {
  if (socket) {
    socket.close();
  }
});

// 信令交换服务器的连接
let url = `ws://localhost:8080/ws/endpoint?clientId=`
let socket: WebSocket | null = null;

/**
 * 先建立连接
 */
const setClientId = async () => {
  initWebSocket()
  await initPeerConnection()
  altClientButtonAndInputState(true)
  altOtherButtonAndInputState(false)
}

// 初始化WebSocket连接
const initWebSocket = () => {
  socket = new WebSocket(url + clientId.value);

  // 连接成功时触发
  socket.onopen = () => {
    setAlertState('成功连接', 'success', url + clientId.value)
    console.log('WebSocket connection opened');
  };

  // 连接关闭时触发
  socket.onclose = () => {
    setAlertState('连接已关闭', 'warning', '')
    console.log('WebSocket connection closed');
  };

  // 发生错误时触发
  socket.onerror = (error) => {
    setAlertState('连接异常关闭', 'warning', '')
    console.error('WebSocket error:', error);
  };

  // 收到服务器消息时触发
  socket.onmessage = async (event) => {

    let offerData = JSON.parse(event.data);

    if (offerData.type == 'offer') {
      console.log("收到offer")
      altOtherButtonAndInputState(true)
      //收到offer时创建PeerConnection
      await initPeerConnection()

      // 保存对方的id
      otherId.value = offerData.clientId

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

    // 检测到挂断消息
    if (offerData.type === 'hangup') {
      console.log('对方已挂断通话');
      // 1.停止本地媒体流
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }

      // 执行挂断逻辑
      if (peerConnection) {
        peerConnection.close();
      }
      candidates = []
      altOtherButtonAndInputState(false)
      altHangUpButtonState(true)
      isCalling.value = false;

      setAlertState('准备就绪', 'success', '')
    }
  };
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
      setAlertState('重连中...', 'warning', '')
      if (isCalling) {
        startCall()
      }
    } else if (iceConnectionState === 'failed') {
      console.log('ICE 连接失败');
      // 可以处理连接失败的情况，可能需要重试
      setAlertState('ICE 连接失败', 'success', '')
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
    altHangUpButtonState(false)
    setAlertState('视频通话中...', 'success', '')
  };

  // 创建并设置本地 SDP
  offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

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

/**
 *  建立通话
 */
const startCall = async () => {
  // 发起端为自己添加一个标识
  isCalling.value = true;
  // 发起端创建 PeerConnection
  await initPeerConnection()

  //发送offer
  socket!.send(JSON.stringify({clientId: clientId.value, otherId: otherId.value, type: 'offer', data: offer}));
  setAlertState('发送offer', 'success', '')
  // 改变按钮状态
  altOtherButtonAndInputState(true)
  altHangUpButtonState(false)
}

/**
 *  挂断通话
 */
const hangUp = async () => {
  // 3.向对方发送挂断信令
  if (socket) {
    socket.send(JSON.stringify({
      clientId: clientId.value,
      otherId: otherId.value,
      type: 'hangup'
    }));
  }

  // 1.停止本地媒体流
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }

  // 2.关闭 RTCPeerConnection
  if (peerConnection) {
    peerConnection.close();
  }

  // 将候选信息修改为 [] , 防止发送的候选信息过大，WebSocket断开连接
  candidates = []

  // 设置呼叫|按钮的状态
  isCalling.value = false;
  altOtherButtonAndInputState(false)
  altHangUpButtonState(true)
  console.log('通话已挂断');
  setAlertState('准备就绪', 'success', '')
}

/**
 * 以下为状态设置与代码逻辑无关
 * **************************************************************************************************************************************
 */

const alertTitle = ref('未连接')
const alertType = ref('error')


const setAlertState = (title: string, type: string, customize: string) => {
  alertTitle.value = title + customize
  alertType.value = type
}

/**
 * 控制自己的id输入框以及按钮的状态
 *
 * tip: 设置完毕自己的id后就不可更改
 */
const clientButtonAndInputState = ref<boolean>(false)
const altClientButtonAndInputState = (b: boolean) => {
  clientButtonAndInputState.value = b
}

/**
 *  控制对方的id输入框以及按钮的状态
 *
 *  tip: 输入并呼叫对面后就不可更改 | 接到呼叫后就不可更改
 *       点击挂断后恢复为可用状态
 */
const otherButtonAndInputState = ref<boolean>(true)
const altOtherButtonAndInputState = (b: boolean) => {
  otherButtonAndInputState.value = b
}

/**
 * 控制挂断按钮的状态
 *
 * tip: 接通后挂断按钮可用
 */
const hangUpButtonState = ref<boolean>(true)
const altHangUpButtonState = (b: boolean) => {
  hangUpButtonState.value = b
}

</script>

<template>
  <div class="video-call">
    <div class="video-call-controller">
      <el-input :disabled="clientButtonAndInputState" v-model="clientId" size="large" style="width: 150px"
                placeholder="设置自己的编号"></el-input>
      <el-button :disabled="clientButtonAndInputState" style="margin-left: 10px"
                 size="large" @click="setClientId"
                 type="primary">设置
      </el-button>
      <el-input :disabled="otherButtonAndInputState" v-model="otherId" size="large"
                style="width: 150px;margin-left: 10px" placeholder="对方编号"></el-input>
      <el-button :disabled="otherButtonAndInputState" style="margin-left: 10px" size="large" @click="startCall"
                 type="success">
        呼叫
      </el-button>
      <el-button :disabled="hangUpButtonState" @click="hangUp" size="large"
                 style="position: absolute;right: 0;margin-right: 10px" type="danger">
        挂断
      </el-button>
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
        border-radius: 6px;
      }

      #video-other {
        transform: scaleX(-1);
        width: 100%; /* 使视频宽度填满容器 */
        height: 100%; /* 使视频高度填满容器 */
        object-fit: cover; /* 让视频保持比例，充满容器 */
        object-position: center; /* 视频居中 */
        border-radius: 6px;
      }
    }
  }
}
</style>