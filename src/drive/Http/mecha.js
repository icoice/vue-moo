import util from '../../util';

const {
  hasObj,
  hasFunc,
  hasEmpty,
  hasFormData,
} = util.Assert;

let countId = 0;

function buildMechaAPI(api, adapter, sendRecords, requestBeforeProcess) {
  Object.entries(api).map((access) => {
    const [callName, call] = access;

    adapter[callName] = call;

    if (!hasFunc(call)) {
      return access;
    }

    adapter[callName] = (py = {}) => {
      countId += 1;
      adapter.NOW_REQUEST_ID = countId;

      const id = countId;
      let payload = py;

      this.sendId = id;
      sendRecords[callName] = hasEmpty(sendRecords[callName]) ? {} : sendRecords[callName];
      sendRecords[callName][id] = { REJECT_RESPONSE: false };

      if (!hasFormData(py)) {
        payload = this.buildRequestPayload(callName, py);

        if (requestBeforeProcess) {
          payload = Object.assign({}, requestBeforeProcess(payload, {
            id,
            name: callName,
          }));
        }
      }

      return call(payload).then((response) => {
        const { description, data } = response;
        const REQ_META = Object.assign({ id, name: callName }, sendRecords[callName][id]);

        if (!data) {
          this.log('exception', '未获得服务器的响应数据', REQ_META);
        } else {
          if (hasObj(data) && !hasEmpty(data)) {
            data.REQ_META = REQ_META;
          }

          this.log('complete', `${description || ''}`, {
            domain: api.domain,
            methodName: callName,
            payload: { ...payload },
            data,
          });
        }

        delete sendRecords[callName][id]; // 拒绝响应的措施, 解决无法abort的问题。
        return response;
      }).catch((e) => {
        delete sendRecords[callName][id];

        this.requsetException(e);

        return e;
      });
    }

    return access;
  });
}

export default class Mecha {

  constructor(adapter) {
    // 错误信息
    this.ERROR_MESSAGE = {
      1000: '未定义该API接口',
      1004: '未指定一组接口定义',
    };

    // http协议请求状态
    this.READY_STATE_MESSAGE = [
     '未发送',
     '已发送',
     '等待响应',
     '请求完成'
    ];

    this.setting = {
      api: null, // API映射存放
      origin: null, // API payload的源定义
      alias: null, // API payload的别名定义
    };

    this.logger = [];
    this.sendRecords = {}; // 当前接口发送记录
    this.sendId = 0; // 发送id
    this.requestErrorHandle = () => {}; // 请求时发生错误的后续处理
    this.requestHandle = () => {}; // 请求完成的后续处理
    this.requestExceptionHandle = () => {}; // 请求时发生异常的后续处理
    this.requestBeforeProcess = payload => payload; // 请求前处理

    this.defineRequest(adapter); // 定义请求内容
  }

  // 初始化
  init() {
    const {
     ERROR_MESSAGE,
     setting,
     sendRecords,
     requestBeforeProcess,
    } = this;
    const { api } = setting;
    const adapter = {};

    if (hasEmpty(api)) {
      return this.log('error', ERROR_MESSAGE[1004]);
    }

    // 夹层的异常处理
    adapter.ON_REQUEST_ERROR = (callback) => {
      this.requestErrorHandle = callback;
    };

    adapter.ON_REQUEST_EXCEPTION = (callback) => {
      this.requestExceptionHandle = callback;
    };

    adapter.ON_REQUEST = (callback) => {
      this.requestHandle = callback;
    };

    // 拒绝响应
    adapter.rejectResponse = (name, id = null) => {
      const { sendRecords } = this;
      const ids = sendRecords[name];

      if (!ids) return;

      if(ids[id]) {
        ids[id].REJECT_RESPONSE = true;
        return;
      }

      Object.entries(ids).map((kv) => {
        const [id, config] = kv;

        config.REJECT_RESPONSE = true;

        return kv;
      });
    }

    buildMechaAPI.apply(this, [
      api,
      adapter,
      sendRecords,
      requestBeforeProcess,
    ]);

    return adapter;
  }

  // 日志
  log(type, description, data = null, name = '') {
    const record = {
      id: this.sendId,
      name,
      type,
      description,
      origin: data,
      time: Date.now(),
    };

    this.logger.push(record);

    switch (type) {
      case 'error':
        this.requestErrorHandle(record);
        throw description;
      case 'exception':
        this.requestExceptionHandle(record);
        throw description;
      default:
        this.requestHandle(record);
    }
  }

  // axios的异常请求处理
  requsetException(e) {
    const  message = typeof e === 'string' ? e : e.message;
    const { request } = e;
    const { READY_STATE_MESSAGE } = this;
    const defaultMessage = !message ? '程序存在异常，无法完成请求' : message;
    const description = !request ? '' : READY_STATE_MESSAGE[request.readyState - 1];
    const statusText = !request || !request.statusText || request.statusText === '' ? defaultMessage : request.statusText;
    const infos = { description, statusText, status: !request || !request.status ? '' : request.status };
    const status = typeof infos.status === 'undefined' || infos.status === '' || infos.status === null ? '' : `[${infos.status}]`;
    const statusTxt = infos.description !== '' && typeof infos.description === 'string' ? `[${infos.description}]` : infos.description;
    const logInfo = `${status} ${statusTxt} ${infos.statusText}`;

    this.log('exception', logInfo);

    return infos;
  }

  // 别名数据同步，同步别名数据到源数据，源数据同步到别名数据
  recoverPayload(type, origin = {}, alias = {}, data = {}) {
    const payload = {};

    Object.entries(origin).map((item) => {
      const [key, val] = item;
      const ak = hasEmpty(alias[key]) ? key : alias[key];
      const tk = ({ origin: key, alias: ak })[type];

      payload[tk] = ak in data ? data[ak] : val;

      return item;
    });

    return payload;
  }

   // 设置payload
  definePayload(key, origin, alias) {
    const { setting } = this;

    if (hasEmpty(setting.origin)) {
      setting.origin = {};
    }

    if (hasEmpty(setting.alias)) {
      setting.alias = {};
    }

    setting.origin[key] = origin;
    setting.alias[key] = alias;
  }

  //  创建payload
  buildRequestPayload(key, params) {
    const { setting, ERROR_MESSAGE } = this;
    const { origin, alias } = setting;

    return this.recoverPayload('origin', origin[key], alias[key], params);
  }

  // 设置请求对象
  defineRequest(request = null) {
    this.setting.api = request;
  }

  // 设置请求前的处理
  defineRequestBefore(callback) {
    this.requestBeforeProcess = callback;
  }
}
