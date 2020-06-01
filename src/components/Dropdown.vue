<script>
export default {
	name: 'Dropdown',
	data() {
		return {
			showOptions: false
		}
	},
	props: {
		placeholder: {
			type: String,
			default: ''
		},
		options: {
			type: Array,
			validator(list) {
				if ( !list || !list.length )
					return false;

				return true;
			}
		},
		value: {
			default: null
		}
	},
	computed: {
		optionsExtended() {
			const out = [];

			for ( let o of this.options ) {
				if ( typeof o === 'object' && o !== null && o.title !== undefined && o.value !== undefined ) {
					out.push(o);
				} else {
					out.push({
						title: o,
						value: o
					});
				}
			}

			return out;
		},
		title() {
			if ( this.value ) {
				for ( let o of this.optionsExtended ) {
					if ( o.value === this.value )
						return o.title;
				}
			}

			return this.placeholder;
		}
	},
	methods: {
		onClickOutside({ target }) {
			if ( this.$el !== target && !this.$el.contains(target) )
				this.showOptions = false;
		},
		selected({ value }) {
			this.$emit('input', value);
			this.showOptions = false;
		}
	},
	mounted() {
		document.body.addEventListener('click', this.onClickOutside, { passive: true });
	},
	beforeDestroy() {
		document.body.removeEventListener('click', this.onClickOutside, { passive: true });
	}
}
</script>

<template>
<div :class="['dropdown', { open: showOptions }]" @click.stop>
	<div class="value" @click="showOptions = !showOptions">{{title}}</div>
	<transition name="slide">
		<div class="list" v-if="showOptions">
			<div
				v-for="o in optionsExtended"
				:key="o.value"
				:class="['option', o.value, { selected: o.value === value }]"
				@click="selected(o)"
			>{{o.title}}</div>
		</div>
	</transition>
</div>
</template>

<style lang="less">
.dropdown {
	position: relative;
	color: #fff;
	background: #000;
	// border-radius: 2px;
	transition: all .1s ease-in-out;

	&:not(.open):hover {
		border-color: #0bb1c3;
	}

	&.open {
		// border-radius: 2px 2px 0 0;
	}

	.value {
		position: relative;
		padding-left: 10px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;

		&:after {
			content: '';
			display: block;
			position: absolute;
			top: 0;
			right: 10px;
			bottom: 0;
			margin: auto;
			width: 10px;
			height: 10px;
			background: url(../assets/select-arrow.svg) center center no-repeat;
			transition: all .1s ease-in-out;
		}
	}
	&.open .value:after {
		transform: rotate(180deg);
	}
	&:not(.open) .value {
		cursor: pointer;
	}
	.list {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		z-index: 50;
		overflow: hidden;
		background: #000;
		// border-radius: 2px;
		transform-origin: center top;
		transition: all .1s ease-in-out;

		&.slide-enter,
		&.slide-leave-to {
			transform: scaleY(.8);
			opacity: 0;
		}
	}
	.option {
		cursor: pointer;
		padding-left: 10px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		transition: all .1s ease-in-out;

		&:hover {
			color: #000;
			background: #fff;
		}
	}
}
</style>
