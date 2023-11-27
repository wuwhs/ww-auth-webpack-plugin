// 企业微信自动鉴权插件
import sha1 from "sha1";
import axios from "axios";
import type { WwAuthPluginOptions, WwAuthInfo } from "ww-auth-webpack-plugin";

class WwAuthPlugin {
  options: WwAuthPluginOptions;
  wwAuthInfo: WwAuthInfo;
  flag: boolean;
  constructor(options: WwAuthPluginOptions) {
    this.options = options;
    this.wwAuthInfo = {
      corpsign: "",
      appsign: "",
      corpid: "",
      corpsecret: "",
      noncestr: "",
      timestamp: "",
      url: "",
      agentid: "",
    };
    this.flag = false;
  }

  apply(compiler: {
    hooks: {
      compilation: {
        tap: (arg0: string, arg1: (compilation: any) => void) => void;
      };
    };
  }) {
    compiler.hooks.compilation.tap(
      "WwAuthPlugin",
      (compilation: {
        hooks: {
          processAssets: {
            tapAsync: (
              arg0: { name: string },
              arg1: (assets: any, callback: any) => Promise<void>
            ) => void;
          };
        };
      }) => {
        compilation.hooks.processAssets.tapAsync(
          {
            name: "WwAuthPlugin",
          },
          async (
            assets: {
              [x: string]: { source: () => string; size: () => number };
            },
            callback: () => void
          ) => {
            if (!this.flag) {
              try {
                const tokenResult = await this.getAccessToken();
                console.log("tokenResult: ", tokenResult.data);

                if (tokenResult.data.errcode !== 0) {
                  console.log(
                    "获取token失败：",
                    JSON.stringify(tokenResult.data)
                  );
                  return;
                }

                // token过期
                setTimeout(() => {
                  console.log("token过期，页面更新后为您重新获取");
                  this.flag = false;
                }, tokenResult.data.expires_in * 1000);

                const token = tokenResult.data.access_token;
                const corpResult = await this.getCorpTicket(token);
                if (corpResult.data.errcode !== 0) {
                  console.log(
                    "获取企业ticket失败：",
                    JSON.stringify(corpResult.data)
                  );
                  return;
                }

                const appResult = await this.getAppTicket(token);
                if (appResult.data.errcode !== 0) {
                  console.log(
                    "获取应用ticket失败： ",
                    JSON.stringify(appResult.data)
                  );
                }

                this.wwAuthInfo = {
                  corpsign: this.encrypTicket(corpResult.data.ticket),
                  appsign: this.encrypTicket(appResult.data.ticket),
                  ...this.options,
                };
                console.log(JSON.stringify(this.wwAuthInfo));
                this.flag = true;
              } catch (error: any) {
                console.log("企业微信鉴权错误:", error.message);
                this.flag = false;
              }
            }

            // 在 HTML 中注入获取到的 token
            const scriptContent = `${JSON.stringify(this.wwAuthInfo)}`;
            assets["__wwAuthInfo__.json"] = {
              source: () => scriptContent,
              size: () => scriptContent.length,
            };

            callback();
          }
        );
      }
    );
  }

  async getAccessToken() {
    return await axios({
      url: "https://qyapi.weixin.qq.com/cgi-bin/gettoken",
      params: {
        corpid: this.options.corpid,
        corpsecret: this.options.corpsecret,
      },
    });
  }

  async getCorpTicket(token: string) {
    return await axios({
      url: "https://qyapi.weixin.qq.com/cgi-bin/get_jsapi_ticket",
      params: {
        access_token: token,
      },
    });
  }

  async getAppTicket(token: string) {
    return await axios({
      url: "https://qyapi.weixin.qq.com/cgi-bin/ticket/get",
      params: {
        access_token: token,
        type: "agent_config",
      },
    });
  }

  encrypTicket(ticket: string) {
    const str = `jsapi_ticket=${ticket}&noncestr=${this.options.noncestr}&timestamp=${this.options.timestamp}&url=${this.options.url}`;
    console.log("concat jsapi_ticket: ", str);
    return sha1(str);
  }
}

export default WwAuthPlugin;
