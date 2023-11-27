declare module 'ww-auth-webpack-plugin' {
  import type { Plugin } from 'vite';

  export interface WwAuthPluginOptions {
    corpid: string;
    corpsecret: string;
    noncestr: string;
    timestamp: string;
    url: string;
    agentid: string;
  }

  export interface WwAuthInfo extends WwAuthPluginOptions {
    corpsign: string;
    appsign: string;
  }

  function WwAuthPlugin(options: WwAuthPluginOptions): Plugin;

  export default WwAuthPlugin;
}