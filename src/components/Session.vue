<template>
<div class="session-screen">
	<header class="header">
		<h3 class="title">{{gameTitle}}</h3>
		<div class="time">Started on {{timeFormatted}}</div>
	</header>
	<div class="timeline">
		<TooltipArea
			v-for="(e, i) in timelineExtended"
			:key="i"
			:class="[
				{
					event: (e.eventType === TimelineTypes.GAME_EVENT),
					video: (e.eventType === TimelineTypes.VIDEO),
					match: (e.eventType === TimelineTypes.MATCH)
				},
				e.tl.extraClass
			]"
			:style="{
				left: `${(e.tl.position * 100)}%`,
				width: (e.tl.duration) ? `${e.tl.duration * 100}%` : ''
			}"
			@click.native="selectVideoByTime(e.time)"
		>
			<img v-if="e.tl.icon" :src="`./publicAssets/timeline/${e.tl.icon}.svg`">
			<template #tip>{{e.tl.prettyName}}</template>
		</TooltipArea>
		<div class="time start">0m</div>
		<div class="tick tick-1"></div>
		<div class="tick tick-2"></div>
		<div class="tick tick-3"></div>
		<div class="tick tick-4"></div>
		<div class="tick tick-5"></div>
		<div class="tick tick-6"></div>
		<div class="tick tick-7"></div>
		<div class="time end">{{timelineDurationFormatted}}m</div>
	</div>
	<div class="player-cont">
		<video
		class="player"
			ref="video"
			:src="videoSelected.url"
			:poster="videoSelected.thumbnailUrl"
			controls
			muted
			autoplay
			loop
			@click="togglePlay"
		/>
		<div class="share">
			<TooltipArea
				v-if="videoSelected.url"
				elName="button"
				position="left center"
				@click.native="openFileInFolder(videoSelected.url)"
			>
				<img src="@/assets/folder.svg" />
				<template #tip>Open in folder</template>
			</TooltipArea>
			<TooltipArea
				v-for="(title, service) in shareServices"
				:key="service"
				elName="button"
				position="left center"
				@click.native="sharePopup = { service, title }"
			>
				<img :src="`./publicAssets/share/${service}.svg`" />
				<template #tip>Share on {{title}}</template>
			</TooltipArea>
		</div>
	</div>
	<div class="videos">
		<div
			v-for="(video, i) in videos"
			:key="video.url"
			:index="i"
			ref="videos"
			@click="selectVideo(i)"
			:class="{ selected: (videoSelectedIndex === i) }"
			class="video"
		>
			<div class="duration">{{formatVideoDuration(video.endTime - video.time)}}</div>
			<img class="thumbnail" :src="video.thumbnailUrl" />
			<video class="video-preview" :src="video.url" muted autoplay loop />
			<div class="events" v-if="video.videoEvents">
				<TooltipArea v-for="(e, i) in video.videoEvents" :key="i" class="event">
					<img :src="`./publicAssets/timeline/${e.icon}.svg`">
					<template #tip>{{e.prettyName}}</template>
				</TooltipArea>
			</div>
		</div>
	</div>
	<SharePopup
		v-if="sharePopup && videoSelected"
		:service="sharePopup.service"
		:serviceTitle="sharePopup.title"
		:gameID="gameID"
		:gameTitle="gameTitle"
		:url="videoSelected.url"
		:thumbnailUrl="videoSelected.thumbnailUrl"
		:path="videoSelected.encodedPath"
		:time="videoSelected.time"
		:events="videoSelected.events || []"
		@close="sharePopup = null"
	/>
</div>
</template>

<script>
import moment from 'moment'

import TooltipArea from '@/components/tooltip/TooltipArea.vue'
import SharePopup from '@/components/SharePopup.vue'
import GameEventsInfo from '@/constants/game-events-info.js'
import TimelineTypes from '@/constants/timeline-types.js'
import VideoTypes from '@/constants/video-types.js'
import ShareServices from '@/constants/share-services.js'
import { objectCopy, L } from '@/libs/utils.js'

