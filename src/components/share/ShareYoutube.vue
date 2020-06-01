<template>
<div
	class="share-form-youtube"
	:class="{ 'not-logged-in': !loggedIn, ready }"
>
	<template v-if="!loggedIn">
		<p class="login-message">Please log into Youtube</p>
		<button class="login" @click="login">Log into Youtube</button>
	</template>
	<template v-else>
		<div class="user">
			<img :src="userAvatar" class="avatar">
			<button class="logout" @click="logout">Log out</button>
		</div>
		<input type="text" class="title" v-model.trim="title">
		<textarea class="description" v-model.trim="description" />
		<div class="field">
			<h3>Tags</h3>
			<div class="tags" ref="tags">
				<div
					class="tag"
					v-for="(tag, i) in tags"
					:key="tag"
				>{{tag}}<button class="remove" @click="removeTag(i)">
						<img src="@/assets/close.svg" />
					</button>
				</div>
				<Editable
					class="add-tag"
					v-model.trim="newTag"
					@blur.native="addTag"
					@keyup.enter.native="addTag"
				/>
			</div>
		</div>
		<div class="field">
			<h3>Privacy</h3>
			<Dropdown
				class="privacy"
				:options="PrivacyOptions"
				v-model="privacy"
			/>
		</div>
		<button
			class="submit"
			:class="{ disabled: loggedIn }"
			@click="share"
		>Share</button>
	</template>
</div>
</template>

<script>
import moment from 'moment'

import Dropdown from '@/components/Dropdown.vue'
import Editable from '@/components/Editable.vue'
import GameHashtags from '@/constants/game-hashtags.js'
import { capitalizeFirstLetter, objectCopy, L } from '@/libs/utils.js'

const PrivacyOptions = [
	'Public',
	'Private',
	'Unlisted'
];

export default {
	name: 'ShareYoutube',
	components: {
		Dropdown,
		Editable
	},
	props: {
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
		path: {
			type: String,
			required: true
		},
		events: {
			type: Array,
			default() {
				return [];
			}
		}
	},
	data() {
		return {
			PrivacyOptions	: objectCopy(PrivacyOptions),
			ready			: false,
			loggedIn		: false,
			userID			: null,
			userAvatar		: null,
			userName		: null,
			title			: this.makeTitle(),
			description		: this.makeDescription(),
			tags			: [ 'Overwolf', 'Gaming', this.gameTitle, ...this.events.map(capitalizeFirstLetter) ],
			newTag			: '',
			privacy			: PrivacyOptions[0]
		}
	},
	computed: {
	},
	methods: {
		login() {
			if ( this.ready )
				overwolf.social.youtube.performUserLogin();
		},
		async logout() {
			if ( this.ready ) {
				await new Promise(r => {
					overwolf.social.youtube.performLogout(r);
				});
			}
		},
		async onLoginStateChanged({ state } = {}) {
			console.log(...L('onLoginStateChanged()', state));

			if ( state === 'connected' )
				await this.updateUserInfo();
			else if ( state === 'disconnected' )
				this.onLogout();
		},
		async updateUserInfo() {
			const { userInfo } = await new Promise(r => {
				overwolf.social.youtube.getUserInfo(r);
			});

			console.log(...L('updateUserInfo()', userInfo));

			if ( userInfo && userInfo.id )
				this.onLogin(userInfo);
			else
				this.onLogout();
		},
		onLogin(userInfo) {
			this.loggedIn	= true;
			this.userID		= userInfo.id;
			this.userAvatar	= userInfo.picture;
			this.userName	= userInfo.name;
		},
		onLogout() {
			this.loggedIn	= false;
			this.userID		= null;
			this.userAvatar	= null;
			this.userName	= null;
		},
		removeTag(i) {
			this.$delete(this.tags, i);
		},
		addTag() {
			if ( this.newTag ) {
				const tags = this.newTag.split(',').map(v => v.trim());

				for ( let tag of tags ) {
					if ( !this.tags.includes(tag) )
						this.tags.push(tag);
				}

				this.newTag = '';

				this.scrollToAddTag();
			}
		},
		scrollToAddTag() {
			if ( this.$refs.tags )
				this.$refs.tags.scrollTop = this.$refs.tags.scrollHeight;
		},
		makeTitle() {
			const
				event = ( this.events && this.events[0] ) ? ` ${capitalizeFirstLetter(this.events[0])}` : '',
				date = moment(this.time).format('MMM D, YYYY');

			return `${this.gameTitle}${event}. ${date}`;
		},
		makeDescription() {
			const gameTitle = GameHashtags[this.gameID] || this.gameTitle.replace(/\s/g,'');

			return `Check out my video! #${gameTitle} | Captured by #Overwolf`;
		},
		async share() {
			const payload = {
				channelId	: this.userID,
				gameTitle	: this.gameTitle,
				gameClassId	: this.gameID,
				file		: this.path,
				title		: this.title,
				description	: this.description,
				tags		: this.tags,
				privacy		: this.privacy
			};

			const results = await new Promise(r => {
				overwolf.social.youtube.share(payload, r);
			});

			console.log(...L('share()', { payload, results }));
		}
	},
	async mounted() {
		await this.updateUserInfo();
		this.scrollToAddTag();
		overwolf.social.youtube.onLoginStateChanged.addListener(this.onLoginStateChanged);
		this.ready = true;
	},
	beforeDestroy() {
		overwolf.social.youtube.onLoginStateChanged.removeListener(this.onLoginStateChanged);
	}
}
</script>

