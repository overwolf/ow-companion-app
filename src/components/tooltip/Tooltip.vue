<script>
import { isNumeric } from '@/libs/utils.js'
import tooltipProps from './tooltip-props.js'

export default {
	name: 'Tooltip',
	data() {
		return {
			shown		: false,
			elWidth		: null,
			elHeight	: null,
			arrpos		: null
		}
	},
	props: {
		uid: {
			type: Number
		},
		coords: {
			type: [Object, DOMRect]
		},
		dist: {
			type: Number,
			default: 10
		},
		vnodes: {
			type: Array,
			default() {
				return [];
			}
		},
		...tooltipProps
	},
	computed: {
		tooltipClasses() {
			if ( this.type )
				return this.type.split(' ').map(c => 'tooltip-'+ c);
			else
				return '';
		},
		left() {
			const hor = this.position.split(' ')[0];

			if ( isNumeric(hor) )
				return Number(hor);

			const coords = this.coords;

			let left = 0;

			switch (hor) {
				case 'left':
					left = coords.left - this.dist - this.elWidth;
				break;
				case 'leftEdge':
					left = coords.left;
				break;
				case 'right':
					left = coords.right + this.dist;
				break;
				case 'rightEdge':
					left = coords.right - this.elWidth;
				break;
				case 'center':
				default:
					left = coords.left + (coords.width / 2) - (this.elWidth / 2);
			}

			if ( this.adjust !== null )
				left += this.adjust[0];

			left = Math.round(left);
			left = Math.max(left, 0);

			return left;
		},
		arrowLeft() {
			const
				coords = this.coords,
				hor = this.arrpos.split(' ')[0];

			let left = 0;

			switch (hor) {
				case 'left':
					left = coords.left - (this.dist / 2);
				break;
				case 'leftEdge':
					left = coords.left + (this.dist / 2);
				break;
				case 'right':
					left = coords.right + (this.dist / 2);
				break;
				case 'rightEdge':
					left = coords.right - (this.dist / 2);
				break;
				case 'center':
				default:
					left = coords.left + (coords.width / 2);
			}

			if ( this.adjustArrow !== null )
				left += this.adjustArrow[0];
			else if ( this.adjust !== null )
				left += this.adjust[0];

			left = Math.round(left);

			return left;
		},
		top() {
			const ver = this.position.split(' ')[1];

			if ( isNumeric(ver) )
				return Number(ver);

			const coords = this.coords;

			let top = 0;

			switch (ver) {
				case 'top':
					top = coords.top - this.dist - this.elHeight;
				break;
				case 'topEdge':
					top = coords.top;
				break;
				case 'center':
					top = ((coords.top + coords.bottom) / 2) - (this.elHeight / 2);
				break;
				case 'bottomEdge':
					top = coords.bottom - this.elHeight;
				break;
				case 'bottom':
				default:
					top = coords.bottom + this.dist;
			}

			if ( this.adjust !== null )
				top += this.adjust[1];

			top = Math.round(top);
			top = Math.max(top, 0);

			return top;
		},
		arrowTop() {
			const
				coords = this.coords,
				ver = this.arrpos.split(' ')[1];

			let top = 0;

			switch (ver) {
				case 'top':
					top = coords.top - (this.dist / 2);
				break;
				case 'topEdge':
					top = coords.top + (this.dist / 2);
				break;
				case 'center':
					top = ((coords.top + coords.bottom) / 2);
				break;
				case 'bottomEdge':
					top = coords.bottom - (this.dist / 2);
				break;
				case 'bottom':
				default:
					top = coords.bottom + (this.dist / 2);
			}

			if ( this.adjustArrow !== null )
				top += this.adjustArrow[1];
			else if ( this.adjust !== null )
				top += this.adjust[1];

			top = Math.round(top);

			return top;
		}
	},
	watch: {
		arrowPosition(v) {
			if ( v === null )
				this.arrpos = this.position;
			else
				this.arrpos = v;
		}
	},
	components: {
		vnodes: {
			props: ['nodes'],
			render(h, ctx, ...args) {
				return h('div', {}, this.nodes);
			}
		}
	},
	created() {
		if ( this.arrowPosition === null )
			this.arrpos = this.position;
		else
			this.arrpos = this.arrowPosition;
	},
	mounted() {
		this.elWidth = this.$refs.content.$el.clientWidth;
		this.elHeight = this.$refs.content.$el.clientHeight;
		this.shown = true;
	},
	updated() {
		this.elWidth = this.$refs.content.$el.clientWidth;
		this.elHeight = this.$refs.content.$el.clientHeight;
	}
}
</script>

<template>
<transition name="fade">
	<div :class="['tooltip-cont', 'tooltip-'+ uid, tooltipClasses, { hidden: !shown }]">
		<div
			ref="arrow"
			:class="[
				'tooltip-arrow',
				arrpos.split(' ').join('-')
			]"
			:style="{
				left	: arrowLeft +'px',
				top		: arrowTop +'px'
			}"
		/>
		<vnodes
			ref="content"
			class="tooltip"
			:style="{
				left	: left +'px',
				top		: top +'px'
			}"
			:nodes="vnodes"
		/>
	</div>
</transition>
</template>

<style lang="less">
.tooltip-cont {
	position: fixed;
	z-index: 99999999;
	top: 0;
	left: 0;
	transition: opacity .2s ease-in-out;
	pointer-events: none;

	&.fade-enter,
	&.fade-leave-to {
		opacity: 0;
	}

	&.hidden {
		opacity: 0;
	}
}
.tooltip-arrow {
	position: fixed;
	z-index: 2;
	margin: -5px 0 0 -7px;
	width: 14px;
	height: 10px;
	background: #fff;
	clip-path: polygon(50% 75%, 0 0, 100% 0);
	pointer-events: none;

	&.right-topEdge,
	&.right-center,
	&.right-bottomEdge {
		transform: rotate(90deg);
	}
	&.left-bottom,
	&.leftEdge-bottom,
	&.center-bottom,
	&.right-bottom,
	&.rightEdge-bottom {
		transform: rotate(180deg);
	}
	&.left-topEdge,
	&.left-center,
	&.left-bottomEdge {
		transform: rotate(270deg);
	}
}
.tooltip {
	position: fixed;
	z-index: 1;
	max-width: 300px;
	padding: 3px 7px;
	line-height: 20px;
	color: #000;
	background: #fff;
	font-size: 12px;
	font-weight: 400;
	box-shadow: 0 2px 6px fade(#000, 67%);
	border-radius: 2px;
	cursor: default;
}
.tooltip-textCentered .tooltip {
	text-align: center;
}
.tooltip-submitStyleTooltip .tooltip {
	width: 235px;
}
</style>
