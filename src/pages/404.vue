<script setup lang="ts">
import {useRouter} from "vue-router";

let router = useRouter();

const goIndex = () => {
  router.push('/')
}
</script>
<template>
  <el-empty description="description">
    <el-button @click="goIndex" type="primary" size="large">首页</el-button>
  </el-empty>
</template>

<style scoped lang="scss">

</style>