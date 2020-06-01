<template>
<transition name="fade">
<div id="app-share" v-show="ready">
	<header class="share-header">
		<img :src="`./publicAssets/share/youtube.svg`" class="icon" />
		<h3>Share on Youtube</h3>
	</header>
	<video
		class="share-player"
		ref="video"
		:src="video.url"
		:poster="video.thumbnailUrl"
		controls
		muted
		loop
		@click="togglePlay"
	/>
	<ShareYoutube
		class="share-form"
		v-if="video && video.gameInfo"
		:gameID="video.gameInfo.classId"
		:gameTitle="video.gameInfo.title"
		:time="video.time"
		:url="video.url"
		:path="video.path"
		:events="video.events || []"
	/>
</div>
</transition>
</template>

<script>
import ShareYoutube from './components/share/ShareYoutube.vue'
import OverwolfWindow from './libs/overwolf-window.js'
import { getState, getPersistentState } from './libs/state-client.js'
import { delay } from './libs/utils.js'

const
	state = getState(),
	persState = getPersistentState();

export default {
	name: 'Share',
	components: {
		ShareYoutube
	},
	data() {
		return {
			win		: new OverwolfWindow,
			video	: state.videoToShare,
			ready	: false
		}
	},
	methods: {
		async onVideoUpdated(v) {
			if ( v ) {
				this.video = v;
			} else {
				console.error('no video to share');
				await this.win.close();
			}
		},
		togglePlay() {
			const video = this.$refs.video;

			if ( video.paused )
				video.play();
			else
				video.pause();
		}
	},
	async mounted() {
		if ( !persState.shareWindowNotFirstRun ) {
			persState.shareWindowNotFirstRun = true;
			await this.win.changeSize(400, 640);
			await this.win.center();
		}

		if ( !this.video ) {
			console.error('no video to share');
			await this.win.close();
			return;
		}

		state.on('videoToShare', this.onVideoUpdated, this);

		await this.$nextTick();

		this.ready = true;
	},
	beforeDestroy() {
		state.off(this);
	}
}
</script>

<style lang="less">
*,
*:before,
*:after {
	box-sizing: border-box;
	margin: 0;
	padding: 0;
	border: none;
	outline: none;
	vertical-align: baseline;
	color: inherit;
	background: transparent;
	font-size: inherit;
	font-family: inherit;
	font-weight: inherit;
}
img {
	display: block;
}
html,
body {
	overflow: hidden;
	user-select: none;
}
body {
	background: #222;
	line-height: 20px;
	color: #fff;
	font-family: 'Arial', sans-serif;
	font-size: 14px;
}
#app-share {
	position: relative;
	width: 100vw;
	height: 100vh;
	transition: all .2s ease-in-out;

	&.fade-enter,
	&.fade-leave-to {
		opacity: 0;
	}

	.share-header {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 44px;

		.icon {
			margin: 0 5px;
			width: 30px;
			height: 30px;
		}
	}
	.share-player {
		display: block;
		width: 100vw;
		height: 213px;
		background: #000;
		object-fit: contain;
	}
}
</style>
