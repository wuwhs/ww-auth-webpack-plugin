## 特性

引入该插件后
- webpack服务启动时，会依次请求获取企微信[access_token](https://developer.work.weixin.qq.com/document/path/91039)、[企业jsapi_ticket](https://developer.work.weixin.qq.com/document/path/90539#%E8%8E%B7%E5%8F%96%E4%BC%81%E4%B8%9A%E7%9A%84jsapi_ticket)和[应用jsapi_ticket](https://developer.work.weixin.qq.com/document/path/90539#%E8%8E%B7%E5%8F%96%E5%BA%94%E7%94%A8%E7%9A%84jsapi-ticket)；
- 使用用户传参和上一步生成的jsapi_ticket，通过[JS-SDK使用权限签名算法](https://developer.work.weixin.qq.com/document/path/90539)，得到signature；
- 插件会将传参和signature注入到前端页面，页面加载通过js即可获取，完成企微SDK鉴权；

## 安装

使用npm安装

```shell
npm install ww-auth-webpack-plugin
```

## 使用

比如在webpack.config.js文件中你可以这样配置

```ts
//...
const WwAuthPlugin = require('ww-auth-webpack-plugin')
module.exports = defineConfig({
  // ...
  configureWebpack: {
    plugins: [
      new WwAuthPlugin({
        corpid: "", // 必填，企业微信的corpid，必须与当前登录的企业一致
        corpsecret: "", // 必填，密钥
        timestamp: "", // 必填，生成签名的时间戳
        noncestr: "", // 必填，生成签名的随机串
        agentid: "", // 必填，企业微信的应用id （e.g. 1000247）
        url: "", // 页面URL
      }),
    ],
  },
});
```
页面加载时，即可从`__wwAuthInfo__.json`获取企业微信SDK鉴权所需信息。

```ts
// 通过agentConfig注入应用的权限
const setUpAgentConfig = (authInfo) => {
  const { corpid, agentid, timestamp, noncestr, appsign } = authInfo;
  return new Promise((resolve, reject) => {
    wx.agentConfig({
      corpid, // 必填，企业微信的corpid，必须与当前登录的企业一致
      agentid, // 必填，企业微信的应用id （e.g. 1000247）
      timestamp, // 必填，生成签名的时间戳
      nonceStr: noncestr, // 必填，生成签名的随机串
      signature: appsign, // 必填，签名，见附录-JS-SDK使用权限签名算法
      jsApiList: [
        "selectExternalContact",
        "getExternalContact",
        "getCurExternalContact",
        "getCurExternalChat",
        "shareToExternalChat",
        "shareToExternalContact",
        "chooseImage",
        "getContext"
      ], //必填，传入需要使用的接口名称
      success: (res) => {
        // 回调
        resolve(res);
      },
      fail: (res) => {
        if (res.errMsg.indexOf("function not exist") > -1) {
          console.error("版本过低请升级");
        }
        reject(res);
      }
    });
  });
};

// 初始化企业微信鉴权
export const initSdk = async () => {
   const authInfo = await fetch("__wwAuthInfo__.json").then((response) =>
    response.json()
  );
  const { noncestr, timestamp, corpid, corpsign } = authInfo;

  return new Promise((resolve, reject) => {
    wx.config({
      beta: true, // 必须这么写，否则wx.invoke调用形式的jsapi会有问题
      debug: false, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
      appId: corpid, // 必填，企业微信的corpID，必须是本企业的corpID，不允许跨企业使用
      timestamp, // 必填，生成签名的时间戳
      nonceStr: noncestr, // 必填，生成签名的随机串
      signature: corpsign, // 必填，签名，见 附录-JS-SDK使用权限签名算法
      jsApiList: ["chooseImage"] // 必填，需要使用的JS接口列表，凡是要调用的接口都需要传进来
    });

    wx.ready(async () => {
      try {
        const agentConfigRes = await setUpAgentConfig(authInfo);
        resolve(agentConfigRes);
      } catch (err) {
        reject(err);
      }
    });

    wx.error((err) => {
      // config信息验证失败会执行error函数，如签名过期导致验证失败，具体错误信息可以打开config的debug模式查看，也可以在返回的res参数中查看，对于SPA可以在这里更新签名。
      reject(err);
    });
  });
};
```

