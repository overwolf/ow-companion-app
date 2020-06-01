import Vue from 'vue'
import Share from './Share.vue'
import TooltipCont from './components/tooltip/TooltipCont.vue'

Vue.config.productionTip = false;

const appCont = document.createElement('div');
document.body.appendChild(appCont);

const tooltipCont = document.createElement('div');
document.body.appendChild(tooltipCont);

new Vue({
	el: appCont,
	render: h => h(Share),
});

new Vue({
	el: tooltipCont,
	render: h => h(TooltipCont)
});
