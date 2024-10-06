import {createRouter, createWebHashHistory} from "vue-router";

let router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/message/view',
            component: () => import('../pages/RabbitMessageView.vue'),
        },
        {
            path: '/',
            component: () => import('../pages/Index.vue')
        },
        {
            path: '/:pathMatch(.*)*',
            redirect: '/404',
            name: 'any',
        },
        {
            path: '/404',
            component: () => import('../pages/404.vue')
        },
        {
            path: '/test',
            component: () => import('../pages/test.vue')
        },
        {
            path: '/video_call',
            component: () => import('../pages/VideoCall.vue')
        }
    ],
    //滚动行为
    scrollBehavior() {
        return {
            left: 0,
            top: 0,
        }
    },
})

export default router