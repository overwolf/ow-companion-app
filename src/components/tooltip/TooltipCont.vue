<script>
import eventBus from '@/services/event-bus.js'
import Tooltip from './Tooltip.vue'

export default {
	name: 'TooltipCont',
	components: {
		Tooltip
	},
	data() {
		return {
			tips: []
		}
	},
	methods: {
		onShow(tip) {
			const index = this.tips.findIndex(v => v.uid === tip.uid);

			if ( index === -1 )
				this.tips.push(tip);
			else
				this.$set(this.tips, index, tip);
		},
		onUpdate(tip) {
			const index = this.tips.findIndex(v => v.uid === tip.uid);

			if ( index !== -1 )
				this.$set(this.tips, index, tip);
		},
		onHide(tip) {
			const index = this.tips.findIndex(v => v.uid === tip.uid);

			if ( index !== -1 )
				this.$delete(this.tips, index);
		}
	},
	created() {
		eventBus.on({
			'tooltip-show'		: this.onShow,
			'tooltip-update'	: this.onUpdate,
			'tooltip-hide'		: this.onHide
		}, this);
	},
	beforeDestroy() {
		eventBus.off(this);
	}
}
</script>

<template>
<div class="tooltip-list" v-if="tips && tips.length">
	<tooltip
		v-for="tip in tips"
		:key="tip.uid"
		v-bind="tip"
	/>
</div>
</template>

<style lang="less">
.tooltip-cont {
	width: 0;
	height: 0;
	pointer-events: none;
}
</style>
