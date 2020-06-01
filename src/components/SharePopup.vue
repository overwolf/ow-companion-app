<template>
<transition name="fade">
<div class="share-popup" @click.self="$emit('close')">
	<div class="share-cont">
		<header class="share-header">
			<img :src="`./publicAssets/share/${service}.svg`" class="icon" />
			<h3>Share on {{serviceTitle}}</h3>
			<button
				class="app-close"
				@mousedown.stop
				@click="$emit('close')"
			>
				<img src="@/assets/close.svg" />
			</button>
		</header>
		<video
			class="share-player"
			ref="video"
			:src="url"
			:poster="thumbnailUrl"
			controls
			muted
			loop
			@click="togglePlay"
		/>
		<ShareYoutube
			class="share-form"
			v-if="service === 'youtube'"
			:gameID="gameID"
			:gameTitle="gameTitle"
			:time="time"
			:path="path"
			:events="events"
		/>
	</div>
</div>
</transition>
</template>

<script>
import ShareYoutube from '@/components/share/ShareYoutube.vue'

export default {
	name: 'SharePopup',
	components: {
		ShareYoutube
	},
	props: {
		service: {
			type: String,
			required: true
		},
		serviceTitle: {
			type: String,
			required: true
		},
		gameID: {
			type: Number,
			required: true
		},
		gameTitle: {
			type: String,
			required: true
		},
		time: {
			type: Number,
			required: true
		},
		url: {
			type: String,
			required: true
		},
		thumbnailUrl: {
			type: String,
			required: true
		},
		path: {
			type: String,
			required: true
		},
		time: {
			type: Number,
			required: true
		},
		events: {
			type: Array,
			default() {
				return [];
			}
		}
	},
	methods: {
		togglePlay() {
			const video = this.$refs.video;

			if ( video.paused )
				video.play();
			else
				video.pause();
		}
	}
}
</script>

<style lang="less" scoped>
.share-popup {
	display: flex;
	justify-content: center;
	align-items: center;
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 200;
	background: fade(#000, 80%);
	transition: all .1s ease-in-out;

	&.fade-enter,
	&.fade-leave-to {
		opacity: 0;
		transform: scale(1.05, 1.05);
	}

	.share-cont {
		max-width: 400px;
		width: calc(100% - 15px);
		height: auto;
		background: #222;
	}
	.share-header {
		display: flex;
		align-items: center;
		height: 40px;
		background: #111;

		.icon {
			margin: 0 5px;
			width: 30px;
			height: 30px;
		}
		.app-close {
			align-self: flex-start;
			margin-left: auto;
			width: 30px;
			height: 30px;
			cursor: pointer;

			img {
				width: 100%;
				height: 100%;
			}
		}
	}
	.share-player {
		display: block;
		width: 100%;
		height: auto;
		background: #000;
		object-fit: contain;
	}
}
</style>
