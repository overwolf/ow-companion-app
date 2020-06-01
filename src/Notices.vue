<template>
<transition-group
	class="notices"
	name="fade"
	tag="div"
	v-if="ready"
>
	<notice
		v-for="(notice, i) in list"
		:key="notice.uid"
		v-bind="notice"
		@remove="removeNotice(i)"
		@action="doAction"
	/>
</transition-group>
</template>

<script>
import OverwolfWindow from './libs/overwolf-window.js'
import messenger from './libs/messenger-client.js'
import { delay, L } from './libs/utils.js'

import Notice from './components/Notice.vue'

export default {
	name: 'Notices',
	data() {
		return {
			win: new OverwolfWindow,
			ready: false,
			list: []
		}
	},
	watch: {
		async list() {
			if ( this.list.length === 0 ) {
				await delay(3000);

				if ( this.list.length === 0 )
					await this.closeWin();
			}
		}
	},
	components: {
		Notice
	},
	methods: {
		onNewNotice(notice) {
			console.log(...L('onNewNotice()', notice));

			if ( this.list.length > 2 )
				this.list.length = 2;

			this.list.push(notice);
		},
		removeNotice(i) {
			this.$delete(this.list, i);
		},
		doAction({ win, method, arg }) {
			console.log(...L('doAction()', { win, method, arg }));

			if ( method === 'restore' )
				return (new OverwolfWindow(win)).restore();
			else
				return messenger.openAndEmit(win, method, arg);
		},
		async closeWin() {
			this.ready = false;

			messenger.off('showNotice', this);

			await this.win.close();
		},
		async positionWindow() {
			const
				viewport	= await OverwolfWindow.getViewportSize(),
				width		= 350,
				height		= 600,
				left		= viewport.width - width - 15,
				top			= viewport.height - height - 55;

			await Promise.all([
				this.win.changePosition(left, top),
				this.win.changeSize(width, height)
			]);
		}
	},
	created() {
		messenger.on('showNotice', this.onNewNotice, this);
	},
	async mounted() {
		await this.win.restore();
		await this.positionWindow();

		this.ready = true;
	},
	beforeDestroy() {
		messenger.off('showNotice', this);
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
	line-height: 20px;
	color: #fff;
	font-family: 'Roboto', sans-serif;
	font-size: 14px;
}

.notices {
	display: flex;
	flex-direction: column-reverse;
	justify-content: flex-start;
	align-items: flex-end;
	position: relative;
	height: 100vh;
	color: #fff;
}
</style>
