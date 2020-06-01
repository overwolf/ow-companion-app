<template>
<transition name="fade">
<main id="app-main" v-show="ready">
	<template v-if="sessions">
		<button
			class="show-dropdown"
			@click="sessionsDropdown = !sessionsDropdown"
		>Sessions</button>
		<div class="sessions-dropdown" v-if="sessionsDropdown">
			<div
				class="session"
				v-for="(session, i) in sessions"
				@click="selectSession(i)"
			>
				<p class="title">Session {{padNumber((i+1), 2)}}, <span class="date">{{formatDate(session.time)}}:</span></p>
				<p class="game">{{session.gameTitle}}</p>
			</div>
		</div>
		<Session
			v-bind="selectedSession"
			v-if="selectedSession"
		/>
		<div class="no-sessions" v-else>No game sessions selected</div>
	</template>
	<div class="no-sessions" v-else>No game sessions yet</div>
</main>
</transition>
</template>

<script>
import moment from 'moment'

import OverwolfWindow from './libs/overwolf-window.js'
import { getPersistentState } from './libs/state-client.js'
import { delay, padNumber } from './libs/utils.js'
import Session from './components/Session.vue'

const persState = getPersistentState();

export default {
	name: 'Main',
	components: {
		Session
	},
	data() {
		return {
			win						: new OverwolfWindow,
			ready					: false,
			sessionsDropdown		: false,
			sessions				: persState.sessions,
			sessionSelectedIndex	: 0
		}
	},
	watch: {
		sessions() {
			this.selectSession(0);
		}
	},
	computed: {
		selectedSession() {
			if ( this.sessions && this.sessions[this.sessionSelectedIndex] ) {
				const
					selected = this.sessions[this.sessionSelectedIndex],
					stateKey = `session/${selected.uid}`,
					stored = persState[stateKey];

				if ( stored )
					return stored;
			}

			return null;
		}
	},
	methods: {
		padNumber,
		drag() {
			this.win.dragMove();
		},
		async close() {
			this.ready = false;

			await delay(300);

			await this.win.close();
		},
		selectSession(i) {
			this.sessionSelectedIndex = i;
			this.sessionsDropdown = false;
		},
		formatDate(v) {
			return moment(v).format('MMM D, h:mma');
		}
	},
	created() {
		persState.on('sessions', v => this.sessions = v, this);
	},
	async mounted() {
		if ( !persState.mainWindowNotFirstRun ) {
			persState.mainWindowNotFirstRun = true;
			await this.win.changeSize(800, 700);
			await this.win.center();
		}

		await this.$nextTick();

		this.ready = true;
	},
	beforeDestroy() {
		persState.off(this);
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
	background: #090909;
	line-height: 20px;
	color: #fff;
	font-family: 'Arial', sans-serif;
	font-size: 14px;
}
#app-main {
	position: relative;
	width: 100vw;
	height: 100vh;
	transition: all .2s ease-in-out;

	&.fade-enter,
	&.fade-leave-to {
		opacity: 0;
	}
	.app-header {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 30px;
		background: #000;

		.app-logo {
			display: block;
			position: absolute;
			top: 7px;
			left: 15px;
			width: auto;
			height: 16px;
		}
		.app-close {
			display: block;
			position: absolute;
			top: 0;
			right: 0;
			z-index: 2;
			width: 30px;
			height: 30px;
			opacity: .6;
			cursor: pointer;
			transition: opacity .15s ease-in-out;

			&:hover {
				opacity: 1;
			}
			img {
				display: block;
				width: 100%;
				height: 100%;
			}
		}
	}
	.show-dropdown {
		position: absolute;
		top: 15px;
		right: 15px;
		z-index: 2;
		height: 50px;
		padding: 0 10px;
		line-height: 50px;
		background: fade(#fff, 5%);
		cursor: pointer;
		letter-spacing: .01em;
		font-size: 10px;
		text-transform: uppercase;
	}
	.sessions-dropdown {
		position: absolute;
		z-index: 10;
		top: 65px;
		right: 15px;
		background: #000;
		line-height: 18px;
		font-size: 11px;

		.session {
			padding: 7px 11px;
			cursor: pointer;
			background: #000;
			transition: opacity .15s ease-in-out;

			&:hover {
				background: #111;
			}

			.date {
				color: fade(#fff, 40%);
			}
			.game {
				font-size: 14px;
			}
		}
	}
	.no-sessions {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #ccc;
		font-size: 24px;
		font-weight: 300;
	}
}
</style>
