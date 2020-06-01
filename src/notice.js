import Vue from 'vue'
import Notices from './Notices.vue'

Vue.config.productionTip = false;

const appCont = document.createElement('div');
document.body.appendChild(appCont);

new Vue({
	el: appCont,
	render: h => h(Notices),
});
