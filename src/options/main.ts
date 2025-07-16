import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Options from './Options.vue'

const app = createApp(Options)
app.use(createPinia())
app.mount('#app')
