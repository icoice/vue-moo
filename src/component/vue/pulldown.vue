<template lang="pug">
div.lilia-pulldown.lilia(
  @mousedown.stop='checkHere'
  @touchstart.stop='checkHere')
  div.pulldown-mask(v-if='status === "disabled"')
  div.pulldown-content
    div.pulldown-block.pulldown-title(v-show='name')
      lilia-button(@pressEnd='gotoOpen')
        span(slot='button') {{ name }}
    div.pulldown-block
      lilia-button(@pressEnd='gotoOpen')
        div.pulldown-value(
          v-if='selected !== null && selected !== ""'
          slot='button') {{ getSelectItem(selected).value }}
        div.pulldown-placeholder(v-else slot='button') {{ placeholder }}
    div.pulldown-block.pulldown-control.pulldown-expand(
      v-if='status !== "disabled"')
      lilia-button(@pressEnd='gotoOpen')
        span.iconfont.icon-expandless(slot='button' v-if='status === "open"')
        span.iconfont.icon-expandmore(slot='button' v-else)
    div.pulldown-block.pulldown-control.pulldown-remove(
      v-if='status !== "disabled" && selected !== null && selected !== ""')
      lilia-button(@pressEnd='clear')
        span.iconfont.icon-remove(slot='button')
    div.pulldown-clear
  div.pulldown-search(v-if='status === "searching"')
  div.pulldown-list(v-if='status === "open"')
    ul
      li(v-for='(item, code) in pulldonwList')
          lilia-button(:stateID='`pulldown_${stateID}_${item.value}`' @pressEnd='e => gotoSelected(item.key)')
            div(slot='button' :key='code')
              span.iconfont.pulldown-has-selected(:class='{"icon-check": selected && item.key === selected }')
              span(v-if='selected && item.key === selected') &nbsp;&nbsp;
              span {{ item.value }}
</template>

<script>
import createState from './mixins/createState';
import disabled from './mixins/disabled';
import pulldown from './mixins/pulldown';

export default {
  mixins: [
    createState('pulldown'),
    disabled,
    pulldown,
  ],
  props: {
    name: {
      type: [String],
      default: null,
    },
    value: {
      type: [Number, String, Object],
      default: null,
    },
    searchValue: {
      type: [Number, String],
      default: null,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    list: {
      type: Array,
      default: () => [],
    },
    placeholder: {
      type: String,
      default: '未选择',
    },
  },
  deactivated() {
    if (['open', 'change'].indexOf(this.status) >= 0) {
      this.liliaState.wheelFlowAction('drop');
    }
  },
  data() {
    return {
      selected: this.value,
      searchVal: this.searchValue,
      pulldonwList: this.checkList(this.list || []),
    };
  },
  watch: {
    value(val) {
      this.selected = val;
    },
    searchValue(val) {
      this.searchVal = this.searchValue;
    },
    list(data) {
      this.pulldonwList = this.checkList(data || []);
    },
  },
  methods: {
    clear() {
      this.liliaState.wheelFlowAction('clear');
    },
    gotoOpen() {
      this.liliaState.wheelFlowAction('drop');
    },
    gotoSearch() {
      this.liliaState.wheelFlowAction('searching');
    },
    gotoSelected(key) {
      this.selected = key;

      this.liliaState.wheelFlowAction('change', this.getSelectItem(this.selected));
      this.liliaState.wheelFlowAction('drop');
    },
  },
}
</script>