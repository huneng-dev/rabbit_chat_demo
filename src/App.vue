<script setup lang="ts">
</script>

<template>
  <div class="main-div">
    <div class="main-left">

      <RouterLink to="/" active-class="active">
        <el-button style="width: 100%;margin-bottom: 10px" size="large" type="primary">
          Index
        </el-button>
      </RouterLink>

      <RouterLink to="/message/view" active-class="active">
        <el-button style="width: 100%;margin-bottom: 10px" size="large" type="primary">
          RabbitMessageView
        </el-button>
      </RouterLink>

      <RouterLink to="/test" active-class="active">
        <el-button style="width: 100%;margin-bottom: 10px" size="large" type="primary">
          Test
        </el-button>
      </RouterLink>

      <RouterLink to="/video_call" active-class="active">
        <el-button style="width: 100%;margin-bottom: 10px" size="large" type="primary">
          VideoCall
        </el-button>
      </RouterLink>

    </div>
    <div class="main-right">
      <el-scrollbar>
        <router-view></router-view>
      </el-scrollbar>
    </div>
  </div>

</template>

<style scoped lang="scss">
.main-div {
  width: 100%;
  height: 100vh;
  background-color: #5c5c5c;

  .main-left {
    width: 240px;
    height: 100vh;
    background-color: #5c5c5c;
    padding: 10px;
  }

  .main-right {
    position: absolute;
    top: 0;
    left: 240px;
    width: calc(100% - 240px);
    height: 100vh;
    background-color: #ffffff;
    padding: 20px;
    overflow: auto;
  }
}

</style>
