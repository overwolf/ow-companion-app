<template>
<div
	:class="[
		'notice',
		(type) ? 'type-'+ type : null,
		{ clickable: action }
	]"
	@mouseenter="cancelTimeout"
	@mouseleave="startTimeout"
	@click="doAction"
>
	<button class="close" @click.stop="remove" v-if="close">
		<img src="@/assets/close.svg">
	</button>
	<img class="icon" v-if="icon" :src="`./publicAssets/${icon}.svg`" />
	<div class="text" v-html="text" />
</div>
</template>

<script>
export default {
	name: 'Notice',
	data() {
		return {
			timeoutHandle: null
		}
	},
	props: {
		uid: {
			type: [ String, Number ],
			default: 0
		},
		type: {
			type: [ String, null ],
			default: null
		},
		text: {
			type: String,
			default: ''
		},
		icon: {
			type: String,
			default: ''
		},
		timeout: {
			type: [ Number, null ],
			default: 7000
		},
		close: {
			type: Boolean,
			default: true
		},
		action: {
			type: Object,
			default: null
		}
	},
	methods: {
		startTimeout() {
			this.cancelTimeout();

			if ( this.timeout )
				this.timeoutHandle = setTimeout(() => this.remove(), this.timeout);
		},
		cancelTimeout() {
			if ( this.timeout && this.timeoutHandle !== null ) {
				clearTimeout(this.timeoutHandle);
				this.timeoutHandle = null;
			}
		},
		remove() {
			this.$emit('remove');
		},
		doAction() {
			if ( this.action ) {
				this.$emit('action', this.action);
				this.$emit('remove');
			}
		}
	},
	created() {
		this.startTimeout();
	},
	beforeDestroy() {
		this.cancelTimeout();
	}
}
</script>

<style lang="less" scoped>
.notice {
	display: flex;
	flex: 0 0 auto;
	position: relative;
	align-items: center;
	margin-top: 10px;
	padding: 3px 45px 3px 15px;
	max-width: 100%;
	width: fit-content;
	height: 60px;
	overflow: hidden;
	background: fade(#090909, 95%);
	border-radius: 5px;
	transition: all .2s ease-in-out;

	&.clickable {
		cursor: pointer;
	}
	&.fade-enter,
	&.fade-leave-to {
		opacity: 0;
		transform: scale(.95, .95);
	}

	.icon {
		margin: auto 10px auto 0;
		width: 40px;
		height: auto;
		flex: 0 0 auto;
	}
	.close {
		position: absolute;
		z-index: 10;
		top: 0;
		right: 0;
		width: 30px;
		height: 30px;
		cursor: pointer;

		img {
			width: 100%;
			height: 100%;
		}
	}
}
</style>
