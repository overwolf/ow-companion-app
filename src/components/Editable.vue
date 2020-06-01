<template>
<div
	@input="onInput"
	contenteditable="true"
	spellcheck="false"
/>
</template>

<script>
export default {
	props: {
		value: String
	},
	watch: {
		value(v) {
			if ( v !== this.$el.innerText )
				this.$el.innerText = v;
		}
	},
	methods: {
		onInput() {
			this.$emit('input', this.$el.innerText);
		}
	},
	mounted() {
		this.$el.innerText = this.value;
	}
}
</script>
