import { JUDGE, eq, isMob } from '../../../common';

export default {
  data() {
    return {
      point: null,
      status: '',
    };
  },
  mounted() {
    const { state } = this;

    // 按下动作流程
    state.setFlowAction('press', (status, e) => {
      this.noDisabled(() => {
        if (!eq(this.status, 'cancel')) {
          if (eq(status, 'pressStart')) {
            this.point = this.getPoint(e);
          }

          this.eventHappen(status, e);
        }

        this.status = status;
      });
    });

    // 动作取消流程
    state.setFlowAction('pressCancel', (status, e) => {
      this.noDisabled(() => {
        this.status = status;

        this.eventHappen(this.status, e);
      });
    });

    state.setFlowAction('pressUseabled', (status, e) => {
      this.noDisabled(() => {
        this.status = status;

        this.eventHappen(this.status, e);
      });
    });

    state.setFlowAction('pressDisabled', (status, e) => {
      this.noDisabled(() => {
        this.status = status;

        this.eventHappen(this.status, e);
      });
    });
  },
  methods: {
    isMob,

    onTapMove(e) {
      const { state } = this;

      state.wheelFlowAction('pressCancel', e);
    },
    onTapStart(e) {
      const { state } = this;

      state.wheelFlowAction('press', e);
    },
    onTapEnd(e) {
      const { state } = this;

      state.wheelFlowAction('press', e);
    },
    // 确认是否完成点击动作
    isCanTap({ x, y }) {
      const { point } = this;

      if (!point) return true;

      const disX = point.x - x;
      const disY = point.y - y;
      const bs = 10;
      const be = -10;

      if (disX > bs || disX < be) return false;
      if (disY > bs || disY < be) return false;

      return true;
    },
    // 获得点击或触击的点
    getPoint(e = { pageX: 1, pageY: 1 }) {
      const point = e.touches || e.changedTouches || e;
      let touchPoint = { x: 1, y: 1 };

      JUDGE.IN(point, {
        IS_OBJ() {
          touchPoint = {
            x: point.pageX,
            y: point.pageY,
          };
        },
        IS_ARR() {
          touchPoint = {
            x: point[0].pageX,
            y: point[0].pageY,
          };
        },
      });

      return touchPoint;
    },
    eventHappen(evtName, e = { x: 0, y: 0 }) {
      this.$emit(evtName, e);
    },
  },
};