export default {
	name: 'Session',
	components: {
		TooltipArea,
		SharePopup
	},
	props: {
		uid			: String,
		gameID		: Number,
		gameTitle	: String,
		gameInfo	: Object,
		time	: Number,
		endTime		: Number,
		timeline	: Array
	},
	data() {
		return {
			TimelineTypes		: objectCopy(TimelineTypes),
			videoSelectedIndex	: 0,
			sharePopup			: null,
			shareServices		: null
		}
	},
	computed: {
		videos() {
			return this.timeline
				.filter(({ eventType }) => (eventType === TimelineTypes.VIDEO))
				.map(e => {
					e = objectCopy(e);

					if ( e.events ) {
						e.videoEvents = e.events.map(event => {
							if ( GameEventsInfo[this.gameID] && GameEventsInfo[this.gameID][event] )
								return objectCopy(GameEventsInfo[this.gameID][event]);

							return null;
						});
					}

					return e;
				});
		},
		videoSelected() {
			return this.videos[this.videoSelectedIndex];
		},
		timelineDuration() {
			return (this.endTime - this.time);
		},
		timelineDurationFormatted() {
			return moment.duration(this.timelineDuration).minutes();
		},
		timeFormatted() {
			return moment(this.time).format('MMMM D, h:mma');
		},
		timelineExtended() {
			const tl = this.timeline.filter(e => {
				if ( e.eventType !== TimelineTypes.GAME_EVENT )
					return true;

				const gameID = String(this.gameID);

				return ( e.key && GameEventsInfo[gameID] && GameEventsInfo[gameID][e.key] );
			})
			.map(e => {
				e = objectCopy(e);

				const tl = e.tl = {};

				tl.position = ((e.time - this.time) / this.timelineDuration);

				if ( e.endTime )
					tl.duration = ((e.endTime - e.time) / this.timelineDuration);

				if ( e.eventType === TimelineTypes.GAME_EVENT
					&& e.key
					&& GameEventsInfo[this.gameID]
					&& GameEventsInfo[this.gameID][e.key]
				) {
					Object.assign(tl, GameEventsInfo[this.gameID][e.key]);
				} else if ( e.eventType === TimelineTypes.VIDEO ) {
					if ( e.videoType === VideoTypes.HIGHLIGHT )
						tl.prettyName = 'Highlight';
					else if ( e.eventType === VideoTypes.REPLAY )
						tl.prettyName = 'Replay';
					else
						tl.prettyName = 'Video';
				} else if ( e.eventType === TimelineTypes.MATCH ) {
					tl.prettyName = 'Match';
				}

				return e;
			});

			console.log(...L('timelineExtended():', tl));

			return tl;
		}
	},
	methods: {
		async updateShareServices() {
			const result = await new Promise(r => overwolf.social.getDisabledServices(r));

			const out = {};

			let disabled = [];

			if ( result.status === 'success' && result.disabled_services && result.disabled_services.length > 0 )
				disabled = result.disabled_services;

			for ( let service in ShareServices ) {
				if ( !disabled.includes(service) )
					out[service] = ShareServices[service];
			}

			this.shareServices = out;
		},
		selectVideo(i) {
			this.videoSelectedIndex = i;
		},
		selectVideoByTime(time) {
			const i = this.videos.findIndex(v => (v.time <= time && v.endTime >= time));

			if ( i > -1 )
				this.selectVideo(i);
		},
		formatVideoDuration(v) {
			if ( v > (60 * 60 * 1000) )
				return moment(v).format('h:mm:ss');
			else
				return moment(v).format('m:ss');
		},
		openFileInFolder(url) {
			return new Promise(r => overwolf.utils.openWindowsExplorer(url, r));
		},
		togglePlay() {
			const video = this.$refs.video;

			if ( video.paused )
				video.play();
			else
				video.pause();
		}
	},
	created() {
		this.updateShareServices();
	}
}
</script>

