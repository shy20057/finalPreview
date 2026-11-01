<template>
  <view class="p">
    <view class="row">
      <text class="lbl">A inline-svg</text>
      <AppIcon name="ie17b3b9a" :size="24" />
    </view>

    <view class="row">
      <text class="lbl">B img-datauri</text>
      <image class="ic" :src="dataUri" mode="widthFix" />
    </view>

    <view class="row">
      <text class="lbl">C mask-css</text>
      <view class="ic mask"></view>
    </view>

    <view class="row">
      <text class="lbl">D glass</text>
      <view class="glass">glass</view>
    </view>

    <view class="row">
      <text class="lbl">E richtext</text>
      <rich-text class="rt" :nodes="probeHtml" />
    </view>

    <view class="row">
      <text class="lbl">F rem</text>
      <view class="rem">5rem</view>
    </view>

    <view class="row">
      <text class="lbl">G fixed</text>
      <view class="fixed">fix</view>
    </view>

    <ViewTransition name="fade">
      <view v-if="visible" class="tr">transition ok</view>
    </ViewTransition>
    <view class="btn" @click="visible = !visible">toggle</view>
    <view class="btn" @click="doRequest">request backend</view>
    <text class="res">{{ result }}</text>
    <text class="res">{{ domInfo }}</text>
  </view>
</template>

<script>
const SVG_B64 = 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik05IDIxSDVhMiAyIDAgMCAxLTItMlY1YTIgMiAwIDAgMSAyLTJoNCIvPjxwb2x5bGluZSBwb2ludHM9IjE2IDE3IDIxIDEyIDE2IDciLz48bGluZSB4MT0iMjEiIHkxPSIxMiIgeDI9IjkiIHkyPSIxMiIvPjwvc3ZnPg=='

export default {
  data() {
    return {
      visible: true,
      result: '...',
      domInfo: '...',
      dataUri: 'data:image/svg+xml;base64,' + SVG_B64,
      probeHtml: '<p>rich-text <b>bold</b></p>',
    }
  },
  mounted() {
    this.domInfo = 'doc=' + typeof document + ' win=' + typeof window
    console.log('PROBE_DOM document=' + typeof document + ' window=' + typeof window)
  },
  methods: {
    doRequest() {
      uni.request({
        url: 'http://10.0.2.2:3000/api/banks',
        method: 'GET',
        success: (res) => {
          this.result = 'HTTP ' + res.statusCode
          console.log('PROBE_REQ status=' + res.statusCode)
        },
        fail: (err) => {
          this.result = 'FAIL ' + (err && err.errMsg)
          console.log('PROBE_REQ fail=' + (err && err.errMsg))
        },
      })
    },
  },
}
</script>

<style>
.p { padding: 8px; font-size: 14px; }
.row { display: flex; align-items: center; height: 48px; }
.lbl { width: 110px; color: #333; }
.ic { width: 24px; height: 24px; }
.mask {
  background-color: #e11d48;
  -webkit-mask-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik05IDIxSDVhMiAyIDAgMCAxLTItMlY1YTIgMiAwIDAgMSAyLTJoNCIvPjxwb2x5bGluZSBwb2ludHM9IjE2IDE3IDIxIDEyIDE2IDciLz48bGluZSB4MT0iMjEiIHkxPSIxMiIgeDI9IjkiIHkyPSIxMiIvPjwvc3ZnPg==');
  -webkit-mask-size: contain;
  -webkit-mask-repeat: no-repeat;
}
.glass {
  width: 90px; height: 32px; line-height: 32px; text-align: center; color: #fff;
  background-color: rgba(255,255,255,0.15);
  backdrop-filter: blur(12px) saturate(160%);
  border-radius: 8px;
}
.rt { width: 160px; }
.rem { width: 5rem; height: 16px; background: #22c55e; }
.fixed { position: fixed; top: 0; right: 0; width: 60px; height: 20px; line-height: 20px; background: #f59e0b; color: #000; font-size: 12px; text-align: center; }
.tr { height: 20px; color: #0a0; }
.btn { padding: 6px; background: #333; color: #fff; margin: 4px 0; }
.res { display: block; font-size: 12px; color: #000; }
.fade-enter-active { transition: opacity 0.3s; }
.fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
