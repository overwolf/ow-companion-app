<script>
import { delay, uuid } from '@/libs/utils.js'
import eventBus from '@/services/event-bus.js'
import tooltipProps from './tooltip-props.js'

export default {
	name: 'TooltipArea',
	data() {
		return {
			uid: uuid(),
			isMouseOver: false
		}
	},
	props: {
		elName: {
			type: String,
			default: 'div'
		},
		showDelay: {
			type: Number,
			default: 200
		},
		...tooltipProps
	},
	methods: {
		async show() {
			if ( !this.$slots.tip )
				return;

			this.isMouseOver = true;

			await delay(this.showDelay);

			// console.log('show', this.uid, this.$el.offsetParent, this.$el);

			if ( !this.$slots.tip || !this.isMouseOver || !this.$el || this.$el.offsetParent === null )
				return;

			const
				uid = this.uid,
				coords = this.$el.getBoundingClientRect(),
				vnodes = this.$slots.tip;

			eventBus.emit('tooltip-show', Object.assign({ uid, coords, vnodes }, this.$props));
		},
		hide() {
			this.isMouseOver = false;
			// console.log('hide', this.uid);
			eventBus.emit('tooltip-hide', { uid: this.uid });
		}
	},
	updated() {
		if ( !this.$slots.tip || !this.isMouseOver )
			return;

		// console.log('updated', this.uid);

		const
			uid = this.uid,
			coords = this.$el.getBoundingClientRect(),
			vnodes = this.$slots.tip;

		eventBus.emit('tooltip-update', Object.assign({ uid, coords, vnodes }, this.$props));
	},
	beforeDestroy() {
		if ( this.isMouseOver )
			this.hide();
	}
}
</script>

<template><component
	:is="elName"
	@mouseenter="show"
	@mouseleave="hide"
><slot></slot></component></template>