<style lang="less" scoped>
.session-screen {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	justify-content: flex-start;
	height: 100%;
	padding: 15px;

	.header {
		position: relative;
		flex: 0 0 auto;
		height: 50px;
		margin-bottom: 15px;

		.icon {
			position: absolute;
			top: 0;
			left: 0;
			width: 50px;
			height: 50px;
		}
		.title {
			line-height: 30px;
			font-size: 24px;
			font-weight: 700;
		}
		.time {
			color: fade(#fff, 50%);
			font-size: 12px;
		}
	}
	.timeline {
		position: relative;
		flex: 0 0 auto;
		height: 30px;
		margin-bottom: 35px;

		&:before {
			display: block;
			content: '';
			position: absolute;
			bottom: 0;
			left: 0;
			right: 0;
			height: 8px;
			border: 1px solid fade(#fff, 25%);
			border-width: 0 1px 1px;
			pointer-events: none;
		}

		.time {
			position: absolute;
			top: 100%;
			line-height: 20px;
			font-size: 10px;

			&.start {
				left: 0;
			}
			&.end {
				right: 0;
				text-align: right;
			}
		}
		.tick {
			position: absolute;
			bottom: 1px;
			left: 0;
			width: 1px;
			height: 3px;
			background: fade(#fff, 25%);
			pointer-events: none;

			&.tick-1 {
				left: (100% / 8);
			}
			&.tick-2 {
				left: ((100% / 8) * 2);
			}
			&.tick-3 {
				left: ((100% / 8) * 3);
			}
			&.tick-4 {
				left: ((100% / 8) * 4);
			}
			&.tick-5 {
				left: ((100% / 8) * 5);
			}
			&.tick-6 {
				left: ((100% / 8) * 6);
			}
			&.tick-7 {
				left: ((100% / 8) * 7);
			}
		}
		.event {
			display: flex;
			align-items: center;
			justify-content: center;
			position: absolute;
			top: 0;
			bottom: 0;
			left: 0;
			z-index: 3;
			margin: auto 0 auto -10px;
			width: 20px;
			height: 20px;
			cursor: pointer;

			img {
				max-width: 100%;
				max-height: 100%;
				transition: transform .1s ease-in-out;
			}
			&:hover img {
				transform: scale(1.5, 1.5);
			}
			&.icon-26 {
				margin-left: -13px;
				width: 26px;
				height: 26px;
			}
			&.icon-30 {
				margin-left: -15px;
				width: 30px;
				height: 30px;
			}
		}
		.video {
			position: absolute;
			top: 0;
			left: 0;
			z-index: 2;
			width: 10px;
			height: 100%;
			cursor: pointer;

			&:before {
				display: block;
				content: '';
				position: absolute;
				top: 50%;
				left: 0;
				right: 0;
				margin-top: -2px;
				height: 4px;
				background: fade(#f33, 50%);
				border-radius: 2px;
				transition: background .1s ease-in-out;
			}
			&:hover:before {
				background: #f33;
			}
		}
		.match {
			position: absolute;
			top: 0;
			left: 0;
			z-index: 1;
			width: 10px;
			height: 100%;
			cursor: pointer;

			&:before {
				display: block;
				content: '';
				position: absolute;
				bottom: 2px;
				left: 0;
				right: 0;
				margin-top: -2px;
				height: 4px;
				background: fade(#33f, 50%);
				border-radius: 2px;
				transition: background .1s ease-in-out;
			}
			&:hover:before {
				background: #33f;
			}
		}
	}
	.player-cont {
		display: block;
		position: relative;
		margin: auto -15px;
		width: 100vw;
		height: calc(100vh - 275px);

		.share {
			display: block;
			position: absolute;
			top: 15px;
			right: 15px;
			z-index: 2;
			transition: all .15s ease-in-out;

			button {
				display: block;
				margin-bottom: 10px;
				width: 30px;
				height: 30px;
				border-radius: 4px;
				background: fade(#000, 75%);
				cursor: pointer;
			}
			img {
				display: block;
				width: 100%;
				height: 100%;
			}
		}
		&:not(:hover) .share {
			right: -30px;
			visibility: hidden;
			opacity: 0;
		}
		.player {
			display: block;
			width: 100%;
			height: 100%;
			background: #000;
		}
	}
	.videos {
		display: flex;
		flex: 0 0 auto;
		margin-top: 15px;
		height: 100px;
		padding-top: 5px;
		padding-left: 5px;
		background: fade(#000, 60%);
		overflow-x: auto;
		overflow-y: hidden;

		&::-webkit-scrollbar {
			width: 5px;
			height: 5px;
		}
		&::-webkit-scrollbar-button {
			width: 0;
			height: 0;
			background: transparent;
		}
		&::-webkit-scrollbar-thumb {
			background: fade(#fff, 10%);
		}
		&::-webkit-scrollbar-thumb:hover {
			background: fade(#fff, 20%);
		}

		.video {
			display: block;
			position: relative;
			margin-right: 5px;
			flex: 0 0 auto;
			border: 1px solid #000;
			height: 90px;
			cursor: pointer;
			transition: border-color .1s ease-in-out;

			&:hover {
				border-color: #777;
			}
			&.selected {
				border-color: #eee;
			}
			.thumbnail {
				width: auto;
				height: 100%;
				object-fit: contain;
				background: #000;
			}
			.video-preview {
				display: block;
				position: absolute;
				top: 0;
				left: 0;
				z-index: 2;
				width: 100%;
				height: 100%;
				object-fit: contain;
				background: #000;
				pointer-events: none;
				transition: opacity .25s ease-in-out;
			}
			&:not(:hover) .video-preview {
				visibility: hidden;
				opacity: 0;
			}
			.duration {
				position: absolute;
				top: 5px;
				right: 5px;
				padding: 0 5px;
				background: fade(#000, 80%);
				font-size: 10px;
			}
			.events {
				display: flex;
				justify-content: center;
				align-items: center;
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				z-index: 2;
				margin: auto;
				transition: opacity .25s ease-in-out;

				.event {
					display: block;
					margin: 0 5px;
					width: 40px;
					height: 40px;
				}
				img {
					width: 100%;
					height: 100%;
				}
			}
			&:hover .events {
				visibility: hidden;
				opacity: 0;
			}
		}
	}
}
</style>