<style lang="less" scoped>
.share-form-youtube {
	position: relative;
	height: 100%;
	min-height: 330px;
	padding: 15px;
	font-size: 12px;
	transition: opacity .1s ease-in-out;

	&.not-logged-in {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}
	&:not(.ready) {
		opacity: 0;
	}

	.login-message {
		margin-bottom: 10px;
	}
	.login {
		display: block;
		padding: 0 10px;
		line-height: 30px;
		background: #333;
		cursor: pointer;
	}
	.user {
		position: absolute;
		top: 15px;
		left: 15px;
		width: 60px;

		.avatar {
			margin-bottom: 5px;
			width: 60px;
			height: 60px;
			border-radius: 50%;
		}
		h3 {
			margin-bottom: 5px;
			text-align: center;
		}
		.logout {
			display: block;
			margin: 0 auto;
			padding: 0 7px;
			line-height: 20px;
			background: #333;
			cursor: pointer;
		}
	}
	.title,
	.description {
		display: block;
		width: calc(100% - 75px);
		margin-left: 75px;
		padding-left: 10px;
		color: #fff;
		background: #000;
	}
	.title {
		margin-bottom: 15px;
		line-height: 30px;
	}
	.description {
		margin-bottom: 15px;
		padding-top: 5px;
		height: 70px;
		line-height: 20px;
		resize: none;
		overflow-x: hidden;
		overflow-y: auto;
	}
	.field {
		position: relative;
		padding-left: 75px;

		h3 {
			position: absolute;
			top: 5px;
			left: 0;
			width: 60px;
		}
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-start;
		align-items: flex-start;
		align-content: flex-start;
		margin-bottom: 15px;
		height: 80px;
		color: #fff;
		background: #000;
		overflow-x: hidden;
		overflow-y: auto;

		.tag {
			position: relative;
			flex: 0 0 auto;
			margin: 5px 0 0 5px;
			max-width: calc(100% - 10px);
			padding: 0 25px 0 5px;
			background: #111;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;

			.remove {
				display: block;
				position: absolute;
				top: 0;
				right: 0;
				width: 20px;
				height: 20px;
				cursor: pointer;

				img {
					width: 100%;
					height: 100%;
				}
			}
		}
		.add-tag {
			display: block;
			position: relative;
			margin-left: 5px;
			width: fit-content;
			max-width: calc(100% - 10px);
			min-width: 75px;
			padding: 0 5px;
			height: 30px;
			line-height: 30px;
			overflow: hidden;
			white-space: nowrap;
			cursor: text;

			&:empty {
				&:after {
					content: 'Add more...';
					display: block;
					position: absolute;
					top: 0;
					left: 5px;
					opacity: .6;
					pointer-events: none;
					transition: opacity .1s ease-in-out;
				}
				&:focus:after {
					opacity: .8;
				}
			}
		}
	}
	.privacy {
		margin-bottom: 15px;
		line-height: 30px;
	}
	.submit {
		display: block;
		margin-left: auto;
		height: 30px;
		line-height: 30px;
		min-width: 75px;
		background: #f00;
		cursor: pointer;
	}
}
</style>
